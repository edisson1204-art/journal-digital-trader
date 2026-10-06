"use client";

import { AppShell } from "@/components/AppShell";
import { RegisterTradeModal } from "@/components/RegisterTradeModal";
import {
  type TradeRecord, type TradeResult,
  computeStats, BROKER_PRESETS,
} from "@/lib/tradeTypes";
import { useState, useMemo } from "react";
import {
  Plus, Search, Tag, Trash2, BarChart2,
  ChevronUp, ChevronDown, TrendingUp, TrendingDown,
  AlertTriangle, Clock, Camera, X, Pencil
} from "lucide-react";

import { useTradeStore } from "@/store/tradeStore";

/* ─── Result badge ─── */
function ResultBadge({ result }: { result: TradeResult }) {
  const c = result === "Win" ? "bg-green-primary/15 text-green-primary" :
            result === "Loss" ? "bg-red-loss/15 text-red-loss" :
            result === "Breakeven" ? "bg-yellow-warn/15 text-yellow-warn" :
            "bg-blue-accent/15 text-blue-accent";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap ${c}`}>{result}</span>;
}

/* ─── P&L colored cell ─── */
function Pnl({ v }: { v?: number }) {
  if (v === undefined || v === null) return <span className="text-text-muted">—</span>;
  return (
    <span className={`font-bold tabular-nums ${v > 0 ? "text-green-primary" : v < 0 ? "text-red-loss" : "text-yellow-warn"}`}>
      {v >= 0 ? "+" : ""}${Math.abs(v).toFixed(2)}
    </span>
  );
}

/* ─── Stat card ─── */
function StatCard({ label, value, sub, color = "text-text-primary", icon: Icon }: {
  label: string; value: string; sub?: string; color?: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="rounded-card border border-border-card bg-bg-card p-4 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-text-muted">{label}</p>
        {Icon && <Icon className={`h-3.5 w-3.5 ${color} opacity-70`} />}
      </div>
      <p className={`text-[18px] font-bold tabular-nums leading-none ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-text-muted">{sub}</p>}
    </div>
  );
}

