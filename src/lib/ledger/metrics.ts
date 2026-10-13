/**
 * Métricas y estadística sobre trades CERRADOS. Ver audit/formulas.md §8-9.
 * Los trades abiertos o parcialmente cerrados no participan.
 */
import Decimal from "decimal.js";

export type MetricValue =
  | { state: "VALUE"; value: Decimal }
  | { state: "NO_DATA" }
  | { state: "NO_LOSSES_OBSERVED" }
  | { state: "NOT_COMPUTABLE"; reason: string };

export type SampleState = "NO_DATA" | "INSUFFICIENT" | "EARLY_SAMPLE" | "EVALUABLE" | "MODERATE_EVIDENCE" | "STRONGER_EVIDENCE";

/** Política de producto (no es una prueba de validez estadística). */
export const SAMPLE_POLICY = { INSUFFICIENT: 1, EARLY_SAMPLE: 10, EVALUABLE: 30, MODERATE_EVIDENCE: 100, STRONGER_EVIDENCE: 300 } as const;

export function sampleState(n: number): SampleState {
  if (n <= 0) return "NO_DATA";
  if (n < SAMPLE_POLICY.EARLY_SAMPLE) return "INSUFFICIENT";
  if (n < SAMPLE_POLICY.EVALUABLE) return "EARLY_SAMPLE";
  if (n < SAMPLE_POLICY.MODERATE_EVIDENCE) return "EVALUABLE";
  if (n < SAMPLE_POLICY.STRONGER_EVIDENCE) return "MODERATE_EVIDENCE";
  return "STRONGER_EVIDENCE";
}

/** PF sobre P&L NETO. */
export function profitFactor(netPnls: Decimal[]): MetricValue {
  if (netPnls.length === 0) return { state: "NO_DATA" };
  const profits = netPnls.filter(p => p.gt(0)).reduce((s, p) => s.plus(p), new Decimal(0));
  const losses = netPnls.filter(p => p.lt(0)).reduce((s, p) => s.plus(p), new Decimal(0)).abs();
  if (losses.eq(0)) return profits.gt(0) ? { state: "NO_LOSSES_OBSERVED" } : { state: "NOT_COMPUTABLE", reason: "Solo hay trades en breakeven neto" };
  return { state: "VALUE", value: profits.div(losses) };
}

export function expectancy(netPnls: Decimal[]): MetricValue {
  if (netPnls.length === 0) return { state: "NO_DATA" };
  return { state: "VALUE", value: netPnls.reduce((s, p) => s.plus(p), new Decimal(0)).div(netPnls.length) };
}

/** WR = wins / (wins + losses). Los breakeven netos se reportan aparte. */
export function winRate(netPnls: Decimal[]): { wins: number; losses: number; breakeven: number; rate: MetricValue } {
  const wins = netPnls.filter(p => p.gt(0)).length;
  const losses = netPnls.filter(p => p.lt(0)).length;
  const breakeven = netPnls.length - wins - losses;
  const denom = wins + losses;
  return { wins, losses, breakeven, rate: denom === 0 ? { state: "NO_DATA" } : { state: "VALUE", value: new Decimal(wins).div(denom) } };
}

/** Drawdown realizado sobre la curva cronológica desde el capital inicial (valor ≤ 0). */
export function maxRealizedDrawdown(startingCapital: Decimal, chronologicalNetPnls: Decimal[]): Decimal {
  let equity = startingCapital;
  let peak = startingCapital;
  let maxDd = new Decimal(0);
  for (const p of chronologicalNetPnls) {
    equity = equity.plus(p);
    peak = Decimal.max(peak, equity);
    maxDd = Decimal.min(maxDd, equity.minus(peak));
  }
  return maxDd;
}

/** Intervalo de Wilson. Nota: asume ensayos independientes, lo cual NO está demostrado entre trades. */
export function wilsonInterval(successes: number, n: number, z = 1.959963984540054): { lower: number; upper: number; method: string; confidence: number } | null {
  if (n <= 0) return null;
  const p = successes / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = p + z2 / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));
  return {
    lower: Math.max(0, (center - margin) / denom),
    upper: Math.min(1, (center + margin) / denom),
    method: "Wilson score",
    confidence: 0.95,
  };
}

/* ─── Monte Carlo reproducible ─── */

/** PRNG determinista (mulberry32) inicializado desde una semilla de texto. */
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SimulationConfig {
  startingCapital: Decimal;
  tradeOutcomes: Decimal[];
  numberOfTrades: number;
  numberOfPaths: number;
  seed: string;
  samplingMethod: "EMPIRICAL_BOOTSTRAP";
  costsIncluded: boolean;
}

export interface SimulationResult {
  seed: string;
  numberOfPaths: number;
  finalEquities: Decimal[];
  percentiles: { p5: Decimal; p50: Decimal; p95: Decimal };
  /** P5–P95 es un intervalo central de simulación del 90 %, NO un IC 95 %. */
  centralIntervalLabel: string;
  probabilityOfLoss: number;
  /** Error estándar Monte Carlo de la probabilidad estimada. */
  monteCarloStdError: number;
  assumptions: string[];
}

export function runBootstrap(cfg: SimulationConfig): SimulationResult {
  if (cfg.tradeOutcomes.length === 0) throw new Error("Sin resultados de trades para simular");
  const rnd = seededRandom(cfg.seed);
  const finals: Decimal[] = [];
  for (let p = 0; p < cfg.numberOfPaths; p++) {
    let eq = cfg.startingCapital;
    for (let t = 0; t < cfg.numberOfTrades; t++) {
      eq = eq.plus(cfg.tradeOutcomes[Math.floor(rnd() * cfg.tradeOutcomes.length)]);
    }
    finals.push(eq);
  }
  const sorted = [...finals].sort((a, b) => a.comparedTo(b));
  const pct = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * (sorted.length - 1)))];
  const pLoss = finals.filter(f => f.lt(cfg.startingCapital)).length / finals.length;
  return {
    seed: cfg.seed,
    numberOfPaths: cfg.numberOfPaths,
    finalEquities: finals,
    percentiles: { p5: pct(0.05), p50: pct(0.5), p95: pct(0.95) },
    centralIntervalLabel: "Intervalo central de simulación 90 % (P5–P95)",
    probabilityOfLoss: pLoss,
    monteCarloStdError: Math.sqrt((pLoss * (1 - pLoss)) / finals.length),
    assumptions: [
      "Remuestreo empírico con reemplazo de tus resultados netos históricos",
      "Supone que los trades son independientes e idénticamente distribuidos (no demostrado)",
      cfg.costsIncluded ? "Los resultados ya incluyen fees" : "Los resultados NO incluyen fees",
    ],
  };
}
