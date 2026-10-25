"use client";

import { AppShell } from "@/components/AppShell";
import { useState, useMemo, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Plus,
  Briefcase,
  Settings2,
  Trash2,
  ShieldCheck,
  TrendingUp,
  Award,
  Lock,
  Layers,
  X,
} from "lucide-react";
import { useTradeStore } from "@/store/tradeStore";
import {
  computeStats,
  effectiveTradeDate,
  formatProfitFactor,
  isStrictlyClosed,
  localDateKey,
} from "@/lib/tradeTypes";

export interface PropAccountConfig {
  id: string;
  name: string;
  firm: string;
  accountType: "Evaluación / Challenge" | "Cuenta Fondeada (PA / XFA)" | "Cuenta Personal" | "Portafolio Global";
  filterMode: "funded" | "personal" | "all" | "broker";
  brokerFilter?: string;
  initialBalance: number;
  profitTarget: number;
  maxDailyLoss: number;
  maxTotalLoss: number;
  minTradingDays: number;
  consistencyRulePct: number; // ej. 40% en LucidFlex, 50% en TopStep, 0% en LucidPro
  maxMicros?: number;         // ej. 40 Micros (4 Minis) en Lucy Trading $50K
  status: "Active" | "Passed" | "Breached";
}

const DEFAULT_ACCOUNTS: PropAccountConfig[] = [
  {
    id: "default-lucy-50k",
    name: "Lucy Trading / LucidPro $50K",
    firm: "Lucy Trading (Lucid)",
    accountType: "Evaluación / Challenge",
    filterMode: "funded",
    brokerFilter: "lucid_trading",
    initialBalance: 50000,
    profitTarget: 3000,
    maxDailyLoss: 1200,
    maxTotalLoss: 2000,
    minTradingDays: 3,
    consistencyRulePct: 40,
    maxMicros: 40,
    status: "Active",
  },
  {
    id: "default-funded-topstep",
    name: "TopStep $50K — Cuenta Fondeada",
    firm: "TopStep / Prop Firm",
    accountType: "Cuenta Fondeada (PA / XFA)",
    filterMode: "funded",
    brokerFilter: "topstep",
    initialBalance: 50000,
    profitTarget: 3000,
    maxDailyLoss: 1000,
    maxTotalLoss: 2000,
    minTradingDays: 5,
    consistencyRulePct: 50,
    maxMicros: 50,
    status: "Active",
  },
  {
    id: "default-personal",
    name: "Cuenta Personal Directa",
    firm: "Bróker Personal",
    accountType: "Cuenta Personal",
    filterMode: "personal",
    initialBalance: 25000,
    profitTarget: 2500,
    maxDailyLoss: 750,
    maxTotalLoss: 2500,
    minTradingDays: 0,
    consistencyRulePct: 0,
    maxMicros: 0,
    status: "Active",
  },
  {
    id: "default-all-portfolio",
    name: "Portafolio Consolidado (Global)",
    firm: "Todas las Cuentas",
    accountType: "Portafolio Global",
    filterMode: "all",
    initialBalance: 50000,
    profitTarget: 5000,
    maxDailyLoss: 1500,
    maxTotalLoss: 3500,
    minTradingDays: 5,
    consistencyRulePct: 50,
    maxMicros: 50,
    status: "Active",
  },
];