export default function JournalPage() {
  const trades = useTradeStore(s => s.trades);
  const addTrade = useTradeStore(s => s.addTrade);
  const deleteTrade = useTradeStore(s => s.deleteTrade);
  const updateTrade = useTradeStore(s => s.updateTrade);
  const syncError = useTradeStore(s => s.syncError);
  const clearSyncError = useTradeStore(s => s.clearSyncError);

  const [modalOpen, setModal]         = useState(false);
  const [editTrade, setEditTrade]     = useState<TradeRecord | null>(null);
  const [search, setSearch]           = useState("");
  const [filterResult, setFilter]     = useState("All");
  const [filterAsset, setFilterAsset] = useState("All");
  const [sortField, setSortField]     = useState<string>("dateOpen");
  const [sortDir, setSortDir]         = useState<"asc"|"desc">("desc");
  const [view, setView]               = useState<"table"|"stats">("table");
  
  // Image Preview Modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  /* Derived data */
  const filtered = useMemo(() => {
    return trades
      .filter(t => {
        const q = search.toLowerCase();
        const matchQ = !q ||
          t.instrument.toLowerCase().includes(q) ||
          t.strategy.toLowerCase().includes(q) ||
          t.setup.toLowerCase().includes(q) ||
          t.tags.some(tg => tg.includes(q)) ||
          t.notes.toLowerCase().includes(q) ||
          t.brokerId.toLowerCase().includes(q);
        const matchR = filterResult === "All" || t.result === filterResult;
        const matchA = filterAsset === "All" || t.assetClass === filterAsset;
        return matchQ && matchR && matchA;
      })
      .sort((a, b) => {
        let av: string | number = (a as any)[sortField] ?? "";
        let bv: string | number = (b as any)[sortField] ?? "";
        if (sortDir === "asc") return av < bv ? -1 : av > bv ? 1 : 0;
        return av > bv ? -1 : av < bv ? 1 : 0;
      });
  }, [trades, search, filterResult, filterAsset, sortField, sortDir]);

  const stats = useMemo(() => computeStats(filtered), [filtered]);

  /* Unique asset classes in current trades */
  const assetClasses = ["All", ...Array.from(new Set(trades.map(t => t.assetClass)))];

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Delete this trade? This cannot be undone.")) {
      deleteTrade(id);
    }
  };

  const SortIcon = ({ field }: { field: string }) =>
    sortField === field
      ? sortDir === "desc" ? <ChevronDown className="h-3 w-3 inline ml-0.5" /> : <ChevronUp className="h-3 w-3 inline ml-0.5" />
      : null;

  const TH = ({ label, field, className = "" }: { label: string; field?: string; className?: string }) => (
    <th
      className={`px-3 py-3 text-left text-[10px] uppercase tracking-wide text-text-muted font-semibold whitespace-nowrap select-none ${field ? "cursor-pointer hover:text-text-secondary transition-colors" : ""} ${className}`}
      onClick={field ? () => handleSort(field) : undefined}
    >
      {label}{field && <SortIcon field={field} />}
    </th>
  );

  return (
    <AppShell title="Trade Journal" subtitle="Full record of your operativas">

      <RegisterTradeModal
        open={modalOpen || editTrade !== null}
        onClose={() => { setModal(false); setEditTrade(null); }}
        initialData={editTrade ?? undefined}
        onSave={t => {
          if (editTrade) {
            updateTrade(editTrade.id, t);
          } else {
            addTrade(t);
          }
        }}
      />

      <div className="flex flex-col gap-4 w-full max-w-[1800px] mx-auto">

        {syncError && (
          <div role="alert" className="flex items-start justify-between gap-3 rounded-card border border-red-loss/40 bg-red-loss/10 px-4 py-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-loss flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-red-loss">{syncError}</p>
            </div>
            <button onClick={clearSyncError} className="text-red-loss/70 hover:text-red-loss" aria-label="Cerrar aviso">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ─── Toolbar ─── */}
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            {/* Search */}
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
              <input
                type="search" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Instrument, strategy, tag, note…"
                className="w-full rounded-btn bg-bg-card border border-border-card pl-9 pr-4 py-2 text-[12px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-green-primary focus:ring-1 focus:ring-green-primary transition-colors"
              />
            </div>

            {/* Result filter */}
            {["All","Win","Loss","Breakeven","Open"].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap ${
                  filterResult === f
                    ? f==="Win"       ? "bg-green-primary/15 text-green-primary border border-green-primary/30"
                    : f==="Loss"      ? "bg-red-loss/15 text-red-loss border border-red-loss/30"
                    : f==="Breakeven" ? "bg-yellow-warn/15 text-yellow-warn border border-yellow-warn/30"
                    : f==="Open"      ? "bg-blue-accent/15 text-blue-accent border border-blue-accent/30"
                    :                   "bg-white/10 text-text-primary border border-border-card"
                    : "bg-bg-card border border-border-card text-text-muted hover:text-text-secondary"
                }`}>{f}</button>
            ))}

            {/* Asset filter */}
            <select value={filterAsset} onChange={e => setFilterAsset(e.target.value)}
              className="rounded-btn bg-bg-card border border-border-card px-3 py-1.5 text-[11px] text-text-secondary focus:outline-none focus:border-green-primary transition-colors">
              {assetClasses.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex rounded-btn border border-border-card overflow-hidden">
              <button onClick={() => setView("table")}
                className={`px-3 py-2 text-[11px] font-medium transition-colors ${view==="table" ? "bg-green-primary/15 text-green-primary" : "text-text-muted hover:text-text-secondary"}`}>
                Table
              </button>
              <button onClick={() => setView("stats")}
                className={`px-3 py-2 text-[11px] font-medium transition-colors ${view==="stats" ? "bg-green-primary/15 text-green-primary" : "text-text-muted hover:text-text-secondary"}`}>
                <BarChart2 className="h-3.5 w-3.5 inline mr-1" />Stats
              </button>
            </div>

            {/* Add trade */}
            <div className="relative group">
              {/* Aura dorada pulsante */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 rounded-btn blur opacity-75 animate-pulse"></div>
              <button onClick={() => setModal(true)} translate="no"
                className="relative flex items-center gap-2 rounded-btn bg-green-primary px-5 py-2.5 text-[13px] font-bold text-bg-main border border-amber-300 hover:scale-105 transition-all">
                <Plus className="h-4 w-4 text-bg-main" /> Añadir Trade
              </button>
            </div>
          </div>
        </div>

        {/* ─── KPI strip (always visible) ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          <StatCard label="Total Trades"    value={String(stats.totalTrades)}        icon={BarChart2} />
          <StatCard label="Net P&L"         value={`${stats.totalNet>=0?"+":""}$${Math.abs(stats.totalNet).toFixed(2)}`}   color={stats.totalNet>=0?"text-green-primary":"text-red-loss"} icon={stats.totalNet>=0?TrendingUp:TrendingDown} />
          <StatCard label="Win Rate"        value={`${stats.winRate}%`}              color="text-blue-accent"   sub={`${stats.wins}W / ${stats.losses}L / ${stats.breakevenCount}BE`} />
          <StatCard label="Profit Factor"   value={String(stats.profitFactor)}       color={stats.profitFactor>=1.5?"text-green-primary":"text-yellow-warn"} />
          <StatCard label="Expectancy"      value={`${stats.expectancy>=0?"+":""}$${Math.abs(stats.expectancy).toFixed(2)}`} sub="avg net per trade" color={stats.expectancy>=0?"text-green-primary":"text-red-loss"} />
          <StatCard label="Total Commission" value={`-$${stats.totalCommissions.toFixed(2)}`} color="text-yellow-warn" icon={AlertTriangle} />
          <StatCard label="Max Drawdown"    value={`-$${stats.maxDrawdown.toFixed(2)}`} color="text-red-loss" />
          <StatCard label="Plan Follow %"   value={`${stats.planFollowRate}%`}       color={stats.planFollowRate>=80?"text-green-primary":"text-yellow-warn"} sub={`Avg hold: ${stats.avgHoldTime}m`} icon={Clock} />
        </div>

        {/* ════ TABLE VIEW ════ */}
        {view === "table" && (
          <div className="rounded-card border border-border-card bg-bg-card overflow-hidden">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <p className="text-4xl">📋</p>
                <p className="text-sm text-text-secondary">No trades found.</p>
                <button onClick={() => setModal(true)}
                  className="flex items-center gap-2 rounded-btn bg-green-primary px-5 py-2.5 text-[13px] font-bold text-bg-main">
                  <Plus className="h-4 w-4" /> Register your first trade
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-border-card/60 bg-bg-section/50">
                      <TH label="Date"        field="dateOpen"      className="pl-5" />
                      <TH label="Time"        field="timeOpen" />
                      <TH label="Asset"       field="assetClass" />
                      <TH label="Instrument"  field="instrument" />
                      <TH label="Dir"         field="side" />
                      <TH label="Contracts"   field="totalContracts" />
                      <TH label="Avg Entry"   field="avgEntryPrice" />
                      <TH label="SL"          field="stopLoss" />
                      <TH label="TP"          field="takeProfit" />
                      <TH label="Avg Exit"    field="avgExitPrice" />
                      <TH label="Hold"        field="holdTimeMinutes" />
                      <TH label="Broker"      field="brokerId" />
                      <TH label="Commission"  field="totalCommission" />
                      <TH label="Gross P&L"   field="grossPnl" />
                      <TH label="Net P&L"     field="netPnl" />
                      <TH label="R"           field="rMultiple" />
                      <TH label="Result" />
                      <TH label="Strategy"    field="strategy" />
                      <TH label="Grade"       field="setupGrade" />
                      <TH label="Plan?" />
                      <TH label="Emotion" />
                      <TH label="Tags"        className="pr-5" />
                      <TH label="" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-card/25">
                    {filtered.map(t => (
                      <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group" title={t.notes}>
                        <td className="px-3 py-2.5 pl-5 text-text-muted whitespace-nowrap">{t.dateOpen}</td>
                        <td className="px-3 py-2.5 text-text-muted tabular-nums">{t.timeOpen || "—"}</td>
                        <td className="px-3 py-2.5">
                          <span className="rounded bg-bg-section border border-border-card/50 px-1.5 py-0.5 text-[9px] text-text-muted">{t.assetClass}</span>
                        </td>
                        <td className="px-3 py-2.5 flex items-center gap-2 font-bold text-text-primary">
                          {t.instrument}{t.tickerSymbol ? <span className="ml-1 text-[9px] text-text-muted">({t.tickerSymbol})</span> : null}
                          {t.screenshotUrl && (
                            <button onClick={(e) => { e.stopPropagation(); setPreviewImage(t.screenshotUrl as string); }}
                               className="text-text-muted hover:text-green-primary transition-colors flex items-center justify-center bg-white/5 rounded-md p-1"
                               title="Ver captura del Gráfico">
                              <Camera className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                        <td className={`px-3 py-2.5 font-bold ${t.side==="Buy"?"text-green-primary":"text-red-loss"}`}>
                          {t.side==="Buy"?"▲":"▼"} {t.side}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-text-primary font-semibold">{t.totalContracts}</td>
                        <td className="px-3 py-2.5 tabular-nums text-text-secondary">{t.avgEntryPrice}</td>
                        <td className="px-3 py-2.5 tabular-nums text-red-loss/80">{t.stopLoss}</td>
                        <td className="px-3 py-2.5 tabular-nums text-green-primary/70">{t.takeProfit || "—"}</td>
                        <td className="px-3 py-2.5 tabular-nums text-text-secondary">{t.avgExitPrice || "—"}</td>
                        <td className="px-3 py-2.5 text-text-muted tabular-nums">{t.holdTimeMinutes ? `${t.holdTimeMinutes}m` : "—"}</td>
                        <td className="px-3 py-2.5 text-text-muted text-[10px] whitespace-nowrap">{BROKER_PRESETS[t.brokerId]?.name.split(" ")[0] ?? t.brokerId}</td>
                        <td className="px-3 py-2.5 tabular-nums text-yellow-warn">-${t.totalCommission.toFixed(2)}</td>
                        <td className="px-3 py-2.5"><Pnl v={t.grossPnl} /></td>
                        <td className="px-3 py-2.5"><Pnl v={t.netPnl} /></td>
                        <td className={`px-3 py-2.5 font-bold tabular-nums ${(t.rMultiple??0)>=0?"text-blue-accent":"text-red-loss"}`}>
                          {t.rMultiple !== undefined ? `${t.rMultiple>=0?"+":""}${t.rMultiple}R` : "—"}
                        </td>
                        <td className="px-3 py-2.5"><ResultBadge result={t.result} /></td>
                        <td className="px-3 py-2.5 text-text-secondary whitespace-nowrap">{t.strategy}</td>
                        <td className="px-3 py-2.5">
                          <span className={`font-bold ${t.setupGrade==="A+"||t.setupGrade==="A"?"text-green-primary":t.setupGrade==="B"?"text-blue-accent":"text-yellow-warn"}`}>
                            {t.setupGrade}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          {t.planFollowed
                            ? <span className="text-green-primary">✓</span>
                            : <span className="text-red-loss">✗</span>}
                        </td>
                        <td className="px-3 py-2.5 text-text-muted text-[11px] whitespace-nowrap">{t.emotionEntry}</td>
                        <td className="px-3 py-2.5 pr-5">
                          <div className="flex gap-1 flex-wrap max-w-[110px]">
                            {t.tags.slice(0,2).map(tg => (
                              <span key={tg} className="inline-flex items-center gap-0.5 rounded-full bg-blue-accent/10 px-1.5 py-0.5 text-[9px] text-blue-accent whitespace-nowrap">
                                <Tag className="h-2 w-2" />{tg}
                              </span>
                            ))}
                            {t.tags.length > 2 && <span className="text-[9px] text-text-muted">+{t.tags.length-2}</span>}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 pr-5">
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setEditTrade(t)}
                              className="text-text-muted hover:text-blue-accent transition-colors"
                              aria-label="Editar trade"
                              title="Editar operación"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => handleDelete(t.id)}
                              className="text-text-muted hover:text-red-loss transition-colors" aria-label="Eliminar trade">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totals footer */}
                  <tfoot>
                    <tr className="border-t border-border-card bg-bg-section/40">
                      <td colSpan={12} className="px-3 py-3 pl-5 text-[11px] font-semibold text-text-secondary">
                        {filtered.length} trades shown
                      </td>
                      <td className="px-3 py-3 tabular-nums text-yellow-warn font-bold text-[12px]">
                        -${stats.totalCommissions.toFixed(2)}
                      </td>
                      <td className="px-3 py-3 tabular-nums font-bold text-[12px]">
                        <Pnl v={stats.totalGross} />
                      </td>
                      <td className="px-3 py-3 tabular-nums font-bold text-[12px]">
                        <Pnl v={stats.totalNet} />
                      </td>
                      <td className="px-3 py-3 tabular-nums font-bold text-[12px]">
                        <span className={stats.avgRMultiple>=0?"text-blue-accent":"text-red-loss"}>
                          avg {stats.avgRMultiple>=0?"+":""}{stats.avgRMultiple}R
                        </span>
                      </td>
                      <td colSpan={7} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ════ STATS VIEW ════ */}
        {view === "stats" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Win/Loss breakdown */}
            <div className="rounded-card border border-border-card bg-bg-card p-5">
              <p className="text-sm font-semibold text-text-primary mb-4">Win / Loss / Breakeven</p>
              {[
                { label:"Wins",       count:stats.wins,            pct:stats.winRate,                           color:"bg-green-primary", tc:"text-green-primary" },
                { label:"Losses",     count:stats.losses,          pct:100-stats.winRate-(stats.breakevenCount/(stats.totalTrades||1)*100), color:"bg-red-loss",    tc:"text-red-loss"   },
                { label:"Breakeven",  count:stats.breakevenCount,  pct:stats.totalTrades?stats.breakevenCount/stats.totalTrades*100:0, color:"bg-yellow-warn", tc:"text-yellow-warn"},
                { label:"Open",       count:stats.openTrades,      pct:stats.totalTrades?stats.openTrades/stats.totalTrades*100:0,     color:"bg-blue-accent", tc:"text-blue-accent" },
              ].map(r => (
                <div key={r.label} className="mb-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-[12px] text-text-secondary">{r.label}</span>
                    <span className={`text-[12px] font-bold ${r.tc}`}>{r.count} ({r.pct.toFixed(1)}%)</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-border-card overflow-hidden">
                    <div className={`h-full rounded-full ${r.color} transition-all`} style={{ width:`${Math.min(r.pct,100)}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Financial summary */}
            <div className="rounded-card border border-border-card bg-bg-card p-5">
              <p className="text-sm font-semibold text-text-primary mb-4">Financial Summary</p>
              <div className="flex flex-col gap-2 text-[13px]">
                {[
                  { label:"Gross P&L",          v:`${stats.totalGross>=0?"+":""}$${Math.abs(stats.totalGross).toFixed(2)}`,   c:stats.totalGross>=0?"text-green-primary":"text-red-loss" },
                  { label:"Total Commissions",   v:`-$${stats.totalCommissions.toFixed(2)}`,                                  c:"text-yellow-warn" },
                  { label:"Net P&L",             v:`${stats.totalNet>=0?"+":""}$${Math.abs(stats.totalNet).toFixed(2)}`,     c:stats.totalNet>=0?"text-green-primary":"text-red-loss", bold:true },
                  { label:"Avg Win",             v:`+$${stats.avgWin.toFixed(2)}`,                                            c:"text-green-primary" },
                  { label:"Avg Loss",            v:`$${stats.avgLoss.toFixed(2)}`,                                            c:"text-red-loss" },
                  { label:"Expectancy / trade",  v:`${stats.expectancy>=0?"+":""}$${Math.abs(stats.expectancy).toFixed(2)}`, c:stats.expectancy>=0?"text-green-primary":"text-red-loss", bold:true },
                  { label:"Profit Factor",       v:String(stats.profitFactor),                                                c:stats.profitFactor>=1.5?"text-green-primary":"text-yellow-warn" },
                  { label:"Max Drawdown",        v:`-$${stats.maxDrawdown.toFixed(2)}`,                                       c:"text-red-loss" },
                  { label:"Max Consec. Wins",    v:String(stats.maxConsecWins),                                               c:"text-green-primary" },
                  { label:"Max Consec. Losses",  v:String(stats.maxConsecLosses),                                             c:"text-red-loss" },
                  { label:"Avg Hold Time",       v:`${stats.avgHoldTime} min`,                                                c:"text-text-primary" },
                  { label:"Plan Follow Rate",    v:`${stats.planFollowRate}%`,                                                c:stats.planFollowRate>=80?"text-green-primary":"text-yellow-warn" },
                ].map(r => (
                  <div key={r.label} className={`flex justify-between py-1.5 border-b border-border-card/30 ${(r as any).bold ? "mt-1 pt-2 border-t border-border-card" : ""}`}>
                    <span className="text-text-muted">{r.label}</span>
                    <span className={`tabular-nums font-semibold ${r.c} ${(r as any).bold ? "font-extrabold text-[14px]" : ""}`}>{r.v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* By asset class */}
            <div className="rounded-card border border-border-card bg-bg-card p-5">
              <p className="text-sm font-semibold text-text-primary mb-4">Performance by Asset Class</p>
              <table className="w-full text-[12px]">
                <thead><tr className="border-b border-border-card/40">
                  {["Asset","Trades","Win%","Net P&L","Commissions"].map(h=>(
                    <th key={h} className="pb-2 text-left text-[10px] text-text-muted uppercase tracking-wide">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-border-card/25">
                  {Array.from(new Set(filtered.map(t=>t.assetClass))).map(ac => {
                    const at = filtered.filter(t=>t.assetClass===ac);
                    const s = computeStats(at);
                    return (
                      <tr key={ac}>
                        <td className="py-2 font-semibold text-text-primary">{ac}</td>
                        <td className="py-2 text-text-muted">{s.totalTrades}</td>
                        <td className={`py-2 font-semibold ${s.winRate>=60?"text-green-primary":"text-yellow-warn"}`}>{s.winRate}%</td>
                        <td className="py-2"><Pnl v={s.totalNet} /></td>
                        <td className="py-2 text-yellow-warn">-${s.totalCommissions.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* By strategy */}
            <div className="rounded-card border border-border-card bg-bg-card p-5">
              <p className="text-sm font-semibold text-text-primary mb-4">Performance by Strategy</p>
              <table className="w-full text-[12px]">
                <thead><tr className="border-b border-border-card/40">
                  {["Strategy","Trades","Win%","Avg R","Net P&L"].map(h=>(
                    <th key={h} className="pb-2 text-left text-[10px] text-text-muted uppercase tracking-wide">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-border-card/25">
                  {Array.from(new Set(filtered.map(t=>t.strategy))).map(st => {
                    const at = filtered.filter(t=>t.strategy===st);
                    const s = computeStats(at);
                    return (
                      <tr key={st}>
                        <td className="py-2 font-semibold text-text-primary">{st}</td>
                        <td className="py-2 text-text-muted">{s.totalTrades}</td>
                        <td className={`py-2 font-semibold ${s.winRate>=60?"text-green-primary":"text-yellow-warn"}`}>{s.winRate}%</td>
                        <td className={`py-2 font-semibold tabular-nums ${s.avgRMultiple>=0?"text-blue-accent":"text-red-loss"}`}>
                          {s.avgRMultiple>=0?"+":""}{s.avgRMultiple}R
                        </td>
                        <td className="py-2"><Pnl v={s.totalNet} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* Demo notice */}
        <p className="text-[10px] text-text-muted italic text-center pb-1">
          ☁️ Tus operaciones se sincronizan automáticamente con la nube (Supabase). Tus datos están seguros y disponibles en cualquier dispositivo.
        </p>
      </div>

      {/* 📸 Image Preview Modal (LightBox) */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-7xl max-h-[90vh] w-full flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setPreviewImage(null)}
              className="absolute -top-12 right-0 md:-right-12 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={previewImage} 
              alt="Trade Screenshot" 
              className="w-auto h-auto max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}
    </AppShell>
  );
}
