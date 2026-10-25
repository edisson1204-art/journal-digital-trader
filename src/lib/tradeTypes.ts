/**
 * Journal Digital Trader Invest â€” Core Trade Data Types
 * Comprehensive type definitions for the trade registration system
 */

import Decimal from "decimal.js";
import {
  computeSnapshot, parseDecimalStrict, estimatedCommission, CALCULATION_VERSION,
  type Execution, type TradeStatus as LedgerTradeStatus,
} from "./ledger/ledger";
import { initialRiskGross, realizedRNet, realizedRGross } from "./ledger/risk";
import {
  profitFactor as ledgerProfitFactor, winRate as ledgerWinRate, expectancy as ledgerExpectancy,
  maxRealizedDrawdown, sampleState, type SampleState, type MetricValue,
} from "./ledger/metrics";

/* â”€â”€â”€ Asset Classes â”€â”€â”€ */
export type AssetClass =
  | "Futures"
  | "Futures_Micro"
  | "Forex"
  | "Stocks"
  | "Options"
  | "Crypto"
  | "ETFs"
  | "Indexes"
  | "Commodities"
  | "CFDs";

/* â”€â”€â”€ Trade direction â”€â”€â”€ */
export type TradeSide = "Buy" | "Sell";
export type TradeResult = "Win" | "Loss" | "Breakeven" | "Open";

/* â”€â”€â”€ Session â”€â”€â”€ */
export type TradingSession =
  | "Pre-Market"
  | "NYSE Open (9:30-11)"
  | "Midday (11-14)"
  | "Power Hour (14-16)"
  | "After Hours"
  | "London Open"
  | "London/NY Overlap"
  | "Asian Session"
  | "Other";

/* â”€â”€â”€ Setup quality grade â”€â”€â”€ */
export type SetupGrade = "A+" | "A" | "B" | "C" | "D";

/* â”€â”€â”€ Broker commission models â”€â”€â”€ */
export interface BrokerCommission {
  name: string;
  perSide: number;       // $ per contract per side (entry OR exit, not both)
  perRoundTrip: number;  // $ per contract round trip (entry + exit)
  minimum: number;       // $ minimum per trade
  notes: string;
}

export const BROKER_PRESETS: Record<string, BrokerCommission> = {
  ninjatrader_lease: {
    name: "NinjaTrader (Lease)",
    perSide: 0.09,
    perRoundTrip: 0.18,
    minimum: 0,
    notes: "Futures: $0.09/side/contract with lease plan",
  },
  ninjatrader_lifetime: {
    name: "NinjaTrader (Lifetime)",
    perSide: 0.0,
    perRoundTrip: 0.0,
    minimum: 0,
    notes: "Commission-free with lifetime license (platform fee only)",
  },
  tradovate: {
    name: "Tradovate",
    perSide: 0.25,
    perRoundTrip: 0.50,
    minimum: 0,
    notes: "Futures: $0.25/side/contract (membership plans available)",
  },
  tradestation_futures: {
    name: "TradeStation (Futures)",
    perSide: 0.50,
    perRoundTrip: 1.00,
    minimum: 0,
    notes: "Futures: $0.50/side/contract",
  },
  tradestation_stocks: {
    name: "TradeStation (Stocks)",
    perSide: 0.00,
    perRoundTrip: 0.00,
    minimum: 0,
    notes: "$0 stock commissions (TS Go plan)",
  },
  interactive_brokers: {
    name: "Interactive Brokers (IBKR)",
    perSide: 0.85,
    perRoundTrip: 1.70,
    minimum: 0.25,
    notes: "Futures: $0.85/side, stocks tiered pricing",
  },
  td_ameritrade: {
    name: "TD Ameritrade / Schwab",
    perSide: 0.00,
    perRoundTrip: 0.00,
    minimum: 0,
    notes: "$0 stock/ETF commissions; futures ~$2.25/contract",
  },
  tastytrade: {
    name: "tastytrade",
    perSide: 0.00,
    perRoundTrip: 1.25,
    minimum: 0,
    notes: "Options: $1/contract opening, $0 closing. Futures: $1.25/side",
  },
  topstep: {
    name: "TopStep / Funded",
    perSide: 0.09,
    perRoundTrip: 0.18,
    minimum: 0,
    notes: "Via NinjaTrader/Tradovate. Check your funded account rules.",
  },
  lucid_trading: {
    name: "Lucy Trading / Lucid Trading",
    perSide: 0.09,
    perRoundTrip: 0.18,
    minimum: 0,
    notes: "LucidPro / LucidFlex (Futures Prop Firm — EOD Trailing Drawdown)",
  },
  my_funded_futures: {
    name: "My Funded Futures (MFFU)",
    perSide: 0.09,
    perRoundTrip: 0.18,
    minimum: 0,
    notes: "Starter / Expert Futures Prop Firm",
  },
  take_profit_trader: {
    name: "Take Profit Trader (TPT)",
    perSide: 0.09,
    perRoundTrip: 0.18,
    minimum: 0,
    notes: "Futures Prop Firm (PRO / PRO+)",
  },
  ftmo: {
    name: "FTMO",
    perSide: 0.09,
    perRoundTrip: 0.18,
    minimum: 0,
    notes: "FTMO Challenge / Verification / Funded",
  },
  apex: {
    name: "Apex Trader Funding",
    perSide: 0.09,
    perRoundTrip: 0.18,
    minimum: 0,
    notes: "Via NinjaTrader. Check current rate with your plan.",
  },
  custom: {
    name: "Custom",
    perSide: 0,
    perRoundTrip: 0,
    minimum: 0,
    notes: "Enter your own commission rates",
  },
};

