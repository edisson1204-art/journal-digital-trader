import { describe, expect, it } from "vitest";
import {
  calculateTradeFromFills,
  calculateTrade,
  computeStats,
  INSTRUMENT_POINT_VALUES,
  type TradeRecord,
} from "@/lib/tradeTypes";
import {
  calculateQuantStats,
  filterReportTrades,
  generateNarrativeTraceability,
} from "@/app/app/reports/page";
import { resolveSimParams, runMonteCarlo } from "@/app/app/simulator/page";
import { calculateRiskView } from "@/app/app/risk/page";

function makeClosedTrade(params: {
  id: string;
  dateOpen: string;
  timeOpen?: string;
  dateClose: string;
  timeClose?: string;
  instrument: string;
  side: "Buy" | "Sell";
  contracts: number;
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  commissionPerSide: number;
  strategy?: string;
  setup?: string;
  session?: string;
  mae?: number;
  mfe?: number;
}): TradeRecord {
  const pv = INSTRUMENT_POINT_VALUES[params.instrument] ?? 2;
  const entries = [{ price: params.entryPrice, contracts: params.contracts }];
  const exits = [{ price: params.exitPrice, contracts: params.contracts }];
  const calc = calculateTradeFromFills(
    params.side,
    entries,
    exits,
    params.stopLoss,
    params.commissionPerSide,
    pv
  );
  return {
    ...calc,
    avgEntryPrice: calc.avgEntryPrice ?? params.entryPrice,
    totalContracts: calc.totalContracts ?? params.contracts,
    contractsExited: calc.contractsExited ?? params.contracts,
    totalCommission: calc.totalCommission ?? 0,
    result: calc.result ?? "Open",
    isBreakeven: calc.isBreakeven ?? false,
    id: params.id,
    dateOpen: params.dateOpen,
    timeOpen: params.timeOpen ?? "09:30",
    dateClose: params.dateClose,
    timeClose: params.timeClose ?? "10:00",
    instrument: params.instrument,
    assetClass: params.instrument.startsWith("M") ? "Futures_Micro" : "Futures",
    side: params.side,
    entries,
    exits,
    stopLoss: params.stopLoss,
    initialStopLoss: params.stopLoss,
    brokerId: "test-broker",
    isFundedAccount: false,
    strategy: params.strategy ?? "Trend",
    setup: params.setup ?? "Breakout",
    setupGrade: "A",
    confluenceCount: 3,
    session: (params.session ?? "NYSE Open (9:30-11)") as TradeRecord["session"],
    mae: params.mae,
    mfe: params.mfe,
    emotionEntry: "Disciplined",
    planFollowed: true,
    commissionPerSide: params.commissionPerSide,
    tags: [],
    notes: "",
  };
}

