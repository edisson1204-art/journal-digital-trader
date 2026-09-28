"use client";

import { AppShell } from "@/components/AppShell";
import { useState, useMemo } from "react";
import { useSettingsStore } from "@/store/settingsStore";
import {
  Play, RefreshCw, BarChart2, AlertTriangle,
  CheckCircle, Info, BookOpen, Pencil, ChevronDown, ChevronUp,
} from "lucide-react";
import { useTradeStore } from "@/store/tradeStore";
import { computeStats } from "@/lib/tradeTypes";

/* ══════════════════════════════════════════════════════════
   STATISTICAL ENGINE — Monte Carlo Professional (v2)
══════════════════════════════════════════════════════════ */

function randNormal(mean: number, std: number): number {
  if (std <= 0) return mean;
  const u1 = Math.random() || 1e-10;
  const u2 = Math.random() || 1e-10;
  return mean + Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * std;
}

interface SimPath {
  finalBalance: number;
  finalPnlPct:  number;
  maxDrawdownPct: number;
  maxConsecLoss:  number;
  ruined:         boolean;
}

interface SimStats {
  pctProfitable:   number;
  pctRuin:         number;
  medianFinal:     number;
  meanFinal:       number;
  stdFinal:        number;
  p5Final:         number;
  p25Final:        number;
  p75Final:        number;
  p95Final:        number;
  medianMaxDD:     number;
  p95MaxDD:        number;
  worstMaxDDPct:   number;
  medianConsecLoss: number;
  sharpeRatio:     number;
  fanBands:        number[][];   // [step][5 percentiles: p5,p25,p50,p75,p95]
  histogram:       { low: number; high: number; count: number; pct: number }[];
  expectancyPerTrade: number;
  rrRatio:         number;
  // Error analysis
  seWinRate:       number;   // standard error of win rate
  ciWinRateLow:    number;
  ciWinRateHigh:   number;
  seExpectancy:    number;   // standard error of expectancy
  ciExpLow:        number;
  ciExpHigh:       number;
  sampleAdequacy:  "poor" | "minimal" | "acceptable" | "good" | "excellent";
  marginOfError:   number;   // % margin of error on final balance (P50)
}

function pctile(arr: number[], p: number): number {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(Math.floor(p * s.length), s.length - 1)];
}

function runMonteCarlo(
  startBalance: number, winRate: number,
  avgWin: number, avgLoss: number,
  variability: number, numTrades: number,
  numSims: number, commission: number,
  sampleN: number,                        // real historical N for error bounds
): SimStats {
  const wr  = winRate / 100;
  const sw  = avgWin  * (variability / 100);
  const sl  = avgLoss * (variability / 100);
  const exp = wr * (avgWin - commission) - (1 - wr) * (avgLoss + commission);

  // per-trade std (for Sharpe)
  const varPT = wr * Math.pow(avgWin - commission - exp, 2) +
                (1 - wr) * Math.pow(-(avgLoss + commission) - exp, 2) +
                wr * sw * sw + (1 - wr) * sl * sl;
  const stdPT = Math.sqrt(Math.max(varPT, 0.001));
  const sharpe = stdPT > 0 ? (exp / stdPT) * Math.sqrt(numTrades) : 0;

  // Error analysis from real sample
  const seWR  = Math.sqrt((wr * (1 - wr)) / Math.max(sampleN, 1));
  const ciWRL = Math.max(0,   wr - 1.96 * seWR) * 100;
  const ciWRH = Math.min(100, wr + 1.96 * seWR) * 100;
  const seExp = stdPT / Math.sqrt(Math.max(sampleN, 1));
  const adequacy: SimStats["sampleAdequacy"] =
    sampleN < 20  ? "poor" :
    sampleN < 30  ? "minimal" :
    sampleN < 50  ? "acceptable" :
    sampleN < 100 ? "good" : "excellent";

  // Run paths
  const paths: SimPath[] = [];
  const fanMatrix: number[][] = Array.from({ length: numTrades + 1 }, () => []);

  for (let sim = 0; sim < numSims; sim++) {
    let bal = startBalance, peak = startBalance;
    let maxDD = 0, consec = 0, maxC = 0;
    let ruined = false;
    fanMatrix[0].push(startBalance);

    for (let t = 0; t < numTrades; t++) {
      const win = Math.random() * 100 < winRate;
      const delta = win
        ? Math.max(0.01, randNormal(avgWin,  sw))  - commission
        : -(Math.max(0.01, randNormal(avgLoss, sl)) + commission);
      bal += delta;
      if (bal > peak) peak = bal;
      const dd = (peak > 0) ? ((peak - bal) / peak) * 100 : 0;
      if (dd > maxDD) maxDD = dd;
      if (!win) { consec++; if (consec > maxC) maxC = consec; } else consec = 0;
      if (bal <= 0) { bal = 0; ruined = true; }
      fanMatrix[t + 1].push(bal);
      if (ruined) { for (let r = t + 2; r <= numTrades; r++) fanMatrix[r].push(0); break; }
    }
    paths.push({
      finalBalance:   bal,
      finalPnlPct:    startBalance > 0 ? ((bal - startBalance) / startBalance) * 100 : 0,
      maxDrawdownPct: maxDD,
      maxConsecLoss:  maxC,
      ruined,
    });
  }

  const finals  = paths.map(p => p.finalBalance);
  const ddPcts  = paths.map(p => p.maxDrawdownPct);
  const streaks = paths.map(p => p.maxConsecLoss);

  const fanBands = fanMatrix.map(vals =>
    !vals.length ? [0,0,0,0,0] :
    [0.05,0.25,0.50,0.75,0.95].map(p => pctile(vals, p))
  );

  const fMin = Math.min(...finals), fMax = Math.max(...finals);
  const binW = (fMax - fMin) / 14 || 1;
  const histogram = Array.from({ length: 14 }, (_, i) => {
    const low = fMin + i * binW, high = fMin + (i + 1) * binW;
    const count = finals.filter(f => f >= low && f < high).length;
    return { low, high, count, pct: (count / numSims) * 100 };
  });

  const medianFinal = pctile(finals, 0.50);
  const marginOfError = medianFinal > 0
    ? (pctile(finals, 0.75) - pctile(finals, 0.25)) / 2 / medianFinal * 100 : 0;

  return {
    pctProfitable:   paths.filter(p => p.finalBalance > startBalance).length / numSims * 100,
    pctRuin:         paths.filter(p => p.ruined).length / numSims * 100,
    medianFinal, meanFinal: finals.reduce((a,b)=>a+b,0)/numSims,
    stdFinal:        Math.sqrt(finals.reduce((s,f)=>s+Math.pow(f-finals.reduce((a,b)=>a+b,0)/numSims,2),0)/numSims),
    p5Final:         pctile(finals, 0.05),
    p25Final:        pctile(finals, 0.25),
    p75Final:        pctile(finals, 0.75),
    p95Final:        pctile(finals, 0.95),
    medianMaxDD:     pctile(ddPcts, 0.50),
    p95MaxDD:        pctile(ddPcts, 0.95),
    worstMaxDDPct:   Math.max(...ddPcts, 0),
    medianConsecLoss: pctile(streaks, 0.50),
    sharpeRatio:     sharpe,
    fanBands, histogram,
    expectancyPerTrade: exp,
    rrRatio: avgLoss > 0 ? avgWin / avgLoss : 0,
    seWinRate: seWR * 100,
    ciWinRateLow: ciWRL, ciWinRateHigh: ciWRH,
    seExpectancy: seExp,
    ciExpLow: exp - 1.96 * seExp, ciExpHigh: exp + 1.96 * seExp,
    sampleAdequacy: adequacy,
    marginOfError,
  };
}

