"use client";

import Decimal from "decimal.js";
import { formatProfitFactor, computeStats } from "@/lib/tradeTypes";
import { wilsonInterval, seededRandom } from "@/lib/ledger/metrics";
import { AppShell } from "@/components/AppShell";
import { useState, useMemo } from "react";
import { useSettingsStore } from "@/store/settingsStore";
import {
  Play, RefreshCw, BarChart2, AlertTriangle,
  CheckCircle, Info, BookOpen, Pencil, ChevronDown, ChevronUp,
} from "lucide-react";
import { useTradeStore } from "@/store/tradeStore";

/* ══════════════════════════════════════════════════════════
   STATISTICAL ENGINE — Monte Carlo Audit-Compliant (v3)
══════════════════════════════════════════════════════════ */

function randNormal(mean: number, std: number, rng: () => number): number {
  if (std <= 0) return mean;
  const u1 = rng() || 1e-10;
  const u2 = rng() || 1e-10;
  return mean + Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * std;
}

interface SimPath {
  finalBalance: number;
  finalPnlPct:  number;
  maxDrawdownPct: number;
  maxConsecLoss:  number;
  ruined:         boolean;
}

export interface SimStats {
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
  sharpeRatio:     number | null;
  horizonSharpe?:  number | null;
  fanBands:        number[][];   // [step][5 percentiles: p5,p25,p50,p75,p95]
  histogram:       { low: number; high: number; count: number; pct: number }[];
  expectancyPerTrade: number;
  rrRatio:         number;
  // Error analysis (only populated when sampleN > 0 from real historical sample)
  hasHistoricalSample: boolean;
  sampleN:         number | null;
  seWinRate:       number | null;
  ciWinRateLow:    number | null;
  ciWinRateHigh:   number | null;
  seExpectancy:    number | null;
  ciExpLow:        number | null;
  ciExpHigh:       number | null;
  sampleAdequacy:  "none" | "poor" | "minimal" | "acceptable" | "good" | "excellent";
  marginOfError:   number;   // % semi-interquartile range relative to median final balance (P25–P75)
}

function pctile(arr: number[], p: number): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(Math.floor(p * s.length), s.length - 1)];
}

