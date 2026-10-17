/**
 * R2-03 — Parser de precios y cantidades con separación estricta entre:
 *  1. Estado de presencia (EMPTY vs PRESENT)
 *  2. Validación numérica (finito, separador decimal inequívoco)
 *  3. Validación financiera por especificación de instrumento (cero, negativo, tickSize, soporte del instrumento)
 */
import Decimal from "decimal.js";

export type PresenceState = "EMPTY" | "PRESENT";

export type PriceValidationCode =
  | "OK"
  | "EMPTY_INPUT"
  | "INVALID_TYPE"
  | "NON_FINITE"
  | "MALFORMED_DECIMAL"
  | "UNSUPPORTED_INSTRUMENT"
  | "ZERO_PRICE_NOT_ALLOWED"
  | "NEGATIVE_PRICE_NOT_ALLOWED"
  | "BELOW_MIN_PRICE"
  | "INVALID_TICK_ALIGNMENT";

export interface InstrumentPriceSpec {
  symbol: string;
  pointValue: Decimal;
  tickSize: Decimal;
  allowZeroPrice: boolean;
  allowNegativePrice: boolean;
  minPrice: Decimal | null;
  enforceTickAlignment: boolean;
}

export interface PriceParseResult {
  presence: PresenceState;
  valid: boolean;
  code: PriceValidationCode;
  value: Decimal | null;
  spec?: InstrumentPriceSpec;
  message?: string;
}

const d = (v: string | number) => new Decimal(v);

/**
 * Catálogo explícito de especificaciones por instrumento.
 * - NQ, MNQ, ES, MES: tick 0.25, no admiten precio 0 ni negativo.
 * - YM, MYM: tick 1.0, no admiten precio 0 ni negativo.
 * - RTY, M2K, GC, MGC: tick 0.10, no admiten precio 0 ni negativo.
 * - CL, MCL: tick 0.01, por defecto contrato estándar (> 0).
 * - CL_WTI_2020 / SPREAD_DIFF: ejemplos explícitos de especificaciones que admiten precios 0 o negativos.
 */
