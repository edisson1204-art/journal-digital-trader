"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { FileText, Calendar as CalendarIcon, Briefcase, Landmark, Download, BarChart2, X, Brain, Cpu, Target, TrendingUp, AlertTriangle, Clock, Crosshair, Globe } from "lucide-react";

const REPORT_TYPES = [
  { id: "monthly",  title: "Reporte Mensual P&L",   icon: CalendarIcon, color: "text-green-primary", desc: "Ganancias, días operativos y performance del mes." },
  { id: "strategy", title: "Rendimiento Estratégico", icon: Briefcase, color: "text-blue-accent", desc: "Desglose del Win Rate y Expectativa por cada setup." },
  { id: "tax",      title: "Reporte Fiscal", icon: Landmark, color: "text-amber-500", desc: "Días de operación, comisiones pagadas y P&L imponible." },
  { id: "psychology", title: "Dictamen Psicológico", icon: Brain, color: "text-violet-accent", desc: "Evaluación clínica de patrones mentales y ego." },
  { id: "technical", title: "Auditoría Técnica (Quant)", icon: Cpu, color: "text-indigo-400", desc: "Radiografía forense: Sesgo direccional, riesgo de ruina y MFE/MAE." }
];

const DEMO_STATS = {
  totalTrades: 342, wins: 184, losses: 146, breakeven: 12,
  grossPnl: 48500, totalCommission: 1250.50, netPnl: 47249.50,
  winRate: 53.8, profitFactor: 1.84, expectancy: 138.15,
  avgWin: 450, avgLoss: 245, avgRR: "1:1.8",
  maxDD: 3200, bestDay: 2400, worstDay: -1800, tradingDays: 145,
};

const QUANT_STATS = {
  longWinRate: 68.5, shortWinRate: 31.2,
  bestAsset: "NQ (Nasdaq 100)", bestAssetPnl: 38500,
  worstAsset: "XAUUSD (Oro)", worstAssetPnl: -8200,
  riskOfRuin: 0.4, 
  mae: 185, 
  mfe: 620, 
  efficiencyPassive: 58000, 
  efficiencyActive: 47249.50, 
  recoveryDays: 4.2,
  
  sessions: [
    { name: "Asiática", winRate: 35, pnl: -1200 },
    { name: "London", winRate: 58, pnl: 4500 },
    { name: "NY (AM Killzone)", winRate: 65, pnl: 18500 },
    { name: "NY (PM Session)", winRate: 42, pnl: 2300 }
  ],
  holdingTimes: [
    { type: "Scalping (< 15m)", winRate: 32, pnl: -3500 },
    { type: "Intraday (1h - 4h)", winRate: 68, pnl: 28500 },
    { type: "Swing (> 4h)", winRate: 55, pnl: 12000 }
  ],
  setups: [
    { name: "Silver Bullet (ICT)", winRate: 72, expectancy: 245 },
    { name: "Breaker Block Retest", winRate: 58, expectancy: 120 },
    { name: "Turtle Soup (Sweep)", winRate: 45, expectancy: -85 }
  ]
};

const generatePsychoText = (stats: typeof DEMO_STATS) => {
  const isProfitable = stats.netPnl > 0 && stats.winRate >= 50;
  return {
    diagnosis: isProfitable 
      ? "El operador presenta una curva de capital estable y una ventaja matemática fuertemente confirmada. La adherencia al plan operativo es notable."
      : "El sistema se encuentra en contracción severa (Drawdown). Existe una desalineación probabilística, causada por forzar escenarios de baja calidad.",
    egoTitle: isProfitable ? "ALERTA DE SOBRECONFIANZA (GOD SYNDROME)" : "CONTENCIÓN DE DAÑOS",
    egoText: isProfitable 
      ? "ADVERTENCIA: Tu ego está en su punto máximo. Las cuentas se queman tras una gran racha por subir el lotaje. Mantén el riesgo estrictamente plano (Flat Risk)."
      : "El mercado no tiene nada contra ti. Desvincula tu autoestima del P&L actual. Sobrevivir protegiendo el capital es tu única prioridad ahora mismo.",
    blindSpots: [
      `El mayor Drawdown es -$${Math.abs(stats.maxDD)}. Aíslate para estudiar qué patrón causó esta caída.`,
      `Pérdida promedio de $${stats.avgLoss}. Revisa si estás cancelando Stop Loss.`,
    ],
    prescription: [
      "1. Reducir el riesgo (-50%) durante las próximas 3 sesiones.",
      "2. Regla '2 Strikes': 2 operaciones perdidas = apagar plataforma.",
    ]
  };
};

