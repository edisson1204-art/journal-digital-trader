import {
  ASSET_CLASS_CONFIG,
  BROKER_PRESETS,
  calculateTradeFromFills,
  getPointValue,
  type AssetClass,
  type SetupGrade,
  type TradeRecord,
  type TradeSide,
  type TradingSession,
} from "@/lib/tradeTypes";

export interface CsvImportOptions {
  brokerId: string;
  isFundedAccount: boolean;
  defaultStrategy?: string;
  defaultSetup?: string;
  accountTag?: string;
}

export interface CsvParseResult {
  formatDetected: "NinjaTrader 8" | "Tradovate" | "Estándar / Plantilla" | "Desconocido";
  trades: TradeRecord[];
  skippedRows: number;
  errors: string[];
}

/** Divide una línea CSV respetando comillas dobles y delimitador (coma o punto y coma) */
export function splitCsvLine(line: string, delimiter: "," | ";" = ","): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/** Limpia cadenas numéricas de NinjaTrader / Tradovate (ej. "$1,240.50", "(45.00)", "20,150.25") */
export function parseNumberClean(raw: string | undefined): number {
  if (!raw) return NaN;
  let s = raw.trim().replace(/^["']|["']$/g, "");
  if (!s) return NaN;
  const isParenNegative = /^\(.*\)$/.test(s);
  s = s.replace(/[()$€£\s]/g, "");
  // Si tiene coma decimal europea (ej. "20100,25" sin punto)
  if (s.includes(",") && !s.includes(".")) {
    const parts = s.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      s = s.replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else {
    s = s.replace(/,/g, "");
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return NaN;
  return isParenNegative ? -Math.abs(n) : n;
}

/** Normaliza símbolos de futuros con vencimiento (ej. "MNQ 12-26", "MNQZ5", "MES 03-26") */
export function normalizeInstrumentSymbol(rawSymbol: string): {
  instrument: string;
  tickerSymbol?: string;
  assetClass: AssetClass;
} {
  const cleaned = (rawSymbol || "").trim().toUpperCase();
  if (!cleaned) {
    return { instrument: "MNQ", assetClass: "Futures_Micro" };
  }

  // Extraer raíz antes de espacio o código de mes/año (F,G,H,J,K,M,N,Q,U,V,X,Z + dígitos)
  const spaceRoot = cleaned.split(/\s+/)[0];
  const futuresRoots = [
    "MNQ", "MES", "MYM", "M2K", "MGC", "MCL", "MBT", "M6E", "M6B", "MHNG",
    "NQ", "ES", "YM", "RTY", "CL", "GC", "SI", "ZB", "ZN", "6E", "6B", "6J", "6A", "NG", "HO",
  ];

  let matchedRoot = "";
  for (const r of futuresRoots) {
    if (spaceRoot === r || new RegExp(`^${r}[FGHJKMNQUVXZ]?\\d+$`).test(spaceRoot)) {
      matchedRoot = r;
      break;
    }
  }

  const base = matchedRoot || spaceRoot;
  let assetClass: AssetClass = "Futures";
  for (const [ac, cfg] of Object.entries(ASSET_CLASS_CONFIG) as [AssetClass, (typeof ASSET_CLASS_CONFIG)[AssetClass]][]) {
    if (cfg.instruments.includes(base)) {
      assetClass = ac;
      break;
    }
  }
  if (!matchedRoot && base.startsWith("M") && ["MNQ", "MES", "MYM", "M2K", "MGC", "MCL"].includes(base)) {
    assetClass = "Futures_Micro";
  }

  return {
    instrument: base,
    tickerSymbol: cleaned !== base ? cleaned : undefined,
    assetClass,
  };
}

/** Extrae fecha ISO YYYY-MM-DD y hora HH:MM desde formatos US/EU/ISO */
export function parseDateTime(raw: string | undefined): { date: string; time: string } {
  const fallbackDate = new Date().toISOString().slice(0, 10);
  if (!raw) return { date: fallbackDate, time: "09:30" };
  const s = raw.trim().replace(/^["']|["']$/g, "");

  // ISO o YYYY-MM-DD HH:MM(:SS)
  const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2}))?/);
  if (isoMatch) {
    const yyyy = isoMatch[1];
    const mm = isoMatch[2].padStart(2, "0");
    const dd = isoMatch[3].padStart(2, "0");
    const hh = (isoMatch[4] || "09").padStart(2, "0");
    const min = (isoMatch[5] || "30").padStart(2, "0");
    return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}` };
  }

  // MM/DD/YYYY o DD/MM/YYYY con hora opcional (AM/PM)
  const slashMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::\d{2})?(?:\s*(AM|PM))?)?/i);
  if (slashMatch) {
    const p1 = Number(slashMatch[1]);
    const p2 = Number(slashMatch[2]);
    const yyyy = slashMatch[3];
    // En NinjaTrader / Tradovate por defecto es MM/DD/YYYY a menos que p1 > 12
    const month = p1 > 12 ? p2 : p1;
    const day = p1 > 12 ? p1 : p2;
    let hour = Number(slashMatch[4] ?? 9);
    const min = (slashMatch[5] || "30").padStart(2, "0");
    const ampm = (slashMatch[6] || "").toUpperCase();
    if (ampm === "PM" && hour < 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;
    return {
      date: `${yyyy}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      time: `${String(hour).padStart(2, "0")}:${min}`,
    };
  }

  return { date: fallbackDate, time: "09:30" };
}

