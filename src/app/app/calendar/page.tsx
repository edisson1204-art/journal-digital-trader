"use client";

import { AppShell } from "@/components/AppShell";
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTradeStore } from "@/store/tradeStore";

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAYS_SHORT = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function pnlColor(pnl: number, trades: number) {
  if (trades === 0) return "";
  if (pnl > 500)  return "bg-green-primary text-bg-main";
  if (pnl > 0)    return "bg-green-primary/40 text-green-primary";
  if (pnl === 0)  return "bg-yellow-warn/30 text-yellow-warn";
  if (pnl > -200) return "bg-red-loss/30 text-red-loss";
  return "bg-red-loss/60 text-white";
}

export default function CalendarPage() {
  const { trades, isHydrated } = useTradeStore();
  const today = new Date();
  
  // Calcular TRADE_DAYS real
  const TRADE_DAYS = useMemo(() => {
    const map: Record<string, { pnl: number; trades: number; wins: number }> = {};
    const closed = trades.filter(t => t.result !== "Open");
    for (const t of closed) {
      const d = t.dateOpen; // ya viene en formato "YYYY-MM-DD"
      if (!map[d]) map[d] = { pnl: 0, trades: 0, wins: 0 };
      map[d].pnl += (t.netPnl || 0);
      map[d].trades++;
      if (t.result === "Win") map[d].wins++;
    }
    return map;
  }, [trades]);

  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  if (!isHydrated) return null;

  const days  = daysInMonth(year, month);
  const first = firstDayOfMonth(year, month);

  // Month stats
  const monthPrefix = `${year}-${String(month+1).padStart(2,"0")}`;
  const monthKeys = Object.keys(TRADE_DAYS).filter(k => k.startsWith(monthPrefix));
  const monthPnl    = monthKeys.reduce((s, k) => s + TRADE_DAYS[k].pnl, 0);
  const monthTrades = monthKeys.reduce((s, k) => s + TRADE_DAYS[k].trades, 0);
  const monthWins   = monthKeys.reduce((s, k) => s + TRADE_DAYS[k].wins, 0);
  const tradingDays = monthKeys.length;
  const profitDays  = monthKeys.filter(k => TRADE_DAYS[k].pnl > 0).length;
  const lossDays    = monthKeys.filter(k => TRADE_DAYS[k].pnl < 0).length;

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  return (
    <AppShell title="Calendario de Trading" subtitle="Visualiza tu consistencia día por día">
      <div className="flex flex-col gap-5 w-full max-w-[1800px] mx-auto">

        {/* ── Month KPIs ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label:"Net P&L del Mes",   value:`${monthPnl>=0?"+":""}$${Math.abs(monthPnl).toLocaleString()}`,  color: monthPnl>=0?"text-green-primary":"text-red-loss" },
            { label:"Días Operados",      value: String(tradingDays),   color:"text-text-primary" },
            { label:"Total Trades",       value: String(monthTrades),   color:"text-text-primary" },
            { label:"Días con Profit",    value: String(profitDays),    color:"text-green-primary" },
            { label:"Días con Pérdida",   value: String(lossDays),      color:"text-red-loss"      },
            { label:"Win Rate (trades)",  value: monthTrades ? `${Math.round(monthWins/monthTrades*100)}%` : "—", color:"text-blue-accent" },
          ].map(s => (
            <div key={s.label} className="rounded-card border border-border-card bg-bg-card p-3">
              <p className="text-[10px] text-text-muted mb-1">{s.label}</p>
              <p className={`text-[17px] font-bold tabular-nums ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Calendar grid ── */}
        <div className="rounded-card border border-border-card bg-bg-card p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10 text-text-secondary transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="text-[15px] font-bold text-text-primary">
              {MONTHS[month]} {year}
            </h2>
            <button onClick={nextMonth} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10 text-text-secondary transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1.5 mb-1.5">
            {DAYS_SHORT.map(d => (
              <div key={d} className={`text-center text-[10px] font-bold py-1 ${d === "Sáb" || d === "Dom" ? "text-text-muted" : "text-text-secondary"}`}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Empty cells before first day */}
            {Array.from({ length: first }).map((_, i) => <div key={`e${i}`} />)}

            {/* Day cells */}
            {Array.from({ length: days }).map((_, i) => {
              const day = i + 1;
              const key = dateKey(year, month, day);
              const data = TRADE_DAYS[key];
              const isWeekend = (first + i) % 7 === 0 || (first + i) % 7 === 6;
              const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

              return (
                <div
                  key={day}
                  className={`relative rounded-xl p-2 min-h-[72px] flex flex-col justify-between transition-all cursor-default ${
                    data ? `${pnlColor(data.pnl, data.trades)} border border-transparent` :
                    isWeekend ? "bg-bg-section/30 border border-transparent" :
                    "bg-bg-section/50 border border-border-card/30 hover:border-border-card"
                  } ${isToday ? "ring-2 ring-green-primary/50" : ""}`}
                  title={data ? `P&L: ${data.pnl >= 0 ? "+" : ""}$${data.pnl} · ${data.trades} trades · ${data.wins} wins` : undefined}
                >
                  <span className={`text-[11px] font-bold ${data ? "opacity-90" : isWeekend ? "text-text-muted" : "text-text-secondary"}`}>
                    {day}
                  </span>
                  {data && (
                    <div>
                      <p className="text-[11px] font-extrabold tabular-nums leading-tight">
                        {data.pnl >= 0 ? "+" : ""}${Math.abs(data.pnl).toLocaleString()}
                      </p>
                      <p className="text-[9px] opacity-75">{data.trades}T · {data.wins}W</p>
                    </div>
                  )}
                  {isWeekend && !data && (
                    <span className="text-[8px] opacity-40">—</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-5 pt-4 border-t border-border-card/40 text-[10px] text-text-muted">
            <span className="font-semibold">Leyenda:</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-green-primary" />Gran día (&gt;$500)</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-green-primary/40" />Día positivo</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-yellow-warn/30" />Breakeven</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-red-loss/30" />Pérdida menor</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-red-loss/60" />Pérdida mayor</span>
          </div>
        </div>

        {/* ── Day detail list ── */}
        {monthKeys.length > 0 && (
          <div className="rounded-card border border-border-card bg-bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border-card/60">
              <p className="text-sm font-semibold text-text-primary">Detalle por Día — {MONTHS[month]} {year}</p>
            </div>
            <div className="divide-y divide-border-card/30">
              {monthKeys.sort().map(key => {
                const d = TRADE_DAYS[key];
                const [, , dd] = key.split("-");
                // Aseguramos que la fecha se lea correctamente agregando T00:00:00 o parseando los trozos
                const parts = key.split("-").map(Number);
                const dayOfWeek = new Date(parts[0], parts[1]-1, parts[2]).toLocaleDateString("es-ES", { weekday:"long" });
                return (
                  <div key={key} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02]">
                    <div>
                      <p className="text-[13px] font-semibold text-text-primary capitalize">{dayOfWeek} {parseInt(dd)}</p>
                      <p className="text-[11px] text-text-muted">{d.trades} trades · {d.wins} wins · {d.trades - d.wins} losses</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-[16px] font-extrabold tabular-nums ${d.pnl>0?"text-green-primary":d.pnl<0?"text-red-loss":"text-yellow-warn"}`}>
                        {d.pnl >= 0 ? "+" : ""}${Math.abs(d.pnl).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-text-muted">{d.trades > 0 ? `Win rate: ${Math.round(d.wins/d.trades*100)}%` : ""}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
