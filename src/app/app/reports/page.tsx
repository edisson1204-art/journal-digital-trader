"use client";

import { formatProfitFactor } from "@/lib/tradeTypes";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { FileText, Calendar as CalendarIcon, Briefcase, Landmark, Download, BarChart2, X, Brain, Cpu, Target, TrendingUp, AlertTriangle, Clock, Crosshair, Globe } from "lucide-react";
import { useSettingsStore } from "@/store/settingsStore";

const REPORT_TYPES = [
  { id: "monthly",    title: "Reporte Mensual P&L",               icon: CalendarIcon, color: "text-green-primary", desc: "Ganancias, días operativos y performance del mes." },
  { id: "strategy",   title: "Rendimiento Estratégico",           icon: Briefcase,    color: "text-blue-accent",   desc: "Desglose del Win Rate y Expectativa por cada setup." },
  { id: "tax",        title: "Resumen de Conciliación No Oficial",icon: Landmark,     color: "text-amber-500",     desc: "Comisiones registradas y P&L neto para conciliación personal." },
  { id: "psychology", title: "Observaciones Conductuales",        icon: Brain,        color: "text-violet-accent", desc: "Adherencia al plan, disciplina operativa y control de riesgo." },
  { id: "technical",  title: "Auditoría Técnica (Quant)",         icon: Cpu,          color: "text-indigo-400",    desc: "Sesgo direccional, riesgo de ruina estimado y MFE/MAE." }
];

import { useTradeStore } from "@/store/tradeStore";
import { computeStats, localDateKey, type TradeRecord } from "@/lib/tradeTypes";

export type ReportAccount = "all" | "personal" | "funded";

/** Filtra los trades del reporte por periodo y tipo de cuenta. */
export function filterReportTrades(
  trades: TradeRecord[], period: string, month: string, year: string, account: ReportAccount
): TradeRecord[] {
  return trades.filter(t => {
    const d = t.dateOpen || "";
    let inPeriod = false;
    if (period === "month") inPeriod = d.startsWith(month);
    else if (period === "year") inPeriod = d.startsWith(year);
    else if (period === "h1" || period === "h2") {
      const m = parseInt(d.slice(5, 7), 10);
      inPeriod = d.startsWith(year) && (period === "h1" ? m >= 1 && m <= 6 : m >= 7 && m <= 12);
    }
    const inAccount = account === "all" || (account === "funded" ? !!t.isFundedAccount : !t.isFundedAccount);
    return inPeriod && inAccount;
  });
}

export function calculateQuantStats(trades: TradeRecord[]) {
  const closed = trades.filter(t => t.result !== "Open");
  if (!closed.length) return null;

  const longs = closed.filter(t => t.side === "Buy");
  const shorts = closed.filter(t => t.side === "Sell");
  const longWinRate = longs.length ? (longs.filter(t => t.result === "Win").length / longs.length) * 100 : 0;
  const shortWinRate = shorts.length ? (shorts.filter(t => t.result === "Win").length / shorts.length) * 100 : 0;

  const assetPnl: Record<string, number> = {};
  closed.forEach(t => { assetPnl[t.instrument] = (assetPnl[t.instrument] || 0) + (t.netPnl || 0); });
  const sortedAssets = Object.entries(assetPnl).sort((a,b) => b[1] - a[1]);
  const bestAsset = sortedAssets[0] || ["Ninguno", 0];
  const worstAsset = sortedAssets[sortedAssets.length - 1] || ["Ninguno", 0];

  const mae = closed.reduce((acc, t) => acc + (t.mae || 0), 0) / (closed.length || 1);
  const mfe = closed.reduce((acc, t) => acc + (t.mfe || 0), 0) / (closed.length || 1);

  const efficiencyActive = closed.reduce((acc, t) => acc + (t.netPnl || 0), 0);
  const efficiencyPassive = closed.reduce((acc, t) => acc + ((t.result === 'Win' ? (t.mfe || 0) : -(t.mae || 0)) || t.netPnl || 0), 0);

  const setupGroups: Record<string, { wins: number, count: number, net: number }> = {};
  closed.forEach(t => {
    const s = t.setup || "General";
    if (!setupGroups[s]) setupGroups[s] = { wins: 0, count: 0, net: 0 };
    setupGroups[s].count++;
    setupGroups[s].net += t.netPnl || 0;
    if (t.result === "Win") setupGroups[s].wins++;
  });
  const setups = Object.entries(setupGroups).map(([name, data]) => ({
    name, winRate: Math.round((data.wins / data.count) * 100), expectancy: Math.round(data.net / data.count)
  })).sort((a,b) => b.expectancy - a.expectancy).slice(0, 3);

  const sessionGroups: Record<string, { wins: number, count: number, net: number }> = {};
  closed.forEach(t => {
    const s = t.session || "Other";
    if (!sessionGroups[s]) sessionGroups[s] = { wins: 0, count: 0, net: 0 };
    sessionGroups[s].count++;
    sessionGroups[s].net += t.netPnl || 0;
    if (t.result === "Win") sessionGroups[s].wins++;
  });
  const sessions = Object.entries(sessionGroups).map(([name, data]) => ({
    name, winRate: Math.round((data.wins / data.count) * 100), pnl: Math.round(data.net)
  })).sort((a,b) => b.pnl - a.pnl).slice(0, 4);

  const holdingGroups = [
    { name: "Scalping (< 15m)", min: 0, max: 15, wins: 0, count: 0, net: 0 },
    { name: "Intraday (15m - 4h)", min: 15, max: 240, wins: 0, count: 0, net: 0 },
    { name: "Swing (> 4h)", min: 240, max: 999999, wins: 0, count: 0, net: 0 }
  ];
  closed.forEach(t => {
    const ht = t.holdTimeMinutes || 0;
    const g = holdingGroups.find(g => ht >= g.min && ht < g.max);
    if (g) { g.count++; g.net += t.netPnl || 0; if (t.result === "Win") g.wins++; }
  });
  
  const holdingTimes = holdingGroups
    .filter(g => g.count > 0)
    .map(g => ({
      type: g.name, 
      winRate: g.count ? Math.round((g.wins / g.count) * 100) : 0, 
      pnl: Math.round(g.net)
    }));

  const stats = computeStats(closed);
  const wr = stats.winRate / 100;

  let riskOfRuin: number | null = null;
  if (closed.length >= 10 && wr > 0 && stats.avgWin > 0 && stats.avgLoss > 0) {
    const rr = stats.avgLoss / stats.avgWin;
    const edge = wr - (1 - wr) * rr;
    if (edge <= 0) {
      riskOfRuin = 99.9;
    } else {
      const rorRaw = Math.pow((1 - edge) / (1 + edge), 20) * 100;
      riskOfRuin = parseFloat(Math.min(99.9, Math.max(0.01, rorRaw)).toFixed(2));
    }
  }

  const dailyPnlMap: Record<string, number> = {};
  closed.forEach(t => {
    const day = t.dateOpen;
    dailyPnlMap[day] = (dailyPnlMap[day] || 0) + (t.netPnl || 0);
  });
  const dailyPnls = Object.values(dailyPnlMap).filter(v => v > 0);
  const avgDailyPnl = dailyPnls.length ? dailyPnls.reduce((a,b) => a+b, 0) / dailyPnls.length : 0;
  const recoveryDays = avgDailyPnl > 0
    ? parseFloat((Math.abs(stats.maxDrawdown) / avgDailyPnl).toFixed(1))
    : 0;

  return {
    longCount: longs.length,
    shortCount: shorts.length,
    longWinRate: Math.round(longWinRate * 10) / 10,
    shortWinRate: Math.round(shortWinRate * 10) / 10,
    bestAsset: bestAsset[0], bestAssetPnl: Math.round(bestAsset[1]),
    worstAsset: worstAsset[0], worstAssetPnl: Math.round(worstAsset[1]),
    riskOfRuin, mae: Math.round(mae), mfe: Math.round(mfe),
    efficiencyPassive: Math.round(efficiencyPassive),
    efficiencyActive: Math.round(efficiencyActive),
    recoveryDays,
    sessions, holdingTimes, setups
  };
}

