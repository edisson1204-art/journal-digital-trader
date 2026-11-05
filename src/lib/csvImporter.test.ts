import { describe, expect, it } from "vitest";
import {
  normalizeInstrumentSymbol,
  parseDateTime,
  parseNumberClean,
  parseTradesCsv,
  SAMPLE_CSV_TEMPLATE,
} from "@/lib/csvImporter";
import { computeStats } from "@/lib/tradeTypes";

describe("CSV Importer — NinjaTrader 8, Tradovate & Plantilla Estándar", () => {
  it("CSV-01: normaliza símbolos con vencimiento (MNQ 12-26, MESZ5, NQ 03-27) a su instrumento raíz y clase de activo", () => {
    expect(normalizeInstrumentSymbol("MNQ 12-26")).toEqual({
      instrument: "MNQ",
      tickerSymbol: "MNQ 12-26",
      assetClass: "Futures_Micro",
    });
    expect(normalizeInstrumentSymbol("MESZ5")).toEqual({
      instrument: "MES",
      tickerSymbol: "MESZ5",
      assetClass: "Futures_Micro",
    });
    expect(normalizeInstrumentSymbol("NQ 03-27")).toEqual({
      instrument: "NQ",
      tickerSymbol: "NQ 03-27",
      assetClass: "Futures",
    });
  });

  it("CSV-02: limpia formatos numéricos contables ($1,250.50, (45.00)) y fechas US/ISO", () => {
    expect(parseNumberClean("$1,250.50")).toBe(1250.5);
    expect(parseNumberClean("($45.00)")).toBe(-45);
    expect(parseDateTime("11/03/2026 09:42:15 AM")).toEqual({
      date: "2026-11-03",
      time: "09:42",
    });
    expect(parseDateTime("11/03/2026 02:15:00 PM")).toEqual({
      date: "2026-11-03",
      time: "14:15",
    });
  });

  it("CSV-03: parsea formato NinjaTrader 8 Trade Performance y calcula P&L neto con Decimal FIFO", () => {
    const res = parseTradesCsv(SAMPLE_CSV_TEMPLATE, {
      brokerId: "my_funded_futures",
      isFundedAccount: true,
      accountTag: "mffu-lote",
    });

    expect(res.formatDetected).toBe("NinjaTrader 8");
    expect(res.trades.length).toBe(3);
    expect(res.errors.length).toBe(0);

    // Trade 1: MNQ Long x4, 20100 -> 20135 (+35 pts * $2 * 4 = +$280 gross - $0.72 comm = +$279.28 net)
    expect(res.trades[0].instrument).toBe("MNQ");
    expect(res.trades[0].grossPnl).toBe(280);
    expect(res.trades[0].totalCommission).toBe(0.72);
    expect(res.trades[0].netPnl).toBe(279.28);
    expect(res.trades[0].tags).toContain("mffu-01");
    expect(res.trades[0].tags).toContain("mffu-lote");

    const stats = computeStats(res.trades);
    expect(stats.closedTrades).toBe(3);
    expect(stats.wins).toBe(2);
    expect(stats.losses).toBe(1);
  });

  it("CSV-04: parsea formato Tradovate (buyPrice, sellPrice, boughtTimestamp, soldTimestamp) distinguiendo Long y Short por orden temporal", () => {
    const tradovateCsv = [
      "symbol,qty,buyPrice,sellPrice,boughtTimestamp,soldTimestamp,pnl",
      "MNQZ6,2,20200.00,20225.00,11/04/2026 09:35:00,11/04/2026 09:50:00,$100.00",
      "MNQZ6,3,20260.00,20290.00,11/04/2026 10:30:00,11/04/2026 10:10:00,$180.00",
    ].join("\n");

    const res = parseTradesCsv(tradovateCsv, {
      brokerId: "lucid_trading",
      isFundedAccount: true,
      accountTag: "lucy-01",
    });

    expect(res.formatDetected).toBe("Tradovate");
    expect(res.trades.length).toBe(2);

    // Fila 1: bought (09:35) antes que sold (09:50) -> Buy (Long) ganador (+$100 gross - $0.36 comm = +$99.64)
    expect(res.trades[0].side).toBe("Buy");
    expect(res.trades[0].netPnl).toBe(99.64);

    // Fila 2: sold (10:10) antes que bought (10:30) -> Sell (Short) desde 20290 hasta 20260 (+30 pts * $2 * 3 = +$180 gross - $0.54 comm = +$179.46)
    expect(res.trades[1].side).toBe("Sell");
    expect(res.trades[1].avgEntryPrice).toBe(20290);
    expect(res.trades[1].avgExitPrice).toBe(20260);
    expect(res.trades[1].netPnl).toBe(179.46);
  });
});
