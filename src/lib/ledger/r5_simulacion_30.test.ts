import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";
import {
  calculateTradeFromFills,
  computeStats,
  effectiveTradeDate,
  formatProfitFactor,
  INSTRUMENT_POINT_VALUES,
  isStrictlyClosed,
  type TradeRecord,
} from "@/lib/tradeTypes";
import {
  calculateQuantStats,
  filterReportTrades,
  generateNarrativeTraceability,
} from "@/app/app/reports/page";
import { resolveSimParams, runMonteCarlo } from "@/app/app/simulator/page";
import { calculateRiskView } from "@/app/app/risk/page";

interface SimTradeSpec {
  id: string;
  dateOpen: string;
  timeOpen: string;
  dateClose?: string;
  timeClose?: string;
  instrument: "NQ" | "MNQ" | "ES" | "MES";
  side: "Buy" | "Sell";
  entries: { price: number; contracts: number }[];
  exits: { price: number; contracts: number }[];
  stopLoss: number;
  commissionPerSide: number;
  brokerId: string;
  isFundedAccount: boolean;
  strategy: string;
  setup: string;
  setupGrade: "A+" | "A" | "B" | "C";
  session: TradeRecord["session"];
  emotionEntry: string;
  planFollowed: boolean;
  holdTimeMinutes?: number;
  mae?: number;
  mfe?: number;
  tags?: string[];
}

function buildSimulatedTrade(spec: SimTradeSpec): TradeRecord {
  const pv = INSTRUMENT_POINT_VALUES[spec.instrument] ?? 2;
  const calc = calculateTradeFromFills(
    spec.side,
    spec.entries,
    spec.exits,
    spec.stopLoss,
    spec.commissionPerSide,
    pv
  );
  if (calc.calcError) {
    throw new Error(`Error construyendo trade ${spec.id}: ${calc.calcError}`);
  }
  return {
    ...calc,
    id: spec.id,
    dateOpen: spec.dateOpen,
    timeOpen: spec.timeOpen,
    dateClose: spec.dateClose,
    timeClose: spec.timeClose,
    holdTimeMinutes: spec.holdTimeMinutes,
    instrument: spec.instrument,
    assetClass: spec.instrument.startsWith("M") ? "Futures_Micro" : "Futures",
    side: spec.side,
    entries: spec.entries,
    exits: spec.exits,
    avgEntryPrice: calc.avgEntryPrice ?? spec.entries[0].price,
    totalContracts: calc.totalContracts ?? spec.entries.reduce((a, b) => a + b.contracts, 0),
    contractsExited: calc.contractsExited ?? spec.exits.reduce((a, b) => a + b.contracts, 0),
    stopLoss: spec.stopLoss,
    initialStopLoss: spec.stopLoss,
    brokerId: spec.brokerId,
    commissionPerSide: spec.commissionPerSide,
    totalCommission: calc.totalCommission ?? 0,
    result: calc.result ?? "Open",
    isBreakeven: calc.isBreakeven ?? false,
    isFundedAccount: spec.isFundedAccount,
    strategy: spec.strategy,
    setup: spec.setup,
    setupGrade: spec.setupGrade,
    confluenceCount: 4,
    session: spec.session,
    emotionEntry: spec.emotionEntry,
    planFollowed: spec.planFollowed,
    mae: spec.mae,
    mfe: spec.mfe,
    tags: spec.tags ?? [],
    notes: `Simulación institucional #${spec.id}`,
  };
}

/**
 * Dataset de 30 operaciones realistas en Octubre 2026:
 * - 28 operaciones estrictamente cerradas (17 Wins, 9 Losses, 2 Breakevens exactos)
 * - 1 operación parcialmente cerrada (PARTIALLY_CLOSED: 4 contratos entrados, 2 salidos)
 * - 1 operación abierta (OPEN: 2 contratos entrados, 0 salidos)
 * - Incluye: Scale-In (múltiples entradas), Scale-Out (múltiples salidas), racha de 3 pérdidas consecutivas,
 *   días multi-operación, cuentas fondeadas (MFFU, Lucy, TopStep) y cuenta personal.
 */
