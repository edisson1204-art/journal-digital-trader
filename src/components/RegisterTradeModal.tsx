"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Plus, Trash2, ChevronDown, ChevronRight,
  AlertTriangle, Info, Upload, ImageIcon, XCircle
} from "lucide-react";
import {
  type TradeRecord, type AssetClass, type TradeSide, type TradingSession,
  type SetupGrade, type TradeEntry_Scale, type TradeExit_Partial,
  BROKER_PRESETS, ASSET_CLASS_CONFIG, STRATEGIES, EMOTIONS, MISTAKE_TYPES,
  TAGS_SUGGESTED, calculateTrade,
} from "@/lib/tradeTypes";

/* ─── Prevent browser auto-translate from mangling trading terms ─── */
// We use translate="no" on the modal container and keep key terms in English
// which is the industry standard (traders worldwide use Stop Loss, Take Profit, etc.)

/* ─── Tiny field components ─── */
function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold text-text-secondary mb-1.5" translate="no">{children}</p>;
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-1 text-[10px] text-text-muted mt-1">
      <Info className="h-3 w-3 mt-0.5 flex-shrink-0 text-blue-accent" />
      <span translate="no">{children}</span>
    </p>
  );
}

function ErrMsg({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="text-[10px] text-red-loss mt-1 flex items-center gap-1">
      <AlertTriangle className="h-3 w-3" />{msg}
    </p>
  );
}

function NumInput({ value, onChange, placeholder, step = "any", error, suffix, min }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; step?: string; error?: boolean; suffix?: string; min?: string;
}) {
  return (
    <div className="relative">
      <input
        type="number" value={value} step={step} min={min} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        inputMode="decimal"
        className={`w-full rounded-lg bg-bg-section border px-3 py-2.5 text-[13px] text-text-primary placeholder:text-text-muted tabular-nums focus:outline-none transition-colors ${
          error ? "border-red-loss/60 focus:border-red-loss" : "border-border-card focus:border-green-primary"
        } ${suffix ? "pr-10" : ""}`}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-text-muted pointer-events-none" translate="no">
          {suffix}
        </span>
      )}
    </div>
  );
}

