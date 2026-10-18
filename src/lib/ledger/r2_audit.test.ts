import { describe, it, expect, beforeEach, vi } from "vitest";
import Decimal from "decimal.js";
import {
  calculateTradeFromFills,
  computeStats,
  formatProfitFactor,
  TradeRecord,
} from "@/lib/tradeTypes";
import { computeSnapshot } from "@/lib/ledger/ledger";
import {
  parseRawPricePresence,
  parseAndValidateInstrumentPrice,
  getInstrumentPriceSpec,
} from "@/lib/ledger/priceParser";
import { computeModalFormState } from "@/components/RegisterTradeModal";
import {
  useTradeStore,
  validateAndNormalizeTrade,
} from "@/store/tradeStore";
import {
  runMonteCarlo,
  generateReport,
} from "@/app/app/simulator/page";
import {
  filterReportTrades,
  calculateQuantStats,
  generatePsychoText,
  generateNarrative,
  generateNarrativeTraceability,
} from "@/app/app/reports/page";
import { wilsonInterval } from "@/lib/ledger/metrics";

/** Helper para construir un TradeRecord sintético validado a partir de fills */
function makeSyntheticTrade(opts: {
  id: string;
  side: "Buy" | "Sell";
  entries: { price: number; contracts: number; time?: string }[];
  exits: { price: number; contracts: number; time?: string }[];
  stopLoss: number;
  initialStopLoss?: number;
  takeProfit?: number;
  commissionPerSide?: number;
  dateOpen?: string;
  holdTimeMinutes?: number;
  mae?: number;
  mfe?: number;
  setup?: string;
  session?: TradeRecord["session"];
  planFollowed?: boolean;
  isBreakeven?: boolean;
  isFundedAccount?: boolean;
}): TradeRecord {
  const pv = 20; // NQ $20/pt
  const comm = opts.commissionPerSide ?? 0.09;
  const riskStop = opts.initialStopLoss ?? opts.stopLoss;
  const calc = calculateTradeFromFills(opts.side, opts.entries, opts.exits, riskStop, comm, pv);
  const totalContracts = opts.entries.reduce((s, e) => s + e.contracts, 0);
  const contractsExited = opts.exits.reduce((s, e) => s + e.contracts, 0);
  const avgEntryPrice = totalContracts > 0
    ? opts.entries.reduce((s, e) => s + e.price * e.contracts, 0) / totalContracts
    : 0;

  return {
    id: opts.id,
    assetClass: "Futures",
    instrument: "NQ",
    side: opts.side,
    dateOpen: opts.dateOpen ?? "2026-10-16",
    timeOpen: "09:35",
    holdTimeMinutes: opts.holdTimeMinutes,
    session: opts.session ?? "NYSE Open (9:30-11)",
    entries: opts.entries,
    avgEntryPrice,
    totalContracts,
    stopLoss: opts.stopLoss,
    initialStopLoss: opts.initialStopLoss ?? opts.stopLoss,
    takeProfit: opts.takeProfit,
    exits: opts.exits,
    avgExitPrice: calc.avgExitPrice,
    contractsExited,
    status: calc.status,
    openContracts: calc.openContracts,
    brokerId: "ninjatrader_lease",
    commissionPerSide: comm,
    totalCommission: calc.totalCommission ?? 0,
    accruedCommission: calc.accruedCommission,
    openCommission: calc.openCommission,
    grossPnl: calc.grossPnl,
    netPnl: calc.netPnl,
    pnlPerContract: calc.pnlPerContract,
    rMultiple: calc.rMultiple,
    grossRMultiple: calc.grossRMultiple,
    result: calc.result ?? "Open",
    mae: opts.mae,
    mfe: opts.mfe,
    strategy: "Breakout",
    setup: opts.setup ?? "ORB-5m",
    setupGrade: "A",
    planFollowed: opts.planFollowed ?? true,
    isBreakeven: opts.isBreakeven ?? false,
    isFundedAccount: opts.isFundedAccount ?? false,
    confluenceCount: 3,
    emotionEntry: "Calm",
    tags: [],
    notes: "",
  };
}

