/**
 * Ledger de ejecuciones — fuente única de verdad del P&L.
 *
 * Reglas (ver audit/formulas.md):
 *  - Toda cifra monetaria se calcula con Decimal (sin aritmética binaria).
 *  - Un snapshot se reconstruye siempre desde las ejecuciones.
 *  - Valores vacíos / no numéricos NUNCA se convierten en 0: se rechazan.
 *  - Las salidas no pueden superar a las entradas (sin reversión implícita).
 *  - Asignación de costo de entrada: FIFO.
 *  - Cada fee se descuenta exactamente una vez.
 */
import Decimal from "decimal.js";

export const CALCULATION_VERSION = "ledger-1.0.0";

export type Side = "BUY" | "SELL";
export type Direction = "LONG" | "SHORT";
export type TradeStatus = "OPEN" | "PARTIALLY_CLOSED" | "CLOSED";
export type EconomicResult = "WIN" | "LOSS" | "NET_BREAKEVEN";

export interface FeeComponent {
  type: "COMMISSION" | "EXCHANGE" | "CLEARING" | "REGULATORY" | "OTHER";
  amount: Decimal;
  currency: string;
  source: "IMPORTED" | "ESTIMATED" | "MANUAL";
  scheduleVersion?: string;
}

export interface Execution {
  id: string;
  side: Side;
  quantity: Decimal;
  price: Decimal;
  executedAtUtc?: string;
  fees: FeeComponent[];
}

export interface TradeSnapshot {
  direction: Direction;
  status: TradeStatus;
  entryQuantity: Decimal;
  exitQuantity: Decimal;
  openQuantity: Decimal;
  averageEntryPrice: Decimal | null;
  averageExitPrice: Decimal | null;
  realizedGrossPnl: Decimal;
  realizedFees: Decimal;
  realizedNetPnl: Decimal;
  /** null salvo que exista un precio de mercado confiable (no se inventa). */
  unrealizedGrossPnl: Decimal | null;
  /** Solo definido cuando status === "CLOSED". */
  economicResult: EconomicResult | null;
  calculationVersion: string;
}

export class LedgerError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "LedgerError";
  }
}

/** Convierte una entrada de usuario a Decimal. Rechaza null, undefined, "", espacios, NaN e Infinity. */
export function parseDecimalStrict(value: unknown, field: string): Decimal {
  if (value === null || value === undefined) throw new LedgerError("MISSING_VALUE", `${field}: valor ausente`);
  if (typeof value === "string" && value.trim() === "") throw new LedgerError("MISSING_VALUE", `${field}: valor vacío`);
  if (typeof value !== "string" && typeof value !== "number" && !(value instanceof Decimal)) {
    throw new LedgerError("INVALID_VALUE", `${field}: tipo no válido`);
  }
  let d: Decimal;
  try {
    d = new Decimal(typeof value === "string" ? value.trim() : value);
  } catch {
    throw new LedgerError("INVALID_VALUE", `${field}: número no válido`);
  }
  if (!d.isFinite()) throw new LedgerError("INVALID_VALUE", `${field}: número no finito`);
  return d;
}

function validateExecution(e: Execution) {
  if (!e.quantity.isFinite() || e.quantity.lte(0)) {
    throw new LedgerError("INVALID_QUANTITY", `Ejecución ${e.id}: la cantidad debe ser > 0`);
  }
  if (!e.price.isFinite() || e.price.lte(0)) {
    throw new LedgerError("INVALID_PRICE", `Ejecución ${e.id}: el precio debe ser > 0`);
  }
  for (const f of e.fees) {
    if (!f.amount.isFinite() || f.amount.lt(0)) {
      throw new LedgerError("INVALID_FEE", `Ejecución ${e.id}: fee no válido`);
    }
  }
}

const sumFees = (e: Execution) => e.fees.reduce((s, f) => s.plus(f.amount), new Decimal(0));

/**
 * Reconstruye el snapshot de un trade desde sus ejecuciones.
 * La dirección la define la primera ejecución en orden cronológico (orden del array).
 */
export function computeSnapshot(executions: Execution[], pointValue: Decimal): TradeSnapshot {
  if (executions.length === 0) throw new LedgerError("NO_EXECUTIONS", "El trade no tiene ejecuciones");
  if (!pointValue.isFinite() || pointValue.lte(0)) {
    throw new LedgerError("UNKNOWN_SPEC", "Valor por punto desconocido o no válido");
  }
  executions.forEach(validateExecution);

  const openingSide = executions[0].side;
  const direction: Direction = openingSide === "BUY" ? "LONG" : "SHORT";

  // Lotes abiertos FIFO
  const lots: { qty: Decimal; price: Decimal }[] = [];
  let entryQty = new Decimal(0);
  let entryNotional = new Decimal(0);
  let exitQty = new Decimal(0);
  let exitNotional = new Decimal(0);
  let gross = new Decimal(0);
  let fees = new Decimal(0);

  for (const e of executions) {
    fees = fees.plus(sumFees(e));
    if (e.side === openingSide) {
      lots.push({ qty: e.quantity, price: e.price });
      entryQty = entryQty.plus(e.quantity);
      entryNotional = entryNotional.plus(e.quantity.mul(e.price));
      continue;
    }
    const openQty = entryQty.minus(exitQty);
    if (e.quantity.gt(openQty)) {
      throw new LedgerError(
        "EXIT_EXCEEDS_ENTRY",
        `La salida (${e.quantity}) supera la cantidad abierta (${openQty}). Registra la reversión como un trade separado.`,
      );
    }
    let remaining = e.quantity;
    while (remaining.gt(0)) {
      const lot = lots[0];
      const take = Decimal.min(lot.qty, remaining);
      const diff = direction === "LONG" ? e.price.minus(lot.price) : lot.price.minus(e.price);
      gross = gross.plus(take.mul(diff).mul(pointValue));
      lot.qty = lot.qty.minus(take);
      remaining = remaining.minus(take);
      if (lot.qty.eq(0)) lots.shift();
    }
    exitQty = exitQty.plus(e.quantity);
    exitNotional = exitNotional.plus(e.quantity.mul(e.price));
  }

  const openQuantity = entryQty.minus(exitQty);
  const status: TradeStatus = exitQty.eq(0) ? "OPEN" : openQuantity.gt(0) ? "PARTIALLY_CLOSED" : "CLOSED";
  const net = gross.minus(fees);
  const economicResult: EconomicResult | null =
    status !== "CLOSED" ? null : net.gt(0) ? "WIN" : net.lt(0) ? "LOSS" : "NET_BREAKEVEN";

  return {
    direction,
    status,
    entryQuantity: entryQty,
    exitQuantity: exitQty,
    openQuantity,
    averageEntryPrice: entryQty.gt(0) ? entryNotional.div(entryQty) : null,
    averageExitPrice: exitQty.gt(0) ? exitNotional.div(exitQty) : null,
    realizedGrossPnl: gross,
    realizedFees: fees,
    realizedNetPnl: net,
    unrealizedGrossPnl: null,
    economicResult,
    calculationVersion: CALCULATION_VERSION,
  };
}

/** Fee de comisión por lado y contrato, marcado como ESTIMADO (no importado del broker). */
export function estimatedCommission(perSidePerContract: Decimal, quantity: Decimal, scheduleVersion?: string): FeeComponent[] {
  const amount = perSidePerContract.mul(quantity);
  if (amount.eq(0)) return [];
  return [{ type: "COMMISSION", amount, currency: "USD", source: "ESTIMATED", scheduleVersion }];
}