const generateNarrative = (type: string, stats: typeof DEMO_STATS, quant: typeof QUANT_STATS) => {
  const isProfitable = stats.netPnl > 0;
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
      `La auditoría de rendimiento mensual certifica una curva de capital en fase de ${isProfitable ? 'expansión' : 'contracción'}. El portafolio cerró con un beneficio neto de $${stats.netPnl.toLocaleString()} tras procesar un volumen masivo de ${stats.totalTrades} transacciones. Con un Profit Factor calificado como "${pfDesc}" (${stats.profitFactor}), el modelo demuestra que por cada dólar arriesgado en el mercado, la cuenta recupera casi el doble, validando tu ventaja estadística.`,
      `Aunque tu tasa de acierto es del ${stats.winRate}%, la verdadera clave de tu supervivencia ha sido el asimétrico Ratio de Riesgo:Beneficio (${stats.avgRR}). Has sido capaz de absorber ${stats.losses} operaciones perdedoras sin que tu cuenta sufra un daño estructural. Sin embargo, tu mayor día de pérdida (-$${Math.abs(stats.worstDay)}) sigue siendo una métrica preocupante que amenaza la estabilidad del "Tail Risk".`,
      `DIRECTRIZ OPERATIVA (PLAN DE ACCIÓN): Tu estadística es funcional, pero tu volumen transaccional (Sobreoperación) está generando un gasto por comisiones de $${stats.totalCommission}, lo cual representa un lastre invisible brutal. Para el próximo mes, exige mejores confirmaciones técnicas para reducir tus trades en un 20% y optimizar el rendimiento neto.`
    ];
  }
  
  if (type === "strategy") {
    return [
      `El mapeo de eficiencia por estrategias confirma que tu capital sufre el "Principio de Pareto": una minoría de tus setups produce la inmensa mayoría de tus beneficios. El modelo institucional '${quant.setups[0].name}' es actualmente la columna vertebral de tu negocio, sosteniendo un Win Rate del ${quant.setups[0].winRate}% y una expectativa matemática dominante.`,
      `Por el contrario, el capital inyectado en intentos de reversión o capturas de liquidez (Ej. ${quant.setups[2].name}) está actuando como un agujero negro financiero, destruyendo activamente los márgenes generados por tu setup principal. Tu portafolio sufre de diversificación tóxica.`,
      `DIRECTRIZ OPERATIVA (PLAN DE ACCIÓN): Eres un especialista, no un generalista. Recorta inmediatamente el modelo de menor rendimiento. Si enfocas toda tu pólvora (margen disponible) exclusivamente en tu modelo 'A+', tu Profit Factor global experimentará un salto cuántico sin necesidad de aprender nada nuevo.`
    ];
  }
  
  if (type === "tax") {
    return [
      `Auditoría fiscal y transaccional completada. Este informe consolida la actividad contable tras ${stats.tradingDays} días de exposición al mercado. Durante este periodo, la fricción de capital (Spreads y Comisiones al bróker) ascendió a un total de $${stats.totalCommission}.`,
      `Tras deducir los gastos operativos de tu P&L Bruto ($${stats.grossPnl.toLocaleString()}), el Patrimonio Neto Imponible se fija en $${stats.netPnl.toLocaleString()}. Esta es la masa monetaria sujeta a regulaciones fiscales y retiros de cuenta de fondeo (Payouts).`,
      `Nota de Cumplimiento: Este documento sirve como estado de cuenta no oficial para conciliaciones personales. Asegúrate de cruzar estos datos con el reporte directo exportado desde tu plataforma NinjaTrader/MetaTrader.`
    ];
  }
  
  return null;
};