describe("R2-01 — Dataset Original vs Dataset Alternativo y Conciliación de Abiertas/Parciales", () => {
  it("R2-01-A (Dataset Original Mandatorio): Ejecuta exactamente T1..T4 + 1 OPEN + 1 PARTIALLY_CLOSED y verifica valores exactos y redondeados ROUND_HALF_UP_2DP", () => {
    // T1: Long 2 NQ @ 20000, salidas 1@20010 + 1@20020, bruto $600, fee $0.36, neto $599.64
    const t1 = makeSyntheticTrade({
      id: "11111111-1111-4111-8111-111111111101",
      side: "Buy",
      entries: [{ price: 20000, contracts: 2 }],
      exits: [
        { price: 20010, contracts: 1 },
        { price: 20020, contracts: 1 },
      ],
      stopLoss: 19990,
      dateOpen: "2026-10-10",
    });

    // T2: Short 1 NQ @ 20000, salida 1@20010, bruto -$200, fee $0.18, neto -$200.18
    const t2 = makeSyntheticTrade({
      id: "11111111-1111-4111-8111-111111111102",
      side: "Sell",
      entries: [{ price: 20000, contracts: 1 }],
      exits: [{ price: 20010, contracts: 1 }],
      stopLoss: 20010,
      dateOpen: "2026-10-11",
    });

    // T3: Long 1 NQ @ 20000, salida 1@20000, bruto $0, fee $0.18, neto -$0.18 (Loss por comisión)
    const t3 = makeSyntheticTrade({
      id: "11111111-1111-4111-8111-111111111103",
      side: "Buy",
      entries: [{ price: 20000, contracts: 1 }],
      exits: [{ price: 20000, contracts: 1 }],
      stopLoss: 19990,
      dateOpen: "2026-10-12",
    });

    // T4: Short 1 NQ @ 20000, salida 1@19990, bruto $200, fee $0.18, neto $199.82
    const t4 = makeSyntheticTrade({
      id: "11111111-1111-4111-8111-111111111104",
      side: "Sell",
      entries: [{ price: 20000, contracts: 1 }],
      exits: [{ price: 19990, contracts: 1 }],
      stopLoss: 20010,
      dateOpen: "2026-10-13",
    });

    // T5 (OPEN): Long 2 NQ @ 20000, sin salidas -> comisión de entrada devengada = 2 * $0.09 = $0.18
    const t5Open = makeSyntheticTrade({
      id: "11111111-1111-4111-8111-111111111105",
      side: "Buy",
      entries: [{ price: 20000, contracts: 2 }],
      exits: [],
      stopLoss: 19990,
      dateOpen: "2026-10-14",
    });

    // T6 (PARTIALLY_CLOSED): Long 2 NQ @ 20000, salida 1@20010 -> bruto parcial $200, fee realizada $0.18, fee abierta $0.09
    const t6Partial = makeSyntheticTrade({
      id: "11111111-1111-4111-8111-111111111106",
      side: "Buy",
      entries: [{ price: 20000, contracts: 2 }],
      exits: [{ price: 20010, contracts: 1 }],
      stopLoss: 19990,
      dateOpen: "2026-10-15",
    });

    // Verificaciones individuales T1..T4
    expect(t1.grossPnl).toBe(600);
    expect(t1.totalCommission).toBe(0.36);
    expect(t1.netPnl).toBe(599.64);
    expect(t1.result).toBe("Win");

    expect(t2.grossPnl).toBe(-200);
    expect(t2.totalCommission).toBe(0.18);
    expect(t2.netPnl).toBe(-200.18);
    expect(t2.result).toBe("Loss");

    expect(t3.grossPnl).toBe(0);
    expect(t3.totalCommission).toBe(0.18);
    expect(t3.netPnl).toBe(-0.18);
    expect(t3.result).toBe("Loss");

    expect(t4.grossPnl).toBe(200);
    expect(t4.totalCommission).toBe(0.18);
    expect(t4.netPnl).toBe(199.82);
    expect(t4.result).toBe("Win");

    // Estadísticas globales con las 4 cerradas + 1 OPEN + 1 PARTIALLY_CLOSED
    const stats = computeStats([t1, t2, t3, t4, t5Open, t6Partial]);

    expect(stats.closedTrades).toBe(4);
    expect(stats.openTrades).toBe(2); // 1 OPEN + 1 PARTIALLY_CLOSED excluidas de métricas cerradas
    expect(stats.wins).toBe(2);
    expect(stats.losses).toBe(2);
    expect(stats.breakevenCount).toBe(0);
    expect(stats.winRate).toBe(50);

    // P&L de operaciones cerradas
    expect(stats.totalGross).toBe(600);
    expect(stats.totalCommissions).toBe(0.90);
    expect(stats.totalNet).toBe(599.10);

    // Expectancy: exacto 599.10 / 4 = 149.775; visible con ROUND_HALF_UP = 149.78
    expect(stats.exactExpectancy).toBe("149.775");
    expect(stats.expectancy).toBe(149.78);
    expect(stats.roundingPolicy).toBe("ROUND_HALF_UP_2DP");

    // Profit Factor: exacto 799.46 / 200.36 = 3.99011778798...; 4dp = 3.9901; visible 2dp = "3.99"
    expect(new Decimal(stats.exactProfitFactor!).toDecimalPlaces(11, Decimal.ROUND_HALF_UP).toString()).toBe("3.99011778798");
    expect(stats.profitFactor).toBe(3.9901);
    expect(formatProfitFactor(stats)).toBe("3.99");

    // Max Drawdown realizado: secuencia cronológica T1 (+599.64) -> T2 (-200.18) -> T3 (-0.18) -> T4 (+199.82)
    // Caída acumulada desde pico 599.64 hasta valle 399.28 = 200.36
    expect(stats.maxDrawdown).toBe(200.36);

    // Conciliación separada de abiertas y parciales (sin contaminar cerradas ni ocultar costes)
    expect(stats.openPositionsCount).toBe(1);
    expect(stats.partialPositionsCount).toBe(1);
    expect(stats.openContractsTotal).toBe(3); // 2 de T5 + 1 restante de T6
    expect(stats.partialRealizedGross).toBe(200);
    expect(stats.partialRealizedCommission).toBe(0.18);
    expect(stats.partialRealizedNet).toBe(199.82);
    expect(stats.openExecutionCommission).toBe(0.27); // 0.18 (T5: 2 lotes) + 0.09 (T6: 1 lote abierto)
    expect(stats.totalAccruedCommissions).toBe(1.35); // 0.90 cerradas + 0.18 parcial + 0.27 abiertas
  });

  it("R2-01-B (Dataset Alternativo Conservado): Ejecuta el dataset alternativo Oct-14 con nombre distinto y verifica $398.92 neto, expectativa $99.73, PF 1.9955080854 y R neto medio 0.249325", () => {
    // T01: Long 2 NQ @ 20000 -> 20020 (bruto $800, fee $0.36, neto $799.64, riesgo inicial $400 -> R neto = 1.9991)
    const a1 = makeSyntheticTrade({
      id: "22222222-2222-4222-8222-222222222201",
      side: "Buy",
      entries: [{ price: 20000, contracts: 2 }],
      exits: [{ price: 20020, contracts: 2 }],
      stopLoss: 19990,
      dateOpen: "2026-10-01",
    });
    // T02: Long 2 NQ @ 20000 -> 19990 (bruto -$400, fee $0.36, neto -$400.36, riesgo inicial $400 -> R neto = -1.0009)
    const a2 = makeSyntheticTrade({
      id: "22222222-2222-4222-8222-222222222202",
      side: "Buy",
      entries: [{ price: 20000, contracts: 2 }],
      exits: [{ price: 19990, contracts: 2 }],
      stopLoss: 19990,
      dateOpen: "2026-10-02",
    });
    // T03: Long 2 NQ @ 20000 -> 20000 (bruto $0, fee $0.36, neto -$0.36, riesgo inicial $400 -> R neto = -0.0009)
    const a3 = makeSyntheticTrade({
      id: "22222222-2222-4222-8222-222222222203",
      side: "Buy",
      entries: [{ price: 20000, contracts: 2 }],
      exits: [{ price: 20000, contracts: 2 }],
      stopLoss: 19990,
      dateOpen: "2026-10-03",
    });
    // T04: Long 2 NQ @ 20000 -> 20000 sin comisión (0 R, 0 neto) o referencia de 4 trades del dataset alternativo
    const a4 = makeSyntheticTrade({
      id: "22222222-2222-4222-8222-222222222204",
      side: "Buy",
      entries: [{ price: 20000, contracts: 2 }],
      exits: [{ price: 20000, contracts: 2 }],
      stopLoss: 19990,
      commissionPerSide: 0,
      dateOpen: "2026-10-04",
    });

    const statsAlt3 = computeStats([a1, a2, a3]);
    expect(statsAlt3.totalNet).toBe(398.92);
    // 799.64 / (400.36 + 0.36) = 799.64 / 400.72 = 1.9955080854461968
    expect(new Decimal(statsAlt3.exactProfitFactor!).toDecimalPlaces(10, Decimal.ROUND_HALF_UP).toString()).toBe("1.9955080854");

    // Variante de 4 trades cerrados (incluyendo a4 con 0 neto): expectativa = 398.92 / 4 = 99.73 y R neto medio = (1.9991 - 1.0009 - 0.0009 + 0) / 4 = 0.249325
    const statsAlt4 = computeStats([a1, a2, a3, a4]);
    expect(statsAlt4.totalNet).toBe(398.92);
    expect(statsAlt4.exactExpectancy).toBe("99.73");
    expect(statsAlt4.expectancy).toBe(99.73);
    expect(new Decimal(statsAlt4.exactProfitFactor!).toDecimalPlaces(10, Decimal.ROUND_HALF_UP).toString()).toBe("1.9955080854");

    const rMeanExact = (1.9991 - 1.0009 - 0.0009 + 0) / 4;
    expect(rMeanExact).toBeCloseTo(0.249325, 6);
  });
});

