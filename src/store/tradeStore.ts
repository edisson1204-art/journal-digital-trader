import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { TradeRecord, TradeStats, computeStats } from "@/lib/tradeTypes";
import { supabase } from "@/lib/supabase/client";

/* La columna trades.id en Supabase es UUID: cualquier otro formato es rechazado por Postgres. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isUuid = (id: string) => UUID_RE.test(id);
const withUuid = (t: TradeRecord): TradeRecord => (isUuid(t.id) ? t : { ...t, id: crypto.randomUUID() });
const sortByDateDesc = (list: TradeRecord[]) =>
  [...list].sort((a, b) => new Date(b.dateOpen).getTime() - new Date(a.dateOpen).getTime());

export interface TradeStore {
  trades: TradeRecord[];
  stats: TradeStats;
  isHydrated: boolean;
  isSyncing: boolean;
  /** Último error de sincronización con Supabase (null si todo está bien). */
  syncError: string | null;
  /** Usuario de Supabase dueño de los trades guardados en este navegador. */
  ownerId: string | null;

  settings: {
    currency: string;
    language: "en" | "es";
    defaultBroker: string;
    defaultRiskPct: number;
    accountSize: number;
  };

  fetchTradesFromCloud: () => Promise<void>;
  addTrade: (trade: TradeRecord) => Promise<void>;
  updateTrade: (id: string, updates: Partial<TradeRecord>) => Promise<void>;
  deleteTrade: (id: string) => Promise<void>;
  clearTrades: () => void;
  clearSyncError: () => void;
  setHydrated: (state: boolean) => void;
  updateSettings: (settings: Partial<TradeStore["settings"]>) => void;
}

export const useTradeStore = create<TradeStore>()(
  persist(
    (set, get) => ({
      trades: [],
      stats: computeStats([]),
      isHydrated: false,
      isSyncing: false,
      syncError: null,
      ownerId: null,

      settings: {
        currency: "USD",
        language: "es",
        defaultBroker: "ninjatrader_lease",
        defaultRiskPct: 1,
        accountSize: 50000,
      },

      /* Descarga los trades de la nube y sube los que solo existen en este navegador.
         Nunca reemplaza los datos locales por una lista vacía si algo falla. */
      fetchTradesFromCloud: async () => {
        set({ isSyncing: true });
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const user = sessionData.session?.user;
          if (!user) return;

          const { data, error } = await supabase.from("trades").select("data").eq("user_id", user.id);
          if (error) {
            set({ syncError: `No se pudieron descargar tus trades: ${error.message}` });
            return;
          }

          const cloudTrades = (data ?? []).map(row => row.data as TradeRecord);
          const cloudIds = new Set(cloudTrades.map(t => t.id));
          const { ownerId, trades: localTrades } = get();

          // Trades locales de OTRO usuario (navegador compartido): no se suben ni se mezclan.
          const localIsMine = ownerId === null || ownerId === user.id;
          const pending = localIsMine
            ? localTrades.filter(t => !cloudIds.has(t.id) && !t.id.startsWith("demo-")).map(withUuid)
            : [];

          let uploaded: TradeRecord[] = [];
          let uploadError: string | null = null;
          if (pending.length > 0) {
            const { error: upErr } = await supabase
              .from("trades")
              .upsert(pending.map(t => ({ id: t.id, user_id: user.id, data: t })), { onConflict: "id" });
            if (upErr) uploadError = `${pending.length} trade(s) locales no se pudieron subir: ${upErr.message}`;
            else uploaded = pending;
          }

          // Si la subida falló, se conservan los locales pendientes para reintentar después.
          const merged = sortByDateDesc([...cloudTrades, ...(uploadError ? pending : uploaded)]);
          set({ trades: merged, stats: computeStats(merged), ownerId: user.id, syncError: uploadError });
        } catch (err) {
          console.error("Error syncing from cloud:", err);
          set({ syncError: "Error de conexión al sincronizar con la nube." });
        } finally {
          set({ isSyncing: false });
        }
      },

      addTrade: async (incoming) => {
        const trade = withUuid(incoming);
        const newTrades = sortByDateDesc([trade, ...get().trades]);
        set({ trades: newTrades, stats: computeStats(newTrades) });

        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;
        if (!user) return;

        const { error } = await supabase.from("trades").insert([{ id: trade.id, user_id: user.id, data: trade }]);
        if (error) {
          console.error("Supabase insert error:", error);
          set({ syncError: `El trade se guardó en este navegador pero NO en la nube: ${error.message}` });
        } else {
          set({ ownerId: user.id, syncError: null });
        }
      },

      updateTrade: async (id, updates) => {
        const current = get().trades.find(t => t.id === id);
        if (!current) return;

        // El id original se conserva siempre: la edición nunca debe crear un trade nuevo.
        const updated: TradeRecord = { ...current, ...updates, id };
        const newTrades = sortByDateDesc(get().trades.map(t => (t.id === id ? updated : t)));
        set({ trades: newTrades, stats: computeStats(newTrades) });

        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;
        if (!user || !isUuid(id)) return; // los ids legados se suben en la próxima sincronización

        // upsert: si la fila no existía en la nube (p. ej. un insert anterior falló), se crea.
        const { error } = await supabase
          .from("trades")
          .upsert([{ id, user_id: user.id, data: updated }], { onConflict: "id" });
        if (error) {
          console.error("Supabase update error:", error);
          set({ syncError: `La edición no se guardó en la nube: ${error.message}` });
        } else {
          set({ syncError: null });
        }
      },

      deleteTrade: async (id) => {
        const newTrades = get().trades.filter(t => t.id !== id);
        set({ trades: newTrades, stats: computeStats(newTrades) });

        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;
        if (!user || !isUuid(id)) return;

        const { error } = await supabase.from("trades").delete().eq("id", id).eq("user_id", user.id);
        if (error) {
          console.error("Supabase delete error:", error);
          set({ syncError: `El trade se borró aquí pero no en la nube: ${error.message}` });
        }
      },

      clearTrades: () => set({ trades: [], stats: computeStats([]) }),
      clearSyncError: () => set({ syncError: null }),

      setHydrated: (state) => set({ isHydrated: state }),

      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),
    }),
    {
      name: "trading-intelligence-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ trades: s.trades, stats: s.stats, settings: s.settings, ownerId: s.ownerId }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
        state?.fetchTradesFromCloud();
      },
    }
  )
);
