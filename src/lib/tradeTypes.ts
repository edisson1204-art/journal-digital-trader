/**
 * Journal Digital Trader Invest â€” Core Trade Data Types
 * Comprehensive type definitions for the trade registration system
 */

import Decimal from "decimal.js";
import {
  computeSnapshot, parseDecimalStrict, estimatedCommission, CALCULATION_VERSION,
  type Execution, type TradeStatus as LedgerTradeStatus,
} from "./ledger/ledger";
import { initialRiskGross, realizedRNet } from "./ledger/risk";
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
  totalCommission: number;      // Calculated: contracts * 2 * commissionPerSide

  // P&L
  grossPnl?: number;            // Before commission
  netPnl?: number;              // After commission
  pnlPerContract?: number;
  rMultiple?: number;           // R:R achieved (+2.3R, -1R, etc.)
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

/* â”€â”€â”€ Daily session summary â”€â”€â”€ */
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

/* â”€â”€â”€ Statistics â”€â”€â”€ */
export interface TradeStats {
  totalTrades: number;
  wins: number;
  losses: number;
  breakevenCount: number;
  openTrades: number;
  winRate: number;               // %
  profitFactor: number | null;   // net wins / net losses; null si no es calculable
  profitFactorState: MetricValue["state"];
  closedTrades: number;
  sampleState: SampleState;
  calculationVersion: string;
  expectancy: number;            // avg net P&L per trade
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
}

/* ─── Utility: calculate trade (delegates to the decimal ledger) ─── */

export interface FillCalcResult extends Partial<TradeRecord> {
  status?: LedgerTradeStatus;
  /** Mensaje si las ejecuciones son inválidas (no se calcula nada). */
  calcError?: string;
}

/**
 * Calcula el trade desde sus ejecuciones reales (entradas y salidas), FIFO, con Decimal.
 * - Salidas parciales: solo se realiza P&L de la cantidad cerrada; result = "Open", status = "PARTIALLY_CLOSED".
 * - Fees: comisión por lado × cantidad de cada ejecución (estimada, una sola vez).
 * - R realizado = neto / riesgo inicial bruto (stop inicial × cantidad entrada × valor punto).
 */
export function calculateTradeFromFills(
  side: TradeSide,
  entries: { price: number; contracts: number }[],
  exits: { price: number; contracts: number }[],
  initialStop: number | undefined,
  commissionPerSide: number,
  pointValue: number,
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
    const snap = computeSnapshot(execs, pv);
    const avgEntry = snap.averageEntryPrice ?? new Decimal(0);
    const risk = initialRiskGross(avgEntry, initialStop ? new Decimal(initialStop) : null, snap.entryQuantity, pv);
    const r = snap.status === "CLOSED" ? realizedRNet(snap.realizedNetPnl, risk) : null;
    const result: TradeResult =
      snap.status !== "CLOSED" ? "Open"
      : snap.economicResult === "WIN" ? "Win"
      : snap.economicResult === "LOSS" ? "Loss" : "Breakeven";
    const exited = snap.exitQuantity;
    return {
      status: snap.status,
      grossPnl: snap.realizedGrossPnl.toDecimalPlaces(2).toNumber(),
      netPnl: snap.realizedNetPnl.toDecimalPlaces(2).toNumber(),
      totalCommission: snap.realizedFees.toDecimalPlaces(2).toNumber(),
      pnlPerContract: exited.gt(0) ? snap.realizedNetPnl.div(exited).toDecimalPlaces(2).toNumber() : undefined,
      rMultiple: r ? r.toDecimalPlaces(4).toNumber() : undefined,
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
    return { result: "Open", status: "OPEN" };
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
export function computeStats(trades: TradeRecord[]): TradeStats {
  const chrono = (t: TradeRecord) => `${t.dateClose || t.dateOpen}T${t.timeClose || t.timeOpen || "00:00"}`;
  const closed = trades
    .filter(t => t.result !== "Open" && typeof t.netPnl === "number" && Number.isFinite(t.netPnl))
    .sort((a, b) => chrono(a).localeCompare(chrono(b)));
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
  const round = (d: Decimal, dp = 2) => d.toDecimalPlaces(dp).toNumber();

  return {
    totalTrades: trades.length,
    closedTrades: closed.length,
    wins: wr.wins,
    losses: wr.losses,
    breakevenCount: wr.breakeven,
    openTrades: trades.filter(t => t.result === "Open").length,
    winRate: wr.rate.state === "VALUE" ? round(wr.rate.value.mul(100), 1) : 0,
    profitFactor: pf.state === "VALUE" ? round(pf.value, 4) : null,
    profitFactorState: pf.state,
    expectancy: exp.state === "VALUE" ? round(exp.value) : 0,
    avgWin: winsN.length ? round(sum(winsN).div(winsN.length)) : 0,
    avgLoss: lossesN.length ? round(sum(lossesN).div(lossesN.length).abs()) : 0,
    avgRMultiple: withR.length ? round(sum(withR.map(t => new Decimal(t.rMultiple as number))).div(withR.length)) : 0,
    totalGross: round(totalGross),
    totalCommissions: round(totalComm),
    totalNet: round(totalNet),
    maxDrawdown: round(maxDD),
    maxConsecWins: maxCW,
    maxConsecLosses: maxCL,
    avgHoldTime: withHold.length ? Math.round(withHold.reduce((s, t) => s + (t.holdTimeMinutes as number), 0) / withHold.length) : 0,
    planFollowRate: parseFloat(planRate.toFixed(1)),
    sampleState: sampleState(closed.length),
    calculationVersion: CALCULATION_VERSION,
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


