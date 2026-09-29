"use client";

import { AppShell } from "@/components/AppShell";
import { useState, useMemo } from "react";
import { useTradeStore } from "@/store/tradeStore";
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, CartesianGrid, Cell } from "recharts";

/* ── Custom Tooltips ── */
function EquityTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    return (
      <div className="rounded-xl border border-border-card bg-bg-card p-3 shadow-card">
        <p className="text-[10px] text-text-muted mb-1">{label}</p>
        <p className={`text-[14px] font-bold tabular-nums leading-none ${val >= 0 ? "text-green-primary" : "text-red-loss"}`}>
          {val >= 0 ? "+" : ""}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
}

function BarTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    return (
      <div className="rounded-xl border border-border-card bg-bg-card p-3 shadow-card">
        <p className="text-[10px] text-text-muted mb-1">{label}</p>
        <p className={`text-[14px] font-bold tabular-nums leading-none ${val >= 0 ? "text-green-primary" : "text-red-loss"}`}>
          {val >= 0 ? "+" : ""}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("6M");
  const { trades, stats, isHydrated } = useTradeStore();

  // Helper: filtrar trades por período seleccionado
  const filteredByPeriod = useMemo(() => {
    const now = new Date();
    const cutoff = new Date();
    if (period === "1W")        cutoff.setDate(now.getDate() - 7);
    else if (period === "1M")   cutoff.setMonth(now.getMonth() - 1);
    else if (period === "3M")   cutoff.setMonth(now.getMonth() - 3);
    else if (period === "6M")   cutoff.setMonth(now.getMonth() - 6);
    else if (period === "1Y")   cutoff.setFullYear(now.getFullYear() - 1);
    else cutoff.setFullYear(2000); // "Todos"

    return trades
      .filter(t => t.result !== "Open" && new Date(t.dateOpen) >= cutoff)
      .sort((a, b) => new Date(a.dateOpen).getTime() - new Date(b.dateOpen).getTime());
  }, [trades, period]);

  // 1. Data para Curva Equity — ORDEN CRONOLÓGICO CORRECTO (antiguo → reciente)
  const equityData = useMemo(() => {
    const result = [{ date: "Inicio", equity: 0 }];
    let current = 0;
    for (const t of filteredByPeriod) {
      current += t.netPnl || 0;
      result.push({ date: t.dateOpen, equity: parseFloat(current.toFixed(2)) });
    }
    return result.length > 1 ? result : [{ date: "Inicio", equity: 0 }, { date: "Hoy", equity: 0 }];
  }, [filteredByPeriod]);

  // 2. Data para Weekly P&L — ISO Week correcto
  const weeklyPnl = useMemo(() => {
    const getISOWeek = (d: Date) => {
      const date = new Date(d); date.setHours(0,0,0,0);
      date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
      const week1 = new Date(date.getFullYear(), 0, 4);
      return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    };
    const weeks: Record<string, number> = {};
    for (const t of filteredByPeriod) {
      const d = new Date(t.dateOpen);
      const key = `${d.getFullYear()}-W${String(getISOWeek(d)).padStart(2, "0")}`;
      weeks[key] = (weeks[key] || 0) + (t.netPnl || 0);
    }
    return Object.entries(weeks).sort(([a],[b]) => a.localeCompare(b)).slice(-12)
      .map(([label, value]) => ({ label: label.replace(/^\d{4}-/,""), value: parseFloat(value.toFixed(2)) }));
  }, [filteredByPeriod]);

  // 3. Performance por Estrategia (basado en período filtrado)
  const strategyData = useMemo(() => {
    const map: Record<string, { wins: number; total: number; pnl: number }> = {};
    for (const t of filteredByPeriod) {
      const s = t.strategy || "Sin Estrategia";
      if (!map[s]) map[s] = { wins: 0, total: 0, pnl: 0 };
      map[s].total++;
      if (t.result === "Win") map[s].wins++;
      map[s].pnl += (t.netPnl || 0);
    }
    const colors = ["bg-blue-accent", "bg-green-primary", "bg-violet-accent", "bg-yellow-warn", "bg-text-secondary"];
    return Object.entries(map)
      .map(([name, data], idx) => ({
        name,
        trades: data.total,
        winRate: Math.round((data.wins / data.total) * 100),
        pnlRaw: data.pnl,
        pnl: `${data.pnl >= 0 ? "+" : ""}$${Math.abs(data.pnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        color: colors[idx % colors.length]
      }))
      .sort((a, b) => b.pnlRaw - a.pnlRaw);
  }, [filteredByPeriod]);

  // 4. Performance por Instrumento (basado en período filtrado)
  const instrumentData = useMemo(() => {
    const map: Record<string, { wins: number; total: number; pnl: number }> = {};
    for (const t of filteredByPeriod) {
      const i = t.instrument;
      if (!map[i]) map[i] = { wins: 0, total: 0, pnl: 0 };
      map[i].total++;
      if (t.result === "Win") map[i].wins++;
      map[i].pnl += (t.netPnl || 0);
    }
    return Object.entries(map)
      .map(([sym, data]) => ({
        sym,
        trades: data.total,
        winRate: Math.round((data.wins / data.total) * 100),
        pnlRaw: data.pnl,
        pnl: `${data.pnl >= 0 ? "+" : ""}$${Math.abs(data.pnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      }))
      .sort((a, b) => b.pnlRaw - a.pnlRaw);
  }, [filteredByPeriod]);


  if (!isHydrated) return null;

  return (
    <AppShell title="Analytics" subtitle="Descubre tu ventaja estadística">
      <div className="flex flex-col gap-5 w-full max-w-[1800px] mx-auto">

        {/* Period selector */}
        <div className="flex items-center gap-2">
          {["1W", "1M", "3M", "6M", "1Y", "Todos"].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-btn text-[11px] font-medium transition-colors ${
                period === p
                  ? "bg-green-primary/15 text-green-primary border border-green-primary/30"
                  : "bg-bg-card border border-border-card text-text-muted hover:text-text-secondary"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label:"Net P&L",       value:`${stats.totalNet>=0?"+":""}$${stats.totalNet.toLocaleString()}`, color:stats.totalNet>=0?"text-green-primary":"text-red-loss" },
            { label:"Win Rate",       value:`${stats.winRate}%`,   color:stats.winRate>=50?"text-blue-accent":"text-yellow-warn"   },
            { label:"Profit Factor",  value:`${stats.profitFactor}`,    color:stats.profitFactor>=1.5?"text-green-primary":"text-yellow-warn" },
            { label:"Avg R:R",        value:`1:${stats.avgRMultiple}`,   color:"text-text-primary"  },
            { label:"Max Drawdown",   value:`-$${Math.abs(stats.maxDrawdown).toLocaleString()}`,   color:"text-red-loss"      },
            { label:"Expectancy",     value:`${stats.expectancy>=0?"+":""}$${stats.expectancy.toFixed(2)}`,  color:stats.expectancy>=0?"text-green-primary":"text-red-loss" },
          ].map(m => (
            <div key={m.label} className="rounded-card border border-border-card bg-bg-card p-3">
              <p className="text-[10px] text-text-muted mb-1">{m.label}</p>
              <p className={`text-[17px] font-bold tabular-nums ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Equity curve + Weekly P&L */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-8 2xl:col-span-9 rounded-card border border-border-card bg-bg-card p-6 flex flex-col min-h-[380px]">
            <div>
              <p className="text-sm font-semibold text-text-primary mb-1">Curva de Equity</p>
              <p className="text-[11px] text-text-muted mb-4">Evolución de capital interactiva</p>
            </div>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEqAna" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#20E58D" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#20E58D" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="#19374D" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#6B7280" }} tickLine={false} axisLine={false} minTickGap={40} />
                  <YAxis tick={{ fontSize: 9, fill: "#6B7280" }} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                  <ReTooltip content={<EquityTooltip />} />
                  <Area type="monotone" dataKey="equity" stroke="#20E58D" strokeWidth={3} fillOpacity={1} fill="url(#colorEqAna)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="xl:col-span-4 2xl:col-span-3 rounded-card border border-border-card bg-bg-card p-6 flex flex-col min-h-[380px]">
            <div>
              <p className="text-sm font-semibold text-text-primary mb-1">P&L por Semana</p>
              <p className="text-[11px] text-text-muted mb-4">Últimas 10 semanas</p>
            </div>
            <div className="flex-1 w-full min-h-0">
              {weeklyPnl.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyPnl} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#19374D" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#6B7280" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "#6B7280" }} tickLine={false} axisLine={false} />
                    <ReTooltip cursor={{ fill: '#ffffff10' }} content={<BarTooltip />} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {weeklyPnl.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.value >= 0 ? '#20E58D' : '#EF4444'} opacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-[11px] text-text-muted">
                  No hay data suficiente.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Strategy performance + Instruments */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* By strategy */}
          <div className="rounded-card border border-border-card bg-bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border-card/60">
              <p className="text-sm font-semibold text-text-primary">Rendimiento por Estrategia</p>
            </div>
            <div className="p-5 flex flex-col gap-4 max-h-[300px] overflow-y-auto">
              {strategyData.length === 0 && <p className="text-[11px] text-text-muted text-center py-4">No hay estrategias registradas.</p>}
              {strategyData.map(s => (
                <div key={s.name} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium text-text-primary">{s.name}</span>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-text-muted">{s.trades} trades</span>
                      <span className="text-blue-accent font-medium">{s.winRate}% WR</span>
                      <span className={`font-bold tabular-nums ${s.pnlRaw >= 0 ? 'text-green-primary' : 'text-red-loss'}`}>{s.pnl}</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-border-card overflow-hidden">
                    <div className={`h-full rounded-full ${s.color}`} style={{ width:`${s.winRate}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* By instrument */}
          <div className="rounded-card border border-border-card bg-bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border-card/60">
              <p className="text-sm font-semibold text-text-primary">Rendimiento por Instrumento</p>
            </div>
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border-card/40">
                    {["Instrumento","Trades","Win Rate","P&L"].map(h => (
                      <th key={h} className="px-5 py-2.5 text-left text-[10px] uppercase tracking-wide text-text-muted font-medium sticky top-0 bg-bg-card">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-card/30">
                  {instrumentData.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-[11px] text-text-muted">No hay instrumentos registrados.</td>
                    </tr>
                  )}
                  {instrumentData.map(r => (
                    <tr key={r.sym} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-3 font-bold text-text-primary">{r.sym}</td>
                      <td className="px-5 py-3 text-text-muted tabular-nums">{r.trades}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-border-card overflow-hidden">
                            <div className="h-full rounded-full bg-blue-accent" style={{ width:`${r.winRate}%` }} />
                          </div>
                          <span className="text-blue-accent tabular-nums">{r.winRate}%</span>
                        </div>
                      </td>
                      <td className={`px-5 py-3 font-bold tabular-nums ${r.pnlRaw >= 0 ? 'text-green-primary' : 'text-red-loss'}`}>{r.pnl}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
