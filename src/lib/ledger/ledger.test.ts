/**
 * Fixtures obligatorios T01–T16 (instrucción maestra §15) + pruebas basadas en propiedades.
 * NQ: valor por punto $20. Fee total 0.36 = $0.09 por lado y contrato × 2 lados × 2 contratos.
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import Decimal from "decimal.js";
import { computeSnapshot, Execution, LedgerError, parseDecimalStrict, estimatedCommission } from "./ledger";
import { positionSize, validateDirection } from "./risk";
import { profitFactor, winRate, expectancy, wilsonInterval, runBootstrap, maxRealizedDrawdown } from "./metrics";

const D = (v: Decimal.Value) => new Decimal(v);
const NQ = D(20);
const FEE_SIDE = D("0.09");
let seq = 0;
const ex = (side: "BUY" | "SELL", qty: number, price: Decimal.Value, fee = true): Execution => ({
  id: `e${++seq}`,
  side,
  quantity: D(qty),
  price: D(price),
  fees: fee ? estimatedCommission(FEE_SIDE, D(qty)) : [],
});

describe("Fixtures del ledger", () => {
  it("T01 NQ largo 2, 20000→20020: bruto 800, neto 799.64", () => {
    const s = computeSnapshot([ex("BUY", 2, 20000), ex("SELL", 2, 20020)], NQ);
    expect(s.realizedGrossPnl.toFixed(2)).toBe("800.00");
    expect(s.realizedNetPnl.toFixed(2)).toBe("799.64");
    expect(s.status).toBe("CLOSED");
    expect(s.economicResult).toBe("WIN");
  });

  it("T02 salida 19990: bruto -400, neto -400.36", () => {
    const s = computeSnapshot([ex("BUY", 2, 20000), ex("SELL", 2, 19990)], NQ);
    expect(s.realizedGrossPnl.toFixed(2)).toBe("-400.00");
    expect(s.realizedNetPnl.toFixed(2)).toBe("-400.36");
    expect(s.economicResult).toBe("LOSS");
  });

  it("T03 salida 20000: bruto 0, neto -0.36 (pérdida neta, no breakeven)", () => {
    const s = computeSnapshot([ex("BUY", 2, 20000), ex("SELL", 2, 20000)], NQ);
    expect(s.realizedGrossPnl.toFixed(2)).toBe("0.00");
    expect(s.realizedNetPnl.toFixed(2)).toBe("-0.36");
    expect(s.economicResult).toBe("LOSS");
  });

  it("T04 entrada 2, salida 1 en 20010: bruto 200, 1 abierto, PARTIALLY_CLOSED", () => {
    const s = computeSnapshot([ex("BUY", 2, 20000, false), ex("SELL", 1, 20010, false)], NQ);
    expect(s.realizedGrossPnl.toFixed(2)).toBe("200.00");
    expect(s.openQuantity.toString()).toBe("1");
    expect(s.status).toBe("PARTIALLY_CLOSED");
    expect(s.economicResult).toBeNull();
  });

  it("T05 salidas 1@20010 + 1@20020: bruto 600, neto 599.64", () => {
    const s = computeSnapshot([ex("BUY", 2, 20000), ex("SELL", 1, 20010), ex("SELL", 1, 20020)], NQ);
    expect(s.realizedGrossPnl.toFixed(2)).toBe("600.00");
    expect(s.realizedNetPnl.toFixed(2)).toBe("599.64");
    expect(s.averageExitPrice?.toString()).toBe("20015");
  });

  it("T06 entrada 2, salida 3: rechazo explícito", () => {
    expect(() => computeSnapshot([ex("BUY", 2, 20000), ex("SELL", 3, 20010)], NQ)).toThrowError(/supera/);
  });

  it("T07 entrada sin salida: OPEN, sin P&L realizado ni no realizado inventado", () => {
    const s = computeSnapshot([ex("BUY", 2, 20000)], NQ);
    expect(s.status).toBe("OPEN");
    expect(s.realizedGrossPnl.toString()).toBe("0");
    expect(s.unrealizedGrossPnl).toBeNull();
    expect(s.economicResult).toBeNull();
  });

  it("T08 salida sin precio: incompleta, no se calcula", () => {
    for (const bad of ["", "  ", null, undefined, "abc", NaN]) {
      expect(() => parseDecimalStrict(bad, "precio")).toThrow(LedgerError);
    }
    expect(() => computeSnapshot([ex("BUY", 2, 20000), { ...ex("SELL", 2, 1), price: D(0) }], NQ)).toThrowError(/precio/);
  });

  it("T09 BE manual con salidas ganadoras: el resultado económico se deriva del neto (WIN)", () => {
    // La etiqueta manual no participa en el ledger: el snapshot es WIN y la capa de UI debe rechazar la contradicción.
    const s = computeSnapshot([ex("BUY", 2, 20000), ex("SELL", 2, 20020)], NQ);
    expect(s.economicResult).toBe("WIN");
  });

  it("T10 balance 50000, 1 %, stop 10, target 20: 2 contratos, riesgo 400, beneficio 800", () => {
    const r = positionSize({
      direction: "LONG", accountBalance: D(50000), riskFraction: D("0.01"),
      entry: D(20000), stop: D(19990), target: D(20020), pointValue: NQ, roundTripFeesPerContract: D(0),
    });
    expect(r.contracts.toString()).toBe("2");
    expect(r.effectiveRiskGross.toFixed(2)).toBe("400.00");
    expect(r.plannedRewardGross?.toFixed(2)).toBe("800.00");
    expect(r.plannedRR?.toString()).toBe("2");
  });

  it("T10b con fees, el riesgo neto efectivo se muestra separado", () => {
    const r = positionSize({
      direction: "LONG", accountBalance: D(50000), riskFraction: D("0.01"),
      entry: D(20000), stop: D(19990), target: D(20020), pointValue: NQ, roundTripFeesPerContract: D("0.18"),
    });
    expect(r.contracts.toString()).toBe("2");
    expect(r.effectiveRiskNet.toFixed(2)).toBe("400.36");
  });

  it("T10c presupuesto insuficiente: 0 contratos con advertencia (no se fuerza 1)", () => {
    const r = positionSize({
      direction: "LONG", accountBalance: D(1000), riskFraction: D("0.01"),
      entry: D(20000), stop: D(19990), pointValue: NQ, roundTripFeesPerContract: D(0),
    });
    expect(r.contracts.toString()).toBe("0");
    expect(r.warning).not.toBeNull();
  });

  it("T11 largo con target inferior a la entrada: error", () => {
    expect(validateDirection("LONG", D(20000), D(19990), D(19980)).ok).toBe(false);
    expect(validateDirection("SHORT", D(20000), D(19990), D(19980)).ok).toBe(false); // stop del lado equivocado
    expect(validateDirection("LONG", D(20000), D(20000), null).ok).toBe(false); // stop = entrada
  });

  it("T12 una victoria sin pérdidas: PF no finito (NO_LOSSES_OBSERVED), nunca 999.99", () => {
    expect(profitFactor([D("799.64")])).toEqual({ state: "NO_LOSSES_OBSERVED" });
    expect(profitFactor([])).toEqual({ state: "NO_DATA" });
  });

  it("T13 Wilson 95 %, 1 de 1 ≈ 20.65 %–100 %", () => {
    const w = wilsonInterval(1, 1)!;
    expect(w.lower).toBeCloseTo(0.2065, 4);
    expect(w.upper).toBe(1);
  });

  it("T14 WR 100 %, payoff 799.64, sin variabilidad, 10 trades: 17996.40 en todos los caminos", () => {
    const r = runBootstrap({
      startingCapital: D(10000), tradeOutcomes: [D("799.64")], numberOfTrades: 10,
      numberOfPaths: 500, seed: "T14", samplingMethod: "EMPIRICAL_BOOTSTRAP", costsIncluded: true,
    });
    expect(new Set(r.finalEquities.map(e => e.toFixed(2)))).toEqual(new Set(["17996.40"]));
    expect(r.centralIntervalLabel).not.toMatch(/\bIC\s?95/i);
  });

  it("T15 T01+T02+T03: neto 398.92, WR 1/3, PF ≈ 1.9955", () => {
    const nets = [D("799.64"), D("-400.36"), D("-0.36")];
    expect(nets.reduce((s, p) => s.plus(p), D(0)).toFixed(2)).toBe("398.92");
    const wr = winRate(nets);
    expect([wr.wins, wr.losses]).toEqual([1, 2]);
    const pf = profitFactor(nets);
    expect(pf.state).toBe("VALUE");
    if (pf.state === "VALUE") expect(pf.value.toNumber()).toBeCloseTo(1.9955, 4);
    const e = expectancy(nets);
    if (e.state === "VALUE") expect(e.value.toFixed(4)).toBe("132.9733");
  });

  it("T16 NQ corto 2, 20000→19980: bruto 800, neto 799.64", () => {
    const s = computeSnapshot([ex("SELL", 2, 20000), ex("BUY", 2, 19980)], NQ);
    expect(s.direction).toBe("SHORT");
    expect(s.realizedGrossPnl.toFixed(2)).toBe("800.00");
    expect(s.realizedNetPnl.toFixed(2)).toBe("799.64");
  });

  it("Drawdown realizado desde capital inicial", () => {
    expect(maxRealizedDrawdown(D(50000), [D(100), D(-300), D(50)]).toString()).toBe("-300");
  });

  it("Monte Carlo reproducible con la misma semilla", () => {
    const cfg = { startingCapital: D(1000), tradeOutcomes: [D(10), D(-5), D(3)], numberOfTrades: 20, numberOfPaths: 50, seed: "abc", samplingMethod: "EMPIRICAL_BOOTSTRAP" as const, costsIncluded: true };
    expect(runBootstrap(cfg).finalEquities.map(String)).toEqual(runBootstrap(cfg).finalEquities.map(String));
  });
});

describe("Propiedades del ledger", () => {
  const price = fc.integer({ min: 1000, max: 30000 });
  const qty = fc.integer({ min: 1, max: 20 });

  it("Simetría largo/corto: el corto espejo produce el P&L opuesto", () => {
    fc.assert(fc.property(price, price, qty, (a, b, q) => {
      const long = computeSnapshot([ex("BUY", q, a, false), ex("SELL", q, b, false)], NQ);
      const short = computeSnapshot([ex("SELL", q, a, false), ex("BUY", q, b, false)], NQ);
      return long.realizedGrossPnl.plus(short.realizedGrossPnl).eq(0);
    }));
  });

  it("Dividir un fill en fills equivalentes no cambia el resultado", () => {
    fc.assert(fc.property(price, price, fc.integer({ min: 2, max: 20 }), (a, b, q) => {
      const whole = computeSnapshot([ex("BUY", q, a), ex("SELL", q, b)], NQ);
      const split = computeSnapshot([ex("BUY", 1, a), ex("BUY", q - 1, a), ex("SELL", q - 1, b), ex("SELL", 1, b)], NQ);
      return whole.realizedNetPnl.eq(split.realizedNetPnl) && whole.realizedFees.eq(split.realizedFees);
    }));
  });

  it("Conservación de cantidad: open = entradas − salidas", () => {
    fc.assert(fc.property(qty, fc.integer({ min: 0, max: 20 }), price, (q, out, p) => {
      fc.pre(out <= q);
      const execs = [ex("BUY", q, p)];
      if (out > 0) execs.push(ex("SELL", out, p + 1));
      const s = computeSnapshot(execs, NQ);
      return s.openQuantity.eq(q - out) && s.entryQuantity.minus(s.exitQuantity).eq(s.openQuantity);
    }));
  });

  it("Idempotencia: recalcular el mismo snapshot da idéntico resultado", () => {
    fc.assert(fc.property(price, price, qty, (a, b, q) => {
      const execs = [ex("BUY", q, a), ex("SELL", q, b)];
      return JSON.stringify(computeSnapshot(execs, NQ)) === JSON.stringify(computeSnapshot(execs, NQ));
    }));
  });

  it("Fees no duplicados: fees totales = suma de fees de cada ejecución", () => {
    fc.assert(fc.property(qty, price, (q, p) => {
      const s = computeSnapshot([ex("BUY", q, p), ex("SELL", q, p)], NQ);
      return s.realizedFees.eq(FEE_SIDE.mul(q).mul(2)) && s.realizedGrossPnl.minus(s.realizedFees).eq(s.realizedNetPnl);
    }));
  });

  it("Tamaño monotónico: más riesgo permitido nunca reduce contratos", () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 50 }), fc.integer({ min: 1, max: 50 }), fc.integer({ min: 1, max: 100 }), (r1, r2, stopPts) => {
      const size = (r: number) => positionSize({
        direction: "LONG", accountBalance: D(50000), riskFraction: D(r).div(1000),
        entry: D(20000), stop: D(20000 - stopPts), pointValue: NQ, roundTripFeesPerContract: D("0.18"),
      }).contracts;
      return r1 <= r2 ? size(r1).lte(size(r2)) : size(r1).gte(size(r2));
    }));
  });
});
