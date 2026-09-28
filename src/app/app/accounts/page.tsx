"use client";

import { AppShell } from "@/components/AppShell";
import { useState } from "react";
import { AlertTriangle, CheckCircle, Clock, TrendingUp } from "lucide-react";

/* â”€â”€ Funded account rules â”€â”€ */
const ACCOUNTS: any[] = [];

function ProgressBar({ value, max, color = "bg-green-primary" }: {
  value: number; max: number; color?: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="h-2.5 w-full rounded-full bg-border-card overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function RuleRow({ label, current, limit, invert = false, format = "dollar", warn = 80 }: {
  label: string; current: number; limit: number;
  invert?: boolean; format?: "dollar" | "percent" | "days" | "number";
  warn?: number;
}) {
  if (limit === 0) return null;
  const pct = Math.min(Math.abs((current / limit) * 100), 100);
  const isWarn  = pct >= warn;
  const isDanger = pct >= 95;
  const color = isDanger ? "bg-red-loss" : isWarn ? "bg-yellow-warn" : "bg-green-primary";
  const textColor = isDanger ? "text-red-loss" : isWarn ? "text-yellow-warn" : "text-green-primary";

  const fmt = (v: number) =>
    format === "dollar"  ? `$${Math.abs(v).toLocaleString()}` :
    format === "percent" ? `${v}%` :
    format === "days"    ? `${v} dÃ­as` :
    String(v);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 text-[12px]">
        <span className="text-text-secondary">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`font-bold tabular-nums ${textColor}`}>{fmt(current)}</span>
          <span className="text-text-muted">/ {fmt(limit)}</span>
          {isDanger && <AlertTriangle className="h-3.5 w-3.5 text-red-loss" />}
        </div>
      </div>
      <ProgressBar value={Math.abs(current)} max={Math.abs(limit)} color={color} />
      <p className="text-[9px] text-text-muted mt-1">{pct.toFixed(1)}% utilizado</p>
    </div>
  );
}

