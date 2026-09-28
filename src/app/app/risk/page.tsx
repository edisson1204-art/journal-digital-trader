"use client";

import { ASSET_CLASS_CONFIG, AssetClass } from "@/lib/tradeTypes";
import { AppShell } from "@/components/AppShell";
import { useState } from "react";

function InputField({ label, id, value, onChange, unit, type = "number", step = "any", disabled=false }: {
  label: string; id: string; value: string;
  onChange: (v: string) => void; unit?: string;
  type?: string; step?: string; disabled?: boolean;
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
    </div>
  );
}

function ResultCard({ label, value, color = "text-text-primary", large = false }: {
  label: string; value: string; color?: string; large?: boolean;
}) {
  return (
    <div className="rounded-card border border-border-card bg-bg-section p-4">
      <p className="text-[10px] text-text-muted mb-1">{label}</p>
      <p className={`tabular-nums font-bold ${color} ${large ? "text-2xl" : "text-[17px]"}`}>{value}</p>
    </div>
  );
}

export default function RiskToolsPage() {
  // Position size calculator
  const [accountSize, setAccountSize] = useState("");
  const [riskPct, setRiskPct] = useState("");
  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");
  const [target, setTarget] = useState("");
  const [assetClass, setAssetClass] = useState<AssetClass>("Futures");

  const config = ASSET_CLASS_CONFIG[assetClass];
  const pointValue = config.pipValue; // The value of 1 full point/pip movement per contract/lot

  // Computed values
  const accNum = parseFloat(accountSize) || 0;
  const riskPctNum = parseFloat(riskPct) || 0;
  const entryNum = parseFloat(entry) || 0;
  const stopNum = parseFloat(stop) || 0;
  const targetNum = parseFloat(target) || 0;
  
  const riskAmount = (accNum * riskPctNum) / 100;
  const stopDistance = Math.abs(entryNum - stopNum);
  const targetDistance = Math.abs(targetNum - entryNum);
  const rr = stopDistance > 0 ? (targetDistance / stopDistance).toFixed(2) : "—";
  
  // Tamaño de posición real = Riesgo $ / (Stop Distancia * Valor de 1 punto/pip)
  const riskPerContract = stopDistance * pointValue;
  const positionSizeRaw = riskPerContract > 0 ? riskAmount / riskPerContract : 0;
  
  // Redondeo según el tipo de activo (futuros enteros, forex con decimales)
  const isFractional = ["Forex", "Crypto"].includes(assetClass);
  const positionSize = isFractional ? positionSizeRaw.toFixed(4) : Math.floor(positionSizeRaw).toString();

  const maxGain = positionSizeRaw > 0 ? positionSizeRaw * targetDistance * pointValue : 0;
  const realRisk = positionSizeRaw > 0 ? parseFloat(positionSize) * stopDistance * pointValue : 0;

  return (
    <AppShell title="Herramientas de Riesgo" subtitle="Calculadora avanzada de tamaño de posición">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 w-full max-w-[1800px] mx-auto">

        {/* ── Position Size Calculator ── */}
        <div className="rounded-card border border-border-card bg-bg-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-text-primary mb-1">Calculadora de Posición</h2>
              <p className="text-[11px] text-text-muted">Evita exceder el límite de pérdida diaria</p>
            </div>
            <select
              value={assetClass}
              onChange={e => setAssetClass(e.target.value as AssetClass)}
              className="rounded-btn bg-bg-section border border-border-card px-3 py-1.5 text-[12px] text-text-primary focus:outline-none focus:border-green-primary"
            >
              {Object.keys(ASSET_CLASS_CONFIG).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <InputField label="Balance Cuenta" id="acc" value={accountSize} onChange={setAccountSize} unit="$" />
            <InputField label="Riesgo Máximo" id="risk" value={riskPct} onChange={setRiskPct} unit="%" step="0.1" />
            <InputField label="Precio Entrada" id="entry" value={entry} onChange={setEntry} />
            <InputField label="Stop Loss" id="stop" value={stop} onChange={setStop} />
            <InputField label="Take Profit" id="target" value={target} onChange={setTarget} />
            <InputField label={`Valor de Punto (${config.unit})`} id="contract" value={pointValue.toString()} onChange={()=>{}} unit="$" disabled />
          </div>

          {/* Results */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <ResultCard label="Riesgo Permitido" value={`$${riskAmount.toFixed(2)}`} color="text-yellow-warn" large />
            <ResultCard label={`Tamaño Sugerido`} value={positionSize} color="text-green-primary" large />
            <ResultCard label="Riesgo Real Asumido" value={`-$${realRisk.toFixed(2)}`} color="text-red-loss" />
            <ResultCard label="Beneficio Proyectado" value={`+$${maxGain.toFixed(2)}`} color="text-green-primary" />
            <ResultCard label="Ratio Riesgo/Beneficio" value={`1:${rr}`} color="text-blue-accent" />
            <ResultCard label="Distancia a Stop" value={`${stopDistance.toFixed(2)} pts`} color="text-text-primary" />
          </div>

          {/* Warning */}
          {riskPctNum > 2 && (
            <div className="rounded-lg border border-yellow-warn/30 bg-yellow-warn/10 p-3">
              <p className="text-[11px] text-yellow-warn font-medium">
                ⚠️ Arriesgar más del 2% por operación aumenta drásticamente la probabilidad de ruina de la cuenta.
              </p>
            </div>
          )}
        </div>

        {/* ── Right column ── */}
        <div className="flex flex-col gap-5">

          {/* Risk Rules */}
          <div className="rounded-card border border-border-card bg-bg-card p-6">
            <h2 className="text-base font-semibold text-text-primary mb-1">Daily Risk Rules</h2>
            <p className="text-[11px] text-text-muted mb-4">Your current risk limits</p>
            <div className="flex flex-col gap-3">
              {[
                { label:"Max Daily Loss",     value:"-$200",  limit:"-$300",  pct:67, color:"text-yellow-warn", bar:"bg-yellow-warn" },
                { label:"Max Weekly Loss",    value:"-$450",  limit:"-$750",  pct:60, color:"text-text-primary", bar:"bg-blue-accent"  },
                { label:"Max Position Risk",  value:"1.0%",   limit:"2.0%",   pct:50, color:"text-green-primary", bar:"bg-green-primary" },
                { label:"Consecutive Losses", value:"2",      limit:"3",      pct:67, color:"text-yellow-warn", bar:"bg-yellow-warn" },
              ].map(r => (
                <div key={r.label}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[12px] text-text-secondary">{r.label}</span>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className={`font-bold tabular-nums ${r.color}`}>{r.value}</span>
                      <span className="text-text-muted">/ {r.limit}</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-border-card overflow-hidden">
                    <div className={`h-full rounded-full ${r.bar} transition-all`} style={{ width:`${r.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* R Multiple chart */}
          <div className="rounded-card border border-border-card bg-bg-card p-6">
            <h2 className="text-base font-semibold text-text-primary mb-1">R Multiple Distribution</h2>
            <p className="text-[11px] text-text-muted mb-5">Distribution of trade outcomes in R</p>
            <div className="flex items-end gap-1.5 h-24">
              {[
                { r:"-3R", count:1, color:"bg-red-loss/60" },
                { r:"-2R", count:3, color:"bg-red-loss/70" },
                { r:"-1R", count:8, color:"bg-red-loss/80" },
                { r:"0R",  count:7, color:"bg-yellow-warn/70" },
                { r:"+1R", count:18, color:"bg-green-primary/60" },
                { r:"+2R", count:25, color:"bg-green-primary/75" },
                { r:"+3R", count:22, color:"bg-green-primary/90" },
                { r:"+4R", count:15, color:"bg-green-primary" },
                { r:"+5R", count:8,  color:"bg-green-primary" },
              ].map(b => (
                <div key={b.r} className="flex flex-col items-center gap-1 flex-1">
                  <div className={`w-full rounded-t ${b.color}`} style={{ height:`${(b.count/25)*80}px` }} />
                  <span className="text-[8px] text-text-muted">{b.r}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Risk Recommendation (Fills Empty Space) */}
          <div className="rounded-card border border-violet-accent/30 bg-violet-accent/5 p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-fuchsia-500"></div>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-violet-accent/20 rounded-xl mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400">
                  <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/>
                  <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/>
                  <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/>
                  <path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/>
                  <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/>
                  <path d="M3.477 10.896a4 4 0 0 1 .585-.396"/>
                  <path d="M19.938 10.5a4 4 0 0 1 .585.396"/>
                  <path d="M6 18a4 4 0 0 1-1.967-.516"/>
                  <path d="M19.967 17.484A4 4 0 0 1 18 18"/>
                </svg>
              </div>
              <div className="flex-1 text-sm">
                <h3 className="font-bold text-violet-300 tracking-wide uppercase text-[11px] mb-2">Mentor IA — Dictamen en Vivo</h3>
                <p className="text-text-secondary leading-relaxed">
                  Con un <span className="text-green-primary font-bold">R:R proyectado mayor a 1:2.00</span>, tienes ventaja asimétrica. 
                  Históricamente, este escenario te ha permitido absorber hasta <span className="text-yellow-warn font-bold">4 pérdidas consecutivas</span> sin vulnerar tu Drawdown máximo semanal.
                </p>
                <div className="mt-4 flex items-center gap-2 text-green-primary text-[12px] font-bold">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/>
                  </svg>
                  Luz verde para ejecutar orden.
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