/* ══════════════════════════════════════════════════════════
   REPORT GENERATOR
══════════════════════════════════════════════════════════ */
function generateReport(s: SimStats, winRate: number, numTrades: number, commission: number, avgWin: number, avgLoss: number, variability: number, lang: string) {
  const pros: string[] = [], cons: string[] = [], recs: string[] = [];

  if (lang === 'en') {
    if (s.expectancyPerTrade > 0) pros.push(`Positive expectancy of +$${s.expectancyPerTrade.toFixed(2)}/trade → confirmed statistical edge.`);
    else cons.push(`NEGATIVE expectancy of $${s.expectancyPerTrade.toFixed(2)}/trade → strategy loses money long-term.`);

    if (s.rrRatio >= 2)  pros.push(`Excellent R:R of 1:${s.rrRatio.toFixed(2)} → each win covers multiple losses.`);
    else if (s.rrRatio < 1) cons.push(`Unfavorable R:R of 1:${s.rrRatio.toFixed(2)} → needs WR > ${Math.round(100/(1+s.rrRatio))}% to survive.`);

    if (s.pctProfitable >= 75) pros.push(`High profitability chance: ${s.pctProfitable.toFixed(1)}% of simulations end positive.`);
    else if (s.pctProfitable < 50) cons.push(`Only ${s.pctProfitable.toFixed(1)}% of simulations are profitable — high risk.`);

    if (s.pctRuin < 2)   pros.push(`Risk of ruin almost nil: ${s.pctRuin.toFixed(2)}%.`);
    else if (s.pctRuin > 10) cons.push(`⚠️ Elevated Risk of Ruin: ${s.pctRuin.toFixed(1)}% — reduce position size.`);

    if (s.medianMaxDD < 10) pros.push(`Contained median drawdown: ${s.medianMaxDD.toFixed(1)}% — stable strategy.`);
    else if (s.medianMaxDD > 20) cons.push(`Median drawdown of ${s.medianMaxDD.toFixed(1)}% → violates funded account limits (8-10% typical).`);

    if (s.sharpeRatio > 1.5) pros.push(`Sharpe Ratio of ${s.sharpeRatio.toFixed(2)} → institutional quality (>1 required).`);
    else if (s.sharpeRatio < 0.5) cons.push(`Low Sharpe Ratio (${s.sharpeRatio.toFixed(2)}) → high risk relative to return.`);

    if (variability > 60) cons.push(`High variability (${variability}%) → inconsistent trades, poorly defined edge.`);

    const commImpact = commission / Math.max(avgWin, 1);
    if (commImpact > 0.15) cons.push(`Commissions take ${(commImpact*100).toFixed(0)}% of avg win → severe profit impact.`);

    if (s.sampleAdequacy === "poor" || s.sampleAdequacy === "minimal")
      recs.push(`Insufficient historical sample → add more trades for reliable projections (min 50).`);
    if (s.pctRuin > 5)     recs.push(`Reduce risk per trade to 0.5-1% to drop P(ruin) below 5%.`);
    if (s.medianMaxDD > 15) recs.push(`Implement a 3-5% daily stop to control drawdown.`);
    if (s.pctProfitable >= 70 && s.pctRuin < 5) recs.push(`Viable system for funded accounts. Validate with live data.`);
    if (s.medianConsecLoss >= 6) recs.push(`Protocol: if you hit ${Math.round(s.medianConsecLoss*0.7)} consecutive losses, stop trading for 1 day.`);
    recs.push(`The 95% Confidence Interval for Expectancy is [$${s.ciExpLow.toFixed(0)}, $${s.ciExpHigh.toFixed(0)}]/trade — work on narrowing this by increasing sample size.`);
  } else {
    if (s.expectancyPerTrade > 0) pros.push(`Expectancy positiva de +$${s.expectancyPerTrade.toFixed(2)}/trade → ventaja estadística confirmada.`);
    else cons.push(`Expectancy NEGATIVA de $${s.expectancyPerTrade.toFixed(2)}/trade → la estrategia pierde dinero a largo plazo.`);

    if (s.rrRatio >= 2)  pros.push(`R:R excelente de 1:${s.rrRatio.toFixed(2)} → cada ganancia cubre múltiples pérdidas.`);
    else if (s.rrRatio < 1) cons.push(`R:R desfavorable de 1:${s.rrRatio.toFixed(2)} → necesitas WR > ${Math.round(100/(1+s.rrRatio))}% para sobrevivir.`);

    if (s.pctProfitable >= 75) pros.push(`Alta probabilidad de rentabilidad: ${s.pctProfitable.toFixed(1)}% de las simulaciones terminan en positivo.`);
    else if (s.pctProfitable < 50) cons.push(`Solo el ${s.pctProfitable.toFixed(1)}% de las simulaciones son rentables — riesgo alto.`);

    if (s.pctRuin < 2)   pros.push(`Riesgo de ruina casi nulo: ${s.pctRuin.toFixed(2)}%.`);
    else if (s.pctRuin > 10) cons.push(`⚠️ Riesgo de ruina elevado: ${s.pctRuin.toFixed(1)}% — reduce tamaño de posición.`);

    if (s.medianMaxDD < 10) pros.push(`Drawdown mediano contenido: ${s.medianMaxDD.toFixed(1)}% — estrategia estable.`);
    else if (s.medianMaxDD > 20) cons.push(`Drawdown mediano de ${s.medianMaxDD.toFixed(1)}% → viola reglas típicas de funded accounts (8-10% límite).`);

    if (s.sharpeRatio > 1.5) pros.push(`Sharpe Ratio de ${s.sharpeRatio.toFixed(2)} → calidad institucional (>1 requerido para funded).`);
    else if (s.sharpeRatio < 0.5) cons.push(`Sharpe Ratio bajo (${s.sharpeRatio.toFixed(2)}) → alto riesgo relativo al retorno.`);

    if (variability > 60) cons.push(`Alta variabilidad (${variability}%) → inconsistencia entre trades, señal de edge poco definido.`);

    const commImpact = commission / Math.max(avgWin, 1);
    if (commImpact > 0.15) cons.push(`Comisiones representan ${(commImpact*100).toFixed(0)}% del avg win → impacto significativo en rentabilidad.`);

    if (s.sampleAdequacy === "poor" || s.sampleAdequacy === "minimal")
      recs.push(`Muestra histórica insuficiente → añade más trades para proyecciones confiables (mínimo 50 recomendados).`);
    if (s.pctRuin > 5)     recs.push(`Reduce riesgo por trade al 0.5-1% del balance para bajar P(ruina) < 5%.`);
    if (s.medianMaxDD > 15) recs.push(`Implementa regla de stop diario al 3-5% para controlar drawdown en días adversos.`);
    if (s.pctProfitable >= 70 && s.pctRuin < 5) recs.push(`Sistema viable para funded account. Valida con datos históricos reales adicionales.`);
    if (s.medianConsecLoss >= 6) recs.push(`Prepara protocolo: si llegas a ${Math.round(s.medianConsecLoss*0.7)} pérdidas seguidas, descansa 1 día.`);
    recs.push(`El IC del 95% de expectancy es [$${s.ciExpLow.toFixed(0)}, $${s.ciExpHigh.toFixed(0)}]/trade — trabaja en reducir este rango aumentando la muestra.`);
  }

  const score =
    (s.expectancyPerTrade > 0 ? 25 : 0) +
    (s.pctProfitable >= 65 ? 20 : s.pctProfitable >= 50 ? 10 : 0) +
    (s.pctRuin < 5 ? 20 : s.pctRuin < 15 ? 10 : 0) +
    (s.sharpeRatio > 1 ? 20 : s.sharpeRatio > 0.5 ? 10 : 0) +
    (s.medianMaxDD < 15 ? 15 : s.medianMaxDD < 25 ? 7 : 0);

  const grade =
    score >= 85 ? "A+" : score >= 70 ? "A" : score >= 55 ? "B" :
    score >= 40 ? "C"  : "D";
  const gradeColor =
    grade === "A+" || grade === "A" ? "text-green-primary" :
    grade === "B"  ? "text-blue-accent" :
    grade === "C"  ? "text-yellow-warn" : "text-red-loss";

  return { pros, cons, recs, grade, gradeColor, score };
}