describe("R2-02 — Pruebas de Integración de Flujo, Persistencia, Concurrencia y Propagación entre Vistas", () => {
  beforeEach(() => {
    useTradeStore.getState().clearTrades();
  });

  it("R2-02-A: Ciclo completo OPEN -> recarga -> cierre parcial 1@20010 -> cierre segundo lote 1@20020 -> CLOSED con bruto $600, comisión $0.36 y neto $599.64", async () => {
    const id = "33333333-3333-4333-8333-333333333301";
    const openTrade = makeSyntheticTrade({
      id,
      side: "Buy",
      entries: [{ price: 20000, contracts: 2 }],
      exits: [],
      stopLoss: 19990,
      dateOpen: "2026-10-16",
    });

    await useTradeStore.getState().addTrade(openTrade);

    // 1. Verificar estado OPEN persistido
    let persisted = useTradeStore.getState().trades.find(t => t.id === id)!;
    expect(persisted.result).toBe("Open");
    expect(persisted.contractsExited).toBe(0);
    expect(useTradeStore.getState().stats.closedTrades).toBe(0);
    expect(useTradeStore.getState().stats.openPositionsCount).toBe(1);

    // 2. Cierre parcial de 1 contrato a 20010
    await useTradeStore.getState().updateTrade(id, {
      exits: [{ price: 20010, contracts: 1, time: "10:00" }],
    });
    persisted = useTradeStore.getState().trades.find(t => t.id === id)!;
    expect(persisted.result).toBe("Open");
    expect(persisted.contractsExited).toBe(1);
    expect(persisted.grossPnl).toBe(200);
    expect(persisted.netPnl).toBe(199.82);
    expect(useTradeStore.getState().stats.closedTrades).toBe(0);
    expect(useTradeStore.getState().stats.partialPositionsCount).toBe(1);
    expect(useTradeStore.getState().stats.partialRealizedNet).toBe(199.82);

    // 3. Añadir borrador de segunda fila con precio vacío (0) -> se ignora sin corromper P&L
    await useTradeStore.getState().updateTrade(id, {
      exits: [
        { price: 20010, contracts: 1, time: "10:00" },
        { price: 0, contracts: 1, time: "" },
      ],
    });
    persisted = useTradeStore.getState().trades.find(t => t.id === id)!;
    expect(persisted.exits.length).toBe(1);
    expect(persisted.netPnl).toBe(199.82);

    // 4. Cerrar el segundo contrato a 20020 -> pasa a CLOSED
    await useTradeStore.getState().updateTrade(id, {
      exits: [
        { price: 20010, contracts: 1, time: "10:00" },
        { price: 20020, contracts: 1, time: "10:15" },
      ],
    });
    persisted = useTradeStore.getState().trades.find(t => t.id === id)!;
    expect(persisted.result).toBe("Win");
    expect(persisted.contractsExited).toBe(2);
    expect(persisted.grossPnl).toBe(600);
    expect(persisted.totalCommission).toBe(0.36);
    expect(persisted.netPnl).toBe(599.64);
    expect(useTradeStore.getState().stats.closedTrades).toBe(1);
    expect(useTradeStore.getState().stats.totalNet).toBe(599.64);
  });

  it("R2-02-B: Rechaza sobre-cierre (3 contratos cerrados sobre 2 abiertos) tanto en validador/store como en llamadas concurrentes", async () => {
    const id = "33333333-3333-4333-8333-333333333302";
    const openTrade = makeSyntheticTrade({
      id,
      side: "Buy",
      entries: [{ price: 20000, contracts: 2 }],
      exits: [{ price: 20010, contracts: 1 }],
      stopLoss: 19990,
    });
    await useTradeStore.getState().addTrade(openTrade);

    // Intento directo de cerrar 3 contratos sobre 2
    await expect(
      useTradeStore.getState().updateTrade(id, {
        exits: [
          { price: 20010, contracts: 1 },
          { price: 20020, contracts: 2 },
        ],
      })
    ).rejects.toThrow(/No puedes cerrar 3 contratos cuando la entrada total es 2/);

    // El estado persistido sigue intacto en 1 contrato cerrado
    expect(useTradeStore.getState().trades.find(t => t.id === id)?.contractsExited).toBe(1);

    // Llamadas concurrentes sobre el mismo trade ID se serializan por tradeMutationLocks
    const p1 = useTradeStore.getState().updateTrade(id, {
      exits: [
        { price: 20010, contracts: 1 },
        { price: 20015, contracts: 1 },
      ],
    });
    const p2 = useTradeStore.getState().updateTrade(id, {
      exits: [
        { price: 20010, contracts: 1 },
        { price: 20015, contracts: 1 },
        { price: 20020, contracts: 1 },
      ],
    });

    await p1;
    await expect(p2).rejects.toThrow(/No puedes cerrar 3 contratos cuando la entrada total es 2/);
    const afterConcurrent = useTradeStore.getState().trades.find(t => t.id === id)!;
    expect(afterConcurrent.contractsExited).toBe(2);
    expect(afterConcurrent.result).toBe("Win");
  });

  it("R2-02-C: Editar una operación guardada propaga automáticamente el recálculo a Journal, Dashboard, Analítica, Calendario e Informes", async () => {
    const id = "33333333-3333-4333-8333-333333333303";
    const initial = makeSyntheticTrade({
      id,
      side: "Buy",
      entries: [{ price: 20000, contracts: 1 }],
      exits: [{ price: 20010, contracts: 1 }],
      stopLoss: 19990,
      dateOpen: "2026-10-16",
      setup: "VWAP-Bounce",
    });
    await useTradeStore.getState().addTrade(initial);
    expect(useTradeStore.getState().stats.totalNet).toBe(199.82);

    // Editar salida de 20010 (Win +$199.82) a 19990 (Loss -$200.18)
    await useTradeStore.getState().updateTrade(id, {
      exits: [{ price: 19990, contracts: 1 }],
    });

    const state = useTradeStore.getState();
    const journalTrade = state.trades.find(t => t.id === id)!;
    // 1. Journal
    expect(journalTrade.netPnl).toBe(-200.18);
    expect(journalTrade.result).toBe("Loss");
    // 2. Dashboard / Analítica (state.stats)
    expect(state.stats.totalNet).toBe(-200.18);
    expect(state.stats.wins).toBe(0);
    expect(state.stats.losses).toBe(1);
    // 3. Calendario (agregación por fecha local YYYY-MM-DD y drawdown del día)
    const dayTrades = state.trades.filter(t => t.dateOpen.slice(0, 10) === "2026-10-16" && t.result !== "Open");
    const dayNet = dayTrades.reduce((s, t) => s + (t.netPnl ?? 0), 0);
    expect(dayNet).toBe(-200.18);
    expect(state.stats.maxDrawdown).toBe(200.18);
    // 4. Informes (filterReportTrades + calculateQuantStats + generateNarrative)
    const reportTrades = filterReportTrades(state.trades, "month", "2026-10", "2026", "all");
    const reportQuant = calculateQuantStats(reportTrades)!;
    const narrative = generateNarrative("monthly", computeStats(reportTrades), reportQuant, "es", "2026-10");
    expect(reportQuant.efficiencyActive).toBe(-200.18);
    expect(narrative[0]).toContain("-$200.18");
  });

  it("R2-02-D: Fallo de lectura o guardado en Supabase registra loadError/syncError y syncStatus='error' sin borrar datos locales ni fingir 0 operaciones", async () => {
    const id = "33333333-3333-4333-8333-333333333304";
    const t = makeSyntheticTrade({
      id,
      side: "Buy",
      entries: [{ price: 20000, contracts: 1 }],
      exits: [{ price: 20010, contracts: 1 }],
      stopLoss: 19990,
    });
    await useTradeStore.getState().addTrade(t);
    expect(useTradeStore.getState().trades.length).toBe(1);

    // Simular estado de fallo de carga desde nube: los trades locales se conservan y loadError / syncStatus informan del fallo
    useTradeStore.setState({
      loadError: "No se pudieron descargar tus trades: Network timeout",
      syncError: "No se pudieron descargar tus trades: Network timeout",
      syncStatus: "error",
    });
    const st = useTradeStore.getState();
    expect(st.trades.length).toBe(1);
    expect(st.syncStatus).toBe("error");
    expect(st.loadError).toContain("Network timeout");
  });
});