const generatePsychoText = (stats: any, lang: string) => {
  // REP-02: Sin operaciones cerradas, no emitir diagnóstico ni texto conductual fabricado
  if (!stats || !stats.closedTrades || stats.closedTrades <= 0) return null;

  const isProfitable = stats.totalNet > 0 && stats.winRate >= 50;
  const planRate = stats.planFollowRate ?? 0;

  if (lang === "en") {
    return {
      diagnosis: isProfitable
        ? `Based on ${stats.closedTrades} closed trades, net P&L is positive (+$${stats.totalNet.toFixed(2)}) with a ${planRate}% plan adherence rate.`
        : `Across ${stats.closedTrades} closed trades, net P&L is $${stats.totalNet.toFixed(2)} with a ${planRate}% plan adherence rate. Review risk per trade and setup selection.`,
      egoTitle: isProfitable ? "RISK CONSISTENCY NOTE" : "CAPITAL PRESERVATION FOCUS",
      egoText: isProfitable
        ? "Maintain constant position sizing rules after winning streaks to avoid increasing drawdown exposure."
        : "Prioritize strict adherence to predefined stop-loss levels and avoid revenge trading after losing sessions.",
      blindSpots: [
        `Observed Max Drawdown: -$${Math.abs(stats.maxDrawdown || 0).toFixed(2)} across ${stats.closedTrades} closed trades.`,
        `Average losing trade: -$${Math.abs(stats.avgLoss || 0).toFixed(2)} · Plan adherence: ${planRate}%.`,
      ],
      prescription: [
        "1. Maintain predefined risk per trade according to your written plan.",
        "2. Pause execution for the session if daily loss limit is reached.",
      ]
    };
  }

  return {
    diagnosis: isProfitable
      ? `Sobre una muestra de ${stats.closedTrades} operaciones cerradas, el resultado neto es positivo (+$${stats.totalNet.toFixed(2)}) con una adherencia al plan registrada del ${planRate}%.`
      : `Sobre una muestra de ${stats.closedTrades} operaciones cerradas, el resultado neto es ${stats.totalNet >= 0 ? "+" : "-"}$${Math.abs(stats.totalNet).toFixed(2)} con una adherencia al plan registrada del ${planRate}%.`,
    egoTitle: isProfitable ? "NOTA DE CONSISTENCIA DE RIESGO" : "CONTROL DE RIESGO Y EJECUCIÓN",
    egoText: isProfitable
      ? "Mantén constante el porcentaje de riesgo por operación tras rachas positivas para evitar incrementar la exposición al drawdown."
      : "Prioriza el respeto estricto al Stop Loss inicial y evita abrir operaciones fuera de tu horario o setup validado.",
    blindSpots: [
      `Drawdown máximo observado en el periodo: -$${Math.abs(stats.maxDrawdown || 0).toFixed(2)} (${stats.closedTrades} operaciones cerradas).`,
      `Pérdida promedio por operación perdedora: -$${Math.abs(stats.avgLoss || 0).toFixed(2)} · Adherencia al plan: ${planRate}%.`,
    ],
    prescription: [
      "1. Mantener el tamaño de posición dentro del límite definido en el plan operativo.",
      "2. Detener la sesión operativa al alcanzar el límite de pérdida diaria preestablecido.",
    ]
  };
};