/* â”€â”€â”€ Multiple entries (scaling in) â”€â”€â”€ */
export interface TradeEntry_Scale {
  price: number;
  contracts: number;
  time?: string;
}

/* â”€â”€â”€ Partial exit â”€â”€â”€ */
export interface TradeExit_Partial {
  price: number;
  contracts: number;
  time?: string;
}

/* â”€â”€â”€ Core Trade Record â”€â”€â”€ */
export interface TradeRecord {
  // Identity
  id: string;
  accountId?: string;
  brokerTradeId?: string;      // Optional broker reference ID

  // Classification
  assetClass: AssetClass;
  instrument: string;           // e.g. "NQ", "ES", "EURUSD", "AAPL"
  tickerSymbol?: string;        // e.g. "NQZ25" (expiration-specific)
  side: TradeSide;

  // Timing
  dateOpen: string;             // ISO date "YYYY-MM-DD"
  timeOpen?: string;            // "HH:MM"
  dateClose?: string;
  timeClose?: string;
  holdTimeMinutes?: number;     // Auto-calculated
  session: TradingSession;

  // Execution â€” entries (supports scaling in)
  entries: TradeEntry_Scale[];  // At least one entry required
  avgEntryPrice: number;        // Weighted average of entries
  totalContracts: number;       // Total contracts / units

  // Risk levels
  stopLoss: number;
  initialStopLoss?: number;     // Original stop before any adjustment
  takeProfit?: number;
  takeProfit2?: number;         // Second target (for scaling out)
  takeProfit3?: number;         // Third target

  // Exits (supports partial exits)
  exits: TradeExit_Partial[];
  avgExitPrice?: number;        // Weighted avg exit
  contractsExited: number;

  // Commissions
  brokerId: string;             // Key into BROKER_PRESETS
  customCommissionPerSide?: number;  // If broker = "custom"
  commissionPerSide: number;
  totalCommission: number;      // Realized commission assigned to closed contracts
  openCommission?: number;      // Commission on open contracts (unassigned entry fee)
  accruedCommission?: number;   // Total accrued commission across all executions

  // P&L
  status?: LedgerTradeStatus;
  openContracts?: number;
  grossPnl?: number;            // Realized gross P&L before commission
  netPnl?: number;              // Realized net P&L after realized commission
  netPnlAfterAccruedFees?: number; // Realized gross P&L minus all accrued fees (labeled separately)
  pnlPerContract?: number;
  rMultiple?: number;           // Net R achieved (realizedNetPnl / initialRiskTotal, 4dp)
  grossRMultiple?: number;      // Gross R achieved (realizedGrossPnl / initialRiskTotal, 4dp)
  exactNetR?: string;           // Exact Decimal string for Net R (e.g. "0.49955")
  exactGrossR?: string;         // Exact Decimal string for Gross R (e.g. "0.5")
  result: TradeResult;