function inferSessionFromTime(timeHHMM: string): TradingSession {
  const [hStr, mStr] = (timeHHMM || "09:30").split(":");
  const mins = Number(hStr) * 60 + Number(mStr || 0);
  if (mins >= 9 * 60 + 30 && mins < 11 * 60) return "NYSE Open (9:30-11)";
  if (mins >= 11 * 60 && mins < 14 * 60) return "Midday (11-14)";
  if (mins >= 14 * 60 && mins <= 16 * 60) return "Power Hour (14-16)";
  if (mins >= 8 * 60 && mins < 9 * 60 + 30) return "Pre-Market";
  return "NYSE Open (9:30-11)";
}

/**
 * Parsea un contenido CSV completo (NinjaTrader 8, Tradovate o Plantilla Estándar)
 * y devuelve objetos `TradeRecord` verificados con el motor Decimal FIFO.
 */
export function parseTradesCsv(csvText: string, options: CsvImportOptions): CsvParseResult {
  const rawLines = (csvText || "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (rawLines.length < 2) {
    return {
      formatDetected: "Desconocido",
      trades: [],
      skippedRows: 0,
      errors: ["El archivo CSV está vacío o no contiene filas de datos debajo del encabezado."],
    };
  }

  // Detectar delimitador en el encabezado
  const headerLine = rawLines[0];
  const delimiter: "," | ";" =
    headerLine.split(";").length > headerLine.split(",").length ? ";" : ",";
  const headers = splitCsvLine(headerLine, delimiter).map(h =>
    h.toLowerCase().replace(/^["']|["']$/g, "").trim()
  );

  const findCol = (candidates: string[]): number =>
    headers.findIndex(h => candidates.some(c => h === c || h.includes(c)));

  // Detectar formato
  const isTradovate =
    headers.includes("buyprice") &&
    headers.includes("sellprice") &&
    (headers.includes("boughttimestamp") || headers.includes("soldtimestamp") || headers.includes("symbol") || headers.includes("contract"));

  const isNinjaTrader =
    !isTradovate &&
    headers.some(h => h.includes("market pos") || h.includes("entry price") || h.includes("exit price"));

  const formatDetected: CsvParseResult["formatDetected"] = isTradovate
    ? "Tradovate"
    : isNinjaTrader
      ? "NinjaTrader 8"
      : "Estándar / Plantilla";

  const brokerPreset = BROKER_PRESETS[options.brokerId] ?? BROKER_PRESETS.my_funded_futures;
  const defaultCommPerSide = brokerPreset?.perSide ?? 0.09;

  const trades: TradeRecord[] = [];
  const errors: string[] = [];
  let skippedRows = 0;

  // Índices de columnas comunes
  const colInstrument = findCol(["instrument", "instrumento", "symbol", "contract", "activo", "ticker"]);
  const colSide = findCol(["market pos.", "market pos", "side", "direction", "dirección", "direccion", "action", "tipo"]);
  const colQty = findCol(["qty", "quantity", "contracts", "contratos", "lotes", "size"]);
  const colEntryPrice = findCol(["entry price", "entryprice", "avgentryprice", "entrada", "precio entrada"]);
  const colExitPrice = findCol(["exit price", "exitprice", "avgexitprice", "salida", "precio salida"]);
  const colBuyPrice = findCol(["buyprice", "buy price"]);
  const colSellPrice = findCol(["sellprice", "sell price"]);
  const colEntryTime = findCol(["entry time", "entrytime", "dateopen", "fecha", "date"]);
  const colExitTime = findCol(["exit time", "exittime", "dateclose", "fecha cierre"]);
  const colBoughtTime = findCol(["boughttimestamp", "bought timestamp", "buy time"]);
  const colSoldTime = findCol(["soldtimestamp", "sold timestamp", "sell time"]);
  const colStopLoss = findCol(["stoploss", "stop loss", "sl", "stop"]);
  const colTakeProfit = findCol(["takeprofit", "take profit", "tp", "target"]);
  const colStrategy = findCol(["strategy", "estrategia"]);
  const colSetup = findCol(["setup", "patrón", "patron"]);
  const colNotes = findCol(["notes", "notas", "comment", "comentario"]);
  const colTags = findCol(["tags", "etiquetas"]);

  for (let i = 1; i < rawLines.length; i++) {
    const cols = splitCsvLine(rawLines[i], delimiter);
    if (cols.length < 3 || cols.every(c => !c)) {
      skippedRows++;
      continue;
    }

    try {
      const rawSymbol = colInstrument >= 0 ? cols[colInstrument] : "MNQ";
      const { instrument, tickerSymbol, assetClass } = normalizeInstrumentSymbol(rawSymbol);
      const pv = getPointValue(assetClass, instrument);

      let side: TradeSide = "Buy";
      let entryPrice = NaN;
      let exitPrice = NaN;
      let dtOpen = { date: new Date().toISOString().slice(0, 10), time: "09:30" };
      let dtClose = { date: new Date().toISOString().slice(0, 10), time: "10:00" };

      if (isTradovate && colBuyPrice >= 0 && colSellPrice >= 0) {
        const bp = parseNumberClean(cols[colBuyPrice]);
        const sp = parseNumberClean(cols[colSellPrice]);
        const bTimeRaw = colBoughtTime >= 0 ? cols[colBoughtTime] : "";
        const sTimeRaw = colSoldTime >= 0 ? cols[colSoldTime] : "";
        const bTime = parseDateTime(bTimeRaw);
        const sTime = parseDateTime(sTimeRaw);

        // Si boughtTimestamp <= soldTimestamp fue Long (Buy primero), si no Short (Sell primero)
        const boughtFirst =
          !bTimeRaw || !sTimeRaw || `${bTime.date}T${bTime.time}` <= `${sTime.date}T${sTime.time}`;
        if (boughtFirst) {
          side = "Buy";
          entryPrice = bp;
          exitPrice = sp;
          dtOpen = bTime;
          dtClose = sTime;
        } else {
          side = "Sell";
          entryPrice = sp;
          exitPrice = bp;
          dtOpen = sTime;
          dtClose = bTime;
        }
      } else {
        const rawSide = (colSide >= 0 ? cols[colSide] : "Buy").toLowerCase();
        side =
          rawSide.includes("sell") || rawSide.includes("short") || rawSide.includes("venta") || rawSide.includes("corto")
            ? "Sell"
            : "Buy";
        entryPrice = colEntryPrice >= 0 ? parseNumberClean(cols[colEntryPrice]) : NaN;
        exitPrice = colExitPrice >= 0 ? parseNumberClean(cols[colExitPrice]) : NaN;
        dtOpen = parseDateTime(colEntryTime >= 0 ? cols[colEntryTime] : undefined);
        dtClose = colExitTime >= 0 && cols[colExitTime] ? parseDateTime(cols[colExitTime]) : dtOpen;
      }

      const contracts = colQty >= 0 ? Math.max(1, Math.round(Math.abs(parseNumberClean(cols[colQty])))) : 1;

      if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
        skippedRows++;
        continue;
      }

      // Stop Loss: si el CSV no lo incluye, inferimos un Stop técnico de 20 unidades/puntos para preservar R-Múltiplo válido
      let stopLoss = colStopLoss >= 0 ? parseNumberClean(cols[colStopLoss]) : NaN;
      if (!Number.isFinite(stopLoss) || stopLoss <= 0) {
        const defaultRiskPts = instrument.includes("NQ") ? 20 : instrument.includes("ES") ? 8 : 10;
        stopLoss = side === "Buy" ? Math.max(0.01, entryPrice - defaultRiskPts) : entryPrice + defaultRiskPts;
      }

      const takeProfitRaw = colTakeProfit >= 0 ? parseNumberClean(cols[colTakeProfit]) : NaN;
      const takeProfit = Number.isFinite(takeProfitRaw) && takeProfitRaw > 0 ? takeProfitRaw : undefined;

      const entries = [{ price: entryPrice, contracts, time: dtOpen.time }];
      const exits =
        Number.isFinite(exitPrice) && exitPrice > 0
          ? [{ price: exitPrice, contracts, time: dtClose.time }]
          : [];

      const calc = calculateTradeFromFills(
        side,
        entries,
        exits,
        stopLoss,
        defaultCommPerSide,
        pv
      );

      if (calc.calcError) {
        errors.push(`Fila ${i + 1}: ${calc.calcError}`);
        skippedRows++;
        continue;
      }

      // Calcular duración en minutos si hay hora apertura y cierre
      const [oh, om] = dtOpen.time.split(":").map(Number);
      const [ch, cm] = dtClose.time.split(":").map(Number);
      const diffMins = (ch * 60 + cm) - (oh * 60 + om);
      const holdTimeMinutes = diffMins >= 0 && diffMins <= 1440 ? diffMins : 15;

      const rowTags =
        colTags >= 0 && cols[colTags]
          ? cols[colTags].split(/[|,;\s]+/).map(t => t.replace(/^#/, "").trim()).filter(Boolean)
          : [];
      if (options.accountTag) {
        const cleanTag = options.accountTag.replace(/^#/, "").trim();
        if (cleanTag && !rowTags.includes(cleanTag)) rowTags.push(cleanTag);
      }

      const trade: TradeRecord = {
        ...calc,
        id: crypto.randomUUID(),
        assetClass,
        instrument,
        tickerSymbol,
        side,
        dateOpen: dtOpen.date,
        timeOpen: dtOpen.time,
        dateClose: exits.length > 0 ? dtClose.date : undefined,
        timeClose: exits.length > 0 ? dtClose.time : undefined,
        holdTimeMinutes: exits.length > 0 ? holdTimeMinutes : undefined,
        session: inferSessionFromTime(dtOpen.time),
        entries,
        exits,
        avgEntryPrice: calc.avgEntryPrice ?? entryPrice,
        avgExitPrice: calc.avgExitPrice,
        totalContracts: calc.totalContracts ?? contracts,
        contractsExited: calc.contractsExited ?? (exits.length > 0 ? contracts : 0),
        stopLoss,
        initialStopLoss: stopLoss,
        takeProfit,
        brokerId: options.brokerId,
        commissionPerSide: defaultCommPerSide,
        totalCommission: calc.totalCommission ?? 0,
        result: calc.result ?? "Open",
        isBreakeven: calc.isBreakeven ?? false,
        isFundedAccount: options.isFundedAccount,
        strategy: (colStrategy >= 0 && cols[colStrategy]) || options.defaultStrategy || "Acción del Precio / ICT",
        setup: (colSetup >= 0 && cols[colSetup]) || options.defaultSetup || "Importado CSV",
        setupGrade: "A" as SetupGrade,
        confluenceCount: 3,
        emotionEntry: "Disciplinado",
        planFollowed: true,
        tags: rowTags,
        notes: (colNotes >= 0 && cols[colNotes]) || `Importado desde ${formatDetected}`,
      };

      trades.push(trade);
    } catch (err) {
      errors.push(`Fila ${i + 1}: ${err instanceof Error ? err.message : "Error de formato"}`);
      skippedRows++;
    }
  }

  return {
    formatDetected,
    trades,
    skippedRows,
    errors,
  };
}

export const SAMPLE_CSV_TEMPLATE = [
  "Instrument,Market pos.,Qty,Entry price,Exit price,Entry time,Exit time,StopLoss,Strategy,Setup,Tags,Notes",
  "MNQ 12-26,Long,4,20100.00,20135.00,2026-11-03 09:35,2026-11-03 09:58,20080.00,ICT Silver Bullet,FVG + Sweep,mffu-01,Entrada limpia en apertura NY",
  "MNQ 12-26,Short,3,20180.00,20150.00,2026-11-03 10:15,2026-11-03 10:40,20200.00,SMC Reversal,Order Block 15m,lucy-01,Reversión en máximo de sesión",
  "MES 12-26,Long,5,5850.00,5842.00,2026-11-04 09:45,2026-11-04 10:02,5842.00,VWAP Pullback,VWAP Bounce,topstep-01,Stop respetado según plan",
].join("\n");
