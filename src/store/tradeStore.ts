import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  TradeRecord,
  TradeStats,
  computeStats,
  calculateTradeFromFills,
  getPointValue,
  ASSET_CLASS_CONFIG,
} from "@/lib/tradeTypes";
import { supabase } from "@/lib/supabase/client";

/* La columna trades.id en Supabase es UUID: cualquier otro formato es rechazado por Postgres. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isUuid = (id: string) => UUID_RE.test(id);
const withUuid = (t: TradeRecord): TradeRecord => (isUuid(t.id) ? t : { ...t, id: crypto.randomUUID() });
const sortByDateDesc = (list: TradeRecord[]) =>
  [...list].sort((a, b) => new Date(b.dateOpen).getTime() - new Date(a.dateOpen).getTime());

/** Cola de mutaciones por trade ID para evitar condiciones de carrera (sobre-cierre concurrente). */
const tradeMutationLocks = new Map<string, Promise<void>>();

/**
 * Valida invariantes contables de un TradeRecord y recalcula sus campos derivados
 * desde las fills (entries/exits) con el motor Decimal.
 */
export function validateAndNormalizeTrade(trade: TradeRecord): TradeRecord {
  const entries = (trade.entries ?? []).filter(e => e && Number(e.contracts) > 0 && Number(e.price) > 0);
  if (entries.length === 0) {
    throw new Error("El trade debe contener al menos una entrada válida (precio > 0 y cantidad > 0).");
  }

  // Ignorar filas de salida vacías (precio 0 / vacío) y rechazar precios negativos no permitidos o cantidades <= 0
  const validExits = (trade.exits ?? []).filter(ex => {
    if (!ex) return false;
    if (ex.price === undefined || ex.price === null || ex.price === 0) return false;
    if (!Number.isFinite(ex.price) || !Number.isFinite(ex.contracts) || ex.contracts <= 0) {
      throw new Error("Fila de salida inválida: precio y cantidad deben ser finitos y mayores que cero.");
    }
    return true;
  });

  const totalEntryContracts = entries.reduce((s, e) => s + Number(e.contracts), 0);
  const totalExitContracts = validExits.reduce((s, e) => s + Number(e.contracts), 0);

  if (totalExitContracts - totalEntryContracts > 1e-9) {
    throw new Error(
      `No puedes cerrar ${totalExitContracts} contratos cuando la entrada total es ${totalEntryContracts}.`
    );
  }

  const assetCfg = ASSET_CLASS_CONFIG[trade.assetClass] ?? ASSET_CLASS_CONFIG.Futures;
  const pv = getPointValue(trade.assetClass, trade.instrument);
  const riskStop = trade.initialStopLoss ?? trade.stopLoss;

  const calc = calculateTradeFromFills(
    trade.side,
    entries,
    validExits,
    riskStop,
    trade.commissionPerSide,
    pv
  );

  const avgEntry = entries.reduce((s, e) => s + e.price * e.contracts, 0) / totalEntryContracts;

  return {
    ...trade,
    entries,
    exits: validExits,
    status: calc.status,
    openContracts: calc.openContracts,
    totalContracts: totalEntryContracts,
    contractsExited: totalExitContracts,
    avgEntryPrice: parseFloat(avgEntry.toFixed(assetCfg.decimalPlaces)),
    avgExitPrice: calc.avgExitPrice !== undefined ? parseFloat(calc.avgExitPrice.toFixed(assetCfg.decimalPlaces)) : undefined,
    totalCommission: calc.totalCommission ?? 0,
    accruedCommission: calc.accruedCommission,
    openCommission: calc.openCommission,
    grossPnl: calc.grossPnl,
    netPnl: calc.netPnl,
    pnlPerContract: calc.pnlPerContract,
    rMultiple: calc.rMultiple,
    grossRMultiple: calc.grossRMultiple,
    result: calc.result ?? "Open",
  };
}

export type SyncStatus = "idle" | "syncing" | "synced" | "error";

export interface TradeStore {
  trades: TradeRecord[];
  stats: TradeStats;
  isHydrated: boolean;
  isSyncing: boolean;
  syncStatus: SyncStatus;
  /** Error explícito al cargar desde la nube (distingue fallo de red/lectura de cuenta con 0 operaciones). */
  loadError: string | null;
  /** Último error de sincronización/escritura con Supabase (null si todo está bien). */
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
  clearTrades: () => Promise<boolean>;
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
      syncStatus: "idle",
      loadError: null,
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
        set({ isSyncing: true, syncStatus: "syncing" });
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const user = sessionData.session?.user;
          if (!user) {
            set({ isSyncing: false, syncStatus: "idle" });
            return;
          }

