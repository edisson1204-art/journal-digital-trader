/**
 * Pruebas de reproducción y regresión para la Auditoría de Fiabilidad (14–15 de octubre de 2026).
 * Cubre: MAT-01, MAT-02, LED-01, LED-02 (§9.2 asignación de costes), LED-05, LED-06, Breakeven,
 * STA-02, STA-03, STA-04, STA-05, Reportes sin datos (REP-01..04) y Dataset de conciliación §11.1.
 */
import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import { computeSnapshot, estimatedCommission } from "./ledger";
import { winRate, profitFactor, expectancy, maxRealizedDrawdown } from "./metrics";
import { calculateTradeFromFills, computeStats, type TradeRecord } from "../tradeTypes";
import { calculateRiskView } from "@/app/app/risk/page";
import { computeModalFormState } from "@/components/RegisterTradeModal";
import { resolveSimParams, runMonteCarlo, generateReport } from "@/app/app/simulator/page";
import { calculateQuantStats, generatePsychoText, generateNarrative } from "@/app/app/reports/page";

const D = (v: Decimal.Value) => new Decimal(v);

describe("Auditoría Oct 14–15 — Sección 2: Pruebas matemáticas y Ledger", () => {
  it("MAT-01: NQ balance 50.000, riesgo 1%, entrada 20.000, SL 19.990, TP 20.020 → 2 contratos, riesgo $400, ganancia bruta $800 (no $1.000)", () => {
    const res = calculateRiskView({
      accountSize: "50000",
      riskPct: "1",
      entry: "20000",
      stop: "19990",
      target: "20020",
      assetClass: "Futures",
      pointValue: 20,
      direction: "LONG",
    });
    expect(res.isValid).toBe(true);
    expect(res.positionSize).toBe("2");
    expect(res.realRisk).toBe(400);
    expect(res.maxGain).toBe(800);
    expect(res.rr).toBe("2.00");
  });

  it("MAT-02: Mismo caso cambiando TP a 19.980 con SL 19.990 en LONG → rechaza geometría incompatible (sin proyectar +$1.000 ni RR 1:2)", () => {
    const res = calculateRiskView({
      accountSize: "50000",
      riskPct: "1",
      entry: "20000",
      stop: "19990",
      target: "19980",
      assetClass: "Futures",
      pointValue: 20,
      direction: "LONG",
    });
    expect(res.isValid).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.maxGain).toBe(0);
    expect(res.rr).toBe("—");
  });

  it("LED-01: Entrada 2 NQ a 20.000 y salida vacía permite flujo OPEN sin exigir salida ni Breakeven", () => {
    const st = computeModalFormState({
      entries: [{ price: 20000, contracts: 2 }],
      exits: [{ price: 0, contracts: 1, time: "" }],
      side: "Buy",
      sl: 19990,
      takeProfit1: "20020",
      isBreakeven: false,
      broker: "ninjatrader_lease",
      customComm: 0,
      assetClass: "Futures",
      instrument: "NQ",
    });
    expect(st.step3Error).toBeUndefined();
    expect(st.canSaveOpenFromStep3).toBe(true);
    expect(st.savedResult).toBe("Open");
    expect(st.openContracts).toBe(2);
  });

  it("LED-02 y §9.2: Entrada 2 NQ a 20.000, salida 1 a 20.010 con $0.09/lado → bruto $200, 1 abierto, fee devengado $0.27, fee asignado al cerrado $0.18, neto cerrado $199.82 (no +$399.64 ni Win)", () => {
    const snap = computeSnapshot(
      [
        { id: "in1", side: "BUY", quantity: D(2), price: D(20000), fees: estimatedCommission(D("0.09"), D(2)) },
        { id: "out1", side: "SELL", quantity: D(1), price: D(20010), fees: estimatedCommission(D("0.09"), D(1)) },
      ],
      D(20),
    );
    expect(snap.status).toBe("PARTIALLY_CLOSED");
    expect(snap.openQuantity.toString()).toBe("1");
    expect(snap.realizedGrossPnl.toFixed(2)).toBe("200.00");
    // §9.2: coste asignado al contrato cerrado = $0.18; neto del contrato cerrado = $199.82; devengado total = $0.27
    expect(snap.realizedFees.toFixed(2)).toBe("0.18");
    expect(snap.realizedNetPnl.toFixed(2)).toBe("199.82");

    const st = computeModalFormState({
      entries: [{ price: 20000, contracts: 2 }],
      exits: [{ price: 20010, contracts: 1 }],
      side: "Buy",
      sl: 19990,
      takeProfit1: "20020",
      isBreakeven: false,
      broker: "ninjatrader_lease",
      customComm: 0,
      assetClass: "Futures",
      instrument: "NQ",
    });
    expect(st.calc.grossPnl).toBe(200);
    expect(st.calc.netPnl).toBe(199.82);
    expect(st.savedResult).toBe("Open");
    expect(st.openContracts).toBe(1);
  });

  it("LED-05: Añadir segunda fila de salida con precio vacío y cantidad 1 excluye el borrador del preview (no -$399800.36 ni -999.5R) y formatea negativos con signo '-'", () => {
    const st = computeModalFormState({
      entries: [{ price: 20000, contracts: 2 }],
      exits: [
        { price: 20010, contracts: 1, time: "" },
        { price: 0, contracts: 1, time: "" },
      ],
      side: "Buy",
      sl: 19990,
      takeProfit1: "20020",
      isBreakeven: false,
      broker: "ninjatrader_lease",
      customComm: 0,
      assetClass: "Futures",
      instrument: "NQ",
    });
    expect(st.calc.grossPnl).toBe(200);
    expect(st.calc.netPnl).toBe(199.82);

    // Verificar formato con signo negativo explícito en pérdidas
    const lossSt = computeModalFormState({
      entries: [{ price: 20000, contracts: 2 }],
      exits: [{ price: 19990, contracts: 2, time: "" }],
      side: "Buy",
      sl: 19990,
      takeProfit1: "20020",
      isBreakeven: false,
      broker: "ninjatrader_lease",
      customComm: 0,
      assetClass: "Futures",
      instrument: "NQ",
    });
    expect(lossSt.formattedNetPnl).toBe("-$400.36");
  });

  it("LED-06 y Breakeven: Entrada 20.000, SL 19.990, TP1 20.020 y salida 20.010 mantiene RR Planificado 1:2.00; marcar Breakeven no oculta ni sobrescribe un trade con ganancia de +$599.64", () => {
    const st = computeModalFormState({
      entries: [{ price: 20000, contracts: 2 }],
      exits: [
        { price: 20010, contracts: 1 },
        { price: 20020, contracts: 1 },
      ],
      side: "Buy",
      sl: 19990,
      takeProfit1: "20020",
      isBreakeven: true,
      broker: "ninjatrader_lease",
      customComm: 0,
      assetClass: "Futures",
      instrument: "NQ",
    });
    expect(st.potentialRR).toBe("2.00");
    expect(st.calc.netPnl).toBe(599.64);
    expect(st.savedResult).toBe("Win");
  });
});

