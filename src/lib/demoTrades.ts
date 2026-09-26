/**
 * TRADING INTELLIGENCE — Demo Trade Dataset
 * 105 trades deterministicos (seed 42) — 3 meses Jun-Sep 2025
 * Distribucion realista para traders de futuros US (NQ, ES, MNQ, MES, Gold)
 */

import type {
  TradeRecord, AssetClass, TradeSide, TradeResult,
  TradingSession, SetupGrade,
} from "./tradeTypes";
import { calculateTrade } from "./tradeTypes";

/* ── Seeded Linear Congruential Generator (deterministic) ── */
function makeLCG(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const rng  = makeLCG(42);
const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
const between = (a: number, b: number) => a + rng() * (b - a);
const jitter  = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

/* ── Parámetros por instrumento ── */
const INSTRUMENTS = [
  { sym:"NQ",    asset:"Futures" as AssetClass, base:18500, slRange:[15,55], rrRange:[1.5,4.5], pipVal:1, contracts:1, broker:"ninjatrader_lease", commPerSide:0.09 },
  { sym:"ES",    asset:"Futures" as AssetClass, base:5180,  slRange:[8,25],  rrRange:[1.5,4.0], pipVal:1, contracts:2, broker:"tradovate",         commPerSide:0.25 },
  { sym:"MNQ",   asset:"Futures" as AssetClass, base:18500, slRange:[20,60], rrRange:[1.2,3.5], pipVal:1, contracts:3, broker:"ninjatrader_lease", commPerSide:0.09 },
  { sym:"MES",   asset:"Futures" as AssetClass, base:5180,  slRange:[10,30], rrRange:[1.2,3.0], pipVal:1, contracts:4, broker:"ninjatrader_lease", commPerSide:0.09 },
  { sym:"GC",    asset:"Futures" as AssetClass, base:2320,  slRange:[5,20],  rrRange:[1.5,4.0], pipVal:1, contracts:1, broker:"interactive_brokers",commPerSide:0.85 },
];

const STRATEGIES = [
  "Breakout EMA200","VWAP Reclaim","ICT Order Block","Mean Reversion",
  "London Open Break","Gap Fill","5-min Scalp VWAP","SMC Order Block",
];

const SESSIONS: TradingSession[] = [
  "NYSE Open (9:30-11)","NYSE Open (9:30-11)","NYSE Open (9:30-11)",
  "Midday (11-14)","Power Hour (14-16)","London Open","Pre-Market",
];

const EMOTIONS_ENTRY = [
  "Confident","Confident","Focused","Focused","Calm","Patient","Neutral",
  "Anxious","Overconfident","Impatient","Frustrated",
];

const EMOTIONS_EXIT = [
  "Confident","Focused","Calm","Neutral","Frustrated","Anxious",
];

const SETUPS = [
  "EMA200 breakout + volume confirmation","VWAP reclaim candle close",
  "Order block at discount zone","FVG + order block confluence",
  "Mean reversion to VWAP","London session breakout","Gap fill setup",
  "SMC liquidity sweep + entry","HTF supply/demand zone","Trend continuation pullback",
];

const GRADES: SetupGrade[] = ["A+","A","A","B","B","C"];

const MISTAKES = [
  undefined,undefined,undefined,undefined,
  "Early entry","Moved stop loss","FOMO","Didn't take TP",
];

const TAGS_POOL = [
  "plan-followed","high-conviction","confluence","trend-day",
  "range-day","gap-fill","scaled-in","partial-exit","runner","FOMO","revenge",
];

const NOTES = [
  "Good execution, waited for confirmation.",
  "Entered slightly early but SL held.",
  "Clean breakout with volume spike.",
  "Hit TP1, moved to breakeven.",
  "Tight stop, quick reversal.",
  "Perfect setup, plan followed.",
  "Market reversed unexpectedly.",
  "Overtraded — should have stopped earlier.",
  "Great read on market structure.",
  "Took partial at TP1, runner still open.",
  "Gap fill played out exactly as planned.",
  "Slow grind, patience paid off.",
  "News event accelerated the move.",
  "Missed TP by 2 points, breakeven exit.",
];

/* ── Trading day generator (skip weekends) ── */
function tradingDays(startISO: string, count: number): string[] {
  const days: string[] = [];
  const cur = new Date(startISO);
  while (days.length < count) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) days.push(cur.toISOString().split("T")[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

/* ── Build 105 trades ── */
function buildTrades(): TradeRecord[] {
  const trades: TradeRecord[] = [];

  // Strategy clusters — each with its own WR, avg win/loss character
  const clusters = [
    { strategy:"Breakout EMA200",    count:22, wr:0.72, avgWinMult:2.4, avgLossMult:1.0 },
    { strategy:"VWAP Reclaim",       count:18, wr:0.61, avgWinMult:2.0, avgLossMult:1.0 },
    { strategy:"ICT Order Block",    count:15, wr:0.73, avgWinMult:2.8, avgLossMult:1.0 },
    { strategy:"5-min Scalp VWAP",   count:20, wr:0.50, avgWinMult:1.3, avgLossMult:1.0 },
    { strategy:"Mean Reversion",     count:12, wr:0.58, avgWinMult:1.8, avgLossMult:1.0 },
    { strategy:"London Open Break",  count:10, wr:0.60, avgWinMult:2.2, avgLossMult:1.0 },
    { strategy:"Gap Fill",           count:8,  wr:0.62, avgWinMult:1.6, avgLossMult:1.0 },
  ];

  const allDays = tradingDays("2025-06-02", 90);
  let dayIdx = 0;
  let tradeIdx = 0;

  for (const cluster of clusters) {
    for (let ci = 0; ci < cluster.count; ci++) {
      const ins    = pick(INSTRUMENTS);
      const side: TradeSide = rng() > 0.5 ? "Buy" : "Sell";
      const isWin  = rng() < cluster.wr;

      // Base stop distance from instrument range
      const slDist = jitter(
        between(ins.slRange[0], ins.slRange[1]),
        0.2
      );

      // Entry price with small daily drift
      const entryPrice = jitter(ins.base, 0.012);

      // TP distance = rrRange * slDist * winMult
      const rrAchieved = isWin
        ? jitter(between(ins.rrRange[0], ins.rrRange[1]) * cluster.avgWinMult / 2, 0.3)
        : jitter(between(0.7, 1.0), 0.15);

      const tpDist    = slDist * rrAchieved;
      const stopLoss  = side === "Buy"  ? entryPrice - slDist : entryPrice + slDist;
      const exitPrice = isWin
        ? (side === "Buy"  ? entryPrice + tpDist : entryPrice - tpDist)
        : (side === "Buy"  ? entryPrice - slDist * rrAchieved : entryPrice + slDist * rrAchieved);

      const hhmm = (h: number, m: number) => `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
      const entryHour = pick([9, 9, 9, 10, 10, 11, 14]);
      const entryMin  = Math.floor(rng() * 60);
      const holdMin   = Math.round(between(3, 180));
      const exitDate  = allDays[Math.min(dayIdx, allDays.length - 1)];
      const dateOpen  = allDays[Math.min(dayIdx, allDays.length - 1)];

      const commPerSide = ins.commPerSide;
      const calc = calculateTrade(
        side, entryPrice, exitPrice, stopLoss,
        ins.contracts, commPerSide, ins.pipVal
      );

      const result: TradeResult =
        (calc.netPnl ?? 0) > 0.01  ? "Win" :
        (calc.netPnl ?? 0) < -0.01 ? "Loss" : "Breakeven";

      const planFollowed = rng() > 0.22;
      const mistakeType  = !planFollowed ? pick(MISTAKES.filter(Boolean) as string[]) : undefined;

      const tradeTags = [
        planFollowed ? "plan-followed" : "ignored-plan",
        ...Array.from({ length: Math.floor(rng() * 2) + 1 }, () => pick(TAGS_POOL)),
      ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4);

      const grade = isWin && planFollowed ? pick(["A+","A","A","B"] as SetupGrade[]) :
                    isWin                  ? pick(["A","B","B","C"] as SetupGrade[]) :
                    planFollowed           ? pick(["B","C","C"] as SetupGrade[]) :
                                             pick(["C","D"] as SetupGrade[]);

      trades.push({
        id:              `demo-${String(tradeIdx).padStart(3,"0")}`,
        assetClass:      ins.asset,
        instrument:      ins.sym,
        side,
        dateOpen,
        timeOpen:        hhmm(entryHour, entryMin),
        dateClose:       exitDate,
        timeClose:       hhmm(entryHour + Math.floor(holdMin / 60), (entryMin + holdMin) % 60),
        holdTimeMinutes: holdMin,
        session:         pick(SESSIONS),
        entries:         [{ price: parseFloat(entryPrice.toFixed(2)), contracts: ins.contracts }],
        avgEntryPrice:   parseFloat(entryPrice.toFixed(2)),
        totalContracts:  ins.contracts,
        stopLoss:        parseFloat(stopLoss.toFixed(2)),
        takeProfit:      parseFloat((side === "Buy" ? entryPrice + tpDist : entryPrice - tpDist).toFixed(2)),
        exits:           [{ price: parseFloat(exitPrice.toFixed(2)), contracts: ins.contracts }],
        avgExitPrice:    parseFloat(exitPrice.toFixed(2)),
        contractsExited: ins.contracts,
        brokerId:        ins.broker,
        commissionPerSide: commPerSide,
        totalCommission: parseFloat(((calc.totalCommission) ?? 0).toFixed(2)),
        grossPnl:        parseFloat(((calc.grossPnl) ?? 0).toFixed(2)),
        netPnl:          parseFloat(((calc.netPnl) ?? 0).toFixed(2)),
        pnlPerContract:  parseFloat(((calc.pnlPerContract) ?? 0).toFixed(2)),
        rMultiple:       parseFloat(((calc.rMultiple) ?? 0).toFixed(2)),
        result,
        isBreakeven:     result === "Breakeven",
        strategy:        cluster.strategy,
        setup:           pick(SETUPS),
        setupGrade:      grade,
        planFollowed,
        isFundedAccount: rng() > 0.35,
        emotionEntry:    pick(EMOTIONS_ENTRY),
        emotionExit:     pick(EMOTIONS_EXIT),
        confluenceCount: Math.round(between(1, 5)),
        mistakeType,
        tags:            tradeTags,
        notes:           pick(NOTES),
        mae:             isWin ? parseFloat((slDist * rng() * 0.6).toFixed(2)) : parseFloat((slDist * (0.8 + rng() * 0.3)).toFixed(2)),
        mfe:             isWin ? parseFloat((tpDist * (0.9 + rng() * 0.2)).toFixed(2)) : parseFloat((slDist * rng() * 0.4).toFixed(2)),
      });

      tradeIdx++;
      // Advance day every 1-3 trades (realistic trade frequency)
      if (rng() > 0.55) dayIdx++;
    }
    dayIdx++; // gap between strategy clusters
  }

  // Sort chronologically
  return trades.sort((a, b) => a.dateOpen.localeCompare(b.dateOpen));
}

export const DEMO_TRADES: TradeRecord[] = buildTrades();