          const { data, error } = await supabase.from("trades").select("data").eq("user_id", user.id);
          if (error) {
            const msg = `No se pudieron descargar tus trades: ${error.message}`;
            set({ loadError: msg, syncError: msg, syncStatus: "error", isSyncing: false });
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
          set({
            trades: merged,
            stats: computeStats(merged),
            ownerId: user.id,
            loadError: null,
            syncError: uploadError,
            syncStatus: uploadError ? "error" : "synced",
          });
        } catch (err) {
          console.error("Error syncing from cloud:", err);
          const msg = "Error de conexión al sincronizar con la nube.";
          set({ loadError: msg, syncError: msg, syncStatus: "error" });
        } finally {
          set({ isSyncing: false });
        }
      },

      addTrade: async (incoming) => {
        const normalized = validateAndNormalizeTrade(withUuid(incoming));
        const newTrades = sortByDateDesc([normalized, ...get().trades]);
        set({ trades: newTrades, stats: computeStats(newTrades), syncStatus: "syncing" });

        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;
        if (!user) {
          set({ syncStatus: "idle" });
          return;
        }

        const { error } = await supabase
          .from("trades")
          .insert([{ id: normalized.id, user_id: user.id, data: normalized }]);
        if (error) {
          console.error("Supabase insert error:", error);
          set({
            syncError: `El trade se guardó en este navegador pero NO en la nube: ${error.message}`,
            syncStatus: "error",
          });
        } else {
          set({ ownerId: user.id, syncError: null, syncStatus: "synced" });
        }
      },

      updateTrade: async (id, updates) => {
        const prevLock = tradeMutationLocks.get(id) ?? Promise.resolve();
        const nextTask = prevLock.then(async () => {
          const current = get().trades.find(t => t.id === id);
          if (!current) return;

          // El id original se conserva siempre: la edición nunca debe crear un trade nuevo.
          const candidate: TradeRecord = { ...current, ...updates, id };
          const updated = validateAndNormalizeTrade(candidate);
          const newTrades = sortByDateDesc(get().trades.map(t => (t.id === id ? updated : t)));
          set({ trades: newTrades, stats: computeStats(newTrades), syncStatus: "syncing" });

          const { data: sessionData } = await supabase.auth.getSession();
          const user = sessionData.session?.user;
          if (!user || !isUuid(id)) {
            set({ syncStatus: "idle" });
            return; // los ids legados se suben en la próxima sincronización
          }

          // upsert: si la fila no existía en la nube (p. ej. un insert anterior falló), se crea.
          const { error } = await supabase
            .from("trades")
            .upsert([{ id, user_id: user.id, data: updated }], { onConflict: "id" });
          if (error) {
            console.error("Supabase update error:", error);
            set({
              syncError: `La edición no se guardó en la nube: ${error.message}`,
              syncStatus: "error",
            });
          } else {
            set({ syncError: null, syncStatus: "synced" });
          }
        });

        tradeMutationLocks.set(id, nextTask.catch(() => {}));
        return nextTask;
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
          set({
            syncError: `El trade se borró aquí pero no en la nube: ${error.message}`,
            syncStatus: "error",
          });
        } else {
          set({ syncError: null, syncStatus: "synced" });
        }
      },

      /* Reset REAL: borra los trades en la nube (Supabase) y luego el estado local.
         Si la nube falla, NO se vacía lo local (para que no reaparezcan al recargar sin avisar). */
      clearTrades: async () => {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const user = sessionData.session?.user;
          if (user) {
            const { error } = await supabase.from("trades").delete().eq("user_id", user.id);
            if (error) {
              set({ syncError: `No se pudo borrar el historial en la nube: ${error.message}`, syncStatus: "error" });
              return false;
            }
          }
        } catch {
          set({ syncError: "Error de conexión al borrar el historial en la nube.", syncStatus: "error" });
          return false;
        }
        set({ trades: [], stats: computeStats([]), loadError: null, syncError: null, syncStatus: "synced" });
        if (typeof window !== "undefined") {
          // Configuración local de cuentas Prop Firm (todas las versiones guardadas)
          ["tdi_prop_accounts_v1", "tdi_prop_accounts_v2", "tdi_prop_accounts_v3", "tdi_prop_accounts_v4"].forEach(k => {
            try { window.localStorage.removeItem(k); } catch { /* ignore */ }
          });
        }
        return true;
      },
      clearSyncError: () => set({ syncError: null, loadError: null }),

      setHydrated: (state) => set({ isHydrated: state }),

      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),
    }),
    {
      name: "trading-intelligence-storage",
      storage: createJSONStorage(() => {
        if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
          return window.localStorage;
        }
        const mem = new Map<string, string>();
        return {
          getItem: (k: string) => mem.get(k) ?? null,
          setItem: (k: string, v: string) => { mem.set(k, v); },
          removeItem: (k: string) => { mem.delete(k); },
        };
      }),
      partialize: (s) => ({ trades: s.trades, stats: s.stats, settings: s.settings, ownerId: s.ownerId }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
        state?.fetchTradesFromCloud();
      },
    }
  )
);
