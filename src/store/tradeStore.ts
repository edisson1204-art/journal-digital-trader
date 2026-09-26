import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { TradeRecord, TradeStats, computeStats } from "@/lib/tradeTypes";
import { DEMO_TRADES } from "@/lib/demoTrades";

export interface TradeStore {
  // Estado
  trades: TradeRecord[];
  stats: TradeStats;
  isHydrated: boolean;
  
  // Ajustes de Usuario
  settings: {
    currency: string;
    language: "en" | "es";
    defaultBroker: string;
    defaultRiskPct: number;
    accountSize: number;
  };
  
  // Acciones
  addTrade: (trade: TradeRecord) => void;
  updateTrade: (id: string, updates: Partial<TradeRecord>) => void;
  deleteTrade: (id: string) => void;
  clearTrades: () => void;
  setHydrated: (state: boolean) => void;
  updateSettings: (settings: Partial<TradeStore["settings"]>) => void;
}

export const useTradeStore = create<TradeStore>()(
  persist(
    (set, get) => ({
      // Iniciar con la data demo para que la app no se vea vacía en el primer render
      trades: DEMO_TRADES,
      stats: computeStats(DEMO_TRADES),
      isHydrated: false,
      
      settings: {
        currency: "USD",
        language: "es",
        defaultBroker: "ninjatrader_lease",
        defaultRiskPct: 1,
        accountSize: 50000,
      },

      addTrade: (trade) => set((state) => {
        const newTrades = [trade, ...state.trades];
        // Ordenar del más reciente al más antiguo
        newTrades.sort((a, b) => new Date(b.dateOpen).getTime() - new Date(a.dateOpen).getTime());
        return { trades: newTrades, stats: computeStats(newTrades) };
      }),

      updateTrade: (id, updates) => set((state) => {
        const newTrades = state.trades.map(t => t.id === id ? { ...t, ...updates } : t);
        return { trades: newTrades, stats: computeStats(newTrades) };
      }),

      deleteTrade: (id) => set((state) => {
        const newTrades = state.trades.filter(t => t.id !== id);
        return { trades: newTrades, stats: computeStats(newTrades) };
      }),

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
      },
    }
  )
);