export default function ReportsPage() {
  const [selType, setSelType] = useState("monthly");
  const [selPeriod, setSelPeriod] = useState("month");
  const [selMonth, setSelMonth] = useState("2024-03");
  const [selYear, setSelYear] = useState("2024");
  const [generated, setGenerated] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const generate = () => setGenerated(true);
  const startPrintMode = () => setIsPrinting(true);

  useEffect(() => {
    if (isPrinting) {
      setTimeout(() => { window.print(); setIsPrinting(false); }, 500);
    }
  }, [isPrinting]);

  const ReportContent = () => {
    const psycho = generatePsychoText(DEMO_STATS);
    const narrative = generateNarrative(selType, DEMO_STATS, QUANT_STATS);

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
                TRADING INTELLIGENCE
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
                    { label:"Net P&L",          value:`+$${DEMO_STATS.netPnl.toLocaleString()}`, color:"text-emerald-600" },
                    { label:"Win Rate",          value:`${DEMO_STATS.winRate}%`,                  color:"text-blue-600"  },
                    { label:"Profit Factor",     value:String(DEMO_STATS.profitFactor),           color:"text-emerald-600"},
                    { label:"Expectancy",        value:`+$${DEMO_STATS.expectancy}`,              color:"text-emerald-600"},
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
                      ["Total de Trades",          DEMO_STATS.totalTrades,              "text-slate-800"],
                      ["Trades Ganadores",          `${DEMO_STATS.wins} (${Math.round(DEMO_STATS.wins/DEMO_STATS.totalTrades*100)}%)`, "text-emerald-600"],
                      ["Trades Perdedores",         `${DEMO_STATS.losses} (${Math.round(DEMO_STATS.losses/DEMO_STATS.totalTrades*100)}%)`, "text-red-600"],
                      ["Breakeven",                 DEMO_STATS.breakeven,                "text-amber-600"],
                      ["Gross P&L",                `+$${DEMO_STATS.grossPnl.toLocaleString()}`, "text-emerald-600"],
                      ["Total Comisiones",          `-$${DEMO_STATS.totalCommission}`,   "text-amber-600"],
                      ["Net P&L",                   `+$${DEMO_STATS.netPnl.toLocaleString()}`, "text-emerald-600"],
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
                <p className="text-[10px] print:text-[8px] text-slate-400 font-medium">Documento generado automáticamente por Trading Intelligence SaaS.</p>
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
                  {QUANT_STATS.sessions.map((session, idx) => (
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
                <p className="text-[11px] text-slate-500 mt-4 italic border-t border-slate-100 pt-3">
                  Dictamen: Tus operaciones de menos de 15 minutos (Scalping) son consistentemente perdedoras. Tienes una afinidad estadística natural hacia el Intraday largo (1-4 horas).
                </p>
              </div>
            </div>

            <div className="border border-slate-200 bg-white p-6 rounded-xl shadow-sm mb-12">
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
                  {QUANT_STATS.setups.map((setup, idx) => (
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
                  <b className="font-black">CONCLUSIÓN FORENSE:</b> El modelo "Silver Bullet" te genera un edge brutal de +$245 por trade a largo plazo. Sin embargo, el intento constante de atrapar reversiones ("Turtle Soup") absorbe y destruye casi un 30% de las ganancias de tu mejor setup. Eliminar el setup perdedor duplicaría tu rentabilidad neta.
                </p>
              </div>
            </div>

            <div className="mt-auto pt-6 border-t-2 border-slate-200 text-center">
              <p className="text-[10px] text-slate-400 font-medium">Documento generado automáticamente por Trading Intelligence SaaS.</p>
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
                  <option>2026</option><option>2025</option><option>2024</option><option>2023</option>
                </select>
              </div>
            )}
            <div>
              <label className="text-[11px] text-text-secondary font-medium block mb-1.5">Cuenta (Portafolio)</label>
              <select className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-green-primary transition-colors">
                <option>Cuenta Principal (Live)</option>
                <option>Evaluación Prop Firm 100k</option>
              </select>
            </div>
          </div>

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
                  {selType === "psychology" ? `Evaluación Psicológica - ${selMonth}` : 
                   selType === "technical" ? `Auditoría Quant (Multipage) - ${selMonth}` :
                   `Reporte - ${selMonth}`}
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