const PROP_PRESETS: Omit<PropAccountConfig, "id">[] = [
  {
    name: "Lucy Trading / LucidPro $50K",
    firm: "Lucy Trading (Lucid)",
    accountType: "Evaluación / Challenge",
    filterMode: "funded",
    brokerFilter: "lucid_trading",
    initialBalance: 50000,
    profitTarget: 3000,
    maxDailyLoss: 1200,
    maxTotalLoss: 2000,
    minTradingDays: 3,
    consistencyRulePct: 0,
    maxMicros: 40,
    status: "Active",
  },
  {
    name: "Lucy Trading / LucidFlex $50K",
    firm: "Lucy Trading (Lucid)",
    accountType: "Evaluación / Challenge",
    filterMode: "funded",
    brokerFilter: "lucid_trading",
    initialBalance: 50000,
    profitTarget: 3000,
    maxDailyLoss: 0,
    maxTotalLoss: 2000,
    minTradingDays: 1,
    consistencyRulePct: 40,
    maxMicros: 40,
    status: "Active",
  },
  {
    name: "Lucy Trading / LucidPro $100K",
    firm: "Lucy Trading (Lucid)",
    accountType: "Evaluación / Challenge",
    filterMode: "funded",
    brokerFilter: "lucid_trading",
    initialBalance: 100000,
    profitTarget: 6000,
    maxDailyLoss: 1800,
    maxTotalLoss: 3000,
    minTradingDays: 3,
    consistencyRulePct: 0,
    maxMicros: 60,
    status: "Active",
  },
  {
    name: "Lucy Trading / LucidFlex $100K",
    firm: "Lucy Trading (Lucid)",
    accountType: "Evaluación / Challenge",
    filterMode: "funded",
    brokerFilter: "lucid_trading",
    initialBalance: 100000,
    profitTarget: 6000,
    maxDailyLoss: 0,
    maxTotalLoss: 3000,
    minTradingDays: 1,
    consistencyRulePct: 40,
    maxMicros: 60,
    status: "Active",
  },
  {
    name: "TopStep $50K Combine / XFA",
    firm: "TopStep",
    accountType: "Cuenta Fondeada (PA / XFA)",
    filterMode: "funded",
    brokerFilter: "topstep",
    initialBalance: 50000,
    profitTarget: 3000,
    maxDailyLoss: 1000,
    maxTotalLoss: 2000,
    minTradingDays: 5,
    consistencyRulePct: 50,
    maxMicros: 50,
    status: "Active",
  },
  {
    name: "TopStep $100K Combine / XFA",
    firm: "TopStep",
    accountType: "Cuenta Fondeada (PA / XFA)",
    filterMode: "funded",
    brokerFilter: "topstep",
    initialBalance: 100000,
    profitTarget: 6000,
    maxDailyLoss: 2000,
    maxTotalLoss: 3000,
    minTradingDays: 5,
    consistencyRulePct: 50,
    maxMicros: 100,
    status: "Active",
  },
  {
    name: "Apex Trader Funding $50K",
    firm: "Apex",
    accountType: "Evaluación / Challenge",
    filterMode: "funded",
    brokerFilter: "apex",
    initialBalance: 50000,
    profitTarget: 3000,
    maxDailyLoss: 0,
    maxTotalLoss: 2500,
    minTradingDays: 7,
    consistencyRulePct: 30,
    maxMicros: 100,
    status: "Active",
  },
  {
    name: "My Funded Futures (MFFU) $50K",
    firm: "My Funded Futures",
    accountType: "Evaluación / Challenge",
    filterMode: "funded",
    brokerFilter: "my_funded_futures",
    initialBalance: 50000,
    profitTarget: 3000,
    maxDailyLoss: 1200,
    maxTotalLoss: 2000,
    minTradingDays: 2,
    consistencyRulePct: 40,
    maxMicros: 50,
    status: "Active",
  },
  {
    name: "Take Profit Trader $50K",
    firm: "Take Profit Trader",
    accountType: "Evaluación / Challenge",
    filterMode: "funded",
    brokerFilter: "take_profit_trader",
    initialBalance: 50000,
    profitTarget: 3000,
    maxDailyLoss: 1100,
    maxTotalLoss: 2000,
    minTradingDays: 5,
    consistencyRulePct: 50,
    maxMicros: 60,
    status: "Active",
  },
  {
    name: "FTMO $100K Challenge",
    firm: "FTMO",
    accountType: "Evaluación / Challenge",
    filterMode: "funded",
    brokerFilter: "ftmo",
    initialBalance: 100000,
    profitTarget: 10000,
    maxDailyLoss: 5000,
    maxTotalLoss: 10000,
    minTradingDays: 4,
    consistencyRulePct: 0,
    maxMicros: 0,
    status: "Active",
  },
];

const STORAGE_KEY = "tdi_prop_accounts_v2";

