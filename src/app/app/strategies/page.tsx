"use client";

import { AppShell } from "@/components/AppShell";
import { useState, useMemo } from "react";
import { useTradeStore } from "@/store/tradeStore";
import { computeStats, formatProfitFactor, isStrictlyClosed, type TradeRecord } from "@/lib/tradeTypes";
import { BookOpen, Plus } from "lucide-react";

const gradeColor = (g: string) =>
  g === "A+" ? "text-green-primary bg-green-primary/15 border-green-primary/30" :
  g === "A"  ? "text-green-primary bg-green-primary/10 border-green-primary/20" :
  g === "B"  ? "text-blue-accent bg-blue-accent/10 border-blue-accent/20" :
               "text-yellow-warn bg-yellow-warn/10 border-yellow-warn/20";

export default function StrategiesPage() {
  const trades = useTradeStore(s => s.trades);
  const isHydrated = useTradeStore(s => s.isHydrated);
  const [selected, setSelected] = useState<string | null>(null);

  // Calcular estadísticas REALES por estrategia/setup usando el motor canónico computeStats
  const strategies = useMemo(() => {
    const closed = trades.filter(isStrictlyClosed);
    if (!closed.length) return [];

    const groups: Record<string, TradeRecord[]> = {};
    for (const t of closed) {
      const s = t.setup || t.strategy || "Sin Estrategia";
      if (!groups[s]) groups[s] = [];
      groups[s].push(t);
    }

    return Object.entries(groups).map(([name, groupTrades]) => {
      const st = computeStats(groupTrades);
      const winRate = st.winRate;
      const expectancy = st.expectancy;
      const pfText = formatProfitFactor(st);
      const avgRR = groupTrades.some(t => typeof t.rMultiple === "number" && Number.isFinite(t.rMultiple))
        ? `${st.avgRMultiple >= 0 ? "+" : ""}${st.avgRMultiple.toFixed(2)}R`
        : "—";

      const grade =
        winRate >= 65 && expectancy > 50 ? "A+" :
        winRate >= 55 && expectancy > 0  ? "A"  :
        winRate >= 45 && expectancy > 0  ? "B"  : "C";

      const instruments = Array.from(new Set(groupTrades.map(t => t.instrument).filter(Boolean)));

      return {
        id: name,
        name,
        grade,
        winRate,
        avgRR,
        expectancy,
        profitFactorText: pfText,
        trades: st.closedTrades,
        wins: st.wins,
        losses: st.losses,
        breakeven: st.breakevenCount,
        grossPnl: st.totalGross,
        netPnl: st.totalNet,
        commissions: st.totalCommissions,
        maxDrawdown: st.maxDrawdown,
        instruments,
      };
    }).sort((a, b) => b.netPnl - a.netPnl);
  }, [trades]);

  if (!isHydrated) return null;

  if (strategies.length === 0) {
    return (
      <AppShell title="Libro de Estrategias" subtitle="Estadísticas reales de cada estrategia operada">
        <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
          <BookOpen className="h-14 w-14 text-text-muted" />
          <p className="text-[15px] font-semibold text-text-secondary">Aún no hay estrategias registradas</p>
          <p className="text-[12px] text-text-muted max-w-xs">
            Registra operaciones con el campo &quot;Estrategia&quot; completado y aquí verás las estadísticas reales de cada una automáticamente.
          </p>
          <a href="/app/journal"
            className="flex items-center gap-2 rounded-btn bg-green-primary px-5 py-2.5 text-[13px] font-bold text-bg-main mt-2">
            <Plus className="h-4 w-4" /> Registrar primera operación
          </a>
        </div>
      </AppShell>
    );
  }

  const sel = strategies.find(s => s.id === selected) ?? strategies[0];

  return (
    <AppShell title="Libro de Estrategias" subtitle={`${strategies.length} estrategia${strategies.length > 1 ? "s" : ""} conciliadas con el Journal y el Centro de Reportes`}>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 w-full max-w-[1800px] mx-auto">

        {/* ── Lista de estrategias ── */}
        <div className="flex flex-col gap-3">
          {strategies.map(s => (
            <button
              key={s.id}
              onClick={() => setSelected(s.id)}
              className={`rounded-card border p-5 text-left transition-all ${
                sel?.id === s.id
                  ? "border-green-primary/40 bg-green-primary/5"
                  : "border-border-card bg-bg-card hover:border-border-card hover:bg-bg-section/50"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${gradeColor(s.grade)}`}>{s.grade}</span>
                  <h3 className="text-[14px] font-bold text-text-primary truncate">{s.name}</h3>
                </div>
                <span className={`flex-shrink-0 text-[13px] font-black tabular-nums ${s.netPnl >= 0 ? "text-green-primary" : "text-red-loss"}`}>
                  {s.netPnl >= 0 ? "+" : "-"}${Math.abs(s.netPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-[12px]">
                <div>
                  <p className="text-[9px] text-text-muted">Win Rate</p>
                  <p className={`font-bold tabular-nums ${s.winRate >= 65 ? "text-green-primary" : s.winRate >= 50 ? "text-blue-accent" : "text-yellow-warn"}`}>
                    {s.winRate.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-text-muted">Profit Factor</p>
                  <p className="font-bold text-green-primary tabular-nums">{s.profitFactorText}</p>
                </div>
                <div>
                  <p className="text-[9px] text-text-muted">Avg R-Múltiplo</p>
                  <p className="font-bold text-blue-accent tabular-nums">{s.avgRR}</p>
                </div>
                <div>
                  <p className="text-[9px] text-text-muted">Muestra (Trades)</p>
                  <p className="font-bold text-text-primary tabular-nums">{s.trades} ({s.wins}W/{s.losses}L)</p>
                </div>
                <div>
                  <p className="text-[9px] text-text-muted">Expectativa / Trade</p>
                  <p className={`font-bold tabular-nums ${s.expectancy >= 0 ? "text-green-primary" : "text-red-loss"}`}>
                    {s.expectancy >= 0 ? "+" : "-"}${Math.abs(s.expectancy).toFixed(2)}
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
        <div className="rounded-card border border-border-card bg-bg-card p-6 h-fit">
          {sel && (
            <>
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${gradeColor(sel.grade)}`}>{sel.grade}</span>
                </div>
                <h2 className="text-[16px] font-bold text-text-primary mb-1">{sel.name}</h2>
                <p className="text-[11px] text-text-muted">Conciliado sobre {sel.trades} operaciones cerradas reales</p>
              </div>

              <div className="flex flex-col gap-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Métricas Auditadas</p>
                {[
                  { label: "Win Rate",          value: `${sel.winRate.toFixed(1)}%`,    color: sel.winRate >= 60 ? "text-green-primary" : "text-blue-accent" },
                  { label: "Profit Factor",     value: sel.profitFactorText,            color: "text-green-primary" },
                  { label: "Avg R-Múltiplo",    value: sel.avgRR,                       color: "text-blue-accent" },
                  { label: "Total Trades",      value: String(sel.trades),              color: "text-text-primary" },
                  { label: "Wins / Losses / BE",value: `${sel.wins} / ${sel.losses} / ${sel.breakeven}`, color: "text-text-secondary" },
                  { label: "Expectativa/trade", value: `${sel.expectancy >= 0 ? "+" : "-"}$${Math.abs(sel.expectancy).toFixed(2)}`, color: sel.expectancy >= 0 ? "text-green-primary" : "text-red-loss" },
                  { label: "Gross P&L",         value: `${sel.grossPnl >= 0 ? "+" : "-"}$${Math.abs(sel.grossPnl).toFixed(2)}`, color: sel.grossPnl >= 0 ? "text-green-primary" : "text-red-loss" },
                  { label: "Comisiones totales",value: `-$${sel.commissions.toFixed(2)}`, color: "text-yellow-warn" },
                  { label: "Net P&L",           value: `${sel.netPnl >= 0 ? "+" : "-"}$${Math.abs(sel.netPnl).toFixed(2)}`, color: sel.netPnl >= 0 ? "text-green-primary" : "text-red-loss" },
                  { label: "Max Drawdown",      value: `-$${sel.maxDrawdown.toFixed(2)}`, color: "text-red-loss" },
                ].map(r => (
                  <div key={r.label} className="flex justify-between py-2 border-b border-border-card/30 text-[12px]">
                    <span className="text-text-muted">{r.label}</span>
                    <span className={`font-bold tabular-nums ${r.color}`}>{r.value}</span>
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
          )}
        </div>
      </div>
    </AppShell>
  );
}
