import { describe, expect, it } from "vitest";
import { calculateTradeFromFills, computeStats, TradeRecord } from "@/lib/tradeTypes";
import { resolveSimParams, runMonteCarlo } from "@/app/app/simulator/page";
import { calculateQuantStats, generateNarrativeTraceability } from "@/app/app/reports/page";

function makeMNQTrade(opts: {
  id: string;
  dateOpen: string;
  timeOpen: string;
  side: "Buy" | "Sell";
  contracts: number;
  entryPrice: number;
  exitPrice?: number;
  stopLoss: number;
  takeProfit: number;
  commissionPerSide: number;
  strategy?: string;
  setup?: string;
  session?: TradeRecord["session"];
  holdTimeMinutes?: number;
  mae?: number;
  mfe?: number;
  emotionEntry?: string;
  planFollowed?: boolean;
}): TradeRecord {
  const pv = 2; // MNQ $2/pt
  const entries = [{ price: opts.entryPrice, contracts: opts.contracts, time: opts.timeOpen }];
  const exits = opts.exitPrice !== undefined
    ? [{ price: opts.exitPrice, contracts: opts.contracts, time: opts.timeOpen }]
    : [];
  const calc = calculateTradeFromFills(opts.side, entries, exits, opts.stopLoss, opts.commissionPerSide, pv);

  return {
    id: opts.id,
    dateOpen: opts.dateOpen,
    timeOpen: opts.timeOpen,
    instrument: "MNQ",
    assetClass: "Futures_Micro",
    side: opts.side,
    entries,
    exits,
    totalContracts: opts.contracts,
    contractsExited: exits.reduce((s, e) => s + e.contracts, 0),
    avgEntryPrice: opts.entryPrice,
    avgExitPrice: opts.exitPrice,
    stopLoss: opts.stopLoss,
    initialStopLoss: opts.stopLoss,
    takeProfit: opts.takeProfit,
    grossPnl: calc.grossPnl ?? undefined,
    totalCommission: calc.totalCommission,
    netPnl: calc.netPnl ?? undefined,
    rMultiple: calc.rMultiple ?? undefined,
    grossRMultiple: calc.grossRMultiple ?? undefined,
    initialRiskMoney: calc.initialRiskMoney ?? undefined,
    result: calc.result,
    brokerId: "tradovate",
    isFundedAccount: true,
    strategy: opts.strategy ?? "ORB",
    setup: opts.setup ?? "Breakout",
    session: opts.session ?? "NY Open",
    holdTimeMinutes: opts.holdTimeMinutes,
    mae: opts.mae,
    mfe: opts.mfe,
    emotionEntry: (opts.emotionEntry as any) ?? "Calm",
    planFollowed: opts.planFollowed ?? true,
    tags: [],
    notes: "",
  };
}

