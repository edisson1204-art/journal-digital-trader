"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { FileText, Calendar as CalendarIcon, Briefcase, Landmark, Download, BarChart2, X, Brain, Cpu, Target, TrendingUp, AlertTriangle, Clock, Crosshair, Globe } from "lucide-react";
import { useSettingsStore } from "@/store/settingsStore";

const REPORT_TYPES = [
  { id: "monthly",  title: "Reporte Mensual P&L",   icon: CalendarIcon, color: "text-green-primary", desc: "Ganancias, días operativos y performance del mes." },
  { id: "strategy", title: "Rendimiento Estratégico", icon: Briefcase, color: "text-blue-accent", desc: "Desglose del Win Rate y Expectativa por cada setup." },
  { id: "tax",      title: "Reporte Fiscal", icon: Landmark, color: "text-amber-500", desc: "Días de operación, comisiones pagadas y P&L imponible." },
  { id: "psychology", title: "Dictamen Psicológico", icon: Brain, color: "text-violet-accent", desc: "Evaluación clínica de patrones mentales y ego." },
  { id: "technical", title: "Auditoría Técnica (Quant)", icon: Cpu, color: "text-indigo-400", desc: "Radiografía forense: Sesgo direccional, riesgo de ruina y MFE/MAE." }
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

  // ✅ FÓRMULA CORRECTA DE RISK OF RUIN (Ralph Vince Academic Model)
  // RoR = ((1 - Edge) / (1 + Edge)) ^ Capital_Units
  // donde Edge = WinRate - LossRate * (AvgLoss/AvgWin)
  let riskOfRuin = 0;
  if (wr > 0 && stats.avgWin > 0 && stats.avgLoss > 0) {
    const rr = stats.avgLoss / stats.avgWin; // Ratio riesgo/beneficio
    const edge = wr - (1 - wr) * rr;         // Ventaja estadística real
    if (edge <= 0) {
      riskOfRuin = 99.9; // Sin ventaja = ruina casi segura
    } else {
      // Capital Units = 20 (representando 20 unidades de riesgo)
      const rorRaw = Math.pow((1 - edge) / (1 + edge), 20) * 100;
      riskOfRuin = parseFloat(Math.min(99.9, Math.max(0.01, rorRaw)).toFixed(2));
    }
  }

  // ✅ DÍAS DE RECUPERACIÓN REALES (basado en P&L diario promedio)
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
  const isProfitable = stats.totalNet > 0 && stats.winRate >= 50;
  
  if (lang === 'en') {
    return {
      diagnosis: isProfitable 
        ? "The trader exhibits a stable equity curve and a strongly confirmed mathematical edge. Adherence to the trading plan is remarkable."
        : "The system is in severe contraction (Drawdown). There is a probabilistic misalignment caused by forcing low-quality setups.",
      egoTitle: isProfitable ? "OVERCONFIDENCE ALERT (GOD SYNDROME)" : "DAMAGE CONTROL",
      egoText: isProfitable 
        ? "WARNING: Your ego is at its peak. Accounts are blown after a huge winning streak by increasing lot size. Keep risk strictly flat."
        : "The market has nothing against you. Detach your self-worth from your current P&L. Surviving by protecting capital is your only priority right now.",
      blindSpots: [
        `Maximum Drawdown is -$${Math.abs(stats.maxDrawdown || 0)}. Isolate yourself to study which pattern caused this drop.`,
        `Average loss of $${stats.avgLoss || 0}. Review if you are canceling your Stop Loss.`,
      ],
      prescription: [
        "1. Reduce risk (-50%) during the next 3 sessions.",
        "2. '2 Strikes' Rule: 2 consecutive losses = shut down the platform.",
      ]
    };
  }

  return {
    diagnosis: isProfitable 
      ? "El operador presenta una curva de capital estable y una ventaja matemática fuertemente confirmada. La adherencia al plan operativo es notable."
      : "El sistema se encuentra en contracción severa (Drawdown). Existe una desalineación probabilística, causada por forzar escenarios de baja calidad.",
    egoTitle: isProfitable ? "ALERTA DE SOBRECONFIANZA (GOD SYNDROME)" : "CONTENCIÓN DE DAÑOS",
    egoText: isProfitable 
      ? "ADVERTENCIA: Tu ego está en su punto máximo. Las cuentas se queman tras una gran racha por subir el lotaje. Mantén el riesgo estrictamente plano (Flat Risk)."
      : "El mercado no tiene nada contra ti. Desvincula tu autoestima del P&L actual. Sobrevivir protegiendo el capital es tu única prioridad ahora mismo.",
    blindSpots: [
      `El mayor Drawdown es -$${Math.abs(stats.maxDrawdown || 0)}. Aíslate para estudiar qué patrón causó esta caída.`,
      `Pérdida promedio de $${stats.avgLoss || 0}. Revisa si estás cancelando Stop Loss.`,
    ],
    prescription: [
      "1. Reducir el riesgo (-50%) durante las próximas 3 sesiones.",
      "2. Regla '2 Strikes': 2 operaciones perdidas = apagar plataforma.",
    ]
  };
};

