"use client";

import { useI18n } from "@/lib/i18n";
import { Lock, Cloud, Languages, RefreshCcw } from "lucide-react";

const trustItems = [
  {
    icon: Lock,
    titleKey: "trust.secure_title",
    descKey: "trust.secure_desc",
    color: "text-green-primary",
    bg: "bg-green-primary/10",
    border: "border-green-primary/20",
  },
  {
    icon: Cloud,
    titleKey: "trust.cloud_title",
    descKey: "trust.cloud_desc",
    color: "text-blue-accent",
    bg: "bg-blue-accent/10",
    border: "border-blue-accent/20",
  },
  {
    icon: Languages,
    titleKey: "trust.bilingual_title",
    descKey: "trust.bilingual_desc",
    color: "text-violet-accent",
    bg: "bg-violet-accent/10",
    border: "border-violet-accent/20",
  },
  {
    icon: RefreshCcw,
    titleKey: "trust.updates_title",
    descKey: "trust.updates_desc",
    color: "text-blue-accent",
    bg: "bg-blue-accent/10",
    border: "border-blue-accent/20",
  },
];

export function TrustSection() {
  const { t } = useI18n();

  return (
    <section className="py-20 px-6 bg-bg-main">
      <div className="max-w-content mx-auto">
        {/* Section title */}
        <h2 className="text-3xl sm:text-4xl font-bold text-text-primary text-center mb-12">
          {t("trust.title")}
        </h2>

        {/* Trust grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {trustItems.map(({ icon: Icon, titleKey, descKey, color, bg, border }) => (
            <div key={titleKey} className="flex flex-col items-center text-center gap-4 p-6 rounded-card border border-border-card bg-bg-card hover:border-opacity-100 transition-all">
              <div className={`w-14 h-14 rounded-full ${bg} border ${border} flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-1.5">{t(titleKey)}</h3>
                <p className="text-xs text-text-muted leading-relaxed">{t(descKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