export function runMonteCarlo(
  startBalance: number, winRate: number,
  avgWin: number, avgLoss: number,
  variability: number, numTrades: number,
  numSims: number, commission: number,
  sampleN: number | null = null, // real historical N for error bounds (null or 0 in manual mode)
  seed = 42,
  lossRatePct: number | null = null,
): SimStats {
  const rng = seededRandom(String(seed));
  const wr  = Math.min(1, Math.max(0, winRate / 100));
  const lr  = lossRatePct !== null
    ? Math.min(Math.max(0, 1 - wr), Math.max(0, lossRatePct / 100))
    : (1 - wr);
  const ber = Math.max(0, 1 - wr - lr);
  const varFactor = Math.max(0, variability) / 100;
  const sw  = avgWin  * varFactor;
  const sl  = avgLoss * varFactor;
  const expRaw = wr * (avgWin - commission) - lr * (avgLoss + commission) - ber * commission;
  const exp = new Decimal(Number.isFinite(expRaw) ? expRaw : 0).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();

  // Per-trade variance & std (without artificial 0.001 floor that fabricates giant Sharpe when variance = 0)
  const varPT = wr * Math.pow(avgWin - commission - expRaw, 2) +
                lr * Math.pow(-(avgLoss + commission) - expRaw, 2) +
                ber * Math.pow(-commission - expRaw, 2) +
                wr * sw * sw + lr * sl * sl;
  const stdPT = varPT > 1e-12 ? Math.sqrt(varPT) : 0;
  const sharpe = stdPT > 0 ? exp / stdPT : null;
  const horizonSharpe = stdPT > 0 ? (exp / stdPT) * Math.sqrt(numTrades) : null;

  // Error analysis ONLY when backed by a real historical sample (sampleN !== null && sampleN > 0)
  const hasHistoricalSample = sampleN !== null && sampleN > 0;
  let seWR: number | null = null;
  let ciWRL: number | null = null;
  let ciWRH: number | null = null;
  let seExp: number | null = null;
  let ciExpLow: number | null = null;
  let ciExpHigh: number | null = null;
  let adequacy: SimStats["sampleAdequacy"] = "none";

  if (hasHistoricalSample && sampleN) {
    seWR = Math.sqrt((wr * (1 - wr)) / sampleN) * 100;
    const winsEst = Math.round(wr * sampleN);
    const wilson = wilsonInterval(winsEst, sampleN);
    if (wilson) {
      ciWRL = Math.max(0, wilson.lower * 100);
      ciWRH = Math.min(100, wilson.upper * 100);
    } else {
      ciWRL = Math.max(0, wr * 100 - 1.96 * seWR);
      ciWRH = Math.min(100, wr * 100 + 1.96 * seWR);
    }
    seExp = sampleN >= 2 && stdPT > 0 ? stdPT / Math.sqrt(sampleN) : null;
    ciExpLow = seExp !== null ? exp - 1.96 * seExp : null;
    ciExpHigh = seExp !== null ? exp + 1.96 * seExp : null;
    adequacy =
      sampleN < 20  ? "poor" :
      sampleN < 30  ? "minimal" :
      sampleN < 50  ? "acceptable" :
      sampleN < 100 ? "good" : "excellent";
  }

  // Run paths
  const paths: SimPath[] = [];
  const fanMatrix: number[][] = Array.from({ length: numTrades + 1 }, () => []);

  for (let sim = 0; sim < numSims; sim++) {
    let bal = startBalance, peak = startBalance;
    let maxDD = 0, consec = 0, maxC = 0;
    let ruined = false;
    fanMatrix[0].push(startBalance);

    for (let t = 0; t < numTrades; t++) {
      const u = rng() * 100;
      const isWin = winRate >= 100 ? true : winRate <= 0 ? false : u < winRate;
      const isLoss = !isWin && (lossRatePct === null ? true : u < winRate + lr * 100);
      const winGross = sw > 0 ? Math.max(0, randNormal(avgWin, sw, rng)) : avgWin;
      const lossGross = sl > 0 ? Math.max(0, randNormal(avgLoss, sl, rng)) : avgLoss;
      const delta = isWin
        ? winGross - commission
        : isLoss
        ? -(lossGross + commission)
        : -commission;
      bal += delta;
      if (bal > peak) peak = bal;
      const dd = (peak > 0) ? ((peak - bal) / peak) * 100 : 0;
      if (dd > maxDD) maxDD = dd;
      if (isLoss) { consec++; if (consec > maxC) maxC = consec; } else consec = 0;
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
  const isConstant = Math.abs(fMax - fMin) < 1e-9;
  const binW = isConstant ? 1 : (fMax - fMin) / 14;
  const histogram = Array.from({ length: 14 }, (_, i) => {
    if (isConstant) {
      return {
        low: fMin,
        high: fMax,
        count: i === 0 ? numSims : 0,
        pct: i === 0 ? 100 : 0,
      };
    }
    const low = fMin + i * binW, high = fMin + (i + 1) * binW;
    const count = finals.filter(f => i === 13 ? (f >= low && f <= high) : (f >= low && f < high)).length;
    return { low, high, count, pct: (count / numSims) * 100 };
  });

  const medianFinal = pctile(finals, 0.50);
  const meanFinal = finals.reduce((a, b) => a + b, 0) / numSims;
  const rawVarFinal = finals.reduce((s, f) => s + Math.pow(f - meanFinal, 2), 0) / numSims;
  const stdFinal = isConstant || rawVarFinal < 1e-12 ? 0 : Math.sqrt(rawVarFinal);
  const marginOfError = medianFinal > 0
    ? (pctile(finals, 0.75) - pctile(finals, 0.25)) / 2 / medianFinal * 100 : 0;

  return {
    pctProfitable:   paths.filter(p => p.finalBalance > startBalance).length / numSims * 100,
    pctRuin:         paths.filter(p => p.ruined).length / numSims * 100,
    medianFinal,
    meanFinal,
    stdFinal,
    p5Final:         pctile(finals, 0.05),
    p25Final:        pctile(finals, 0.25),
    p75Final:        pctile(finals, 0.75),
    p95Final:        pctile(finals, 0.95),
    medianMaxDD:     pctile(ddPcts, 0.50),
    p95MaxDD:        pctile(ddPcts, 0.95),
    worstMaxDDPct:   Math.max(...ddPcts, 0),
    medianConsecLoss: pctile(streaks, 0.50),
    sharpeRatio:     sharpe,
    horizonSharpe,
    fanBands,
    histogram,
    expectancyPerTrade: exp,
    rrRatio: avgLoss > 0 ? avgWin / avgLoss : 0,
    hasHistoricalSample,
    sampleN: hasHistoricalSample ? sampleN : null,
    seWinRate: seWR,
    ciWinRateLow: ciWRL,
    ciWinRateHigh: ciWRH,
    seExpectancy: seExp,
    ciExpLow,
    ciExpHigh,
    sampleAdequacy: adequacy,
    marginOfError,
  };
}

/* ══════════════════════════════════════════════════════════
   REPORT GENERATOR (Neutral Descriptive / Inferential / Conditional — R2-05)
══════════════════════════════════════════════════════════ */
export function generateReport(
  s: SimStats, winRate: number, numTrades: number, commission: number,
  avgWin: number, avgLoss: number, variability: number, lang: string,
) {
  const pros: string[] = [], cons: string[] = [], recs: string[] = [];

  if (lang === "en") {
    if (s.expectancyPerTrade > 0) {
      pros.push(
        s.hasHistoricalSample
          ? `Observed descriptive expectancy: +$${s.expectancyPerTrade.toFixed(2)}/trade across n=${s.sampleN} closed trades.`
          : `Conditional parameter expectancy: +$${s.expectancyPerTrade.toFixed(2)}/trade under the entered assumptions (n=0 historical trades).`
      );
    } else {
      cons.push(`Expectancy is $${s.expectancyPerTrade.toFixed(2)}/trade under the current parameters.`);
    }

    if (s.rrRatio >= 2) pros.push(`Observed/input average win-to-loss ratio: 1:${s.rrRatio.toFixed(2)}.`);
    else if (s.rrRatio > 0 && s.rrRatio < 1) cons.push(`Win-to-loss ratio of 1:${s.rrRatio.toFixed(2)} requires Win Rate > ${Math.round(100 / (1 + s.rrRatio))}% before fees to break even.`);

    pros.push(`Conditional projection (${numTrades} trades): ${s.pctProfitable.toFixed(1)}% of simulated paths end above starting balance.`);
    if (s.pctRuin > 0) {
      cons.push(`Simulated ruin frequency (balance <= $0 within ${numTrades} trades): ${s.pctRuin.toFixed(1)}%.`);
    }
    if (s.medianMaxDD > 0) {
      cons.push(`Simulated median maximum drawdown: ${s.medianMaxDD.toFixed(1)}% (P95: ${s.p95MaxDD.toFixed(1)}%).`);
    }

    if (!s.hasHistoricalSample) {
      cons.push(`Manual simulation mode (n=0): outputs are conditional projections of your inputs, not empirical evidence.`);
      recs.push(`Use closed Journal trades to compute descriptive metrics and Wilson 95% intervals.`);
    } else {
      if (s.ciWinRateLow !== null && s.ciWinRateHigh !== null) {
        recs.push(`Wilson 95% Win Rate interval (n=${s.sampleN}, assuming i.i.d. Bernoulli trials): [${s.ciWinRateLow.toFixed(1)}%, ${s.ciWinRateHigh.toFixed(1)}%]. Real markets exhibit volatility clustering and serial dependence.`);
      }
      if (s.ciExpLow !== null && s.ciExpHigh !== null) {
        recs.push(`95% normal-approximation Expectancy interval (n=${s.sampleN}): [$${s.ciExpLow.toFixed(2)}, $${s.ciExpHigh.toFixed(2)}]/trade.`);
      } else {
        recs.push(`Sample size n=${s.sampleN}: expectancy dispersion requires at least 2 trades with non-zero variance.`);
      }
    }
  } else {
    if (s.expectancyPerTrade > 0) {
      pros.push(
        s.hasHistoricalSample
          ? `Métrica descriptiva observada: esperanza matemática de +$${s.expectancyPerTrade.toFixed(2)}/trade en n=${s.sampleN} operaciones cerradas.`
          : `Proyección condicional bajo supuestos: esperanza matemática de +$${s.expectancyPerTrade.toFixed(2)}/trade según los parámetros ingresados (n=0 operaciones históricas).`
      );
    } else {
      cons.push(`Esperanza matemática de $${s.expectancyPerTrade.toFixed(2)}/trade bajo estos parámetros.`);
    }

    if (s.rrRatio >= 2) pros.push(`Relación ganancia/pérdida media de 1:${s.rrRatio.toFixed(2)}.`);
    else if (s.rrRatio > 0 && s.rrRatio < 1) cons.push(`Relación ganancia/pérdida de 1:${s.rrRatio.toFixed(2)} requiere WR > ${Math.round(100 / (1 + s.rrRatio))}% antes de comisiones para cubrir pérdidas.`);

    pros.push(`Proyección condicional (${numTrades} operaciones): ${s.pctProfitable.toFixed(1)}% de las trayectorias simuladas finalizan sobre el balance inicial.`);
    if (s.pctRuin > 0) {
      cons.push(`Frecuencia de ruina simulada (balance <= $0 dentro del horizonte de ${numTrades} operaciones): ${s.pctRuin.toFixed(1)}%.`);
    }
    if (s.medianMaxDD > 0) {
      cons.push(`Drawdown máximo mediano simulado: ${s.medianMaxDD.toFixed(1)}% (P95: ${s.p95MaxDD.toFixed(1)}%).`);
    }

    if (!s.hasHistoricalSample) {
      cons.push(`Modo manual sin muestra histórica (n=0): los resultados son proyecciones condicionales de los supuestos introducidos.`);
      recs.push(`Vincule operaciones cerradas del Journal para calcular métricas descriptivas e intervalos de Wilson del 95%.`);
    } else {
      if (s.ciWinRateLow !== null && s.ciWinRateHigh !== null) {
        recs.push(`Intervalo de Wilson 95% para Win Rate (n=${s.sampleN}, bajo supuesto Bernoulli i.i.d. con z=1.96): [${s.ciWinRateLow.toFixed(1)}%, ${s.ciWinRateHigh.toFixed(1)}%]. En mercados reales existen rachas, colas pesadas y dependencia temporal.`);
      }
      if (s.ciExpLow !== null && s.ciExpHigh !== null) {
        recs.push(`Intervalo de esperanza matemática al 95% (n=${s.sampleN}): [$${s.ciExpLow.toFixed(2)}, $${s.ciExpHigh.toFixed(2)}]/trade.`);
      } else {
        recs.push(`Muestra n=${s.sampleN}: para estimar el error estándar de la esperanza se requieren al menos 2 operaciones con varianza positiva.`);
      }
    }
  }

  return {
    pros,
    cons,
    recs,
    grade: s.hasHistoricalSample ? `Proyección Condicional (n=${s.sampleN})` : "Proyección Condicional (Manual, n=0)",
    gradeColor: "text-blue-accent",
    score: null as number | null,
  };
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

function parseFinite(val: string, fallback: number): number {
  const trimmed = String(val ?? "").trim();
  if (trimmed === "") return fallback;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : fallback;
}

export function resolveSimParams(params: {
  mode: Mode;
  balance: string;
  winRate: string;
  avgWin: string;
  avgLoss: string;
  varPct: string;
  comm: string;
  nTrades: string;
  nSims: string;
  journalStats: ReturnType<typeof computeStats>;
  journalN: number;
}) {
  const { mode, balance, winRate, avgWin, avgLoss, varPct, comm, nTrades, nSims, journalStats, journalN } = params;
  const B  = Math.max(1, parseFinite(balance, 10000));
  const WR = mode === "journal"
    ? (journalStats.closedTrades > 0 && typeof journalStats.wins === "number"
        ? (journalStats.wins / journalStats.closedTrades) * 100
        : journalStats.winRate)
    : Math.min(100, Math.max(0, parseFinite(winRate, 60)));
  const LR = mode === "journal"
    ? (journalStats.closedTrades > 0 && typeof journalStats.losses === "number"
        ? (journalStats.losses / journalStats.closedTrades) * 100
        : Math.max(0, 100 - WR))
    : Math.max(0, 100 - WR);
  const BER = mode === "journal"
    ? (journalStats.closedTrades > 0 && typeof journalStats.breakevenCount === "number"
        ? (journalStats.breakevenCount / journalStats.closedTrades) * 100
        : Math.max(0, 100 - WR - LR))
    : 0;
  const exactPf = mode === "journal" && journalStats.exactProfitFactor ? Number(journalStats.exactProfitFactor) : NaN;
  const canReconstructExact = mode === "journal" && Number.isFinite(exactPf) && Math.abs(exactPf - 1) > 1e-12 && journalStats.wins > 0 && journalStats.losses > 0;
  const exactLossSum = canReconstructExact ? journalStats.totalNet / (exactPf - 1) : 0;
  const exactWinSum = canReconstructExact ? journalStats.totalNet + exactLossSum : 0;
  const AW = mode === "journal"
    ? (canReconstructExact ? Math.abs(exactWinSum / journalStats.wins) : Math.abs(journalStats.avgWin))
    : Math.max(0, parseFinite(avgWin, 150));
  const AL = mode === "journal"
    ? (canReconstructExact ? Math.abs(exactLossSum / journalStats.losses) : Math.abs(journalStats.avgLoss))
    : Math.max(0, parseFinite(avgLoss, 75));
  // STA-02: Preserve explicit 0% variability and $0 commission instead of replacing with 40% via ||
  const VA = Math.max(0, parseFinite(varPct, mode === "journal" ? 0 : 40));
  // SIM-R3-01: En modo Journal, journalStats.avgWin y avgLoss YA son netos de comisiones.
  // Si se restara CM de nuevo en cada trade simulado, la comisión se descontaría dos veces.
  const journalAvgComm = parseFloat((journalStats.totalCommissions / Math.max(journalStats.closedTrades, 1)).toFixed(3));
  const CM = mode === "journal"
    ? 0
    : Math.max(0, parseFinite(comm, 0));
  const NT = Math.min(Math.max(1, parseInt(nTrades) || 100), 500);
  const NS = Math.min(Math.max(1, parseInt(nSims)   || 1000), 5000);
  // STA-03/04: Never invent a 50-trade sample in manual mode; only use real journalN in journal mode
  const SN: number | null = mode === "journal" ? journalN : null;
  const initialAdequacyLabel =
    mode === "manual"
      ? "Sin muestra histórica (Modo Manual)"
      : journalN === 0
      ? "Sin datos (0 trades cerrados)"
      : journalN < 20
      ? "Insuficiente (<20 trades)"
      : journalN < 30
      ? "Mínima (20-29 trades)"
      : journalN < 50
      ? "Aceptable (30-49 trades)"
      : journalN < 100
      ? "Buena (50-99 trades)"
      : "Excelente (100+ trades)";
  const canRun = mode === "manual" ? B > 0 && NT > 0 && NS > 0 : journalN > 0;
  return { B, WR, LR, BER, AW, AL, VA, CM, journalAvgComm, NT, NS, SN, initialAdequacyLabel, canRun };
}

export default function SimulatorPage() {
  const language = useSettingsStore(s => s.language);
  const [mode, setMode]           = useState<Mode>("journal");
  const [balance, setBalance]     = useState("10000");
  const [winRate, setWinRate]     = useState("60");
  const [avgWin,  setAvgWin]      = useState("150");
  const [avgLoss, setAvgLoss]     = useState("75");
  const [varPct,  setVarPct]      = useState("0");
  const [comm,    setComm]        = useState("0.18");
  const [nTrades, setNTrades]     = useState("100");
  const [nSims,   setNSims]       = useState("1000");
  const [stats,   setStats]       = useState<SimStats | null>(null);
  const [running, setRunning]     = useState(false);
  const [showReport, setShowReport] = useState(true);

  /* ── Journal mode: compute stats from closed trades ── */
  const trades = useTradeStore(s => s.trades);
  const closed = useMemo(() => trades.filter(t => t.result !== "Open"), [trades]);
  const journalStats = useMemo(() => computeStats(closed), [closed]);
  const journalN = journalStats.closedTrades;

  // Effective params (journal or manual)
  const { B, WR, LR, BER, AW, AL, VA, CM, NT, NS, SN, initialAdequacyLabel, canRun } = resolveSimParams({
    mode, balance, winRate, avgWin, avgLoss, varPct, comm, nTrades, nSims, journalStats, journalN,
  });

  const liveExp = new Decimal((WR / 100) * (AW - CM) - (LR / 100) * (AL + CM) - (BER / 100) * CM)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    .toNumber();
  const liveRR  = AL > 0 ? (AW / AL).toFixed(2) : "—";

  const run = () => {
    if (!canRun) return;
    setRunning(true);
    setTimeout(() => {
      setStats(runMonteCarlo(B, WR, AW, AL, VA, NT, NS, CM, SN, 42, LR));
      setRunning(false);
    }, 20);
  };

  const report = useMemo(() =>
    stats ? generateReport(stats, WR, NT, CM, AW, AL, VA, language) : null,
    [stats, WR, NT, CM, AW, AL, VA, language]
  );

  const adequacyLabel: Record<SimStats["sampleAdequacy"], { label: string; color: string }> = {
    none:       { label:"Sin muestra histórica (0 trades)", color:"text-text-muted" },
    poor:       { label:"Insuficiente (<20 trades)",        color:"text-red-loss" },
    minimal:    { label:"Mínima (20-29 trades)",             color:"text-red-loss" },
    acceptable: { label:"Aceptable (30-49 trades)",          color:"text-yellow-warn" },
    good:       { label:"Buena (50-99 trades)",              color:"text-blue-accent" },
    excellent:  { label:"Excelente (100+ trades)",           color:"text-green-primary" },
  };

  return (
    <AppShell title="Simulador Monte Carlo" subtitle="Proyección estadística avanzada con tolerancia de error">
      <div className="flex flex-col gap-5 w-full max-w-[1800px] mx-auto">

        {/* ── MODE TOGGLE ── */}
        <div className="flex items-center gap-3 rounded-card border border-border-card bg-bg-card p-1.5 w-fit">
          {([
            { m:"journal" as Mode, icon:BookOpen,  label:"Modo Journal", sub:`Usa mis ${journalN} trades cerrados` },
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
                {journalN === 0 ? (
                  <p className="text-[11px] text-yellow-warn mb-2">
                    No hay operaciones cerradas en el Journal. Registra operaciones cerradas o cambia a Modo Manual para simular escenarios teóricos.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2 text-[11px]">
                    {[
                      { label:"Win Rate",          value:`${journalStats.winRate}%`,                       color: journalStats.winRate >= 50 ? "text-green-primary":"text-red-loss" },
                      { label:"Avg. Win",           value:`+$${Math.abs(journalStats.avgWin).toFixed(2)}`,  color:"text-green-primary" },
                      { label:"Avg. Loss",          value:`-$${Math.abs(journalStats.avgLoss).toFixed(2)}`, color:"text-red-loss" },
                      { label:"Profit Factor",      value:formatProfitFactor(journalStats),             color: (journalStats.profitFactor ?? 0) >= 1.5 ? "text-green-primary":"text-yellow-warn" },
                      { label:"Expectancy/trade",   value:`${journalStats.expectancy >= 0?"+":"-"}$${Math.abs(journalStats.expectancy).toFixed(2)}`, color: journalStats.expectancy >= 0 ? "text-green-primary":"text-red-loss" },
                      { label:"Max Drawdown",       value:`-$${journalStats.maxDrawdown.toFixed(2)}`,       color:"text-red-loss" },
                      { label:"Plan follow rate",   value:`${journalStats.planFollowRate}%`,                color:"text-blue-accent" },
                      { label:"Avg hold time",      value:`${journalStats.avgHoldTime} min`,                color:"text-text-secondary" },
                    ].map(r => (
                      <div key={r.label} className="flex justify-between border-b border-border-card/30 pb-1.5">
                        <span className="text-text-muted">{r.label}</span>
                        <span className={`font-bold ${r.color}`}>{r.value}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className={`mt-3 rounded-lg px-3 py-2 text-[10px] ${
                  journalN >= 50
                    ? "bg-green-primary/10 text-green-primary"
                    : "bg-yellow-warn/10 text-yellow-warn"
                }`}>
                  Adecuación estadística: <strong>{stats ? adequacyLabel[stats.sampleAdequacy].label : initialAdequacyLabel}</strong>
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
                  { label:"WR efectivo",       value: canRun ? `${Number(WR.toFixed(1))}%` : "—" },
                  { label:"Expectancy/trade",  value: canRun ? `${liveExp >= 0?"+":"-"}$${Math.abs(liveExp).toFixed(2)}` : "—", color: !canRun ? "text-text-muted" : liveExp >= 0 ? "text-green-primary":"text-red-loss" },
                  { label:"R:R efectivo",      value: canRun && liveRR !== "—" ? `1:${liveRR}` : "—", color:"text-blue-accent" },
                  { label:"Ganancia esperada", value: canRun ? `${liveExp >= 0?"+":"-"}$${Math.abs(liveExp * NT).toFixed(0)} en ${NT}T` : "—", color: !canRun ? "text-text-muted" : liveExp >= 0 ? "text-green-primary":"text-red-loss" },
                ].map(r => (
                  <div key={r.label} className="flex justify-between">
                    <span className="text-text-muted">{r.label}</span>
                    <span className={`font-bold ${r.color ?? "text-text-primary"}`}>{r.value}</span>
                  </div>
                ))}
              </div>

              {canRun && liveExp < 0 && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-loss/30 bg-red-loss/10 p-3 text-[11px] text-red-loss">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>Expectancy negativa — esta estrategia pierde dinero a largo plazo.</span>
                </div>
              )}

              <button onClick={run} disabled={running || !canRun}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-btn bg-green-primary py-3 text-[13px] font-bold text-bg-main shadow-green-glow hover:bg-green-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {running ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {!canRun
                  ? "Sin datos en Journal (0 trades)"
                  : running
                  ? `Ejecutando ${NS.toLocaleString()} simulaciones...`
                  : `Simular ${NS.toLocaleString()} caminos`}
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
                  ? journalN === 0
                    ? "Sin operaciones cerradas en el Journal para simular."
                    : "Listo — datos del journal cargados. Presiona Simular."
                  : "Configura parámetros y presiona Simular."}
              </p>
              <p className="text-[11px] text-text-muted text-center max-w-xs">
                Motor: Semilla determinista · Percentiles P5–P95 · Intervalos de Wilson cuando existe muestra histórica
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
                { label:"Sharpe Simulado",        value: stats.sharpeRatio !== null ? stats.sharpeRatio.toFixed(2) : "— (σ=0)", sub: stats.sharpeRatio === null ? "Varianza cero" : stats.sharpeRatio > 1 ? "> 1" : "< 1", color: (stats.sharpeRatio ?? 0) > 1.5 ? "text-green-primary":(stats.sharpeRatio ?? 0) > 1 ? "text-blue-accent":"text-yellow-warn" },
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
                      : "Parámetros ingresados manualmente (sin muestra histórica)"}
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
                  { color:"#20E58D", label:"P50 — Mediana (percentil 50)", bold:true },
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
                    <span className="text-text-muted">Con pérdida o igual (sin ruina)</span>
                    <span className="font-bold text-yellow-warn">
                      {Math.max(0, 100 - stats.pctProfitable - stats.pctRuin).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Semi-rango intercuartílico (P25–P75)</span>
                    <span className="font-bold text-text-secondary">±{stats.marginOfError.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Risk Gauges */}
              <div className="rounded-card border border-border-card bg-bg-card p-5">
                <p className="text-[12px] font-semibold text-text-primary mb-1">Indicadores de Riesgo</p>
                <p className="text-[10px] text-text-muted mb-4">Métricas de las trayectorias simuladas</p>
                <div className="flex flex-col gap-3.5">
                  <Gauge value={stats.sharpeRatio ?? 0} max={3} label="Sharpe Simulado" color={(stats.sharpeRatio ?? 0) > 1.5 ? "#20E58D" : (stats.sharpeRatio ?? 0) > 0.8 ? "#F59E0B" : "#EF4444"} />
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
                  <p className="text-sm font-bold text-text-primary">Análisis de Incertidumbre Muestral y Dispersión</p>
                </div>
                <p className="text-[11px] text-text-muted mt-1">
                  {stats.hasHistoricalSample
                    ? `Basado en ${stats.sampleN} trades históricos reales · Intervalo de Wilson del 95% (z = 1.96)`
                    : "Modo Manual sin muestra histórica · No se inventa tamaño de muestra para intervalos inferenciales"}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border-card/30">
                {/* Adequacy */}
                <div className="p-5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-3">Adecuación de Muestra</p>
                  {!stats.hasHistoricalSample ? (
                    <p className="text-[11px] text-yellow-warn leading-relaxed">
                      Sin muestra histórica (Modo Manual). Los intervalos de confianza sobre parámetros poblacionales requieren datos reales del Journal.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {([
                        { level:"poor",       label:"<20 trades",    n:1 },
                        { level:"minimal",    label:"20-29 trades",  n:20 },
                        { level:"acceptable", label:"30-49 trades",  n:30 },
                        { level:"good",       label:"50-99 trades",  n:50 },
                        { level:"excellent",  label:"100+ trades",   n:100 },
                      ] as const).map(({ level, label, n }) => {
                        const isCurrent = stats.sampleAdequacy === level;
                        const passed = (stats.sampleN ?? 0) >= n;
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
                  )}
                </div>

                {/* Win Rate CI */}
                <div className="p-5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-3">IC Win Rate (Wilson 95%)</p>
                  <div className="flex flex-col gap-2.5">
                    <div>
                      <p className="text-[10px] text-text-muted">Win Rate {stats.hasHistoricalSample ? "observado" : "ingresado"}</p>
                      <p className="text-[22px] font-extrabold text-text-primary tabular-nums">{WR.toFixed(1)}%</p>
                    </div>
                    {stats.hasHistoricalSample && stats.ciWinRateLow !== null && stats.ciWinRateHigh !== null ? (
                      <>
                        <div className="rounded-xl bg-bg-section border border-border-card px-3 py-2">
                          <p className="text-[9px] text-text-muted mb-1">Intervalo Wilson 95% (n={stats.sampleN}):</p>
                          <p className="text-[13px] font-bold text-blue-accent tabular-nums">
                            [{stats.ciWinRateLow.toFixed(1)}% — {stats.ciWinRateHigh.toFixed(1)}%]
                          </p>
                          <p className="text-[9px] text-text-muted mt-1">
                            Error estándar: ±{(stats.seWinRate ?? 0).toFixed(2)}%
                          </p>
                        </div>
                        <p className="text-[9px] text-text-muted leading-relaxed">
                          Con {stats.sampleN} trades históricos, el Win Rate poblacional se estima en este rango al 95% de confianza.
                        </p>
                      </>
                    ) : (
                      <div className="rounded-xl bg-bg-section border border-border-card px-3 py-2 text-[10px] text-text-muted">
                        No estimable (sin muestra histórica real).
                      </div>
                    )}
                  </div>
                </div>

                {/* Expectancy CI */}
                <div className="p-5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-3">IC Expectancy (95%)</p>
                  <div className="flex flex-col gap-2.5">
                    <div>
                      <p className="text-[10px] text-text-muted">Expectancy {stats.hasHistoricalSample ? "muestral" : "teórica"}</p>
                      <p className={`text-[22px] font-extrabold tabular-nums ${liveExp >= 0 ? "text-green-primary" : "text-red-loss"}`}>
                        {liveExp >= 0 ? "+" : "-"}${Math.abs(liveExp).toFixed(2)}
                      </p>
                    </div>
                    {stats.hasHistoricalSample && stats.ciExpLow !== null && stats.ciExpHigh !== null ? (
                      <>
                        <div className="rounded-xl bg-bg-section border border-border-card px-3 py-2">
                          <p className="text-[9px] text-text-muted mb-1">Intervalo 95% por trade (n={stats.sampleN}):</p>
                          <p className={`text-[13px] font-bold tabular-nums ${stats.ciExpLow < 0 ? "text-yellow-warn" : "text-green-primary"}`}>
                            [${stats.ciExpLow.toFixed(2)} — ${stats.ciExpHigh.toFixed(2)}]
                          </p>
                          <p className="text-[9px] text-text-muted mt-1">
                            Error estándar: ±${(stats.seExpectancy ?? 0).toFixed(2)}/trade
                          </p>
                        </div>
                        {stats.ciExpLow < 0 && (
                          <div className="flex items-center gap-1.5 text-[9px] text-yellow-warn">
                            <AlertTriangle className="h-3 w-3" />
                            IC cruza cero — no se puede confirmar ventaja estadística con esta muestra.
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="rounded-xl bg-bg-section border border-border-card px-3 py-2 text-[10px] text-text-muted">
                        No estimable (sin muestra histórica real).
                      </div>
                    )}
                  </div>
                </div>

                {/* Final balance IQR (STA-04: Relabeled truthfully as P25-P75 interquartile range, not 95% CI) */}
                <div className="p-5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-3">Rango Intercuartílico Simulado (50% central: P25–P75)</p>
                  <div className="flex flex-col gap-2.5">
                    <div>
                      <p className="text-[10px] text-text-muted">Mediana (P50) de {NS.toLocaleString()} sims</p>
                      <p className={`text-[22px] font-extrabold tabular-nums ${stats.medianFinal >= B ? "text-green-primary" : "text-red-loss"}`}>
                        ${Math.round(stats.medianFinal).toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-xl bg-bg-section border border-border-card px-3 py-2">
                      <p className="text-[9px] text-text-muted mb-1">50% central (P25–P75):</p>
                      <p className="text-[13px] font-bold text-blue-accent tabular-nums">
                        [${Math.round(stats.p25Final).toLocaleString()} — ${Math.round(stats.p75Final).toLocaleString()}]
                      </p>
                      <p className="text-[9px] text-text-muted mt-1">
                        90% central (P5–P95): [${Math.round(stats.p5Final).toLocaleString()} — ${Math.round(stats.p95Final).toLocaleString()}]
                      </p>
                    </div>
                    <p className="text-[9px] text-text-muted leading-relaxed">
                      El 50% central de los {NS.toLocaleString()} caminos simulados termina entre P25 y P75.
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
                      {["Percentil","Balance Final","P&L ($)","P&L (%)","Probabilidad acumulada","Interpretación"].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wide text-text-muted font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-card/20">
                    {[
                      { p:"P5  — Peor 5%",    v:stats.p5Final,    pOccurrence:"5% de los caminos termina aquí o peor",  interp:"Percentil 5 (escenario adverso)",  color:"text-red-loss" },
                      { p:"P25 — Cuartil inf",v:stats.p25Final,   pOccurrence:"25% de los caminos termina aquí o peor", interp:"Percentil 25 (cuartil inferior)",  color:"text-yellow-warn" },
                      { p:"P50 — Mediana",    v:stats.medianFinal,pOccurrence:"50% de los caminos termina aquí o peor", interp:"Mediana (percentil 50)",           color:"text-text-primary" },
                      { p:"P75 — Cuartil sup",v:stats.p75Final,   pOccurrence:"75% de los caminos termina aquí o peor", interp:"Percentil 75 (cuartil superior)",  color:"text-blue-accent" },
                      { p:"P95 — Mejor 5%",   v:stats.p95Final,   pOccurrence:"Solo 5% de los caminos supera esto",     interp:"Percentil 95 (escenario favorable)",color:"text-green-primary" },
                    ].map(r => {
                      const pnl = r.v - B;
                      return (
                        <tr key={r.p} className="hover:bg-white/[0.02]">
                          <td className={`px-4 py-3 font-bold ${r.color}`}>{r.p}</td>
                          <td className={`px-4 py-3 tabular-nums font-bold ${r.color}`}>${Math.round(r.v).toLocaleString()}</td>
                          <td className={`px-4 py-3 tabular-nums ${pnl >= 0 ? "text-green-primary" : "text-red-loss"}`}>{pnl >= 0?"+":"-"}${Math.abs(Math.round(pnl)).toLocaleString()}</td>
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
                    <div className={`text-[18px] font-extrabold ${report.gradeColor}`}>{report.grade}</div>
                    <div>
                      <p className="text-sm font-bold text-text-primary text-left">📋 Informe Técnico de la Simulación</p>
                      <p className="text-[11px] text-text-muted">
                        {NS.toLocaleString()} simulaciones · {stats.hasHistoricalSample ? `muestra histórica n=${stats.sampleN}` : "modo manual sin muestra histórica"}
                        {report.score !== null ? ` · ${report.score}/100 pts` : ""}
                      </p>
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
