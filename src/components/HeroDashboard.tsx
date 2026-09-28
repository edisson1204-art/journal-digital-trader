"use client";

import { useI18n } from "@/lib/i18n";
import {
  LayoutDashboard, BookOpen, BarChart2, Calendar,
  Shield, Cpu, Brain, Target, Wallet, HeartPulse, FileText
} from "lucide-react";

/* ── Sidebar nav items ── */
const SIDEBAR = [
  { icon: LayoutDashboard, label: "Dashboard",   active: true },
  { icon: BookOpen,         label: "Journal"      },
  { icon: BarChart2,        label: "Analytics"    },
  { icon: Calendar,         label: "Calendar"     },
  { icon: Shield,           label: "Risk Tools"   },
  { icon: Cpu,              label: "Simulator"    },
  { icon: Brain,            label: "AI Mentor"    },
  { icon: Target,           label: "Strategies"   },
  { icon: Wallet,           label: "Accounts"     },
  { icon: HeartPulse,       label: "Psychology"   },
  { icon: FileText,         label: "Reports"      },
];

/* ── Equity curve data ── */
const EQ = [14, 19, 17, 24, 28, 26, 32, 30, 36, 39, 35, 43, 46, 51, 55, 52, 60];

function EquityCurve() {
  const min = Math.min(...EQ);
  const max = Math.max(...EQ);
  const range = max - min || 1;
  const W = 240;
  const H = 56;

  const pts = EQ.map((v, i) => ({
    x: (i / (EQ.length - 1)) * W,
    y: H - ((v - min) / range) * (H - 4),
  }));

  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const fill = `${line} L${W},${H} L0,${H} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[56px]" preserveAspectRatio="none">
        <defs>
          <linearGradient id="heroEqFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#20E58D" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#20E58D" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0.33, 0.66].map((t) => (
          <line key={t} x1="0" y1={H * t} x2={W} y2={H * t} stroke="#19374D" strokeWidth="0.5" strokeDasharray="3 3" />
        ))}
        <path d={fill} fill="url(#heroEqFill)" />
        {/* Soft glow */}
        <path d={line} stroke="#20E58D" strokeWidth="3" fill="none" strokeLinejoin="round" opacity="0.15" />
        <path d={line} stroke="#20E58D" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
      </svg>
      <div className="flex justify-between mt-1">
        {["Jan","Feb","Mar","Apr","May","Jun"].map((m) => (
          <span key={m} className="text-[8px] text-text-muted">{m}</span>
        ))}
      </div>
    </div>
  );
}

/* ── Donut chart ── */
function Donut({ pct }: { pct: number }) {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  return (
    <svg viewBox="0 0 64 64" className="h-14 w-14 -rotate-90">
      <circle cx="32" cy="32" r={r} fill="none" stroke="#19374D" strokeWidth="9" />
      <circle
        cx="32" cy="32" r={r} fill="none"
        stroke="#20E58D" strokeWidth="9"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
      />
    </svg>
  );
}

/* ── Recent trades data ── */
const TRADES = [
  { sym: "NAS100", side: "Buy",  pnl: "+$320.00", pos: true  },
  { sym: "EURUSD", side: "Sell", pnl: "-$150.00", pos: false },
  { sym: "BTCUSD", side: "Buy",  pnl: "+$410.00", pos: true  },
  { sym: "AAPL",   side: "Buy",  pnl: "+$95.00",  pos: true  },
];

/* ── Metric card ── */
function MetricCard({ label, value, green }: { label: string; value: string; green: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-border-card/50 bg-bg-main/60 p-2.5">
      <p className="text-[8px] leading-none text-text-muted">{label}</p>
      <p className={`text-[12px] font-bold tabular-nums leading-none ${green ? "text-green-primary" : "text-text-primary"}`}>
        {value}
      </p>
    </div>
  );
}

export function HeroDashboard() {
  const { t } = useI18n();

  return (
    <div
      className="w-full overflow-hidden rounded-[18px] border border-border-card bg-bg-card shadow-card select-none"
      aria-label="Journal Digital Trader Invest dashboard preview (demo data)"
      aria-hidden="true"
    >
      {/* ── Window chrome ── */}
      <div className="flex items-center justify-between border-b border-border-card/60 bg-bg-main/50 px-4 py-2.5">
        {/* Traffic lights */}
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-loss/50" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-warn/50" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-primary/50" />
        </div>
        {/* Mini logo */}
        <div className="flex items-center gap-1.5">
          <svg width="16" height="16" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="8" fill="#0D2133" />
            <rect x="6" y="8" width="20" height="4.5" rx="1.5" fill="#F8FAFC" />
            <rect x="13" y="12.5" width="6" height="16" rx="1.5" fill="#F8FAFC" />
            <rect x="25" y="14" width="5" height="14.5" rx="1.5" fill="#20E58D" />
            <rect x="6" y="28.5" width="14" height="3" rx="1.5" fill="#20E58D" />
          </svg>
          <span className="text-[9px] font-bold tracking-[0.14em] text-text-primary uppercase">Journal Digital Trader Invest</span>
        </div>
        {/* Avatar */}
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-blue-accent to-violet-accent text-[7px] font-bold text-white">
          AL
        </div>
      </div>

      {/* ── App body ── */}
      <div className="flex" style={{ minHeight: 390 }}>
        {/* Sidebar */}
        <aside className="hidden w-[120px] flex-shrink-0 border-r border-border-card/50 bg-bg-main sm:flex flex-col gap-0.5 py-3 px-2">
          {SIDEBAR.map(({ icon: Icon, label, active }) => (
            <div
              key={label}
              className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${
                active
                  ? "bg-green-primary/10 text-green-primary"
                  : "text-text-muted hover:bg-white/5 hover:text-text-secondary"
              }`}
            >
              <Icon className="h-3 w-3 flex-shrink-0" />
              <span className="text-[9px] font-medium">{label}</span>
            </div>
          ))}
        </aside>

        {/* Main panel */}
        <div className="flex flex-1 flex-col gap-3 overflow-hidden p-4">

          {/* Header row */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold text-text-primary">{t("hero.dashboard_greeting")}</p>
              <p className="text-[9px] italic text-text-muted">{t("hero.dashboard_quote")}</p>
            </div>
            <span className="rounded bg-yellow-warn/10 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider text-yellow-warn border border-yellow-warn/20">
              DEMO
            </span>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-4 gap-2">
            <MetricCard label={t("metrics.total_pnl")}       value="+$2,480.50" green />
            <MetricCard label={t("metrics.win_rate")}         value="68.2%"       green />
            <MetricCard label={t("metrics.profit_factor")}    value="2.34"        green />
            <MetricCard label={t("metrics.total_trades")}     value="124"         green={false} />
          </div>

          {/* Equity curve */}
          <div className="rounded-lg border border-border-card/50 bg-bg-section p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-medium text-text-secondary">Equity Curve</span>
              <div className="flex gap-1">
                {["1M","3M","6M","1Y"].map((p) => (
                  <span key={p} className={`text-[8px] px-1.5 py-0.5 rounded ${p === "3M" ? "bg-green-primary/15 text-green-primary" : "text-text-muted"}`}>
                    {p}
                  </span>
                ))}
              </div>
            </div>
            <EquityCurve />
          </div>

          {/* Bottom row: trades + distribution */}
          <div className="grid grid-cols-[1fr_auto] gap-2.5 flex-1">
            {/* Recent trades */}
            <div className="rounded-lg border border-border-card/50 bg-bg-section p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-medium text-text-secondary">{t("metrics.recent_trades")}</span>
                <span className="text-[8px] text-green-primary cursor-pointer hover:underline">See all</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {/* Table header */}
                <div className="grid grid-cols-[3fr_2fr_3fr_3fr] gap-1 mb-1">
                  {["Instrument","Date","Side","P&L"].map((h) => (
                    <span key={h} className="text-[7px] text-text-muted uppercase tracking-wide">{h}</span>
                  ))}
                </div>
                {TRADES.map((tr) => (
                  <div key={tr.sym} className="grid grid-cols-[3fr_2fr_3fr_3fr] gap-1 items-center">
                    <span className="text-[9px] font-semibold text-text-primary">{tr.sym}</span>
                    <span className="text-[8px] text-text-muted">Jun 12</span>
                    <span className={`text-[8px] font-medium ${tr.pos ? "text-green-primary" : "text-red-loss"}`}>{tr.side}</span>
                    <span className={`text-[9px] font-bold tabular-nums ${tr.pos ? "text-green-primary" : "text-red-loss"}`}>
                      {tr.pnl}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Trade distribution */}
            <div className="rounded-lg border border-border-card/50 bg-bg-section p-3 flex flex-col items-center gap-2">
              <span className="text-[9px] font-medium text-text-secondary whitespace-nowrap">Trade Distribution</span>
              <div className="relative">
                <Donut pct={58} />
                <div className="absolute inset-0 flex rotate-90 items-center justify-center">
                  <span className="text-[11px] font-bold text-text-primary">58%</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                {[
                  { label: "Win",       color: "bg-green-primary" },
                  { label: "Loss",      color: "bg-red-loss"      },
                  { label: "Breakeven", color: "bg-yellow-warn"   },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${item.color}`} />
                    <span className="text-[8px] text-text-muted">{item.label}</span>
                  </div>
                ))}
              </div>
              <span className="text-[7px] text-text-muted">Last 30 days</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