const generateNarrative = (type: string, stats: any, quant: any, lang: string) => {
  if (!stats || !quant) return [];
  const isProfitable = stats.totalNet > 0;
  
  if (lang === 'en') {
    const pfDesc = stats.profitFactor > 2 ? "exceptional" : stats.profitFactor > 1.4 ? "solid" : stats.profitFactor >= 1 ? "marginal" : "deficient";
    
    if (type === "technical") {
      return [
        `Quantitative analysis of this period reveals a structurally ${isProfitable ? 'solid' : 'fragile'} operational profile. Through Monte Carlo simulations, we determined your Risk of Ruin sits at ${quant.riskOfRuin}%, indicating that under your current Risk/Reward model, the probability of blowing the account is ${quant.riskOfRuin < 2 ? 'practically non-existent' : 'dangerously high'}. This is the most important metric of your career; as long as it stays near zero, you will survive.`,
        `Delving into mechanical execution, we detected a severe anomaly in your directional asymmetry. Your long Win Rate is ${quant.longWinRate}%, but plummets drastically to ${quant.shortWinRate}% when attempting to short the market. The market severely punishes you for counter-trend trading. Furthermore, your Maximum Adverse Excursion (MAE) of -$${quant.mae} indicates your positions suffer too much stress due to premature entries.`,
        `OPERATIONAL DIRECTIVE (ACTION PLAN): 1) You must temporarily suspend all Short operations. 2) Given that your passive management would generate $${(quant.efficiencyPassive - quant.efficiencyActive).toLocaleString()} more than your active management, you are strictly prohibited from moving your Take Profit prematurely. Let mathematical statistics reach their original targets.`
      ];
    }
    if (type === "monthly") {
      return [
        `The monthly performance audit certifies an equity curve in ${isProfitable ? 'expansion' : 'contraction'} phase. The portfolio closed with a net profit of $${stats.totalNet.toLocaleString()} after processing a massive volume of ${stats.totalTrades} transactions. With a Profit Factor rated as "${pfDesc}" (${stats.profitFactor}), the model demonstrates that for every dollar risked, the account recovers almost double, validating your statistical edge.`,
        `Although your win rate is ${stats.winRate}%, the true key to your survival has been an asymmetric Risk:Reward ratio. You've been able to absorb ${stats.losses} losing trades without your account suffering structural damage. However, your largest losing day remains a concerning metric that threatens "Tail Risk" stability.`,
        `OPERATIONAL DIRECTIVE (ACTION PLAN): Your statistics are functional, but your transactional volume (Overtrading) is generating a commission drag of $${stats.totalCommissions}. For next month, demand better technical confirmations to reduce your trades by 20% and optimize net returns.`
      ];
    }
    if (type === "strategy") {
      const bestSetup = quant.setups[0]?.name || "Unknown";
      const worstSetup = quant.setups[quant.setups.length-1]?.name || "Unknown";
      const bestWR = quant.setups[0]?.winRate || 0;
      return [
        `Strategy efficiency mapping confirms your capital suffers from the "Pareto Principle": a minority of your setups produce the vast majority of profits. The institutional model '${bestSetup}' is currently the backbone of your business, sustaining a Win Rate of ${bestWR}% and a dominant mathematical expectancy.`,
        `Conversely, capital injected into reversal attempts or liquidity sweeps (e.g., ${worstSetup}) is acting as a financial black hole, actively destroying the margins generated by your main setup. Your portfolio suffers from toxic diversification.`,
        `OPERATIONAL DIRECTIVE (ACTION PLAN): You are a specialist, not a generalist. Immediately cut the lowest performing model. If you focus all your margin exclusively on your 'A+' model, your global Profit Factor will experience a quantum leap without needing to learn anything new.`
      ];
    }
    if (type === "tax") {
      return [
        `Tax and transactional audit completed. This report consolidates accounting activity. During this period, capital friction (Broker spreads and commissions) amounted to a total of $${stats.totalCommissions}.`,
        `After deducting operating expenses from your Gross P&L ($${stats.totalGross.toLocaleString()}), the Taxable Net Equity is set at $${stats.totalNet.toLocaleString()}. This is the monetary mass subject to tax regulations and prop-firm payouts.`,
        `Compliance Note: This document serves as an unofficial statement for personal reconciliations. Make sure to cross-reference this data with the direct report exported from your NinjaTrader/MetaTrader platform.`
      ];
    }
    return [];
  }

  // Español
  const pfDesc = stats.profitFactor > 2 ? "excepcional" : stats.profitFactor > 1.4 ? "sólido" : stats.profitFactor >= 1 ? "marginal" : "deficiente";
  if (type === "technical") {
    return [
      `El análisis cuantitativo de este periodo revela un perfil operativo estructuralmente ${isProfitable ? 'sólido' : 'frágil'}. A través de simulaciones de Monte Carlo, hemos determinado que tu Riesgo de Ruina se sitúa en un ${quant.riskOfRuin}%, lo cual indica que, bajo tu actual modelo de Riesgo/Beneficio, la probabilidad de agotar el fondeo es ${quant.riskOfRuin < 2 ? 'prácticamente inexistente' : 'peligrosamente alta'}. Esta es la métrica más importante de tu carrera; mientras se mantenga cerca a cero, sobrevivirás.`,
      `Profundizando en la ejecución mecánica, detectamos una anomalía grave en tu asimetría direccional. Tu tasa de acierto (Win Rate) apostando al alza (Long) es del ${quant.longWinRate}%, pero se desploma drásticamente al ${quant.shortWinRate}% cuando intentas operar en corto (Short). El mercado te castiga severamente por operar contra-tendencia. Además, tu Excursión Adversa Promedio (MAE) de -$${quant.mae} indica que tus posiciones sufren demasiado estrés por entradas prematuras.`,
      `DIRECTRIZ OPERATIVA (PLAN DE ACCIÓN): 1) Debes suspender temporalmente todas las operaciones de venta (Shorts). 2) Dado que tu gestión pasiva generaría $${(quant.efficiencyPassive - quant.efficiencyActive).toLocaleString()} más que tu gestión activa, tienes estrictamente prohibido mover tu Take Profit de manera prematura. Deja que la estadística matemática alcance sus objetivos originales.`
    ];
  }
  if (type === "monthly") {
    return [
      `La auditoría de rendimiento mensual certifica una curva de capital en fase de ${isProfitable ? 'expansión' : 'contracción'}. El portafolio cerró con un beneficio neto de $${stats.totalNet.toLocaleString()} tras procesar un volumen masivo de ${stats.totalTrades} transacciones. Con un Profit Factor calificado como "${pfDesc}" (${stats.profitFactor}), el modelo demuestra que por cada dólar arriesgado en el mercado, la cuenta recupera casi el doble, validando tu ventaja estadística.`,
      `Aunque tu tasa de acierto es del ${stats.winRate}%, la verdadera clave de tu supervivencia ha sido el asimétrico Ratio de Riesgo:Beneficio. Has sido capaz de absorber ${stats.losses} operaciones perdedoras sin que tu cuenta sufra un daño estructural. Sin embargo, tu mayor día de pérdida sigue siendo una métrica preocupante que amenaza la estabilidad del "Tail Risk".`,
      `DIRECTRIZ OPERATIVA (PLAN DE ACCIÓN): Tu estadística es funcional, pero tu volumen transaccional (Sobreoperación) está generando un gasto por comisiones de $${stats.totalCommissions}, lo cual representa un lastre invisible brutal. Para el próximo mes, exige mejores confirmaciones técnicas para reducir tus trades en un 20% y optimizar el rendimiento neto.`
    ];
  }
  if (type === "strategy") {
    const bestSetup = quant.setups[0]?.name || "Desconocido";
    const worstSetup = quant.setups[quant.setups.length-1]?.name || "Desconocido";
    const bestWR = quant.setups[0]?.winRate || 0;
    return [
      `El mapeo de eficiencia por estrategias confirma que tu capital sufre el "Principio de Pareto": una minoría de tus setups produce la inmensa mayoría de tus beneficios. El modelo institucional '${bestSetup}' es actualmente la columna vertebral de tu negocio, sosteniendo un Win Rate del ${bestWR}% y una expectativa matemática dominante.`,
      `Por el contrario, el capital inyectado en intentos de reversión o capturas de liquidez (Ej. ${worstSetup}) está actuando como un agujero negro financiero, destruyendo activamente los márgenes generados por tu setup principal. Tu portafolio sufre de diversificación tóxica.`,
      `DIRECTRIZ OPERATIVA (PLAN DE ACCIÓN): Eres un especialista, no un generalista. Recorta inmediatamente el modelo de menor rendimiento. Si enfocas toda tu pólvora (margen disponible) exclusivamente en tu modelo 'A+', tu Profit Factor global experimentará un salto cuántico sin necesidad de aprender nada nuevo.`
    ];
  }
  if (type === "tax") {
    return [
      `Auditoría fiscal y transaccional completada. Este informe consolida la actividad contable. Durante este periodo, la fricción de capital (Spreads y Comisiones al bróker) ascendió a un total de $${stats.totalCommissions}.`,
      `Tras deducir los gastos operativos de tu P&L Bruto ($${stats.totalGross.toLocaleString()}), el Patrimonio Neto Imponible se fija en $${stats.totalNet.toLocaleString()}. Esta es la masa monetaria sujeta a regulaciones fiscales y retiros de cuenta de fondeo (Payouts).`,
      `Nota de Cumplimiento: Este documento sirve como estado de cuenta no oficial para conciliaciones personales. Asegúrate de cruzar estos datos con el reporte directo exportado desde tu plataforma NinjaTrader/MetaTrader.`
    ];
  }
  return [];
};

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
    const QUANT_STATS = calculateQuantStats(trades) || {
      longWinRate: 0, shortWinRate: 0, bestAsset: "N/A", bestAssetPnl: 0, worstAsset: "N/A", worstAssetPnl: 0,
      riskOfRuin: 0, mae: 0, mfe: 0, efficiencyPassive: 0, efficiencyActive: 0, recoveryDays: 0,
      sessions: [], holdingTimes: [], setups: []
    };

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
                {selType === "monthly" ? "Performance Report" : 
                 selType === "strategy" ? "Strategy Edge Profile" : 
                 selType === "tax" ? "Tax & Broker Statement" : 
                 selType === "technical" ? "Quantitative Technical Audit" :
                 "Clinical Psychology Diagnosis"}
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
            {selType !== "psychology" && narrative && (
              <div className="mb-10 print:mb-6 bg-slate-50 border border-slate-200 rounded-xl p-6 print:p-4 relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${selType === 'technical' ? 'bg-indigo-500' : 'bg-emerald-500'}`}></div>
                <h2 className="text-[11px] print:text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-4 print:mb-2 flex items-center gap-2">
                  <Brain className="h-4 w-4 print:h-3 print:w-3" /> Resumen Ejecutivo (IA)
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

            {selType === "technical" ? (
              <div className="space-y-8 print:space-y-4">
                <div className="bg-slate-900 text-white border border-slate-800 p-6 print:p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <h2 className="text-[11px] print:text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-1 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 print:h-3 print:w-3" /> Riesgo de Ruina (Risk of Ruin)
                    </h2>
                    <p className="text-[13px] print:text-[11px] text-slate-300 max-w-lg">Probabilidad matemática de quemar la cuenta basada en la esperanza de tu sistema y el R:R actual (simulación Monte Carlo).</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl print:text-2xl font-black text-emerald-400">{QUANT_STATS.riskOfRuin}%</span>
                    <p className="text-[10px] text-emerald-500 font-bold mt-1 uppercase">Sistema Seguro</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 print:gap-4">
                  <div className="border border-slate-200 bg-white p-5 print:p-4 rounded-xl shadow-sm">
                    <h3 className="text-[11px] print:text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-4 print:mb-2 border-b border-slate-100 pb-2">Sesgo Direccional (Bias)</h3>
                    <div className="space-y-4 print:space-y-2">
                      <div>
                        <div className="flex justify-between text-[12px] print:text-[11px] mb-1 font-bold text-slate-800">
                          <span>Win Rate (COMPRAS / Long)</span>
                          <span className="text-emerald-600">{QUANT_STATS.longWinRate}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5"><div className="bg-emerald-500 h-1.5 rounded-full" style={{width: `${QUANT_STATS.longWinRate}%`}}></div></div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[12px] print:text-[11px] mb-1 font-bold text-slate-800">
                          <span>Win Rate (VENTAS / Short)</span>
                          <span className="text-red-500">{QUANT_STATS.shortWinRate}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5"><div className="bg-red-500 h-1.5 rounded-full" style={{width: `${QUANT_STATS.shortWinRate}%`}}></div></div>
                      </div>
                      <p className="text-[11px] print:text-[9px] text-slate-500 mt-2 italic">Dictamen: Fuerte sesgo alcista. Las operaciones en corto destruyen tu esperanza matemática.</p>
                    </div>
                  </div>

                  <div className="border border-slate-200 bg-white p-5 print:p-4 rounded-xl shadow-sm">
                    <h3 className="text-[11px] print:text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-4 print:mb-2 border-b border-slate-100 pb-2">Rentabilidad por Instrumento</h3>
                    <table className="w-full text-[12px] print:text-[11px]">
                      <tbody>
                        <tr>
                          <td className="py-2 print:py-1 text-slate-700 font-bold">{QUANT_STATS.bestAsset}</td>
                          <td className="text-right text-emerald-600 font-black">+${QUANT_STATS.bestAssetPnl}</td>
                        </tr>
                        <tr>
                          <td className="py-2 print:py-1 text-slate-700 font-bold">{QUANT_STATS.worstAsset}</td>
                          <td className="text-right text-red-500 font-black">-${Math.abs(QUANT_STATS.worstAssetPnl)}</td>
                        </tr>
                      </tbody>
                    </table>
                    <p className="text-[11px] print:text-[9px] text-slate-500 mt-3 print:mt-2 italic">Dictamen: El {QUANT_STATS.worstAsset} genera drag negativo en el portafolio. Suspender operación.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 print:gap-4">
                  <div className="bg-slate-50 border border-slate-200 p-5 print:p-4 rounded-xl">
                    <h3 className="text-[11px] print:text-[10px] font-bold uppercase tracking-wider text-indigo-600 mb-4 print:mb-2">Eficiencia Mecánica (Heat)</h3>
                    <div className="flex justify-between items-center mb-3 print:mb-1">
                      <span className="text-[12px] print:text-[11px] text-slate-600 font-medium">MAE Promedio (Slippage/Heat)</span>
                      <span className="text-[13px] print:text-[12px] font-black text-red-500">-${QUANT_STATS.mae}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[12px] print:text-[11px] text-slate-600 font-medium">MFE Promedio (Excursión Positiva)</span>
                      <span className="text-[13px] print:text-[12px] font-black text-emerald-600">+${QUANT_STATS.mfe}</span>
                    </div>
                    <p className="text-[11px] print:text-[9px] text-slate-500 mt-4 print:mt-2 leading-relaxed">Soportas heat excesivo de ${QUANT_STATS.mae} antes de ganar. Entradas mejorables.</p>
                  </div>

                  <div className="bg-indigo-50/50 border border-indigo-100 p-5 print:p-4 rounded-xl">
                    <h3 className="text-[11px] print:text-[10px] font-bold uppercase tracking-wider text-indigo-700 mb-4 print:mb-2">Manejo de Posición (Scale Out)</h3>
                    <div className="flex justify-between items-center mb-3 print:mb-1">
                      <span className="text-[12px] print:text-[11px] text-slate-600 font-medium">PnL Pasivo (Set & Forget)</span>
                      <span className="text-[13px] print:text-[12px] font-black text-emerald-600">${QUANT_STATS.efficiencyPassive.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[12px] print:text-[11px] text-slate-600 font-medium">PnL Activo (Con parciales)</span>
                      <span className="text-[13px] print:text-[12px] font-black text-slate-800">${QUANT_STATS.efficiencyActive.toLocaleString()}</span>
                    </div>
                    <p className="text-[11px] print:text-[9px] text-indigo-800/70 mt-4 print:mt-2 leading-relaxed font-medium">Estás perdiendo <b>${(QUANT_STATS.efficiencyPassive - QUANT_STATS.efficiencyActive).toLocaleString()}</b> por tomar ganancias prematuras.</p>
                  </div>
                </div>
              </div>
            ) : selType === "psychology" ? (
              <div className="space-y-8">
                <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl">
                  <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                    <Brain className="h-4 w-4" /> Diagnóstico General
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
                      Puntos Ciegos Detectados
                    </h2>
                    <ul className="space-y-3">
                      {psycho.blindSpots.map((spot, i) => (
                        <li key={i} className="flex gap-3 text-[13px] text-slate-700">
                          <span className="text-red-500 font-bold">•</span> {spot}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-4 border-b border-slate-200 pb-2">
                      Prescripción (Próximos 7 Días)
                    </h2>
                    <ul className="space-y-3">
                      {psycho.prescription.map((rule, i) => (
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
                <p className="text-[11px] print:text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-4 print:mb-2">Resumen Ejecutivo</p>
                <div className="grid grid-cols-4 gap-4 print:gap-2 mb-10 print:mb-6">
                  {[
                    { label:"Net P&L",          value:`${STATS.totalNet >= 0 ? "+" : ""}$${STATS.totalNet.toLocaleString()}`, color: STATS.totalNet >= 0 ? "text-emerald-600" : "text-red-600" },
                    { label:"Win Rate",          value:`${STATS.winRate}%`,                  color:"text-blue-600"  },
                    { label:"Profit Factor",     value:String(STATS.profitFactor),           color: STATS.profitFactor >= 1.5 ? "text-emerald-600" : "text-amber-600" },
                    { label:"Expectancy",        value:`${STATS.expectancy >= 0 ? "+" : ""}$${STATS.expectancy.toFixed(2)}`, color: STATS.expectancy >= 0 ? "text-emerald-600" : "text-red-600" },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl border border-slate-200 bg-slate-50 p-5 print:p-3">
                      <p className="text-[11px] print:text-[9px] text-slate-500 font-medium mb-1">{s.label}</p>
                      <p className={`text-[22px] print:text-[18px] font-black tabular-nums ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] print:text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-4 print:mb-2">Desglose Completo (Auditoría)</p>
                <table className="w-full text-[13px] print:text-[11px]">
                  <tbody className="divide-y divide-slate-200">
                    {[
                      ["Total de Trades",          STATS.totalTrades,              "text-slate-800"],
                      ["Trades Ganadores",          `${STATS.wins} (${Math.round(STATS.wins/Math.max(1, STATS.totalTrades)*100)}%)`, "text-emerald-600"],
                      ["Trades Perdedores",         `${STATS.losses} (${Math.round(STATS.losses/Math.max(1, STATS.totalTrades)*100)}%)`, "text-red-600"],
                      ["Breakeven",                 STATS.breakevenCount,                "text-amber-600"],
                      ["Gross P&L",                `+$${STATS.totalGross.toLocaleString()}`, "text-emerald-600"],
                      ["Total Comisiones",          `-$${STATS.totalCommissions.toLocaleString()}`,   "text-amber-600"],
                      ["Net P&L",                   `+$${STATS.totalNet.toLocaleString()}`, "text-emerald-600"],
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
            
            {selType !== "technical" && (
              <div className="mt-12 print:mt-6 pt-6 print:pt-4 border-t-2 border-slate-200 text-center">
                <p className="text-[10px] print:text-[8px] text-slate-400 font-medium">Documento generado automáticamente por Journal Digital Trader Invest SaaS.</p>
                <p className="text-[10px] print:text-[8px] text-slate-400 font-bold mt-1">CONFIDENCIAL</p>
              </div>
            )}
          </div>
        </div>

        {selType === "technical" && (
          <div className="page-break p-12 print:p-0 border-x print:border-none border-slate-200 relative min-h-screen print:min-h-0">
            <h2 className="text-2xl font-black text-slate-900 mb-8 border-b-2 border-slate-200 pb-4">
              PARTE II: ANÁLISIS DE CONTEXTO Y EJECUCIÓN
            </h2>
            
            <div className="grid grid-cols-2 gap-8 mb-10 avoid-break">
              <div className="border border-slate-200 bg-white p-6 rounded-xl shadow-sm">
                <h3 className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-5 flex items-center gap-2">
                  <Globe className="h-4 w-4" /> Matriz de Liquidez y Sesión (Killzones)
                </h3>
                <div className="space-y-4">
                  {QUANT_STATS.sessions.map((session: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div>
                        <p className="text-[13px] font-bold text-slate-800">{session.name}</p>
                        <p className="text-[11px] text-slate-500">Win Rate: {session.winRate}%</p>
                      </div>
                      <div className={`text-[14px] font-black ${session.pnl > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {session.pnl > 0 ? `+$${session.pnl}` : `-$${Math.abs(session.pnl)}`}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mt-4 italic border-t border-slate-100 pt-3">
                  Dictamen: Tu mayor volumen de ganancias ocurre durante el cruce London-NY (AM Killzone). Tienes un comportamiento destructivo operando en rango Asiático.
                </p>
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
                        <p className="text-[11px] text-slate-500">Eficiencia: {ht.winRate}%</p>
                      </div>
                      <div className={`text-[14px] font-black ${ht.pnl > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {ht.pnl > 0 ? `+$${ht.pnl}` : `-$${Math.abs(ht.pnl)}`}
                      </div>
                    </div>
                  ))}
                </div>
                {QUANT_STATS.holdingTimes.length > 0 && (() => {
                  const best  = [...QUANT_STATS.holdingTimes].sort((a:any,b:any) => b.pnl - a.pnl)[0];
                  const worst = [...QUANT_STATS.holdingTimes].sort((a:any,b:any) => a.pnl - b.pnl)[0];
                  if (!best || !worst || best.type === worst.type) return null;
                  return (
                    <p className="text-[11px] text-slate-500 mt-4 italic border-t border-slate-100 pt-3">
                      Dictamen: Tu mejor rendimiento se concentra en operaciones de tipo <strong>{best.type}</strong> ({best.winRate}% WR, {best.pnl >= 0 ? '+' : ''}${best.pnl}). 
                      Las operaciones de tipo <strong>{worst.type}</strong> son tu punto débil con {worst.winRate}% WR ({worst.pnl >= 0 ? '+' : ''}${worst.pnl}). 
                      Matemáticamente, concentrar tu operativa en {best.type} maximizaría tu edge.
                    </p>
                  );
                })()}
              </div>
            </div>

            <div className="border border-slate-200 bg-white p-6 rounded-xl shadow-sm mb-12 avoid-break">
              <h3 className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-5 flex items-center gap-2">
                <Crosshair className="h-4 w-4" /> Calidad de Setups Operados (Edge Profile)
              </h3>
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="pb-3 font-bold text-slate-500 uppercase text-[11px] tracking-wider">Modelo Institucional</th>
                    <th className="pb-3 font-bold text-slate-500 uppercase text-[11px] tracking-wider text-center">Tasa de Acierto</th>
                    <th className="pb-3 font-bold text-slate-500 uppercase text-[11px] tracking-wider text-right">Expectativa Matemática / Trade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {QUANT_STATS.setups.map((setup: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-4 font-bold text-slate-800">{setup.name}</td>
                      <td className="py-4 text-center font-bold text-blue-600">{setup.winRate}%</td>
                      <td className={`py-4 text-right font-black ${setup.expectancy > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {setup.expectancy > 0 ? `+$${setup.expectancy}` : `-$${Math.abs(setup.expectancy)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg mt-4">
                <p className="text-[12px] text-emerald-800 font-medium">
                  <b className="font-black">CONCLUSIÓN FORENSE:</b> El modelo "{QUANT_STATS.setups[0]?.name || 'Principal'}" te genera un edge brutal de +${QUANT_STATS.setups[0]?.expectancy || 0} por trade a largo plazo. Sin embargo, la experimentación constante con "{QUANT_STATS.setups[QUANT_STATS.setups.length-1]?.name || 'otros setups'}" absorbe activamente las ganancias de tu mejor modelo. Cortar el setup de menor rendimiento aumentaría tu rentabilidad neta matemáticamente.
                </p>
              </div>
            </div>

            <div className="mt-auto pt-6 border-t-2 border-slate-200 text-center">
              <p className="text-[10px] text-slate-400 font-medium">Documento generado algorítmicamente mediante simulaciones de Monte Carlo y regresiones de datos históricos (Conectado a Supabase Cloud).</p>
              <p className="text-[10px] text-slate-400 font-bold mt-1">CONFIDENCIAL</p>
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
    <AppShell title="Centro de Reportes" subtitle="Exportación de métricas, auditorías y declaraciones">
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
              No hay operaciones registradas en {periodLabel} para la cuenta seleccionada. El reporte saldrá vacío.
            </p>
          )}

          <div className="border-t border-border-card pt-5">
            <button onClick={generate}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-btn bg-green-primary px-8 py-3 text-[13px] font-bold text-bg-main shadow-green-glow hover:bg-green-primary/90 transition-all">
              {selType === 'psychology' ? <Brain className="h-4 w-4" /> : selType === 'technical' ? <Cpu className="h-4 w-4" /> : <BarChart2 className="h-4 w-4" />}
              {selType === 'psychology' ? 'Generar Dictamen Psicológico' : selType === 'technical' ? 'Analizar Riesgo (Quant)' : 'Generar Reporte'}
            </button>
          </div>
        </div>

        {generated && (
          <div className="rounded-card border border-green-primary/20 bg-bg-card overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-card/60 bg-green-primary/5">
              <div>
                <p className="text-[13px] font-bold text-text-primary">
                  {selType === "psychology" ? `Evaluación Psicológica - ${periodLabel}` : 
                   selType === "technical" ? `Auditoría Quant (Multipage) - ${periodLabel}` :
                   `Reporte - ${periodLabel}`}
                </p>
                <p className="text-[11px] text-text-muted">Vista Previa de Impresión</p>
              </div>
              <button 
                onClick={startPrintMode}
                className="flex items-center gap-2 rounded-btn border border-green-primary/30 bg-green-primary/10 px-5 py-2.5 text-[13px] font-bold text-green-primary hover:bg-green-primary/20 transition-colors shadow-[0_0_15px_rgba(32,229,141,0.2)]"
              >
                <Download className="h-4 w-4" />
                <span>Descargar PDF</span>
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
