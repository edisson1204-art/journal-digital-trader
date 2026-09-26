"use client";

import { useI18n } from "@/lib/i18n";
import { useState } from "react";
import { Globe, ChevronDown } from "lucide-react";

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-green-primary"
        aria-label="Change language"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Globe className="h-3.5 w-3.5" />
        <span className="font-semibold tracking-wide">{locale.toUpperCase()}</span>
        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <ul
            role="listbox"
            className="absolute right-0 top-full z-50 mt-2 w-36 overflow-hidden rounded-xl border border-border-card bg-bg-card shadow-card"
          >
            {(["en", "es"] as const).map((lang) => (
              <li key={lang} role="none">
                <button
                  role="option"
                  aria-selected={locale === lang}
                  onClick={() => { setLocale(lang); setOpen(false); }}
                  className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] transition-colors ${
                    locale === lang
                      ? "bg-green-primary/10 text-green-primary"
                      : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
                  }`}
                >
                  <span className="text-base">{lang === "en" ? "🇺🇸" : "🇪🇸"}</span>
                  <span>{lang === "en" ? "English" : "Español"}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