  // Performance analytics
  mae?: number;                 // Maximum Adverse Excursion (max drawdown in trade)
  mfe?: number;                 // Maximum Favorable Excursion (max profit seen)
  efficiency?: number;          // MFE captured %: netPnl/mfe * 100

  // Context
  strategy: string;
  setup: string;
  setupGrade: SetupGrade;
  planFollowed: boolean;
  isBreakeven: boolean;
  isFundedAccount: boolean;

  // Psychology
  emotionEntry: string;
  emotionExit?: string;
  confluenceCount: number;      // 1-5: how many confluences aligned
  mistakeType?: string;         // e.g. "Early entry", "Moved SL", "FOMO", "Revenge"

  // Tags & Notes
  tags: string[];
  notes: string;
  lessonsLearned?: string;
  screenshotUrl?: string;
}

/* ─── Daily session summary ─── */
export interface DailySummary {
  date: string;
  trades: number;
  wins: number;
  losses: number;
  breakevenCount: number;
  grossPnl: number;
  netPnl: number;
  totalCommissions: number;
  winRate: number;
  totalContracts: number;
  bestTrade: number;
  worstTrade: number;
  rMultipleSum: number;
}

/* ─── Statistics ─── */
export interface TradeStats {
  totalTrades: number;
  wins: number;
  losses: number;
  breakevenCount: number;
  openTrades: number;
  winRate: number;               // %
  profitFactor: number | null;   // net wins / net losses; null si no es calculable
  exactProfitFactor?: string | null;
  profitFactorState: MetricValue["state"];
  closedTrades: number;
  sampleState: SampleState;
  calculationVersion: string;
  expectancy: number;            // avg net P&L per trade (ROUND_HALF_UP 2dp)
  exactExpectancy?: string | null;
  roundingPolicy?: "ROUND_HALF_UP_2DP";
  avgWin: number;
  avgLoss: number;
  avgRMultiple: number;
  totalGross: number;
  totalCommissions: number;
  totalNet: number;
  maxDrawdown: number;
  maxConsecWins: number;
  maxConsecLosses: number;
  avgHoldTime: number;           // minutes
  planFollowRate: number;        // %
  // Categorías separadas y reconciliables para posiciones abiertas y parciales (R2-01)
  openPositionsCount?: number;
  partialPositionsCount?: number;
  openContractsTotal?: number;
  partialRealizedGross?: number;
  partialRealizedCommission?: number;
  partialRealizedNet?: number;
  openExecutionCommission?: number;
  totalAccruedCommissions?: number;
}

/* ─── Utility: calculate trade (delegates to the decimal ledger) ─── */

export interface FillCalcResult extends Partial<TradeRecord> {
  status?: LedgerTradeStatus;
  openContracts?: number;
  accruedCommission?: number;
  openCommission?: number;
  netPnlAfterAccruedFees?: number;
  grossRMultiple?: number;
  exactNetR?: string;
  exactGrossR?: string;
  /** Mensaje si las ejecuciones son inválidas (no se calcula nada). */
  calcError?: string;
}

/**
 * Calcula el trade desde sus ejecuciones reales (entradas y salidas), FIFO, con Decimal.
 * - Salidas parciales: solo se realiza P&L de la cantidad cerrada; result = "Open", status = "PARTIALLY_CLOSED".
 * - Fees: comisión por lado × cantidad de cada ejecución (estimada, una sola vez), asignada FIFO a la cantidad cerrada (§9.2).
 * - R realizado neto = realizedNetPnl / riesgo inicial bruto total (stop inicial × cantidad entrada total × valor punto).
 * - R realizado bruto = realizedGrossPnl / riesgo inicial bruto total (R2-04).
 */
