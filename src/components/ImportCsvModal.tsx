"use client";

import { useState, useMemo } from "react";
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
} from "lucide-react";
import { BROKER_PRESETS, computeStats, type TradeRecord } from "@/lib/tradeTypes";
import { parseTradesCsv, SAMPLE_CSV_TEMPLATE } from "@/lib/csvImporter";

interface ImportCsvModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (trades: TradeRecord[]) => Promise<void> | void;
}

export function ImportCsvModal({ open, onClose, onImport }: ImportCsvModalProps) {
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [brokerId, setBrokerId] = useState("my_funded_futures");
  const [isFundedAccount, setIsFundedAccount] = useState(true);
  const [accountTag, setAccountTag] = useState("");
  const [defaultStrategy, setDefaultStrategy] = useState("ICT Silver Bullet");
  const [isImporting, setIsImporting] = useState(false);

  const parsed = useMemo(() => {
    if (!csvText.trim()) return null;
    return parseTradesCsv(csvText, {
      brokerId,
      isFundedAccount,
      accountTag,
      defaultStrategy,
    });
  }, [csvText, brokerId, isFundedAccount, accountTag, defaultStrategy]);

  const previewStats = useMemo(() => {
    if (!parsed || parsed.trades.length === 0) return null;
    return computeStats(parsed.trades);
  }, [parsed]);

  if (!open) return null;

  const handleFileChange = (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      const content = typeof e.target?.result === "string" ? e.target.result : "";
      setCsvText(content);
    };
    reader.readAsText(file);
  };

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_operaciones_journal.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirmImport = async () => {
    if (!parsed || parsed.trades.length === 0) return;
    setIsImporting(true);
    try {
      await onImport(parsed.trades);
      setCsvText("");
      setFileName("");
      onClose();
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl rounded-card border border-border-card bg-bg-card shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-card bg-bg-section/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-primary/15 text-green-primary">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-text-primary">
                Importar Operaciones desde CSV (NinjaTrader 8 · Tradovate · Estándar)
              </h2>
              <p className="text-[11px] text-text-muted">
                Cálculo automático de P&amp;L Bruto, Comisiones y P&amp;L Neto con el motor Decimal FIFO
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
            aria-label="Cerrar modal de importación"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Parámetros por defecto para el lote */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-bg-section/50 p-4 rounded-xl border border-border-card">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-text-muted font-bold mb-1">
                Broker / Firma de Fondeo
              </label>
              <select
                value={brokerId}
                onChange={e => setBrokerId(e.target.value)}
                className="w-full rounded-btn bg-bg-card border border-border-card px-3 py-2 text-[12px] text-text-primary focus:outline-none focus:border-green-primary"
              >
                {Object.entries(BROKER_PRESETS).map(([k, b]) => (
                  <option key={k} value={k}>
                    {b.name} (${b.perSide}/lado)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-text-muted font-bold mb-1">
                Tipo de Cuenta
              </label>
              <select
                value={isFundedAccount ? "funded" : "personal"}
                onChange={e => setIsFundedAccount(e.target.value === "funded")}
                className="w-full rounded-btn bg-bg-card border border-border-card px-3 py-2 text-[12px] text-text-primary focus:outline-none focus:border-green-primary"
              >
                <option value="funded">Cuenta Fondeada (Prop Firm)</option>
                <option value="personal">Cuenta Personal Directa</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-text-muted font-bold mb-1">
                Etiqueta de Cuenta (Opcional)
              </label>
              <input
                type="text"
                value={accountTag}
                onChange={e => setAccountTag(e.target.value)}
                placeholder="Ej. mffu-01, lucy-01"
                className="w-full rounded-btn bg-bg-card border border-border-card px-3 py-2 text-[12px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-green-primary"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-text-muted font-bold mb-1">
                Estrategia por Defecto
              </label>
              <input
                type="text"
                value={defaultStrategy}
                onChange={e => setDefaultStrategy(e.target.value)}
                placeholder="Ej. ICT Silver Bullet"
                className="w-full rounded-btn bg-bg-card border border-border-card px-3 py-2 text-[12px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-green-primary"
              />
            </div>
          </div>

          {/* Zona de carga de archivo o plantilla */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-dashed border-border-card bg-bg-section/30 p-5">
            <div className="flex items-center gap-3">
              <Upload className="h-7 w-7 text-green-primary flex-shrink-0" />
              <div>
                <p className="text-[13px] font-bold text-text-primary">
                  {fileName ? `Archivo cargado: ${fileName}` : "Selecciona tu archivo .CSV de NinjaTrader 8 o Tradovate"}
                </p>
                <p className="text-[11px] text-text-muted">
                  También puedes pegar directamente el texto CSV abajo o descargar la plantilla de ejemplo.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadSample}
                className="flex items-center gap-1.5 rounded-btn border border-border-card bg-bg-card px-3 py-2 text-[11px] font-semibold text-text-secondary hover:text-text-primary transition-colors"
              >
                <Download className="h-3.5 w-3.5" /> Plantilla CSV
              </button>

              <label className="cursor-pointer flex items-center gap-1.5 rounded-btn bg-green-primary px-4 py-2 text-[12px] font-bold text-bg-main hover:opacity-90 transition-opacity">
                <Upload className="h-3.5 w-3.5" /> Elegir Archivo .CSV
                <input
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  className="hidden"
                  onChange={e => handleFileChange(e.target.files?.[0])}
                />
              </label>
            </div>
          </div>

          {/* Área de texto directo */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-text-secondary">
                Contenido CSV (editable antes de importar):
              </label>
              {!csvText && (
                <button
                  type="button"
                  onClick={() => setCsvText(SAMPLE_CSV_TEMPLATE)}
                  className="text-[11px] font-semibold text-green-primary hover:underline"
                >
                  Cargar ejemplo rápido de 3 operaciones
                </button>
              )}
            </div>
            <textarea
              rows={4}
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              placeholder="Pega aquí las filas de tu archivo CSV o usa el botón 'Elegir Archivo .CSV'…"
              className="w-full rounded-xl bg-bg-section border border-border-card p-3 font-mono text-[11px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-green-primary"
            />
          </div>

          {/* Vista Previa Reconciliada */}
          {parsed && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border-card bg-bg-section/60 px-4 py-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-primary" />
                  <span className="text-[12px] font-bold text-text-primary">
                    Formato detectado: <span className="text-green-primary">{parsed.formatDetected}</span>
                  </span>
                  <span className="text-[11px] text-text-muted">
                    ({parsed.trades.length} operaciones listas · {parsed.skippedRows} omitidas)
                  </span>
                </div>

                {previewStats && (
                  <div className="flex items-center gap-4 text-[12px] tabular-nums">
                    <span className="text-text-secondary">
                      Acierto: <b className="text-blue-accent">{previewStats.winRate}%</b>
                    </span>
                    <span className="text-text-secondary">
                      Comisiones: <b className="text-yellow-warn">-${previewStats.totalCommissions.toFixed(2)}</b>
                    </span>
                    <span className="text-text-secondary">
                      P&amp;L Neto:{" "}
                      <b className={previewStats.totalNet >= 0 ? "text-green-primary" : "text-red-loss"}>
                        {previewStats.totalNet >= 0 ? "+" : "-"}${Math.abs(previewStats.totalNet).toFixed(2)}
                      </b>
                    </span>
                  </div>
                )}
              </div>

              {parsed.errors.length > 0 && (
                <div className="rounded-lg border border-yellow-warn/40 bg-yellow-warn/10 p-3 text-[11px] text-yellow-warn flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Avisos de lectura ({parsed.errors.length}):</p>
                    <ul className="list-disc list-inside">
                      {parsed.errors.slice(0, 3).map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {parsed.trades.length > 0 && (
                <div className="rounded-xl border border-border-card overflow-x-auto max-h-56">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-border-card bg-bg-section text-text-muted uppercase">
                        <th className="px-3 py-2 text-left">Fecha</th>
                        <th className="px-3 py-2 text-left">Instrumento</th>
                        <th className="px-3 py-2 text-left">Dir</th>
                        <th className="px-3 py-2 text-right">Cant.</th>
                        <th className="px-3 py-2 text-right">Entrada</th>
                        <th className="px-3 py-2 text-right">Salida</th>
                        <th className="px-3 py-2 text-right">Comisión</th>
                        <th className="px-3 py-2 text-right">P&amp;L Neto</th>
                        <th className="px-3 py-2 text-left">Etiqueta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-card/30">
                      {parsed.trades.slice(0, 25).map(t => (
                        <tr key={t.id} className="hover:bg-white/[0.02]">
                          <td className="px-3 py-2 text-text-muted whitespace-nowrap">
                            {t.dateOpen} {t.timeOpen}
                          </td>
                          <td className="px-3 py-2 font-bold text-text-primary">
                            {t.instrument}
                            {t.tickerSymbol ? <span className="ml-1 text-[9px] text-text-muted">({t.tickerSymbol})</span> : null}
                          </td>
                          <td className={`px-3 py-2 font-bold ${t.side === "Buy" ? "text-green-primary" : "text-red-loss"}`}>
                            {t.side === "Buy" ? "▲ Compra" : "▼ Venta"}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-text-primary">{t.totalContracts}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-text-secondary">{t.avgEntryPrice}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-text-secondary">{t.avgExitPrice ?? "—"}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-yellow-warn">-${t.totalCommission.toFixed(2)}</td>
                          <td className={`px-3 py-2 text-right tabular-nums font-bold ${(t.netPnl ?? 0) >= 0 ? "text-green-primary" : "text-red-loss"}`}>
                            {(t.netPnl ?? 0) >= 0 ? "+" : "-"}${Math.abs(t.netPnl ?? 0).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-blue-accent">{t.tags.join(", ") || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-card bg-bg-section/60">
          <button
            type="button"
            onClick={onClose}
            className="rounded-btn border border-border-card px-4 py-2 text-[12px] font-semibold text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!parsed || parsed.trades.length === 0 || isImporting}
            onClick={handleConfirmImport}
            className="flex items-center gap-2 rounded-btn bg-green-primary px-5 py-2 text-[12px] font-bold text-bg-main disabled:opacity-40 hover:opacity-95 transition-opacity"
          >
            <CheckCircle2 className="h-4 w-4" />
            {isImporting
              ? "Importando…"
              : `Importar ${parsed?.trades.length ?? 0} Operaciones al Diario`}
          </button>
        </div>
      </div>
    </div>
  );
}