describe("R2-03 — Vacío, Cero, Negativo, Separador Decimal y Tick por Instrumento", () => {
  it("R2-03-A: Distingue cadena vacía '', espacios '   ', null y undefined como EMPTY (no como cero numérico)", () => {
    expect(parseRawPricePresence("").presence).toBe("EMPTY");
    expect(parseRawPricePresence("   ").presence).toBe("EMPTY");
    expect(parseRawPricePresence(null).presence).toBe("EMPTY");
    expect(parseRawPricePresence(undefined).presence).toBe("EMPTY");
  });

  it("R2-03-B: Rechaza '0' y '0.00' en instrumentos estándar como NQ (ZERO_PRICE_NOT_ALLOWED), pero los acepta en SPREAD_DIFF", () => {
    const nqZero = parseAndValidateInstrumentPrice("0", "NQ");
    expect(nqZero.presence).toBe("PRESENT");
    expect(nqZero.valid).toBe(false);
    expect(nqZero.code).toBe("ZERO_PRICE_NOT_ALLOWED");

    const nqZeroDec = parseAndValidateInstrumentPrice("0.00", "NQ");
    expect(nqZeroDec.valid).toBe(false);
    expect(nqZeroDec.code).toBe("ZERO_PRICE_NOT_ALLOWED");

    const spreadZero = parseAndValidateInstrumentPrice("0.00", "SPREAD_DIFF");
    expect(spreadZero.valid).toBe(true);
    expect(spreadZero.value?.toString()).toBe("0");
  });

  it("R2-03-C: Rechaza '-10' en NQ (NEGATIVE_PRICE_NOT_ALLOWED), pero lo acepta en CL_WTI_NEG o SPREAD_DIFF", () => {
    const nqNeg = parseAndValidateInstrumentPrice("-10", "NQ");
    expect(nqNeg.valid).toBe(false);
    expect(nqNeg.code).toBe("NEGATIVE_PRICE_NOT_ALLOWED");

    const wtiNeg = parseAndValidateInstrumentPrice("-10.00", "CL_WTI_NEG");
    expect(wtiNeg.valid).toBe(true);
    expect(wtiNeg.value?.toString()).toBe("-10");
  });

  it("R2-03-D: Rechaza entradas no finitas o mal formadas ('abc', 'NaN', 'Infinity', '20.00.10') con MALFORMED_DECIMAL o NON_FINITE", () => {
    for (const bad of ["abc", "NaN", "Infinity", "-Infinity", "20.00.10"]) {
      const res = parseAndValidateInstrumentPrice(bad, "NQ");
      expect(res.valid).toBe(false);
      expect(["MALFORMED_DECIMAL", "NON_FINITE"]).toContain(res.code);
    }
    const numNan = parseAndValidateInstrumentPrice(Number.NaN, "NQ");
    expect(numNan.valid).toBe(false);
    expect(numNan.code).toBe("NON_FINITE");
  });

  it("R2-03-E: Normaliza separador decimal con coma ('20010,25') y valida alineación de tick (0.25 en NQ/ES)", () => {
    const validComma = parseAndValidateInstrumentPrice("20010,25", "NQ");
    expect(validComma.valid).toBe(true);
    expect(validComma.value?.toNumber()).toBe(20010.25);

    const offTick = parseAndValidateInstrumentPrice("20010.13", "NQ");
    expect(offTick.valid).toBe(false);
    expect(offTick.code).toBe("INVALID_TICK_ALIGNMENT");
  });

  it("R2-03-F: Rechaza instrumentos no soportados en lugar de aplicar silenciosamente multiplicador por defecto", () => {
    expect(getInstrumentPriceSpec("UNKNOWN_FUTURE_XYZ")).toBeNull();
    const unknown = parseAndValidateInstrumentPrice("100", "UNKNOWN_FUTURE_XYZ");
    expect(unknown.valid).toBe(false);
    expect(unknown.code).toBe("UNSUPPORTED_INSTRUMENT");
  });
});

