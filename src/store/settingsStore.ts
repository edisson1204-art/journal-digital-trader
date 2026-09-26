import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Language = "es" | "en";

interface SettingsState {
  language: Language;
  openAiKey: string;
  setLanguage: (lang: Language) => void;
  setOpenAiKey: (key: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: "es",
      openAiKey: "", // Español por defecto
      setLanguage: (lang) => set({ language: lang }),
      setOpenAiKey: (key) => set({ openAiKey: key }),
    }),
    { name: "trading-settings" }
  )
);
