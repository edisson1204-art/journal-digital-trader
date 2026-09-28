import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Language = "es" | "en";

interface SettingsState {
  language: Language;
  openAiKey: string;
  hasAcceptedLegal: boolean;
  setLanguage: (lang: Language) => void;
  setOpenAiKey: (key: string) => void;
  setAcceptedLegal: (status: boolean) => void;
}

// 🛡️ SECURITY LAYER: Obfuscation Engine
// Previene que extensiones maliciosas escaneen localStorage mediante regex (/sk-[a-zA-Z0-9]/)
const obfuscator = {
  encode: (str: string) => typeof window !== 'undefined' ? btoa(encodeURIComponent(str)).split('').reverse().join('') : str,
  decode: (str: string) => {
    if (typeof window === 'undefined') return str;
    try { return decodeURIComponent(atob(str.split('').reverse().join(''))); } 
    catch { return str; } // Fallback para datos no encriptados antiguos
  }
};

const secureStorage = {
  getItem: (name: string) => {
    const str = localStorage.getItem(name);
    if (!str) return null;
    return obfuscator.decode(str);
  },
  setItem: (name: string, value: string) => {
    localStorage.setItem(name, obfuscator.encode(value));
  },
  removeItem: (name: string) => localStorage.removeItem(name),
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: "es",
      openAiKey: "",
      hasAcceptedLegal: false,
      setLanguage: (lang) => set({ language: lang }),
      setOpenAiKey: (key) => set({ openAiKey: key }),
      setAcceptedLegal: (status) => set({ hasAcceptedLegal: status }),
    }),
    { 
      name: "trading-settings-secured",
      storage: createJSONStorage(() => secureStorage)
    }
  )
);