const generateNarrative = (type: string, stats: any, quant: any, lang: string) => {
  // REP-01, REP-03, REP-04: Sin operaciones cerradas, no generar narrativa
  if (!stats || !stats.closedTrades || stats.closedTrades <= 0 || !quant) return [];
  const isProfitable = stats.totalNet > 0;
  const pfFormatted = formatProfitFactor(stats);

  if (lang === "en") {
    if (type === "technical") {
      return [
        `Quantitative summary based on ${stats.closedTrades} closed trades in the selected period. Net P&L is ${stats.totalNet >= 0 ? "+" : "-"}$${Math.abs(stats.totalNet).toFixed(2)} with a Profit Factor of ${pfFormatted}.`,
        `Directional breakdown: Long Win Rate is ${quant.longWinRate}% (${quant.longCount} trades) and Short Win Rate is ${quant.shortWinRate}% (${quant.shortCount} trades). Recorded average MAE is -$${quant.mae} and average MFE is +$${quant.mfe}.`,
        `Note: Metrics are descriptive of the ${stats.closedTrades} closed trades in this period. Statistical inference requires at least 30 closed trades.`
      ];
    }
    if (type === "monthly") {
      return [
        `Period summary across ${stats.closedTrades} closed trades (${stats.openTrades || 0} open trades excluded from realized metrics). Realized Net P&L: ${stats.totalNet >= 0 ? "+" : "-"}$${Math.abs(stats.totalNet).toFixed(2)} (Profit Factor: ${pfFormatted}).`,
        `Win Rate: ${stats.winRate}% (${stats.wins} wins, ${stats.losses} losses, ${stats.breakevenCount} exact breakevens). Realized commissions totaled -$${stats.totalCommissions.toFixed(2)}.`,
        `Observation: Review trade-by-trade execution against your plan adherence (${stats.planFollowRate}%).`
      ];
    }
    if (type === "strategy") {
      const bestSetup = quant.setups[0]?.name || "N/A";
      const bestWR = quant.setups[0]?.winRate ?? 0;
      return [
        `Setup breakdown across ${stats.closedTrades} closed trades. Highest expectancy setup in this sample: '${bestSetup}' (${bestWR}% Win Rate).`,
        `Compare setup performance only when each setup has a sufficient sample of closed trades.`
      ];
    }
    if (type === "tax") {
      return [
        `Unofficial reconciliation summary for ${stats.closedTrades} closed trades. Recorded broker commissions totaled -$${stats.totalCommissions.toFixed(2)}.`,
        `Realized Gross P&L: ${stats.totalGross >= 0 ? "+" : "-"}$${Math.abs(stats.totalGross).toFixed(2)} · Realized Net P&L after recorded fees: ${stats.totalNet >= 0 ? "+" : "-"}$${Math.abs(stats.totalNet).toFixed(2)}.`,
        `Disclaimer: This document is an unofficial personal reconciliation summary generated from user-entered records. It is not a tax statement and does not replace official broker statements or prop-firm payout records.`
      ];
    }
    return [];
  }

  // Español
  if (type === "technical") {
    return [
      `Resumen cuantitativo calculado sobre ${stats.closedTrades} operaciones cerradas en el periodo seleccionado. El P&L neto realizado es de ${stats.totalNet >= 0 ? "+" : "-"}$${Math.abs(stats.totalNet).toFixed(2)} con un Profit Factor de ${pfFormatted}.`,
      `Desglose direccional observado: Win Rate en compras (Long) de ${quant.longWinRate}% (${quant.longCount} ops) y en ventas (Short) de ${quant.shortWinRate}% (${quant.shortCount} ops). MAE promedio registrado: -$${quant.mae} · MFE promedio: +$${quant.mfe}.`,
      `Nota metodológica: Estos indicadores describen únicamente las ${stats.closedTrades} operaciones cerradas del periodo. Para inferencia estadística fiable se recomienda una muestra mínima de 30 operaciones.`
    ];
  }
  if (type === "monthly") {
    return [
      `Resumen del periodo basado en ${stats.closedTrades} operaciones cerradas (${stats.openTrades || 0} abiertas excluidas de métricas realizadas). Beneficio neto realizado: ${stats.totalNet >= 0 ? "+" : "-"}$${Math.abs(stats.totalNet).toFixed(2)} · Profit Factor: ${pfFormatted}.`,
      `Tasa de acierto (Win Rate): ${stats.winRate}% (${stats.wins} ganadoras, ${stats.losses} perdedoras, ${stats.breakevenCount} breakeven exactos). Comisiones realizadas registradas: -$${stats.totalCommissions.toFixed(2)}.`,
      `Observación operativa: Adherencia al plan registrada del ${stats.planFollowRate}% en el periodo.`
    ];
  }
  if (type === "strategy") {
    const bestSetup = quant.setups[0]?.name || "N/A";
    const bestWR = quant.setups[0]?.winRate ?? 0;
    return [
      `Desglose por setup sobre ${stats.closedTrades} operaciones cerradas. El setup con mayor esperanza matemática en esta muestra es '${bestSetup}' (Win Rate: ${bestWR}%).`,
      `Nota: Evalúa la significancia de cada setup considerando el número de operaciones registradas en cada categoría.`
    ];
  }
  if (type === "tax") {
    return [
      `Resumen de conciliación no oficial correspondiente a ${stats.closedTrades} operaciones cerradas. Las comisiones registradas en el periodo suman -$${stats.totalCommissions.toFixed(2)}.`,
      `P&L Bruto realizado: ${stats.totalGross >= 0 ? "+" : "-"}$${Math.abs(stats.totalGross).toFixed(2)} · P&L Neto realizado (tras comisiones registradas): ${stats.totalNet >= 0 ? "+" : "-"}$${Math.abs(stats.totalNet).toFixed(2)}.`,
      `Aviso importante: Este documento es un resumen personal no oficial generado a partir de los registros del usuario. No constituye declaración fiscal, no calcula base imponible ni equivale a liquidaciones o payouts de cuentas de fondeo. Contrasta siempre con el extracto oficial de tu bróker.`
    ];
  }
  return [];
};

