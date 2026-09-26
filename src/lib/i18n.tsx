"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import en from "../../public/locales/en.json";
import es from "../../public/locales/es.json";

type Locale = "en" | "es";
type Translations = typeof en;

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

const translations: Record<Locale, Translations> = { en, es };

function getNestedValue(obj: Record<string, unknown>, key: string): string {
  const keys = key.split(".");
  let current: unknown = obj;
  for (const k of keys) {
    if (current && typeof current === "object" && k in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[k];
    } else {
      return key;
    }
  }
  return typeof current === "string" ? current : key;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = localStorage.getItem("ti-locale") as Locale | null;
    if (saved && (saved === "en" || saved === "es")) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("ti-locale", newLocale);
  };

  const t = (key: string): string => {
    return getNestedValue(translations[locale] as unknown as Record<string, unknown>, key);
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within I18nProvider");
  return context;
}
