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
  Target,
  Calendar,
  Layers,
  Scale,
  Activity,
  LayoutGrid,
  Table2,
  Copy,
  FolderKanban,
  Wallet,
  Sparkles,
  RotateCcw,
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
  filterMode: "funded" | "personal" | "all" | "broker" | "tag";
  brokerFilter?: string;
  tagFilter?: string;
  payoutSplitPct?: number; // ej. 90% split para el trader
  initialBalance: number;
  profitTarget: number;
  maxDailyLoss: number;
  maxTotalLoss: number;
  minTradingDays: number;
  consistencyRulePct: number;
  maxMicros?: number;
  status: "Active" | "Passed" | "Breached";
}

const DEFAULT_ACCOUNTS: PropAccountConfig[] = [
  {
    id: "default-mffu-50k",
    name: "MFFU Starter/Pro $50K #01",
    firm: "My Funded Futures",
    accountType: "Evaluación / Challenge",
    filterMode: "funded",
    brokerFilter: "my_funded_futures",
    payoutSplitPct: 90,
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
    id: "default-lucy-50k",
    name: "Lucy / LucidPro $50K #01",
    firm: "Lucy Trading (Lucid)",
    accountType: "Evaluación / Challenge",
    filterMode: "funded",
    brokerFilter: "lucid_trading",
    payoutSplitPct: 90,
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
    name: "TopStep $50K Combine #01",
    firm: "TopStep",
    accountType: "Cuenta Fondeada (PA / XFA)",
    filterMode: "funded",
    brokerFilter: "topstep",
    payoutSplitPct: 90,
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
    firm: "Capital Propio",
    accountType: "Cuenta Personal",
    filterMode: "personal",
    payoutSplitPct: 100,
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
    name: "Portafolio Global",
    firm: "Consolidado Total",
    accountType: "Portafolio Global",
    filterMode: "all",
    payoutSplitPct: 90,
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

/** Genera el esquema de 13 cuentas fondeadas (5 Lucy + 5 MFFU + 3 TopStep) + 1 Personal */
function build13AccountEmpirePreset(): PropAccountConfig[] {
  const list: PropAccountConfig[] = [];
  for (let i = 1; i <= 5; i++) {
    const seq = String(i).padStart(2, "0");
    list.push({
      id: `empire-lucy-${seq}`,
      name: `Lucy / LucidPro $50K #${seq}`,
      firm: "Lucy Trading (Lucid)",
      accountType: "Evaluación / Challenge",
      filterMode: "funded",
      brokerFilter: "lucid_trading",
      tagFilter: `lucy-${seq}`,
      payoutSplitPct: 90,
      initialBalance: 50000,
      profitTarget: 3000,
      maxDailyLoss: 1200,
      maxTotalLoss: 2000,
      minTradingDays: 3,
      consistencyRulePct: 0,
      maxMicros: 40,
      status: "Active",
    });
  }
  for (let i = 1; i <= 5; i++) {
    const seq = String(i).padStart(2, "0");
    list.push({
      id: `empire-mffu-${seq}`,
      name: `MFFU Starter/Pro $50K #${seq}`,
      firm: "My Funded Futures",
      accountType: "Evaluación / Challenge",
      filterMode: "funded",
      brokerFilter: "my_funded_futures",
      tagFilter: `mffu-${seq}`,
      payoutSplitPct: 90,
      initialBalance: 50000,
      profitTarget: 3000,
      maxDailyLoss: 1200,
      maxTotalLoss: 2000,
      minTradingDays: 2,
      consistencyRulePct: 40,
      maxMicros: 50,
      status: "Active",
    });
  }
  for (let i = 1; i <= 3; i++) {
    const seq = String(i).padStart(2, "0");
    list.push({
      id: `empire-topstep-${seq}`,
      name: `TopStep $50K XFA #${seq}`,
      firm: "TopStep",
      accountType: "Cuenta Fondeada (PA / XFA)",
      filterMode: "funded",
      brokerFilter: "topstep",
      tagFilter: `topstep-${seq}`,
      payoutSplitPct: 90,
      initialBalance: 50000,
      profitTarget: 3000,
      maxDailyLoss: 1000,
      maxTotalLoss: 2000,
      minTradingDays: 5,
      consistencyRulePct: 50,
      maxMicros: 50,
      status: "Active",
    });
  }
  list.push({
    id: "empire-personal-01",
    name: "Cuenta Personal Directa",
    firm: "Capital Propio",
    accountType: "Cuenta Personal",
    filterMode: "personal",
    payoutSplitPct: 100,
    initialBalance: 25000,
    profitTarget: 2500,
    maxDailyLoss: 750,
    maxTotalLoss: 2500,
    minTradingDays: 0,
    consistencyRulePct: 0,
    maxMicros: 0,
    status: "Active",
  });
  return list;
}

type PresetCategory = "MFFU" | "Lucy" | "TopStep" | "Otras";

const PROP_PRESETS: (Omit<PropAccountConfig, "id"> & { category: PresetCategory; badge: string })[] = [
  {
    category: "MFFU",
    badge: "$50K · DLL $1,200 · Consistencia 40%",
    name: "MFFU Starter / Core $50K",
    firm: "My Funded Futures",
    accountType: "Evaluación / Challenge",
    filterMode: "funded",
    brokerFilter: "my_funded_futures",
    payoutSplitPct: 90,
    initialBalance: 50000,
    profitTarget: 3000,
    maxDailyLoss: 1200,
    maxTotalLoss: 2000,
    minTradingDays: 2,
    consistencyRulePct: 40,
    maxMicros: 30,
    status: "Active",
  },
  {
    category: "MFFU",
    badge: "$50K · Sin DLL · Sin Consistencia",
    name: "MFFU Expert / Pro $50K",
    firm: "My Funded Futures",
    accountType: "Evaluación / Challenge",
    filterMode: "funded",
    brokerFilter: "my_funded_futures",
    payoutSplitPct: 90,
    initialBalance: 50000,
    profitTarget: 3000,
    maxDailyLoss: 0,
    maxTotalLoss: 2000,
    minTradingDays: 2,
    consistencyRulePct: 0,
    maxMicros: 50,
    status: "Active",
  },
  {
    category: "MFFU",
    badge: "$100K · DLL $2,400 · Consistencia 40%",
    name: "MFFU Starter $100K",
    firm: "My Funded Futures",
    accountType: "Evaluación / Challenge",
    filterMode: "funded",
    brokerFilter: "my_funded_futures",
    payoutSplitPct: 90,
    initialBalance: 100000,
    profitTarget: 6000,
    maxDailyLoss: 2400,
    maxTotalLoss: 3000,
    minTradingDays: 2,
    consistencyRulePct: 40,
    maxMicros: 60,
    status: "Active",
  },
  {
    category: "MFFU",
    badge: "$100K · Sin DLL · Sin Consistencia",
    name: "MFFU Expert / Pro $100K",
    firm: "My Funded Futures",
    accountType: "Evaluación / Challenge",
    filterMode: "funded",
    brokerFilter: "my_funded_futures",
    payoutSplitPct: 90,
    initialBalance: 100000,
    profitTarget: 6000,
    maxDailyLoss: 0,
    maxTotalLoss: 3000,
    minTradingDays: 2,
    consistencyRulePct: 0,
    maxMicros: 100,
    status: "Active",
  },
  {
    category: "MFFU",
    badge: "$150K · Target $9K · EOD DD $4,500",
    name: "MFFU Expert $150K",
    firm: "My Funded Futures",
    accountType: "Evaluación / Challenge",
    filterMode: "funded",
    brokerFilter: "my_funded_futures",
    payoutSplitPct: 90,
    initialBalance: 150000,
    profitTarget: 9000,
    maxDailyLoss: 0,
    maxTotalLoss: 4500,
    minTradingDays: 2,
    consistencyRulePct: 0,
    maxMicros: 150,
    status: "Active",
  },
  {
    category: "Lucy",
    badge: "$50K · DLL $1,200 · Sin Consistencia",
    name: "Lucy Trading / LucidPro $50K",
    firm: "Lucy Trading (Lucid)",
    accountType: "Evaluación / Challenge",
    filterMode: "funded",
    brokerFilter: "lucid_trading",
    payoutSplitPct: 90,
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
    category: "Lucy",
    badge: "$50K · Sin DLL · Consistencia 40%",
    name: "Lucy Trading / LucidFlex $50K",
    firm: "Lucy Trading (Lucid)",
    accountType: "Evaluación / Challenge",
    filterMode: "funded",
    brokerFilter: "lucid_trading",
    payoutSplitPct: 90,
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
    category: "Lucy",
    badge: "$100K · DLL $1,800 · Sin Consistencia",
    name: "Lucy Trading / LucidPro $100K",
    firm: "Lucy Trading (Lucid)",
    accountType: "Evaluación / Challenge",
    filterMode: "funded",
    brokerFilter: "lucid_trading",
    payoutSplitPct: 90,
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
    category: "Lucy",
    badge: "$100K · Sin DLL · Consistencia 40%",
    name: "Lucy Trading / LucidFlex $100K",
    firm: "Lucy Trading (Lucid)",
    accountType: "Evaluación / Challenge",
    filterMode: "funded",
    brokerFilter: "lucid_trading",
    payoutSplitPct: 90,
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
    category: "TopStep",
    badge: "$50K · Target $3K · DLL $1K · DD $2K",
    name: "TopStep $50K Combine / XFA",
    firm: "TopStep",
    accountType: "Cuenta Fondeada (PA / XFA)",
    filterMode: "funded",
    brokerFilter: "topstep",
    payoutSplitPct: 90,
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
    category: "TopStep",
    badge: "$100K · Target $6K · DLL $2K · DD $3K",
    name: "TopStep $100K Combine / XFA",
    firm: "TopStep",
    accountType: "Cuenta Fondeada (PA / XFA)",
    filterMode: "funded",
    brokerFilter: "topstep",
    payoutSplitPct: 90,
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
    category: "TopStep",
    badge: "$150K · Target $9K · DLL $3K · DD $4.5K",
    name: "TopStep $150K Combine / XFA",
    firm: "TopStep",
    accountType: "Cuenta Fondeada (PA / XFA)",
    filterMode: "funded",
    brokerFilter: "topstep",
    payoutSplitPct: 90,
    initialBalance: 150000,
    profitTarget: 9000,
    maxDailyLoss: 3000,
    maxTotalLoss: 4500,
    minTradingDays: 5,
    consistencyRulePct: 50,
    maxMicros: 150,
    status: "Active",
  },
  {
    category: "Otras",
    badge: "$50K · Target $3K · DD $2,500 · 7 días",
    name: "Apex Trader Funding $50K",
    firm: "Apex",
    accountType: "Evaluación / Challenge",
    filterMode: "funded",
    brokerFilter: "apex",
    payoutSplitPct: 90,
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
    category: "Otras",
    badge: "$50K · Target $3K · DLL $1,100 · DD $2K",
    name: "Take Profit Trader $50K",
    firm: "Take Profit Trader",
    accountType: "Evaluación / Challenge",
    filterMode: "funded",
    brokerFilter: "take_profit_trader",
    payoutSplitPct: 80,
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
    category: "Otras",
    badge: "$100K · Target $10K · DLL $5K · DD $10K",
    name: "FTMO $100K Challenge",
    firm: "FTMO",
    accountType: "Evaluación / Challenge",
    filterMode: "funded",
    brokerFilter: "ftmo",
    payoutSplitPct: 80,
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

const STORAGE_KEY = "tdi_prop_accounts_v4";

function ProgressBar({ value, max, color = "bg-green-primary", height = "h-2" }: {
  value: number; max: number; color?: string; height?: string;
}) {
  const pct = max > 0 ? Math.min(Math.max((value / max) * 100, 0), 100) : 0;
  return (
    <div className={`${height} w-full rounded-full bg-border-card/80 overflow-hidden`}>
      <div className={`h-full rounded-full transition-all duration-300 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function RuleCard({
  icon: Icon,
  title,
  badgeText,
  badgeStatus,
  currentLabel,
  limitLabel,
  pctUsed,
  isGoal = false,
  warn = 80,
  footerLeft,
  footerRight,
  disabledText,
}: {
  icon: React.ElementType;
  title: string;
  badgeText: string;
  badgeStatus: "ok" | "warn" | "danger" | "info";
  currentLabel: string;
  limitLabel: string;
  pctUsed: number;
  isGoal?: boolean;
  warn?: number;
  footerLeft: string;
  footerRight?: string;
  disabledText?: string;
}) {
  const badgeStyles =
    badgeStatus === "ok"
      ? "bg-green-primary/15 text-green-primary border-green-primary/30"
      : badgeStatus === "warn"
        ? "bg-yellow-warn/15 text-yellow-warn border-yellow-warn/30"
        : badgeStatus === "danger"
          ? "bg-red-loss/15 text-red-loss border-red-loss/30"
          : "bg-blue-accent/15 text-blue-accent border-blue-accent/30";

  let barColor = "bg-green-primary";
  if (isGoal) {
    barColor = pctUsed >= 100 ? "bg-green-primary" : "bg-blue-accent";
  } else {
    barColor = pctUsed >= 95 ? "bg-red-loss" : pctUsed >= warn ? "bg-yellow-warn" : "bg-green-primary";
  }

  return (
    <div className="rounded-xl border border-border-card bg-bg-section/35 p-4 flex flex-col justify-between gap-3 hover:border-border-card/90 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-bg-card border border-border-card text-text-secondary">
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="text-[12px] font-bold text-text-primary leading-tight">{title}</span>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider whitespace-nowrap ${badgeStyles}`}>
          {badgeText}
        </span>
      </div>

      {disabledText ? (
        <div className="py-2">
          <p className="text-[13px] font-bold text-green-primary">{disabledText}</p>
          <p className="text-[10.5px] text-text-muted mt-0.5">{footerLeft}</p>
        </div>
      ) : (
        <>
          <div>
            <div className="flex items-baseline justify-between gap-2 mb-1.5">
              <span className="text-[17px] font-black tabular-nums text-text-primary">{currentLabel}</span>
              <span className="text-[11px] font-semibold tabular-nums text-text-muted">de {limitLabel}</span>
            </div>
            <ProgressBar value={pctUsed} max={100} color={barColor} />
          </div>

          <div className="flex items-center justify-between gap-2 text-[10.5px] text-text-muted pt-0.5 border-t border-border-card/40">
            <span className="truncate">{footerLeft}</span>
            {footerRight && <span className="font-semibold text-text-secondary shrink-0 tabular-nums">{footerRight}</span>}
          </div>
        </>
      )}
    </div>
  );
}

export default function AccountsPage() {
  const { trades, isHydrated } = useTradeStore();
  const [accounts, setAccounts] = useState<PropAccountConfig[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [firmFilter, setFirmFilter] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"cards" | "matrix">("cards");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<PropAccountConfig | null>(null);
  const [batchCount, setBatchCount] = useState<number>(1);
  const [presetTab, setPresetTab] = useState<PresetCategory>("MFFU");
  const [accountsLoaded, setAccountsLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAccounts(parsed);
          setSelectedId(parsed[0].id);
          if (parsed.length >= 7) setViewMode("matrix");
        }
      }
    } catch {
      // Sin cuentas guardadas: la pantalla arranca vacía
    }
    setAccountsLoaded(true);
  }, []);

  const saveAccounts = (next: PropAccountConfig[]) => {
    setAccounts(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage quota errors
    }
  };

  const computedAccounts = useMemo(() => {
    const todayKey = localDateKey();
    return accounts.map(acc => {
      const matchingTrades = trades.filter(t => {
        if (acc.filterMode === "funded") return !!t.isFundedAccount;
        if (acc.filterMode === "personal") return !t.isFundedAccount;
        if (acc.filterMode === "broker" && acc.brokerFilter) {
          return (t.brokerId || "").toLowerCase() === acc.brokerFilter.toLowerCase();
        }
        if (acc.filterMode === "tag" && acc.tagFilter) {
          const cleanTag = acc.tagFilter.replace(/^#/, "").toLowerCase();
          return (t.tags || []).some(tg => tg.toLowerCase() === cleanTag) || (t.accountId || "").toLowerCase() === cleanTag;
        }
        return true;
      });

      const stats = computeStats(matchingTrades);
      const closed = matchingTrades.filter(isStrictlyClosed);

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

      const maxContractsUsed = closed.reduce((mx, t) => Math.max(mx, t.totalContracts || 0), 0);
      const dailyLossToday = todayPnl < 0 ? Math.abs(todayPnl) : 0;
      const maxObservedDailyLoss = worstDayPnl < 0 ? Math.abs(worstDayPnl) : 0;

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

      const splitPct = acc.payoutSplitPct ?? 90;
      const netPayoutAfterSplit = currentProfit > 0
        ? parseFloat(((currentProfit * splitPct) / 100).toFixed(2))
        : 0;

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
        splitPct,
        netPayoutAfterSplit,
      };
    });
  }, [accounts, trades]);

  // Resumen Consolidado de Imperio Prop Firm (suma todas las cuentas de fondeo individuales, excluyendo la tarjeta "Portafolio Global" para no duplicar)
  const empireSummary = useMemo(() => {
    const propItems = computedAccounts.filter(
      a => a.config.accountType !== "Portafolio Global" && a.config.accountType !== "Cuenta Personal"
    );
    const items = propItems.length > 0 ? propItems : computedAccounts;

    const totalAum = items.reduce((s, a) => s + a.config.initialBalance, 0);
    const totalMultipliedProfit = parseFloat(items.reduce((s, a) => s + a.currentProfit, 0).toFixed(2));
    const totalNetPayout90 = parseFloat(items.reduce((s, a) => s + a.netPayoutAfterSplit, 0).toFixed(2));
    const totalDrawdownBuffer = parseFloat(items.reduce((s, a) => s + a.liveBufferAboveFloor, 0).toFixed(2));
    const lockedCount = items.filter(a => a.isTrailingLocked).length;
    const healthyCount = items.filter(a => !a.dailyLossBreached && !a.drawdownBreached).length;

    return {
      propCount: items.length,
      totalAum,
      totalMultipliedProfit,
      totalNetPayout90,
      totalDrawdownBuffer,
      lockedCount,
      healthyCount,
    };
  }, [computedAccounts]);

  // Agrupación dinámica por Empresa ("Carpetas de Prop Firm")
  const firmGroups = useMemo(() => {
    const map = new Map<string, {
      firm: string;
      count: number;
      totalInitialCapital: number;
      totalCurrentBalance: number;
      totalProfit: number;
      healthyCount: number;
    }>();

    for (const item of computedAccounts) {
      const f = item.config.firm || "Otras";
      const prev = map.get(f) ?? {
        firm: f,
        count: 0,
        totalInitialCapital: 0,
        totalCurrentBalance: 0,
        totalProfit: 0,
        healthyCount: 0,
      };
      prev.count += 1;
      prev.totalInitialCapital += item.config.initialBalance;
      prev.totalCurrentBalance += item.currentBalance;
      prev.totalProfit += item.currentProfit;
      if (!item.dailyLossBreached && !item.drawdownBreached) {
        prev.healthyCount += 1;
      }
      map.set(f, prev);
    }
    return Array.from(map.values());
  }, [computedAccounts]);

  const visibleAccounts = useMemo(() => {
    if (firmFilter === "ALL") return computedAccounts;
    return computedAccounts.filter(a => a.config.firm === firmFilter);
  }, [computedAccounts, firmFilter]);

  const active = computedAccounts.find(a => a.config.id === selectedId) ?? visibleAccounts[0] ?? computedAccounts[0];

  const handleClearAllAccounts = () => {
    if (!window.confirm("¿Quitar todas las cuentas de fondeo configuradas? (No borra tus trades)")) return;
    saveAccounts([]);
    setFirmFilter("ALL");
    setSelectedId("");
  };

  const openNewForFirm = (category: PresetCategory) => {
    const first = PROP_PRESETS.find(p => p.category === category);
    if (!first) return;
    const { category: _c, badge: _b, ...cfg } = first;
    setEditingAccount({ ...cfg, id: `acc-${Date.now()}` });
    setBatchCount(1);
    setPresetTab(category);
    setIsModalOpen(true);
  };

  const openNewAccountModal = () => {
    setEditingAccount({
      id: `acc-${Date.now()}`,
      name: "Lucy Trading / LucidPro $50K",
      firm: "Lucy Trading (Lucid)",
      accountType: "Evaluación / Challenge",
      filterMode: "funded",
      brokerFilter: "lucid_trading",
      payoutSplitPct: 90,
      initialBalance: 50000,
      profitTarget: 3000,
      maxDailyLoss: 1200,
      maxTotalLoss: 2000,
      minTradingDays: 3,
      consistencyRulePct: 0,
      maxMicros: 40,
      status: "Active",
    });
    setBatchCount(1);
    setPresetTab("Lucy");
    setIsModalOpen(true);
  };

  const openEditModal = (cfg: PropAccountConfig) => {
    setEditingAccount({ ...cfg });
    setBatchCount(1);
    if (cfg.firm.toLowerCase().includes("lucy") || cfg.firm.toLowerCase().includes("lucid")) {
      setPresetTab("Lucy");
    } else if (cfg.firm.toLowerCase().includes("topstep")) {
      setPresetTab("TopStep");
    } else if (cfg.firm.toLowerCase().includes("funded futures") || cfg.firm.toLowerCase().includes("mffu")) {
      setPresetTab("MFFU");
    } else {
      setPresetTab("Otras");
    }
    setIsModalOpen(true);
  };

  const handleDuplicateAccount = (cfg: PropAccountConfig) => {
    const baseName = cfg.name.replace(/\s*#\d+$/, "");
    const existingFirmCount = accounts.filter(a => a.firm === cfg.firm).length;
    const nextNum = String(existingFirmCount + 1).padStart(2, "0");
    const clone: PropAccountConfig = {
      ...cfg,
      id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${baseName} #${nextNum}`,
    };
    const next = [...accounts, clone];
    saveAccounts(next);
    setSelectedId(clone.id);
  };

  const handleSaveModal = () => {
    if (!editingAccount) return;
    const exists = accounts.some(a => a.id === editingAccount.id);

    if (exists) {
      const next = accounts.map(a => (a.id === editingAccount.id ? editingAccount : a));
      saveAccounts(next);
      setSelectedId(editingAccount.id);
    } else {
      const count = Math.min(Math.max(1, batchCount), 20);
      const baseName = editingAccount.name.replace(/\s*#\d+$/, "");
      const existingSameFirm = accounts.filter(a => a.firm === editingAccount.firm).length;
      const created: PropAccountConfig[] = [];

      for (let i = 0; i < count; i++) {
        const seq = String(existingSameFirm + i + 1).padStart(2, "0");
        created.push({
          ...editingAccount,
          id: `acc-${Date.now()}-${i}`,
          name: count > 1 || existingSameFirm > 0 ? `${baseName} #${seq}` : editingAccount.name,
        });
      }
      const next = [...accounts, ...created];
      saveAccounts(next);
      setSelectedId(created[0].id);
      if (next.length >= 7) setViewMode("matrix");
    }

    setIsModalOpen(false);
    setEditingAccount(null);
  };

  const handleDeleteAccount = (id: string) => {
    if (accounts.length < 1) return;
    const next = accounts.filter(a => a.id !== id);
    saveAccounts(next);
    if (selectedId === id) setSelectedId(next[0]?.id ?? "");
  };

  const renderAccountModal = () => (
    <>
        {/* ΓöÇΓöÇ MODAL CON CREACI├ôN EN LOTE (1 A 20 CUENTAS), TAG INDIVIDUAL Y PESTA├æAS POR EMPRESA ΓöÇΓöÇ */}
        {isModalOpen && editingAccount && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl rounded-2xl border border-border-card bg-bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-border-card pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-green-primary" />
                  <div>
                    <h3 className="text-[15px] font-bold text-text-primary">Configurar Cuenta o Lote Multi-Cuenta</h3>
                    <p className="text-[11px] text-text-muted">Crea 1 o m├║ltiples cuentas id├⌐nticas (ej. 5 Lucy, 3 TopStep, 5 MFFU) en un solo paso</p>
                  </div>
                </div>
                <button
                  onClick={() => { setIsModalOpen(false); setEditingAccount(null); }}
                  className="text-text-muted hover:text-text-primary"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4">
                <div className="flex flex-wrap gap-1.5 mb-2.5 border-b border-border-card pb-2">
                  {(
                    [
                      { id: "Lucy", label: "Lucy Trading (Lucid)" },
                      { id: "MFFU", label: "My Funded Futures (MFFU)" },
                      { id: "TopStep", label: "TopStep" },
                      { id: "Otras", label: "Apex / TPT / FTMO" },
                    ] as { id: PresetCategory; label: string }[]
                  ).map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPresetTab(tab.id)}
                      className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${
                        presetTab === tab.id
                          ? "bg-green-primary text-bg-main"
                          : "bg-bg-section text-text-secondary hover:text-text-primary border border-border-card"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PROP_PRESETS.filter(p => p.category === presetTab).map(p => {
                    const isSelectedPreset = editingAccount.name.startsWith(p.name);
                    const { category: _cat, badge, ...presetConfig } = p;
                    return (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => setEditingAccount({ ...presetConfig, id: editingAccount.id })}
                        className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                          isSelectedPreset
                            ? "border-green-primary bg-green-primary/15 text-green-primary"
                            : "border-border-card bg-bg-section/60 hover:border-green-primary/40 text-text-primary"
                        }`}
                      >
                        <span className="text-[12px] font-bold">{p.name}</span>
                        <span className="text-[10px] text-text-muted mt-0.5">{badge}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {!accounts.some(a => a.id === editingAccount.id) && (
                <div className="mb-4 rounded-xl border border-green-primary/30 bg-green-primary/5 p-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[12px] font-bold text-green-primary">┬┐Cu├íntas cuentas iguales deseas crear en este lote?</p>
                    <p className="text-[10.5px] text-text-muted">
                      Se numerar├ín autom├íticamente (#01, #02, #03...) dentro de la carpeta {editingAccount.firm}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 5, 10].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setBatchCount(n)}
                        className={`rounded-lg px-3 py-1.5 text-[12px] font-extrabold transition-all ${
                          batchCount === n
                            ? "bg-green-primary text-bg-main shadow-sm"
                            : "bg-bg-card border border-border-card text-text-secondary hover:text-text-primary"
                        }`}
                      >
                        x{n}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px] pt-2 border-t border-border-card/60">
                <div className="sm:col-span-2">
                  <label className="text-[11px] text-text-secondary font-medium block mb-1">Nombre Base de la Cuenta</label>
                  <input
                    type="text"
                    value={editingAccount.name}
                    onChange={e => setEditingAccount({ ...editingAccount, name: e.target.value })}
                    className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2 text-text-primary focus:outline-none focus:border-green-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-text-secondary font-medium block mb-1">Prop Firm / Carpeta</label>
                  <input
                    type="text"
                    value={editingAccount.firm}
                    onChange={e => setEditingAccount({ ...editingAccount, firm: e.target.value })}
                    className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2 text-text-primary focus:outline-none focus:border-green-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-text-secondary font-medium block mb-1">Modo de Operativa / V├¡nculo Journal</label>
                  <select
                    value={
                      editingAccount.filterMode === "broker"
                        ? `broker:${editingAccount.brokerFilter || "my_funded_futures"}`
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
                    <option value="funded">Copy-Trading: Todas las Operaciones Funded</option>
                    <option value="tag">Rotaci├│n Individual por Tag (ej. #lucy-01)</option>
                    <option value="broker:lucid_trading">Solo Br├│ker: Lucy Trading / Lucid Trading</option>
                    <option value="broker:my_funded_futures">Solo Br├│ker: My Funded Futures (MFFU)</option>
                    <option value="broker:topstep">Solo Br├│ker: TopStep</option>
                    <option value="broker:apex">Solo Br├│ker: Apex Trader Funding</option>
                    <option value="broker:take_profit_trader">Solo Br├│ker: Take Profit Trader</option>
                    <option value="personal">Cuenta Personal</option>
                    <option value="all">Todas las Operaciones (Global)</option>
                  </select>
                </div>

                {editingAccount.filterMode === "tag" && (
                  <div className="sm:col-span-2">
                    <label className="text-[11px] text-blue-accent font-bold block mb-1">
                      Tag Individual en el Journal (sin #, ej. lucy-01 o mffu-02)
                    </label>
                    <input
                      type="text"
                      placeholder="ej. lucy-01"
                      value={editingAccount.tagFilter || ""}
                      onChange={e => setEditingAccount({ ...editingAccount, tagFilter: e.target.value })}
                      className="w-full rounded-lg bg-bg-section border border-blue-accent/40 px-3 py-2 text-text-primary focus:outline-none focus:border-blue-accent"
                    />
                  </div>
                )}

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
                  <label className="text-[11px] text-text-secondary font-medium block mb-1">P├⌐rdida M├íx. Diaria / DLL ($ ΓÇö 0 = Sin l├¡mite)</label>
                  <input
                    type="number"
                    value={editingAccount.maxDailyLoss}
                    onChange={e => setEditingAccount({ ...editingAccount, maxDailyLoss: Number(e.target.value) || 0 })}
                    className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2 text-text-primary tabular-nums focus:outline-none focus:border-green-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-text-secondary font-medium block mb-1">Drawdown M├íximo EOD ($ USD)</label>
                  <input
                    type="number"
                    value={editingAccount.maxTotalLoss}
                    onChange={e => setEditingAccount({ ...editingAccount, maxTotalLoss: Number(e.target.value) || 0 })}
                    className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2 text-text-primary tabular-nums focus:outline-none focus:border-green-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-text-secondary font-medium block mb-1">D├¡as M├¡nimos de Operativa</label>
                  <input
                    type="number"
                    value={editingAccount.minTradingDays}
                    onChange={e => setEditingAccount({ ...editingAccount, minTradingDays: Number(e.target.value) || 0 })}
                    className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2 text-text-primary tabular-nums focus:outline-none focus:border-green-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-text-secondary font-medium block mb-1">Regla de Consistencia (% ΓÇö 0 = Libre)</label>
                  <input
                    type="number"
                    value={editingAccount.consistencyRulePct}
                    onChange={e => setEditingAccount({ ...editingAccount, consistencyRulePct: Number(e.target.value) || 0 })}
                    className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2 text-text-primary tabular-nums focus:outline-none focus:border-green-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-text-secondary font-medium block mb-1">L├¡mite de Contratos Micros</label>
                  <input
                    type="number"
                    value={editingAccount.maxMicros ?? 50}
                    onChange={e => setEditingAccount({ ...editingAccount, maxMicros: Number(e.target.value) || 0 })}
                    className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2 text-text-primary tabular-nums focus:outline-none focus:border-green-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-text-secondary font-medium block mb-1">Profit Split para el Trader (% ΓÇö ej. 90%)</label>
                  <input
                    type="number"
                    value={editingAccount.payoutSplitPct ?? 90}
                    onChange={e => setEditingAccount({ ...editingAccount, payoutSplitPct: Number(e.target.value) || 90 })}
                    className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2 text-text-primary tabular-nums focus:outline-none focus:border-green-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-5 pt-4 border-t border-border-card">
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
                  {batchCount > 1 && !accounts.some(a => a.id === editingAccount.id)
                    ? `Crear ${batchCount} Cuentas (${editingAccount.firm})`
                    : "Guardar Cuenta"}
                </button>
              </div>
            </div>
          </div>
        )}
    </>
  );

  if (!isHydrated || !accountsLoaded) return null;

  if (!active) {
    const FIRM_CHOICES: { cat: PresetCategory; name: string; desc: string }[] = [
      { cat: "MFFU", name: "My Funded Futures", desc: "Starter · Expert · Pro ($50K–$150K)" },
      { cat: "Lucy", name: "Lucy Trading (Lucid)", desc: "LucidPro · LucidFlex ($50K–$100K)" },
      { cat: "TopStep", name: "TopStep", desc: "Combine / XFA ($50K–$150K)" },
      { cat: "Otras", name: "Apex · Take Profit Trader · FTMO", desc: "Otras empresas de fondeo" },
    ];
    return (
      <AppShell
        title="Cuentas de Trading & Prop Firms"
        subtitle="Selecciona tus empresas de fondeo para comenzar a monitorear tus cuentas"
      >
        <div className="max-w-[900px] mx-auto w-full mt-6 flex flex-col gap-5">
          <div className="rounded-card border border-border-card bg-bg-card p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-green-primary/15 border border-green-primary/30 text-green-primary">
              <Briefcase className="h-6 w-6" />
            </div>
            <h2 className="text-[18px] font-extrabold text-text-primary">Aún no has agregado cuentas de fondeo</h2>
            <p className="text-[12.5px] text-text-muted mt-1.5 max-w-lg mx-auto">
              Elige la empresa con la que operas, escoge el plan (y cuántas cuentas iguales tienes) y aparecerán aquí con sus reglas y estadísticas conectadas a tu Journal.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FIRM_CHOICES.map(f => (
              <button
                key={f.cat}
                type="button"
                onClick={() => openNewForFirm(f.cat)}
                className="flex items-start justify-between gap-3 rounded-xl border border-border-card bg-bg-card p-4 text-left hover:border-green-primary/50 hover:bg-green-primary/5 transition-all"
              >
                <div>
                  <p className="text-[14px] font-extrabold text-text-primary">{f.name}</p>
                  <p className="text-[11.5px] text-text-muted mt-0.5">{f.desc}</p>
                </div>
                <span className="flex items-center gap-1 rounded-lg bg-green-primary px-2.5 py-1.5 text-[11px] font-bold text-bg-main shrink-0">
                  <Plus className="h-3.5 w-3.5" /> Agregar
                </span>
              </button>
            ))}
          </div>
        </div>
        {renderAccountModal()}
      </AppShell>
    );
  }

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
    splitPct,
    netPayoutAfterSplit,
  } = active;

  const remainingProfit = acc.profitTarget > 0 ? Math.max(0, acc.profitTarget - currentProfit) : 0;
  const targetPct = acc.profitTarget > 0 ? (Math.max(0, currentProfit) / acc.profitTarget) * 100 : 0;
  const dllPct = acc.maxDailyLoss > 0 ? (dailyLossToday / acc.maxDailyLoss) * 100 : 0;
  const ddPct = acc.maxTotalLoss > 0 ? (stats.maxDrawdown / acc.maxTotalLoss) * 100 : 0;
  const contractsPct = acc.maxMicros && acc.maxMicros > 0 ? (maxContractsUsed / acc.maxMicros) * 100 : 0;
  const daysPct = acc.minTradingDays > 0 ? (daysTraded / acc.minTradingDays) * 100 : 100;
  const consistencyBarPct = consistencyDollarLimit > 0 ? (bestDayPnl / consistencyDollarLimit) * 100 : 0;

  const allRulesOk = !dailyLossBreached && !drawdownBreached && consistencyOk && contractsOk;

  return (
    <AppShell
      title="Cuentas de Trading & Prop Firms"
      subtitle="Centro de Control Multi-Cuenta: Multiplicador Copy-Trading, Candado EOD y Simulador de Retiros (MFFU · Lucy · TopStep)"
    >
      <div className="flex flex-col gap-5 w-full max-w-[1800px] mx-auto">

        {/* ── BLOQUE 0: BARRA EJECUTIVA DE IMPERIO MULTI-CUENTA (CAPITAL TOTAL + MULTIPLICADOR + PAYOUT 90%) ── */}
        <div className="rounded-card border border-green-primary/30 bg-gradient-to-r from-bg-card via-green-primary/[0.05] to-bg-card p-4 shadow-green-glow/20">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-border-card/60">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-primary/15 border border-green-primary/40 text-green-primary">
                <Wallet className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-[13.5px] font-extrabold text-text-primary flex items-center gap-2">
                  Consolidado de Portafolio Multi-Cuenta (Efecto Multiplicador Copy-Trading)
                  <span className="rounded-full bg-green-primary/15 border border-green-primary/30 px-2 py-0.5 text-[10px] font-bold text-green-primary">
                    {empireSummary.propCount} Cuentas Fondeadas Activas
                  </span>
                </h2>
                <p className="text-[11px] text-text-muted">
                  Suma automática del poder nominal, P&amp;L replicado y retiro neto estimado (Split 90/10) en tus cuentas Prop Firm
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleClearAllAccounts}
                className="flex items-center gap-1 rounded-lg border border-border-card bg-bg-section px-2.5 py-1.5 text-[11px] font-semibold text-text-muted hover:text-red-loss transition-colors"
                title="Quitar todas las cuentas configuradas (no borra trades)"
              >
                <RotateCcw className="h-3 w-3" />
                Vaciar cuentas
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border-card/80 bg-bg-section/50 px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider font-bold text-text-muted">Poder Nominal Bajo Gestión (AUM)</p>
              <p className="text-[20px] font-black tabular-nums text-text-primary mt-0.5">
                ${empireSummary.totalAum.toLocaleString()}
              </p>
              <p className="text-[10.5px] text-text-muted mt-0.5">
                En {empireSummary.propCount} cuentas de fondeo ({firmGroups.map(g => `${g.count} ${g.firm.split(" ")[0]}`).join(" · ")})
              </p>
            </div>

            <div className="rounded-xl border border-border-card/80 bg-bg-section/50 px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider font-bold text-text-muted">P&amp;L Bruto Multiplicado (Flota)</p>
              <p className={`text-[20px] font-black tabular-nums mt-0.5 ${empireSummary.totalMultipliedProfit >= 0 ? "text-green-primary" : "text-red-loss"}`}>
                {empireSummary.totalMultipliedProfit >= 0 ? "+" : "-"}$
                {Math.abs(empireSummary.totalMultipliedProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[10.5px] text-text-muted mt-0.5">
                Resultado acumulado replicando tu operativa
              </p>
            </div>

            <div className="rounded-xl border border-green-primary/30 bg-green-primary/[0.07] px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider font-bold text-green-primary">Retiro Neto Estimado (90% Split)</p>
              <p className="text-[20px] font-black tabular-nums text-green-primary mt-0.5">
                +${empireSummary.totalNetPayout90.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[10.5px] text-text-secondary mt-0.5">
                Libre al banco tras el 10% de comisión de Prop Firm
              </p>
            </div>

            <div className="rounded-xl border border-border-card/80 bg-bg-section/50 px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider font-bold text-text-muted">Blindaje EOD &amp; Colchón Total</p>
              <p className="text-[20px] font-black tabular-nums text-blue-accent mt-0.5">
                🔒 {empireSummary.lockedCount}/{empireSummary.propCount} Blindadas
              </p>
              <p className="text-[10.5px] text-text-muted mt-0.5">
                Colchón combinado: +${empireSummary.totalDrawdownBuffer.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* ── BLOQUE 1: Carpetas por Empresa + Conmutador Vista Tarjetas / Vista Matriz Multi-Cuenta ── */}
        <div className="rounded-card border border-border-card bg-bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 mb-3.5 border-b border-border-card/60">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setFirmFilter("ALL")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all border ${
                  firmFilter === "ALL"
                    ? "bg-green-primary text-bg-main border-green-primary shadow-sm"
                    : "bg-bg-section text-text-secondary border-border-card hover:text-text-primary"
                }`}
              >
                <FolderKanban className="h-3.5 w-3.5" />
                Todas las Cuentas ({computedAccounts.length})
              </button>

              {firmGroups.map(g => {
                const isFirmSel = firmFilter === g.firm;
                return (
                  <button
                    key={g.firm}
                    onClick={() => setFirmFilter(g.firm)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all border ${
                      isFirmSel
                        ? "bg-green-primary/15 text-green-primary border-green-primary/50"
                        : "bg-bg-section text-text-secondary border-border-card hover:text-text-primary"
                    }`}
                  >
                    <span>{g.firm}</span>
                    <span className="rounded-full bg-bg-card px-1.5 py-0.2 text-[9.5px] font-extrabold text-text-primary">
                      {g.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-lg bg-bg-section p-0.5 border border-border-card">
                <button
                  onClick={() => setViewMode("cards")}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
                    viewMode === "cards"
                      ? "bg-bg-card text-green-primary shadow-sm border border-border-card"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Tarjetas
                </button>
                <button
                  onClick={() => setViewMode("matrix")}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
                    viewMode === "matrix"
                      ? "bg-bg-card text-green-primary shadow-sm border border-border-card"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  <Table2 className="h-3.5 w-3.5" />
                  Matriz ({visibleAccounts.length})
                </button>
              </div>

              <button
                onClick={() => openEditModal(acc)}
                className="flex items-center gap-1.5 rounded-btn border border-border-card bg-bg-section px-3 py-1.5 text-[11.5px] font-semibold text-text-secondary hover:text-text-primary hover:border-blue-accent/40 transition-colors"
              >
                <Settings2 className="h-3.5 w-3.5 text-blue-accent" />
                Editar Activa
              </button>
              <button
                onClick={openNewAccountModal}
                className="flex items-center gap-1.5 rounded-btn bg-green-primary px-3.5 py-1.5 text-[11.5px] font-bold text-bg-main shadow-green-glow hover:bg-green-primary/90 transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar / Lote (1-20)
              </button>
            </div>
          </div>

          {/* ── MODO A: Cuadrícula Simétrica de Tarjetas ── */}
          {viewMode === "cards" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {visibleAccounts.map(item => {
                const isSel = item.config.id === active.config.id;
                const goalPct = item.config.profitTarget > 0
                  ? Math.min(100, Math.max(0, (item.currentProfit / item.config.profitTarget) * 100))
                  : 100;
                return (
                  <div
                    key={item.config.id}
                    onClick={() => setSelectedId(item.config.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => (e.key === "Enter" || e.key === " ") && setSelectedId(item.config.id)}
                    className={`group flex flex-col justify-between rounded-xl border p-3.5 transition-all text-left cursor-pointer h-full ${
                      isSel
                        ? "bg-green-primary/10 border-green-primary/50 shadow-green-glow"
                        : "border-border-card bg-bg-section/40 hover:bg-bg-section/80 hover:border-border-card"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between w-full gap-1.5 mb-1">
                        <span className="text-[9.5px] font-bold uppercase tracking-wider text-text-muted truncate">
                          {item.config.firm}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleDuplicateAccount(item.config);
                            }}
                            title="Clonar cuenta (+1)"
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 text-text-muted hover:text-green-primary transition-all"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                          <span className="rounded-full bg-bg-card border border-border-card px-1.5 py-0.5 text-[9px] font-semibold text-text-muted">
                            {item.stats.closedTrades} ops
                          </span>
                        </div>
                      </div>
                      <p className={`text-[13px] font-extrabold truncate ${isSel ? "text-green-primary" : "text-text-primary"}`}>
                        {item.config.name}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-border-card/40">
                      <div className="flex items-baseline justify-between gap-1 text-[11.5px] tabular-nums mb-1.5">
                        <span className="text-text-primary font-bold">
                          ${item.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                        <span className={`font-extrabold ${item.currentProfit >= 0 ? "text-green-primary" : "text-red-loss"}`}>
                          {item.currentProfit >= 0 ? "+" : "-"}${Math.abs(item.currentProfit).toFixed(2)}
                        </span>
                      </div>
                      <ProgressBar
                        value={goalPct}
                        max={100}
                        height="h-1.5"
                        color={isSel ? "bg-green-primary" : "bg-blue-accent/70"}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── MODO B: Tabla Matriz Institucional (Ideal para 5 Lucy + 3 TopStep + 5 MFFU = 13+ cuentas) ── */
            <div className="overflow-x-auto rounded-xl border border-border-card bg-bg-section/20">
              <table className="w-full text-left border-collapse text-[11.5px]">
                <thead>
                  <tr className="border-b border-border-card bg-bg-section/70 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    <th className="py-2.5 px-3">Cuenta / ID</th>
                    <th className="py-2.5 px-3">Prop Firm</th>
                    <th className="py-2.5 px-3 text-right">Balance Actual</th>
                    <th className="py-2.5 px-3 text-right">Net P&amp;L</th>
                    <th className="py-2.5 px-3 text-right">Payout (90%)</th>
                    <th className="py-2.5 px-3 min-w-[140px]">Meta Target</th>
                    <th className="py-2.5 px-3 text-right">Piso EOD</th>
                    <th className="py-2.5 px-3 text-right">Colchón DD</th>
                    <th className="py-2.5 px-3 text-center">Días</th>
                    <th className="py-2.5 px-3 text-center">Estado</th>
                    <th className="py-2.5 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-card/40">
                  {visibleAccounts.map(item => {
                    const isSel = item.config.id === active.config.id;
                    const tPct = item.config.profitTarget > 0
                      ? Math.min(100, Math.max(0, (item.currentProfit / item.config.profitTarget) * 100))
                      : 100;
                    const isOk = !item.dailyLossBreached && !item.drawdownBreached && item.consistencyOk;
                    return (
                      <tr
                        key={item.config.id}
                        onClick={() => setSelectedId(item.config.id)}
                        className={`cursor-pointer transition-colors ${
                          isSel ? "bg-green-primary/10" : "hover:bg-bg-section/60"
                        }`}
                      >
                        <td className="py-2.5 px-3 font-extrabold text-text-primary whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${isSel ? "bg-green-primary" : "bg-border-card"}`} />
                            <span className={isSel ? "text-green-primary" : "text-text-primary"}>{item.config.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-text-secondary font-medium whitespace-nowrap">
                          {item.config.firm}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold tabular-nums text-text-primary whitespace-nowrap">
                          ${item.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className={`py-2.5 px-3 text-right font-extrabold tabular-nums whitespace-nowrap ${
                          item.currentProfit >= 0 ? "text-green-primary" : "text-red-loss"
                        }`}>
                          {item.currentProfit >= 0 ? "+" : "-"}${Math.abs(item.currentProfit).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold tabular-nums text-green-primary whitespace-nowrap">
                          +${item.netPayoutAfterSplit.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <ProgressBar
                                value={tPct}
                                max={100}
                                height="h-1.5"
                                color={tPct >= 100 ? "bg-green-primary" : "bg-blue-accent"}
                              />
                            </div>
                            <span className="text-[10.5px] font-bold tabular-nums text-text-secondary w-10 text-right">
                              {tPct.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap">
                          <span className={item.isTrailingLocked ? "text-green-primary font-bold" : "text-text-secondary"}>
                            {item.isTrailingLocked ? "🔒 " : ""}${item.eodLiquidationFloor.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold tabular-nums text-green-primary whitespace-nowrap">
                          +${item.liveBufferAboveFloor.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-center tabular-nums text-text-secondary">
                          {item.daysTraded}{item.config.minTradingDays > 0 ? `/${item.config.minTradingDays}` : ""}d
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {item.targetReached && isOk ? (
                            <span className="rounded-full bg-green-primary/15 border border-green-primary/30 px-2 py-0.5 text-[9.5px] font-bold text-green-primary">
                              Meta Lograda
                            </span>
                          ) : isOk ? (
                            <span className="rounded-full bg-green-primary/15 border border-green-primary/30 px-2 py-0.5 text-[9.5px] font-bold text-green-primary">
                              En Regla
                            </span>
                          ) : (
                            <span className="rounded-full bg-yellow-warn/15 border border-yellow-warn/30 px-2 py-0.5 text-[9.5px] font-bold text-yellow-warn">
                              Revisar
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleDuplicateAccount(item.config)}
                              title="Clonar esta cuenta (+1)"
                              className="p-1 rounded hover:bg-white/10 text-text-muted hover:text-green-primary transition-colors"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(item.config)}
                              title="Editar reglas"
                              className="p-1 rounded hover:bg-white/10 text-text-muted hover:text-blue-accent transition-colors"
                            >
                              <Settings2 className="h-3.5 w-3.5" />
                            </button>
                            {accounts.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteAccount(item.config.id)}
                                title="Eliminar cuenta"
                                className="p-1 rounded hover:bg-white/10 text-text-muted hover:text-red-loss transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── BLOQUE 2: Cabecera Resumen de la Cuenta Seleccionada (6 KPIs en fila limpia) ── */}
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
              sub: `Retiro (${splitPct}%): +$${netPayoutAfterSplit.toFixed(2)}`,
              color: currentProfit >= 0 ? "text-green-primary" : "text-red-loss",
            },
            {
              label: "Piso Liquidación EOD",
              value: acc.maxTotalLoss > 0 ? `$${eodLiquidationFloor.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "N/A",
              sub: isTrailingLocked ? "🔒 Candado Fijo en Inicial" : `Colchón: +$${liveBufferAboveFloor.toFixed(2)}`,
              color: isTrailingLocked ? "text-green-primary" : "text-blue-accent",
            },
            {
              label: "Max Drawdown Real",
              value: `-$${stats.maxDrawdown.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              sub: acc.maxTotalLoss > 0 ? `Límite EOD: -$${acc.maxTotalLoss.toLocaleString()}` : "Sin límite fijo",
              color: drawdownBreached ? "text-red-loss" : "text-yellow-warn",
            },
            {
              label: "Días Operados",
              value: `${daysTraded} ${acc.minTradingDays > 0 ? `/ ${acc.minTradingDays}` : ""} días`,
              sub: minDaysMet ? "✓ Mínimo cumplido" : `Faltan ${acc.minTradingDays - daysTraded} día(s)`,
              color: minDaysMet ? "text-green-primary" : "text-blue-accent",
            },
            {
              label: "Consistencia Mejor Día",
              value: currentProfit > 0 ? `${consistencyPctObserved}%` : "—",
              sub: `Mejor día: +$${bestDayPnl.toFixed(2)}`,
              color: consistencyOk ? "text-green-primary" : "text-yellow-warn",
            },
          ].map(k => (
            <div key={k.label} className="rounded-card border border-border-card bg-bg-card px-4 py-3.5">
              <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold mb-1">{k.label}</p>
              <p className={`text-[17px] font-black tabular-nums leading-tight ${k.color}`}>{k.value}</p>
              <p className="text-[10px] text-text-muted mt-1 truncate">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* ── BLOQUE 3: Panel Principal en Grid 2x3 de Reglas + Columna Derecha de Conciliación ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">

          {/* Izquierda: Las 6 Reglas en Cuadrícula 2x3 ordenada */}
          <div className="rounded-card border border-border-card bg-bg-card p-5 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-card/60 pb-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-green-primary/15 border border-green-primary/30 px-2 py-0.5 text-[10px] font-bold uppercase text-green-primary">
                    {acc.firm}
                  </span>
                  <span className="text-[11px] font-semibold text-text-muted">{acc.accountType}</span>
                  {acc.filterMode === "tag" && acc.tagFilter && (
                    <span className="rounded-md bg-blue-accent/15 border border-blue-accent/30 px-2 py-0.5 text-[10px] font-bold text-blue-accent">
                      Tag: #{acc.tagFilter.replace(/^#/, "")}
                    </span>
                  )}
                </div>
                <h2 className="text-[17px] font-extrabold text-text-primary mt-1">{acc.name}</h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDuplicateAccount(acc)}
                  className="flex items-center gap-1 rounded-lg border border-border-card bg-bg-section px-2.5 py-1 text-[11px] font-semibold text-text-secondary hover:text-green-primary hover:border-green-primary/40 transition-colors"
                  title="Clonar esta cuenta con las mismas reglas"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Duplicar (+1)
                </button>
                {targetReached && allRulesOk ? (
                  <span className="flex items-center gap-1.5 rounded-full bg-green-primary/15 border border-green-primary/30 px-3 py-1 text-[11px] font-bold text-green-primary">
                    <Award className="h-3.5 w-3.5" /> Meta Alcanzada &amp; En Regla
                  </span>
                ) : allRulesOk ? (
                  <span className="flex items-center gap-1.5 rounded-full bg-green-primary/15 border border-green-primary/30 px-3 py-1 text-[11px] font-bold text-green-primary">
                    <CheckCircle className="h-3.5 w-3.5" /> Todas las Reglas en Orden
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 rounded-full bg-yellow-warn/15 border border-yellow-warn/30 px-3 py-1 text-[11px] font-bold text-yellow-warn">
                    <AlertTriangle className="h-3.5 w-3.5" /> Revisar Consistencia / Regla
                  </span>
                )}
                {accounts.length > 1 && (
                  <button
                    onClick={() => handleDeleteAccount(acc.id)}
                    title="Eliminar esta cuenta"
                    className="p-1.5 rounded-lg border border-border-card text-text-muted hover:text-red-loss hover:border-red-loss/40 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <RuleCard
                icon={Target}
                title="1. Objetivo de Ganancia (Profit Target)"
                badgeText={targetReached ? "Logrado" : `${targetPct.toFixed(1)}%`}
                badgeStatus={targetReached ? "ok" : "info"}
                currentLabel={`$${Math.max(0, currentProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                limitLabel={`$${acc.profitTarget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                pctUsed={targetPct}
                isGoal={true}
                footerLeft={remainingProfit > 0 ? `Faltan $${remainingProfit.toFixed(2)} para pasar` : `Superado por +$${Math.max(0, currentProfit - acc.profitTarget).toFixed(2)}`}
                footerRight={`${stats.closedTrades} trades`}
                disabledText={acc.profitTarget <= 0 ? "Sin objetivo fijo de ganancia" : undefined}
              />

              <RuleCard
                icon={ShieldCheck}
                title="2. Drawdown Máximo EOD (Trailing)"
                badgeText={drawdownBreached ? "Excedido" : isTrailingLocked ? "🔒 Candado Inicial" : `${ddPct.toFixed(1)}% usado`}
                badgeStatus={drawdownBreached ? "danger" : ddPct >= 70 ? "warn" : "ok"}
                currentLabel={`$${stats.maxDrawdown.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                limitLabel={`$${acc.maxTotalLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                pctUsed={ddPct}
                warn={70}
                footerLeft={`Piso EOD: $${eodLiquidationFloor.toLocaleString()}`}
                footerRight={`Colchón: +$${liveBufferAboveFloor.toFixed(2)}`}
                disabledText={acc.maxTotalLoss <= 0 ? "Sin límite de Drawdown configurado" : undefined}
              />

              <RuleCard
                icon={Activity}
                title="3. Límite de Pérdida Diaria (DLL)"
                badgeText={acc.maxDailyLoss <= 0 ? "Libre (Sin DLL)" : dailyLossBreached ? "Excedido" : `${dllPct.toFixed(1)}% hoy`}
                badgeStatus={acc.maxDailyLoss <= 0 ? "ok" : dailyLossBreached ? "danger" : dllPct >= 60 ? "warn" : "ok"}
                currentLabel={`$${dailyLossToday.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                limitLabel={`$${acc.maxDailyLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                pctUsed={dllPct}
                warn={60}
                footerLeft={`Peor día histórico: -$${maxObservedDailyLoss.toFixed(2)}`}
                footerRight={`Hoy: ${todayPnl >= 0 ? "+" : "-"}$${Math.abs(todayPnl).toFixed(2)}`}
                disabledText={acc.maxDailyLoss <= 0 ? "Sin Límite de Pérdida Diaria (0 DLL)" : undefined}
              />

              <RuleCard
                icon={Scale}
                title={`4. Regla de Consistencia (${acc.consistencyRulePct > 0 ? `≤ ${acc.consistencyRulePct}%` : "Libre"})`}
                badgeText={acc.consistencyRulePct <= 0 ? "Libre (0%)" : consistencyOk ? "Cumplido" : `${consistencyPctObserved}% (> ${acc.consistencyRulePct}%)`}
                badgeStatus={acc.consistencyRulePct <= 0 ? "ok" : consistencyOk ? "ok" : "warn"}
                currentLabel={`+$${bestDayPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                limitLabel={`+$${consistencyDollarLimit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                pctUsed={consistencyBarPct}
                warn={85}
                footerLeft={
                  acc.consistencyRulePct <= 0
                    ? "Plan sin restricción de consistencia diaria"
                    : consistencyOk
                      ? `Mejor día equivale al ${consistencyPctObserved}% del profit`
                      : `Meta para diluir: +$${(bestDayPnl / (acc.consistencyRulePct / 100)).toFixed(2)}`
                }
                footerRight={acc.consistencyRulePct > 0 ? `${consistencyPctObserved}% / ${acc.consistencyRulePct}%` : undefined}
                disabledText={acc.consistencyRulePct <= 0 ? "Sin Regla de Consistencia (Plan Expert / Pro)" : undefined}
              />

              <RuleCard
                icon={Calendar}
                title="5. Días Mínimos Operados"
                badgeText={minDaysMet ? "Cumplido" : `Faltan ${acc.minTradingDays - daysTraded}d`}
                badgeStatus={minDaysMet ? "ok" : "info"}
                currentLabel={`${daysTraded} días`}
                limitLabel={`${acc.minTradingDays} días`}
                pctUsed={daysPct}
                isGoal={true}
                footerLeft={minDaysMet ? "Requisito de días mínimos completado" : `Opera ${acc.minTradingDays - daysTraded} sesión(es) más`}
                footerRight={`${stats.closedTrades} ops totales`}
                disabledText={acc.minTradingDays <= 0 ? "Sin mínimo de días requerido" : undefined}
              />

              <RuleCard
                icon={Layers}
                title="6. Tamaño Máximo de Posición"
                badgeText={contractsOk ? "En Regla" : "Excedido"}
                badgeStatus={contractsOk ? "ok" : "danger"}
                currentLabel={`${maxContractsUsed} Micros`}
                limitLabel={`${acc.maxMicros || 0} Micros (${Math.floor((acc.maxMicros || 0) / 10)} Minis)`}
                pctUsed={contractsPct}
                warn={80}
                footerLeft={`Máximo lote abierto en un trade: ${maxContractsUsed}`}
                footerRight={acc.maxMicros ? `Libre: ${Math.max(0, acc.maxMicros - maxContractsUsed)}` : undefined}
                disabledText={!acc.maxMicros || acc.maxMicros <= 0 ? "Sin límite de contratos en cuenta personal" : undefined}
              />
            </div>
          </div>

          {/* Derecha: Conciliación Contable & Estado del Candado EOD */}
          <div className="flex flex-col gap-4">
            <div className="rounded-card border border-border-card bg-bg-card p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-3.5 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-primary" /> Conciliación Contable &amp; Retiro
              </p>
              <div className="flex flex-col gap-2">
                {[
                  { label: "Capital Inicial", value: `$${acc.initialBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: "text-text-secondary" },
                  { label: "Gross P&L Realizado", value: `${stats.totalGross >= 0 ? "+" : "-"}$${Math.abs(stats.totalGross).toFixed(2)}`, color: stats.totalGross >= 0 ? "text-green-primary" : "text-red-loss" },
                  { label: "Comisiones Totales", value: `-$${stats.totalCommissions.toFixed(2)}`, color: "text-yellow-warn" },
                  { label: "Net P&L Realizado", value: `${currentProfit >= 0 ? "+" : "-"}$${Math.abs(currentProfit).toFixed(2)}`, color: currentProfit >= 0 ? "text-green-primary" : "text-red-loss" },
                  { label: `Retiro Neto (${splitPct}% Split)`, value: `+$${netPayoutAfterSplit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: "text-green-primary" },
                  { label: "Balance Actual", value: `$${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: "text-text-primary" },
                  { label: "High-Water Mark (EOD)", value: `$${eodHighWaterMark.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: "text-blue-accent" },
                  { label: "Piso de Liquidación EOD", value: acc.maxTotalLoss > 0 ? `$${eodLiquidationFloor.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "N/A", color: isTrailingLocked ? "text-green-primary" : "text-red-loss" },
                  { label: "Colchón Real Disponible", value: acc.maxTotalLoss > 0 ? `+$${liveBufferAboveFloor.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "N/A", color: "text-green-primary" },
                ].map(r => (
                  <div key={r.label} className="flex justify-between items-center border-b border-border-card/30 pb-1.5">
                    <span className="text-[11px] text-text-muted">{r.label}</span>
                    <span className={`text-[12px] font-bold tabular-nums ${r.color}`}>{r.value}</span>
                  </div>
                ))}
              </div>

              {isTrailingLocked && (
                <div className="mt-3.5 rounded-lg border border-green-primary/30 bg-green-primary/10 px-3 py-2.5 text-[11px] text-green-primary flex items-start gap-2">
                  <Lock className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    <strong>Candado EOD Activado:</strong> El piso de liquidación ya quedó congelado en <strong>${acc.initialBalance.toLocaleString()}</strong> y no sube más.
                  </span>
                </div>
              )}
            </div>

            <div className="rounded-card border border-border-card bg-bg-card p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-accent" /> Checklist Rápido de Pase
              </p>
              <div className="flex flex-col gap-2">
                {[
                  { ok: !dailyLossBreached, text: acc.maxDailyLoss > 0 ? `Daily Loss Limit ≤ $${acc.maxDailyLoss.toLocaleString()}` : "Sin límite de pérdida diaria (DLL Libre)" },
                  { ok: !drawdownBreached, text: acc.maxTotalLoss > 0 ? `Sobre Piso EOD ($${eodLiquidationFloor.toLocaleString()})` : "Sin límite de drawdown" },
                  { ok: contractsOk, text: acc.maxMicros ? `Lotes dentro de límite (${maxContractsUsed}/${acc.maxMicros} Micros)` : "Tamaño de posición libre" },
                  { ok: minDaysMet, text: acc.minTradingDays > 0 ? `Días mínimos (${daysTraded}/${acc.minTradingDays} días)` : "Sin mínimo de días" },
                  { ok: consistencyOk, text: acc.consistencyRulePct > 0 ? `Consistencia ≤ ${acc.consistencyRulePct}% (${consistencyPctObserved}%)` : "Sin regla de consistencia (0%)" },
                  { ok: targetReached || acc.profitTarget === 0, text: acc.profitTarget > 0 ? `Meta Profit ($${currentProfit.toFixed(0)} / $${acc.profitTarget.toLocaleString()})` : "Sin meta fija" },
                ].map((c, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-[11.5px]">
                    {c.ok ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-primary shrink-0" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 text-yellow-warn shrink-0" />
                    )}
                    <span className={c.ok ? "text-text-secondary" : "text-yellow-warn font-semibold"}>{c.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {renderAccountModal()}
      </div>
    </AppShell>
  );
}
