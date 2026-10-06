"use client";

import { ASSET_CLASS_CONFIG, AssetClass, INSTRUMENT_POINT_VALUES } from "@/lib/tradeTypes";
import { AppShell } from "@/components/AppShell";
import { useTradeStore } from "@/store/tradeStore";
import { useState, useMemo } from "react";
import { Info, AlertTriangle } from "lucide-react";

/* ── Valores por punto: misma tabla oficial que usa el registro de trades ── */
const INSTRUMENT_PIP_VALUES: Record<string, { pip: number; label: string }> = Object.fromEntries(
  Object.entries(INSTRUMENT_POINT_VALUES).map(([sym, v]) => [
    sym,
    { pip: v, label: `${sym} — $${v.toLocaleString("en-US", { maximumFractionDigits: 2 })} por 1.0 de precio` },
  ])
);

function InputField({ label, id, value, onChange, unit, type = "number", step = "any", disabled = false, hint }: {
  label: string; id: string; value: string;
  onChange: (v: string) => void; unit?: string;
  type?: string; step?: string; disabled?: boolean; hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[11px] font-medium text-text-secondary">{label}</label>
      <div className="relative">
        <input
          id={id} type={type} step={step} value={value} disabled={disabled}
          onChange={e => onChange(e.target.value)}
          className={`w-full rounded-btn bg-bg-section border border-border-card px-3 py-2.5 text-[13px] tabular-nums focus:outline-none transition-colors pr-10 ${disabled ? "text-text-muted opacity-50 cursor-not-allowed" : "text-text-primary focus:border-green-primary focus:ring-1 focus:ring-green-primary"}`}
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-text-muted pointer-events-none">
            {unit}
          </span>
        )}
      </div>
      {hint && (
        <p className="text-[10px] text-text-muted flex items-center gap-1">
          <Info className="h-3 w-3 text-blue-accent flex-shrink-0" />{hint}
        </p>
      )}
    </div>
  );
}