export function calculateTradeFromFills(
  side: TradeSide,
  entries: { price: number; contracts: number }[],
  exits: { price: number; contracts: number }[],
  initialStop: number | undefined,
  commissionPerSide: number,
  pointValue: number,
  priceOpts?: { allowZeroPrice?: boolean; allowNegativePrice?: boolean },
): FillCalcResult {
  try {
    const pv = new Decimal(pointValue);
    const fee = new Decimal(commissionPerSide || 0);
    const openSide = side === "Buy" ? "BUY" : "SELL";
    const closeSide = side === "Buy" ? "SELL" : "BUY";
    const execs: Execution[] = [
      ...entries.map((e, i) => ({
        id: `in${i}`, side: openSide as "BUY" | "SELL",
        quantity: parseDecimalStrict(e.contracts, `Entrada ${i + 1} cantidad`),
        price: parseDecimalStrict(e.price, `Entrada ${i + 1} precio`),
        fees: estimatedCommission(fee, new Decimal(e.contracts)),
      })),
      ...exits.map((e, i) => ({
        id: `out${i}`, side: closeSide as "BUY" | "SELL",
        quantity: parseDecimalStrict(e.contracts, `Salida ${i + 1} cantidad`),
        price: parseDecimalStrict(e.price, `Salida ${i + 1} precio`),
        fees: estimatedCommission(fee, new Decimal(e.contracts)),
      })),
    ];
    const snap = computeSnapshot(execs, pv, priceOpts);
    const avgEntry = snap.averageEntryPrice ?? new Decimal(0);
    const risk = initialRiskGross(avgEntry, initialStop !== undefined && initialStop !== 0 ? new Decimal(initialStop) : null, snap.entryQuantity, pv);
    const exited = snap.exitQuantity;
    const hasClosed = exited.gt(0);
    const rNet = hasClosed ? realizedRNet(snap.realizedNetPnl, risk) : null;
    const rGross = hasClosed ? realizedRGross(snap.realizedGrossPnl, risk) : null;
    const result: TradeResult =
      snap.status !== "CLOSED" ? "Open"
      : snap.economicResult === "WIN" ? "Win"
      : snap.economicResult === "LOSS" ? "Loss" : "Breakeven";
    return {
      status: snap.status,
      avgEntryPrice: snap.averageEntryPrice ? snap.averageEntryPrice.toDecimalPlaces(5, Decimal.ROUND_HALF_UP).toNumber() : undefined,
      avgExitPrice: snap.averageExitPrice ? snap.averageExitPrice.toDecimalPlaces(5, Decimal.ROUND_HALF_UP).toNumber() : undefined,
      totalContracts: snap.entryQuantity.toNumber(),
      contractsExited: exited.toNumber(),
      openContracts: snap.openQuantity.toNumber(),
      grossPnl: hasClosed ? snap.realizedGrossPnl.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber() : undefined,
      netPnl: hasClosed ? snap.realizedNetPnl.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber() : undefined,
      totalCommission: snap.realizedFees.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
      accruedCommission: snap.accruedFees.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
      openCommission: snap.openFees.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
      netPnlAfterAccruedFees: hasClosed ? snap.netPnlAfterAccruedFees.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber() : undefined,
      pnlPerContract: hasClosed ? snap.realizedNetPnl.div(exited).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber() : undefined,
      rMultiple: rNet ? rNet.toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toNumber() : undefined,
      grossRMultiple: rGross ? rGross.toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toNumber() : undefined,
      exactNetR: rNet ? rNet.toString() : undefined,
      exactGrossR: rGross ? rGross.toString() : undefined,
      isBreakeven: snap.economicResult === "NET_BREAKEVEN",
      result,
    };
  } catch (err) {
    return { calcError: err instanceof Error ? err.message : "Ejecuciones no válidas" };
  }
}

/**
 * Compatibilidad: trade con una entrada y una salida promedio.
 * `contractsExited` (por defecto = contracts) permite salidas parciales.
 */
export function calculateTrade(
  side: TradeSide,
  avgEntry: number,
  avgExit: number | undefined,
  stopLoss: number,
  contracts: number,
  commissionPerSide: number,
  pipValue: number = 1,          // $ per point per contract
  contractsExited: number = contracts,
): FillCalcResult {
  if (avgExit === undefined || avgExit === null || contractsExited === 0) {
    return calculateTradeFromFills(
      side,
      [{ price: avgEntry, contracts }],
      [],
      stopLoss || undefined,
      commissionPerSide,
      pipValue,
    );
  }
  return calculateTradeFromFills(
    side,
    [{ price: avgEntry, contracts }],
    [{ price: avgExit, contracts: contractsExited }],
    stopLoss || undefined,
    commissionPerSide,
    pipValue,
  );
}

/* ─── Compute statistics from trade list ─── */
export function isStrictlyClosed(t: TradeRecord): boolean {
  return (
    t.result !== "Open" &&
    t.status !== "OPEN" &&
    t.status !== "PARTIALLY_CLOSED" &&
    (t.openContracts === undefined || t.openContracts === 0) &&
    typeof t.netPnl === "number" &&
    Number.isFinite(t.netPnl)
  );
}