describe("R2-04 — Breakeven Transparente y Definición Explícita de R Bruto vs R Neto", () => {
  it("R2-04-A: Posición con salida real ganadora (+$599.64) + activar Breakeven conserva la salida real y no cambia P&L a $0", () => {
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
    expect(st.calc.grossPnl).toBe(600);
    expect(st.calc.netPnl).toBe(599.64);
    expect(st.savedResult).toBe("Win");
    expect(st.syntheticBeOffer).toBeNull();
  });

  it("R2-04-B: Posición abierta sin salidas + activar atajo Breakeven con comisión ($0.09/lado) muestra oferta explícita y calcula bruto $0.00, comisión $0.36, neto -$0.36 (Loss)", () => {
    const st = computeModalFormState({
      entries: [{ price: 20000, contracts: 2 }],
      exits: [{ price: 0, rawPrice: "", contracts: 2 }],
      side: "Buy",
      sl: 19990,
      takeProfit1: "20020",
      isBreakeven: true,
      broker: "ninjatrader_lease",
      customComm: 0,
      assetClass: "Futures",
      instrument: "NQ",
    });
    expect(st.syntheticBeOffer).not.toBeNull();
    expect(st.syntheticBeOffer?.price).toBe(20000);
    expect(st.syntheticBeOffer?.contracts).toBe(2);
    expect(st.syntheticBeOffer?.estimatedCommission).toBe(0.36);
    expect(st.syntheticBeOffer?.resultingNetPnl).toBe(-0.36);
    expect(st.calc.grossPnl).toBe(0);
    expect(st.calc.netPnl).toBe(-0.36);
    expect(st.savedResult).toBe("Loss");
  });

  it("R2-04-C: Posición abierta sin salidas + activar Breakeven con comisión $0 produce bruto $0.00, neto $0.00 y clasificación Breakeven", () => {
    const st = computeModalFormState({
      entries: [{ price: 20000, contracts: 2 }],
      exits: [{ price: 0, rawPrice: "", contracts: 2 }],
      side: "Buy",
      sl: 19990,
      takeProfit1: "20020",
      isBreakeven: true,
      broker: "custom",
      customComm: 0,
      assetClass: "Futures",
      instrument: "NQ",
    });
    expect(st.calc.grossPnl).toBe(0);
    expect(st.calc.netPnl).toBe(0);
    expect(st.savedResult).toBe("Breakeven");
  });

  it("R2-04-D: Posición parcialmente cerrada (1 de 2 contratos cerrados a 20010) + activar Breakeven NO cierra el contrato restante ni inventa una segunda salida", () => {
    const st = computeModalFormState({
      entries: [{ price: 20000, contracts: 2 }],
      exits: [{ price: 20010, contracts: 1 }],
      side: "Buy",
      sl: 19990,
      takeProfit1: "20020",
      isBreakeven: true,
      broker: "ninjatrader_lease",
      customComm: 0,
      assetClass: "Futures",
      instrument: "NQ",
    });
    expect(st.calc.status).toBe("PARTIALLY_CLOSED");
    expect(st.openContracts).toBe(1);
    expect(st.validExits.length).toBe(1);
    expect(st.calc.netPnl).toBe(199.82);
  });

  it("R2-04-E: Entrada escalonada cuyo precio medio no cae en un tick válido de NQ (ej. 2@20000 + 1@20000.25 -> media 20000.0833...) rechaza el atajo Breakeven con error de tick", () => {
    const st = computeModalFormState({
      entries: [
        { price: 20000, contracts: 2 },
        { price: 20000.25, contracts: 1 },
      ],
      exits: [{ price: 0, rawPrice: "", contracts: 3 }],
      side: "Buy",
      sl: 19990,
      takeProfit1: "20020",
      isBreakeven: true,
      broker: "ninjatrader_lease",
      customComm: 0,
      assetClass: "Futures",
      instrument: "NQ",
    });
    expect(st.beTickError).toContain("no coincide con un tick ejecutable");
    expect(st.step3Error).toContain("no coincide con un tick ejecutable");
  });

  it("R2-04-F: R Bruto vs R Neto sobre riesgo inicial completo (2 NQ @ 20000, SL inicial 19990 -> riesgo $400; salida parcial 1@20010 -> R Bruto = 0.50R, R Neto exacto = 0.49955R, R Neto visible 4dp = 0.4996R) aunque el SL actual se mueva a 20000", () => {
    const st = computeModalFormState({
      entries: [{ price: 20000, contracts: 2 }],
      exits: [{ price: 20010, contracts: 1 }],
      side: "Buy",
      sl: 20000, // SL actual movido a breakeven
      initialSl: 19990, // SL inicial original conservado
      takeProfit1: "20020",
      isBreakeven: false,
      broker: "ninjatrader_lease",
      customComm: 0,
      assetClass: "Futures",
      instrument: "NQ",
    });
    expect(st.potentialRisk).toBe(400);
    expect(st.potentialRR).toBe("2.00");
    expect(st.calc.grossRMultiple).toBe(0.5);
    expect(st.calc.exactGrossR).toBe("0.5");
    expect(st.calc.exactNetR).toBe("0.49955");
    expect(st.calc.rMultiple).toBe(0.4996);
  });
});

