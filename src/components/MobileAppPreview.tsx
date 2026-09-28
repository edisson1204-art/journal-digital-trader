"use client";

import { useI18n } from "@/lib/i18n";

const mobileEquityData = [20, 28, 24, 35, 42, 38, 50, 55, 60];

function MiniChart() {
  const max = Math.max(...mobileEquityData);
  const min = Math.min(...mobileEquityData);
  const range = max - min;
  const H = 40;
  const W = 180;

  const points = mobileEquityData.map((v, i) => {
    const x = (i / (mobileEquityData.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return `${x},${y}`;
  });
  const pathD = `M ${points.join(" L ")}`;
  const fillD = `${pathD} L ${W},${H} L 0,${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-10" preserveAspectRatio="none">
      <defs>
        <linearGradient id="mobileFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#20E58D" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#20E58D" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill="url(#mobileFill)" />
      <path d={pathD} stroke="#20E58D" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
    </svg>
  );
}

export function MobileAppPreview() {
  const { t } = useI18n();

  return (
    <div
      className="relative rounded-[28px] border-2 border-border-card bg-bg-main shadow-card overflow-hidden select-none"
      style={{ width: 210, boxShadow: "0 0 40px rgba(0,0,0,0.6), 0 0 0 1px #19374D" }}
    >
      {/* Phone notch */}
      <div className="h-5 bg-bg-section flex items-center justify-center">
        <div className="w-12 h-1 rounded-full bg-border-card" />
      </div>

      {/* Status bar */}
      <div className="flex justify-between px-3 py-1 text-[7px] text-text-muted bg-bg-section border-b border-border-card/50">
        <span>5:01</span>
        <span>⚡ 88%</span>
      </div>

      {/* App header */}
      <div className="px-3 py-2 flex items-center justify-between bg-bg-card border-b border-border-card/50">
        <div className="flex items-center gap-1">
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none">
            <rect width="16" height="16" rx="3" fill="#0D2133" />
            <rect x="3" y="3" width="10" height="2" rx="0.5" fill="#F8FAFC" />
            <rect x="6" y="5" width="4" height="8" rx="0.5" fill="#F8FAFC" />
            <rect x="3" y="11" width="6" height="1.5" rx="0.5" fill="#20E58D" />
          </svg>
          <div>
            <p className="text-[7px] font-bold text-text-primary tracking-widest leading-none">JOURNAL DIGITAL</p>
            <p className="text-[6px] font-medium text-green-primary tracking-widest leading-none">TRADER INVEST</p>
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="w-3 h-0.5 bg-text-secondary rounded" />
          <span className="w-3 h-0.5 bg-text-secondary rounded" />
          <span className="w-2 h-0.5 bg-text-secondary rounded" />
        </div>
      </div>

      {/* App content */}
      <div className="px-3 py-2.5 flex flex-col gap-2.5">
        {/* Greeting */}
        <div>
          <p className="text-[8px] font-semibold text-text-primary leading-tight">{t("hero.dashboard_greeting")}</p>
          <p className="text-[7px] text-text-muted italic leading-tight">{"\"Discipline today, freedom tomorrow.\""}</p>
        </div>

        {/* P&L card */}
        <div className="bg-bg-card rounded-xl p-2 border border-border-card/60">
          <p className="text-[7px] text-text-muted">Total P&L</p>
          <p className="text-[13px] font-bold text-green-primary tabular-nums">+$2,480.50</p>
          <p className="text-[7px] text-green-primary">+12.4%</p>
          <div className="mt-1.5">
            <MiniChart />
          </div>
          <div className="flex gap-1.5 mt-1">
            {["1M", "3M", "6M", "1Y"].map((period) => (
              <button
                key={period}
                className={`text-[6px] px-1.5 py-0.5 rounded ${period === "1M" ? "bg-green-primary/20 text-green-primary" : "text-text-muted"}`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-4 gap-1">
          {[
            { label: "Journal", color: "text-green-primary", bg: "bg-green-primary/10" },
            { label: "Analytics", color: "text-blue-accent", bg: "bg-blue-accent/10" },
            { label: "Risk", color: "text-yellow-warn", bg: "bg-yellow-warn/10" },
            { label: "AI Mentor", color: "text-violet-accent", bg: "bg-violet-accent/10" },
          ].map((item) => (
            <div key={item.label} className={`${item.bg} rounded-lg p-1.5 flex flex-col items-center gap-0.5`}>
              <div className={`w-3 h-3 rounded ${item.bg} ${item.color} flex items-center justify-center text-[7px]`}>●</div>
              <span className={`text-[6px] ${item.color} leading-tight text-center`}>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Recent trades */}
        <div>
          <p className="text-[7px] font-medium text-text-secondary mb-1">Recent Trades</p>
          {[
            { sym: "NAS100", pnl: "+$320.00", pos: true },
            { sym: "EURUSD", pnl: "-$190.00", pos: false },
            { sym: "BTCUSD", pnl: "+$410.00", pos: true },
          ].map((t) => (
            <div key={t.sym} className="flex justify-between items-center py-0.5 border-b border-border-card/30 last:border-0">
              <span className="text-[7px] font-semibold text-text-primary">{t.sym}</span>
              <span className={`text-[7px] font-bold tabular-nums ${t.pos ? "text-green-primary" : "text-red-loss"}`}>{t.pnl}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="border-t border-border-card/60 bg-bg-card px-2 py-2 grid grid-cols-5 gap-0.5">
        {[
          { label: "Home", active: true },
          { label: "Journal", active: false },
          { label: "Calendar", active: false },
          { label: "AI", active: false },
          { label: "More", active: false },
        ].map((item) => (
          <div key={item.label} className="flex flex-col items-center gap-0.5">
            <div className={`w-3 h-3 rounded ${item.active ? "bg-green-primary/20" : "bg-border-card"}`} />
            <span className={`text-[6px] ${item.active ? "text-green-primary" : "text-text-muted"}`}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Home indicator bar */}
      <div className="flex justify-center pb-1.5 pt-0.5 bg-bg-card">
        <div className="w-10 h-0.5 rounded-full bg-text-muted" />
      </div>
    </div>
  );
}
