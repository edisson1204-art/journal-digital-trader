"use client";

import { useI18n } from "@/lib/i18n";

const markets = [
  { key: "markets.futures", icon: "📈" },
  { key: "markets.forex", icon: "💱" },
  { key: "markets.stocks", icon: "📊" },
  { key: "markets.options", icon: "⚙️" },
  { key: "markets.crypto", icon: "₿" },
  { key: "markets.indexes", icon: "📉" },
  { key: "markets.commodities", icon: "🥇" },
  { key: "markets.etfs", icon: "📋" },
  { key: "markets.prop_firms", icon: "🏦" },
];

export function MarketStrip() {
  const { t } = useI18n();

  return (
    <section className="border-y border-border-card bg-bg-section py-8">
      <div className="max-w-content mx-auto px-6">
        {/* Title */}
        <p className="text-center text-xs font-bold tracking-[0.25em] text-text-secondary uppercase mb-6">
          {t("markets.title")}
        </p>

        {/* Market icons row */}
        <div className="flex flex-wrap justify-center gap-6 sm:gap-8 mb-8">
          {markets.map(({ key, icon }) => (
            <div key={key} className="flex flex-col items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl border border-border-card bg-bg-card flex items-center justify-center text-xl group-hover:border-green-primary/30 group-hover:shadow-green-glow-sm transition-all">
                {icon}
              </div>
              <span className="text-[10px] font-medium text-text-muted group-hover:text-text-secondary transition-colors">
                {t(key)}
              </span>
            </div>
          ))}
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap justify-center gap-8 sm:gap-16 border-t border-border-card/50 pt-6">
          {[
            { value: t("markets.stat1"), label: t("markets.stat1_label") },
            { value: t("markets.stat2"), label: t("markets.stat2_label") },
            { value: t("markets.stat3"), label: t("markets.stat3_label") },
            { value: t("markets.stat4"), label: t("markets.stat4_label") },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-1">
              <span className="text-2xl font-bold tabular-nums text-text-primary">{stat.value}</span>
              <span className="text-xs text-text-muted">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