function ProgressBar({ value, max, color = "bg-green-primary" }: {
  value: number; max: number; color?: string;
}) {
  const pct = max > 0 ? Math.min(Math.max((value / max) * 100, 0), 100) : 0;
  return (
    <div className="h-2.5 w-full rounded-full bg-border-card overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function RuleRow({
  label,
  current,
  limit,
  format = "dollar",
  warn = 80,
  isGoal = false,
  subText,
}: {
  label: string;
  current: number;
  limit: number;
  format?: "dollar" | "percent" | "days" | "contracts";
  warn?: number;
  isGoal?: boolean;
  subText?: string;
}) {
  if (limit <= 0) return null;
  const rawPct = (Math.max(0, current) / limit) * 100;
  const pct = Math.min(rawPct, 100);

  let color = "bg-green-primary";
  let textColor = "text-green-primary";
  if (isGoal) {
    color = rawPct >= 100 ? "bg-green-primary" : "bg-blue-accent";
    textColor = rawPct >= 100 ? "text-green-primary" : "text-blue-accent";
  } else {
    const isDanger = rawPct >= 95;
    const isWarn = rawPct >= warn;
    color = isDanger ? "bg-red-loss" : isWarn ? "bg-yellow-warn" : "bg-green-primary";
    textColor = isDanger ? "text-red-loss" : isWarn ? "text-yellow-warn" : "text-green-primary";
  }

  const fmt = (v: number) =>
    format === "dollar"
      ? `$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : format === "percent"
        ? `${v.toFixed(1)}%`
        : format === "days"
          ? `${v} días`
          : `${v} contratos`;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 text-[12px]">
        <span className="text-text-secondary font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`font-bold tabular-nums ${textColor}`}>{fmt(current)}</span>
          <span className="text-text-muted tabular-nums">/ {fmt(limit)}</span>
          {!isGoal && rawPct >= 95 && <AlertTriangle className="h-3.5 w-3.5 text-red-loss" />}
          {isGoal && rawPct >= 100 && <CheckCircle className="h-3.5 w-3.5 text-green-primary" />}
        </div>
      </div>
      <ProgressBar value={Math.max(0, current)} max={limit} color={color} />
      <div className="flex items-center justify-between mt-1">
        <p className="text-[10px] text-text-muted">
          {rawPct.toFixed(1)}% {isGoal ? "completado" : "utilizado"}
        </p>
        {subText && <p className="text-[10px] text-text-muted">{subText}</p>}
      </div>
    </div>
  );
}

export default function AccountsPage() {
  const { trades, isHydrated } = useTradeStore();
  const [accounts, setAccounts] = useState<PropAccountConfig[]>(DEFAULT_ACCOUNTS);
  const [selectedId, setSelectedId] = useState<string>(DEFAULT_ACCOUNTS[0].id);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<PropAccountConfig | null>(null);

  // Cargar cuentas personalizadas de localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAccounts(parsed);
          setSelectedId(parsed[0].id);
        }
      }
    } catch {
      // Fallback a DEFAULT_ACCOUNTS
    }
  }, []);

  const saveAccounts = (next: PropAccountConfig[]) => {
    setAccounts(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage quota errors
    }
  };

  // Calcular métricas en tiempo real desde el Ledger para cada cuenta
  const computedAccounts = useMemo(() => {
    const todayKey = localDateKey();
    return accounts.map(acc => {
      const matchingTrades = trades.filter(t => {
        if (acc.filterMode === "funded") return !!t.isFundedAccount;
        if (acc.filterMode === "personal") return !t.isFundedAccount;
        if (acc.filterMode === "broker" && acc.brokerFilter) {
          return (t.brokerId || "").toLowerCase() === acc.brokerFilter.toLowerCase();
        }
        return true;
      });

      const stats = computeStats(matchingTrades);
      const closed = matchingTrades.filter(isStrictlyClosed);

      // P&L por día efectivo ordenado cronológicamente para calcular EOD Trailing Floor
      const dayMap: Record<string, number> = {};
      for (const t of closed) {
        const d = effectiveTradeDate(t);
        dayMap[d] = parseFloat(((dayMap[d] || 0) + (t.netPnl ?? 0)).toFixed(2));
      }
      const sortedDays = Object.keys(dayMap).sort();
      const dayValues = Object.values(dayMap);
      const daysTraded = sortedDays.length;
      const bestDayPnl = dayValues.length > 0 ? Math.max(...dayValues, 0) : 0;
      const worstDayPnl = dayValues.length > 0 ? Math.min(...dayValues, 0) : 0;
      const todayPnl = dayMap[todayKey] ?? 0;

      const currentProfit = stats.totalNet;
      const currentBalance = parseFloat((acc.initialBalance + currentProfit).toFixed(2));

      // EOD High-Water Mark y Piso de Liquidación EOD (con candado en Balance Inicial como Lucy Trading / TopStep)
      let runningBalance = acc.initialBalance;
      let eodHighWaterMark = acc.initialBalance;
      for (const d of sortedDays) {
        runningBalance = parseFloat((runningBalance + dayMap[d]).toFixed(2));
        if (runningBalance > eodHighWaterMark) {
          eodHighWaterMark = runningBalance;
        }
      }
      const rawTrailingFloor = acc.maxTotalLoss > 0 ? eodHighWaterMark - acc.maxTotalLoss : 0;
      const isTrailingLocked = acc.maxTotalLoss > 0 && rawTrailingFloor >= acc.initialBalance;
      const eodLiquidationFloor = acc.maxTotalLoss > 0
        ? parseFloat(Math.min(acc.initialBalance, rawTrailingFloor).toFixed(2))
        : 0;
      const liveBufferAboveFloor = acc.maxTotalLoss > 0
        ? parseFloat(Math.max(0, currentBalance - eodLiquidationFloor).toFixed(2))
        : 0;

      // Máximo tamaño de posición observado (contratos)
      const maxContractsUsed = closed.reduce((mx, t) => Math.max(mx, t.totalContracts || 0), 0);

      // Pérdida consumida hoy (si hoy es negativo) y en el peor día histórico
      const dailyLossToday = todayPnl < 0 ? Math.abs(todayPnl) : 0;
      const maxObservedDailyLoss = worstDayPnl < 0 ? Math.abs(worstDayPnl) : 0;

      // Consistencia: qué % representa el mejor día sobre el profit total positivo
      const consistencyPctObserved = currentProfit > 0
        ? parseFloat(((bestDayPnl / currentProfit) * 100).toFixed(1))
        : 0;
      const consistencyDollarLimit = acc.consistencyRulePct > 0 && currentProfit > 0
        ? parseFloat(((currentProfit * acc.consistencyRulePct) / 100).toFixed(2))
        : 0;

      const dailyLossBreached = acc.maxDailyLoss > 0 && (dailyLossToday >= acc.maxDailyLoss || maxObservedDailyLoss >= acc.maxDailyLoss);
      const drawdownBreached = acc.maxTotalLoss > 0 && (stats.maxDrawdown >= acc.maxTotalLoss || currentBalance <= eodLiquidationFloor);
      const targetReached = acc.profitTarget > 0 && currentProfit >= acc.profitTarget;
      const minDaysMet = acc.minTradingDays <= 0 || daysTraded >= acc.minTradingDays;
      const consistencyOk = acc.consistencyRulePct <= 0 || currentProfit <= 0 || bestDayPnl <= consistencyDollarLimit + 0.01;
      const contractsOk = !acc.maxMicros || acc.maxMicros <= 0 || maxContractsUsed <= acc.maxMicros;

      return {
        config: acc,
        stats,
        daysTraded,
        bestDayPnl,
        worstDayPnl,
        todayPnl,
        currentProfit,
        currentBalance,
        eodHighWaterMark,
        eodLiquidationFloor,
        isTrailingLocked,
        liveBufferAboveFloor,
        maxContractsUsed,
        dailyLossToday,
        maxObservedDailyLoss,
        consistencyPctObserved,
        consistencyDollarLimit,
        dailyLossBreached,
        drawdownBreached,
        targetReached,
        minDaysMet,
        consistencyOk,
        contractsOk,
      };
    });
  }, [accounts, trades]);

  const active = computedAccounts.find(a => a.config.id === selectedId) ?? computedAccounts[0];

  const openNewAccountModal = () => {
    setEditingAccount({
      id: `acc-${Date.now()}`,
      name: "Lucy Trading / LucidPro $50K",
      firm: "Lucy Trading (Lucid)",
      accountType: "Evaluación / Challenge",
      filterMode: "funded",
      brokerFilter: "lucid_trading",
      initialBalance: 50000,
      profitTarget: 3000,
      maxDailyLoss: 1200,
      maxTotalLoss: 2000,
      minTradingDays: 3,
      consistencyRulePct: 40,
      maxMicros: 40,
      status: "Active",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (cfg: PropAccountConfig) => {
    setEditingAccount({ ...cfg });
    setIsModalOpen(true);
  };

  const handleSaveModal = () => {
    if (!editingAccount) return;
    const exists = accounts.some(a => a.id === editingAccount.id);
    const next = exists
      ? accounts.map(a => (a.id === editingAccount.id ? editingAccount : a))
      : [...accounts, editingAccount];
    saveAccounts(next);
    setSelectedId(editingAccount.id);
    setIsModalOpen(false);
    setEditingAccount(null);
  };

  const handleDeleteAccount = (id: string) => {
    if (accounts.length <= 1) return;
    const next = accounts.filter(a => a.id !== id);
    saveAccounts(next);
    if (selectedId === id) setSelectedId(next[0].id);
  };

  if (!isHydrated || !active) return null;

  const {
    config: acc,
    stats,
    daysTraded,
    bestDayPnl,
    worstDayPnl,
    todayPnl,
    currentProfit,
    currentBalance,
    eodHighWaterMark,
    eodLiquidationFloor,
    isTrailingLocked,
    liveBufferAboveFloor,
    maxContractsUsed,
    dailyLossToday,
    maxObservedDailyLoss,
    consistencyPctObserved,
    consistencyDollarLimit,
    dailyLossBreached,
    drawdownBreached,
    targetReached,
    minDaysMet,
    consistencyOk,
    contractsOk,
  } = active;

  const remainingProfit = acc.profitTarget > 0 ? Math.max(0, acc.profitTarget - currentProfit) : null;
  const allRulesOk = !dailyLossBreached && !drawdownBreached && consistencyOk && contractsOk;

  return (
    <AppShell
      title="Cuentas de Trading & Prop Firms"
      subtitle="Monitoreo en tiempo real conectado 1:1 con las operaciones de tu Journal (Lucy Trading / Lucid, TopStep, Apex, MFFU, FTMO)"
    >
      <div className="flex flex-col gap-5 w-full max-w-[1800px] mx-auto">

        {/* ── Barra superior: Selector de cuentas + Botón Crear/Configurar ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            {computedAccounts.map(item => {
              const isSel = item.config.id === active.config.id;
              return (
                <button
                  key={item.config.id}
                  onClick={() => setSelectedId(item.config.id)}
                  className={`flex flex-col items-start rounded-card border px-4 py-3 transition-all text-left min-w-[215px] ${
                    isSel
                      ? "bg-green-primary/10 border-green-primary/40 shadow-green-glow"
                      : "border-border-card bg-bg-card hover:bg-bg-section/60"
                  }`}
                >
                  <div className="flex items-center justify-between w-full gap-2 mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                      {item.config.firm} · {item.stats.closedTrades} ops
                    </span>
                    <span className={`h-2 w-2 rounded-full ${
                      !item.dailyLossBreached && !item.drawdownBreached ? "bg-green-primary" : "bg-red-loss"
                    }`} />
                  </div>
                  <span className={`text-[13px] font-bold ${isSel ? "text-green-primary" : "text-text-primary"}`}>
                    {item.config.name}
                  </span>
                  <div className="flex items-center gap-2 mt-1 text-[11px] tabular-nums">
                    <span className="text-text-secondary font-semibold">
                      ${item.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className={`font-bold ${item.currentProfit >= 0 ? "text-green-primary" : "text-red-loss"}`}>
                      ({item.currentProfit >= 0 ? "+" : "-"}${Math.abs(item.currentProfit).toFixed(2)})
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openEditModal(acc)}
              className="flex items-center gap-2 rounded-btn border border-border-card bg-bg-card px-4 py-2.5 text-[12px] font-semibold text-text-secondary hover:text-text-primary hover:border-green-primary/40 transition-colors"
            >
              <Settings2 className="h-4 w-4 text-blue-accent" />
              Editar Reglas
            </button>
            <button
              onClick={openNewAccountModal}
              className="flex items-center gap-2 rounded-btn bg-green-primary px-4 py-2.5 text-[12px] font-bold text-bg-main shadow-green-glow hover:bg-green-primary/90 transition-all"
            >
              <Plus className="h-4 w-4" />
              Nueva Cuenta
            </button>
          </div>
        </div>

        {/* ── KPIs Rápidos de la Cuenta Seleccionada ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            {
              label: "Balance Actual",
              value: `$${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              sub: `Inicial: $${acc.initialBalance.toLocaleString()}`,
              color: "text-text-primary",
            },
            {
              label: "Net P&L Acumulado",
              value: `${currentProfit >= 0 ? "+" : "-"}$${Math.abs(currentProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              sub: `${stats.closedTrades} ops cerradas`,
              color: currentProfit >= 0 ? "text-green-primary" : "text-red-loss",
            },
            {
              label: "Piso de Liquidación EOD",
              value: acc.maxTotalLoss > 0 ? `$${eodLiquidationFloor.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "N/A",
              sub: isTrailingLocked ? "🔒 Candado en Balance Inicial" : `Colchón: $${liveBufferAboveFloor.toFixed(2)}`,
              color: isTrailingLocked ? "text-green-primary" : "text-blue-accent",
            },
            {
              label: "Max Drawdown Realizado",
              value: `-$${stats.maxDrawdown.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              sub: acc.maxTotalLoss > 0 ? `Límite EOD: -$${acc.maxTotalLoss.toLocaleString()}` : "Sin límite fijo",
              color: drawdownBreached ? "text-red-loss" : "text-yellow-warn",
            },
            {
              label: "Días Operados",
              value: `${daysTraded} días`,
              sub: acc.minTradingDays > 0 ? `Mínimo requerido: ${acc.minTradingDays}` : "Sin mínimo de días",
              color: minDaysMet ? "text-green-primary" : "text-blue-accent",
            },
            {
              label: "Consistencia (Mejor Día)",
              value: currentProfit > 0 ? `${consistencyPctObserved}%` : "—",
              sub: `Mejor día: +$${bestDayPnl.toFixed(2)}`,
              color: consistencyOk ? "text-green-primary" : "text-yellow-warn",
            },
          ].map(k => (
            <div key={k.label} className="rounded-card border border-border-card bg-bg-card p-4">
              <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-1">{k.label}</p>
              <p className={`text-[18px] font-black tabular-nums ${k.color}`}>{k.value}</p>
              <p className="text-[10px] text-text-muted mt-1">{k.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-5">

          {/* ── Panel Principal: Reglas y Límites de Prop Firm ── */}
          <div className="rounded-card border border-border-card bg-bg-card p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-6 border-b border-border-card pb-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-text-muted">{acc.accountType} · {acc.firm}</p>
                <h2 className="text-[18px] font-bold text-text-primary mt-0.5">{acc.name}</h2>
                <p className="text-[12px] text-text-secondary mt-0.5">
                  Capital Inicial: <strong className="text-text-primary">${acc.initialBalance.toLocaleString()}</strong> ·{" "}
                  Filtro Journal:{" "}
                  <strong className="text-green-primary">
                    {acc.filterMode === "funded"
                      ? "Operaciones en Cuenta Fondeada"
                      : acc.filterMode === "personal"
                        ? "Operaciones en Cuenta Personal"
                        : acc.filterMode === "broker"
                          ? `Bróker / Prop Firm: ${acc.brokerFilter}`
                          : "Todas las Operaciones del Journal"}
                  </strong>
                </p>
              </div>
              <div className="flex items-center gap-2">
                {targetReached && allRulesOk ? (
                  <span className="flex items-center gap-1.5 rounded-full bg-green-primary/15 border border-green-primary/30 px-3.5 py-1.5 text-[11px] font-bold text-green-primary">
                    <Award className="h-4 w-4" /> Objetivo de Profit Alcanzado
                  </span>
                ) : allRulesOk ? (
                  <span className="flex items-center gap-1.5 rounded-full bg-green-primary/15 border border-green-primary/30 px-3.5 py-1.5 text-[11px] font-bold text-green-primary">
                    <CheckCircle className="h-3.5 w-3.5" /> Cuenta en Regla
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 rounded-full bg-red-loss/15 border border-red-loss/30 px-3.5 py-1.5 text-[11px] font-bold text-red-loss">
                    <AlertTriangle className="h-3.5 w-3.5" /> Revisar Parámetro de Regla
                  </span>
                )}
                {accounts.length > 1 && (
                  <button
                    onClick={() => handleDeleteAccount(acc.id)}
                    title="Eliminar esta cuenta"
                    className="p-2 rounded-lg border border-border-card text-text-muted hover:text-red-loss hover:border-red-loss/40 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-6">
              {acc.profitTarget > 0 && (
                <RuleRow
                  label="Objetivo de Profit (Profit Target)"
                  current={Math.max(0, currentProfit)}
                  limit={acc.profitTarget}
                  format="dollar"
                  isGoal={true}
                  subText={
                    remainingProfit !== null && remainingProfit > 0
                      ? `Faltan $${remainingProfit.toFixed(2)} para alcanzar la meta`
                      : `Meta superada por +$${Math.max(0, currentProfit - acc.profitTarget).toFixed(2)}`
                  }
                />
              )}

              {acc.maxDailyLoss > 0 ? (
                <RuleRow
                  label="Pérdida Máxima Diaria Hoy (Daily Loss Limit — DLL)"
                  current={dailyLossToday}
                  limit={acc.maxDailyLoss}
                  format="dollar"
                  warn={60}
                  subText={`P&L Hoy: ${todayPnl >= 0 ? "+" : "-"}$${Math.abs(todayPnl).toFixed(2)} · Peor día histórico: -$${maxObservedDailyLoss.toFixed(2)}`}
                />
              ) : (
                <div className="rounded-lg border border-border-card/60 bg-bg-section/40 px-4 py-2.5 flex items-center justify-between text-[12px]">
                  <span className="text-text-secondary font-medium">Límite de Pérdida Diaria (Daily Loss Limit)</span>
                  <span className="text-green-primary font-bold">Sin límite diario en este plan (ej. LucidFlex / Apex)</span>
                </div>
              )}

              {acc.maxTotalLoss > 0 && (
                <RuleRow
                  label="Drawdown Máximo Realizado vs Límite Total (EOD Trailing Drawdown)"
                  current={stats.maxDrawdown}
                  limit={acc.maxTotalLoss}
                  format="dollar"
                  warn={70}
                  subText={`Piso de Liquidación EOD: $${eodLiquidationFloor.toLocaleString(undefined, { minimumFractionDigits: 2 })} · Colchón real actual: $${liveBufferAboveFloor.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                />
              )}

              {acc.maxMicros && acc.maxMicros > 0 ? (
                <RuleRow
                  label={`Tamaño Máximo de Posición (Límite ${Math.floor(acc.maxMicros / 10)} Minis / ${acc.maxMicros} Micros)`}
                  current={maxContractsUsed}
                  limit={acc.maxMicros}
                  format="contracts"
                  warn={80}
                  subText={`Máximo operado en un trade: ${maxContractsUsed} contratos · Disponible: ${Math.max(0, acc.maxMicros - maxContractsUsed)} contratos`}
                />
              ) : null}

              {acc.minTradingDays > 0 && (
                <RuleRow
                  label="Días Mínimos de Operativa"
                  current={daysTraded}
                  limit={acc.minTradingDays}
                  format="days"
                  isGoal={true}
                  subText={
                    daysTraded >= acc.minTradingDays
                      ? "Requisito de días mínimos cumplido"
                      : `Faltan ${acc.minTradingDays - daysTraded} día(s) operativo(s)`
                  }
                />
              )}

              {acc.consistencyRulePct > 0 && currentProfit > 0 && (
                <div>
                  <RuleRow
                    label={`Regla de Consistencia — Mejor día ≤ ${acc.consistencyRulePct}% del Profit Total`}
                    current={bestDayPnl}
                    limit={consistencyDollarLimit}
                    format="dollar"
                    warn={85}
                    subText={`Tu mejor día (+$${bestDayPnl.toFixed(2)}) equivale al ${consistencyPctObserved}% del beneficio acumulado (+$${currentProfit.toFixed(2)})`}
                  />
                  {!consistencyOk && (
                    <div className="mt-2.5 flex items-center justify-between gap-2 rounded-lg border border-yellow-warn/30 bg-yellow-warn/10 px-3.5 py-2.5 text-[11px] text-yellow-warn">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>
                          Tu mejor día (+${bestDayPnl.toFixed(2)}) representa el <strong>{consistencyPctObserved}%</strong> del profit total (límite {acc.consistencyRulePct}%).
                        </span>
                      </div>
                      <span className="font-bold tabular-nums shrink-0">
                        Profit requerido para diluir: +${((bestDayPnl / (acc.consistencyRulePct / 100))).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Sidebar: Resumen Contable, Candado EOD y Checklist ── */}
          <div className="flex flex-col gap-4">
            <div className="rounded-card border border-border-card bg-bg-card p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-primary" /> Conciliación & Piso EOD
              </p>
              <div className="flex flex-col gap-2.5">
                {[
                  { label: "Balance inicial", value: `$${acc.initialBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: "text-text-secondary" },
                  { label: "Gross P&L Realizado", value: `${stats.totalGross >= 0 ? "+" : "-"}$${Math.abs(stats.totalGross).toFixed(2)}`, color: stats.totalGross >= 0 ? "text-green-primary" : "text-red-loss" },
                  { label: "Comisiones Realizadas", value: `-$${stats.totalCommissions.toFixed(2)}`, color: "text-yellow-warn" },
                  { label: "Net P&L Realizado", value: `${currentProfit >= 0 ? "+" : "-"}$${Math.abs(currentProfit).toFixed(2)}`, color: currentProfit >= 0 ? "text-green-primary" : "text-red-loss" },
                  { label: "Balance actual", value: `$${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: "text-text-primary" },
                  { label: "High-Water Mark (EOD)", value: `$${eodHighWaterMark.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: "text-blue-accent" },
                  { label: "Piso de Liquidación EOD", value: acc.maxTotalLoss > 0 ? `$${eodLiquidationFloor.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "N/A", color: isTrailingLocked ? "text-green-primary" : "text-red-loss" },
                  { label: "Colchón sobre Liquidación", value: acc.maxTotalLoss > 0 ? `+$${liveBufferAboveFloor.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "N/A", color: "text-green-primary" },
                  { label: "Mejor día", value: `+$${bestDayPnl.toFixed(2)}`, color: "text-green-primary" },
                  { label: "Peor día", value: worstDayPnl < 0 ? `-$${Math.abs(worstDayPnl).toFixed(2)}` : "$0.00", color: worstDayPnl < 0 ? "text-red-loss" : "text-text-secondary" },
                ].map(r => (
                  <div key={r.label} className="flex justify-between items-center border-b border-border-card/30 pb-2">
                    <span className="text-[11px] text-text-muted">{r.label}</span>
                    <span className={`text-[12.5px] font-bold tabular-nums ${r.color}`}>{r.value}</span>
                  </div>
                ))}
              </div>
              {isTrailingLocked && (
                <div className="mt-3 rounded-lg border border-green-primary/30 bg-green-primary/10 px-3 py-2 text-[11px] text-green-primary flex items-center gap-2">
                  <Lock className="h-4 w-4 shrink-0" />
                  <span>
                    <strong>Candado EOD Activado:</strong> Tu ganancia acumulada superó el umbral de Drawdown, por lo que el piso de liquidación ya quedó fijo en <strong>${acc.initialBalance.toLocaleString()}</strong> y no sube más.
                  </span>
                </div>
              )}
            </div>

            <div className="rounded-card border border-border-card bg-bg-card p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-accent" /> Checklist de Reglas Prop Firm
              </p>
              <div className="flex flex-col gap-2.5">
                {[
                  {
                    ok: !dailyLossBreached,
                    label: acc.maxDailyLoss > 0 ? `Dentro del Daily Loss Limit ($${acc.maxDailyLoss.toLocaleString()})` : "Sin límite de pérdida diaria (DLL libre)",
                  },
                  {
                    ok: !drawdownBreached,
                    label: acc.maxTotalLoss > 0 ? `Sobre Piso de Liquidación EOD ($${eodLiquidationFloor.toLocaleString()})` : "Sin límite de drawdown máximo",
                  },
                  {
                    ok: contractsOk,
                    label: acc.maxMicros && acc.maxMicros > 0 ? `Límite de Contratos respetado (${maxContractsUsed}/${acc.maxMicros} Micros)` : "Sin límite de contratos",
                  },
                  {
                    ok: targetReached || acc.profitTarget === 0,
                    label: acc.profitTarget > 0 ? `Objetivo de Profit ($${acc.profitTarget.toLocaleString()})` : "Sin objetivo fijo de profit",
                  },
                  {
                    ok: minDaysMet,
                    label: acc.minTradingDays > 0 ? `Días mínimos operados (${daysTraded}/${acc.minTradingDays})` : "Sin mínimo de días",
                  },
                  {
                    ok: consistencyOk,
                    label: acc.consistencyRulePct > 0 ? `Regla de Consistencia ≤ ${acc.consistencyRulePct}%` : "Sin regla de consistencia (LucidPro / Libre)",
                  },
                ].map((c, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-[12px]">
                    {c.ok
                      ? <CheckCircle className="h-4 w-4 text-green-primary flex-shrink-0" />
                      : <AlertTriangle className="h-4 w-4 text-yellow-warn flex-shrink-0" />}
                    <span className={c.ok ? "text-text-secondary" : "text-yellow-warn font-medium"}>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Modal de Creación / Edición de Cuenta ── */}
        {isModalOpen && editingAccount && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl rounded-2xl border border-border-card bg-bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-border-card pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-green-primary" />
                  <h3 className="text-[15px] font-bold text-text-primary">Configurar Cuenta y Reglas de Fondeo</h3>
                </div>
                <button
                  onClick={() => { setIsModalOpen(false); setEditingAccount(null); }}
                  className="text-text-muted hover:text-text-primary"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Plantillas rápidas de Prop Firm */}
              <div className="mb-4">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted block mb-2">
                  Cargar Plantilla Oficial (1 clic — incluye Lucy Trading / LucidPro & LucidFlex)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PROP_PRESETS.map(p => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setEditingAccount({ ...p, id: editingAccount.id })}
                      className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                        p.firm.includes("Lucy")
                          ? "border-green-primary/40 bg-green-primary/10 text-green-primary hover:bg-green-primary/20"
                          : "border-border-card bg-bg-section text-text-secondary hover:border-green-primary/40 hover:text-green-primary"
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-[12px]">
                <div className="sm:col-span-2">
                  <label className="text-[11px] text-text-secondary font-medium block mb-1">Nombre de la Cuenta</label>
                  <input
                    type="text"
                    value={editingAccount.name}
                    onChange={e => setEditingAccount({ ...editingAccount, name: e.target.value })}
                    className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2 text-text-primary focus:outline-none focus:border-green-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-text-secondary font-medium block mb-1">Prop Firm / Bróker</label>
                  <input
                    type="text"
                    value={editingAccount.firm}
                    onChange={e => setEditingAccount({ ...editingAccount, firm: e.target.value })}
                    className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2 text-text-primary focus:outline-none focus:border-green-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-text-secondary font-medium block mb-1">Vincular con Operaciones del Journal</label>
                  <select
                    value={
                      editingAccount.filterMode === "broker"
                        ? `broker:${editingAccount.brokerFilter || "lucid_trading"}`
                        : editingAccount.filterMode
                    }
                    onChange={e => {
                      const val = e.target.value;
                      if (val.startsWith("broker:")) {
                        setEditingAccount({
                          ...editingAccount,
                          filterMode: "broker",
                          brokerFilter: val.replace("broker:", ""),
                        });
                      } else {
                        setEditingAccount({
                          ...editingAccount,
                          filterMode: val as PropAccountConfig["filterMode"],
                        });
                      }
                    }}
                    className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2 text-text-primary focus:outline-none focus:border-green-primary"
                  >
                    <option value="funded">Todas las Cuentas Fondeadas / Prop Firm</option>
                    <option value="broker:lucid_trading">Solo Bróker: Lucy Trading / Lucid Trading</option>
                    <option value="broker:topstep">Solo Bróker: TopStep</option>
                    <option value="broker:apex">Solo Bróker: Apex Trader Funding</option>
                    <option value="broker:my_funded_futures">Solo Bróker: My Funded Futures (MFFU)</option>
                    <option value="broker:take_profit_trader">Solo Bróker: Take Profit Trader</option>
                    <option value="personal">Cuenta Personal</option>
                    <option value="all">Todas las Operaciones (Global)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-text-secondary font-medium block mb-1">Capital Inicial ($ USD)</label>
                  <input
                    type="number"
                    value={editingAccount.initialBalance}
                    onChange={e => setEditingAccount({ ...editingAccount, initialBalance: Number(e.target.value) || 0 })}
                    className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2 text-text-primary tabular-nums focus:outline-none focus:border-green-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-text-secondary font-medium block mb-1">Objetivo de Profit ($ USD)</label>
                  <input
                    type="number"
                    value={editingAccount.profitTarget}
                    onChange={e => setEditingAccount({ ...editingAccount, profitTarget: Number(e.target.value) || 0 })}
                    className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2 text-text-primary tabular-nums focus:outline-none focus:border-green-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-text-secondary font-medium block mb-1">Pérdida Máx. Diaria / DLL ($ — 0 = Sin límite)</label>
                  <input
                    type="number"
                    value={editingAccount.maxDailyLoss}
                    onChange={e => setEditingAccount({ ...editingAccount, maxDailyLoss: Number(e.target.value) || 0 })}
                    className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2 text-text-primary tabular-nums focus:outline-none focus:border-green-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-text-secondary font-medium block mb-1">Drawdown Máximo EOD ($ USD)</label>
                  <input
                    type="number"
                    value={editingAccount.maxTotalLoss}
                    onChange={e => setEditingAccount({ ...editingAccount, maxTotalLoss: Number(e.target.value) || 0 })}
                    className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2 text-text-primary tabular-nums focus:outline-none focus:border-green-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-text-secondary font-medium block mb-1">Días Mínimos de Operativa</label>
                  <input
                    type="number"
                    value={editingAccount.minTradingDays}
                    onChange={e => setEditingAccount({ ...editingAccount, minTradingDays: Number(e.target.value) || 0 })}
                    className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2 text-text-primary tabular-nums focus:outline-none focus:border-green-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-text-secondary font-medium block mb-1">Regla de Consistencia (% — 0 = Sin regla)</label>
                  <input
                    type="number"
                    value={editingAccount.consistencyRulePct}
                    onChange={e => setEditingAccount({ ...editingAccount, consistencyRulePct: Number(e.target.value) || 0 })}
                    className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2 text-text-primary tabular-nums focus:outline-none focus:border-green-primary"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] text-text-secondary font-medium block mb-1">Límite de Contratos Micros (ej. 40 Micros = 4 Minis en Lucy $50K, 60 en $100K)</label>
                  <input
                    type="number"
                    value={editingAccount.maxMicros ?? 40}
                    onChange={e => setEditingAccount({ ...editingAccount, maxMicros: Number(e.target.value) || 0 })}
                    className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2 text-text-primary tabular-nums focus:outline-none focus:border-green-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-border-card">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setEditingAccount(null); }}
                  className="rounded-btn border border-border-card px-4 py-2 text-[12px] font-semibold text-text-secondary hover:text-text-primary"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveModal}
                  className="rounded-btn bg-green-primary px-5 py-2 text-[12px] font-bold text-bg-main shadow-green-glow hover:bg-green-primary/90"
                >
                  Guardar Cuenta
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