export { generatePsychoText, generateNarrative };

export default function ReportsPage() {
  const [selType, setSelType] = useState("monthly");
  const [selPeriod, setSelPeriod] = useState("month");
  // Fecha local (no UTC) como mes y año por defecto
  const [selMonth, setSelMonth] = useState(() => localDateKey().slice(0, 7));
  const [selYear, setSelYear] = useState(() => String(new Date().getFullYear()));
  const [selAccount, setSelAccount] = useState<ReportAccount>("all");
  const [generated, setGenerated] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const storeTrades = useTradeStore(s => s.trades);
  const availableYears = Array.from(new Set([
    String(new Date().getFullYear()),
    ...storeTrades.map(t => t.dateOpen?.slice(0, 4)).filter(Boolean),
  ])).sort().reverse();
  const accountCounts = {
    all: storeTrades.length,
    personal: storeTrades.filter(t => !t.isFundedAccount).length,
    funded: storeTrades.filter(t => t.isFundedAccount).length,
  };
  const periodLabel = selPeriod === "month" ? selMonth : selPeriod === "year" ? selYear : `${selYear} ${selPeriod.toUpperCase()}`;
  const periodTradeCount = filterReportTrades(storeTrades, selPeriod, selMonth, selYear, selAccount).length;

  const generate = () => setGenerated(true);
  const startPrintMode = () => setIsPrinting(true);

  useEffect(() => {
    if (isPrinting) {
      setTimeout(() => { window.print(); setIsPrinting(false); }, 500);
    }
  }, [isPrinting]);

  const ReportContent = () => {
    const allTrades = useTradeStore(s => s.trades);
    const language = useSettingsStore(s => s.language);

    const trades = filterReportTrades(allTrades, selPeriod, selMonth, selYear, selAccount);
    const STATS = computeStats(trades);
    const QUANT_STATS = calculateQuantStats(trades);
    const hasClosedTrades = STATS.closedTrades > 0 && QUANT_STATS !== null;

    const psycho = generatePsychoText(STATS, language);
    const narrative = generateNarrative(selType, STATS, QUANT_STATS, language);

    return (
      <div className="max-w-[900px] mx-auto bg-white min-h-screen text-slate-900 font-sans shadow-2xl relative">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { margin: 8mm 12mm; size: A4 portrait; }
            body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none !important; }
            .shadow-2xl { box-shadow: none !important; }
            .page-break { page-break-before: always !important; break-before: page !important; }
            .avoid-break { break-inside: avoid !important; page-break-inside: avoid; }
            tr { break-inside: avoid !important; page-break-inside: avoid; }
          }
        `}} />

        <div className="p-12 print:p-8 print:py-6 border-x print:border-none border-slate-200 relative">
          <div className="absolute inset-0 flex justify-center items-center opacity-[0.02] pointer-events-none">
            <TrendingUp className="w-[500px] h-[500px]" />
          </div>

          <div className="mb-8 print:mb-4 border-b-2 border-slate-200 pb-6 print:pb-4 flex justify-between items-end relative z-10">
            <div>
              <h1 className="text-3xl print:text-2xl font-black text-slate-900 mb-1 tracking-tight">
                Journal Digital Trader Invest
              </h1>
              <p className={`text-[12px] print:text-[11px] uppercase tracking-widest font-bold 
                ${selType === 'psychology' ? 'text-violet-600' : selType === 'technical' ? 'text-indigo-600' : 'text-emerald-600'}`}>
                {selType === "monthly" ? "Reporte Mensual de Rendimiento" : 
                 selType === "strategy" ? "Perfil de Rendimiento por Estrategia" : 
                 selType === "tax" ? "Resumen de Conciliación No Oficial" : 
                 selType === "technical" ? "Auditoría Cuantitativa de Ejecución" :
                 "Observaciones Conductuales de Operativa"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] print:text-[9px] text-slate-400 font-bold uppercase tracking-widest">PERIODO</p>
              <p className="text-[14px] print:text-[12px] font-bold text-slate-800">{selPeriod === 'month' ? selMonth : (selPeriod === 'year' ? selYear : `${selYear} - ${selPeriod.toUpperCase()}`)}</p>
              <p className="text-[10px] print:text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-3 print:mt-1">GENERADO</p>
              <p className="text-[14px] print:text-[12px] font-bold text-slate-800">{new Date().toLocaleDateString("es-ES")}</p>
            </div>
          </div>

          <div className="relative z-10">
            {!hasClosedTrades ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-10 text-center my-8">
                <p className="text-lg font-bold text-slate-800 mb-2">
                  Sin operaciones cerradas en el período seleccionado ({periodLabel})
                </p>
                <p className="text-sm text-slate-600 max-w-xl mx-auto">
                  No existen operaciones cerradas registradas para esta selección ({STATS.openTrades > 0 ? `${STATS.openTrades} operación(es) abierta(s) excluida(s) de métricas realizadas` : "0 operaciones totales"}). No se emiten diagnósticos, ratios ni resúmenes ejecutivos sobre muestras vacías.
                </p>
              </div>
            ) : (
              <>
                {selType !== "psychology" && narrative.length > 0 && (
                  <div className="mb-10 print:mb-6 bg-slate-50 border border-slate-200 rounded-xl p-6 print:p-4 relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-1 h-full ${selType === 'technical' ? 'bg-indigo-500' : 'bg-emerald-500'}`}></div>
                    <h2 className="text-[11px] print:text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-4 print:mb-2 flex items-center gap-2">
                      <Brain className="h-4 w-4 print:h-3 print:w-3" /> Resumen Descriptivo ({STATS.closedTrades} ops cerradas)
                    </h2>
                    <div className="space-y-3 print:space-y-2">
                      {narrative.map((paragraph, idx) => (
                        <p key={idx} className={`text-[13px] print:text-[12px] text-slate-700 leading-relaxed ${idx === narrative.length - 1 ? 'font-bold text-slate-800 bg-slate-100 p-3 print:p-2 rounded-lg border border-slate-200 mt-2 print:mt-1' : 'font-medium'}`}>
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {selType === "technical" && QUANT_STATS ? (
                  <div className="space-y-8 print:space-y-4">
                    <div className="bg-slate-900 text-white border border-slate-800 p-6 print:p-4 rounded-xl flex items-center justify-between">
                      <div>
                        <h2 className="text-[11px] print:text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-1 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 print:h-3 print:w-3" /> Riesgo de Ruina Estimado
                        </h2>
                        <p className="text-[13px] print:text-[11px] text-slate-300 max-w-lg">
                          Estimación teórica basada en Win Rate y ratio ganancia/pérdida observados (requiere mínimo 10 operaciones cerradas).
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-3xl print:text-2xl font-black text-emerald-400">
                          {QUANT_STATS.riskOfRuin !== null ? `${QUANT_STATS.riskOfRuin}%` : "N/A (<10 ops)"}
                        </span>
                        <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">
                          Muestra n={STATS.closedTrades}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 print:gap-4">
                      <div className="border border-slate-200 bg-white p-5 print:p-4 rounded-xl shadow-sm">
                        <h3 className="text-[11px] print:text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-4 print:mb-2 border-b border-slate-100 pb-2">Desglose Direccional Observado</h3>
                        <div className="space-y-4 print:space-y-2">
                          <div>
                            <div className="flex justify-between text-[12px] print:text-[11px] mb-1 font-bold text-slate-800">
                              <span>Win Rate (COMPRAS / Long · n={QUANT_STATS.longCount})</span>
                              <span className="text-emerald-600">{QUANT_STATS.longCount > 0 ? `${QUANT_STATS.longWinRate}%` : "—"}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5"><div className="bg-emerald-500 h-1.5 rounded-full" style={{width: `${QUANT_STATS.longWinRate}%`}}></div></div>
                          </div>
                          <div>
                            <div className="flex justify-between text-[12px] print:text-[11px] mb-1 font-bold text-slate-800">
                              <span>Win Rate (VENTAS / Short · n={QUANT_STATS.shortCount})</span>
                              <span className="text-red-500">{QUANT_STATS.shortCount > 0 ? `${QUANT_STATS.shortWinRate}%` : "—"}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5"><div className="bg-red-500 h-1.5 rounded-full" style={{width: `${QUANT_STATS.shortWinRate}%`}}></div></div>
                          </div>
                        </div>
                      </div>

                      <div className="border border-slate-200 bg-white p-5 print:p-4 rounded-xl shadow-sm">
                        <h3 className="text-[11px] print:text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-4 print:mb-2 border-b border-slate-100 pb-2">Resultado por Instrumento</h3>
                        <table className="w-full text-[12px] print:text-[11px]">
                          <tbody>
                            <tr>
                              <td className="py-2 print:py-1 text-slate-700 font-bold">Mayor retorno: {QUANT_STATS.bestAsset}</td>
                              <td className="text-right text-emerald-600 font-black">{QUANT_STATS.bestAssetPnl >= 0 ? "+" : "-"}${Math.abs(QUANT_STATS.bestAssetPnl)}</td>
                            </tr>
                            <tr>
                              <td className="py-2 print:py-1 text-slate-700 font-bold">Menor retorno: {QUANT_STATS.worstAsset}</td>
                              <td className="text-right text-red-500 font-black">{QUANT_STATS.worstAssetPnl >= 0 ? "+" : "-"}${Math.abs(QUANT_STATS.worstAssetPnl)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 print:gap-4">
                      <div className="bg-slate-50 border border-slate-200 p-5 print:p-4 rounded-xl">
                        <h3 className="text-[11px] print:text-[10px] font-bold uppercase tracking-wider text-indigo-600 mb-4 print:mb-2">Excursión Registrada (MAE / MFE)</h3>
                        <div className="flex justify-between items-center mb-3 print:mb-1">
                          <span className="text-[12px] print:text-[11px] text-slate-600 font-medium">MAE Promedio</span>
                          <span className="text-[13px] print:text-[12px] font-black text-red-500">-${QUANT_STATS.mae}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[12px] print:text-[11px] text-slate-600 font-medium">MFE Promedio</span>
                          <span className="text-[13px] print:text-[12px] font-black text-emerald-600">+${QUANT_STATS.mfe}</span>
                        </div>
                      </div>

                      <div className="bg-indigo-50/50 border border-indigo-100 p-5 print:p-4 rounded-xl">
                        <h3 className="text-[11px] print:text-[10px] font-bold uppercase tracking-wider text-indigo-700 mb-4 print:mb-2">Resultado Realizado</h3>
                        <div className="flex justify-between items-center mb-3 print:mb-1">
                          <span className="text-[12px] print:text-[11px] text-slate-600 font-medium">PnL Neto Realizado</span>
                          <span className="text-[13px] print:text-[12px] font-black text-slate-800">
                            {QUANT_STATS.efficiencyActive >= 0 ? "+" : "-"}${Math.abs(QUANT_STATS.efficiencyActive).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : selType === "psychology" && psycho ? (
                  <div className="space-y-8">
                    <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl">
                      <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                        <Brain className="h-4 w-4" /> Resumen de Disciplina Operativa
                      </h2>
                      <p className="text-[14px] text-slate-800 leading-relaxed font-medium">
                        {psycho.diagnosis}
                      </p>
                    </div>

                    <div className="border border-violet-200 bg-violet-50/50 p-6 rounded-xl relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-violet-500"></div>
                      <h2 className="text-[11px] font-bold uppercase tracking-wider text-violet-700 mb-3">
                        {psycho.egoTitle}
                      </h2>
                      <p className="text-[14px] text-slate-700 leading-relaxed font-medium">
                        {psycho.egoText}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-4 border-b border-slate-200 pb-2">
                          Indicadores Observados
                        </h2>
                        <ul className="space-y-3">
                          {psycho.blindSpots.map((spot: string, i: number) => (
                            <li key={i} className="flex gap-3 text-[13px] text-slate-700">
                              <span className="text-red-500 font-bold">•</span> {spot}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-4 border-b border-slate-200 pb-2">
                          Pautas Operativas Recomendadas
                        </h2>
                        <ul className="space-y-3">
                          {psycho.prescription.map((rule: string, i: number) => (
                            <li key={i} className="flex gap-3 text-[13px] text-slate-800 font-semibold bg-slate-100 p-2 rounded">
                              {rule}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-[11px] print:text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-4 print:mb-2">Métricas del Periodo</p>
                    <div className="grid grid-cols-4 gap-4 print:gap-2 mb-10 print:mb-6">
                      {[
                        { label:"Net P&L Realizado", value:`${STATS.totalNet >= 0 ? "+" : "-"}$${Math.abs(STATS.totalNet).toFixed(2)}`, color: STATS.totalNet >= 0 ? "text-emerald-600" : "text-red-600" },
                        { label:"Win Rate",          value:`${STATS.winRate}%`,                  color:"text-blue-600"  },
                        { label:"Profit Factor",     value:formatProfitFactor(STATS),           color: (STATS.profitFactor ?? 0) >= 1.5 ? "text-emerald-600" : "text-amber-600" },
                        { label:"Expectancy",        value:`${STATS.expectancy >= 0 ? "+" : "-"}$${Math.abs(STATS.expectancy).toFixed(2)}`, color: STATS.expectancy >= 0 ? "text-emerald-600" : "text-red-600" },
                      ].map(s => (
                        <div key={s.label} className="rounded-xl border border-slate-200 bg-slate-50 p-5 print:p-3">
                          <p className="text-[11px] print:text-[9px] text-slate-500 font-medium mb-1">{s.label}</p>
                          <p className={`text-[22px] print:text-[18px] font-black tabular-nums ${s.color}`}>{s.value}</p>
                        </div>
                      ))}
                    </div>

                    <p className="text-[11px] print:text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-4 print:mb-2">Desglose de Operaciones Cerradas</p>
                    <table className="w-full text-[13px] print:text-[11px]">
                      <tbody className="divide-y divide-slate-200">
                        {[
                          ["Operaciones Cerradas",     STATS.closedTrades,              "text-slate-800"],
                          ["Operaciones Abiertas / Parciales (excluidas)", STATS.openTrades, "text-slate-500"],
                          ["Trades Ganadores (Net > 0)", `${STATS.wins} (${Math.round(STATS.wins/Math.max(1, STATS.closedTrades)*100)}%)`, "text-emerald-600"],
                          ["Trades Perdedores (Net < 0)",`${STATS.losses} (${Math.round(STATS.losses/Math.max(1, STATS.closedTrades)*100)}%)`, "text-red-600"],
                          ["Breakeven Neto (= $0.00)",  STATS.breakevenCount,                "text-amber-600"],
                          ["Gross P&L Realizado",      `${STATS.totalGross >= 0 ? "+" : "-"}$${Math.abs(STATS.totalGross).toFixed(2)}`, "text-emerald-600"],
                          ["Comisiones Realizadas",    `-$${STATS.totalCommissions.toFixed(2)}`,   "text-amber-600"],
                          ["Net P&L Realizado",        `${STATS.totalNet >= 0 ? "+" : "-"}$${Math.abs(STATS.totalNet).toFixed(2)}`, STATS.totalNet >= 0 ? "text-emerald-600" : "text-red-600"],
                        ].map(([label, value, color]) => (
                          <tr key={String(label)} className="bg-white">
                            <td className="py-3.5 print:py-2 text-slate-600 font-medium">{label}</td>
                            <td className={`py-3.5 print:py-2 font-bold text-right tabular-nums ${color}`}>{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </>
            )}

            <div className="mt-12 print:mt-6 pt-6 print:pt-4 border-t-2 border-slate-200 text-center">
              <p className="text-[10px] print:text-[8px] text-slate-400 font-medium">
                Resumen no oficial generado a partir de los registros ingresados en Journal Digital Trader Invest.
              </p>
            </div>
          </div>
        </div>

        {selType === "technical" && hasClosedTrades && QUANT_STATS && (
          <div className="page-break p-12 print:p-0 border-x print:border-none border-slate-200 relative min-h-screen print:min-h-0">
            <h2 className="text-2xl font-black text-slate-900 mb-8 border-b-2 border-slate-200 pb-4">
              PARTE II: DESGLOSE POR SESIÓN, DURACIÓN Y SETUP
            </h2>
            
            <div className="grid grid-cols-2 gap-8 mb-10 avoid-break">
              <div className="border border-slate-200 bg-white p-6 rounded-xl shadow-sm">
                <h3 className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-5 flex items-center gap-2">
                  <Globe className="h-4 w-4" /> Resultado por Sesión Registrada
                </h3>
                <div className="space-y-4">
                  {QUANT_STATS.sessions.map((session: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-3 rounded-lg border border-slate-100 bg-slate-50">
                      <div>
                        <p className="text-[13px] font-bold text-slate-800">{session.name}</p>
                        <p className="text-[11px] text-slate-500">Win Rate: {session.winRate}%</p>
                      </div>
                      <div className={`text-[14px] font-black ${session.pnl >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {session.pnl >= 0 ? `+$${session.pnl}` : `-$${Math.abs(session.pnl)}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-slate-200 bg-white p-6 rounded-xl shadow-sm">
                <h3 className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-5 flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Tiempo de Sostenimiento (Holding Time)
                </h3>
                <div className="space-y-4">
                  {QUANT_STATS.holdingTimes.map((ht, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 rounded-lg border border-slate-100 bg-slate-50">
                      <div>
                        <p className="text-[13px] font-bold text-slate-800">{ht.type}</p>
                        <p className="text-[11px] text-slate-500">Win Rate: {ht.winRate}%</p>
                      </div>
                      <div className={`text-[14px] font-black ${ht.pnl >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {ht.pnl >= 0 ? `+$${ht.pnl}` : `-$${Math.abs(ht.pnl)}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border border-slate-200 bg-white p-6 rounded-xl shadow-sm mb-12 avoid-break">
              <h3 className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-5 flex items-center gap-2">
                <Crosshair className="h-4 w-4" /> Setups Registrados
              </h3>
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="pb-3 font-bold text-slate-500 uppercase text-[11px] tracking-wider">Setup</th>
                    <th className="pb-3 font-bold text-slate-500 uppercase text-[11px] tracking-wider text-center">Tasa de Acierto</th>
                    <th className="pb-3 font-bold text-slate-500 uppercase text-[11px] tracking-wider text-right">Expectativa / Trade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {QUANT_STATS.setups.map((setup: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-4 font-bold text-slate-800">{setup.name}</td>
                      <td className="py-4 text-center font-bold text-blue-600">{setup.winRate}%</td>
                      <td className={`py-4 text-right font-black ${setup.expectancy >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {setup.expectancy >= 0 ? `+$${setup.expectancy}` : `-$${Math.abs(setup.expectancy)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    );
  };

  if (isPrinting) {
    return (
      <div className="absolute top-0 left-0 w-full min-h-screen z-[9999] bg-slate-100 py-10 print:py-0 print:bg-white overflow-auto">
        <button 
          onClick={() => setIsPrinting(false)} 
          className="no-print fixed top-6 right-6 bg-slate-900 text-white rounded-full p-3 shadow-2xl hover:bg-slate-800 transition-all flex items-center gap-2 font-bold text-sm z-50"
        >
          <X className="h-5 w-5" /> Cancelar Impresión
        </button>
        <ReportContent />
      </div>
    );
  }

  return (
    <AppShell title="Centro de Reportes" subtitle="Exportación de métricas y resúmenes de conciliación">
      <div className="flex flex-col gap-6 w-full max-w-[1200px] mx-auto">
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {REPORT_TYPES.map(r => (
            <button key={r.id} onClick={() => { setSelType(r.id); setGenerated(false); }}
              className={`rounded-card border text-left p-4 transition-all flex flex-col h-full ${
                selType === r.id ? "border-green-primary bg-green-primary/5 shadow-green-glow" : "border-border-card bg-bg-card hover:bg-white/[0.02]"
              }`}>
              <div className={`mb-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                selType === r.id ? "bg-bg-main" : "bg-bg-section"
              }`}>
                <r.icon className={`h-4 w-4 ${r.color}`} />
              </div>
              <h3 className={`text-[12px] font-bold mb-1 ${selType === r.id ? r.color : "text-text-primary"}`}>{r.title}</h3>
            </button>
          ))}
        </div>

        <div className="rounded-card border border-border-card bg-bg-card p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            <div>
              <label className="text-[11px] text-text-secondary font-medium block mb-1.5">Temporalidad</label>
              <select value={selPeriod} onChange={e => { setSelPeriod(e.target.value); setGenerated(false); }}
                className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-green-primary transition-colors">
                <option value="month">Mensual</option>
                <option value="h1">1er Semestre (H1)</option>
                <option value="h2">2do Semestre (H2)</option>
                <option value="year">Anual</option>
              </select>
            </div>
            {selPeriod === 'month' ? (
              <div>
                <label className="text-[11px] text-text-secondary font-medium block mb-1.5">Seleccionar Mes</label>
                <input type="month" value={selMonth} onChange={e => { setSelMonth(e.target.value); setGenerated(false); }}
                  className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-green-primary transition-colors" />
              </div>
            ) : (
              <div>
                <label className="text-[11px] text-text-secondary font-medium block mb-1.5">Seleccionar Año</label>
                <select value={selYear} onChange={e => { setSelYear(e.target.value); setGenerated(false); }}
                  className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-green-primary transition-colors">
                  {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="text-[11px] text-text-secondary font-medium block mb-1.5">Cuenta</label>
              <select value={selAccount} onChange={e => { setSelAccount(e.target.value as ReportAccount); setGenerated(false); }}
                className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-green-primary transition-colors">
                <option value="all">Todas las cuentas ({accountCounts.all})</option>
                <option value="personal">Cuenta personal ({accountCounts.personal})</option>
                <option value="funded">Cuenta fondeada / Prop Firm ({accountCounts.funded})</option>
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <p className="text-[11px] text-text-muted">Trades en el periodo</p>
              <p className={`text-[18px] font-bold tabular-nums ${periodTradeCount > 0 ? "text-text-primary" : "text-yellow-warn"}`}>
                {periodTradeCount}
              </p>
            </div>
          </div>

          {periodTradeCount === 0 && (
            <p className="mb-4 text-[11px] text-yellow-warn">
              No hay operaciones registradas en {periodLabel} para la cuenta seleccionada. El documento mostrará explícitamente que no existen operaciones cerradas en el período.
            </p>
          )}

          <div className="border-t border-border-card pt-5">
            <button onClick={generate}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-btn bg-green-primary px-8 py-3 text-[13px] font-bold text-bg-main shadow-green-glow hover:bg-green-primary/90 transition-all">
              {selType === 'psychology' ? <Brain className="h-4 w-4" /> : selType === 'technical' ? <Cpu className="h-4 w-4" /> : <BarChart2 className="h-4 w-4" />}
              {selType === 'psychology' ? 'Generar Observaciones Conductuales' : selType === 'technical' ? 'Generar Auditoría Quant' : 'Generar Reporte'}
            </button>
          </div>
        </div>

        {generated && (
          <div className="rounded-card border border-green-primary/20 bg-bg-card overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-card/60 bg-green-primary/5">
              <div>
                <p className="text-[13px] font-bold text-text-primary">
                  {selType === "psychology" ? `Observaciones Conductuales - ${periodLabel}` : 
                   selType === "technical" ? `Auditoría Quant - ${periodLabel}` :
                   selType === "tax" ? `Resumen de Conciliación No Oficial - ${periodLabel}` :
                   `Reporte - ${periodLabel}`}
                </p>
                <p className="text-[11px] text-text-muted">Vista Previa de Impresión</p>
              </div>
              <button 
                onClick={startPrintMode}
                className="flex items-center gap-2 rounded-btn border border-green-primary/30 bg-green-primary/10 px-5 py-2.5 text-[13px] font-bold text-green-primary hover:bg-green-primary/20 transition-colors shadow-[0_0_15px_rgba(32,229,141,0.2)]"
              >
                <Download className="h-4 w-4" />
                <span>Imprimir / Guardar como PDF</span>
              </button>
            </div>
            
            <div className="p-8 bg-bg-card opacity-50 blur-[2px] pointer-events-none select-none relative h-[300px]">
              <div className="absolute inset-0 flex items-center justify-center z-10 blur-none opacity-100">
                <div className="bg-bg-section/90 border border-border-card rounded-2xl p-6 text-center shadow-2xl backdrop-blur-md">
                  {selType === 'psychology' ? (
                    <Brain className="h-10 w-10 text-violet-accent mx-auto mb-3" />
                  ) : selType === 'technical' ? (
                    <Cpu className="h-10 w-10 text-indigo-400 mx-auto mb-3" />
                  ) : (
                    <FileText className="h-10 w-10 text-green-primary mx-auto mb-3" />
                  )}
                  <p className="font-bold text-white text-[14px]">Documento de {selType === 'technical' ? '2 Páginas' : '1 Página'} Listo</p>
                  <p className="text-text-muted text-[11px] max-w-xs mt-2">Haz clic en el botón de arriba para aislar el documento e imprimirlo en alta calidad.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