export const INSTRUMENT_PRICE_SPECS: Record<string, InstrumentPriceSpec> = {
  NQ:   { symbol: "NQ",   pointValue: d(20),     tickSize: d("0.25"),   allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.25"),   enforceTickAlignment: true },
  MNQ:  { symbol: "MNQ",  pointValue: d(2),      tickSize: d("0.25"),   allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.25"),   enforceTickAlignment: true },
  ES:   { symbol: "ES",   pointValue: d(50),     tickSize: d("0.25"),   allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.25"),   enforceTickAlignment: true },
  MES:  { symbol: "MES",  pointValue: d(5),      tickSize: d("0.25"),   allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.25"),   enforceTickAlignment: true },
  YM:   { symbol: "YM",   pointValue: d(5),      tickSize: d("1"),      allowZeroPrice: false, allowNegativePrice: false, minPrice: d("1"),      enforceTickAlignment: true },
  MYM:  { symbol: "MYM",  pointValue: d("0.5"),  tickSize: d("1"),      allowZeroPrice: false, allowNegativePrice: false, minPrice: d("1"),      enforceTickAlignment: true },
  RTY:  { symbol: "RTY",  pointValue: d(50),     tickSize: d("0.10"),   allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.10"),   enforceTickAlignment: true },
  M2K:  { symbol: "M2K",  pointValue: d(5),      tickSize: d("0.10"),   allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.10"),   enforceTickAlignment: true },
  CL:   { symbol: "CL",   pointValue: d(1000),   tickSize: d("0.01"),   allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.01"),   enforceTickAlignment: true },
  MCL:  { symbol: "MCL",  pointValue: d(100),    tickSize: d("0.01"),   allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.01"),   enforceTickAlignment: true },
  GC:   { symbol: "GC",   pointValue: d(100),    tickSize: d("0.10"),   allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.10"),   enforceTickAlignment: true },
  MGC:  { symbol: "MGC",  pointValue: d(10),     tickSize: d("0.10"),   allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.10"),   enforceTickAlignment: true },
  SI:   { symbol: "SI",   pointValue: d(5000),   tickSize: d("0.005"),  allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.005"),  enforceTickAlignment: true },
  SIL:  { symbol: "SIL",  pointValue: d(1000),   tickSize: d("0.005"),  allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.005"),  enforceTickAlignment: true },
  NG:   { symbol: "NG",   pointValue: d(10000),  tickSize: d("0.001"),  allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.001"),  enforceTickAlignment: true },
  RB:   { symbol: "RB",   pointValue: d(42000),  tickSize: d("0.0001"), allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.0001"), enforceTickAlignment: true },
  HG:   { symbol: "HG",   pointValue: d(25000),  tickSize: d("0.0005"), allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.0005"), enforceTickAlignment: true },
  ZB:   { symbol: "ZB",   pointValue: d(1000),   tickSize: d("0.03125"),allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.03125"),enforceTickAlignment: true },
  ZN:   { symbol: "ZN",   pointValue: d(1000),   tickSize: d("0.015625"),allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.015625"),enforceTickAlignment: true },
  ZF:   { symbol: "ZF",   pointValue: d(1000),   tickSize: d("0.0078125"),allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.0078125"),enforceTickAlignment: true },
  "6E": { symbol: "6E",   pointValue: d(125000), tickSize: d("0.00005"),allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.00005"),enforceTickAlignment: true },
  "6J": { symbol: "6J",   pointValue: d(125000), tickSize: d("0.0000005"),allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.0000005"),enforceTickAlignment: false },
  "6B": { symbol: "6B",   pointValue: d(62500),  tickSize: d("0.0001"), allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.0001"), enforceTickAlignment: true },
  "EUR/USD": { symbol: "EUR/USD", pointValue: d(100000), tickSize: d("0.00001"), allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.00001"), enforceTickAlignment: false },
  "GBP/USD": { symbol: "GBP/USD", pointValue: d(100000), tickSize: d("0.00001"), allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.00001"), enforceTickAlignment: false },
  "USD/JPY": { symbol: "USD/JPY", pointValue: d(1000),   tickSize: d("0.001"),   allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.001"),   enforceTickAlignment: false },
  "USD/CHF": { symbol: "USD/CHF", pointValue: d(100000), tickSize: d("0.00001"), allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.00001"), enforceTickAlignment: false },
  "AUD/USD": { symbol: "AUD/USD", pointValue: d(100000), tickSize: d("0.00001"), allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.00001"), enforceTickAlignment: false },
  "USD/CAD": { symbol: "USD/CAD", pointValue: d(100000), tickSize: d("0.00001"), allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.00001"), enforceTickAlignment: false },
  "NZD/USD": { symbol: "NZD/USD", pointValue: d(100000), tickSize: d("0.00001"), allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.00001"), enforceTickAlignment: false },
  "EUR/GBP": { symbol: "EUR/GBP", pointValue: d(100000), tickSize: d("0.00001"), allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.00001"), enforceTickAlignment: false },
  "EUR/JPY": { symbol: "EUR/JPY", pointValue: d(1000),   tickSize: d("0.001"),   allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.001"),   enforceTickAlignment: false },
  "GBP/JPY": { symbol: "GBP/JPY", pointValue: d(1000),   tickSize: d("0.001"),   allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.001"),   enforceTickAlignment: false },
  "XAU/USD": { symbol: "XAU/USD", pointValue: d(100),    tickSize: d("0.01"),    allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.01"),    enforceTickAlignment: false },
  "BTC/USD": { symbol: "BTC/USD", pointValue: d(1),      tickSize: d("0.01"),    allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.01"),    enforceTickAlignment: false },
  "ETH/USD": { symbol: "ETH/USD", pointValue: d(1),      tickSize: d("0.01"),    allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.01"),    enforceTickAlignment: false },
  "SOL/USD": { symbol: "SOL/USD", pointValue: d(1),      tickSize: d("0.001"),   allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.001"),   enforceTickAlignment: false },
  "BNB/USD": { symbol: "BNB/USD", pointValue: d(1),      tickSize: d("0.01"),    allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.01"),    enforceTickAlignment: false },
  "XRP/USD": { symbol: "XRP/USD", pointValue: d(1),      tickSize: d("0.0001"),  allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.0001"),  enforceTickAlignment: false },
  AAPL:  { symbol: "AAPL",  pointValue: d(1), tickSize: d("0.01"), allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.01"), enforceTickAlignment: true },
  MSFT:  { symbol: "MSFT",  pointValue: d(1), tickSize: d("0.01"), allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.01"), enforceTickAlignment: true },
  NVDA:  { symbol: "NVDA",  pointValue: d(1), tickSize: d("0.01"), allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.01"), enforceTickAlignment: true },
  TSLA:  { symbol: "TSLA",  pointValue: d(1), tickSize: d("0.01"), allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.01"), enforceTickAlignment: true },
  AMZN:  { symbol: "AMZN",  pointValue: d(1), tickSize: d("0.01"), allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.01"), enforceTickAlignment: true },
  META:  { symbol: "META",  pointValue: d(1), tickSize: d("0.01"), allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.01"), enforceTickAlignment: true },
  GOOGL: { symbol: "GOOGL", pointValue: d(1), tickSize: d("0.01"), allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.01"), enforceTickAlignment: true },
  SPY:   { symbol: "SPY",   pointValue: d(1), tickSize: d("0.01"), allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.01"), enforceTickAlignment: true },
  QQQ:   { symbol: "QQQ",   pointValue: d(1), tickSize: d("0.01"), allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.01"), enforceTickAlignment: true },
  IWM:   { symbol: "IWM",   pointValue: d(1), tickSize: d("0.01"), allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.01"), enforceTickAlignment: true },
  DIA:   { symbol: "DIA",   pointValue: d(1), tickSize: d("0.01"), allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.01"), enforceTickAlignment: true },
  GLD:   { symbol: "GLD",   pointValue: d(1), tickSize: d("0.01"), allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.01"), enforceTickAlignment: true },
  TLT:   { symbol: "TLT",   pointValue: d(1), tickSize: d("0.01"), allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.01"), enforceTickAlignment: true },
  US500: { symbol: "US500", pointValue: d(1), tickSize: d("0.01"), allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.01"), enforceTickAlignment: false },
  US100: { symbol: "US100", pointValue: d(1), tickSize: d("0.01"), allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.01"), enforceTickAlignment: false },
  US30:  { symbol: "US30",  pointValue: d(1), tickSize: d("0.01"), allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.01"), enforceTickAlignment: false },
  DE40:  { symbol: "DE40",  pointValue: d(1), tickSize: d("0.01"), allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.01"), enforceTickAlignment: false },
  UK100: { symbol: "UK100", pointValue: d(1), tickSize: d("0.01"), allowZeroPrice: false, allowNegativePrice: false, minPrice: d("0.01"), enforceTickAlignment: false },
  /** Especificación explícita para instrumentos/spreads que permiten precios cero o negativos (p. ej. WTI spread / calendario) */
  CL_WTI_NEG: { symbol: "CL_WTI_NEG", pointValue: d(1000), tickSize: d("0.01"), allowZeroPrice: true, allowNegativePrice: true, minPrice: d("-100"), enforceTickAlignment: true },
  SPREAD_DIFF: { symbol: "SPREAD_DIFF", pointValue: d(20), tickSize: d("0.25"), allowZeroPrice: true, allowNegativePrice: true, minPrice: null, enforceTickAlignment: true },
};

export function getInstrumentPriceSpec(symbol: string, customOverride?: Partial<InstrumentPriceSpec>): InstrumentPriceSpec | null {
  const key = (symbol || "").trim();
  const base = INSTRUMENT_PRICE_SPECS[key] ?? INSTRUMENT_PRICE_SPECS[key.toUpperCase()];
  if (!base && !customOverride) return null;
  const fallback: InstrumentPriceSpec = base ?? {
    symbol: key || "CUSTOM",
    pointValue: d(1),
    tickSize: d("0.01"),
    allowZeroPrice: false,
    allowNegativePrice: false,
    minPrice: d("0.01"),
    enforceTickAlignment: false,
  };
  return customOverride ? { ...fallback, ...customOverride } : fallback;
}

/**
 * Comprueba si un precio es múltiplo exacto del tickSize del instrumento.
 */
export function isTickAligned(price: Decimal, tickSize: Decimal): boolean {
  if (!tickSize.isFinite() || tickSize.lte(0)) return false;
  const quotient = price.div(tickSize);
  const nearestInt = quotient.toNearest(1, Decimal.ROUND_HALF_UP);
  return quotient.minus(nearestInt).abs().lte(new Decimal("1e-9"));
}

/**
 * Paso 1 y 2: Separa presencia (EMPTY vs PRESENT) y parsea número decimal sin truncamientos silenciosos.
 * - `undefined`, `null`, `""`, `"   "` -> `presence: "EMPTY"`
 * - `"20010.25"` o `"20010,25"` -> `presence: "PRESENT"`, `Decimal("20010.25")`
 * - `"20.000,25"` (separadores mezclados ambiguos) o `"12abc"` -> `presence: "PRESENT"`, `code: "MALFORMED_DECIMAL"`
 * - `NaN`, `Infinity`, `-Infinity` -> `presence: "PRESENT"`, `code: "NON_FINITE"`
 */
export function parseRawPricePresence(raw: unknown): {
  presence: PresenceState;
  validSyntax: boolean;
  code: PriceValidationCode;
  value: Decimal | null;
  message?: string;
} {
  if (raw === undefined || raw === null) {
    return { presence: "EMPTY", validSyntax: false, code: "EMPTY_INPUT", value: null, message: "Campo vacío" };
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed === "") {
      return { presence: "EMPTY", validSyntax: false, code: "EMPTY_INPUT", value: null, message: "Campo vacío" };
    }
    // Rechazar mezcla de punto y coma o múltiples separadores (ej. "20.000,50" o "1,2,3" o "1.2.3")
    const dotCount = (trimmed.match(/\./g) || []).length;
    const commaCount = (trimmed.match(/,/g) || []).length;
    if (dotCount + commaCount > 1) {
      return {
        presence: "PRESENT",
        validSyntax: false,
        code: "MALFORMED_DECIMAL",
        value: null,
        message: `Formato numérico ambiguo o con separadores múltiples: "${trimmed}"`,
      };
    }
    const normalized = commaCount === 1 ? trimmed.replace(",", ".") : trimmed;
    if (!/^[+-]?\d+(\.\d+)?$/.test(normalized)) {
      return {
        presence: "PRESENT",
        validSyntax: false,
        code: "MALFORMED_DECIMAL",
        value: null,
        message: `Valor numérico mal formado: "${trimmed}"`,
      };
    }
    try {
      const dec = new Decimal(normalized);
      if (!dec.isFinite()) {
        return { presence: "PRESENT", validSyntax: false, code: "NON_FINITE", value: null, message: "Número no finito" };
      }
      return { presence: "PRESENT", validSyntax: true, code: "OK", value: dec };
    } catch {
      return { presence: "PRESENT", validSyntax: false, code: "MALFORMED_DECIMAL", value: null, message: "Número no válido" };
    }
  }
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) {
      return { presence: "PRESENT", validSyntax: false, code: "NON_FINITE", value: null, message: "Número no finito (NaN o Infinity)" };
    }
    return { presence: "PRESENT", validSyntax: true, code: "OK", value: new Decimal(raw) };
  }
  if (raw instanceof Decimal) {
    if (!raw.isFinite()) {
      return { presence: "PRESENT", validSyntax: false, code: "NON_FINITE", value: null, message: "Decimal no finito" };
    }
    return { presence: "PRESENT", validSyntax: true, code: "OK", value: raw };
  }
  return { presence: "PRESENT", validSyntax: false, code: "INVALID_TYPE", value: null, message: "Tipo de dato no soportado" };
}

/**
 * Paso 3: Valida un precio contra la especificación del instrumento.
 */
export function parseAndValidateInstrumentPrice(
  raw: unknown,
  instrumentSymbol: string,
  customOverride?: Partial<InstrumentPriceSpec>,
): PriceParseResult {
  const step1 = parseRawPricePresence(raw);
  if (step1.presence === "EMPTY") {
    return { presence: "EMPTY", valid: false, code: "EMPTY_INPUT", value: null, message: step1.message };
  }
  if (!step1.validSyntax || !step1.value) {
    return { presence: "PRESENT", valid: false, code: step1.code, value: null, message: step1.message };
  }

  const spec = getInstrumentPriceSpec(instrumentSymbol, customOverride);
  if (!spec) {
    return {
      presence: "PRESENT",
      valid: false,
      code: "UNSUPPORTED_INSTRUMENT",
      value: step1.value,
      message: `Instrumento "${instrumentSymbol}" no soportado en el catálogo de especificaciones.`,
    };
  }

  const val = step1.value;
  if (val.eq(0) && !spec.allowZeroPrice) {
    return {
      presence: "PRESENT",
      valid: false,
      code: "ZERO_PRICE_NOT_ALLOWED",
      value: val,
      spec,
      message: `El instrumento ${spec.symbol} no admite un precio de ejecución igual a 0.`,
    };
  }

  if (val.lt(0) && !spec.allowNegativePrice) {
    return {
      presence: "PRESENT",
      valid: false,
      code: "NEGATIVE_PRICE_NOT_ALLOWED",
      value: val,
      spec,
      message: `El instrumento ${spec.symbol} no admite precios negativos (${val.toString()}).`,
    };
  }

  if (spec.minPrice !== null && val.lt(spec.minPrice)) {
    return {
      presence: "PRESENT",
      valid: false,
      code: "BELOW_MIN_PRICE",
      value: val,
      spec,
      message: `El precio ${val.toString()} es inferior al mínimo permitido (${spec.minPrice.toString()}) para ${spec.symbol}.`,
    };
  }

  if (spec.enforceTickAlignment && !isTickAligned(val, spec.tickSize)) {
    return {
      presence: "PRESENT",
      valid: false,
      code: "INVALID_TICK_ALIGNMENT",
      value: val,
      spec,
      message: `El precio ${val.toString()} no es múltiplo del tick de ${spec.symbol} (${spec.tickSize.toString()}).`,
    };
  }

  return {
    presence: "PRESENT",
    valid: true,
    code: "OK",
    value: val,
    spec,
  };
}
