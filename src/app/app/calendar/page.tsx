"use client";

import { AppShell } from "@/components/AppShell";
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, X, TrendingUp, TrendingDown } from "lucide-react";
import { useTradeStore } from "@/store/tradeStore";
import { TradeRecord } from "@/lib/tradeTypes";

const MONTHS     = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAYS_SHORT = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

function daysInMonth(year: number, month: number)  { return new Date(year, month + 1, 0).getDate(); }
function firstDayOfMonth(year: number, month: number) { return new Date(year, month, 1).getDay(); }
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

/* ── Panel de detalle del día ── */
function DayDetailPanel({ date, dayTrades, onClose }: {
  date: string;
  dayTrades: TradeRecord[];
  onClose: () => void;
}) {
  const dayPnl   = dayTrades.reduce((s, t) => s + (t.netPnl || 0), 0);
  const dayWins  = dayTrades.filter(t => t.result === "Win").length;
  const parts    = date.split("-").map(Number);
  const dayLabel = new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString("es-ES", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="rounded-card border border-border-card bg-bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-card/60 bg-bg-section/40">
        <div>
          <p className="text-[13px] font-bold text-text-primary capitalize">{dayLabel}</p>
          <p className="text-[11px] text-text-muted">{dayTrades.length} operaciones · Win Rate: {dayTrades.length ? Math.round((dayWins / dayTrades.length) * 100) : 0}%</p>
        </div>
        <div className="flex items-center gap-3">
          <p className={`text-[20px] font-black tabular-nums ${dayPnl >= 0 ? "text-green-primary" : "text-red-loss"}`}>
            {dayPnl >= 0 ? "+" : ""}${Math.abs(dayPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-lg text-text-muted hover:bg-white/10 hover:text-text-primary transition-colors"
            aria-label="Cerrar detalle del día"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Trade list */}
      <div className="divide-y divide-border-card/30 max-h-[400px] overflow-y-auto">
        {dayTrades.length === 0 ? (
          <p className="text-center py-6 text-[12px] text-text-muted">Sin operaciones este día.</p>
        ) : (
          dayTrades.map(t => (
            <div key={t.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold flex-shrink-0 ${
                  t.result === "Win" ? "bg-green-primary/20 text-green-primary" :
                  t.result === "Loss" ? "bg-red-loss/20 text-red-loss" :
                  "bg-yellow-warn/20 text-yellow-warn"
                }`}>
                  {t.result === "Win" ? "W" : t.result === "Loss" ? "L" : "B"}
                </span>
                <div>
                  <p className="text-[12px] font-semibold text-text-primary">
                    {t.instrument} <span className="text-text-muted font-normal">· {t.side}</span>
                  </p>
                  <p className="text-[10px] text-text-muted">
                    {t.strategy} · {t.totalContracts} {t.assetClass === "Futures_Micro" ? "micro" : "contratos"}
                    {t.timeOpen ? ` · ${t.timeOpen}` : ""}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-[14px] font-bold tabular-nums ${(t.netPnl || 0) >= 0 ? "text-green-primary" : "text-red-loss"}`}>
                  {(t.netPnl || 0) >= 0 ? "+" : ""}${Math.abs(t.netPnl || 0).toFixed(2)}
                </p>
                {t.rMultiple !== undefined && t.rMultiple !== null && (
                  <p className={`text-[10px] font-medium ${t.rMultiple >= 0 ? "text-blue-accent" : "text-red-loss"}`}>
                    {t.rMultiple >= 0 ? "+" : ""}{t.rMultiple.toFixed(2)}R
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Day summary footer */}
      {dayTrades.length > 0 && (
        <div className="px-5 py-3 border-t border-border-card/40 bg-bg-section/30 flex items-center justify-between text-[11px]">
          <span className="text-text-muted">
            Comisiones: <strong className="text-text-secondary">${dayTrades.reduce((s,t) => s + (t.totalCommission || 0), 0).toFixed(2)}</strong>
          </span>
          <span className="text-text-muted">
            Gross P&L: <strong className={dayPnl >= 0 ? "text-green-primary" : "text-red-loss"}>
              {dayPnl >= 0 ? "+" : ""}${dayTrades.reduce((s,t) => s + (t.grossPnl || 0), 0).toFixed(2)}
            </strong>
          </span>
        </div>
      )}
    </div>
  );
}

export default function CalendarPage() {
  const { trades, isHydrated } = useTradeStore();
  const today = new Date();

  const [year, setYear]         = useState(today.getFullYear());
  const [month, setMonth]       = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  /* ── Mapa de días con trades ── */
  const TRADE_DAYS = useMemo(() => {
    const map: Record<string, { pnl: number; trades: number; wins: number }> = {};
    const closed = trades.filter(t => t.result !== "Open");
    for (const t of closed) {
      const d = t.dateOpen;
      if (!map[d]) map[d] = { pnl: 0, trades: 0, wins: 0 };
      map[d].pnl += t.netPnl || 0;
      map[d].trades++;
      if (t.result === "Win") map[d].wins++;
    }
    return map;
  }, [trades]);

  /* ── Trades del día seleccionado ── */
  const selectedDayTrades = useMemo(() => {
    if (!selectedDay) return [];
    return trades
      .filter(t => t.dateOpen === selectedDay && t.result !== "Open")
      .sort((a, b) => (a.timeOpen || "").localeCompare(b.timeOpen || ""));
  }, [trades, selectedDay]);

  if (!isHydrated) return null;

  const days  = daysInMonth(year, month);
  const first = firstDayOfMonth(year, month);

  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthKeys   = Object.keys(TRADE_DAYS).filter(k => k.startsWith(monthPrefix));
  const monthPnl    = monthKeys.reduce((s, k) => s + TRADE_DAYS[k].pnl, 0);
  const monthTrades = monthKeys.reduce((s, k) => s + TRADE_DAYS[k].trades, 0);
  const monthWins   = monthKeys.reduce((s, k) => s + TRADE_DAYS[k].wins, 0);
  const tradingDays = monthKeys.length;
  const profitDays  = monthKeys.filter(k => TRADE_DAYS[k].pnl > 0).length;
  const lossDays    = monthKeys.filter(k => TRADE_DAYS[k].pnl < 0).length;

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); setSelectedDay(null); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); setSelectedDay(null); };

  return (
    <AppShell title="Calendario de Trading" subtitle="Haz click en cualquier día para ver sus operaciones">
      <div className="flex flex-col gap-5 w-full max-w-[1800px] mx-auto">

        {/* ── KPIs del mes ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: "Net P&L del Mes",   value: `${monthPnl >= 0 ? "+" : ""}$${Math.abs(monthPnl).toLocaleString()}`, color: monthPnl >= 0 ? "text-green-primary" : "text-red-loss" },
            { label: "Días Operados",     value: String(tradingDays),   color: "text-text-primary" },
            { label: "Total Trades",      value: String(monthTrades),   color: "text-text-primary" },
            { label: "Días con Profit",   value: String(profitDays),    color: "text-green-primary" },
            { label: "Días con Pérdida",  value: String(lossDays),      color: "text-red-loss" },
            { label: "Win Rate (trades)", value: monthTrades ? `${Math.round(monthWins / monthTrades * 100)}%` : "—", color: "text-blue-accent" },
          ].map(s => (
            <div key={s.label} className="rounded-card border border-border-card bg-bg-card p-3">
              <p className="text-[10px] text-text-muted mb-1">{s.label}</p>
              <p className={`text-[17px] font-bold tabular-nums ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Calendario + Panel de día ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-5">

          {/* Calendario */}
          <div className="rounded-card border border-border-card bg-bg-card p-5">
            <div className="flex items-center justify-between mb-5">
              <button onClick={prevMonth} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10 text-text-secondary transition-colors" aria-label="Mes anterior">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h2 className="text-[15px] font-bold text-text-primary">{MONTHS[month]} {year}</h2>
              <button onClick={nextMonth} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10 text-text-secondary transition-colors" aria-label="Mes siguiente">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Encabezados */}
            <div className="grid grid-cols-7 gap-1.5 mb-1.5">
              {DAYS_SHORT.map(d => (
                <div key={d} className={`text-center text-[10px] font-bold py-1 ${d === "Sáb" || d === "Dom" ? "text-text-muted" : "text-text-secondary"}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* Celdas de días */}
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: first }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: days }).map((_, i) => {
                const day   = i + 1;
                const key   = dateKey(year, month, day);
                const data  = TRADE_DAYS[key];
                const isWeekend = (first + i) % 7 === 0 || (first + i) % 7 === 6;
                const isToday   = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
                const isSelected = selectedDay === key;

                return (
                  <div
                    key={day}
                    onClick={() => data ? setSelectedDay(isSelected ? null : key) : undefined}
                    className={`relative rounded-xl p-2 min-h-[72px] flex flex-col justify-between transition-all ${
                      data ? `${pnlColor(data.pnl, data.trades)} border ${isSelected ? "border-white/40 ring-2 ring-white/30" : "border-transparent"} cursor-pointer hover:opacity-90 hover:scale-[1.03]` :
                      isWeekend ? "bg-bg-section/30 border border-transparent cursor-default" :
                      "bg-bg-section/50 border border-border-card/30 hover:border-border-card cursor-default"
                    } ${isToday ? "ring-2 ring-green-primary/50" : ""}`}
                    title={data ? `Clic para ver ${data.trades} trade${data.trades > 1 ? "s" : ""} — P&L: ${data.pnl >= 0 ? "+" : ""}$${data.pnl.toFixed(0)}` : undefined}
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
                    {isWeekend && !data && <span className="text-[8px] opacity-40">—</span>}
                    {isSelected && (
                      <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-white/70" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Leyenda */}
            <div className="flex flex-wrap items-center gap-4 mt-5 pt-4 border-t border-border-card/40 text-[10px] text-text-muted">
              <span className="font-semibold">Leyenda:</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-green-primary" />Gran día (&gt;$500)</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-green-primary/40" />Día positivo</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-yellow-warn/30" />Breakeven</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-red-loss/30" />Pérdida menor</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-red-loss/60" />Pérdida mayor</span>
              <span className="flex items-center gap-1.5 ml-auto italic">👆 Clic en un día con trades para ver el detalle</span>
            </div>
          </div>

          {/* Panel lateral: detalle del día o lista mensual */}
          <div className="flex flex-col gap-4">
            {selectedDay ? (
              <DayDetailPanel
                date={selectedDay}
                dayTrades={selectedDayTrades}
                onClose={() => setSelectedDay(null)}
              />
            ) : (
              <div className="rounded-card border border-border-card bg-bg-card overflow-hidden">
                <div className="px-5 py-4 border-b border-border-card/60">
                  <p className="text-sm font-semibold text-text-primary">Resumen — {MONTHS[month]} {year}</p>
                  <p className="text-[11px] text-text-muted mt-0.5">Selecciona un día para ver sus trades</p>
                </div>
                {monthKeys.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-[12px] text-text-muted">
                    Sin operaciones este mes.
                  </div>
                ) : (
                  <div className="divide-y divide-border-card/30 max-h-[500px] overflow-y-auto">
                    {monthKeys.sort().reverse().map(key => {
                      const d = TRADE_DAYS[key];
                      const [, , dd] = key.split("-");
                      const parts = key.split("-").map(Number);
                      const dow   = new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString("es-ES", { weekday: "short" });
                      return (
                        <button
                          key={key}
                          onClick={() => setSelectedDay(key)}
                          className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/[0.03] transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            {d.pnl >= 0
                              ? <TrendingUp className="h-4 w-4 text-green-primary flex-shrink-0" />
                              : <TrendingDown className="h-4 w-4 text-red-loss flex-shrink-0" />
                            }
                            <div>
                              <p className="text-[12px] font-semibold text-text-primary capitalize">{dow} {parseInt(dd)}</p>
                              <p className="text-[10px] text-text-muted">{d.trades} trades · {d.wins}W · {d.trades - d.wins}L</p>
                            </div>
                          </div>
                          <p className={`text-[14px] font-extrabold tabular-nums ${d.pnl >= 0 ? "text-green-primary" : "text-red-loss"}`}>
                            {d.pnl >= 0 ? "+" : ""}${Math.abs(d.pnl).toLocaleString()}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </AppShell>
  );
}
