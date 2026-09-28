"use client";

import { AppShell } from "@/components/AppShell";
import { useState } from "react";

const STRATEGIES: any[] = [];

export default function StrategiesPage() {
  const [selected, setSelected] = useState<number | null>(null); if (STRATEGIES.length === 0) return <div className="p-10 text-center text-text-muted">Aún no hay estrategias registradas. Empieza a operar para ver tus estadísticas.</div>;
  const sel = STRATEGIES.find(s => s.id === selected);

  const gradeColor = (g: string) =>
    g === "A+" ? "text-green-primary bg-green-primary/15 border-green-primary/30" :
    g === "A"  ? "text-green-primary bg-green-primary/10 border-green-primary/20" :
    g === "B"  ? "text-blue-accent bg-blue-accent/10 border-blue-accent/20" :
    "text-yellow-warn bg-yellow-warn/10 border-yellow-warn/20";

  return (
    <AppShell title="Libro de Estrategias" subtitle="Gestiona y evalÃºa cada estrategia de trading">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 w-full max-w-[1800px] mx-auto">

        {/* â”€â”€ Strategy list â”€â”€ */}
        <div className="flex flex-col gap-3">
          {STRATEGIES.map(s => (
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
                  {!s.active && (
                    <span className="flex-shrink-0 rounded-full bg-red-loss/15 border border-red-loss/30 px-2 py-0.5 text-[9px] font-bold text-red-loss">PAUSADA</span>
                  )}
                </div>
                <span className="flex-shrink-0 rounded bg-bg-section border border-border-card px-2 py-0.5 text-[10px] text-text-muted">{s.type}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px]">
                <div>
                  <p className="text-[9px] text-text-muted">Win Rate</p>
                  <p className={`font-bold ${s.winRate>=65?"text-green-primary":s.winRate>=55?"text-blue-accent":"text-yellow-warn"}`}>{s.winRate}%</p>
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
                  <p className="text-[9px] text-text-muted">Net P&L</p>
                  <p className={`font-bold ${s.netPnl.startsWith("+")?"text-green-primary":"text-red-loss"}`}>{s.netPnl}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-3">
                {s.instruments.map((ins: string) => (
                  <span key={ins} className="rounded-full bg-violet-accent/10 border border-violet-accent/20 px-2 py-0.5 text-[9px] text-violet-accent">{ins}</span>
                ))}
              </div>

              {/* Win rate bar */}
              <div className="mt-3 h-1.5 rounded-full bg-border-card overflow-hidden">
                <div className="h-full rounded-full bg-green-primary transition-all" style={{ width:`${s.winRate}%` }} />
              </div>
            </button>
          ))}
        </div>

        {/* â”€â”€ Detail panel â”€â”€ */}
        <div className="rounded-card border border-border-card bg-bg-card p-6">
          {sel ? (
            <>
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${gradeColor(sel.grade)}`}>{sel.grade}</span>
                  <span className="text-[10px] text-text-muted">{sel.type}</span>
                </div>
                <h2 className="text-[16px] font-bold text-text-primary mb-1">{sel.name}</h2>
                <p className="text-[12px] text-text-secondary leading-relaxed">{sel.notes}</p>
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">EstadÃ­sticas</p>
                {[
                  { label:"Win Rate",       value:`${sel.winRate}%`,  color: sel.winRate>=65?"text-green-primary":"text-blue-accent" },
                  { label:"Avg R:R",        value: sel.avgRR,          color:"text-blue-accent"   },
                  { label:"Total Trades",   value: String(sel.trades), color:"text-text-primary"  },
                  { label:"Net P&L",        value: sel.netPnl,         color:"text-green-primary" },
                  { label:"Grado",          value: sel.grade,          color: sel.grade.startsWith("A")?"text-green-primary":"text-blue-accent" },
                  { label:"Estado",         value: sel.active?"Activa":"Pausada", color: sel.active?"text-green-primary":"text-red-loss" },
                ].map(r => (
                  <div key={r.label} className="flex justify-between py-2 border-b border-border-card/30 text-[12px]">
                    <span className="text-text-muted">{r.label}</span>
                    <span className={`font-bold ${r.color}`}>{r.value}</span>
                  </div>
                ))}

                <div className="mt-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">Instrumentos</p>
                  <div className="flex flex-wrap gap-2">
                    {sel.instruments.map((ins: string) => (
                      <span key={ins} className="rounded-full bg-violet-accent/10 border border-violet-accent/20 px-3 py-1 text-[11px] text-violet-accent">{ins}</span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center gap-3">
              <p className="text-4xl">ðŸ“˜</p>
              <p className="text-sm text-text-secondary">Selecciona una estrategia para ver su detalle</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}