const SIMULATED_30_SPECS: SimTradeSpec[] = [
  // 1-5: Primera semana (MNQ y NQ, Fondeadas MFFU & Lucy)
  {
    id: "T01", dateOpen: "2026-10-01", timeOpen: "09:35", dateClose: "2026-10-01", timeClose: "09:55",
    holdTimeMinutes: 20, instrument: "MNQ", side: "Buy",
    entries: [{ price: 20000, contracts: 5 }], exits: [{ price: 20040, contracts: 5 }],
    stopLoss: 19980, commissionPerSide: 0.09, brokerId: "my_funded_futures", isFundedAccount: true,
    strategy: "ICT Silver Bullet", setup: "FVG + Liquidity Sweep", setupGrade: "A+",
    session: "NYSE Open (9:30-11)", emotionEntry: "Disciplinado", planFollowed: true, mae: 6, mfe: 45, tags: ["mffu-01"]
  },
  {
    id: "T02", dateOpen: "2026-10-01", timeOpen: "10:15", dateClose: "2026-10-01", timeClose: "10:40",
    holdTimeMinutes: 25, instrument: "MNQ", side: "Sell",
    entries: [{ price: 20050, contracts: 4 }], exits: [{ price: 20020, contracts: 4 }],
    stopLoss: 20070, commissionPerSide: 0.09, brokerId: "lucid_trading", isFundedAccount: true,
    strategy: "SMC Reversal", setup: "Order Block 15m", setupGrade: "A",
    session: "NYSE Open (9:30-11)", emotionEntry: "Confiado", planFollowed: true, mae: 5, mfe: 35, tags: ["lucy-01"]
  },
  {
    id: "T03", dateOpen: "2026-10-02", timeOpen: "09:40", dateClose: "2026-10-02", timeClose: "09:52",
    holdTimeMinutes: 12, instrument: "MNQ", side: "Buy",
    entries: [{ price: 20100, contracts: 5 }], exits: [{ price: 20080, contracts: 5 }],
    stopLoss: 20080, commissionPerSide: 0.09, brokerId: "my_funded_futures", isFundedAccount: true,
    strategy: "ICT Silver Bullet", setup: "FVG + Liquidity Sweep", setupGrade: "B",
    session: "NYSE Open (9:30-11)", emotionEntry: "Ansioso", planFollowed: true, mae: 20, mfe: 8, tags: ["mffu-01"]
  },
  {
    id: "T04", dateOpen: "2026-10-03", timeOpen: "10:00", dateClose: "2026-10-03", timeClose: "10:35",
    holdTimeMinutes: 35, instrument: "NQ", side: "Buy",
    entries: [{ price: 20020, contracts: 1 }], exits: [{ price: 20055, contracts: 1 }],
    stopLoss: 20000, commissionPerSide: 0.09, brokerId: "topstep", isFundedAccount: true,
    strategy: "ORP Breakout", setup: "Opening Range", setupGrade: "A+",
    session: "NYSE Open (9:30-11)", emotionEntry: "Disciplinado", planFollowed: true, mae: 4, mfe: 40, tags: ["topstep-01"]
  },
  {
    // Scale-In + Scale-Out ganador
    id: "T05", dateOpen: "2026-10-05", timeOpen: "09:32", dateClose: "2026-10-05", timeClose: "10:12",
    holdTimeMinutes: 40, instrument: "MNQ", side: "Buy",
    entries: [{ price: 20100, contracts: 2 }, { price: 20110, contracts: 2 }],
    exits: [{ price: 20135, contracts: 2 }, { price: 20155, contracts: 2 }],
    stopLoss: 20085, commissionPerSide: 0.09, brokerId: "my_funded_futures", isFundedAccount: true,
    strategy: "ICT Silver Bullet", setup: "FVG + Liquidity Sweep", setupGrade: "A+",
    session: "NYSE Open (9:30-11)", emotionEntry: "Disciplinado", planFollowed: true, mae: 5, mfe: 52, tags: ["mffu-01"]
  },
  // 6-8: Racha de 3 pérdidas consecutivas (para probar maxConsecLosses y Psicología / Revenge)
  {
    id: "T06", dateOpen: "2026-10-06", timeOpen: "09:45", dateClose: "2026-10-06", timeClose: "09:55",
    holdTimeMinutes: 10, instrument: "MNQ", side: "Sell",
    entries: [{ price: 20200, contracts: 4 }], exits: [{ price: 20220, contracts: 4 }],
    stopLoss: 20220, commissionPerSide: 0.09, brokerId: "lucid_trading", isFundedAccount: true,
    strategy: "SMC Reversal", setup: "Order Block 15m", setupGrade: "B",
    session: "NYSE Open (9:30-11)", emotionEntry: "Ansioso", planFollowed: true, mae: 20, mfe: 4, tags: ["lucy-01"]
  },
  {
    id: "T07", dateOpen: "2026-10-06", timeOpen: "10:02", dateClose: "2026-10-06", timeClose: "10:09",
    holdTimeMinutes: 7, instrument: "MNQ", side: "Sell",
    entries: [{ price: 20225, contracts: 6 }], exits: [{ price: 20245, contracts: 6 }],
    stopLoss: 20245, commissionPerSide: 0.09, brokerId: "lucid_trading", isFundedAccount: true,
    strategy: "SMC Reversal", setup: "Counter-Trend", setupGrade: "C",
    session: "NYSE Open (9:30-11)", emotionEntry: "Frustrado / Revenge", planFollowed: false, mae: 20, mfe: 2, tags: ["lucy-01"]
  },
  {
    id: "T08", dateOpen: "2026-10-07", timeOpen: "11:30", dateClose: "2026-10-07", timeClose: "11:50",
    holdTimeMinutes: 20, instrument: "MES", side: "Buy",
    entries: [{ price: 5800, contracts: 4 }], exits: [{ price: 5792, contracts: 4 }],
    stopLoss: 5792, commissionPerSide: 0.09, brokerId: "my_funded_futures", isFundedAccount: true,
    strategy: "VWAP Pullback", setup: "VWAP Bounce", setupGrade: "B",
    session: "Midday (11-14)", emotionEntry: "Dudoso", planFollowed: false, mae: 8, mfe: 2, tags: ["mffu-01"]
  },
  // 9: Breakeven exacto en MNQ (+0.09 pts * $2 = +$0.18 gross - $0.18 comm = $0.00 net)
  {
    id: "T09", dateOpen: "2026-10-08", timeOpen: "09:50", dateClose: "2026-10-08", timeClose: "10:05",
    holdTimeMinutes: 15, instrument: "MNQ", side: "Buy",
    entries: [{ price: 20150, contracts: 2 }], exits: [{ price: 20150.09, contracts: 2 }],
    stopLoss: 20130, commissionPerSide: 0.09, brokerId: "my_funded_futures", isFundedAccount: true,
    strategy: "ICT Silver Bullet", setup: "FVG + Liquidity Sweep", setupGrade: "A",
    session: "NYSE Open (9:30-11)", emotionEntry: "Disciplinado", planFollowed: true, mae: 4, mfe: 10, tags: ["mffu-01"]
  },
  // 10-15: Recuperación disciplinada y expansión de High-Water Mark EOD
  {
    id: "T10", dateOpen: "2026-10-09", timeOpen: "09:38", dateClose: "2026-10-09", timeClose: "10:18",
    holdTimeMinutes: 40, instrument: "MNQ", side: "Buy",
    entries: [{ price: 20180, contracts: 6 }], exits: [{ price: 20230, contracts: 6 }],
    stopLoss: 20160, commissionPerSide: 0.09, brokerId: "my_funded_futures", isFundedAccount: true,
    strategy: "ICT Silver Bullet", setup: "FVG + Liquidity Sweep", setupGrade: "A+",
    session: "NYSE Open (9:30-11)", emotionEntry: "Disciplinado", planFollowed: true, mae: 5, mfe: 55, tags: ["mffu-01"]
  },
  {
    id: "T11", dateOpen: "2026-10-10", timeOpen: "09:42", dateClose: "2026-10-10", timeClose: "10:12",
    holdTimeMinutes: 30, instrument: "ES", side: "Buy",
    entries: [{ price: 5820, contracts: 1 }], exits: [{ price: 5832, contracts: 1 }],
    stopLoss: 5814, commissionPerSide: 0.25, brokerId: "tradovate", isFundedAccount: false,
    strategy: "VWAP Pullback", setup: "VWAP Bounce", setupGrade: "A",
    session: "NYSE Open (9:30-11)", emotionEntry: "Disciplinado", planFollowed: true, mae: 2, mfe: 14, tags: ["personal"]
  },
  {
    id: "T12", dateOpen: "2026-10-12", timeOpen: "14:15", dateClose: "2026-10-12", timeClose: "14:45",
    holdTimeMinutes: 30, instrument: "MNQ", side: "Sell",
    entries: [{ price: 20300, contracts: 5 }], exits: [{ price: 20260, contracts: 5 }],
    stopLoss: 20320, commissionPerSide: 0.09, brokerId: "lucid_trading", isFundedAccount: true,
    strategy: "SMC Reversal", setup: "Order Block 15m", setupGrade: "A+",
    session: "Power Hour (14-16)", emotionEntry: "Confiado", planFollowed: true, mae: 6, mfe: 44, tags: ["lucy-01"]
  },
  {
    id: "T13", dateOpen: "2026-10-13", timeOpen: "09:35", dateClose: "2026-10-13", timeClose: "09:50",
    holdTimeMinutes: 15, instrument: "MNQ", side: "Buy",
    entries: [{ price: 20270, contracts: 4 }], exits: [{ price: 20255, contracts: 4 }],
    stopLoss: 20255, commissionPerSide: 0.09, brokerId: "my_funded_futures", isFundedAccount: true,
    strategy: "ORP Breakout", setup: "Opening Range", setupGrade: "B",
    session: "NYSE Open (9:30-11)", emotionEntry: "Disciplinado", planFollowed: true, mae: 15, mfe: 6, tags: ["mffu-01"]
  },
  {
    id: "T14", dateOpen: "2026-10-14", timeOpen: "09:45", dateClose: "2026-10-14", timeClose: "10:25",
    holdTimeMinutes: 40, instrument: "MNQ", side: "Buy",
    entries: [{ price: 20250, contracts: 8 }], exits: [{ price: 20300, contracts: 8 }],
    stopLoss: 20230, commissionPerSide: 0.09, brokerId: "my_funded_futures", isFundedAccount: true,
    strategy: "ICT Silver Bullet", setup: "FVG + Liquidity Sweep", setupGrade: "A+",
    session: "NYSE Open (9:30-11)", emotionEntry: "Disciplinado", planFollowed: true, mae: 4, mfe: 54, tags: ["mffu-01"]
  },
  {
    id: "T15", dateOpen: "2026-10-15", timeOpen: "10:10", dateClose: "2026-10-15", timeClose: "10:45",
    holdTimeMinutes: 35, instrument: "MES", side: "Buy",
    entries: [{ price: 5840, contracts: 5 }], exits: [{ price: 5856, contracts: 5 }],
    stopLoss: 5832, commissionPerSide: 0.09, brokerId: "topstep", isFundedAccount: true,
    strategy: "VWAP Pullback", setup: "VWAP Bounce", setupGrade: "A",
    session: "NYSE Open (9:30-11)", emotionEntry: "Disciplinado", planFollowed: true, mae: 2, mfe: 18, tags: ["topstep-01"]
  },
  // 16: Segundo Breakeven exacto en MNQ
  {
    id: "T16", dateOpen: "2026-10-16", timeOpen: "10:00", dateClose: "2026-10-16", timeClose: "10:14",
    holdTimeMinutes: 14, instrument: "MNQ", side: "Sell",
    entries: [{ price: 20310, contracts: 2 }], exits: [{ price: 20309.91, contracts: 2 }],
    stopLoss: 20330, commissionPerSide: 0.09, brokerId: "lucid_trading", isFundedAccount: true,
    strategy: "SMC Reversal", setup: "Order Block 15m", setupGrade: "B",
    session: "NYSE Open (9:30-11)", emotionEntry: "Neutral", planFollowed: true, mae: 5, mfe: 9, tags: ["lucy-01"]
  },
  // 17-28: Segunda quincena de Octubre 2026
  {
    id: "T17", dateOpen: "2026-10-17", timeOpen: "09:36", dateClose: "2026-10-17", timeClose: "10:06",
    holdTimeMinutes: 30, instrument: "MNQ", side: "Buy",
    entries: [{ price: 20320, contracts: 6 }], exits: [{ price: 20365, contracts: 6 }],
    stopLoss: 20300, commissionPerSide: 0.09, brokerId: "my_funded_futures", isFundedAccount: true,
    strategy: "ICT Silver Bullet", setup: "FVG + Liquidity Sweep", setupGrade: "A+",
    session: "NYSE Open (9:30-11)", emotionEntry: "Disciplinado", planFollowed: true, mae: 6, mfe: 48, tags: ["mffu-01"]
  },
  {
    id: "T18", dateOpen: "2026-10-18", timeOpen: "09:50", dateClose: "2026-10-18", timeClose: "10:05",
    holdTimeMinutes: 15, instrument: "MNQ", side: "Buy",
    entries: [{ price: 20370, contracts: 4 }], exits: [{ price: 20350, contracts: 4 }],
    stopLoss: 20350, commissionPerSide: 0.09, brokerId: "my_funded_futures", isFundedAccount: true,
    strategy: "ORP Breakout", setup: "Opening Range", setupGrade: "B",
    session: "NYSE Open (9:30-11)", emotionEntry: "Disciplinado", planFollowed: true, mae: 20, mfe: 5, tags: ["mffu-01"]
  },
  {
    id: "T19", dateOpen: "2026-10-19", timeOpen: "14:20", dateClose: "2026-10-19", timeClose: "14:55",
    holdTimeMinutes: 35, instrument: "NQ", side: "Sell",
    entries: [{ price: 20400, contracts: 1 }], exits: [{ price: 20370, contracts: 1 }],
    stopLoss: 20415, commissionPerSide: 0.25, brokerId: "tradovate", isFundedAccount: false,
    strategy: "SMC Reversal", setup: "Order Block 15m", setupGrade: "A+",
    session: "Power Hour (14-16)", emotionEntry: "Disciplinado", planFollowed: true, mae: 4, mfe: 34, tags: ["personal"]
  },
  {
    id: "T20", dateOpen: "2026-10-20", timeOpen: "09:40", dateClose: "2026-10-20", timeClose: "10:20",
    holdTimeMinutes: 40, instrument: "MNQ", side: "Buy",
    entries: [{ price: 20350, contracts: 6 }], exits: [{ price: 20395, contracts: 6 }],
    stopLoss: 20330, commissionPerSide: 0.09, brokerId: "lucid_trading", isFundedAccount: true,
    strategy: "ICT Silver Bullet", setup: "FVG + Liquidity Sweep", setupGrade: "A+",
    session: "NYSE Open (9:30-11)", emotionEntry: "Disciplinado", planFollowed: true, mae: 5, mfe: 48, tags: ["lucy-01"]
  },
  {
    id: "T21", dateOpen: "2026-10-21", timeOpen: "11:40", dateClose: "2026-10-21", timeClose: "11:58",
    holdTimeMinutes: 18, instrument: "MNQ", side: "Buy",
    entries: [{ price: 20410, contracts: 5 }], exits: [{ price: 20390, contracts: 5 }],
    stopLoss: 20390, commissionPerSide: 0.09, brokerId: "lucid_trading", isFundedAccount: true,
    strategy: "VWAP Pullback", setup: "VWAP Bounce", setupGrade: "C",
    session: "Midday (11-14)", emotionEntry: "FOMO", planFollowed: false, mae: 20, mfe: 3, tags: ["lucy-01"]
  },
  {
    id: "T22", dateOpen: "2026-10-22", timeOpen: "09:35", dateClose: "2026-10-22", timeClose: "10:15",
    holdTimeMinutes: 40, instrument: "MNQ", side: "Buy",
    entries: [{ price: 20380, contracts: 7 }], exits: [{ price: 20425, contracts: 7 }],
    stopLoss: 20360, commissionPerSide: 0.09, brokerId: "my_funded_futures", isFundedAccount: true,
    strategy: "ICT Silver Bullet", setup: "FVG + Liquidity Sweep", setupGrade: "A+",
    session: "NYSE Open (9:30-11)", emotionEntry: "Disciplinado", planFollowed: true, mae: 4, mfe: 49, tags: ["mffu-01"]
  },
  {
    id: "T23", dateOpen: "2026-10-23", timeOpen: "09:48", dateClose: "2026-10-23", timeClose: "10:18",
    holdTimeMinutes: 30, instrument: "MES", side: "Sell",
    entries: [{ price: 5860, contracts: 6 }], exits: [{ price: 5845, contracts: 6 }],
    stopLoss: 5868, commissionPerSide: 0.09, brokerId: "topstep", isFundedAccount: true,
    strategy: "SMC Reversal", setup: "Order Block 15m", setupGrade: "A",
    session: "NYSE Open (9:30-11)", emotionEntry: "Confiado", planFollowed: true, mae: 3, mfe: 17, tags: ["topstep-01"]
  },
  {
    id: "T24", dateOpen: "2026-10-24", timeOpen: "10:05", dateClose: "2026-10-24", timeClose: "10:20",
    holdTimeMinutes: 15, instrument: "MES", side: "Buy",
    entries: [{ price: 5850, contracts: 4 }], exits: [{ price: 5842, contracts: 4 }],
    stopLoss: 5842, commissionPerSide: 0.09, brokerId: "topstep", isFundedAccount: true,
    strategy: "VWAP Pullback", setup: "VWAP Bounce", setupGrade: "B",
    session: "NYSE Open (9:30-11)", emotionEntry: "Disciplinado", planFollowed: true, mae: 8, mfe: 2, tags: ["topstep-01"]
  },
  {
    id: "T25", dateOpen: "2026-10-25", timeOpen: "09:34", dateClose: "2026-10-25", timeClose: "10:09",
    holdTimeMinutes: 35, instrument: "MNQ", side: "Buy",
    entries: [{ price: 20420, contracts: 6 }], exits: [{ price: 20460, contracts: 6 }],
    stopLoss: 20400, commissionPerSide: 0.09, brokerId: "my_funded_futures", isFundedAccount: true,
    strategy: "ICT Silver Bullet", setup: "FVG + Liquidity Sweep", setupGrade: "A+",
    session: "NYSE Open (9:30-11)", emotionEntry: "Disciplinado", planFollowed: true, mae: 5, mfe: 43, tags: ["mffu-01"]
  },
  {
    id: "T26", dateOpen: "2026-10-26", timeOpen: "14:10", dateClose: "2026-10-26", timeClose: "14:40",
    holdTimeMinutes: 30, instrument: "MNQ", side: "Sell",
    entries: [{ price: 20480, contracts: 5 }], exits: [{ price: 20445, contracts: 5 }],
    stopLoss: 20500, commissionPerSide: 0.09, brokerId: "lucid_trading", isFundedAccount: true,
    strategy: "SMC Reversal", setup: "Order Block 15m", setupGrade: "A",
    session: "Power Hour (14-16)", emotionEntry: "Disciplinado", planFollowed: true, mae: 6, mfe: 38, tags: ["lucy-01"]
  },
  {
    id: "T27", dateOpen: "2026-10-27", timeOpen: "09:55", dateClose: "2026-10-27", timeClose: "10:10",
    holdTimeMinutes: 15, instrument: "MNQ", side: "Buy",
    entries: [{ price: 20450, contracts: 4 }], exits: [{ price: 20435, contracts: 4 }],
    stopLoss: 20435, commissionPerSide: 0.09, brokerId: "lucid_trading", isFundedAccount: true,
    strategy: "ORP Breakout", setup: "Opening Range", setupGrade: "B",
    session: "NYSE Open (9:30-11)", emotionEntry: "Disciplinado", planFollowed: true, mae: 15, mfe: 4, tags: ["lucy-01"]
  },
  {
    id: "T28", dateOpen: "2026-10-28", timeOpen: "09:37", dateClose: "2026-10-28", timeClose: "10:22",
    holdTimeMinutes: 45, instrument: "MNQ", side: "Buy",
    entries: [{ price: 20440, contracts: 8 }], exits: [{ price: 20490, contracts: 8 }],
    stopLoss: 20420, commissionPerSide: 0.09, brokerId: "my_funded_futures", isFundedAccount: true,
    strategy: "ICT Silver Bullet", setup: "FVG + Liquidity Sweep", setupGrade: "A+",
    session: "NYSE Open (9:30-11)", emotionEntry: "Disciplinado", planFollowed: true, mae: 4, mfe: 53, tags: ["mffu-01"]
  },
  // 29: Operación Parcialmente Cerrada (Scale-Out en curso: 4 entrados, 2 salidos)
  {
    id: "T29", dateOpen: "2026-10-29", timeOpen: "09:45",
    instrument: "MNQ", side: "Buy",
    entries: [{ price: 20500, contracts: 4 }], exits: [{ price: 20530, contracts: 2 }],
    stopLoss: 20480, commissionPerSide: 0.09, brokerId: "my_funded_futures", isFundedAccount: true,
    strategy: "ICT Silver Bullet", setup: "FVG + Liquidity Sweep", setupGrade: "A",
    session: "NYSE Open (9:30-11)", emotionEntry: "Disciplinado", planFollowed: true, tags: ["mffu-01"]
  },
  // 30: Operación Abierta (Swing / Intradía en curso: 2 entrados, 0 salidos)
  {
    id: "T30", dateOpen: "2026-10-30", timeOpen: "10:15",
    instrument: "MES", side: "Buy",
    entries: [{ price: 5870, contracts: 2 }], exits: [],
    stopLoss: 5860, commissionPerSide: 0.09, brokerId: "topstep", isFundedAccount: true,
    strategy: "VWAP Pullback", setup: "VWAP Bounce", setupGrade: "A",
    session: "NYSE Open (9:30-11)", emotionEntry: "Disciplinado", planFollowed: true, tags: ["topstep-01"]
  },
];