describe("R4 — Auditoría de Correlación Cruzada e Integridad Matemática (11 Sistemas)", () => {
  it("R4-REP-01: filterReportTrades filtra operaciones cerradas por fecha efectiva de cierre (dateClose || dateOpen)", () => {
    const crossMonthTrade = makeClosedTrade({
      id: "r4-cross-month",
      dateOpen: "2026-10-31",
      timeOpen: "15:50",
      dateClose: "2026-11-01",
      timeClose: "09:40",
      instrument: "MNQ",
      side: "Buy",
      contracts: 2,
      entryPrice: 20000,
      exitPrice: 20030,
      stopLoss: 19980,
      commissionPerSide: 0.5,
    });

    const octTrades = filterReportTrades([crossMonthTrade], "month", "2026-10", "2026", "all");
    const novTrades = filterReportTrades([crossMonthTrade], "month", "2026-11", "2026", "all");

    expect(octTrades.length).toBe(0);
    expect(novTrades.length).toBe(1);
    expect(computeStats(novTrades).totalNet).toBe(118);
  });

  it("R4-REP-02 & R4-REP-03: calculateQuantStats reporta MAE/MFE en puntos y en USD, sin truncar setups (>6) ni sesiones (>4) y con redondeo ROUND_HALF_UP", () => {
    const setupsList = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S1"];
    const sessionsList = ["Ses1", "Ses2", "Ses3", "Ses4", "Ses5", "Ses6"];
    const trades: TradeRecord[] = setupsList.map((s, idx) =>
      makeClosedTrade({
        id: `r4-s-${idx}`,
        dateOpen: "2026-10-15",
        dateClose: "2026-10-15",
        instrument: "NQ", // $20/pt
        side: "Buy",
        contracts: 1,
        entryPrice: 20000,
        exitPrice: idx === 9 ? 19998 : 20010,
        stopLoss: 19990,
        commissionPerSide: 1.5,
        setup: s,
        session: sessionsList[idx % sessionsList.length],
        mae: 5, // 5 pts * $20 * 1 = $100 USD
        mfe: 12, // 12 pts * $20 * 1 = $240 USD
      })
    );

    const stats = computeStats(trades);
    const quant = calculateQuantStats(trades)!;

    expect(quant.setups.length).toBe(9);
    expect(quant.sessions.length).toBe(6);
    expect(quant.mae).toBe(5);
    expect(quant.mfe).toBe(12);
    expect(quant.maeUsd).toBe(100);
    expect(quant.mfeUsd).toBe(240);
    expect(quant.riskOfRuin).toBe(0);

    const setupsSum = Number(quant.setups.reduce((acc, s) => acc + s.netPnl, 0).toFixed(2));
    const sessionsSum = Number(quant.sessions.reduce((acc, s) => acc + s.pnl, 0).toFixed(2));
    expect(setupsSum).toBe(stats.totalNet);
    expect(sessionsSum).toBe(stats.totalNet);

    const techNarrative = generateNarrativeTraceability("technical", stats, quant, "es", "Octubre 2026")
      .map(x => x.text)
      .join(" ");
    expect(techNarrative).toContain("5 pts (-$100.00)");
    expect(techNarrative).toContain("12 pts (+$240.00)");
  });

  it("R4-SIM-01: resolveSimParams y runMonteCarlo modelan distribución trinomial (Win / Loss / Breakeven) coincidiendo al centavo con computeStats.expectancy", () => {
    const winTrade = makeClosedTrade({
      id: "r4-sim-win",
      dateOpen: "2026-10-10",
      dateClose: "2026-10-10",
      instrument: "MNQ",
      side: "Buy",
      contracts: 1,
      entryPrice: 20000,
      exitPrice: 20050, // +$100 gross, -$1 comm = +$99 net
      stopLoss: 19980,
      commissionPerSide: 0.5,
    });
    const lossTrade = makeClosedTrade({
      id: "r4-sim-loss",
      dateOpen: "2026-10-11",
      dateClose: "2026-10-11",
      instrument: "MNQ",
      side: "Buy",
      contracts: 1,
      entryPrice: 20000,
      exitPrice: 19985, // -$30 gross, -$1 comm = -$31 net
      stopLoss: 19980,
      commissionPerSide: 0.5,
    });
    const beTrade = makeClosedTrade({
      id: "r4-sim-be",
      dateOpen: "2026-10-12",
      dateClose: "2026-10-12",
      instrument: "MNQ",
      side: "Buy",
      contracts: 1,
      entryPrice: 20000,
      exitPrice: 20000.5, // +$1 gross, -$1 comm = $0.00 net (Breakeven exacto)
      stopLoss: 19980,
      commissionPerSide: 0.5,
    });

    const stats = computeStats([winTrade, lossTrade, beTrade]);
    expect(stats.breakevenCount).toBe(1);
    expect(stats.totalNet).toBe(68);
    expect(stats.expectancy).toBe(22.67);

    const resolved = resolveSimParams({
      mode: "journal",
      balance: "10000",
      winRate: "50",
      avgWin: "100",
      avgLoss: "50",
      varPct: "0",
      comm: "0",
      nTrades: "50",
      nSims: "200",
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
      42,
      resolved.LR
    );

    expect(mc.expectancyPerTrade).toBe(stats.expectancy);
  });

  it("R4-RSK-01 & R4-LED-01: calculateRiskView rechaza pointValue <= 0, integra comisión round-trip y calculateTrade preserva invariantes de posición abierta", () => {
    const badPv = calculateRiskView({
      accountSize: "50000",
      riskPct: "1",
      entry: "20000",
      stop: "19990",
      target: "20020",
      assetClass: "Futures",
      pointValue: 0,
      direction: "LONG",
    });
    expect(badPv.isValid).toBe(false);

    const withFees = calculateRiskView({
      accountSize: "50000",
      riskPct: "1",
      entry: "20000",
      stop: "19990",
      target: "20020",
      assetClass: "Futures_Micro",
      pointValue: 2,
      direction: "LONG",
      commissionPerSide: 0.5,
    });
    expect(withFees.riskPerContract).toBe(21); // $20 stop + $1 round-trip comm
    expect(withFees.positionSize).toBe("23"); // floor(500 / 21)

    const legacyOpen = calculateTrade("Buy", 20000, undefined, 19980, 2, 0.5, 2, 0);
    expect(legacyOpen.status).toBe("OPEN");
    expect(legacyOpen.openContracts).toBe(2);
    expect(legacyOpen.openCommission).toBe(1);
    expect(legacyOpen.accruedCommission).toBe(1);
  });

  it("R4-REP-04: Conciliación 1:1 entre computeStats y calculateQuantStats ante registros históricos de Supabase y fechas dateClose < dateOpen", () => {
    const t1 = makeClosedTrade({
      id: "legacy-1",
      dateOpen: "2026-10-14",
      dateClose: "2026-04-25", // Fecha de cierre anterior a apertura (error de captura histórica)
      instrument: "MNQ",
      side: "Buy",
      contracts: 3,
      entryPrice: 25500,
      exitPrice: 25560,
      stopLoss: 25450,
      commissionPerSide: 0.09,
    });
    const t2Legacy = {
      ...makeClosedTrade({
        id: "legacy-2",
        dateOpen: "2026-10-06",
        dateClose: "2026-10-06",
        instrument: "MNQ",
        side: "Sell",
        contracts: 2,
        entryPrice: 29990,
        exitPrice: 29930,
        stopLoss: 30050,
        commissionPerSide: 0.09,
      }),
      totalContracts: 2,
      contractsExited: 1,
      openContracts: undefined,
      status: undefined,
      result: "Win" as const,
      netPnl: 239.64,
      grossPnl: 240,
      totalCommission: 0.36,
    };

    const filtered = filterReportTrades([t1, t2Legacy], "month", "2026-10", "2026", "all");
    expect(filtered.length).toBe(2);

    const stats = computeStats(filtered);
    const quant = calculateQuantStats(filtered)!;

    expect(stats.closedTrades).toBe(2);
    expect(quant.longCount + quant.shortCount).toBe(stats.closedTrades);
    expect(quant.efficiencyActive).toBe(stats.totalNet);
    expect(Number((quant.longPnl + quant.shortPnl).toFixed(2))).toBe(stats.totalNet);
    expect(Number(quant.assets.reduce((a, x) => a + x.netPnl, 0).toFixed(2))).toBe(stats.totalNet);
    expect(Number(quant.setups.reduce((a, x) => a + x.netPnl, 0).toFixed(2))).toBe(stats.totalNet);
    expect(Number(quant.emotions.reduce((a, x) => a + x.pnl, 0).toFixed(2))).toBe(stats.totalNet);
  });
});