/**
 * Fecha efectiva de una operación para agrupación y filtrado temporal:
 * En operaciones cerradas usa `dateClose` si existe y es >= `dateOpen`; de lo contrario usa `dateOpen`.
 */
export function effectiveTradeDate(t: TradeRecord): string {
  const open = (t.dateOpen || "").slice(0, 10);
  const close = (t.dateClose || "").slice(0, 10);
  if (t.result !== "Open" && close && (!open || close >= open)) {
    return close;
  }
  return open || close;
}

export function computeStats(trades: TradeRecord[]): TradeStats {
  const chrono = (t: TradeRecord) => `${effectiveTradeDate(t)}T${t.timeClose || t.timeOpen || "00:00"}`;
  const isStrictlyClosed = (t: TradeRecord) =>
    t.result !== "Open" &&
    t.status !== "OPEN" &&
    t.status !== "PARTIALLY_CLOSED" &&
    (t.openContracts === undefined || t.openContracts === 0) &&
    typeof t.netPnl === "number" &&
    Number.isFinite(t.netPnl);

  const closed = trades
    .filter(isStrictlyClosed)
    .sort((a, b) => chrono(a).localeCompare(chrono(b)));

  const nonClosed = trades.filter(t => !isStrictlyClosed(t));
  const partialPositions = nonClosed.filter(t =>
    t.status === "PARTIALLY_CLOSED" || ((t.contractsExited ?? 0) > 0 && (t.contractsExited ?? 0) < t.totalContracts)
  );
  const openOnlyPositions = nonClosed.filter(t => !partialPositions.includes(t));

  const nets = closed.map(t => new Decimal(t.netPnl as number));
  const sum = (xs: Decimal[]) => xs.reduce((s, x) => s.plus(x), new Decimal(0));

  const wr = ledgerWinRate(nets);
  const pf = ledgerProfitFactor(nets);
  const exp = ledgerExpectancy(nets);
  const winsN = nets.filter(n => n.gt(0));
  const lossesN = nets.filter(n => n.lt(0));

  const totalGross = sum(closed.map(t => new Decimal(t.grossPnl ?? 0)));
  const totalComm = sum(closed.map(t => new Decimal(t.totalCommission ?? 0)));
  const totalNet = sum(nets);
  const maxDD = maxRealizedDrawdown(new Decimal(0), nets).abs();

  // Categorías separadas y reconciliables para posiciones abiertas y parciales (R2-01)
  const openContractsTotal = nonClosed.reduce((acc, t) => {
    const openC = t.openContracts !== undefined ? t.openContracts : Math.max(0, (t.totalContracts || 0) - (t.contractsExited || 0));
    return acc + openC;
  }, 0);
  const partialRealizedGrossDec = sum(partialPositions.map(t => new Decimal(t.grossPnl ?? 0)));
  const partialRealizedCommDec = sum(partialPositions.map(t => new Decimal(t.totalCommission ?? 0)));
  const partialRealizedNetDec = sum(partialPositions.map(t => new Decimal(t.netPnl ?? 0)));
  const openExecCommDec = sum(nonClosed.map(t => {
    if (t.openCommission !== undefined) return new Decimal(t.openCommission);
    const openC = t.openContracts !== undefined ? t.openContracts : Math.max(0, (t.totalContracts || 0) - (t.contractsExited || 0));
    return new Decimal(t.commissionPerSide ?? 0).mul(openC);
  }));
  const totalAccruedCommDec = totalComm.plus(partialRealizedCommDec).plus(openExecCommDec);

  // Rachas sobre resultado económico neto
  let maxCW = 0, maxCL = 0, cw = 0, cl = 0;
  for (const n of nets) {
    if (n.gt(0)) { cw++; cl = 0; maxCW = Math.max(maxCW, cw); }
    else if (n.lt(0)) { cl++; cw = 0; maxCL = Math.max(maxCL, cl); }
    else { cw = 0; cl = 0; }
  }

  const withR = closed.filter(t => typeof t.rMultiple === "number" && Number.isFinite(t.rMultiple));
  const withHold = closed.filter(t => typeof t.holdTimeMinutes === "number" && Number.isFinite(t.holdTimeMinutes) && (t.holdTimeMinutes as number) >= 0);
  const planRate = closed.length ? (closed.filter(t => t.planFollowed).length / closed.length) * 100 : 0;
  const round = (d: Decimal, dp = 2) => d.toDecimalPlaces(dp, Decimal.ROUND_HALF_UP).toNumber();

  return {
    totalTrades: trades.length,
    closedTrades: closed.length,
    wins: wr.wins,
    losses: wr.losses,
    breakevenCount: wr.breakeven,
    openTrades: nonClosed.length,
    winRate: wr.rate.state === "VALUE" ? round(wr.rate.value.mul(100), 1) : 0,
    profitFactor: pf.state === "VALUE" ? round(pf.value, 4) : null,
    exactProfitFactor: pf.state === "VALUE" ? pf.value.toString() : null,
    profitFactorState: pf.state,
    expectancy: exp.state === "VALUE" ? round(exp.value, 2) : 0,
    exactExpectancy: exp.state === "VALUE" ? exp.value.toString() : null,
    roundingPolicy: "ROUND_HALF_UP_2DP",
    avgWin: winsN.length ? round(sum(winsN).div(winsN.length), 2) : 0,
    avgLoss: lossesN.length ? round(sum(lossesN).div(lossesN.length).abs(), 2) : 0,
    avgRMultiple: withR.length ? round(sum(withR.map(t => new Decimal(t.rMultiple as number))).div(withR.length), 2) : 0,
    totalGross: round(totalGross, 2),
    totalCommissions: round(totalComm, 2),
    totalNet: round(totalNet, 2),
    maxDrawdown: round(maxDD, 2),
    maxConsecWins: maxCW,
    maxConsecLosses: maxCL,
    avgHoldTime: withHold.length ? Math.round(withHold.reduce((s, t) => s + (t.holdTimeMinutes as number), 0) / withHold.length) : 0,
    planFollowRate: parseFloat(planRate.toFixed(1)),
    sampleState: sampleState(closed.length),
    calculationVersion: CALCULATION_VERSION,
    openPositionsCount: openOnlyPositions.length,
    partialPositionsCount: partialPositions.length,
    openContractsTotal,
    partialRealizedGross: round(partialRealizedGrossDec, 2),
    partialRealizedCommission: round(partialRealizedCommDec, 2),
    partialRealizedNet: round(partialRealizedNetDec, 2),
    openExecutionCommission: round(openExecCommDec, 2),
    totalAccruedCommissions: round(totalAccruedCommDec, 2),
  };
}