describe("Auditoría Oct 14–15 — Sección 3: Simulador y Estadística", () => {
  it("STA-02: Modo Manual con balance $10.000, WR 100%, ganancia $100, comisión $0, variabilidad 0%, 10 trades, 1000 sims → todos los caminos terminan en $11.000 con desviación 0", () => {
    const emptyStats = computeStats([]);
    const p = resolveSimParams({
      mode: "manual",
      balance: "10000",
      winRate: "100",
      avgWin: "100",
      avgLoss: "100",
      varPct: "0",
      comm: "0",
      nTrades: "10",
      nSims: "1000",
      journalStats: emptyStats,
      journalN: 0,
    });
    expect(p.VA).toBe(0);
    const sim = runMonteCarlo(p.B, p.WR, p.AW, p.AL, p.VA, p.NT, p.NS, p.CM, p.SN ?? 0);
    expect(sim.medianFinal).toBe(11000);
    expect(sim.meanFinal).toBe(11000);
    expect(sim.p5Final).toBe(11000);
    expect(sim.p95Final).toBe(11000);
    expect(sim.stdFinal).toBe(0);
  });

  it("STA-03/04/05: Modo Journal con n=0 bloquea simulación y no muestra 'Excelente (100+ trades)'; Modo Manual no inventa muestra n=50 ni otorga A+/100 ni 'ventaja estadística confirmada'", () => {
    const emptyStats = computeStats([]);
    const journalZero = resolveSimParams({
      mode: "journal",
      balance: "10000",
      winRate: "60",
      avgWin: "150",
      avgLoss: "75",
      varPct: "40",
      comm: "0.18",
      nTrades: "100",
      nSims: "1000",
      journalStats: emptyStats,
      journalN: 0,
    });
    expect(journalZero.canRun).toBe(false);
    expect(journalZero.initialAdequacyLabel).not.toMatch(/Excelente/i);

    const manualParams = resolveSimParams({
      mode: "manual",
      balance: "10000",
      winRate: "100",
      avgWin: "100",
      avgLoss: "100",
      varPct: "0",
      comm: "0",
      nTrades: "10",
      nSims: "1000",
      journalStats: emptyStats,
      journalN: 0,
    });
    expect(manualParams.SN).toBeNull();
    const sim = runMonteCarlo(
      manualParams.B, manualParams.WR, manualParams.AW, manualParams.AL,
      manualParams.VA, manualParams.NT, manualParams.NS, manualParams.CM, 0,
    );
    const rep = generateReport(sim, manualParams.WR, manualParams.NT, manualParams.CM, manualParams.AW, manualParams.AL, manualParams.VA, "es");
    expect(rep.pros.join(" ")).not.toMatch(/ventaja estadística confirmada|calidad institucional/i);
    expect(rep.recs.join(" ")).not.toMatch(/viable para funded account/i);
    expect(rep.grade).not.toBe("A+");
  });
});

