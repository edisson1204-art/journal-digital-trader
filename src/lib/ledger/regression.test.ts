/**
 * Pruebas de regresión sobre la API pública usada por la app (calculateTrade / computeStats).
 * En el commit base 580e0bd estas pruebas FALLAN (evidencia en audit/test-results/baseline.txt).
 */
import { describe, it, expect } from "vitest";
import { calculateTrade, computeStats, TradeRecord } from "../tradeTypes";

const base = (o: Partial<TradeRecord>): TradeRecord => ({
  id: crypto.randomUUID(), assetClass: "Futures", instrument: "NQ", side: "Buy", dateOpen: "2026-10-01",
  session: "Other", entries: [{ price: 20000, contracts: 2 }], avgEntryPrice: 20000, totalContracts: 2,
  stopLoss: 19990, exits: [], contractsExited: 0, brokerId: "ninjatrader_lease", commissionPerSide: 0.09,
  totalCommission: 0, result: "Open", strategy: "", setup: "", setupGrade: "B", planFollowed: true,
  isBreakeven: false, isFundedAccount: false, emotionEntry: "Calm", confluenceCount: 1, tags: [], notes: "", ...o,
});

describe("Regresión: calculateTrade", () => {
  it("BUG-L01 parcial: 2 entrados, 1 salido en 20010 → bruto 200 (no 400) y no cerrado", () => {
    const r = calculateTrade("Buy", 20000, 20010, 19990, 2, 0, 20, 1);
    expect(r.grossPnl).toBe(200);
    expect(r.result).toBe("Open");
    expect(r.status).toBe("PARTIALLY_CLOSED");
  });

  it("BUG-L02 T01 fee total 0.36 → neto 799.64", () => {
    const r = calculateTrade("Buy", 20000, 20020, 19990, 2, 0.09, 20, 2);
    expect(r.netPnl).toBe(799.64);
  });

  it("BUG-L03 T03 neto -0.36 es pérdida neta, no 'Breakeven'", () => {
    const r = calculateTrade("Buy", 20000, 20000, 19990, 2, 0.09, 20, 2);
    expect(r.result).toBe("Loss");
  });

  it("BUG-L04 R realizado usa P&L neto sobre riesgo inicial", () => {
    // riesgo inicial = 10 pts × 2 × 20 = 400; neto 799.64 → 1.9991R
    const r = calculateTrade("Buy", 20000, 20020, 19990, 2, 0.09, 20, 2);
    expect(r.rMultiple).toBeCloseTo(1.9991, 3);
  });
});

describe("Regresión: computeStats", () => {
  const t01 = base({ result: "Win", grossPnl: 800, netPnl: 799.64, totalCommission: 0.36, contractsExited: 2 });
  const t02 = base({ result: "Loss", grossPnl: -400, netPnl: -400.36, totalCommission: 0.36, contractsExited: 2 });
  const t03 = base({ result: "Loss", grossPnl: 0, netPnl: -0.36, totalCommission: 0.36, contractsExited: 2 });

  it("BUG-M01 PF con una sola victoria no devuelve el centinela 999.99", () => {
    const s = computeStats([t01]);
    expect(s.profitFactor).not.toBe(999.99);
    expect(s.profitFactorState).toBe("NO_LOSSES_OBSERVED");
  });

  it("BUG-M02 T15 PF se calcula sobre NETO ≈ 1.9955 (no bruto 2.0)", () => {
    const s = computeStats([t01, t02, t03]);
    expect(s.profitFactor).toBeCloseTo(1.9955, 3);
    expect(s.totalNet).toBe(398.92);
  });

  it("BUG-M03 drawdown se mide desde el capital inicial y la operación abierta no cuenta", () => {
    const open = base({ result: "Open", netPnl: -999 });
    const s = computeStats([t01, t02, open]);
    expect(s.openTrades).toBe(1);
    expect(s.maxDrawdown).toBe(400.36);
  });

  it("BUG-M04 duración desconocida no se promedia como 0", () => {
    const a = base({ result: "Win", netPnl: 10, holdTimeMinutes: 0 });
    const b = base({ result: "Win", netPnl: 10, holdTimeMinutes: 30 });
    expect(computeStats([a, b]).avgHoldTime).toBe(15);
  });
});