function Sel({ value, onChange, options }: {
  value: string; onChange: (v: string) => void;
  options: (string | { value: string; label: string })[];
}) {
  return (
    <div className="relative">
      <select
        value={value} onChange={e => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg bg-bg-section border border-border-card px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-green-primary transition-colors pr-7"
      >
        {options.map(o => {
          const v = typeof o === "string" ? o : o.value;
          const l = typeof o === "string" ? o : o.label;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
    </div>
  );
}

function Section({ title, children, collapsible = false }: {
  title: string; children: React.ReactNode; collapsible?: boolean;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-border-card/50 rounded-xl overflow-hidden shrink-0">
      <button
        type="button"
        onClick={() => collapsible && setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-4 py-3 bg-bg-section/60 ${collapsible ? "cursor-pointer hover:bg-bg-section" : "cursor-default"}`}
      >
        <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider" translate="no">{title}</span>
        {collapsible && <ChevronRight className={`h-4 w-4 text-text-muted transition-transform ${open ? "rotate-90" : ""}`} />}
      </button>
      {open && <div className="p-4 flex flex-col gap-4">{children}</div>}
    </div>
  );
}

/* ─── Live P&L preview ─── */
function PnlPreview({
  entries, exits, side, sl, broker, customComm, assetClass, contracts
}: {
  entries: TradeEntry_Scale[]; exits: TradeExit_Partial[];
  side: TradeSide; sl: number; broker: string; customComm: number;
  assetClass: AssetClass; contracts: number;
}) {
  if (!entries.length || !entries[0].price) return null;

  const avgEntry = entries.reduce((s, e) => s + e.price * e.contracts, 0) /
                   (entries.reduce((s, e) => s + e.contracts, 0) || 1);
  const hasExit = exits.some(e => e.price > 0);
  const totalExitContracts = exits.reduce((s, e) => s + e.contracts, 0) || 1;
  const avgExit = hasExit
    ? exits.reduce((s, e) => s + e.price * e.contracts, 0) / totalExitContracts
    : undefined;

  const commPerSide = broker === "custom" ? customComm : BROKER_PRESETS[broker]?.perSide ?? 0;
  const assetCfg = ASSET_CLASS_CONFIG[assetClass];
  const calc = calculateTrade(side, avgEntry, avgExit, sl, contracts, commPerSide, assetCfg.pipValue);

  const slDist = Math.abs(avgEntry - sl);
  const tp1 = exits[0]?.price || 0;
  const tpDist = tp1 ? Math.abs(tp1 - avgEntry) : 0;
  const potentialRR = slDist > 0 && tpDist > 0 ? (tpDist / slDist).toFixed(2) : null;
  const potentialRisk = slDist * contracts * assetCfg.pipValue;
  const totalComm = contracts * 2 * commPerSide;

  return (
    <div className={`rounded-xl border p-4 shrink-0 ${
      calc.result === "Win" ? "border-green-primary/30 bg-green-primary/5" :
      calc.result === "Loss" ? "border-red-loss/30 bg-red-loss/5" :
      calc.result === "Open" ? "border-blue-accent/25 bg-blue-accent/5" :
      "border-yellow-warn/25 bg-yellow-warn/5"
    }`} translate="no">
      <p className="text-[9px] font-bold uppercase tracking-widest text-text-muted mb-3">Resumen en Tiempo Real</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <p className="text-[9px] text-text-muted mb-0.5">Risk:Reward Planificado</p>
          <p className={`text-[17px] font-extrabold ${potentialRR && parseFloat(potentialRR) >= 1.5 ? "text-green-primary" : "text-yellow-warn"}`}>
            {potentialRR ? `1:${potentialRR}` : "—"}
          </p>
        </div>
        <div>
          <p className="text-[9px] text-text-muted mb-0.5">Riesgo Máximo (+ comisión)</p>
          <p className="text-[17px] font-extrabold text-red-loss">
            {potentialRisk ? `-$${(potentialRisk + totalComm).toFixed(2)}` : "—"}
          </p>
        </div>
        <div>
          <p className="text-[9px] text-text-muted mb-0.5">{hasExit ? "Net P&L" : "Profit Máximo"}</p>
          <p className={`text-[17px] font-extrabold tabular-nums ${
            calc.netPnl !== undefined
              ? calc.netPnl > 0 ? "text-green-primary" : calc.netPnl < 0 ? "text-red-loss" : "text-yellow-warn"
              : "text-text-muted"
          }`}>
            {calc.netPnl !== undefined
              ? `${calc.netPnl >= 0 ? "+" : ""}$${Math.abs(calc.netPnl).toFixed(2)}`
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-[9px] text-text-muted mb-0.5">Comisión Total</p>
          <p className="text-[17px] font-extrabold text-yellow-warn">
            -${totalComm.toFixed(2)}
          </p>
        </div>
      </div>
      {calc.rMultiple !== undefined && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[10px] text-text-muted">R alcanzado:</span>
          <span className={`text-[13px] font-bold ${calc.rMultiple > 0 ? "text-green-primary" : "text-red-loss"}`}>
            {calc.rMultiple > 0 ? "+" : ""}{calc.rMultiple}R
          </span>
          <span className={`ml-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
            calc.result === "Win" ? "bg-green-primary/15 text-green-primary" :
            calc.result === "Loss" ? "bg-red-loss/15 text-red-loss" :
            calc.result === "Breakeven" ? "bg-yellow-warn/15 text-yellow-warn" :
            "bg-blue-accent/15 text-blue-accent"
          }`}>{calc.result}</span>
        </div>
      )}
    </div>
  );
}

/* ─── Chart Image Upload ─── */
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_SIZE_MB = 8;

function ChartImageUpload({
  value, onChange
}: {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const processFile = useCallback((file: File) => {
    setError(null);
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Formato no permitido. Solo PNG, JPG o WEBP.");
      return;
    }
    // Aumentamos el límite de tamaño inicial a 15MB, ya que lo vamos a comprimir agresivamente.
    if (file.size > 15 * 1024 * 1024) {
      setError(`Imagen demasiado grande. Máximo 15 MB antes de comprimir.`);
      return;
    }
    
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1080;
        let width = img.width;
        let height = img.height;

        // Calcular la proporción para no perder relación de aspecto
        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setError("Error interno al comprimir la imagen.");
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Compresión agresiva a WebP (0.75 de calidad preserva legibilidad gráfica pesando kilobytes)
        const compressedDataUrl = canvas.toDataURL("image/webp", 0.75);
        
        // Prevención final por seguridad de localStorage
        if (compressedDataUrl.length > 1.5 * 1024 * 1024) {
           setError("La imagen tiene demasiados detalles y excede el límite (1.5MB) tras comprimirse.");
           return;
        }
        
        onChange(compressedDataUrl);
      };
      img.onerror = () => setError("El archivo no es una imagen válida.");
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, [onChange]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        onChange={handleFileChange}
        aria-label="Subir imagen del gráfico"
      />

      {value ? (
        /* ── Preview ── */
        <div className="relative rounded-xl overflow-hidden border border-green-primary/30 bg-bg-section">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Chart screenshot"
            className="w-full object-contain max-h-64"
            style={{ background: "#0B1B2B" }}
          />
          <div className="absolute top-2 right-2 flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg bg-bg-card/90 border border-border-card px-2.5 py-1.5 text-[11px] text-text-secondary hover:text-text-primary transition-colors backdrop-blur-sm"
            >
              <Upload className="h-3 w-3" /> Cambiar
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="flex items-center justify-center rounded-lg bg-red-loss/20 border border-red-loss/30 p-1.5 text-red-loss hover:bg-red-loss/30 transition-colors"
              aria-label="Eliminar imagen"
            >
              <XCircle className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="absolute bottom-2 left-2">
            <span className="rounded bg-bg-card/80 border border-border-card/60 px-2 py-0.5 text-[9px] text-text-muted backdrop-blur-sm">
              Gráfico adjunto ✓
            </span>
          </div>
        </div>
      ) : (
        /* ── Drop zone ── */
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
            dragging
              ? "border-green-primary/60 bg-green-primary/5 scale-[1.01]"
              : "border-border-card hover:border-green-primary/40 hover:bg-bg-section/60"
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-bg-section border border-border-card">
            <ImageIcon className="h-6 w-6 text-text-muted" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-text-secondary">
              {dragging ? "Suelta el archivo aquí…" : "Arrastra tu screenshot aquí"}
            </p>
            <p className="text-[11px] text-text-muted mt-1">
              o <span className="text-green-primary underline">selecciona desde tu equipo</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {["PNG","JPG","WEBP"].map(f => (
              <span key={f} className="rounded border border-border-card bg-bg-section px-2 py-0.5 text-[9px] font-bold text-text-muted">{f}</span>
            ))}
            <span className="text-[9px] text-text-muted">· Máx. {MAX_SIZE_MB} MB · No recarga</span>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-loss/30 bg-red-loss/10 px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 text-red-loss flex-shrink-0" />
          <p className="text-[11px] text-red-loss">{error}</p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN MODAL
═══════════════════════════════════════════════════ */
interface RegisterTradeModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (trade: TradeRecord) => void;
  initialData?: TradeRecord; // ← NUEVO: modo edición
}

export function RegisterTradeModal({ open, onClose, onSave, initialData }: RegisterTradeModalProps) {
  const isEditing = !!initialData;
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  /* ── Step 1 ── */
  const [assetClass, setAssetClass]         = useState<AssetClass>("Futures");
  const [instrument, setInstrument]         = useState("NQ");
  const [customInstrument, setCustomInstr]  = useState("");
  const [tickerSymbol, setTicker]           = useState("");
  const [side, setSide]                     = useState<TradeSide>("Buy");
  const [dateOpen, setDateOpen]             = useState(new Date().toISOString().slice(0, 10));
  const [timeOpen, setTimeOpen]             = useState(new Date().toTimeString().slice(0, 5));
  const [dateClose, setDateClose]           = useState("");
  const [timeClose, setTimeClose]           = useState("");
  const [session, setSession]               = useState<TradingSession>("NYSE Open (9:30-11)");
  const [isFunded, setIsFunded]             = useState(false);

  /* ── Step 2 ── */
  const [entries, setEntries] = useState<TradeEntry_Scale[]>([{ price: 0, contracts: 1, time: "" }]);
  const [stopLoss, setStopLoss]             = useState("");
  const [initialSL, setInitialSL]           = useState("");
  const [takeProfit1, setTP1]               = useState("");
  const [takeProfit2, setTP2]               = useState("");
  const [takeProfit3, setTP3]               = useState("");
  const [broker, setBroker]                 = useState("ninjatrader_lease");
  const [customCommission, setCustomComm]   = useState("0");
  const [strategy, setStrategy]             = useState("Breakout");
  const [setup, setSetup]                   = useState("");
  const [setupGrade, setSetupGrade]         = useState<SetupGrade>("A");
  const [planFollowed, setPlanFollowed]     = useState(true);
  const [confluenceCount, setConfluence]    = useState("3");
  const [mae, setMae]                       = useState("");
  const [mfe, setMfe]                       = useState("");

  /* ── Step 3 ── */
  const [exits, setExits] = useState<TradeExit_Partial[]>([{ price: 0, contracts: 1, time: "" }]);
  const [isBreakeven, setIsBreakeven]       = useState(false);
  const [chartImage, setChartImage]         = useState<string | null>(null);

  /* ── Step 4 ── */
  const [emotionEntry, setEmotionEntry]     = useState("Confident");
  const [emotionExit, setEmotionExit]       = useState("Neutral");
  const [mistakeType, setMistakeType]       = useState("");
  const [tags, setTags]                     = useState<string[]>([]);
  const [tagInput, setTagInput]             = useState("");
  const [notes, setNotes]                   = useState("");
  const [lessonsLearned, setLessons]        = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  /* Reset on open — pre-fills if editing */
  useEffect(() => {
    if (!open) return;
    setStep(1);
    if (initialData) {
      // ── Pre-fill all fields from existing trade ──
      setAssetClass(initialData.assetClass);
      setInstrument(initialData.instrument in ASSET_CLASS_CONFIG[initialData.assetClass]?.instruments ? initialData.instrument : "Custom");
      setCustomInstr(initialData.instrument);
      setTicker(initialData.tickerSymbol || "");
      setSide(initialData.side);
      setDateOpen(initialData.dateOpen);
      setTimeOpen(initialData.timeOpen || new Date().toTimeString().slice(0, 5));
      setDateClose(initialData.dateClose || "");
      setTimeClose(initialData.timeClose || "");
      setSession(initialData.session);
      setIsFunded(initialData.isFundedAccount);
      setEntries(initialData.entries.length > 0 ? initialData.entries : [{ price: initialData.avgEntryPrice, contracts: initialData.totalContracts, time: "" }]);
      setStopLoss(String(initialData.stopLoss));
      setInitialSL(String(initialData.initialStopLoss || initialData.stopLoss));
      setTP1(initialData.takeProfit ? String(initialData.takeProfit) : "");
      setTP2(initialData.takeProfit2 ? String(initialData.takeProfit2) : "");
      setTP3(initialData.takeProfit3 ? String(initialData.takeProfit3) : "");
      setBroker(initialData.brokerId);
      setCustomComm(String(initialData.commissionPerSide));
      setStrategy(initialData.strategy);
      setSetup(initialData.setup);
      setSetupGrade(initialData.setupGrade);
      setPlanFollowed(initialData.planFollowed);
      setConfluence(String(initialData.confluenceCount));
      setMae(initialData.mae ? String(initialData.mae) : "");
      setMfe(initialData.mfe ? String(initialData.mfe) : "");
      setExits(initialData.exits.length > 0 ? initialData.exits : [{ price: initialData.avgExitPrice || 0, contracts: initialData.contractsExited || 1, time: "" }]);
      setIsBreakeven(initialData.isBreakeven);
      setChartImage(initialData.screenshotUrl || null);
      setEmotionEntry(initialData.emotionEntry);
      setEmotionExit(initialData.emotionExit || "Neutral");
      setMistakeType(initialData.mistakeType || "");
      setTags(initialData.tags);
      setNotes(initialData.notes);
      setLessons(initialData.lessonsLearned || "");
    } else {
      // ── Reset to defaults for new trade ──
      setAssetClass("Futures"); setInstrument("NQ"); setCustomInstr(""); setTicker("");
      setSide("Buy");
      setDateOpen(new Date().toISOString().slice(0, 10));
      setTimeOpen(new Date().toTimeString().slice(0, 5));
      setDateClose(""); setTimeClose(""); setSession("NYSE Open (9:30-11)"); setIsFunded(false);
      setEntries([{ price: 0, contracts: 1, time: "" }]);
      setStopLoss(""); setInitialSL(""); setTP1(""); setTP2(""); setTP3("");
      setBroker("ninjatrader_lease"); setCustomComm("0");
      setStrategy("Breakout"); setSetup(""); setSetupGrade("A");
      setPlanFollowed(true); setConfluence("3"); setMae(""); setMfe("");
      setExits([{ price: 0, contracts: 1, time: "" }]); setIsBreakeven(false);
      setChartImage(null);
      setEmotionEntry("Confident"); setEmotionExit("Neutral");
      setMistakeType(""); setTags([]); setTagInput(""); setNotes(""); setLessons("");
    }
    setErrors({});
  }, [open, initialData]);

  /* Escape key */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  /* Derived */
  const assetCfg = ASSET_CLASS_CONFIG[assetClass];
  const instrumentOptions = [...assetCfg.instruments, "Custom"];
  const totalContracts = entries.reduce((s, e) => s + e.contracts, 0);
  const avgEntry = totalContracts > 0
    ? entries.reduce((s, e) => s + e.price * e.contracts, 0) / totalContracts : 0;
  const contractsExited = exits.reduce((s, e) => s + e.contracts, 0);
  const commPerSide = broker === "custom"
    ? parseFloat(customCommission) || 0
    : BROKER_PRESETS[broker]?.perSide ?? 0;

  /* Entry helpers */
  const addEntry    = () => setEntries(p => [...p, { price: 0, contracts: 1, time: "" }]);
  const removeEntry = (i: number) => setEntries(p => p.filter((_, idx) => idx !== i));
  const updateEntry = (i: number, key: keyof TradeEntry_Scale, val: string | number) =>
    setEntries(p => p.map((e, idx) => idx === i ? { ...e, [key]: key === "time" ? val : Number(val) } : e));

  /* Exit helpers */
  const addExit    = () => setExits(p => [...p, { price: 0, contracts: 1, time: "" }]);
  const removeExit = (i: number) => setExits(p => p.filter((_, idx) => idx !== i));
  const updateExit = (i: number, key: keyof TradeExit_Partial, val: string | number) =>
    setExits(p => p.map((e, idx) => idx === i ? { ...e, [key]: key === "time" ? val : Number(val) } : e));

  /* Tags */
  const addTag = (v: string) => {
    const t = v.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t)) setTags(p => [...p, t]);
    setTagInput("");
  };

  /* Validation */
  const validateStep = (s: number) => {
    const e: Record<string, string> = {};
    if (s === 1) {
      if (!dateOpen) e.dateOpen = "Fecha requerida";
      if (instrument === "Custom" && !customInstrument) e.customInstr = "Requerido";
    }
    if (s === 2) {
      if (!entries[0].price) e.entry0 = "Ingresa al menos un precio de entrada";
      if (!stopLoss) e.stopLoss = "El Stop Loss es requerido";
      if (!entries[0].contracts) e.contracts0 = "Ingresa cantidad de contratos";

      // Guardrails: Validación matemática estricta
      if (avgEntry > 0) {
        const checkSl = parseFloat(initialSL) || parseFloat(stopLoss);
        const checkTp = parseFloat(takeProfit1);

        if (side === "Buy") {
          if (checkSl >= avgEntry) e.stopLoss = "En LARGO, el Stop Loss debe ser menor a la entrada.";
          if (checkTp && checkTp <= avgEntry) e.takeProfit1 = "En LARGO, el Take Profit debe ser mayor a la entrada.";
        } else {
          if (checkSl <= avgEntry) e.stopLoss = "En CORTO, el Stop Loss debe ser mayor a la entrada.";
          if (checkTp && checkTp >= avgEntry) e.takeProfit1 = "En CORTO, el Take Profit debe ser menor a la entrada.";
        }
      }
    }
    if (s === 3) {
      if (!isBreakeven && !exits[0].price) e.exit0 = "Ingresa precio de salida o marca Breakeven";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const nextStep = () => { if (validateStep(step)) setStep(s => Math.min(s + 1, 4) as 1 | 2 | 3 | 4); };

  /* Save */
  const handleSave = () => {
    if (!validateStep(4)) return;
    const finalInstr = instrument === "Custom" ? customInstrument : instrument;
    const slN = parseFloat(stopLoss) || 0;
    const hasExit = exits.some(e => e.price > 0);
    const avgExitN = hasExit
      ? exits.reduce((s, e) => s + e.price * e.contracts, 0) / (contractsExited || 1)
      : undefined;
    const calc = calculateTrade(side, avgEntry, avgExitN, slN, totalContracts, commPerSide, assetCfg.pipValue);

    let holdTimeMinutes: number | undefined;
    if (dateOpen && timeOpen && timeClose) {
      const open_ = new Date(`${dateOpen}T${timeOpen}`);
      const close_ = new Date(`${dateClose || dateOpen}T${timeClose}`);
      holdTimeMinutes = Math.round((close_.getTime() - open_.getTime()) / 60000);
    }

    const record: TradeRecord = {
      id: `t-${Date.now()}`,
      assetClass, instrument: finalInstr, tickerSymbol: tickerSymbol || undefined,
      side, dateOpen, timeOpen, dateClose: dateClose || undefined, timeClose: timeClose || undefined,
      holdTimeMinutes, session,
      entries, avgEntryPrice: parseFloat(avgEntry.toFixed(assetCfg.decimalPlaces)), totalContracts,
      stopLoss: slN, initialStopLoss: parseFloat(initialSL) || slN,
      takeProfit: parseFloat(takeProfit1) || undefined,
      takeProfit2: parseFloat(takeProfit2) || undefined,
      takeProfit3: parseFloat(takeProfit3) || undefined,
      exits: hasExit ? exits : [], avgExitPrice: avgExitN ? parseFloat(avgExitN.toFixed(assetCfg.decimalPlaces)) : undefined,
      contractsExited: hasExit ? contractsExited : 0,
      brokerId: broker, commissionPerSide: commPerSide,
      totalCommission: calc.totalCommission ?? 0,
      grossPnl: calc.grossPnl, netPnl: calc.netPnl,
      pnlPerContract: calc.pnlPerContract, rMultiple: calc.rMultiple,
      result: isBreakeven ? "Breakeven" : (calc.result ?? "Open"),
      mae: parseFloat(mae) || undefined, mfe: parseFloat(mfe) || undefined,
      strategy, setup, setupGrade, planFollowed, isBreakeven, isFundedAccount: isFunded,
      confluenceCount: parseInt(confluenceCount) || 3,
      emotionEntry, emotionExit: emotionExit || undefined,
      mistakeType: mistakeType || undefined, tags, notes,
      lessonsLearned: lessonsLearned || undefined,
      screenshotUrl: chartImage || undefined,
    };
    onSave(record);
    onClose();
  };

  if (!open) return null;

  const brokerPresetOptions = Object.entries(BROKER_PRESETS).map(([k, v]) => ({
    value: k,
    label: v.name,
  }));

  const STEP_LABELS = ["Clasificación", "Entrada", "Salida", "Psicología"];

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
        {/* translate="no" prevents browser auto-translation from garbling trading terms */}
        <div
          translate="no"
          lang="es"
          role="dialog"
          aria-modal="true"
          aria-label="Registro de Trade / Operativa"
          className="pointer-events-auto relative w-full max-w-[760px] my-6 rounded-2xl border border-border-card bg-bg-card shadow-[0_32px_100px_rgba(0,0,0,0.7)] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`flex items-center justify-between border-b px-6 py-4 ${isEditing ? "border-blue-accent/40 bg-blue-accent/5" : "border-border-card/60"}`}>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-bold text-text-primary">
                  {isEditing ? "✏️ Editar Operación" : "Registro de Trade / Operativa"}
                </h2>
                {isEditing && (
                  <span className="rounded-full bg-blue-accent/15 border border-blue-accent/30 px-2 py-0.5 text-[9px] font-bold text-blue-accent uppercase tracking-wider">
                    MODO EDICIÓN
                  </span>
                )}
              </div>
              <p className="text-[11px] text-text-muted">
                {isEditing
                  ? `Editando: ${initialData?.instrument} · ${initialData?.dateOpen} · ${initialData?.side}`
                  : "Completa todos los campos para obtener estadísticas precisas"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-white/10 hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-green-primary"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Step tabs */}
          <div className="flex border-b border-border-card/40 px-2">
            {STEP_LABELS.map((label, i) => {
              const s = (i + 1) as 1 | 2 | 3 | 4;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => s < step && setStep(s)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-[11px] font-semibold transition-colors border-b-2 ${
                    step === s ? "border-green-primary text-green-primary"
                    : s < step ? "border-transparent text-text-secondary hover:text-text-primary cursor-pointer"
                    : "border-transparent text-text-muted cursor-default"
                  }`}
                >
                  <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${
                    step === s ? "bg-green-primary text-bg-main" :
                    s < step   ? "bg-text-secondary text-bg-main" :
                    "bg-border-card text-text-muted"
                  }`}>{s}</span>
                  <span className="hidden sm:inline">{label}</span>
                </button>
              );
            })}
          </div>

          {/* Body */}
          <div className="overflow-y-auto px-6 py-5 flex flex-col gap-4" style={{ maxHeight: "65vh" }}>

            {/* ════ STEP 1: Clasificación ════ */}
            {step === 1 && (
              <>
                <Section title="Tipo de Activo e Instrumento">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <Label>Clase de Activo</Label>
                      <Sel
                        value={assetClass}
                        onChange={v => {
                          setAssetClass(v as AssetClass);
                          setInstrument(ASSET_CLASS_CONFIG[v as AssetClass].instruments[0]);
                        }}
                        options={Object.keys(ASSET_CLASS_CONFIG)}
                      />
                    </div>
                    <div>
                      <Label>Instrumento</Label>
                      <Sel value={instrument} onChange={setInstrument} options={instrumentOptions} />
                    </div>
                    {instrument === "Custom" && (
                      <div>
                        <Label>Símbolo personalizado</Label>
                        <input
                          value={customInstrument} onChange={e => setCustomInstr(e.target.value)}
                          placeholder="p. ej. MNQU25"
                          className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-green-primary transition-colors"
                        />
                        <ErrMsg msg={errors.customInstr} />
                      </div>
                    )}
                    <div>
                      <Label>Vencimiento / Ticker (opcional)</Label>
                      <input
                        value={tickerSymbol} onChange={e => setTicker(e.target.value)}
                        placeholder="p. ej. NQZ25"
                        className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-green-primary transition-colors"
                      />
                    </div>
                  </div>
                </Section>

                <Section title="Dirección y Horario">
                  <div>
                    <Label>Dirección del Trade</Label>
                    <div className="flex gap-3">
                      {(["Buy", "Sell"] as TradeSide[]).map(s => (
                        <button
                          key={s} type="button" onClick={() => setSide(s)}
                          className={`flex-1 py-3 rounded-xl text-[14px] font-extrabold tracking-wide transition-all ${
                            side === s
                              ? s === "Buy"
                                ? "bg-green-primary/20 text-green-primary border-2 border-green-primary/50 shadow-green-glow-sm"
                                : "bg-red-loss/20 text-red-loss border-2 border-red-loss/50"
                              : "bg-bg-section border border-border-card text-text-muted hover:text-text-secondary"
                          }`}
                        >
                          {s === "Buy" ? "▲ LARGO / BUY (Compra)" : "▼ CORTO / SELL (Venta)"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <Label>Fecha de Apertura</Label>
                      <input type="date" value={dateOpen} onChange={e => setDateOpen(e.target.value)}
                        className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-green-primary transition-colors" />
                      <ErrMsg msg={errors.dateOpen} />
                    </div>
                    <div>
                      <Label>Hora de Apertura</Label>
                      <input type="time" value={timeOpen} onChange={e => setTimeOpen(e.target.value)}
                        className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-green-primary transition-colors" />
                    </div>
                    <div>
                      <Label>Fecha de Cierre</Label>
                      <input type="date" value={dateClose} onChange={e => setDateClose(e.target.value)}
                        className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-green-primary transition-colors" />
                    </div>
                    <div>
                      <Label>Hora de Cierre</Label>
                      <input type="time" value={timeClose} onChange={e => setTimeClose(e.target.value)}
                        className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-green-primary transition-colors" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Sesión de Trading</Label>
                      <Sel value={session} onChange={v => setSession(v as TradingSession)} options={[
                        "Pre-Market",
                        "NYSE Open (9:30-11)",
                        "Midday (11-14)",
                        "Power Hour (14-16)",
                        "After Hours",
                        "London Open",
                        "London/NY Overlap",
                        "Asian Session",
                        "Other",
                      ]} />
                    </div>
                    <div className="flex items-end pb-2">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input type="checkbox" checked={isFunded} onChange={e => setIsFunded(e.target.checked)}
                          className="h-4 w-4 accent-green-primary" />
                        <span className="text-[13px] text-text-secondary">Cuenta Funded / Prop Firm</span>
                      </label>
                    </div>
                  </div>
                </Section>
              </>
            )}

            {/* ════ STEP 2: Entrada ════ */}
            {step === 2 && (
              <>
                <Section title="Entradas (Scale-In disponible)">
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-[1fr_100px_90px_32px] gap-2 px-1">
                      <span className="text-[9px] text-text-muted uppercase tracking-wider">Precio de Entrada</span>
                      <span className="text-[9px] text-text-muted uppercase tracking-wider">{assetCfg.unit}</span>
                      <span className="text-[9px] text-text-muted uppercase tracking-wider">Hora</span>
                      <span />
                    </div>
                    {entries.map((e, i) => (
                      <div key={i} className="grid grid-cols-[1fr_100px_90px_32px] gap-2 items-start">
                        <div>
                          <NumInput
                            value={e.price ? String(e.price) : ""}
                            onChange={v => updateEntry(i, "price", v)}
                            placeholder={`Entrada ${i + 1}`}
                            step={assetCfg.decimalPlaces === 5 ? "0.00001" : "0.01"}
                            error={i === 0 && !!errors.entry0}
                          />
                          {i === 0 && <ErrMsg msg={errors.entry0} />}
                        </div>
                        <NumInput
                          value={e.contracts ? String(e.contracts) : ""}
                          onChange={v => updateEntry(i, "contracts", v)}
                          placeholder="1" min="0.01"
                          error={i === 0 && !!errors.contracts0}
                        />
                        <input type="time" value={e.time || ""}
                          onChange={ev => updateEntry(i, "time", ev.target.value)}
                          className="w-full rounded-lg bg-bg-section border border-border-card px-2 py-2.5 text-[12px] text-text-primary focus:outline-none focus:border-green-primary transition-colors"
                        />
                        {entries.length > 1 ? (
                          <button type="button" onClick={() => removeEntry(i)}
                            className="flex items-center justify-center h-[42px] w-8 text-text-muted hover:text-red-loss transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : <span />}
                      </div>
                    ))}
                    <button type="button" onClick={addEntry}
                      className="flex items-center gap-1.5 text-[11px] text-green-primary hover:underline self-start">
                      <Plus className="h-3.5 w-3.5" /> Agregar entrada adicional (scale-in)
                    </button>
                    {totalContracts > 0 && avgEntry > 0 && (
                      <div className="rounded-lg bg-bg-section border border-border-card/50 px-3 py-2 text-[11px] text-text-secondary">
                        Precio promedio de entrada:{" "}
                        <strong className="text-text-primary tabular-nums">{avgEntry.toFixed(assetCfg.decimalPlaces)}</strong>
                        {" "}· Total {assetCfg.unit}:{" "}
                        <strong className="text-text-primary">{totalContracts}</strong>
                      </div>
                    )}
                  </div>
                </Section>

                <Section title="Niveles de Riesgo (Stop Loss / Take Profit)">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <Label>Stop Loss *</Label>
                      <NumInput value={stopLoss} onChange={setStopLoss} placeholder="Precio del SL" error={!!errors.stopLoss} />
                      <ErrMsg msg={errors.stopLoss} />
                    </div>
                    <div>
                      <Label>Stop Loss Inicial (si fue movido)</Label>
                      <NumInput value={initialSL} onChange={setInitialSL} placeholder="SL original" />
                      <Hint>Stop original antes de cualquier ajuste durante el trade</Hint>
                    </div>
                    <div>
                      <Label>Take Profit 1 (TP1)</Label>
                      <NumInput value={takeProfit1} onChange={setTP1} placeholder="Precio del TP1" error={!!errors.takeProfit1} />
                      <ErrMsg msg={errors.takeProfit1} />
                    </div>
                    <div>
                      <Label>Take Profit 2 (TP2)</Label>
                      <NumInput value={takeProfit2} onChange={setTP2} placeholder="TP2 (opcional)" />
                    </div>
                    <div>
                      <Label>Take Profit 3 (TP3)</Label>
                      <NumInput value={takeProfit3} onChange={setTP3} placeholder="TP3 (opcional)" />
                    </div>
                  </div>
                </Section>

                <Section title="Bróker y Comisión">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Bróker / Plataforma</Label>
                      <Sel value={broker} onChange={setBroker} options={brokerPresetOptions} />
                      {broker !== "custom" && (
                        <p className="text-[10px] text-text-muted mt-1">{BROKER_PRESETS[broker]?.notes}</p>
                      )}
                    </div>
                    {broker === "custom" ? (
                      <div>
                        <Label>Comisión por lado / contrato ($)</Label>
                        <NumInput value={customCommission} onChange={setCustomComm}
                          placeholder="p. ej. 0.50" suffix="$/lado" />
                        <Hint>Por lado = solo entrada O solo salida (no ambos)</Hint>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-border-card/60 bg-bg-section/60 p-3 text-[11px] flex flex-col gap-1.5">
                        <div className="flex justify-between">
                          <span className="text-text-muted">Por lado / contrato</span>
                          <strong className="text-yellow-warn">${BROKER_PRESETS[broker]?.perSide.toFixed(2)}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">Round-trip / contrato</span>
                          <strong className="text-yellow-warn">${BROKER_PRESETS[broker]?.perRoundTrip.toFixed(2)}</strong>
                        </div>
                        <div className="flex justify-between border-t border-border-card/40 pt-1.5 mt-0.5">
                          <span className="text-text-muted">Total ({totalContracts} {assetCfg.unit})</span>
                          <strong className="text-red-loss">
                            -${(totalContracts * (BROKER_PRESETS[broker]?.perRoundTrip ?? 0)).toFixed(2)}
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>
                </Section>

                <Section title="Setup y Estrategia">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <Label>Estrategia</Label>
                      <Sel value={strategy} onChange={setStrategy} options={STRATEGIES} />
                    </div>
                    <div>
                      <Label>Setup / Señal</Label>
                      <input value={setup} onChange={e => setSetup(e.target.value)}
                        placeholder="p. ej. BO-EMA200, VWAP Reclaim"
                        className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-green-primary transition-colors" />
                    </div>
                    <div>
                      <Label>Grado del Setup</Label>
                      <div className="flex gap-1.5">
                        {(["A+", "A", "B", "C", "D"] as SetupGrade[]).map(g => (
                          <button key={g} type="button" onClick={() => setSetupGrade(g)}
                            className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all ${
                              setupGrade === g
                                ? g === "A+" || g === "A" ? "bg-green-primary/20 text-green-primary border border-green-primary/40"
                                : g === "B" ? "bg-blue-accent/20 text-blue-accent border border-blue-accent/40"
                                : "bg-red-loss/20 text-red-loss border border-red-loss/40"
                                : "bg-bg-section border border-border-card text-text-muted hover:text-text-secondary"
                            }`}>{g}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>Confluencias (1-5)</Label>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map(n => (
                          <button key={n} type="button" onClick={() => setConfluence(String(n))}
                            className={`flex-1 py-2 rounded-lg text-[12px] font-bold transition-all ${
                              parseInt(confluenceCount) === n
                                ? "bg-blue-accent/20 text-blue-accent border border-blue-accent/40"
                                : "bg-bg-section border border-border-card text-text-muted hover:text-text-secondary"
                            }`}>{n}</button>
                        ))}
                      </div>
                      <Hint>Cuántos factores técnicos estaban alineados</Hint>
                    </div>
                    <div className="flex items-center mt-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={planFollowed} onChange={e => setPlanFollowed(e.target.checked)}
                          className="h-4 w-4 accent-green-primary" />
                        <span className="text-[13px] text-text-secondary">¿Siguió el plan de trading?</span>
                      </label>
                    </div>
                  </div>
                </Section>

                <PnlPreview
                  entries={entries} exits={exits} side={side}
                  sl={parseFloat(stopLoss) || 0} broker={broker}
                  customComm={parseFloat(customCommission) || 0}
                  assetClass={assetClass} contracts={totalContracts}
                />
              </>
            )}

            {/* ════ STEP 3: Salida ════ */}
            {step === 3 && (
              <>
                {/* Breakeven toggle */}
                <div
                  className={`rounded-xl border p-4 shrink-0 cursor-pointer transition-all ${isBreakeven ? "border-yellow-warn/40 bg-yellow-warn/5" : "border-border-card bg-bg-section/30"}`}
                  onClick={() => setIsBreakeven(b => !b)}
                >
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={isBreakeven} onChange={e => setIsBreakeven(e.target.checked)}
                      className="h-5 w-5 accent-yellow-warn" onClick={e => e.stopPropagation()} />
                    <div>
                      <p className="text-[13px] font-semibold text-text-primary">Breakeven / Scratch</p>
                      <p className="text-[11px] text-text-muted">Salida al precio de entrada ± comisión. Sin ganancia ni pérdida real.</p>
                    </div>
                  </label>
                </div>

                {!isBreakeven && (
                  <Section title="Salidas (Scale-Out / Parciales disponible)">
                    <div className="flex flex-col gap-2">
                      <div className="grid grid-cols-[1fr_100px_90px_32px] gap-2 px-1">
                        <span className="text-[9px] text-text-muted uppercase tracking-wider">Precio de Salida</span>
                        <span className="text-[9px] text-text-muted uppercase tracking-wider">{assetCfg.unit}</span>
                        <span className="text-[9px] text-text-muted uppercase tracking-wider">Hora</span>
                        <span />
                      </div>
                      {exits.map((e, i) => (
                        <div key={i} className="grid grid-cols-[1fr_100px_90px_32px] gap-2 items-start">
                          <div>
                            <NumInput
                              value={e.price ? String(e.price) : ""}
                              onChange={v => updateExit(i, "price", v)}
                              placeholder={`Salida ${i + 1}`}
                              step={assetCfg.decimalPlaces === 5 ? "0.00001" : "0.01"}
                              error={i === 0 && !!errors.exit0}
                            />
                            {i === 0 && <ErrMsg msg={errors.exit0} />}
                          </div>
                          <NumInput
                            value={e.contracts ? String(e.contracts) : ""}
                            onChange={v => updateExit(i, "contracts", v)}
                            placeholder="1" min="0.01"
                          />
                          <input type="time" value={e.time || ""}
                            onChange={ev => updateExit(i, "time", ev.target.value)}
                            className="w-full rounded-lg bg-bg-section border border-border-card px-2 py-2.5 text-[12px] text-text-primary focus:outline-none focus:border-green-primary transition-colors"
                          />
                          {exits.length > 1 ? (
                            <button type="button" onClick={() => removeExit(i)}
                              className="flex items-center justify-center h-[42px] w-8 text-text-muted hover:text-red-loss transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ) : <span />}
                        </div>
                      ))}
                      <button type="button" onClick={addExit}
                        className="flex items-center gap-1.5 text-[11px] text-green-primary hover:underline self-start">
                        <Plus className="h-3.5 w-3.5" /> Agregar salida parcial
                      </button>
                    </div>
                  </Section>
                )}

                {/* ── Chart Screenshot Upload ── */}
                <Section title="📸 Screenshot del Gráfico">
                  <div>
                    <p className="text-[12px] text-text-secondary mb-3">
                      Adjunta el gráfico de tu operativa para revisión futura y evaluación de setups.
                      Solo se aceptan imágenes — el archivo se guarda localmente sin recargar la página.
                    </p>
                    <ChartImageUpload value={chartImage} onChange={setChartImage} />
                  </div>
                </Section>

                <Section title="Métricas Avanzadas (opcional)" collapsible>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>MAE — Máxima Excursión Adversa (puntos)</Label>
                      <NumInput value={mae} onChange={setMae} placeholder="Máximo drawdown dentro del trade" />
                      <Hint>Cuánto fue el precio en tu contra antes de la salida</Hint>
                    </div>
                    <div>
                      <Label>MFE — Máxima Excursión Favorable (puntos)</Label>
                      <NumInput value={mfe} onChange={setMfe} placeholder="Máximo profit visto" />
                      <Hint>El máximo profit que podría haberse tomado</Hint>
                    </div>
                  </div>
                </Section>

                <PnlPreview
                  entries={entries} exits={isBreakeven ? [] : exits} side={side}
                  sl={parseFloat(stopLoss) || 0} broker={broker}
                  customComm={parseFloat(customCommission) || 0}
                  assetClass={assetClass} contracts={totalContracts}
                />
              </>
            )}

            {/* ════ STEP 4: Psicología ════ */}
            {step === 4 && (
              <>
                <Section title="Psicología del Trade">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <Label>Emoción en la Entrada</Label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {EMOTIONS.map(e => (
                          <button key={e} type="button" onClick={() => setEmotionEntry(e)}
                            className={`py-1.5 px-1 rounded-lg text-[10px] font-medium text-center transition-all ${
                              emotionEntry === e
                                ? "bg-violet-accent/20 text-violet-accent border border-violet-accent/40"
                                : "bg-bg-section border border-border-card text-text-muted hover:text-text-secondary"
                            }`}>{e}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>Emoción en la Salida</Label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {EMOTIONS.map(e => (
                          <button key={e} type="button" onClick={() => setEmotionExit(e)}
                            className={`py-1.5 px-1 rounded-lg text-[10px] font-medium text-center transition-all ${
                              emotionExit === e
                                ? "bg-blue-accent/20 text-blue-accent border border-blue-accent/40"
                                : "bg-bg-section border border-border-card text-text-muted hover:text-text-secondary"
                            }`}>{e}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Tipo de Error Cometido (si aplica)</Label>
                    <Sel
                      value={mistakeType || ""}
                      onChange={setMistakeType}
                      options={["(Ninguno — ejecución limpia)", ...MISTAKE_TYPES]}
                    />
                  </div>
                </Section>

                <Section title="Tags / Etiquetas">
                  <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                    {tags.map(t => (
                      <span key={t} className="inline-flex items-center gap-1 rounded-full bg-blue-accent/10 border border-blue-accent/20 px-2.5 py-1 text-[10px] text-blue-accent">
                        #{t}
                        <button type="button" onClick={() => setTags(p => p.filter(x => x !== t))}
                          className="hover:text-red-loss transition-colors" aria-label={`Eliminar ${t}`}>
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={tagInput} onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag(tagInput))}
                      placeholder="Escribe un tag y presiona Enter"
                      className="flex-1 rounded-lg bg-bg-section border border-border-card px-3 py-2 text-[12px] text-text-primary focus:outline-none focus:border-green-primary transition-colors"
                    />
                    <button type="button" onClick={() => addTag(tagInput)}
                      className="px-3 rounded-lg bg-bg-section border border-border-card text-green-primary hover:bg-white/5 transition-colors">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {TAGS_SUGGESTED.filter(t => !tags.includes(t)).slice(0, 10).map(t => (
                      <button key={t} type="button" onClick={() => addTag(t)}
                        className="rounded-full border border-border-card/60 px-2.5 py-0.5 text-[9px] text-text-muted hover:border-blue-accent/40 hover:text-blue-accent transition-colors">
                        +{t}
                      </button>
                    ))}
                  </div>
                </Section>

                <Section title="Notas y Lecciones Aprendidas">
                  <div>
                    <Label>Análisis del Trade / Notas</Label>
                    <textarea
                      value={notes} onChange={e => setNotes(e.target.value)}
                      rows={4}
                      placeholder="¿Cuál fue tu tesis? ¿Contexto del mercado? ¿Qué observaste antes de entrar?"
                      className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2.5 text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-green-primary transition-colors resize-y leading-relaxed"
                    />
                  </div>
                  <div>
                    <Label>Lecciones Aprendidas</Label>
                    <textarea
                      value={lessonsLearned} onChange={e => setLessons(e.target.value)}
                      rows={3}
                      placeholder="¿Qué harías diferente? ¿Qué aprendiste con este trade?"
                      className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2.5 text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-green-primary transition-colors resize-y leading-relaxed"
                    />
                  </div>
                </Section>
              </>
            )}

          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border-card/60 px-6 py-4 gap-3 flex-shrink-0">
            <button type="button"
              onClick={() => step > 1 ? setStep(s => (s - 1) as 1 | 2 | 3 | 4) : onClose()}
              className="px-4 py-2.5 rounded-btn text-[13px] text-text-secondary border border-border-card hover:bg-white/5 transition-colors">
              {step > 1 ? "← Atrás" : "Cancelar"}
            </button>

            <div className="flex items-center gap-3">
              {step === 4 && (
                <button type="button"
                  onClick={() => { setExits([{ price: 0, contracts: 0, time: "" }]); handleSave(); }}
                  className="px-4 py-2.5 rounded-btn text-[13px] text-blue-accent border border-blue-accent/30 hover:bg-blue-accent/5 transition-colors">
                  Guardar Trade Abierto
                </button>
              )}
              {step < 4 ? (
                <button type="button" onClick={nextStep}
                  className="px-6 py-2.5 rounded-btn bg-green-primary text-bg-main text-[13px] font-bold hover:bg-green-primary/90 transition-all shadow-green-glow-sm focus:outline-none focus:ring-2 focus:ring-green-primary">
                  Siguiente →
                </button>
              ) : (
                <button type="button" onClick={handleSave}
                  className="px-7 py-2.5 rounded-btn bg-green-primary text-bg-main text-[14px] font-bold hover:bg-green-primary/90 transition-all shadow-green-glow focus:outline-none focus:ring-2 focus:ring-green-primary">
                  💾 Guardar Trade
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