/* ══════════════════════════════════════════════════════════
   SVG COMPONENTS
══════════════════════════════════════════════════════════ */
function FanChart({ bands, startBalance, numTrades }: {
  bands: number[][]; startBalance: number; numTrades: number;
}) {
  const W = 560, H = 200;
  if (!bands.length) return null;
  const allV = bands.flat().filter(isFinite);
  const minV = Math.min(...allV, startBalance * 0.5);
  const maxV = Math.max(...allV, startBalance * 1.1);
  const range = maxV - minV || 1;
  const N = bands.length;
  const px = (i: number) => (i / (N - 1)) * W;
  const py = (v: number) => H - ((v - minV) / range) * (H - 10);

  const path = (pi: number) =>
    bands.map((b, i) => `${i === 0 ? "M" : "L"}${px(i).toFixed(1)},${py(b[pi]).toFixed(1)}`).join(" ");

  const revPath = (pi: number) =>
    [...bands].reverse().map((b, i, a) =>
      `L${px(N - 1 - i).toFixed(1)},${py(b[pi]).toFixed(1)}`
    ).join(" ");

  const area = (loPI: number, hiPI: number) =>
    path(loPI) + " " + revPath(hiPI) + " Z";

  const gridLevels = [0.2, 0.4, 0.6, 0.8].map(t => ({
    y: H * t, val: minV + range * (1 - t),
  }));

  return (
    <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full" style={{ height: 220 }} preserveAspectRatio="none">
      {gridLevels.map((g, i) => (
        <g key={i}>
          <line x1="0" y1={g.y} x2={W} y2={g.y} stroke="#19374D" strokeWidth="0.6" strokeDasharray="5 3" />
          <text x="3" y={g.y - 3} fontSize="7" fill="#4A7A99">${Math.round(g.val).toLocaleString()}</text>
        </g>
      ))}
      {/* Starting balance */}
      <line x1="0" y1={py(startBalance)} x2={W} y2={py(startBalance)} stroke="#F59E0B" strokeWidth="0.8" strokeDasharray="8 4" opacity="0.7" />
      <text x={W - 55} y={py(startBalance) - 3} fontSize="7" fill="#F59E0B">Inicial</text>
      {/* Shaded bands */}
      <path d={area(0, 4)} fill="#20E58D" opacity="0.06" />
      <path d={area(1, 3)} fill="#20E58D" opacity="0.14" />
      {/* Lines */}
      {[
        { pi:0, color:"#EF4444", w:1, dash:"4 3" },
        { pi:1, color:"#F59E0B", w:1, dash:"" },
        { pi:2, color:"#20E58D", w:2, dash:"" },
        { pi:3, color:"#F59E0B", w:1, dash:"" },
        { pi:4, color:"#3B82F6", w:1, dash:"4 3" },
      ].map(({ pi, color, w, dash }) => (
        <path key={pi} d={path(pi)} stroke={color} strokeWidth={w} fill="none" strokeDasharray={dash || undefined} strokeLinejoin="round" opacity="0.85" />
      ))}
      {/* X axis labels */}
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
        <text key={i} x={px(Math.round(t * (N - 1))).toFixed(0)} y={H + 15} fontSize="7" fill="#4A7A99" textAnchor="middle">
          T{Math.round(t * numTrades)}
        </text>
      ))}
    </svg>
  );
}

