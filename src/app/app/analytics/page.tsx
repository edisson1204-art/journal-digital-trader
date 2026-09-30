"use client";

import { AppShell } from "@/components/AppShell";
import { useState, useMemo } from "react";
import { useTradeStore } from "@/store/tradeStore";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip as ReTooltip, CartesianGrid, Cell,
  PieChart, Pie, Legend,
} from "recharts";

/* ════════════════════════════════════════════════
   TOOLTIPS PERSONALIZADOS
════════════════════════════════════════════════ */
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

function DrawdownTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    return (
      <div className="rounded-xl border border-border-card bg-bg-card p-3 shadow-card">
        <p className="text-[10px] text-text-muted mb-1">{label}</p>
        <p className="text-[14px] font-bold tabular-nums text-red-loss leading-none">
          {val === 0 ? "$0" : `-$${Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        </p>
        <p className="text-[9px] text-text-muted mt-0.5">Caída desde el pico máximo</p>
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

function PieTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="rounded-xl border border-border-card bg-bg-card p-3 shadow-card min-w-[140px]">
        <p className="text-[11px] font-bold text-text-primary mb-1">{d.name}</p>
        <p className="text-[10px] text-text-muted">{d.trades} trades · {d.pct}%</p>
        <p className={`text-[13px] font-bold tabular-nums mt-1 ${d.pnl >= 0 ? "text-green-primary" : "text-red-loss"}`}>
          {d.pnl >= 0 ? "+" : ""}${d.pnl.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
}

/* ════════════════════════════════════════════════
   COLORES PARA PIE CHART
════════════════════════════════════════════════ */
const PIE_COLORS = ["#20E58D", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444", "#06B6D4", "#F97316", "#84CC16"];

/* ════════════════════════════════════════════════
   PÁGINA PRINCIPAL
════════════════════════════════════════════════ */
export default function AnalyticsPage() {
  const [period, setPeriod] = useState("6M");
  const { trades, stats, isHydrated } = useTradeStore();

  /* ── Filtrado por período ── */
  const filteredByPeriod = useMemo(() => {
    const now = new Date();
    const cutoff = new Date();
    if (period === "1W")      cutoff.setDate(now.getDate() - 7);
    else if (period === "1M") cutoff.setMonth(now.getMonth() - 1);
    else if (period === "3M") cutoff.setMonth(now.getMonth() - 3);
    else if (period === "6M") cutoff.setMonth(now.getMonth() - 6);
    else if (period === "1Y") cutoff.setFullYear(now.getFullYear() - 1);
    else cutoff.setFullYear(2000);

    return trades
      .filter(t => t.result !== "Open" && new Date(t.dateOpen) >= cutoff)
      .sort((a, b) => new Date(a.dateOpen).getTime() - new Date(b.dateOpen).getTime());
  }, [trades, period]);

  /* ── 1. Curva de Equity ── */
  const equityData = useMemo(() => {
    const result = [{ date: "Inicio", equity: 0 }];
    let current = 0;
    for (const t of filteredByPeriod) {
      current += t.netPnl || 0;
      result.push({ date: t.dateOpen, equity: parseFloat(current.toFixed(2)) });
    }
    return result.length > 1 ? result : [{ date: "Inicio", equity: 0 }, { date: "Hoy", equity: 0 }];
  }, [filteredByPeriod]);

  /* ── 2. Drawdown en el tiempo ── */
  const drawdownData = useMemo(() => {
    if (filteredByPeriod.length === 0) return [];
    let peak = 0;
    let equity = 0;
    return filteredByPeriod.map(t => {
      equity += t.netPnl || 0;
      if (equity > peak) peak = equity;
      const dd = peak > 0 ? equity - peak : 0; // siempre 0 o negativo
      return {
        date: t.dateOpen,
        drawdown: parseFloat(dd.toFixed(2)),
      };
    });
  }, [filteredByPeriod]);

  /* Métricas de drawdown */
  const ddStats = useMemo(() => {
    if (!drawdownData.length) return { max: 0, avg: 0, daysUnderwater: 0 };
    const vals = drawdownData.map(d => d.drawdown);
    const max = Math.min(...vals); // el más negativo
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
    const daysUnderwater = vals.filter(v => v < 0).length;
    return {
      max: parseFloat(max.toFixed(2)),
      avg: parseFloat(avg.toFixed(2)),
      daysUnderwater,
    };
  }, [drawdownData]);

  /* ── 3. P&L por Semana (ISO Week) ── */
  const weeklyPnl = useMemo(() => {
    const getISOWeek = (d: Date) => {
      const date = new Date(d); date.setHours(0, 0, 0, 0);
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
    return Object.entries(weeks).sort(([a], [b]) => a.localeCompare(b)).slice(-12)
      .map(([label, value]) => ({ label: label.replace(/^\d{4}-/, ""), value: parseFloat(value.toFixed(2)) }));
  }, [filteredByPeriod]);

  /* ── 4. Pie Chart por Instrumento ── */
  const instrumentPieData = useMemo(() => {
    const map: Record<string, { trades: number; wins: number; pnl: number }> = {};
    for (const t of filteredByPeriod) {
      const ins = t.instrument || "Desconocido";
      if (!map[ins]) map[ins] = { trades: 0, wins: 0, pnl: 0 };
      map[ins].trades++;
      if (t.result === "Win") map[ins].wins++;
      map[ins].pnl += t.netPnl || 0;
    }
    const total = filteredByPeriod.length || 1;
    return Object.entries(map)
      .map(([name, d]) => ({
        name,
        value: d.trades,
        trades: d.trades,
        pct: Math.round((d.trades / total) * 100),
        pnl: Math.round(d.pnl),
        winRate: Math.round((d.wins / d.trades) * 100),
      }))
      .sort((a, b) => b.trades - a.trades);
  }, [filteredByPeriod]);

  /* ── 5. Box Plot de R:R (usando barras de percentiles) ── */
  const rrData = useMemo(() => {
    const rrs = filteredByPeriod
      .filter(t => t.rMultiple !== undefined && t.rMultiple !== null)
      .map(t => t.rMultiple as number)
      .sort((a, b) => a - b);

    if (rrs.length < 4) return null;

    const q = (arr: number[], p: number) => {
      const idx = (arr.length - 1) * p;
      const lo = Math.floor(idx);
      const hi = Math.ceil(idx);
      return parseFloat((arr[lo] + (arr[hi] - arr[lo]) * (idx - lo)).toFixed(2));
    };

    const min  = parseFloat(Math.min(...rrs).toFixed(2));
    const p25  = q(rrs, 0.25);
    const med  = q(rrs, 0.5);
    const p75  = q(rrs, 0.75);
    const max  = parseFloat(Math.max(...rrs).toFixed(2));
    const mean = parseFloat((rrs.reduce((a, b) => a + b, 0) / rrs.length).toFixed(2));
    const iqr  = parseFloat((p75 - p25).toFixed(2));

    // Distribución por buckets para el histograma de R:R
    const buckets: Record<string, number> = {};
    for (const r of rrs) {
      const bucket = r < -2 ? "<-2R" : r < -1 ? "-2R a -1R" : r < 0 ? "-1R a 0R"
        : r < 1 ? "0R a 1R" : r < 2 ? "1R a 2R" : r < 3 ? "2R a 3R" : ">3R";
      buckets[bucket] = (buckets[bucket] || 0) + 1;
    }

    const ORDER = ["<-2R", "-2R a -1R", "-1R a 0R", "0R a 1R", "1R a 2R", "2R a 3R", ">3R"];
    const histogram = ORDER
      .filter(k => buckets[k] !== undefined)
      .map(k => ({
        bucket: k,
        count: buckets[k],
        color: k.startsWith("<") || k.startsWith("-") ? "#EF4444" : "#20E58D",
      }));

    return { min, p25, med, p75, max, mean, iqr, histogram, total: rrs.length };
  }, [filteredByPeriod]);

  /* ── 6. Rendimiento por Estrategia ── */
  const strategyData = useMemo(() => {
    const map: Record<string, { wins: number; total: number; pnl: number }> = {};
    for (const t of filteredByPeriod) {
      const s = t.strategy || "Sin Estrategia";
      if (!map[s]) map[s] = { wins: 0, total: 0, pnl: 0 };
      map[s].total++;
      if (t.result === "Win") map[s].wins++;
      map[s].pnl += t.netPnl || 0;
    }
    return Object.entries(map).map(([name, data]) => ({
      name,
      trades: data.total,
      winRate: Math.round((data.wins / data.total) * 100),
      pnlRaw: data.pnl,
      pnl: `${data.pnl >= 0 ? "+" : ""}$${Math.abs(data.pnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      color: data.pnl >= 0 ? "bg-green-primary" : "bg-red-loss",
    })).sort((a, b) => b.pnlRaw - a.pnlRaw);
  }, [filteredByPeriod]);

  /* ── 7. Rendimiento por Instrumento (tabla) ── */
  const instrumentData = useMemo(() => instrumentPieData.map(d => ({
    sym: d.name, trades: d.trades, winRate: d.winRate,
    pnlRaw: d.pnl, pnl: `${d.pnl >= 0 ? "+" : ""}$${Math.abs(d.pnl).toLocaleString()}`,
  })), [instrumentPieData]);

  if (!isHydrated) return null;

  const periodLabel: Record<string, string> = {
    "1W": "última semana", "1M": "último mes", "3M": "últimos 3 meses",
    "6M": "últimos 6 meses", "1Y": "último año", "Todos": "histórico completo",
  };

  return (
    <AppShell title="Analytics" subtitle={`Análisis estadístico — ${periodLabel[period]}`}>
      <div className="flex flex-col gap-5 w-full max-w-[1800px] mx-auto">

        {/* ── Selector de período ── */}
        <div className="flex items-center gap-2 flex-wrap">
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
          <span className="text-[10px] text-text-muted ml-1">
            {filteredByPeriod.length} operaciones en el período
          </span>
        </div>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Net P&L",       value: `${stats.totalNet >= 0 ? "+" : ""}$${stats.totalNet.toLocaleString()}`,       color: stats.totalNet >= 0 ? "text-green-primary" : "text-red-loss" },
            { label: "Win Rate",      value: `${stats.winRate}%`,                                                           color: stats.winRate >= 50 ? "text-blue-accent" : "text-yellow-warn" },
            { label: "Profit Factor", value: `${stats.profitFactor}`,                                                       color: stats.profitFactor >= 1.5 ? "text-green-primary" : "text-yellow-warn" },
            { label: "Avg R:R",       value: `1:${stats.avgRMultiple}`,                                                     color: "text-text-primary" },
            { label: "Max Drawdown",  value: `-$${Math.abs(stats.maxDrawdown).toLocaleString()}`,                           color: "text-red-loss" },
            { label: "Expectancy",    value: `${stats.expectancy >= 0 ? "+" : ""}$${stats.expectancy.toFixed(2)}`,         color: stats.expectancy >= 0 ? "text-green-primary" : "text-red-loss" },
          ].map(m => (
            <div key={m.label} className="rounded-card border border-border-card bg-bg-card p-3">
              <p className="text-[10px] text-text-muted mb-1">{m.label}</p>
              <p className={`text-[17px] font-bold tabular-nums ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* ── Equity + Semanal ── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-8 2xl:col-span-9 rounded-card border border-border-card bg-bg-card p-6 flex flex-col min-h-[380px]">
            <div className="mb-3">
              <p className="text-sm font-semibold text-text-primary">📈 Curva de Equity</p>
              <p className="text-[11px] text-text-muted mt-0.5">
                Evolución acumulada del capital neto trade por trade. Muestra si tu cuenta crece de forma consistente o volátil. Período: <strong className="text-text-secondary">{periodLabel[period]}</strong>.
              </p>
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
                  <YAxis tick={{ fontSize: 9, fill: "#6B7280" }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                  <ReTooltip content={<EquityTooltip />} />
                  <Area type="monotone" dataKey="equity" stroke="#20E58D" strokeWidth={3} fillOpacity={1} fill="url(#colorEqAna)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="xl:col-span-4 2xl:col-span-3 rounded-card border border-border-card bg-bg-card p-6 flex flex-col min-h-[380px]">
            <div className="mb-3">
              <p className="text-sm font-semibold text-text-primary">📊 P&L por Semana</p>
              <p className="text-[11px] text-text-muted mt-0.5">
                P&L neto acumulado por semana ISO. Verde = semana ganadora, Rojo = semana perdedora. Últimas 12 semanas del período.
              </p>
            </div>
            <div className="flex-1 w-full min-h-0">
              {weeklyPnl.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyPnl} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#19374D" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#6B7280" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "#6B7280" }} tickLine={false} axisLine={false} />
                    <ReTooltip cursor={{ fill: "#ffffff10" }} content={<BarTooltip />} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {weeklyPnl.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.value >= 0 ? "#20E58D" : "#EF4444"} opacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-[11px] text-text-muted">
                  Sin datos para el período seleccionado.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            NUEVO #1: GRÁFICO DE DRAWDOWN EN EL TIEMPO
        ══════════════════════════════════════════════ */}
        <div className="rounded-card border border-red-loss/20 bg-bg-card p-6 flex flex-col min-h-[320px]">
          <div className="mb-3">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">📉 Curva de Drawdown</p>
                <p className="text-[11px] text-text-muted mt-0.5 max-w-2xl">
                  Mide la caída acumulada de tu capital desde el <strong className="text-text-secondary">pico máximo histórico</strong> hasta el punto actual, en cada operación del período.
                  Un drawdown de <strong className="text-red-loss">-$500</strong> significa que en ese momento tenías $500 menos que tu mejor resultado anterior.
                  Ideal para medir tu <strong className="text-text-secondary">tolerancia al riesgo y recuperación</strong>.
                  Período analizado: <strong className="text-text-secondary">{periodLabel[period]}</strong>.
                </p>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                {[
                  { label: "Max Drawdown", value: `$${Math.abs(ddStats.max).toLocaleString()}`, color: "text-red-loss" },
                  { label: "DD Promedio",  value: `$${Math.abs(ddStats.avg).toLocaleString()}`,  color: "text-yellow-warn" },
                  { label: "Trades en DD", value: `${ddStats.daysUnderwater}`,                   color: "text-text-muted" },
                ].map(s => (
                  <div key={s.label} className="text-right">
                    <p className="text-[9px] text-text-muted">{s.label}</p>
                    <p className={`text-[14px] font-bold tabular-nums ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex-1 w-full min-h-0" style={{ minHeight: 200 }}>
            {drawdownData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={drawdownData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorDD" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="#19374D" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#6B7280" }} tickLine={false} axisLine={false} minTickGap={40} />
                  <YAxis tick={{ fontSize: 9, fill: "#6B7280" }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                  <ReTooltip content={<DrawdownTooltip />} />
                  <Area type="monotone" dataKey="drawdown" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorDD)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-[11px] text-text-muted">
                Sin datos suficientes. Registra al menos 2 operaciones cerradas.
              </div>
            )}
          </div>
          <p className="text-[10px] text-text-muted mt-2 pt-2 border-t border-border-card/40">
            💡 Un buen trader institucional mantiene su drawdown por debajo del <strong>10%</strong> de su capital. Drawdown cero durante más de 5 trades consecutivos indica consistencia alta.
          </p>
        </div>

        {/* ══════════════════════════════════════════════
            NUEVO #2: PIE CHART POR INSTRUMENTO
        ══════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="rounded-card border border-border-card bg-bg-card p-6">
            <div className="mb-4">
              <p className="text-sm font-semibold text-text-primary">🥧 Distribución por Instrumento</p>
              <p className="text-[11px] text-text-muted mt-0.5">
                Qué porcentaje de tus operaciones se concentran en cada instrumento durante el período seleccionado (<strong className="text-text-secondary">{periodLabel[period]}</strong>).
                Detecta si estás <strong className="text-text-secondary">sobreexponiendo</strong> tu capital a un solo activo o diversificando correctamente.
              </p>
            </div>
            {instrumentPieData.length > 0 ? (
              <div className="flex flex-col gap-4">
                <div style={{ width: "100%", height: 240 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={instrumentPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius="45%"
                        outerRadius="70%"
                        dataKey="value"
                        paddingAngle={2}
                        label={(props: any) => props.pct > 5 ? `${props.name} ${props.pct}%` : ""}
                        labelLine={false}
                      >
                        {instrumentPieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} opacity={0.9} />
                        ))}
                      </Pie>
                      <ReTooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Leyenda manual con P&L */}
                <div className="grid grid-cols-2 gap-2">
                  {instrumentPieData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-[11px] text-text-secondary font-medium truncate">{d.name}</span>
                      <span className="text-[10px] text-text-muted ml-auto">{d.pct}%</span>
                      <span className={`text-[10px] font-bold tabular-nums ${d.pnl >= 0 ? "text-green-primary" : "text-red-loss"}`}>
                        {d.pnl >= 0 ? "+" : ""}${d.pnl.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-[11px] text-text-muted">
                Sin datos en el período seleccionado.
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════
              NUEVO #3: BOX PLOT / HISTOGRAMA DE R:R
          ══════════════════════════════════════════════ */}
          <div className="rounded-card border border-border-card bg-bg-card p-6">
            <div className="mb-4">
              <p className="text-sm font-semibold text-text-primary">📦 Distribución de R:R (Risk/Reward)</p>
              <p className="text-[11px] text-text-muted mt-0.5">
                Histograma de cuántos trades caen en cada rango de múltiplo R. Muestra si tus trades ganadores compensan matemáticamente a los perdedores.
                Un trader rentable debe tener más peso en <strong className="text-green-primary">+1R a +3R</strong> que en <strong className="text-red-loss">-1R a -2R</strong>.
                Período: <strong className="text-text-secondary">{periodLabel[period]}</strong>.
              </p>
            </div>
            {rrData ? (
              <div className="flex flex-col gap-4">
                {/* Estadísticas de R:R */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Mediana R",  value: `${rrData.med}R`,  color: rrData.med >= 0 ? "text-green-primary" : "text-red-loss" },
                    { label: "Media R",    value: `${rrData.mean}R`, color: rrData.mean >= 0 ? "text-green-primary" : "text-red-loss" },
                    { label: "IQR (Q3-Q1)", value: `${rrData.iqr}R`, color: "text-blue-accent" },
                    { label: "Mejor trade", value: `+${rrData.max}R`, color: "text-green-primary" },
                    { label: "Peor trade",  value: `${rrData.min}R`,  color: "text-red-loss" },
                    { label: "N trades",    value: `${rrData.total}`, color: "text-text-muted" },
                  ].map(s => (
                    <div key={s.label} className="rounded-lg bg-bg-section border border-border-card/50 p-2.5 text-center">
                      <p className="text-[9px] text-text-muted">{s.label}</p>
                      <p className={`text-[13px] font-bold tabular-nums mt-0.5 ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
                {/* Histograma */}
                <div style={{ width: "100%", height: 180 }}>
                  <ResponsiveContainer>
                    <BarChart data={rrData.histogram} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#19374D" vertical={false} />
                      <XAxis dataKey="bucket" tick={{ fontSize: 8, fill: "#6B7280" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: "#6B7280" }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <ReTooltip
                        cursor={{ fill: "#ffffff08" }}
                        content={({ active, payload, label }: any) => {
                          if (active && payload && payload.length) return (
                            <div className="rounded-xl border border-border-card bg-bg-card p-3 shadow-card">
                              <p className="text-[11px] font-bold text-text-primary">{label}</p>
                              <p className="text-[10px] text-text-muted">{payload[0].value} trades</p>
                            </div>
                          );
                          return null;
                        }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {rrData.histogram.map((entry, i) => (
                          <Cell key={`cell-${i}`} fill={entry.color} opacity={0.85} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-text-muted border-t border-border-card/40 pt-2">
                  💡 IQR bajo = R:R consistente. IQR alto = variabilidad peligrosa. Mediana {rrData.med >= 1 ? `+${rrData.med}R ✅ Saludable` : `${rrData.med}R ⚠️ Revisar stops`}.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 gap-2 text-center">
                <p className="text-[12px] text-text-muted">Sin suficientes datos de R:R.</p>
                <p className="text-[10px] text-text-muted max-w-xs">
                  Asegúrate de registrar el campo <strong className="text-text-secondary">R Múltiple</strong> en tus operaciones para ver esta gráfica.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Estrategias + Instrumentos (tabla) ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="rounded-card border border-border-card bg-bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border-card/60">
              <p className="text-sm font-semibold text-text-primary">Rendimiento por Estrategia</p>
              <p className="text-[11px] text-text-muted mt-0.5">P&L y Win Rate por estrategia — período: {periodLabel[period]}</p>
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
                      <span className={`font-bold tabular-nums ${s.pnlRaw >= 0 ? "text-green-primary" : "text-red-loss"}`}>{s.pnl}</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-border-card overflow-hidden">
                    <div className={`h-full rounded-full ${s.color}`} style={{ width: `${s.winRate}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-card border border-border-card bg-bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border-card/60">
              <p className="text-sm font-semibold text-text-primary">Rendimiento por Instrumento</p>
              <p className="text-[11px] text-text-muted mt-0.5">Tabla detallada — período: {periodLabel[period]}</p>
            </div>
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border-card/40">
                    {["Instrumento", "Trades", "Win Rate", "P&L"].map(h => (
                      <th key={h} className="px-5 py-2.5 text-left text-[10px] uppercase tracking-wide text-text-muted font-medium sticky top-0 bg-bg-card">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-card/30">
                  {instrumentData.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-4 text-[11px] text-text-muted">Sin instrumentos en el período.</td></tr>
                  )}
                  {instrumentData.map(r => (
                    <tr key={r.sym} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-3 font-bold text-text-primary">{r.sym}</td>
                      <td className="px-5 py-3 text-text-muted tabular-nums">{r.trades}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-border-card overflow-hidden">
                            <div className="h-full rounded-full bg-blue-accent" style={{ width: `${r.winRate}%` }} />
                          </div>
                          <span className="text-blue-accent tabular-nums">{r.winRate}%</span>
                        </div>
                      </td>
                      <td className={`px-5 py-3 font-bold tabular-nums ${r.pnlRaw >= 0 ? "text-green-primary" : "text-red-loss"}`}>{r.pnl}</td>
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