/** Texto para mostrar el Profit Factor sin valores centinela. */
export function formatProfitFactor(s: Pick<TradeStats, "profitFactor" | "profitFactorState">): string {
  if (s.profitFactorState === "VALUE" && s.profitFactor !== null) return s.profitFactor.toFixed(2);
  if (s.profitFactorState === "NO_LOSSES_OBSERVED") return "Sin pérdidas";
  return "—";
}

/* â”€â”€â”€ Asset class config â”€â”€â”€ */
export const ASSET_CLASS_CONFIG: Record<AssetClass, {
  pipValue: number;   // Default $ per point per contract
  unit: string;       // "contracts" | "lots" | "shares"
  decimalPlaces: number;
  instruments: string[];
}> = {
  Futures: {
    pipValue: 1,      // Default — overridden per-instrument in risk calc
    unit: "contracts",
    decimalPlaces: 2,
    instruments: ["NQ","ES","YM","RTY","CL","GC","SI","ZB","ZN","6E","6B","6J","6A","NG","HO"],
  },
  Futures_Micro: {
    pipValue: 2,      // Default MNQ=$2/pt — user selects per instrument
    unit: "micro-contratos",
    decimalPlaces: 2,
    instruments: ["MNQ","MES","MYM","M2K","MGC","MCL","MBT","M6E","M6B","MHNG"],
  },
  Forex: {
    pipValue: 10,    // Per standard lot per pip
    unit: "lots",
    decimalPlaces: 5,
    instruments: ["EURUSD","GBPUSD","USDJPY","AUDUSD","USDCAD","USDCHF","NZDUSD","GBPJPY","EURJPY","EURGBP"],
  },
  Stocks: {
    pipValue: 1,
    unit: "shares",
    decimalPlaces: 2,
    instruments: ["AAPL","TSLA","AMZN","NVDA","MSFT","META","GOOGL","SPY","QQQ","AMD"],
  },
  Options: {
    pipValue: 100,   // 1 contract = 100 shares
    unit: "contracts",
    decimalPlaces: 2,
    instruments: ["SPY","QQQ","AAPL","TSLA","NVDA","AMZN"],
  },
  Crypto: {
    pipValue: 1,
    unit: "units",
    decimalPlaces: 2,
    instruments: ["BTCUSD","ETHUSD","SOLUSD","BNBUSD","XRPUSD"],
  },
  ETFs: {
    pipValue: 1,
    unit: "shares",
    decimalPlaces: 2,
    instruments: ["SPY","QQQ","IWM","GLD","SLV","USO","TLT","XLF","XLE"],
  },
  Indexes: {
    pipValue: 1,
    unit: "contracts",
    decimalPlaces: 2,
    instruments: ["SPX","NDX","RUT","DJI","VIX"],
  },
  Commodities: {
    pipValue: 1,
    unit: "contracts",
    decimalPlaces: 2,
    instruments: ["Gold","Silver","Oil (WTI)","Oil (Brent)","Natural Gas","Copper","Wheat","Corn"],
  },
  CFDs: {
    pipValue: 1,
    unit: "contracts",
    decimalPlaces: 2,
    instruments: ["US30","US500","US100","GER40","UK100","AUS200","JP225"],
  },
};