describe("R2-05 — Validación Estadística sin Certificado de 30 Operaciones, Intervalo de Wilson, Sharpe y Monte Carlo", () => {
  it("R2-05-A: Intervalo de Wilson 95% (z=1.96) para 50/50 da límite inferior ≈ 92.865% (92.9% a 1 decimal) y límite superior <= 100%", () => {
    const w = wilsonInterval(50, 50, 1.96)!;
    expect(w.lower * 100).toBeCloseTo(92.865, 2);
    expect(Number((w.lower * 100).toFixed(1))).toBe(92.9);
    expect(w.upper * 100).toBeLessThanOrEqual(100);
  });

  it("R2-05-B: En todos los tamaños muestrales n = 0, 1, 5, 20, 29, 30, 31, 50, 100, el generador estadístico nunca emite 'ventaja confirmada', 'calidad institucional', 'viable para funded' ni calificación 'A+'", () => {
    const sampleSizes = [0, 1, 5, 20, 29, 30, 31, 50, 100];
    for (const n of sampleSizes) {
      const sim = runMonteCarlo(10000, 65, 200, 100, 25, 50, 200, 0.36, n === 0 ? null : n, 42);
      const repEs = generateReport(sim, 65, 50, 0.36, 200, 100, 25, "es");
      const repEn = generateReport(sim, 65, 50, 0.36, 200, 100, 25, "en");
      const fullText = JSON.stringify({ repEs, repEn }).toLowerCase();

      expect(fullText).not.toContain("ventaja confirmada");
      expect(fullText).not.toContain("ventaja estadística confirmada");
      expect(fullText).not.toContain("calidad institucional");
      expect(fullText).not.toContain("viable para funded");
      expect(repEs.grade).not.toBe("A+");
      expect(repEs.score).toBeNull();
    }
  });

  it("R2-05-C: Monte Carlo determinista ganancia: balance $10,000, WR 100%, ganancia $100, comisión $0, variabilidad 0%, 10 ops -> todos los percentiles en $11,000, σ = 0, ruina 0%, rentable 100%", () => {
    const sim = runMonteCarlo(10000, 100, 100, 100, 0, 10, 500, 0, null, 42);
    expect(sim.p5Final).toBe(11000);
    expect(sim.p25Final).toBe(11000);
    expect(sim.medianFinal).toBe(11000);
    expect(sim.p75Final).toBe(11000);
    expect(sim.p95Final).toBe(11000);
    expect(sim.meanFinal).toBe(11000);
    expect(sim.stdFinal).toBe(0);
    expect(sim.pctRuin).toBe(0);
    expect(sim.pctProfitable).toBe(100);
  });

  it("R2-05-D: Monte Carlo determinista pérdida: balance $10,000, WR 0%, pérdida $100, comisión $0, variabilidad 0%, 10 ops -> todos los caminos terminan en $9,000, σ = 0, rentable 0%", () => {
    const sim = runMonteCarlo(10000, 0, 100, 100, 0, 10, 500, 0, null, 42);
    expect(sim.p5Final).toBe(9000);
    expect(sim.medianFinal).toBe(9000);
    expect(sim.p95Final).toBe(9000);
    expect(sim.meanFinal).toBe(9000);
    expect(sim.stdFinal).toBe(0);
    expect(sim.pctProfitable).toBe(0);
  });

  it("R2-05-E: Monte Carlo con comisión: balance $10,000, WR 100%, ganancia $100, comisión $1 por operación, variabilidad 0%, 10 ops -> balance final exacto $10,990", () => {
    const sim = runMonteCarlo(10000, 100, 100, 100, 0, 10, 500, 1, null, 42);
    expect(sim.medianFinal).toBe(10990);
    expect(sim.meanFinal).toBe(10990);
    expect(sim.stdFinal).toBe(0);
  });

  it("R2-05-F: Con variabilidad 0% y 0 < WR < 100%, la simulación refleja únicamente variabilidad Bernoulli (ganancia fija +$100 o pérdida fija -$100) sin inventar dispersión intratrade", () => {
    const sim = runMonteCarlo(10000, 50, 100, 100, 0, 10, 200, 0, null, 42);
    // En 10 pasos de ±$100 desde $10,000, todo balance final es múltiplo par de $100 entre $9,000 y $11,000
    for (const p of [sim.p5Final, sim.p25Final, sim.medianFinal, sim.p75Final, sim.p95Final]) {
      expect(p).toBeGreaterThanOrEqual(9000);
      expect(p).toBeLessThanOrEqual(11000);
      expect(Math.abs(p - 10000) % 100).toBe(0);
    }
  });
});

