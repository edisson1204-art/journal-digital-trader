"use client";

import { useI18n } from "@/lib/i18n";
import { useState } from "react";

/* ── Equity data for the analytics chart ── */
const equityPoints = [62, 68, 64, 72, 80, 76, 88, 92, 87, 98, 105, 112, 118, 124, 120, 132, 140];
const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun"];

function EquityChart() {
  const max = Math.max(...equityPoints);
  const min = Math.min(...equityPoints);
  const range = max - min || 1;
  const W = 400;
  const H = 110;

  const pts = equityPoints.map((v, i) => ({
    x: (i / (equityPoints.length - 1)) * W,
    y: H - ((v - min) / range) * (H - 12),
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const fillPath = `${linePath} L ${W},${H} L 0,${H} Z`;

  /* y-axis labels */
  const yLabels = [9, 12, 15, 18].map((v) => ({
    label: `${v}k`,
    y: H - ((v * 1000 - min * 1000) / (range * 1000)) * (H - 12),
  }));

  return (
    <div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-28" preserveAspectRatio="none">
          <defs>
            <linearGradient id="eqGrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#20E58D" stopOpacity="0.22" />
              <stop offset="85%" stopColor="#20E58D" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map((t) => (
            <line key={t} x1="0" y1={H * t} x2={W} y2={H * t} stroke="#19374D" strokeWidth="0.5" strokeDasharray="4 4" />
          ))}
          {/* Fill */}
          <path d={fillPath} fill="url(#eqGrad2)" />
          {/* Glow */}
          <path d={linePath} stroke="#20E58D" strokeWidth="3.5" fill="none" strokeLinejoin="round" opacity="0.18" />
          {/* Line */}
          <path d={linePath} stroke="#20E58D" strokeWidth="1.8" fill="none" strokeLinejoin="round" />
        </svg>
        {/* Y-axis labels overlay */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between py-1 pointer-events-none">
          {["15k", "12k", "9k", "6k"].map((l) => (
            <span key={l} className="text-[9px] text-text-muted">{l}</span>
          ))}
        </div>
      </div>
      <div className="flex justify-between mt-1">
        {months.map((m) => (
          <span key={m} className="text-[10px] text-text-muted">{m}</span>
        ))}
      </div>
    </div>
  );
}

const TABS = [
  "platform.tab_dashboard",
  "platform.tab_journal",
  "platform.tab_analytics",
  "platform.tab_risk",
  "platform.tab_ai",
] as const;

const strategies = [
  { key: "platform.strategy1", pct: 43.5, color: "bg-blue-accent" },
  { key: "platform.strategy2", pct: 28.1, color: "bg-green-primary" },
  { key: "platform.strategy3", pct: 18.7, color: "bg-violet-accent" },
  { key: "platform.strategy4", pct: 9.7,  color: "bg-yellow-warn" },
];

export function PlatformPreview() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState(0);

  const metrics = [
    { label: t("platform.equity"),         value: "$12,480.50", sub: "+12.4%",  green: true  },
    { label: t("platform.win_rate"),        value: "68.2%",       sub: undefined, green: true  },
    { label: t("platform.profit_factor"),   value: "2.34",        sub: undefined, green: true  },
    { label: t("platform.avg_rr"),          value: "1:2.8",       sub: undefined, green: true  },
    { label: t("platform.max_dd"),          value: "-6.4%",       sub: undefined, green: false, red: true },
  ];

  return (
    <section className="bg-bg-section py-20 px-6" id="platform">
      <div className="mx-auto max-w-content">
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-text-primary sm:text-4xl mb-2">{t("platform.title")}</h2>
          <p className="text-text-secondary text-[15px]">{t("platform.subtitle")}</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-0 overflow-x-auto border-b border-border-card" role="tablist">
          {TABS.map((key, i) => (
            <button
              key={key}
              role="tab"
              aria-selected={activeTab === i}
              onClick={() => setActiveTab(i)}
              className={`whitespace-nowrap px-5 py-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-primary border-b-2 ${
                activeTab === i
                  ? "border-green-primary text-green-primary"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              {t(key)}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div className="border border-t-0 border-border-card rounded-b-card bg-bg-card p-6 sm:p-8">
          {/* Metrics row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
            {metrics.map((m) => (
              <div key={m.label} className="rounded-card border border-border-card/60 bg-bg-section p-4">
                <p className="text-[11px] text-text-muted mb-1">{m.label}</p>
                <p className={`text-[18px] font-bold tabular-nums leading-none ${m.red ? "text-red-loss" : m.green ? "text-green-primary" : "text-text-primary"}`}>
                  {m.value}
                </p>
                {m.sub && <p className="text-[11px] text-green-primary mt-1">{m.sub}</p>}
              </div>
            ))}
          </div>

          {/* Chart + Strategy breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-5">
            {/* Equity curve */}
            <div className="rounded-card border border-border-card/60 bg-bg-section p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-text-primary">{t("platform.equity")}</p>
                <div className="flex gap-1.5">
                  {["1W","1M","3M","6M","1Y"].map((p) => (
                    <button key={p} className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${p === "6M" ? "bg-green-primary/15 text-green-primary" : "text-text-muted hover:text-text-secondary"}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <EquityChart />
            </div>

            {/* Performance by strategy */}
            <div className="rounded-card border border-border-card/60 bg-bg-section p-5">
              <p className="text-sm font-semibold text-text-primary mb-4">{t("platform.perf_by_strategy")}</p>
              <div className="flex flex-col gap-4">
                {strategies.map((s) => (
                  <div key={s.key}>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[12px] text-text-secondary">{t(s.key)}</span>
                      <span className="text-[12px] font-semibold tabular-nums text-text-primary">{s.pct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-border-card">
                      <div
                        className={`h-full rounded-full ${s.color} transition-all duration-700`}
                        style={{ width: `${s.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Demo data disclaimer */}
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border-card/50 pt-5">
            <span className="rounded border border-yellow-warn/25 bg-yellow-warn/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-yellow-warn">
              {t("platform.demo_label")}
            </span>
            <p className="text-[11px] italic text-text-muted">{t("platform.disclaimer")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
