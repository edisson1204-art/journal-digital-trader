"use client";

import { AppShell } from "@/components/AppShell";
import { TrendingUp, TrendingDown, BarChart2, Target } from "lucide-react";
import { useTradeStore } from "@/store/tradeStore";
import { useMemo } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const pnl = payload[0].value;
    return (
      <div className="rounded-xl border border-border-card bg-bg-card p-3 shadow-card">
        <p className="text-[10px] text-text-muted mb-1">{label}</p>
        <p className={`text-lg font-bold tabular-nums leading-none ${pnl >= 0 ? "text-green-primary" : "text-red-loss"}`}>
          {pnl >= 0 ? "+" : ""}${pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
}

function EquityChart({ trades }: { trades: any[] }) {
  // Generar curva de equity interactiva
  const data = useMemo(() => {
    const closed = [...trades]
      .filter(t => t.result !== "Open")
      .sort((a, b) => new Date(a.dateOpen).getTime() - new Date(b.dateOpen).getTime());
    const result = [{ date: "Inicio", equity: 0 }];
    let current = 0;
    for (const t of closed) {
      current += t.netPnl || 0;
      result.push({
        date: `${t.dateOpen} ${t.timeOpen}`,
        equity: current,
      });
    }
    return result.length > 1 ? result : [{ date: "Inicio", equity: 0 }, { date: "Hoy", equity: 0 }];
  }, [trades]);

  return (
    <div style={{ width: '100%', height: 160 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#20E58D" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#20E58D" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" stroke="#19374D" vertical={false} />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 9, fill: "#6B7280" }} 
            tickLine={false} 
            axisLine={false}
            minTickGap={30}
          />
          <YAxis 
            tick={{ fontSize: 9, fill: "#6B7280" }} 
            tickLine={false} 
            axisLine={false}
            tickFormatter={(val) => `$${val}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="equity" 
            stroke="#20E58D" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorEquity)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function AppDashboard() {
  const { trades, stats, isHydrated } = useTradeStore();
  const { t } = useTranslation();

  const recentTrades = useMemo(() => trades.slice(0, 5), [trades]);

  const topMetrics = [
    { label: t("dashboard.netPnl"),         value:`${stats.totalNet >= 0?"+":""}$${stats.totalNet.toLocaleString()}`, change:"Global",  icon: TrendingUp,   color: stats.totalNet >= 0 ? "text-green-primary" : "text-red-loss", bg: stats.totalNet >= 0 ? "bg-green-primary/10" : "bg-red-loss/10",  positive: stats.totalNet >= 0 },
    { label: t("dashboard.winRate"),        value:`${stats.winRate}%`,       change:"Global",   icon: Target,        color:"text-blue-accent",   bg:"bg-blue-accent/10",    positive: stats.winRate >= 50  },
    { label: t("dashboard.profitFactor"),   value:`${stats.profitFactor}`,   change:"Global",   icon: BarChart2,     color: stats.profitFactor >= 1.5 ? "text-green-primary" : "text-yellow-warn", bg: stats.profitFactor >= 1.5 ? "bg-green-primary/10" : "bg-yellow-warn/10",  positive: stats.profitFactor >= 1  },
    { label: "Max Drawdown",    value:`-$${stats.maxDrawdown.toLocaleString()}`, change:"Global",   icon: TrendingDown,  color:"text-red-loss",      bg:"bg-red-loss/10",       positive:false },
  ];

  if (!isHydrated) return null; // Prevenir flicker en SSR

  return (
    <AppShell
      title={t("dashboard.greeting")}
      subtitle={t("dashboard.subtitle")}
    >
      <div className="flex flex-col gap-5 w-full max-w-[1800px] mx-auto">

        {/* ── KPI row ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {topMetrics.map(({ label, value, change, icon: Icon, color, bg, positive }) => (
            <div key={label} className="rounded-card border border-border-card bg-bg-card p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <p className="text-[12px] font-semibold text-text-muted uppercase tracking-wider">{label}</p>
                <div className={`h-9 w-9 rounded-xl ${bg} flex items-center justify-center`}>
                  <Icon className={`h-4.5 w-4.5 ${color}`} />
                </div>
              </div>
              <div>
                <p className={`text-3xl font-black tabular-nums leading-none tracking-tight ${color}`}>{value}</p>
                <p className={`text-[12px] mt-2 font-semibold ${positive ? "text-green-primary" : "text-red-loss"}`}>
                  {change}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Equity + Mini stats ── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          {/* Equity chart (Spans 8 or 9 columns) */}
          <div className="xl:col-span-8 2xl:col-span-9 rounded-card border border-border-card bg-bg-card p-6 flex flex-col min-h-[400px]">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-base font-bold text-text-primary">{t("dashboard.equityCurve")}</p>
                <p className="text-[12px] text-text-muted mt-0.5">{t("dashboard.equityDesc")}</p>
              </div>
            </div>
            <div className="flex-1">
              <EquityChart trades={trades} />
            </div>
          </div>

          {/* Right column: stats (Spans 4 or 3 columns) */}
          <div className="xl:col-span-4 2xl:col-span-3 flex flex-col gap-5">
            {/* Total trades */}
            <div className="rounded-card border border-border-card bg-bg-card p-6">
              <p className="text-[12px] font-semibold text-text-muted mb-2 uppercase tracking-wider">Total Trades</p>
              <p className="text-4xl font-black text-text-primary tabular-nums tracking-tight">{stats.totalTrades}</p>
              <div className="mt-5 flex flex-col gap-3">
                {[
                  { label:"Wins",      val:stats.wins, pct:stats.totalTrades ? Math.round(stats.wins/stats.totalTrades*100) : 0, color:"bg-green-primary" },
                  { label:"Losses",    val:stats.losses, pct:stats.totalTrades ? Math.round(stats.losses/stats.totalTrades*100) : 0, color:"bg-red-loss"      },
                  { label:"Breakeven", val:stats.breakevenCount,  pct:stats.totalTrades ? Math.round(stats.breakevenCount/stats.totalTrades*100) : 0,  color:"bg-yellow-warn"   },
                ].map(s => (
                  <div key={s.label}>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[11px] font-medium text-text-muted">{s.label}</span>
                      <span className="text-[11px] font-bold text-text-secondary tabular-nums">{s.val} ({s.pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-border-card overflow-hidden">
                      <div className={`h-full rounded-full ${s.color}`} style={{ width:`${s.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick stats */}
            <div className="rounded-card border border-border-card bg-bg-card p-6 grid grid-cols-2 gap-4 flex-1">
              {[
                { label:t("dashboard.avgRR"),     value:`1:${stats.avgRMultiple}`,   color:"text-green-primary" },
                { label:"Expectancy",  value:`${stats.expectancy>=0?"+":""}$${stats.expectancy}`, color: stats.expectancy>=0 ? "text-green-primary":"text-red-loss" },
                { label:"Avg Loss",    value:`$${stats.avgLoss}`,         color:"text-red-loss"      },
                { label:"Avg Win",     value:`+$${stats.avgWin}`,         color:"text-blue-accent"   },
              ].map(s => (
                <div key={s.label} className="flex flex-col justify-center">
                  <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1">{s.label}</p>
                  <p className={`text-[16px] font-black tabular-nums tracking-tight ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Recent Trades ── */}
        <div className="rounded-card border border-border-card bg-bg-card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-border-card/60">
            <p className="text-base font-bold text-text-primary">{t("dashboard.recentTrades")}</p>
            <a href="/app/journal" className="text-[12px] font-bold text-green-primary hover:underline">{t("dashboard.viewAll")} &rarr;</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border-card/50">
                  {["Instrumento","Estrategia","Lado","Entrada","Salida","P&L","Fecha"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wide text-text-muted font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentTrades.map(t => {
                  const isWin = (t.netPnl || 0) > 0;
                  return (
                  <tr key={t.id} className="border-b border-border-card/30 hover:bg-white/3 transition-colors">
                    <td className="px-4 py-2.5 font-semibold text-text-primary">{t.instrument}</td>
                    <td className="px-4 py-2.5 text-text-muted">{t.strategy}</td>
                    <td className={`px-4 py-2.5 font-medium ${t.side === "Buy" ? "text-green-primary" : "text-red-loss"}`}>{t.side}</td>
                    <td className="px-4 py-2.5 tabular-nums text-text-secondary">{t.avgEntryPrice}</td>
                    <td className="px-4 py-2.5 tabular-nums text-text-secondary">{t.avgExitPrice || "Abierto"}</td>
                    <td className={`px-4 py-2.5 tabular-nums font-bold ${isWin ? "text-green-primary" : "text-red-loss"}`}>
                      {isWin ? "+" : ""}${Math.abs(t.netPnl || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-text-muted">{t.dateOpen}</td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
