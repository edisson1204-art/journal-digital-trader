"use client";

import { AppShell } from "@/components/AppShell";
import { useState, useMemo } from "react";
import { useTradeStore } from "@/store/tradeStore";
import { computeStats } from "@/lib/tradeTypes";
import { BookOpen, TrendingUp, TrendingDown, Plus } from "lucide-react";

const gradeColor = (g: string) =>
  g === "A+" ? "text-green-primary bg-green-primary/15 border-green-primary/30" :
  g === "A"  ? "text-green-primary bg-green-primary/10 border-green-primary/20" :
  g === "B"  ? "text-blue-accent bg-blue-accent/10 border-blue-accent/20" :
               "text-yellow-warn bg-yellow-warn/10 border-yellow-warn/20";

export default function StrategiesPage() {
  const trades = useTradeStore(s => s.trades);
  const isHydrated = useTradeStore(s => s.isHydrated);
  const [selected, setSelected] = useState<string | null>(null);

  // Calcular estadísticas REALES por estrategia desde el tradeStore
  const strategies = useMemo(() => {
    const closed = trades.filter(t => t.result !== "Open");
    if (!closed.length) return [];

    const map: Record<string, {
      wins: number; losses: number; breakeven: number;
      total: number; netPnl: number; grossPnl: number;
      rMultiples: number[]; instruments: Set<string>;
      commissions: number;
    }> = {};

    for (const t of closed) {
      const s = t.strategy || "Sin Estrategia";
      if (!map[s]) map[s] = {
        wins: 0, losses: 0, breakeven: 0, total: 0,
        netPnl: 0, grossPnl: 0, rMultiples: [],
        instruments: new Set(), commissions: 0,
      };
      map[s].total++;
      map[s].netPnl += t.netPnl || 0;
      map[s].grossPnl += t.grossPnl || 0;
      map[s].commissions += t.totalCommission || 0;
      if (t.result === "Win") map[s].wins++;
      else if (t.result === "Loss") map[s].losses++;
      else map[s].breakeven++;
      if (t.rMultiple !== undefined) map[s].rMultiples.push(t.rMultiple);
      map[s].instruments.add(t.instrument);
    }

    return Object.entries(map).map(([name, d]) => {
      const winRate = Math.round((d.wins / d.total) * 100);
      const avgRR = d.rMultiples.length
        ? (d.rMultiples.reduce((a, b) => a + b, 0) / d.rMultiples.length).toFixed(2)
        : "—";
      const expectancy = parseFloat((d.netPnl / d.total).toFixed(2));
      const profitFactor = d.losses > 0
        ? parseFloat((d.grossPnl > 0 ? d.grossPnl / Math.abs(d.commissions + (d.netPnl < 0 ? Math.abs(d.netPnl) : 0)) : 0).toFixed(2))
        : d.wins > 0 ? 99.99 : 0;

      // Grade automático basado en Win Rate + Expectancy
      const grade =
        winRate >= 65 && expectancy > 50 ? "A+" :
        winRate >= 55 && expectancy > 0  ? "A"  :
        winRate >= 45 && expectancy > 0  ? "B"  : "C";

      return {
        id: name,
        name,
        grade,
        winRate,
        avgRR,
        expectancy,
        profitFactor,
        trades: d.total,
        wins: d.wins,
        losses: d.losses,
        breakeven: d.breakeven,
        netPnl: d.netPnl,
        commissions: Math.round(d.commissions),
        instruments: Array.from(d.instruments).slice(0, 5),
      };
    }).sort((a, b) => b.netPnl - a.netPnl);
  }, [trades]);

  if (!isHydrated) return null;

  // Estado vacío — sin estrategias registradas aún
  if (strategies.length === 0) {
    return (
      <AppShell title="Libro de Estrategias" subtitle="Estadísticas reales de cada estrategia operada">
        <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
          <BookOpen className="h-14 w-14 text-text-muted" />
          <p className="text-[15px] font-semibold text-text-secondary">Aún no hay estrategias registradas</p>
          <p className="text-[12px] text-text-muted max-w-xs">
            Registra operaciones con el campo "Estrategia" completado y aquí verás las estadísticas reales de cada una automáticamente.
          </p>
          <a href="/app/journal"
            className="flex items-center gap-2 rounded-btn bg-green-primary px-5 py-2.5 text-[13px] font-bold text-bg-main mt-2">
            <Plus className="h-4 w-4" /> Registrar primera operación
          </a>
        </div>
      </AppShell>
    );
  }

  const sel = strategies.find(s => s.id === selected);

  return (
    <AppShell title="Libro de Estrategias" subtitle={`${strategies.length} estrategia${strategies.length > 1 ? "s" : ""} con datos reales del journal`}>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 w-full max-w-[1800px] mx-auto">

        {/* ── Lista de estrategias ── */}
        <div className="flex flex-col gap-3">
          {strategies.map(s => (
            <button
              key={s.id}
              onClick={() => setSelected(s.id === selected ? null : s.id)}
              className={`rounded-card border p-5 text-left transition-all ${
                selected === s.id
                  ? "border-green-primary/40 bg-green-primary/5"
                  : "border-border-card bg-bg-card hover:border-border-card hover:bg-bg-section/50"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${gradeColor(s.grade)}`}>{s.grade}</span>
                  <h3 className="text-[14px] font-bold text-text-primary truncate">{s.name}</h3>
                </div>
                <span className={`flex-shrink-0 text-[11px] font-bold tabular-nums ${s.netPnl >= 0 ? "text-green-primary" : "text-red-loss"}`}>
                  {s.netPnl >= 0 ? "+" : ""}${Math.round(s.netPnl).toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px]">
                <div>
                  <p className="text-[9px] text-text-muted">Win Rate</p>
                  <p className={`font-bold ${s.winRate >= 65 ? "text-green-primary" : s.winRate >= 50 ? "text-blue-accent" : "text-yellow-warn"}`}>{s.winRate}%</p>
                </div>
                <div>
                  <p className="text-[9px] text-text-muted">Avg R:R</p>
                  <p className="font-bold text-blue-accent">{s.avgRR}</p>
                </div>
                <div>
                  <p className="text-[9px] text-text-muted">Trades</p>
                  <p className="font-bold text-text-primary">{s.trades}</p>
                </div>
                <div>
                  <p className="text-[9px] text-text-muted">Expectancy/trade</p>
                  <p className={`font-bold ${s.expectancy >= 0 ? "text-green-primary" : "text-red-loss"}`}>
                    {s.expectancy >= 0 ? "+" : ""}${s.expectancy}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-3">
                {s.instruments.map(ins => (
                  <span key={ins} className="rounded-full bg-violet-accent/10 border border-violet-accent/20 px-2 py-0.5 text-[9px] text-violet-accent">{ins}</span>
                ))}
              </div>

              <div className="mt-3 h-1.5 rounded-full bg-border-card overflow-hidden">
                <div className="h-full rounded-full bg-green-primary transition-all" style={{ width: `${s.winRate}%` }} />
              </div>
            </button>
          ))}
        </div>

        {/* ── Panel de detalle ── */}
        <div className="rounded-card border border-border-card bg-bg-card p-6">
          {sel ? (
            <>
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${gradeColor(sel.grade)}`}>{sel.grade}</span>
                </div>
                <h2 className="text-[16px] font-bold text-text-primary mb-1">{sel.name}</h2>
                <p className="text-[11px] text-text-muted">Estadísticas calculadas de {sel.trades} trades reales</p>
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Estadísticas</p>
                {[
                  { label: "Win Rate",          value: `${sel.winRate}%`,    color: sel.winRate >= 60 ? "text-green-primary" : "text-blue-accent" },
                  { label: "Avg R:R",            value: sel.avgRR,            color: "text-blue-accent" },
                  { label: "Total Trades",       value: String(sel.trades),   color: "text-text-primary" },
                  { label: "Wins / Losses / BE", value: `${sel.wins} / ${sel.losses} / ${sel.breakeven}`, color: "text-text-secondary" },
                  { label: "Expectancy/trade",   value: `${sel.expectancy >= 0 ? "+" : ""}$${sel.expectancy}`, color: sel.expectancy >= 0 ? "text-green-primary" : "text-red-loss" },
                  { label: "Net P&L",            value: `${sel.netPnl >= 0 ? "+" : ""}$${Math.round(sel.netPnl).toLocaleString()}`, color: sel.netPnl >= 0 ? "text-green-primary" : "text-red-loss" },
                  { label: "Comisiones totales", value: `-$${sel.commissions.toLocaleString()}`, color: "text-yellow-warn" },
                  { label: "Grado auto",         value: sel.grade, color: sel.grade.startsWith("A") ? "text-green-primary" : "text-blue-accent" },
                ].map(r => (
                  <div key={r.label} className="flex justify-between py-2 border-b border-border-card/30 text-[12px]">
                    <span className="text-text-muted">{r.label}</span>
                    <span className={`font-bold ${r.color}`}>{r.value}</span>
                  </div>
                ))}

                <div className="mt-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">Instrumentos</p>
                  <div className="flex flex-wrap gap-2">
                    {sel.instruments.map(ins => (
                      <span key={ins} className="rounded-full bg-violet-accent/10 border border-violet-accent/20 px-3 py-1 text-[11px] text-violet-accent">{ins}</span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center gap-3">
              <BookOpen className="h-10 w-10 text-text-muted" />
              <p className="text-sm text-text-secondary">Selecciona una estrategia para ver su detalle</p>
              <p className="text-[11px] text-text-muted">Datos 100% reales del journal</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