describe("Auditoría Oct 14–15 — Sección 4: Informes frente a sus datos (n=0)", () => {
  it("REP-01..04: Con 0 operaciones, los generadores de reportes no emiten narrativas ejecutivas, diagnósticos clínicos ni Patrimonio Neto Imponible", () => {
    const emptyStats = computeStats([]);
    const quant = calculateQuantStats([]);
    expect(quant).toBeNull();

    const monthly = generateNarrative("monthly", emptyStats, quant, "es");
    const technical = generateNarrative("technical", emptyStats, quant, "es");
    const tax = generateNarrative("tax", emptyStats, quant, "es");
    const psycho = generatePsychoText(emptyStats, "es");

    expect(monthly).toEqual([]);
    expect(technical).toEqual([]);
    expect(tax).toEqual([]);
    expect(psycho).toBeNull();
  });
});

describe("Auditoría Oct 14–15 — Sección 11.1: Dataset de referencia T1..T4", () => {
  it("Concilia exactamente T1..T4 + exclusión de OPEN y PARTIALLY_CLOSED", () => {
    const t1 = calculateTradeFromFills("Buy", [{ price: 20000, contracts: 2 }], [{ price: 20010, contracts: 1 }, { price: 20020, contracts: 1 }], 19990, 0.09, 20);
    const t2 = calculateTradeFromFills("Sell", [{ price: 20000, contracts: 1 }], [{ price: 20010, contracts: 1 }], 20010, 0.09, 20);
    const t3 = calculateTradeFromFills("Buy", [{ price: 20000, contracts: 1 }], [{ price: 20000, contracts: 1 }], 19990, 0.09, 20);
    const t4 = calculateTradeFromFills("Sell", [{ price: 20000, contracts: 1 }], [{ price: 19990, contracts: 1 }], 20010, 0.09, 20);

    expect([t1.grossPnl, t1.totalCommission, t1.netPnl]).toEqual([600, 0.36, 599.64]);
    expect([t2.grossPnl, t2.totalCommission, t2.netPnl]).toEqual([-200, 0.18, -200.18]);
    expect([t3.grossPnl, t3.totalCommission, t3.netPnl]).toEqual([0, 0.18, -0.18]);
    expect([t4.grossPnl, t4.totalCommission, t4.netPnl]).toEqual([200, 0.18, 199.82]);

    const mk = (id: string, date: string, time: string, side: "Buy" | "Sell", calc: ReturnType<typeof calculateTradeFromFills>): TradeRecord => ({
      id, assetClass: "Futures", instrument: "NQ", side, dateOpen: date, timeOpen: time, dateClose: date, timeClose: time,
      session: "NYSE Open (9:30-11)", entries: [{ price: 20000, contracts: 1 }], avgEntryPrice: 20000, totalContracts: 1,
      stopLoss: 19990, exits: [], contractsExited: 1, brokerId: "ninjatrader_lease", commissionPerSide: 0.09,
      totalCommission: calc.totalCommission ?? 0, grossPnl: calc.grossPnl, netPnl: calc.netPnl,
      result: calc.result ?? "Open", strategy: "SMC", setup: "Breakout", setupGrade: "A", planFollowed: true,
      isBreakeven: false, isFundedAccount: false, emotionEntry: "Calm", confluenceCount: 3, tags: [], notes: "",
    });

    const openTrade = mk("T5", "2026-10-05", "10:00", "Buy", { status: "OPEN", result: "Open" });
    const partialTrade = mk(
      "T6", "2026-10-06", "10:00", "Buy",
      calculateTradeFromFills("Buy", [{ price: 20000, contracts: 2 }], [{ price: 20010, contracts: 1 }], 19990, 0.09, 20),
    );

    const dataset = [
      mk("T1", "2026-10-01", "10:00", "Buy", t1),
      mk("T2", "2026-10-02", "10:00", "Sell", t2),
      mk("T3", "2026-10-03", "10:00", "Buy", t3),
      mk("T4", "2026-10-04", "10:00", "Sell", t4),
      openTrade,
      partialTrade,
    ];

    const stats = computeStats(dataset);
    expect(stats.closedTrades).toBe(4);
    expect(stats.openTrades).toBe(2);
    expect(stats.totalGross).toBe(600);
    expect(stats.totalCommissions).toBe(0.90);
    expect(stats.totalNet).toBe(599.10);
    expect([stats.wins, stats.losses, stats.breakevenCount]).toEqual([2, 2, 0]);
    expect(stats.winRate).toBe(50);
    expect(stats.expectancy).toBe(149.78);
    expect(stats.profitFactor).toBeCloseTo(3.9901, 4);
    expect(stats.maxDrawdown).toBe(200.36);

    // §9.2: WR incluye todos los cerrados elegibles en el denominador (incluyendo BE neto = 0)
    const wrWithBe = winRate([D(100), D(-50), D(0), D(0)]);
    expect(wrWithBe.rate.state).toBe("VALUE");
    if (wrWithBe.rate.state === "VALUE") {
      expect(wrWithBe.rate.value.toNumber()).toBe(0.25);
    }
  });
});