describe("Ronda 3 — Auditoría Intrínseca Integral (Matemática, Estadística y Correlación)", () => {
  it("SIM-R3-01: El Simulador en modo 'journal' no descuenta comisiones por duplicado y su expectativa coincide al centavo con computeStats.expectancy", () => {
    const trades: TradeRecord[] = [
      makeMNQTrade({
        id: "r3-t1",
        dateOpen: "2026-10-10",
        timeOpen: "09:30",
        side: "Buy",
        contracts: 2,
        entryPrice: 20000,
        exitPrice: 20050,
        stopLoss: 19975,
        takeProfit: 20050,
        commissionPerSide: 0.62, // 4 lados * 0.62 = $2.48
      }),
      makeMNQTrade({
        id: "r3-t2",
        dateOpen: "2026-10-11",
        timeOpen: "10:00",
        side: "Sell",
        contracts: 2,
        entryPrice: 20100,
        exitPrice: 20050,
        stopLoss: 20125,
        takeProfit: 20050,
        commissionPerSide: 0.62,
      }),
      makeMNQTrade({
        id: "r3-t3",
        dateOpen: "2026-10-12",
        timeOpen: "10:30",
        side: "Buy",
        contracts: 2,
        entryPrice: 20000,
        exitPrice: 19975,
        stopLoss: 19975,
        takeProfit: 20050,
        commissionPerSide: 0.62,
      }),
    ];

    const stats = computeStats(trades);
    // Win 1: +$200 - $2.48 = +$197.52
    // Win 2: +$200 - $2.48 = +$197.52
    // Loss 1: -$100 - $2.48 = -$102.48
    // Total Net = +$292.56, Expectancy = 292.56 / 3 = +$97.52
    expect(stats.totalNet).toBe(292.56);
    expect(stats.expectancy).toBe(97.52);

    const resolved = resolveSimParams({
      mode: "journal",
      balance: "10000",
      winRate: "50",
      avgWin: "200",
      avgLoss: "100",
      varPct: "40",
      comm: "5",
      nTrades: "100",
      nSims: "200",
      journalStats: stats,
      journalN: stats.closedTrades,
    });

    // En modo journal, avgWin y avgLoss ya son netos de comisiones; CM debe ser 0 para no restar dos veces
    expect(resolved.CM).toBe(0);
    expect(resolved.journalAvgComm).toBeCloseTo(2.48, 2);

    const liveExp = (resolved.WR / 100) * (resolved.AW - resolved.CM) - (1 - resolved.WR / 100) * (resolved.AL + resolved.CM);
    expect(liveExp).toBeCloseTo(stats.expectancy, 6);

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
      42
    );
    expect(mc.expectancyPerTrade).toBeCloseTo(stats.expectancy, 2);
  });

  it("SIM-R3-02: Sharpe por trade es invariante al número de operaciones N del horizonte y expone horizonSharpe por separado", () => {
    const mc50 = runMonteCarlo(10000, 60, 200, 100, 0, 50, 100, 0, null, 7);
    const mc200 = runMonteCarlo(10000, 60, 200, 100, 0, 200, 100, 0, null, 7);

    expect(mc50.sharpeRatio).not.toBeNull();
    expect(mc200.sharpeRatio).not.toBeNull();
    // El Sharpe por trade (E[X] / SD[X]) debe ser idéntico para N=50 y N=200
    expect(mc50.sharpeRatio).toBe(mc200.sharpeRatio);
    // Mientras que horizonSharpe escala con sqrt(N): sqrt(200)/sqrt(50) = 2x
    expect(mc200.horizonSharpe).toBeCloseTo((mc50.horizonSharpe ?? 0) * 2, 1);
  });

  it("REP-R3-03 & REP-R3-04: calculateQuantStats preserva precisión de 2 decimales sin truncar centavos con Math.round", () => {
    const trades = [
      makeMNQTrade({
        id: "r3-t4",
        dateOpen: "2026-10-14",
        timeOpen: "09:35",
        side: "Buy",
        contracts: 1,
        entryPrice: 20000,
        exitPrice: 20010.25,
        stopLoss: 19990,
        takeProfit: 20020,
        commissionPerSide: 0.67, // 2 lados * 0.67 = $1.34
        strategy: "Scalp",
        setup: "ORB-5m",
        session: "NY Open",
        holdTimeMinutes: 8,
        mae: 12.75,
        mfe: 28.5,
      }),
    ];

    const stats = computeStats(trades);
    const quant = calculateQuantStats(trades);
    expect(quant).not.toBeNull();
    // Gross = (20010.25 - 20000) * 1 * 2 = $20.50; Net = 20.50 - 1.34 = $19.16
    expect(stats.totalNet).toBe(19.16);
    expect(quant!.bestAssetPnl).toBe(19.16);
    expect(quant!.worstAssetPnl).toBe(19.16);
    expect(quant!.efficiencyActive).toBe(19.16);
    expect(quant!.mae).toBe(12.75);
    expect(quant!.mfe).toBe(28.5);
    expect(quant!.setups[0].expectancy).toBe(19.16);
    expect(quant!.setups[0].netPnl).toBe(19.16);
    expect(quant!.sessions[0].pnl).toBe(19.16);
    expect(quant!.holdingTimes[0].pnl).toBe(19.16);

    const stratNarrative = generateNarrativeTraceability("strategy", stats, quant, "es", "Octubre 2026");
    const topSetupEntry = stratNarrative.find(e => e.ruleId === "STRAT-TOP-01");
    expect(topSetupEntry?.text).toContain("Expectativa: +$19.16");
  });

  it("ANA-R3-05: Las métricas de Analítica se correlacionan con el subconjunto filtrado por período en lugar del histórico global", () => {
    const oldTrade = makeMNQTrade({
      id: "r3-old",
      dateOpen: "2025-01-10",
      timeOpen: "09:30",
      side: "Buy",
      contracts: 1,
      entryPrice: 20000,
      exitPrice: 20100, // +$200 gross
      stopLoss: 19980,
      takeProfit: 20100,
      commissionPerSide: 0.5,
    });
    const recentTrade = makeMNQTrade({
      id: "r3-recent",
      dateOpen: "2026-10-15",
      timeOpen: "09:30",
      side: "Buy",
      contracts: 1,
      entryPrice: 20000,
      exitPrice: 19980, // -$40 gross
      stopLoss: 19980,
      takeProfit: 20040,
      commissionPerSide: 0.5,
    });

    const allStats = computeStats([oldTrade, recentTrade]);
    const periodFiltered = [oldTrade, recentTrade].filter(t => t.dateOpen >= "2026-09-17");
    const periodStats = computeStats(periodFiltered);

    expect(allStats.totalNet).toBe(158); // +199 - 41
    expect(periodStats.totalNet).toBe(-41);
    expect(periodStats.closedTrades).toBe(1);
    expect(periodStats.winRate).toBe(0);
  });

  it("PSY-R3-07: La detección de Revenge Trading evalúa la secuencia cronológica ascendente (antiguo -> reciente)", () => {
    // Escenario: T1 (09:30) es Win con 2 contratos; T2 (10:00) es Loss con 1 contrato.
    // En el store (más reciente primero), el array está como [T2 (Loss, 1c), T1 (Win, 2c)].
    // Cronológicamente T1 -> T2 el trader REDUJO contratos de 2 a 1 tras ganar, y luego perdió con 1. NO hubo Revenge Trading.
    const t1OldWin = makeMNQTrade({
      id: "r3-seq-1",
      dateOpen: "2026-10-15",
      timeOpen: "09:30",
      side: "Buy",
      contracts: 2,
      entryPrice: 20000,
      exitPrice: 20020,
      stopLoss: 19990,
      takeProfit: 20020,
      commissionPerSide: 0.5,
    });
    const t2NewLoss = makeMNQTrade({
      id: "r3-seq-2",
      dateOpen: "2026-10-15",
      timeOpen: "10:00",
      side: "Buy",
      contracts: 1,
      entryPrice: 20000,
      exitPrice: 19990,
      stopLoss: 19990,
      takeProfit: 20020,
      commissionPerSide: 0.5,
    });

    const storeOrder = [t2NewLoss, t1OldWin]; // Orden inverso por defecto del store
    const chronological = [...storeOrder]
      .filter(t => t.result !== "Open")
      .sort((a, b) => `${a.dateOpen}T${a.timeOpen || "00:00"}`.localeCompare(`${b.dateOpen}T${b.timeOpen || "00:00"}`));

    let revengeCount = 0;
    for (let i = 1; i < chronological.length; i++) {
      if (chronological[i - 1].result === "Loss" && chronological[i].totalContracts > chronological[i - 1].totalContracts * 1.3) {
        revengeCount++;
      }
    }
    expect(revengeCount).toBe(0);
  });

  it("JOU-R3-09: El ordenamiento de Journal por netPnl envía las operaciones abiertas (undefined) al final sin intercalarlas en $0 entre ganancias y pérdidas", () => {
    const winTrade = makeMNQTrade({
      id: "r3-sort-win",
      dateOpen: "2026-10-15",
      timeOpen: "09:30",
      side: "Buy",
      contracts: 1,
      entryPrice: 20000,
      exitPrice: 20020,
      stopLoss: 19990,
      takeProfit: 20020,
      commissionPerSide: 0.5,
    });
    const lossTrade = makeMNQTrade({
      id: "r3-sort-loss",
      dateOpen: "2026-10-15",
      timeOpen: "10:00",
      side: "Buy",
      contracts: 1,
      entryPrice: 20000,
      exitPrice: 19990,
      stopLoss: 19990,
      takeProfit: 20020,
      commissionPerSide: 0.5,
    });
    const openTrade = makeMNQTrade({
      id: "r3-sort-open",
      dateOpen: "2026-10-15",
      timeOpen: "10:30",
      side: "Buy",
      contracts: 1,
      entryPrice: 20000,
      exitPrice: undefined,
      stopLoss: 19990,
      takeProfit: 20020,
      commissionPerSide: 0.5,
    });

    const sortByField = (items: TradeRecord[], sortField: string, sortDir: "asc" | "desc") =>
      [...items].sort((a, b) => {
        const av = (a as any)[sortField];
        const bv = (b as any)[sortField];
        const aMissing = av === undefined || av === null || av === "";
        const bMissing = bv === undefined || bv === null || bv === "";
        if (aMissing && bMissing) return 0;
        if (aMissing) return 1;
        if (bMissing) return -1;
        if (typeof av === "number" && typeof bv === "number") {
          return sortDir === "asc" ? av - bv : bv - av;
        }
        const cmp = String(av).localeCompare(String(bv));
        return sortDir === "asc" ? cmp : -cmp;
      });

    const descSorted = sortByField([openTrade, lossTrade, winTrade], "netPnl", "desc");
    expect(descSorted.map(t => t.id)).toEqual(["r3-sort-win", "r3-sort-loss", "r3-sort-open"]);

    const ascSorted = sortByField([openTrade, winTrade, lossTrade], "netPnl", "asc");
    expect(ascSorted.map(t => t.id)).toEqual(["r3-sort-loss", "r3-sort-win", "r3-sort-open"]);
  });
});