/** Fecha YYYY-MM-DD en la zona horaria del usuario (toISOString() devuelve UTC). */
export function localDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ─── Valor en USD de un movimiento de 1.0 en el precio, por contrato/lote ───
   Fuente: especificaciones oficiales de contratos CME Group.
   Ej: NQ sube 10.00 puntos × $20 = $200 por contrato. */
export const INSTRUMENT_POINT_VALUES: Record<string, number> = {
  // Futuros E-mini / estándar
  NQ: 20, ES: 50, YM: 5, RTY: 50,
  CL: 1000, NG: 10000, HO: 42000,
  GC: 100, SI: 5000,
  ZB: 1000, ZN: 1000,
  "6E": 125000, "6B": 62500, "6J": 12500000, "6A": 100000,
  // Micro futuros
  MNQ: 2, MES: 5, MYM: 0.5, M2K: 5,
  MGC: 10, MCL: 100, MHNG: 1000,
  MBT: 0.1, M6E: 12500, M6B: 6250,
  // Forex con USD como divisa cotizada (1 lote estándar = 100,000 unidades)
  EURUSD: 100000, GBPUSD: 100000, AUDUSD: 100000, NZDUSD: 100000,
};

/** Devuelve el valor en USD de un movimiento de 1.0 en el precio, por contrato. */
export function getPointValue(assetClass: AssetClass, instrument: string): number {
  const key = (instrument || "").trim().toUpperCase();
  if (key in INSTRUMENT_POINT_VALUES) return INSTRUMENT_POINT_VALUES[key];
  return ASSET_CLASS_CONFIG[assetClass]?.pipValue ?? 1;
}

/** true si el instrumento tiene un valor por punto oficial en la tabla. */
export function hasOfficialPointValue(instrument: string): boolean {
  return (instrument || "").trim().toUpperCase() in INSTRUMENT_POINT_VALUES;
}

export const STRATEGIES = [
  "Breakout","Trend Following","Mean Reversion","Scalping",
  "News/Event","Support & Resistance","VWAP","Order Flow",
  "ICT Concepts","SMC","Gap Fill","Momentum","Reversal","Other",
];

export const EMOTIONS = [
  "Confident","Focused","Calm","Patient","Disciplined",
  "Neutral","Anxious","Fearful","Overconfident",
  "Impatient","Frustrated","Greedy","Bored",
];

export const MISTAKE_TYPES = [
  "Early entry","Late entry","Moved stop loss","Didn't take TP",
  "FOMO","Revenge trade","Oversized position","Ignored plan",
  "Chased price","Poor risk:reward","No setup / impulse","Other",
];

export const TAGS_SUGGESTED = [
  "plan-followed","high-conviction","confluence","pre-market","news-catalyst",
  "trend-day","range-day","gap-fill","FOMO","revenge","overtrading",
  "scaled-in","partial-exit","runner","breakeven-stop","missed-entry",
];