function ResultCard({ label, value, color = "text-text-primary", large = false, sub }: {
  label: string; value: string; color?: string; large?: boolean; sub?: string;
}) {
  return (
    <div className="rounded-card border border-border-card bg-bg-section p-4">
      <p className="text-[10px] text-text-muted mb-1">{label}</p>
      <p className={`tabular-nums font-bold ${color} ${large ? "text-2xl" : "text-[17px]"}`}>{value}</p>
      {sub && <p className="text-[9px] text-text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

export default function RiskToolsPage() {
  const { trades } = useTradeStore();

  const [accountSize, setAccountSize] = useState("");
  const [riskPct, setRiskPct]         = useState("");
  const [entry, setEntry]             = useState("");
  const [stop, setStop]               = useState("");
  const [target, setTarget]           = useState("");
  const [assetClass, setAssetClass]   = useState<AssetClass>("Futures");
  const [instrument, setInstrument]   = useState("NQ");
  const [customPip, setCustomPip]     = useState("");

  const config     = ASSET_CLASS_CONFIG[assetClass];
  const presetPip  = INSTRUMENT_PIP_VALUES[instrument]?.pip;
  const pointValue = customPip ? parseFloat(customPip) : (presetPip ?? config.pipValue);
  const pipLabel   = INSTRUMENT_PIP_VALUES[instrument]?.label ?? `${instrument} — ${pointValue}$/punto`;

  // Computed values
  const accNum        = parseFloat(accountSize) || 0;
  const riskPctNum    = parseFloat(riskPct) || 0;
  const entryNum      = parseFloat(entry) || 0;
  const stopNum       = parseFloat(stop) || 0;
  const targetNum     = parseFloat(target) || 0;

  const riskAmount      = (accNum * riskPctNum) / 100;
  const stopDistance    = Math.abs(entryNum - stopNum);
  const targetDistance  = Math.abs(targetNum - entryNum);
  const rr              = stopDistance > 0 ? (targetDistance / stopDistance).toFixed(2) : "—";

  const riskPerContract = stopDistance * pointValue;
  const positionSizeRaw = riskPerContract > 0 ? riskAmount / riskPerContract : 0;
  const isFractional    = ["Forex", "Crypto"].includes(assetClass);
  const positionSize    = isFractional ? positionSizeRaw.toFixed(4) : Math.floor(positionSizeRaw).toString();

  const maxGain  = positionSizeRaw > 0 ? positionSizeRaw * targetDistance * pointValue : 0;
  const realRisk = positionSizeRaw > 0 ? parseFloat(positionSize) * stopDistance * pointValue : 0;

  /* ── Daily Risk Rules calculadas desde datos reales ── */
  const riskRules = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayTrades  = trades.filter(t => t.dateOpen === today && t.result !== "Open");
    const todayPnl     = todayTrades.reduce((s, t) => s + (t.netPnl || 0), 0);
    const todayLosses  = todayTrades.filter(t => t.result === "Loss").length;
    const todayConsec  = (() => {
      let c = 0;
      const sorted = [...todayTrades].sort((a, b) => (a.timeOpen || "").localeCompare(b.timeOpen || ""));
      for (let i = sorted.length - 1; i >= 0; i--) {
        if (sorted[i].result === "Loss") c++; else break;
      }
      return c;
    })();

    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekKey   = weekStart.toISOString().slice(0, 10);
    const weekTrades = trades.filter(t => t.dateOpen >= weekKey && t.result !== "Open");
    const weekPnl    = weekTrades.reduce((s, t) => s + (t.netPnl || 0), 0);

    const maxDailyLoss = accNum > 0 ? -(accNum * 0.02) : -200;
    const maxWeeklyLoss = accNum > 0 ? -(accNum * 0.05) : -500;

    return [
      {
        label:    "Pérdida Diaria Actual",
        value:    `${todayPnl >= 0 ? "+" : ""}$${Math.abs(todayPnl).toFixed(0)}`,
        limit:    `$${Math.abs(maxDailyLoss).toFixed(0)}`,
        pct:      maxDailyLoss < 0 ? Math.min(100, (Math.abs(Math.min(todayPnl, 0)) / Math.abs(maxDailyLoss)) * 100) : 0,
        color:    todayPnl < maxDailyLoss * 0.7 ? "text-red-loss" : todayPnl < 0 ? "text-yellow-warn" : "text-green-primary",
        bar:      todayPnl < maxDailyLoss * 0.7 ? "bg-red-loss" : "bg-yellow-warn",
        data:     true,
      },
      {
        label:    "Pérdida Semanal Actual",
        value:    `${weekPnl >= 0 ? "+" : ""}$${Math.abs(weekPnl).toFixed(0)}`,
        limit:    `$${Math.abs(maxWeeklyLoss).toFixed(0)}`,
        pct:      maxWeeklyLoss < 0 ? Math.min(100, (Math.abs(Math.min(weekPnl, 0)) / Math.abs(maxWeeklyLoss)) * 100) : 0,
        color:    weekPnl < maxWeeklyLoss * 0.7 ? "text-red-loss" : weekPnl < 0 ? "text-yellow-warn" : "text-green-primary",
        bar:      weekPnl < maxWeeklyLoss * 0.7 ? "bg-red-loss" : "bg-blue-accent",
        data:     true,
      },
      {
        label:    "Riesgo de Posición",
        value:    riskPctNum > 0 ? `${riskPctNum}%` : "—",
        limit:    "2.0%",
        pct:      Math.min(100, (riskPctNum / 2) * 100),
        color:    riskPctNum > 2 ? "text-red-loss" : riskPctNum > 1 ? "text-yellow-warn" : "text-green-primary",
        bar:      riskPctNum > 2 ? "bg-red-loss" : "bg-green-primary",
        data:     false,
      },
      {
        label:    "Pérdidas Consecutivas Hoy",
        value:    String(todayConsec),
        limit:    "3",
        pct:      Math.min(100, (todayConsec / 3) * 100),
        color:    todayConsec >= 3 ? "text-red-loss" : todayConsec >= 2 ? "text-yellow-warn" : "text-green-primary",
        bar:      todayConsec >= 3 ? "bg-red-loss" : "bg-yellow-warn",
        data:     true,
      },
    ];
  }, [trades, accNum, riskPctNum]);

  /* ── R Multiple desde datos reales ── */
  const rrDistribution = useMemo(() => {
    const rrs = trades
      .filter(t => t.result !== "Open" && t.rMultiple !== undefined && t.rMultiple !== null)
      .map(t => t.rMultiple as number);

    if (rrs.length === 0) return null;

    const buckets = [
      { r: "<-2R", min: -Infinity, max: -2, color: "bg-red-loss/60" },
      { r: "-2R",  min: -2, max: -1, color: "bg-red-loss/75" },
      { r: "-1R",  min: -1, max:  0, color: "bg-red-loss/90" },
      { r: "0R",   min:  0, max:  0.1, color: "bg-yellow-warn/70" },
      { r: "+1R",  min: 0.1, max: 1.5, color: "bg-green-primary/60" },
      { r: "+2R",  min: 1.5, max: 2.5, color: "bg-green-primary/80" },
      { r: "+3R",  min: 2.5, max: 3.5, color: "bg-green-primary/90" },
      { r: "+4R+", min: 3.5, max: Infinity, color: "bg-green-primary" },
    ].map(b => ({
      ...b,
      count: rrs.filter(r => r > b.min && r <= b.max).length,
    }));

    const maxCount = Math.max(...buckets.map(b => b.count), 1);
    return { buckets, maxCount, total: rrs.length };
  }, [trades]);

  const instruments = [...config.instruments, "Custom"];

  return (
    <AppShell title="Herramientas de Riesgo" subtitle="Calculadora avanzada · Micro contratos · Límites reales">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full max-w-[1800px] mx-auto">

        {/* ── LEFT: Position Size Calculator ── */}
        <div className="rounded-card border border-border-card bg-bg-card p-6">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-text-primary mb-1">Calculadora de Posición</h2>
            <p className="text-[11px] text-text-muted">Tamaño exacto de posición basado en riesgo y valor de punto real</p>
          </div>

          {/* Asset class + instrument */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-text-secondary">Clase de Activo</label>
              <select
                value={assetClass}
                onChange={e => {
                  setAssetClass(e.target.value as AssetClass);
                  setInstrument(ASSET_CLASS_CONFIG[e.target.value as AssetClass].instruments[0]);
                  setCustomPip("");
                }}
                className="w-full rounded-btn bg-bg-section border border-border-card px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-green-primary"
              >
                {Object.keys(ASSET_CLASS_CONFIG).map(c => (
                  <option key={c} value={c}>{c === "Futures_Micro" ? "Futuros Micro (MNQ/MES/MGC...)" : c}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-text-secondary">Instrumento</label>
              <select
                value={instrument}
                onChange={e => { setInstrument(e.target.value); setCustomPip(""); }}
                className="w-full rounded-btn bg-bg-section border border-border-card px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-green-primary"
              >
                {instruments.map(ins => (
                  <option key={ins} value={ins}>
                    {ins}{INSTRUMENT_PIP_VALUES[ins] ? ` ($${INSTRUMENT_PIP_VALUES[ins].pip}/pt)` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pip value display / override */}
          <div className="rounded-lg bg-bg-section border border-border-card/50 px-4 py-2.5 mb-4 flex items-center justify-between">
            <span className="text-[11px] text-text-muted">Valor de punto activo:</span>
            <span className="text-[12px] font-bold text-blue-accent">{pipLabel}</span>
          </div>

          {(instrument === "Custom" || !INSTRUMENT_PIP_VALUES[instrument]) && (
            <div className="mb-4">
              <InputField
                label="Valor del Punto / Pip ($ por contrato)"
                id="custpip"
                value={customPip}
                onChange={setCustomPip}
                unit="$"
                hint="Ingresa el valor real de 1 punto/pip para este instrumento"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-6">
            <InputField label="Balance de Cuenta" id="acc"    value={accountSize} onChange={setAccountSize} unit="$" hint="Capital total de la cuenta" />
            <InputField label="Riesgo Máximo"      id="risk"  value={riskPct}     onChange={setRiskPct}     unit="%" step="0.1" hint="% del balance a arriesgar" />
            <InputField label="Precio de Entrada"  id="entry" value={entry}       onChange={setEntry}       hint="Precio de entrada de la operación" />
            <InputField label="Stop Loss"          id="stop"  value={stop}        onChange={setStop}        hint="Precio del stop loss" />
            <InputField label="Take Profit"        id="target" value={target}     onChange={setTarget}      hint="Precio objetivo de ganancia" />
          </div>

          {/* Results */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <ResultCard label="$ Permitido a Perder"  value={riskAmount > 0 ? `$${riskAmount.toFixed(2)}` : "—"} color="text-yellow-warn" large />
            <ResultCard
              label={`Contratos Sugeridos`}
              value={positionSizeRaw > 0 ? positionSize : "—"}
              color="text-green-primary"
              large
              sub={assetClass === "Futures_Micro" ? "micro-contratos" : config.unit}
            />
            <ResultCard label="Riesgo Real Asumido"   value={realRisk > 0 ? `-$${realRisk.toFixed(2)}` : "—"} color="text-red-loss" />
            <ResultCard label="Ganancia Proyectada"   value={maxGain > 0 ? `+$${maxGain.toFixed(2)}` : "—"} color="text-green-primary" />
            <ResultCard label="Ratio Riesgo/Beneficio" value={rr !== "—" ? `1:${rr}` : "—"} color="text-blue-accent" />
            <ResultCard label="Distancia al Stop"      value={stopDistance > 0 ? `${stopDistance.toFixed(2)} pts` : "—"} />
          </div>

          {riskPctNum > 2 && (
            <div className="rounded-lg border border-red-loss/30 bg-red-loss/10 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-loss flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-loss font-medium">
                Arriesgar más del 2% por operación aumenta drásticamente la probabilidad de ruina de la cuenta. Recomendado: 0.5%–1% para cuentas fondeadas.
              </p>
            </div>
          )}
          {rr !== "—" && parseFloat(rr) < 1.5 && parseFloat(rr) > 0 && (
            <div className="rounded-lg border border-yellow-warn/30 bg-yellow-warn/10 p-3 flex items-start gap-2 mt-2">
              <AlertTriangle className="h-4 w-4 text-yellow-warn flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-yellow-warn font-medium">
                R:R de 1:{rr} está por debajo del mínimo recomendado (1:1.5). Considera ampliar el target o ajustar el stop.
              </p>
            </div>
          )}
        </div>

        {/* ── RIGHT: Real Data Panels ── */}
        <div className="flex flex-col gap-5">

          {/* Daily Risk Rules — DATOS REALES */}
          <div className="rounded-card border border-border-card bg-bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-text-primary mb-1">Límites de Riesgo en Vivo</h2>
                <p className="text-[11px] text-text-muted">Calculado de tus trades reales de hoy / esta semana</p>
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-green-primary bg-green-primary/10 border border-green-primary/20 rounded-full px-2 py-1">
                DATOS REALES
              </span>
            </div>
            <div className="flex flex-col gap-4">
              {riskRules.map(r => (
                <div key={r.label}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[12px] text-text-secondary">{r.label}</span>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className={`font-bold tabular-nums ${r.color}`}>{r.value}</span>
                      <span className="text-text-muted">/ límite ${r.limit}</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-border-card overflow-hidden">
                    <div className={`h-full rounded-full ${r.bar} transition-all`} style={{ width: `${r.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
            {accNum === 0 && (
              <p className="text-[10px] text-text-muted mt-3 italic">
                💡 Ingresa tu Balance de Cuenta para que los límites de % se calculen automáticamente.
              </p>
            )}
          </div>

          {/* R Multiple Distribution — DATOS REALES */}
          <div className="rounded-card border border-border-card bg-bg-card p-6">
            <h2 className="text-base font-semibold text-text-primary mb-1">Distribución R Múltiple</h2>
            <p className="text-[11px] text-text-muted mb-4">
              {rrDistribution ? `Basado en ${rrDistribution.total} trades con R registrado` : "Registra el R Múltiple en tus trades para ver esta gráfica"}
            </p>
            {rrDistribution ? (
              <div className="flex items-end gap-1.5 h-28">
                {rrDistribution.buckets.map(b => (
                  <div key={b.r} className="flex flex-col items-center gap-1 flex-1">
                    <span className="text-[8px] text-text-muted tabular-nums">{b.count > 0 ? b.count : ""}</span>
                    <div
                      className={`w-full rounded-t ${b.color} transition-all`}
                      style={{ height: `${Math.max(4, (b.count / rrDistribution.maxCount) * 80)}px` }}
                    />
                    <span className="text-[8px] text-text-muted">{b.r}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-end gap-1.5 h-28 opacity-30">
                {[1,3,8,7,18,25,22,15].map((count, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 flex-1">
                    <div className="w-full rounded-t bg-text-muted" style={{ height: `${(count/25)*80}px` }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Micro Contracts Reference */}
          <div className="rounded-card border border-blue-accent/20 bg-blue-accent/5 p-5">
            <h3 className="text-[12px] font-bold text-blue-accent mb-3 uppercase tracking-wider">
              📋 Referencia: Valores de Punto CME
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { sym: "ES",  val: "$50/pt",  micro: false },
                { sym: "NQ",  val: "$20/pt",  micro: false },
                { sym: "YM",  val: "$5/pt",   micro: false },
                { sym: "CL",  val: "$1,000/pt", micro: false },
                { sym: "GC",  val: "$100/pt", micro: false },
                { sym: "MES", val: "$5/pt",   micro: true  },
                { sym: "MNQ", val: "$2/pt",   micro: true  },
                { sym: "MYM", val: "$0.50/pt", micro: true },
                { sym: "MGC", val: "$10/pt",  micro: true  },
                { sym: "MCL", val: "$100/pt", micro: true  },
              ].map(r => (
                <div key={r.sym} className="flex items-center justify-between text-[11px]">
                  <span className={`font-bold ${r.micro ? "text-violet-accent" : "text-text-primary"}`}>
                    {r.sym}{r.micro ? " 🔹" : ""}
                  </span>
                  <span className="text-text-muted tabular-nums">{r.val}</span>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-text-muted mt-3">🔹 Micro contracts · Fuente: CME Group oficial</p>
          </div>

        </div>
      </div>
    </AppShell>
  );
}
