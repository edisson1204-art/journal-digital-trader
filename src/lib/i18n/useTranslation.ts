import { useSettingsStore } from "@/store/settingsStore";
import { es } from "./es";
import { en } from "./en";

const dictionaries = { es, en };

// Helper to access nested object properties via string path (e.g. "dashboard.title")
function getNestedProperty(obj: any, path: string) {
  return path.split(".").reduce((acc, part) => acc && acc[part], obj);
}

export function useTranslation() {
  const language = useSettingsStore((state) => state.language);
  const dict = dictionaries[language] || dictionaries.es;

  const t = (key: string): string => {
    const value = getNestedProperty(dict, key);
    return value !== undefined ? value : key; // Fallback al key original si no se encuentra
  };

  return { t, language };
}
