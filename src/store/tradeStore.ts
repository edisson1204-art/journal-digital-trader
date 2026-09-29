import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { TradeRecord, TradeStats, computeStats } from "@/lib/tradeTypes";
import { supabase } from "@/lib/supabase/client";

export interface TradeStore {
  trades: TradeRecord[];
  stats: TradeStats;
  isHydrated: boolean;
  isSyncing: boolean;
  
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
      
      settings: {
        currency: "USD",
        language: "es",
        defaultBroker: "ninjatrader_lease",
        defaultRiskPct: 1,
        accountSize: 50000,
      },

      fetchTradesFromCloud: async () => {
        set({ isSyncing: true });
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          if (!sessionData.session?.user) {
            set({ isSyncing: false });
            return;
          }

          // Descarga todos los trades del usuario desde la columna JSONB
          const { data, error } = await supabase
            .from("trades")
            .select("data")
            .eq("user_id", sessionData.session.user.id);

          if (!error && data) {
            const cloudTrades: TradeRecord[] = data.map(row => row.data as TradeRecord);
            cloudTrades.sort((a, b) => new Date(b.dateOpen).getTime() - new Date(a.dateOpen).getTime());
            set({ trades: cloudTrades, stats: computeStats(cloudTrades) });
          }
        } catch (error) {
          console.error("Error syncing from cloud:", error);
        } finally {
          set({ isSyncing: false });
        }
      },

      addTrade: async (trade) => {
        const currentTrades = get().trades;
        const newTrades = [trade, ...currentTrades];
        newTrades.sort((a, b) => new Date(b.dateOpen).getTime() - new Date(a.dateOpen).getTime());
        set({ trades: newTrades, stats: computeStats(newTrades) });

        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.user) {
          await supabase.from("trades").insert([{
            id: trade.id,
            user_id: sessionData.session.user.id,
            data: trade
          }]);
        }
      },

      updateTrade: async (id, updates) => {
        const currentTrades = get().trades;
        let updatedTrade = currentTrades.find(t => t.id === id);
        if (!updatedTrade) return;
        
        updatedTrade = { ...updatedTrade, ...updates };
        const newTrades = currentTrades.map(t => t.id === id ? updatedTrade! : t);
        set({ trades: newTrades, stats: computeStats(newTrades) });

        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.user) {
          await supabase.from("trades").update({ data: updatedTrade }).eq("id", id).eq("user_id", sessionData.session.user.id);
        }
      },

      deleteTrade: async (id) => {
        const newTrades = get().trades.filter(t => t.id !== id);
        set({ trades: newTrades, stats: computeStats(newTrades) });

        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.user) {
          await supabase.from("trades").delete().eq("id", id).eq("user_id", sessionData.session.user.id);
        }
      },

      clearTrades: () => set({ trades: [], stats: computeStats([]) }),
      
      setHydrated: (state) => set({ isHydrated: state }),
      
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),
    }),
    {
      name: "trading-intelligence-storage",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
        state?.fetchTradesFromCloud();
      },
    }
  )
);