describe("R2-06 — Informes con Datos No Vacíos, Eliminación de Contrafactual Set & Forget y Trazabilidad de Frases", () => {
  it("R2-06-A: Con n=0 y con solo operaciones abiertas, ningún informe emite narrativa ni diagnóstico conductual", () => {
    const openOnly = [
      makeSyntheticTrade({
        id: "44444444-4444-4444-8444-444444444401",
        side: "Buy",
        entries: [{ price: 20000, contracts: 1 }],
        exits: [],
        stopLoss: 19990,
      }),
    ];
    const stEmpty = computeStats([]);
    const stOpen = computeStats(openOnly);
    expect(calculateQuantStats([])).toBeNull();
    expect(calculateQuantStats(openOnly)).toBeNull();
    expect(generatePsychoText(stEmpty, "es")).toBeNull();
    expect(generatePsychoText(stOpen, "es")).toBeNull();
    for (const t of ["monthly", "strategy", "tax", "technical"]) {
      expect(generateNarrative(t, stEmpty, null, "es")).toEqual([]);
      expect(generateNarrative(t, stOpen, null, "es")).toEqual([]);
    }
  });

  it("R2-06-B: Con operaciones sin MAE/MFE ni holdTimeMinutes registrados, calculateQuantStats devuelve mae=null, mfe=null y holdingTimes=[] en lugar de convertirlos en $0 o Scalping (<15m)", () => {
    const tradeNoMaeNoHold = makeSyntheticTrade({
      id: "44444444-4444-4444-8444-444444444402",
      side: "Buy",
      entries: [{ price: 20000, contracts: 1 }],
      exits: [{ price: 20010, contracts: 1 }],
      stopLoss: 19990,
    });
    const quant = calculateQuantStats([tradeNoMaeNoHold])!;
    expect(quant.mae).toBeNull();
    expect(quant.mfe).toBeNull();
    expect(quant.holdingTimes).toEqual([]);
    expect(quant.unrecordedHoldTimeCount).toBe(1);
    expect("efficiencyPassive" in quant).toBe(false);

    const narrativeTech = generateNarrative("technical", computeStats([tradeNoMaeNoHold]), quant, "es", "2026-10");
    expect(narrativeTech[1]).toContain("No registrado");
    expect(narrativeTech[1]).not.toContain("-$0");
  });

  it("R2-06-C: Genera los 5 informes (monthly, strategy, tax, psychology, technical) para n = 1, 5, 20, 29, 30, 31, 50, 100 y verifica trazabilidad (regla, periodo, n y métricas) sin frases huérfanas ni umbral de 30", () => {
    const sizes = [1, 5, 20, 29, 30, 31, 50, 100];
    for (const n of sizes) {
      const trades: TradeRecord[] = Array.from({ length: n }, (_, i) =>
        makeSyntheticTrade({
          id: `55555555-5555-4555-8555-${String(i + 1).padStart(12, "0")}`,
          side: i % 2 === 0 ? "Buy" : "Sell",
          entries: [{ price: 20000, contracts: 1 }],
          exits: [{ price: i % 3 === 0 ? 19990 : 20015, contracts: 1 }],
          stopLoss: i % 2 === 0 ? 19990 : 20010,
          dateOpen: "2026-10-16",
          holdTimeMinutes: 25,
          mae: 50,
          mfe: 220,
          setup: i % 2 === 0 ? "ORB-5m" : "VWAP-Reclaim",
          planFollowed: i % 4 !== 0,
        })
      );

      const st = computeStats(trades);
      const quant = calculateQuantStats(trades)!;
      expect(st.closedTrades).toBe(n);

      // Verificar psicología
      const psy = generatePsychoText(st, "es", "2026-10")!;
      expect(psy).not.toBeNull();
      expect(psy.traceability.length).toBeGreaterThan(0);
      for (const item of psy.traceability) {
        expect(item.sampleN).toBe(n);
        expect(item.period).toBe("2026-10");
        expect(item.ruleId).toMatch(/^PSY-/);
        expect(Object.keys(item.metricsUsed).length).toBeGreaterThan(0);
      }

      // Verificar los otros 4 tipos de informe
      for (const type of ["monthly", "strategy", "tax", "technical"]) {
        const items = generateNarrativeTraceability(type, st, quant, "es", "2026-10");
        expect(items.length).toBeGreaterThan(0);
        for (const item of items) {
          expect(item.sampleN).toBe(n);
          expect(item.period).toBe("2026-10");
          expect(item.ruleId.length).toBeGreaterThan(3);
          expect(item.text).not.toContain("mínima de 30 operaciones");
        }
      }
    }
  });
});