export default function AccountsPage() {
  const [selected, setSelected] = useState(ACCOUNTS[0]?.id); if (ACCOUNTS.length === 0) return <AppShell title="Cuentas de Trading" subtitle="Reglas, limites y estado de cada cuenta"><div className="p-10 text-center text-text-muted mt-20">Aun no hay cuentas registradas. Empieza a operar para ver tus estadisticas.</div></AppShell>;
  const account = ACCOUNTS.find(a => a.id === selected)!;

  const remainingProfit = account.profit_target > 0 ? account.profit_target - account.current_profit : null;
  const consistencyLimit = account.consistency_rule > 0
    ? (account.current_profit * account.consistency_rule) / 100 : null;
  const bestDayOk = consistencyLimit ? account.best_day_pnl <= consistencyLimit : true;

  return (
    <AppShell title="Cuentas de Trading" subtitle="Reglas, lÃ­mites y estado de cada cuenta"> {ACCOUNTS.length === 0 ? <div className="p-10 text-center text-text-muted mt-20">Aun no hay cuentas registradas. Empieza a operar para ver tus estadisticas.</div> : <div className="w-full">
      <div className="flex flex-col gap-5 w-full max-w-[1800px] mx-auto">

        {/* Account selector */}
        <div className="flex flex-wrap gap-3">
          {ACCOUNTS.map(a => (
            <button
              key={a.id}
              onClick={() => setSelected(a.id)}
              className={`flex flex-col items-start rounded-card border px-5 py-3 transition-all text-left ${
                selected === a.id ? a.bg + " border-opacity-60" : "border-border-card bg-bg-card hover:bg-bg-section/60"
              }`}
            >
              <span className="text-[10px] text-text-muted">{a.type}</span>
              <span className={`text-[13px] font-bold ${selected === a.id ? a.color : "text-text-primary"}`}>{a.broker}</span>
              <span className="text-[11px] text-text-secondary">{a.size}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">

          {/* â”€â”€ Main rules card â”€â”€ */}
          <div className="rounded-card border border-border-card bg-bg-card p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-[10px] text-text-muted">{account.type}</p>
                <h2 className="text-[16px] font-bold text-text-primary">{account.broker}</h2>
                <p className="text-[13px] text-text-secondary">{account.size} Â· {account.status}</p>
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-green-primary/15 border border-green-primary/30 px-3 py-1 text-[11px] font-bold text-green-primary">
                <CheckCircle className="h-3.5 w-3.5" /> En regla
              </span>
            </div>

            <div className="flex flex-col gap-5">
              {account.profit_target > 0 && (
                <RuleRow
                  label="Objetivo de Profit"
                  current={account.current_profit}
                  limit={account.profit_target}
                  format="dollar"
                  warn={50}
                />
              )}
              <RuleRow
                label="PÃ©rdida MÃ¡xima Diaria (Daily Loss Limit)"
                current={Math.abs(account.daily_loss_today)}
                limit={account.max_daily_loss}
                format="dollar"
                warn={60}
              />
              {account.max_total_loss > 0 && (
                <RuleRow
                  label="PÃ©rdida MÃ¡xima Total (Trailing Drawdown)"
                  current={account.max_total_loss - (account.current_balance - (account.current_balance - account.current_profit))}
                  limit={account.max_total_loss}
                  format="dollar"
                  warn={70}
                />
              )}
              {account.min_trading_days > 0 && (
                <RuleRow
                  label="DÃ­as MÃ­nimos de Trading"
                  current={account.days_traded}
                  limit={account.min_trading_days}
                  format="days"
                  warn={50}
                />
              )}
              {account.consistency_rule > 0 && (
                <div>
                  <RuleRow
                    label={`Regla de Consistencia â€” Mejor dÃ­a â‰¤ ${account.consistency_rule}% del profit total`}
                    current={account.best_day_pnl}
                    limit={consistencyLimit ?? 0}
                    format="dollar"
                    warn={80}
                  />
                  {!bestDayOk && (
                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-red-loss/30 bg-red-loss/10 px-3 py-2 text-[11px] text-red-loss">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Tu mejor dÃ­a supera el lÃ­mite de consistencia. Verifica con tu prop firm.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* â”€â”€ Summary sidebar â”€â”€ */}
          <div className="flex flex-col gap-4">
            <div className="rounded-card border border-border-card bg-bg-card p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-4">Balance</p>
              <div className="flex flex-col gap-3">
                {[
                  { label:"Balance actual",     value:`$${account.current_balance.toLocaleString()}`,      color:"text-text-primary"  },
                  { label:"Profit acumulado",   value:`+$${account.current_profit.toLocaleString()}`,      color:"text-green-primary" },
                  { label:"DÃ­as operados",       value:`${account.days_traded} dÃ­as`,                        color:"text-blue-accent"   },
                  { label:"Mejor dÃ­a",           value:`+$${account.best_day_pnl.toLocaleString()}`,        color:"text-green-primary" },
                  { label:"P&L hoy",             value: account.daily_loss_today === 0 ? "$0 (sin operaciones)" : `${account.daily_loss_today>0?"+":""}$${account.daily_loss_today}`, color: account.daily_loss_today >= 0 ? "text-green-primary" : "text-red-loss" },
                  ...(remainingProfit !== null ? [{ label:"Profit restante para meta", value:`$${remainingProfit.toLocaleString()}`, color:"text-yellow-warn" }] : []),
                ].map(r => (
                  <div key={r.label} className="flex justify-between items-center border-b border-border-card/30 pb-2.5">
                    <span className="text-[11px] text-text-muted">{r.label}</span>
                    <span className={`text-[13px] font-bold tabular-nums ${r.color}`}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-card border border-border-card bg-bg-card p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-3">Checklist Diario</p>
              <div className="flex flex-col gap-2.5">
                {[
                  { ok: Math.abs(account.daily_loss_today) < account.max_daily_loss,    label: "Dentro del Daily Loss Limit" },
                  { ok: account.current_profit < account.profit_target || account.profit_target === 0, label: "Sin pasar el objetivo (si aplica)" },
                  { ok: bestDayOk,  label: "Consistencia del mejor dÃ­a OK" },
                  { ok: account.days_traded >= account.min_trading_days || account.min_trading_days === 0, label: "DÃ­as mÃ­nimos cumplidos" },
                  { ok: account.status === "Active", label: "Cuenta activa" },
                ].map((c, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-[12px]">
                    {c.ok
                      ? <CheckCircle className="h-4 w-4 text-green-primary flex-shrink-0" />
                      : <AlertTriangle className="h-4 w-4 text-red-loss flex-shrink-0" />}
                    <span className={c.ok ? "text-text-secondary" : "text-red-loss"}>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-text-muted italic text-center pb-2">
          âš ï¸ Verifica siempre las reglas vigentes directamente con tu prop firm. Las reglas pueden cambiar.
        </p>
      </div>
    </div>}</AppShell>
  );
}