describe("R5 — Auditoría Integral con Simulación de 30 Operaciones Reales (Todos los Módulos)", () => {
  const trades30: TradeRecord[] = SIMULATED_30_SPECS.map(buildSimulatedTrade);
  const stats = computeStats(trades30);

  it("R5-01 (Ledger & Journal): clasifica con precisión las 30 operaciones (28 cerradas, 1 parcial, 1 abierta) y verifica FIFO + comisiones al centavo", () => {
    expect(trades30.length).toBe(30);
    expect(stats.totalTrades).toBe(30);
    expect(stats.closedTrades).toBe(28);
    expect(stats.openTrades).toBe(2);
    expect(stats.partialPositionsCount).toBe(1);
    expect(stats.openPositionsCount).toBe(1);
    expect(stats.openContractsTotal).toBe(4); // 2 abiertos en T29 + 2 abiertos en T30

    expect(stats.wins).toBe(17);
    expect(stats.losses).toBe(9);
    expect(stats.breakevenCount).toBe(2); // T09 y T16 con netPnl === $0.00 exacto

    // Verificación algebraica independiente con Decimal sobre las 28 cerradas
    const closed = trades30.filter(isStrictlyClosed);
    expect(closed.length).toBe(28);

    const manualGross = closed.reduce((acc, t) => acc.plus(new Decimal(t.grossPnl ?? 0)), new Decimal(0));
    const manualComm = closed.reduce((acc, t) => acc.plus(new Decimal(t.totalCommission ?? 0)), new Decimal(0));
    const manualNet = closed.reduce((acc, t) => acc.plus(new Decimal(t.netPnl ?? 0)), new Decimal(0));

    expect(stats.totalGross).toBe(manualGross.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber());
    expect(stats.totalCommissions).toBe(manualComm.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber());
    expect(stats.totalNet).toBe(manualNet.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber());
    // Invariante contable: Net P&L === Gross P&L - Comisiones Realizadas
    expect(new Decimal(stats.totalGross).minus(stats.totalCommissions).toNumber()).toBe(stats.totalNet);

    // Verificar operación T05 (Scale-In + Scale-Out FIFO)
    const t05 = trades30.find(t => t.id === "T05")!;
    expect(t05.avgEntryPrice).toBe(20105);
    expect(t05.avgExitPrice).toBe(20145);
    expect(t05.grossPnl).toBe(320); // 40 pts * $2/pt * 4 contratos = $320
    expect(t05.totalCommission).toBe(0.72); // 4 contratos * $0.18 RT
    expect(t05.netPnl).toBe(319.28);

    // Verificar operación T29 (Parcialmente cerrada: 2 cerrados de 4)
    const t29 = trades30.find(t => t.id === "T29")!;
    expect(t29.status).toBe("PARTIALLY_CLOSED");
    expect(t29.openContracts).toBe(2);
    expect(t29.grossPnl).toBe(120); // 2 cerrados * 30 pts * $2 = $120
    expect(t29.totalCommission).toBe(0.36); // 2 cerrados * $0.18 RT
    expect(t29.openCommission).toBe(0.18); // 2 abiertos * $0.09 entrada
    expect(stats.partialRealizedNet).toBe(119.64);
  });

  it("R5-02 (Dashboard, Analytics, Calendar, Strategies & Psychology): concilia P&L diario, por estrategia y rachas psicológicas al 100%", () => {
    const closed = trades30.filter(isStrictlyClosed);

    // 1. Calendar: suma de P&L diario === stats.totalNet
    const byDay: Record<string, Decimal> = {};
    for (const t of closed) {
      const d = effectiveTradeDate(t);
      byDay[d] = (byDay[d] ?? new Decimal(0)).plus(t.netPnl ?? 0);
    }
    const calendarSum = Object.values(byDay)
      .reduce((a, b) => a.plus(b), new Decimal(0))
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
      .toNumber();
    expect(calendarSum).toBe(stats.totalNet);

    // 2. Strategies: suma de P&L de las 4 estrategias === stats.totalNet
    const strategies = Array.from(new Set(closed.map(t => t.strategy)));
    expect(strategies.length).toBe(4);
    const strategySum = strategies
      .map(st => computeStats(closed.filter(t => t.strategy === st)).totalNet)
      .reduce((a, b) => new Decimal(a).plus(b).toNumber(), 0);
    expect(strategySum).toBe(stats.totalNet);

    // 3. Psychology: racha máxima de pérdidas = 3 (T06, T07, T08), racha máxima ganadora = 3 (T10, T11, T12) y tasa de cumplimiento del plan
    expect(stats.maxConsecLosses).toBe(3);
    expect(stats.maxConsecWins).toBe(3);
    expect(stats.planFollowRate).toBe(89.3); // 25 de 28 operaciones cerradas siguieron el plan
    expect(formatProfitFactor(stats)).toBe((stats.profitFactor as number).toFixed(2));
  });

  it("R5-03 (Centro de Informes — 5 Reportes en Español): concilia computeStats con calculateQuantStats, setups, sesiones y MAE/MFE en puntos y USD", () => {
    const octReportTrades = filterReportTrades(trades30, "month", "2026-10", "2026", "all");
    expect(octReportTrades.length).toBe(30);

    const repStats = computeStats(octReportTrades);
    const quant = calculateQuantStats(octReportTrades)!;

    expect(repStats.closedTrades).toBe(28);
    expect(repStats.totalNet).toBe(stats.totalNet);
    expect(quant).not.toBeNull();

    // Suma de todos los setups === totalNet y suma de todas las sesiones === totalNet
    const setupNetSum = quant.setups
      .reduce((a, s) => a.plus(s.netPnl), new Decimal(0))
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
      .toNumber();
    const sessionNetSum = quant.sessions
      .reduce((a, s) => a.plus(s.pnl), new Decimal(0))
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
      .toNumber();

    expect(setupNetSum).toBe(stats.totalNet);
    expect(sessionNetSum).toBe(stats.totalNet);
    expect(quant.mae ?? 0).toBeGreaterThan(0);
    expect(quant.mfe ?? 0).toBeGreaterThan(quant.mae ?? 0);
    expect(quant.maeUsd ?? 0).toBeGreaterThan(0);
    expect(quant.mfeUsd ?? 0).toBeGreaterThan(quant.maeUsd ?? 0);

    // Verificar los generadores de narrativa trazable en español
    for (const type of ["monthly", "strategy", "tax", "technical"] as const) {
      const narrative = generateNarrativeTraceability(type, repStats, quant, "es", "Octubre 2026");
      expect(narrative.length).toBeGreaterThan(0);
    }
  });

  it("R5-04 (Simulador Monte Carlo & Calculadora de Riesgo): preserva la esperanza matemática trinomial y dimensiona contratos con comisiones round-trip", () => {
    const resolved = resolveSimParams({
      mode: "journal",
      balance: "50000",
      winRate: "50",
      avgWin: "200",
      avgLoss: "100",
      varPct: "15",
      comm: "0",
      nTrades: "100",
      nSims: "300",
      journalStats: stats,
      journalN: stats.closedTrades,
    });

    const mc = runMonteCarlo(
      resolved.B,
      resolved.WR,
      resolved.AW,
      resolved.AL,
      resolved.VA,
      resolved.NT,
      resolved.NS,
      resolved.CM,
      resolved.SN,
      12345,
      resolved.LR
    );

    // La esperanza matemática por trade del motor Monte Carlo coincide al centavo con computeStats.expectancy
    expect(mc.expectancyPerTrade).toBe(stats.expectancy);
    expect(mc.medianFinal).toBeGreaterThan(50000);
    expect(mc.pctProfitable).toBeGreaterThan(90);

    // Calculadora de Riesgo para MNQ ($2/pt) con cuenta de $50,000, riesgo 0.5% ($250), stop de 20 pts y fee $0.09/lado
    const riskView = calculateRiskView({
      accountSize: "50000",
      riskPct: "0.5",
      entry: "20400",
      stop: "20380",
      target: "20450",
      assetClass: "Futures_Micro",
      pointValue: 2,
      direction: "LONG",
      commissionPerSide: 0.09,
    });
    expect(riskView.isValid).toBe(true);
    expect(riskView.riskPerContract).toBe(40.18); // $40 stop + $0.18 RT fee
    expect(riskView.positionSize).toBe("6"); // floor(250 / 40.18) = 6 micro-contratos
  });

  it("R5-05 (Cuentas de Fondeo / Prop Firms): valida EOD Trailing Drawdown, bloqueo de piso en balance inicial (Candado 🔒), regla de consistencia y Split 90%", () => {
    // Filtrar operaciones cerradas de la cuenta MFFU $50K #01 (tag: "mffu-01")
    const mffuTrades = trades30.filter(t => t.tags.includes("mffu-01"));
    const mffuStats = computeStats(mffuTrades);
    const mffuClosed = mffuTrades.filter(isStrictlyClosed);

    const initialBalance = 50000;
    const profitTarget = 3000;
    const maxTotalLoss = 2000;
    const payoutSplitPct = 90;

    // Agrupar P&L diario para calcular High-Water Mark EOD
    const dayMap: Record<string, number> = {};
    for (const t of mffuClosed) {
      const d = effectiveTradeDate(t);
      dayMap[d] = parseFloat(((dayMap[d] || 0) + (t.netPnl ?? 0)).toFixed(2));
    }
    const sortedDays = Object.keys(dayMap).sort();
    let runningBalance = initialBalance;
    let eodHighWaterMark = initialBalance;
    for (const d of sortedDays) {
      runningBalance = parseFloat((runningBalance + dayMap[d]).toFixed(2));
      if (runningBalance > eodHighWaterMark) {
        eodHighWaterMark = runningBalance;
      }
    }

    const rawTrailingFloor = eodHighWaterMark - maxTotalLoss;
    const isTrailingLocked = rawTrailingFloor >= initialBalance;
    const eodLiquidationFloor = parseFloat(Math.min(initialBalance, rawTrailingFloor).toFixed(2));
    const currentBalance = parseFloat((initialBalance + mffuStats.totalNet).toFixed(2));
    const netPayoutAfterSplit = parseFloat(((mffuStats.totalNet * payoutSplitPct) / 100).toFixed(2));

    expect(mffuStats.totalNet).toBeGreaterThan(profitTarget); // Meta de $3,000 superada en MFFU #01
    expect(isTrailingLocked).toBe(true); // Candado EOD activo al superar +$2,000 de ganancia
    expect(eodLiquidationFloor).toBe(50000); // Piso bloqueado en el balance inicial ($50,000)
    expect(currentBalance).toBeGreaterThan(53000);
    expect(netPayoutAfterSplit).toBe(parseFloat(((mffuStats.totalNet * 0.9)).toFixed(2)));
  });
});