function HistChart({ histogram, startBalance }: {
  histogram: { low: number; high: number; count: number; pct: number }[];
  startBalance: number;
}) {
  const maxPct = Math.max(...histogram.map(b => b.pct), 0.1);
  return (
    <div className="flex items-end gap-0.5 h-28">
      {histogram.map((bin, i) => {
        const isPos = bin.high > startBalance;
        const h = Math.max((bin.pct / maxPct) * 100, bin.count > 0 ? 3 : 0);
        return (
          <div key={i} className="flex flex-col items-center flex-1"
            title={`$${Math.round(bin.low).toLocaleString()}–$${Math.round(bin.high).toLocaleString()}: ${bin.pct.toFixed(1)}%`}>
            {bin.count > 0 && bin.pct >= 4 && (
              <span className={`text-[7px] font-bold ${isPos ? "text-green-primary" : "text-red-loss"}`}>
                {bin.pct.toFixed(0)}%
              </span>
            )}
            <div className={`w-full rounded-t ${isPos ? "bg-green-primary/70" : "bg-red-loss/60"}`} style={{ height: `${h}px` }} />
          </div>
        );
      })}
    </div>
  );
}

function Donut({ pct, label, color }: { pct: number; label: string; color: string }) {
  const r = 34, cx = 42, cy = 42, circ = 2 * Math.PI * r;
  return (
    <svg width="84" height="84" viewBox="0 0 84 84">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#19374D" strokeWidth="9" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="9"
        strokeDasharray={`${Math.min(pct / 100 * circ, circ)} ${circ}`}
        strokeDashoffset={circ / 4} strokeLinecap="round" />
      <text x={cx} y={cy - 3}  textAnchor="middle" fontSize="11" fontWeight="bold" fill="white">{pct.toFixed(1)}%</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="7" fill="#7BA3BE">{label}</text>
    </svg>
  );
}

