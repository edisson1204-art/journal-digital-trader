/**
 * Riesgo, tamaño de posición y múltiplos R. Ver audit/formulas.md §6-7.
 */
import Decimal from "decimal.js";
import { Direction, LedgerError } from "./ledger";

export interface DirectionalCheck {
  ok: boolean;
  errors: string[];
}

/** Largo: stop < entrada < target. Corto: target < entrada < stop. stop === entrada es inválido para sizing. */
export function validateDirection(
  direction: Direction,
  entry: Decimal,
  stop: Decimal | null,
  target: Decimal | null,
): DirectionalCheck {
  const errors: string[] = [];
  if (stop) {
    if (stop.eq(entry)) errors.push("El stop es igual a la entrada: el riesgo por precio es cero.");
    else if (direction === "LONG" && stop.gt(entry)) errors.push("En un largo, el stop debe estar por debajo de la entrada.");
    else if (direction === "SHORT" && stop.lt(entry)) errors.push("En un corto, el stop debe estar por encima de la entrada.");
  }
  if (target) {
    if (direction === "LONG" && target.lte(entry)) errors.push("En un largo, el objetivo debe estar por encima de la entrada.");
    if (direction === "SHORT" && target.gte(entry)) errors.push("En un corto, el objetivo debe estar por debajo de la entrada.");
  }
  return { ok: errors.length === 0, errors };
}

export interface PositionSizeInput {
  direction: Direction;
  accountBalance: Decimal;
  /** Fracción, p. ej. 0.01 para 1 % */
  riskFraction: Decimal;
  entry: Decimal;
  stop: Decimal;
  target?: Decimal | null;
  pointValue: Decimal;
  /** Fees estimados ida y vuelta por contrato (0 si no se incluyen). */
  roundTripFeesPerContract: Decimal;
}

export interface PositionSizeResult {
  riskBudget: Decimal;
  riskPerContractGross: Decimal;
  riskPerContractNet: Decimal;
  contracts: Decimal;
  effectiveRiskGross: Decimal;
  effectiveRiskNet: Decimal;
  effectiveRiskFraction: Decimal;
  estimatedFees: Decimal;
  plannedRewardPerContract: Decimal | null;
  plannedRewardGross: Decimal | null;
  plannedRR: Decimal | null;
  /** Mensaje cuando el presupuesto no cubre un contrato (no se fuerza 1). */
  warning: string | null;
}

export function positionSize(i: PositionSizeInput): PositionSizeResult {
  if (i.accountBalance.lte(0)) throw new LedgerError("INVALID_BALANCE", "El balance debe ser > 0");
  if (i.riskFraction.lte(0) || i.riskFraction.gt(1)) throw new LedgerError("INVALID_RISK", "El riesgo debe estar entre 0 y 100 %");
  const check = validateDirection(i.direction, i.entry, i.stop, i.target ?? null);
  if (!check.ok) throw new LedgerError("DIRECTION", check.errors.join(" "));

  const riskBudget = i.accountBalance.mul(i.riskFraction);
  const riskPerContractGross = i.entry.minus(i.stop).abs().mul(i.pointValue);
  const riskPerContractNet = riskPerContractGross.plus(i.roundTripFeesPerContract);
  const contracts = riskBudget.div(riskPerContractNet).floor();

  const plannedRewardPerContract = i.target ? i.target.minus(i.entry).abs().mul(i.pointValue) : null;

  return {
    riskBudget,
    riskPerContractGross,
    riskPerContractNet,
    contracts,
    effectiveRiskGross: contracts.mul(riskPerContractGross),
    effectiveRiskNet: contracts.mul(riskPerContractNet),
    effectiveRiskFraction: contracts.mul(riskPerContractNet).div(i.accountBalance),
    estimatedFees: contracts.mul(i.roundTripFeesPerContract),
    plannedRewardPerContract,
    plannedRewardGross: plannedRewardPerContract ? plannedRewardPerContract.mul(contracts) : null,
    plannedRR: plannedRewardPerContract ? plannedRewardPerContract.div(riskPerContractGross) : null,
    warning: contracts.lt(1) ? "El presupuesto de riesgo no cubre el riesgo de un contrato. Cantidad recomendada: 0." : null,
  };
}

/**
 * R realizado neto: realizedNetPnl / initialRiskGross.
 * Convención de denominador (cerrados y parciales): SIEMPRE el riesgo inicial bruto total
 * de la posición completa (|avgEntry - initialStop| * totalEntryQuantity * pointValue),
 * incluso si el stop loss actual se movió después a breakeven o trailing stop.
 */
export function realizedRNet(realizedNetPnl: Decimal, initialRiskGrossTotal: Decimal | null): Decimal | null {
  if (!initialRiskGrossTotal || initialRiskGrossTotal.lte(0)) return null;
  return realizedNetPnl.div(initialRiskGrossTotal);
}

/**
 * R realizado bruto: realizedGrossPnl / initialRiskGross.
 * Usa el mismo denominador (riesgo inicial bruto total de la posición completa).
 */
export function realizedRGross(realizedGrossPnl: Decimal, initialRiskGrossTotal: Decimal | null): Decimal | null {
  if (!initialRiskGrossTotal || initialRiskGrossTotal.lte(0)) return null;
  return realizedGrossPnl.div(initialRiskGrossTotal);
}

export function initialRiskGross(entry: Decimal, initialStop: Decimal | null, quantity: Decimal, pointValue: Decimal): Decimal | null {
  if (!initialStop || initialStop.eq(entry)) return null;
  return entry.minus(initialStop).abs().mul(quantity).mul(pointValue);
}