function Gauge({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-[10px] text-text-muted">{label}</span>
        <span className="text-[11px] font-bold" style={{ color }}>{value.toFixed(2)}</span>
      </div>
      <div className="h-2 rounded-full bg-border-card overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color, transition: "width .6s ease" }} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════ */
type Mode = "journal" | "manual";

export default function SimulatorPage() {
  const language = useSettingsStore(s => s.language);
  const [mode, setMode]           = useState<Mode>("journal");
  const [balance, setBalance]     = useState("10000");
  const [winRate, setWinRate]     = useState("60");
  const [avgWin,  setAvgWin]      = useState("150");
  const [avgLoss, setAvgLoss]     = useState("75");
  const [varPct,  setVarPct]      = useState("40");
  const [comm,    setComm]        = useState("0.18");
  const [nTrades, setNTrades]     = useState("100");
  const [nSims,   setNSims]       = useState("1000");
  const [stats,   setStats]       = useState<SimStats | null>(null);
  const [running, setRunning]     = useState(false);
  const [showReport, setShowReport] = useState(true);

  /* ── Journal mode: compute stats from DEMO_TRADES ── */
  const trades = useTradeStore(s => s.trades); const closed = trades.filter(t => t.result !== "Open"); const journalStats = useMemo(() => computeStats(closed), [closed]);
  const journalN = closed.length;

  // Effective params (journal or manual)
  const B  = parseFloat(balance) || 10000;
  const WR = mode === "journal"
    ? parseFloat(journalStats.winRate.toFixed(1))
    : (parseFloat(winRate) || 60);
  const AW = mode === "journal"
    ? parseFloat(Math.abs(journalStats.avgWin).toFixed(2))
    : (parseFloat(avgWin) || 150);
  const AL = mode === "journal"
    ? parseFloat(Math.abs(journalStats.avgLoss).toFixed(2))
    : (parseFloat(avgLoss) || 75);
  const VA = parseFloat(varPct)  || 40;
  const CM = mode === "journal"
    ? parseFloat((journalStats.totalCommissions / Math.max(journalStats.totalTrades, 1)).toFixed(3))
    : (parseFloat(comm) || 0);
  const NT = Math.min(parseInt(nTrades) || 100, 500);
  const NS = Math.min(parseInt(nSims)   || 1000, 5000);
  const SN = mode === "journal" ? journalN : 50; // sample N for error bounds

  const liveExp = (WR / 100) * (AW - CM) - (1 - WR / 100) * (AL + CM);
  const liveRR  = AL > 0 ? (AW / AL).toFixed(2) : "—";

  const run = () => {
    setRunning(true);
    setTimeout(() => {
      setStats(runMonteCarlo(B, WR, AW, AL, VA, NT, NS, CM, SN));
      setRunning(false);
    }, 20);
  };

  const report = useMemo(() =>
    stats ? generateReport(stats, WR, NT, CM, AW, AL, VA, language) : null,
    [stats, language]
  );

  const adequacyLabel: Record<SimStats["sampleAdequacy"], { label: string; color: string }> = {
    poor:       { label:"Insuficiente (<20 trades)",  color:"text-red-loss" },
    minimal:    { label:"Mínima (20-29 trades)",       color:"text-red-loss" },
    acceptable: { label:"Aceptable (30-49 trades)",    color:"text-yellow-warn" },
    good:       { label:"Buena (50-99 trades)",        color:"text-blue-accent" },
    excellent:  { label:"Excelente (100+ trades)",     color:"text-green-primary" },
  };

  return (
    <AppShell title="Simulador Monte Carlo" subtitle="Proyección estadística avanzada con tolerancia de error">
      <div className="flex flex-col gap-5 w-full max-w-[1800px] mx-auto">

        {/* ── MODE TOGGLE ── */}
        <div className="flex items-center gap-3 rounded-card border border-border-card bg-bg-card p-1.5 w-fit">
          {([
            { m:"journal" as Mode, icon:BookOpen,  label:"Modo Journal", sub:"Usa mis 105 trades reales" },
            { m:"manual"  as Mode, icon:Pencil,    label:"Modo Manual",  sub:"Ingresar parámetros" },
          ] as const).map(({ m, icon:Icon, label, sub }) => (
            <button key={m} onClick={() => { setMode(m); setStats(null); }}
              className={`flex items-center gap-2.5 rounded-xl px-5 py-2.5 transition-all ${
                mode === m
                  ? "bg-green-primary/15 border border-green-primary/30 text-green-primary"
                  : "text-text-muted hover:text-text-secondary"
              }`}>
              <Icon className="h-4 w-4" />
              <div className="text-left">
                <p className={`text-[12px] font-bold ${mode === m ? "text-green-primary" : ""}`}>{label}</p>
                <p className="text-[9px] opacity-70">{sub}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

          {/* ── PARAMS PANEL ── */}
          <div className="flex flex-col gap-4 xl:col-span-3 2xl:col-span-3">

            {/* Journal mode: stats preview */}
            {mode === "journal" && (
              <div className="rounded-card border border-green-primary/25 bg-green-primary/5 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="h-4 w-4 text-green-primary" />
                  <p className="text-[12px] font-bold text-green-primary">Datos del Journal — {journalN} trades</p>
                </div>
                <div className="flex flex-col gap-2 text-[11px]">
                  {[
                    { label:"Win Rate",          value:`${journalStats.winRate}%`,                       color: journalStats.winRate >= 50 ? "text-green-primary":"text-red-loss" },
                    { label:"Avg. Win",           value:`+$${Math.abs(journalStats.avgWin).toFixed(2)}`,  color:"text-green-primary" },
                    { label:"Avg. Loss",          value:`$${Math.abs(journalStats.avgLoss).toFixed(2)}`,  color:"text-red-loss" },
                    { label:"Profit Factor",      value:journalStats.profitFactor.toFixed(2),             color: journalStats.profitFactor >= 1.5 ? "text-green-primary":"text-yellow-warn" },
                    { label:"Expectancy/trade",   value:`${journalStats.expectancy >= 0?"+":""}$${journalStats.expectancy.toFixed(2)}`, color: journalStats.expectancy >= 0 ? "text-green-primary":"text-red-loss" },
                    { label:"Max Drawdown",       value:`$${journalStats.maxDrawdown.toFixed(2)}`,        color:"text-red-loss" },
                    { label:"Plan follow rate",   value:`${journalStats.planFollowRate}%`,                color:"text-blue-accent" },
                    { label:"Avg hold time",      value:`${journalStats.avgHoldTime} min`,                color:"text-text-secondary" },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between border-b border-border-card/30 pb-1.5">
                      <span className="text-text-muted">{r.label}</span>
                      <span className={`font-bold ${r.color}`}>{r.value}</span>
                    </div>
                  ))}
                </div>
                <div className={`mt-3 rounded-lg px-3 py-2 text-[10px] ${
                  stats?.sampleAdequacy === "excellent" || stats?.sampleAdequacy === "good"
                    ? "bg-green-primary/10 text-green-primary"
                    : "bg-yellow-warn/10 text-yellow-warn"
                }`}>
                  Adecuación estadística: <strong>{adequacyLabel[stats?.sampleAdequacy ?? "excellent"].label}</strong>
                </div>
              </div>
            )}

            {/* Manual mode: fields */}
            {mode === "manual" && (
              <div className="rounded-card border border-border-card bg-bg-card p-5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-3">Parámetros Manuales</p>
                <div className="flex flex-col gap-3">
                  {[
                    { label:"Win Rate (%)",           value:winRate,  set:setWinRate,  unit:"%",     hint:"% trades ganadores" },
                    { label:"Avg. Win ($)",           value:avgWin,   set:setAvgWin,   unit:"$",     hint:"Ganancia promedio" },
                    { label:"Avg. Loss ($)",          value:avgLoss,  set:setAvgLoss,  unit:"$",     hint:"Pérdida promedio" },
                    { label:"Comisión/trade ($)",     value:comm,     set:setComm,     unit:"$",     hint:"Round-trip total" },
                  ].map(f => (
                    <div key={f.label}>
                      <label className="text-[10px] text-text-secondary font-medium block mb-1">{f.label} <span className="text-text-muted">— {f.hint}</span></label>
                      <div className="relative">
                        <input type="number" value={f.value}
                          onChange={e => { f.set(e.target.value); setStats(null); }}
                          className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2 text-[13px] text-text-primary tabular-nums focus:outline-none focus:border-green-primary transition-colors pr-10"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-text-muted">{f.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Common params */}
            <div className="rounded-card border border-border-card bg-bg-card p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-3">Parámetros de Simulación</p>
              <div className="flex flex-col gap-3">
                {[
                  { label:"Balance Inicial ($)",  value:balance,  set:setBalance,  unit:"$",   hint:"" },
                  { label:"Variabilidad (%)",     value:varPct,   set:setVarPct,   unit:"%",   hint:"0=constante · 80=volátil" },
                  { label:"Trades a proyectar",   value:nTrades,  set:setNTrades,  unit:"T",   hint:"máx 500" },
                  { label:"Nº Simulaciones",      value:nSims,    set:setNSims,    unit:"sim", hint:"máx 5,000" },
                ].map(f => (
                  <div key={f.label}>
                    <label className="text-[10px] text-text-secondary font-medium block mb-1">{f.label} {f.hint && <span className="text-text-muted">— {f.hint}</span>}</label>
                    <div className="relative">
                      <input type="number" value={f.value}
                        onChange={e => { f.set(e.target.value); setStats(null); }}
                        className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2 text-[13px] text-text-primary tabular-nums focus:outline-none focus:border-green-primary transition-colors pr-10"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-text-muted">{f.unit}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Live preview */}
              <div className="mt-4 rounded-xl bg-bg-section border border-border-card/60 p-3 text-[11px] flex flex-col gap-1.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted mb-1">Vista Previa</p>
                {[
                  { label:"WR efectivo",       value:`${WR}%` },
                  { label:"Expectancy/trade",  value:`${liveExp >= 0?"+":""}$${liveExp.toFixed(2)}`, color: liveExp >= 0 ? "text-green-primary":"text-red-loss" },
                  { label:"R:R efectivo",      value:`1:${liveRR}`, color:"text-blue-accent" },
                  { label:"Ganancia esperada", value:`${liveExp >= 0?"+":""}$${(liveExp * NT).toFixed(0)} en ${NT}T`, color: liveExp >= 0 ? "text-green-primary":"text-red-loss" },
                ].map(r => (
                  <div key={r.label} className="flex justify-between">
                    <span className="text-text-muted">{r.label}</span>
                    <span className={`font-bold ${r.color ?? "text-text-primary"}`}>{r.value}</span>
                  </div>
                ))}
              </div>

              {liveExp < 0 && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-loss/30 bg-red-loss/10 p-3 text-[11px] text-red-loss">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>Expectancy negativa — esta estrategia pierde dinero a largo plazo.</span>
                </div>
              )}

              <button onClick={run} disabled={running}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-btn bg-green-primary py-3 text-[13px] font-bold text-bg-main shadow-green-glow hover:bg-green-primary/90 transition-all disabled:opacity-60">
                {running ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {running ? `Ejecutando ${NS.toLocaleString()} simulaciones...` : `Simular ${NS.toLocaleString()} caminos`}
              </button>
            </div>
          </div>

          {/* RESULTS */}
          <div className="flex flex-col gap-5 xl:col-span-9 2xl:col-span-9">
          {!stats ? (
            <div className="rounded-card border border-dashed border-border-card bg-bg-card flex flex-col items-center justify-center gap-4 py-20">
              <BarChart2 className="h-12 w-12 text-text-muted" />
              <p className="text-[14px] font-semibold text-text-secondary">
                {mode === "journal"
                  ? "Listo — datos del journal cargados. Presiona Simular."
                  : "Configura parámetros y presiona Simular."}
              </p>
              <p className="text-[11px] text-text-muted text-center max-w-xs">
                Motor: Distribución Normal (Box-Muller) · Percentiles P5–P95 · Intervalos de confianza 95%
              </p>
            </div>
          ) : (
            /* KPI grid */
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 content-start">
              {[
                { label:"Simulaciones rentables", value:`${stats.pctProfitable.toFixed(1)}%`,   sub:`${Math.round(stats.pctProfitable/100*NS).toLocaleString()} de ${NS.toLocaleString()}`, color: stats.pctProfitable >= 60 ? "text-green-primary":"text-red-loss" },
                { label:"Balance mediano final",   value:`$${Math.round(stats.medianFinal).toLocaleString()}`, sub:`${stats.medianFinal>=B?"+":""}${(((stats.medianFinal-B)/B)*100).toFixed(1)}%`, color: stats.medianFinal>=B?"text-green-primary":"text-red-loss" },
                { label:"Prob. de ruina",          value:`${stats.pctRuin.toFixed(2)}%`,         sub:"Cuenta a $0",       color: stats.pctRuin < 5 ? "text-green-primary": stats.pctRuin < 15 ? "text-yellow-warn":"text-red-loss" },
                { label:"Max DD mediano",          value:`${stats.medianMaxDD.toFixed(1)}%`,     sub:`Peor caso: ${stats.worstMaxDDPct.toFixed(1)}%`, color: stats.medianMaxDD < 15 ? "text-green-primary":stats.medianMaxDD < 25 ? "text-yellow-warn":"text-red-loss" },
                { label:"Balance P5 (peor 5%)",   value:`$${Math.round(stats.p5Final).toLocaleString()}`,   sub:"Escenario adverso",   color:"text-red-loss" },
                { label:"Balance P95 (mejor 5%)", value:`$${Math.round(stats.p95Final).toLocaleString()}`,  sub:"Escenario favorable", color:"text-blue-accent" },
                { label:"Sharpe Ratio",            value:stats.sharpeRatio.toFixed(2),           sub: stats.sharpeRatio > 1 ? "> 1 ✓ viable":"< 1 ✗ bajo", color: stats.sharpeRatio > 1.5 ? "text-green-primary":stats.sharpeRatio > 1 ? "text-blue-accent":"text-yellow-warn" },
                { label:"Racha pérd. mediana",     value:`${stats.medianConsecLoss} T`,          sub:"Pérdidas consecutivas", color: stats.medianConsecLoss <= 4 ? "text-green-primary":"text-yellow-warn" },
              ].map(k => (
                <div key={k.label} className="rounded-card border border-border-card bg-bg-card p-3">
                  <p className="text-[9px] text-text-muted mb-1">{k.label}</p>
                  <p className={`text-[18px] font-extrabold tabular-nums ${k.color}`}>{k.value}</p>
                  <p className="text-[9px] text-text-muted mt-0.5">{k.sub}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

        {stats && (
          <>
            {/* FAN CHART */}
            <div className="rounded-card border border-border-card bg-bg-card p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-text-primary">Curva de Equity — {NS.toLocaleString()} Simulaciones · {NT} Trades</p>
                  <p className="text-[11px] text-text-muted">
                    {mode === "journal"
                      ? `Proyección basada en ${journalN} trades reales del journal`
                      : "Parámetros ingresados manualmente"}
                  </p>
                </div>
                <button onClick={run} className="flex items-center gap-1.5 text-[11px] text-text-muted hover:text-green-primary transition-colors">
                  <RefreshCw className="h-3 w-3" /> Re-simular
                </button>
              </div>
              <FanChart bands={stats.fanBands} startBalance={B} numTrades={NT} />
              <div className="flex flex-wrap gap-4 mt-2 text-[10px]">
                {[
                  { color:"#3B82F6", label:"P95 — Mejor 5%", dash:true },
                  { color:"#F59E0B", label:"P75 — Cuartil superior" },
                  { color:"#20E58D", label:"P50 — Mediana (escenario típico)", bold:true },
                  { color:"#F59E0B", label:"P25 — Cuartil inferior" },
                  { color:"#EF4444", label:"P5 — Peor 5%",   dash:true },
                ].map(l => (
                  <span key={l.label} className="flex items-center gap-1.5 text-text-muted">
                    <span className="h-0.5 w-6 rounded-full"
                      style={l.dash ? { borderTop:`2px dashed ${l.color}`, backgroundColor:"transparent" } : { backgroundColor: l.color }} />
                    <span className={l.bold ? "font-semibold text-text-secondary" : ""}>{l.label}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* CHARTS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Histogram */}
              <div className="rounded-card border border-border-card bg-bg-card p-5">
                <p className="text-[12px] font-semibold text-text-primary mb-1">Distribución de Resultados Finales</p>
                <p className="text-[10px] text-text-muted mb-4">Histograma de {NS.toLocaleString()} balances finales</p>
                <HistChart histogram={stats.histogram} startBalance={B} />
                <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                  {[
                    { label:"Media",    value:`$${Math.round(stats.meanFinal).toLocaleString()}`,   color:"text-text-primary" },
                    { label:"Mediana",  value:`$${Math.round(stats.medianFinal).toLocaleString()}`, color:"text-text-primary" },
                    { label:"Desv. σ",  value:`±$${Math.round(stats.stdFinal).toLocaleString()}`,  color:"text-yellow-warn" },
                    { label:"P5–P95",   value:`$${Math.round(stats.p95Final-stats.p5Final).toLocaleString()} rango`, color:"text-blue-accent" },
                  ].map(r => (
                    <div key={r.label}><span className="text-text-muted">{r.label}: </span><strong className={r.color}>{r.value}</strong></div>
                  ))}
                </div>
              </div>

              {/* Donuts */}
              <div className="rounded-card border border-border-card bg-bg-card p-5">
                <p className="text-[12px] font-semibold text-text-primary mb-1">Probabilidades de Resultado</p>
                <p className="text-[10px] text-text-muted mb-4">Distribución de los {NS.toLocaleString()} caminos simulados</p>
                <div className="flex justify-around items-center">
                  <div className="flex flex-col items-center gap-1">
                    <Donut pct={stats.pctProfitable} label="Rentable" color="#20E58D" />
                    <p className="text-[9px] text-text-muted text-center">Balance final &gt; inicial</p>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Donut pct={stats.pctRuin} label="Ruina" color="#EF4444" />
                    <p className="text-[9px] text-text-muted text-center">Pierde todo el capital</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border-card/40 text-[10px]">
                  <div className="flex justify-between mb-1">
                    <span className="text-text-muted">Con pérdida (sin ruina)</span>
                    <span className="font-bold text-yellow-warn">
                      {Math.max(0, 100 - stats.pctProfitable - stats.pctRuin).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Margen de error (P25–P75)</span>
                    <span className="font-bold text-text-secondary">±{stats.marginOfError.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Risk Gauges */}
              <div className="rounded-card border border-border-card bg-bg-card p-5">
                <p className="text-[12px] font-semibold text-text-primary mb-1">Indicadores de Riesgo</p>
                <p className="text-[10px] text-text-muted mb-4">Calidad del sistema de trading</p>
                <div className="flex flex-col gap-3.5">
                  <Gauge value={stats.sharpeRatio} max={3} label="Sharpe Ratio (objetivo >1)" color={stats.sharpeRatio > 1.5 ? "#20E58D" : stats.sharpeRatio > 0.8 ? "#F59E0B" : "#EF4444"} />
                  <Gauge value={stats.medianMaxDD} max={50} label="Max DD mediano % (menor=mejor)" color={stats.medianMaxDD < 10 ? "#20E58D" : stats.medianMaxDD < 20 ? "#F59E0B" : "#EF4444"} />
                  <Gauge value={stats.p95MaxDD} max={80} label="Max DD peor 5% (P95)" color={stats.p95MaxDD < 20 ? "#20E58D" : stats.p95MaxDD < 35 ? "#F59E0B" : "#EF4444"} />
                  <Gauge value={stats.pctRuin} max={30} label="Prob. ruina % (menor=mejor)" color={stats.pctRuin < 5 ? "#20E58D" : stats.pctRuin < 15 ? "#F59E0B" : "#EF4444"} />
                  <Gauge value={stats.medianConsecLoss} max={15} label="Racha pérd. mediana (menor=mejor)" color={stats.medianConsecLoss < 4 ? "#20E58D" : stats.medianConsecLoss < 7 ? "#F59E0B" : "#EF4444"} />
                </div>
              </div>
            </div>

            {/* ── ERROR TOLERANCE & CONFIDENCE PANEL ── */}
            <div className="rounded-card border border-blue-accent/20 bg-bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border-card/60 bg-blue-accent/5">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-accent" />
                  <p className="text-sm font-bold text-text-primary">Análisis de Tolerancia de Error Estadístico</p>
                </div>
                <p className="text-[11px] text-text-muted mt-1">
                  Basado en {mode === "journal" ? `${journalN} trades reales` : "parámetros manuales"} · Intervalo de confianza del 95% (z = 1.96)
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border-card/30">
                {/* Adequacy */}
                <div className="p-5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-3">Adecuación de Muestra</p>
                  <div className="flex flex-col gap-2">
                    {([
                      { level:"poor",       label:"<20 trades",    n:0 },
                      { level:"minimal",    label:"20-29 trades",  n:20 },
                      { level:"acceptable", label:"30-49 trades",  n:30 },
                      { level:"good",       label:"50-99 trades",  n:50 },
                      { level:"excellent",  label:"100+ trades",   n:100 },
                    ] as const).map(({ level, label, n }) => {
                      const isCurrent = stats.sampleAdequacy === level;
                      const passed = (mode === "journal" ? journalN : 50) >= n;
                      const color = level === "excellent" || level === "good" ? "text-green-primary" :
                                    level === "acceptable" ? "text-blue-accent" : "text-yellow-warn";
                      return (
                        <div key={level} className={`flex items-center gap-2 text-[10px] rounded px-2 py-1 ${isCurrent ? "bg-white/5 border border-border-card" : ""}`}>
                          {passed
                            ? <CheckCircle className={`h-3 w-3 ${color} flex-shrink-0`} />
                            : <div className="h-3 w-3 rounded-full border border-border-card flex-shrink-0" />}
                          <span className={isCurrent ? `font-bold ${color}` : "text-text-muted"}>{label}</span>
                          {isCurrent && <span className="ml-auto text-[8px] text-text-muted">← actual</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Win Rate CI */}
                <div className="p-5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-3">IC Win Rate (95%)</p>
                  <div className="flex flex-col gap-2.5">
                    <div>
                      <p className="text-[10px] text-text-muted">Win Rate observado</p>
                      <p className="text-[22px] font-extrabold text-text-primary tabular-nums">{WR.toFixed(1)}%</p>
                    </div>
                    <div className="rounded-xl bg-bg-section border border-border-card px-3 py-2">
                      <p className="text-[9px] text-text-muted mb-1">Intervalo 95% verdadero WR:</p>
                      <p className="text-[13px] font-bold text-blue-accent tabular-nums">
                        [{stats.ciWinRateLow.toFixed(1)}% — {stats.ciWinRateHigh.toFixed(1)}%]
                      </p>
                      <p className="text-[9px] text-text-muted mt-1">
                        Error estándar: ±{stats.seWinRate.toFixed(2)}%
                      </p>
                    </div>
                    <p className="text-[9px] text-text-muted leading-relaxed">
                      Con {mode === "journal" ? journalN : 50} trades, el win rate REAL del sistema está en ese rango con 95% de confianza.
                    </p>
                  </div>
                </div>

                {/* Expectancy CI */}
                <div className="p-5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-3">IC Expectancy (95%)</p>
                  <div className="flex flex-col gap-2.5">
                    <div>
                      <p className="text-[10px] text-text-muted">Expectancy estimada</p>
                      <p className={`text-[22px] font-extrabold tabular-nums ${liveExp >= 0 ? "text-green-primary" : "text-red-loss"}`}>
                        {liveExp >= 0 ? "+" : ""}${liveExp.toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-bg-section border border-border-card px-3 py-2">
                      <p className="text-[9px] text-text-muted mb-1">Intervalo 95% por trade:</p>
                      <p className={`text-[13px] font-bold tabular-nums ${stats.ciExpLow < 0 ? "text-yellow-warn" : "text-green-primary"}`}>
                        [${stats.ciExpLow.toFixed(2)} — ${stats.ciExpHigh.toFixed(2)}]
                      </p>
                      <p className="text-[9px] text-text-muted mt-1">
                        Error estándar: ±${stats.seExpectancy.toFixed(2)}/trade
                      </p>
                    </div>
                    {stats.ciExpLow < 0 && (
                      <div className="flex items-center gap-1.5 text-[9px] text-yellow-warn">
                        <AlertTriangle className="h-3 w-3" />
                        IC cruza cero — no se puede confirmar ventaja estadística con esta muestra.
                      </div>
                    )}
                  </div>
                </div>

                {/* Final balance CI */}
                <div className="p-5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-3">IC Balance Final (95%)</p>
                  <div className="flex flex-col gap-2.5">
                    <div>
                      <p className="text-[10px] text-text-muted">Mediana de {NS.toLocaleString()} sims</p>
                      <p className={`text-[22px] font-extrabold tabular-nums ${stats.medianFinal >= B ? "text-green-primary" : "text-red-loss"}`}>
                        ${Math.round(stats.medianFinal).toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-xl bg-bg-section border border-border-card px-3 py-2">
                      <p className="text-[9px] text-text-muted mb-1">Rango esperado (P25–P75):</p>
                      <p className="text-[13px] font-bold text-blue-accent tabular-nums">
                        [${Math.round(stats.p25Final).toLocaleString()} — ${Math.round(stats.p75Final).toLocaleString()}]
                      </p>
                      <p className="text-[9px] text-text-muted mt-1">
                        Margen de error: ±{stats.marginOfError.toFixed(1)}% del balance final
                      </p>
                    </div>
                    <p className="text-[9px] text-text-muted leading-relaxed">
                      El 50% central de los {NS.toLocaleString()} caminos termina en ese rango.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* PERCENTILE TABLE */}
            <div className="rounded-card border border-border-card bg-bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border-card/60">
                <p className="text-sm font-semibold text-text-primary">Tabla de Percentiles — Balance Final tras {NT} Trades</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-border-card/40">
                      {["Percentil","Balance Final","P&L ($)","P&L (%)","Probabilidad de alcanzarlo","Interpretación"].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wide text-text-muted font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-card/20">
                    {[
                      { p:"P5  — Peor 5%",    v:stats.p5Final,    pOccurrence:"5% de los caminos termina aquí o peor",  interp:"Escenario muy adverso",  color:"text-red-loss" },
                      { p:"P25 — Cuartil inf",v:stats.p25Final,   pOccurrence:"25% de los caminos termina aquí o peor", interp:"Escenario desfavorable", color:"text-yellow-warn" },
                      { p:"P50 — Mediana",    v:stats.medianFinal,pOccurrence:"50% de los caminos termina aquí o peor", interp:"Resultado más probable",  color:"text-text-primary" },
                      { p:"P75 — Cuartil sup",v:stats.p75Final,   pOccurrence:"75% de los caminos termina aquí o peor", interp:"Escenario favorable",     color:"text-blue-accent" },
                      { p:"P95 — Mejor 5%",   v:stats.p95Final,   pOccurrence:"Solo 5% de los caminos supera esto",     interp:"Escenario muy favorable", color:"text-green-primary" },
                    ].map(r => {
                      const pnl = r.v - B;
                      return (
                        <tr key={r.p} className="hover:bg-white/[0.02]">
                          <td className={`px-4 py-3 font-bold ${r.color}`}>{r.p}</td>
                          <td className={`px-4 py-3 tabular-nums font-bold ${r.color}`}>${Math.round(r.v).toLocaleString()}</td>
                          <td className={`px-4 py-3 tabular-nums ${pnl >= 0 ? "text-green-primary" : "text-red-loss"}`}>{pnl >= 0?"+":""}${Math.round(pnl).toLocaleString()}</td>
                          <td className={`px-4 py-3 tabular-nums ${pnl >= 0 ? "text-green-primary" : "text-red-loss"}`}>{pnl >= 0?"+":""}{((pnl/B)*100).toFixed(1)}%</td>
                          <td className="px-4 py-3 text-text-muted text-[10px]">{r.pOccurrence}</td>
                          <td className="px-4 py-3 text-text-muted text-[10px]">{r.interp}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TECHNICAL REPORT */}
            {report && (
              <div className="rounded-card border border-border-card bg-bg-card overflow-hidden">
                <button
                  onClick={() => setShowReport(r => !r)}
                  className="w-full flex items-center justify-between px-5 py-4 border-b border-border-card/60 bg-bg-section/20 hover:bg-bg-section/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`text-[26px] font-extrabold ${report.gradeColor}`}>{report.grade}</div>
                    <div>
                      <p className="text-sm font-bold text-text-primary text-left">📋 Informe Técnico del Sistema</p>
                      <p className="text-[11px] text-text-muted">{NS.toLocaleString()} simulaciones · muestra {mode === "journal" ? journalN : 50} trades · {report.score}/100 pts</p>
                    </div>
                  </div>
                  {showReport ? <ChevronUp className="h-4 w-4 text-text-muted" /> : <ChevronDown className="h-4 w-4 text-text-muted" />}
                </button>

                {showReport && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-border-card/30">
                    {[
                      { icon:CheckCircle, color:"text-green-primary", title:`VENTAJAS (${report.pros.length})`, items:report.pros, bullet:"✓", bColor:"text-green-primary" },
                      { icon:AlertTriangle, color:"text-red-loss", title:`RIESGOS (${report.cons.length})`, items:report.cons, bullet:"✗", bColor:"text-red-loss" },
                      { icon:Info, color:"text-blue-accent", title:`RECOMENDACIONES (${report.recs.length})`, items:report.recs.map((r, i) => `${i+1}. ${r}`), bullet:"", bColor:"text-blue-accent" },
                    ].map(col => (
                      <div key={col.title} className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <col.icon className={`h-4 w-4 ${col.color}`} />
                          <p className={`text-[11px] font-bold ${col.color}`}>{col.title}</p>
                        </div>
                        <ul className="flex flex-col gap-2.5">
                          {col.items.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-[11px] text-text-secondary leading-relaxed">
                              {col.bullet && <span className={`${col.bColor} mt-0.5 flex-shrink-0`}>{col.bullet}</span>}
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <p className="text-[10px] text-text-muted italic text-center pb-2">
              ⚠️ Simulación estocástica con distribución normal. Mercados reales tienen fat tails y autocorrelación. Resultados históricos no garantizan resultados futuros.
            </p>
          </>
        )}
      </div>
    </AppShell>
  );
}
