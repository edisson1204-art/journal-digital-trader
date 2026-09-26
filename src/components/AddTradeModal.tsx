"use client";

import { useState, useEffect, useRef } from "react";
import { X, Plus, Minus, ChevronDown } from "lucide-react";

/* ── Types ── */
export interface TradeEntry {
  id: string;
  date: string;
  instrument: string;
  side: "Buy" | "Sell";
  strategy: string;
  setup: string;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  exitPrice: number;
  sizeUnits: number;
  pipValue: number; // $ per point/pip per unit
  emotion: string;
  tags: string[];
  notes: string;
  imageUrl?: string;
}

/* ── Helpers ── */
function calcRR(side: "Buy"|"Sell", entry: number, sl: number, tp: number) {
  if (!entry || !sl || !tp) return null;
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  if (risk === 0) return null;
  return (reward / risk).toFixed(2);
}

function calcPnl(side: "Buy"|"Sell", entry: number, exit: number, size: number, pipVal: number) {
  if (!entry || !exit || !size || !pipVal) return null;
  const diff = side === "Buy" ? exit - entry : entry - exit;
  return (diff * size * pipVal).toFixed(2);
}

/* ── Field components ── */
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium text-text-secondary">{label}</label>
      {children}
      {error && <p className="text-[10px] text-red-loss">{error}</p>}
    </div>
  );
}

function Input({ value, onChange, type = "text", placeholder, step, min, suffix, error }: {
  value: string; onChange: (v: string) => void; type?: string;
  placeholder?: string; step?: string; min?: string; suffix?: string; error?: boolean;
}) {
  return (
    <div className="relative">
      <input
        type={type} value={value} step={step} min={min} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className={`w-full rounded-lg bg-bg-section border px-3 py-2.5 text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none transition-colors ${
          error ? "border-red-loss focus:border-red-loss focus:ring-1 focus:ring-red-loss"
                : "border-border-card focus:border-green-primary focus:ring-1 focus:ring-green-primary"
        } ${suffix ? "pr-10" : ""}`}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-text-muted pointer-events-none">{suffix}</span>
      )}
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg bg-bg-section border border-border-card px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-green-primary focus:ring-1 focus:ring-green-primary transition-colors pr-8"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
    </div>
  );
}

/* ── Main modal ── */
interface AddTradeModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (trade: TradeEntry) => void;
}

const STRATEGIES = ["Breakout","Trend Following","Mean Reversion","Scalping","News Play","Support/Resistance","Other"];
const EMOTIONS   = ["Confident","Focused","Neutral","Anxious","Overconfident","Fearful","Impatient","Disciplined"];
const INSTRUMENTS = ["NAS100","ES","NQ","CL","GC","EURUSD","GBPUSD","USDJPY","AUDUSD","BTCUSD","ETHUSD","AAPL","TSLA","AMZN","Custom"];

export function AddTradeModal({ open, onClose, onSave }: AddTradeModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  /* Form state */
  const [date, setDate]           = useState(new Date().toISOString().slice(0, 10));
  const [instrument, setInstr]    = useState("NAS100");
  const [customInstr, setCustom]  = useState("");
  const [side, setSide]           = useState<"Buy"|"Sell">("Buy");
  const [strategy, setStrategy]   = useState("Breakout");
  const [setup, setSetup]         = useState("");
  const [entry, setEntry]         = useState("");
  const [sl, setSl]               = useState("");
  const [tp, setTp]               = useState("");
  const [exit, setExit]           = useState("");
  const [size, setSize]           = useState("");
  const [pipVal, setPipVal]       = useState("1");
  const [emotion, setEmotion]     = useState("Confident");
  const [notes, setNotes]         = useState("");
  const [tagInput, setTagInput]   = useState("");
  const [tags, setTags]           = useState<string[]>([]);
  const [errors, setErrors]       = useState<Record<string, string>>({});
  const [step, setStep]           = useState<1|2|3>(1);

  /* Reset on open */
  useEffect(() => {
    if (open) {
      setDate(new Date().toISOString().slice(0, 10));
      setInstr("NAS100"); setCustom(""); setSide("Buy");
      setStrategy("Breakout"); setSetup("");
      setEntry(""); setSl(""); setTp(""); setExit(""); setSize(""); setPipVal("1");
      setEmotion("Confident"); setNotes(""); setTags([]); setTagInput("");
      setErrors({}); setStep(1);
    }
  }, [open]);

  /* Computed values */
  const entryN  = parseFloat(entry)  || 0;
  const slN     = parseFloat(sl)     || 0;
  const tpN     = parseFloat(tp)     || 0;
  const exitN   = parseFloat(exit)   || 0;
  const sizeN   = parseFloat(size)   || 0;
  const pipValN = parseFloat(pipVal) || 1;

  const rr  = calcRR(side, entryN, slN, tpN);
  const pnl = calcPnl(side, entryN, exitN, sizeN, pipValN);

  const riskAmt = slN && entryN ? Math.abs(entryN - slN) * sizeN * pipValN : null;
  const result  = pnl !== null ? (parseFloat(pnl) > 0 ? "Win" : parseFloat(pnl) < 0 ? "Loss" : "Breakeven") : null;

  /* Validation */
  const validate = () => {
    const e: Record<string, string> = {};
    if (!entry)          e.entry = "Required";
    if (!sl)             e.sl    = "Required";
    if (!exit && step===3) e.exit = "Required for closed trade";
    if (!size)           e.size  = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* Tag handling */
  const addTag = (v: string) => {
    const t = v.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput("");
  };

  /* Keyboard trap */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  /* Save */
  const handleSave = () => {
    if (!validate()) return;
    const finalInstr = instrument === "Custom" ? customInstr : instrument;
    const trade: TradeEntry = {
      id: `t-${Date.now()}`,
      date, instrument: finalInstr, side, strategy, setup,
      entry: entryN, stopLoss: slN, takeProfit: tpN, exitPrice: exitN,
      sizeUnits: sizeN, pipValue: pipValN,
      emotion, tags, notes,
    };
    onSave(trade);
    onClose();
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Add trade"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="pointer-events-auto w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[18px] border border-border-card bg-bg-card shadow-[0_24px_80px_rgba(0,0,0,0.6)] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-card/60 px-6 py-4 flex-shrink-0">
            <div>
              <h2 className="text-base font-bold text-text-primary">Register Trade</h2>
              <p className="text-[11px] text-text-muted">Record your operativa in detail</p>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-white/10 hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-green-primary"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Step indicators */}
          <div className="flex items-center px-6 py-3 gap-2 border-b border-border-card/40 flex-shrink-0">
            {([1,2,3] as const).map(s => (
              <button
                key={s}
                onClick={() => setStep(s)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors ${
                  step === s
                    ? "bg-green-primary/15 text-green-primary border border-green-primary/30"
                    : step > s
                    ? "bg-bg-section text-text-secondary border border-border-card"
                    : "text-text-muted border border-transparent"
                }`}
              >
                <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                  step === s ? "bg-green-primary text-bg-main" :
                  step > s ? "bg-text-secondary text-bg-main" : "bg-border-card text-text-muted"
                }`}>{s}</span>
                {s === 1 ? "Entry" : s === 2 ? "Exit" : "Notes"}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">

            {/* ── STEP 1: Entry data ── */}
            {step === 1 && (
              <div className="flex flex-col gap-4">
                {/* Row: Date + Instrument */}
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Date & Time">
                    <Input type="date" value={date} onChange={setDate} />
                  </Field>
                  <Field label="Instrument">
                    <Select value={instrument} onChange={setInstr} options={INSTRUMENTS} />
                  </Field>
                </div>
                {instrument === "Custom" && (
                  <Field label="Custom Instrument">
                    <Input value={customInstr} onChange={setCustom} placeholder="e.g. XAUEUR" />
                  </Field>
                )}

                {/* Side toggle */}
                <Field label="Direction">
                  <div className="flex gap-2">
                    {(["Buy","Sell"] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setSide(s)}
                        className={`flex-1 py-2.5 rounded-lg text-[13px] font-bold transition-all ${
                          side === s
                            ? s === "Buy"
                              ? "bg-green-primary/20 text-green-primary border border-green-primary/40"
                              : "bg-red-loss/20 text-red-loss border border-red-loss/40"
                            : "bg-bg-section border border-border-card text-text-muted hover:text-text-secondary"
                        }`}
                      >
                        {s === "Buy" ? "▲ " : "▼ "}{s}
                      </button>
                    ))}
                  </div>
                </Field>

                {/* Prices */}
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Entry Price" error={errors.entry}>
                    <Input value={entry} onChange={setEntry} type="number" step="any" placeholder="0.00" error={!!errors.entry} />
                  </Field>
                  <Field label="Stop Loss" error={errors.sl}>
                    <Input value={sl} onChange={setSl} type="number" step="any" placeholder="0.00" error={!!errors.sl} />
                  </Field>
                  <Field label="Take Profit">
                    <Input value={tp} onChange={setTp} type="number" step="any" placeholder="0.00" />
                  </Field>
                </div>

                {/* Size + pip value */}
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Size / Contracts / Lots" error={errors.size}>
                    <Input value={size} onChange={setSize} type="number" step="any" min="0" placeholder="1.0" error={!!errors.size} />
                  </Field>
                  <Field label="$ per point / pip per unit">
                    <Input value={pipVal} onChange={setPipVal} type="number" step="any" min="0" placeholder="1.00" suffix="$/pt" />
                  </Field>
                </div>

                {/* Strategy + Setup */}
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Strategy">
                    <Select value={strategy} onChange={setStrategy} options={STRATEGIES} />
                  </Field>
                  <Field label="Setup / Signal Name">
                    <Input value={setup} onChange={setSetup} placeholder="e.g. BO-EMA200" />
                  </Field>
                </div>

                {/* Live calculated preview */}
                {(rr || riskAmt) && (
                  <div className="rounded-xl border border-border-card/60 bg-bg-section p-4 grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-[9px] text-text-muted mb-0.5">Risk:Reward</p>
                      <p className={`text-[15px] font-bold ${rr && parseFloat(rr) >= 1.5 ? "text-green-primary" : "text-yellow-warn"}`}>
                        1:{rr ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-text-muted mb-0.5">Risk Amount</p>
                      <p className="text-[15px] font-bold text-red-loss">
                        {riskAmt !== null ? `-$${riskAmt.toFixed(2)}` : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-text-muted mb-0.5">Max Reward</p>
                      <p className="text-[15px] font-bold text-green-primary">
                        {riskAmt !== null && rr !== null ? `+$${(riskAmt * parseFloat(rr)).toFixed(2)}` : "—"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 2: Exit data ── */}
            {step === 2 && (
              <div className="flex flex-col gap-4">
                <div className="rounded-xl border border-border-card/60 bg-bg-section p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px]">
                  <div><p className="text-[9px] text-text-muted">Instrument</p><p className="font-bold text-text-primary">{instrument === "Custom" ? customInstr : instrument}</p></div>
                  <div><p className="text-[9px] text-text-muted">Direction</p><p className={`font-bold ${side === "Buy" ? "text-green-primary" : "text-red-loss"}`}>{side}</p></div>
                  <div><p className="text-[9px] text-text-muted">Entry</p><p className="font-bold text-text-primary tabular-nums">{entry}</p></div>
                  <div><p className="text-[9px] text-text-muted">Stop Loss</p><p className="font-bold text-red-loss tabular-nums">{sl}</p></div>
                </div>

                <Field label="Exit Price" error={errors.exit}>
                  <Input value={exit} onChange={setExit} type="number" step="any" placeholder="0.00" error={!!errors.exit} />
                </Field>

                {/* Computed result */}
                {pnl !== null && (
                  <div className={`rounded-xl border p-4 ${
                    parseFloat(pnl) > 0
                      ? "border-green-primary/30 bg-green-primary/5"
                      : parseFloat(pnl) < 0
                      ? "border-red-loss/30 bg-red-loss/5"
                      : "border-yellow-warn/30 bg-yellow-warn/5"
                  }`}>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-[9px] text-text-muted mb-1">P&L</p>
                        <p className={`text-2xl font-extrabold tabular-nums ${
                          parseFloat(pnl) > 0 ? "text-green-primary" :
                          parseFloat(pnl) < 0 ? "text-red-loss" : "text-yellow-warn"
                        }`}>
                          {parseFloat(pnl) > 0 ? "+" : ""}{pnl !== null ? `$${Math.abs(parseFloat(pnl)).toFixed(2)}` : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-text-muted mb-1">Result</p>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          result === "Win" ? "bg-green-primary/15 text-green-primary" :
                          result === "Loss" ? "bg-red-loss/15 text-red-loss" :
                          "bg-yellow-warn/15 text-yellow-warn"
                        }`}>{result}</span>
                      </div>
                      <div>
                        <p className="text-[9px] text-text-muted mb-1">Actual R:R</p>
                        <p className={`text-[17px] font-bold tabular-nums ${
                          result === "Win" ? "text-blue-accent" : "text-red-loss"
                        }`}>
                          {exit && entry && sl
                            ? `${result === "Win" ? "+" : ""}${(Math.abs(exitN - entryN) / Math.abs(entryN - slN)).toFixed(2)}R`
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Optional screenshot */}
                <Field label="Chart Screenshot (optional)">
                  <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-border-card bg-bg-section p-8 text-center hover:border-green-primary/40 transition-colors cursor-pointer">
                    <div>
                      <p className="text-2xl mb-2">📸</p>
                      <p className="text-[12px] text-text-secondary">Drop your chart image here</p>
                      <p className="text-[10px] text-text-muted mt-1">PNG, JPG up to 10MB</p>
                    </div>
                  </div>
                </Field>
              </div>
            )}

            {/* ── STEP 3: Notes & psychology ── */}
            {step === 3 && (
              <div className="flex flex-col gap-4">
                {/* Emotion selector */}
                <Field label="Pre-trade Emotion">
                  <div className="grid grid-cols-4 gap-2">
                    {EMOTIONS.map(e => (
                      <button
                        key={e}
                        onClick={() => setEmotion(e)}
                        className={`py-2 px-2 rounded-lg text-[11px] font-medium transition-all text-center ${
                          emotion === e
                            ? "bg-violet-accent/20 text-violet-accent border border-violet-accent/40"
                            : "bg-bg-section border border-border-card text-text-muted hover:text-text-secondary"
                        }`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </Field>

                {/* Tags */}
                <Field label="Tags">
                  <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
                    {tags.map(t => (
                      <span key={t} className="inline-flex items-center gap-1 rounded-full bg-blue-accent/10 border border-blue-accent/20 px-2.5 py-1 text-[10px] text-blue-accent">
                        #{t}
                        <button
                          onClick={() => setTags(prev => prev.filter(x => x !== t))}
                          className="hover:text-red-loss transition-colors"
                          aria-label={`Remove tag ${t}`}
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={setTagInput}
                      placeholder="Type a tag and press Enter (e.g. momentum, FOMO)"
                    />
                    <button
                      onClick={() => addTag(tagInput)}
                      className="flex-shrink-0 rounded-lg bg-bg-section border border-border-card px-3 text-green-primary hover:bg-white/5 transition-colors"
                      aria-label="Add tag"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-[10px] text-text-muted mt-1">Suggestions: momentum, FOMO, news, counter-trend, scalp, revenge, plan-followed</p>
                </Field>

                {/* Notes */}
                <Field label="Trade Notes / Journal Entry">
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="What was your thesis? What did you do well? What would you do differently? Any lessons learned..."
                    rows={5}
                    className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2.5 text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-green-primary focus:ring-1 focus:ring-green-primary transition-colors resize-y leading-relaxed"
                  />
                </Field>

                {/* Summary before saving */}
                <div className="rounded-xl border border-border-card bg-bg-section p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-3">Trade Summary</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12px]">
                    {[
                      ["Instrument", instrument === "Custom" ? customInstr : instrument],
                      ["Direction",  side],
                      ["Entry",      entry || "—"],
                      ["Stop Loss",  sl || "—"],
                      ["Take Profit",tp || "—"],
                      ["Exit Price", exit || "—"],
                      ["P&L",        pnl !== null ? `${parseFloat(pnl) > 0 ? "+" : ""}$${Math.abs(parseFloat(pnl)).toFixed(2)}` : "—"],
                      ["Result",     result ?? "Open"],
                      ["Strategy",   strategy],
                      ["Emotion",    emotion],
                    ].map(([k,v]) => (
                      <div key={k} className="flex justify-between border-b border-border-card/30 pb-1.5">
                        <span className="text-text-muted">{k}</span>
                        <span className={`font-semibold ${
                          k === "P&L" ? (parseFloat(pnl ?? "0") >= 0 ? "text-green-primary" : "text-red-loss") :
                          k === "Direction" ? (v === "Buy" ? "text-green-primary" : "text-red-loss") :
                          "text-text-primary"
                        }`}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between border-t border-border-card/60 px-6 py-4 flex-shrink-0">
            <button
              onClick={() => step > 1 ? setStep((step - 1) as 1|2|3) : onClose()}
              className="px-4 py-2 rounded-btn text-[13px] text-text-secondary border border-border-card hover:bg-white/5 transition-colors"
            >
              {step > 1 ? "← Back" : "Cancel"}
            </button>

            <div className="flex items-center gap-2">
              {step < 3 ? (
                <button
                  onClick={() => setStep((step + 1) as 1|2|3)}
                  className="px-5 py-2 rounded-btn bg-green-primary text-bg-main text-[13px] font-bold hover:bg-green-primary/90 transition-all shadow-green-glow-sm focus:outline-none focus:ring-2 focus:ring-green-primary"
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  className="px-6 py-2 rounded-btn bg-green-primary text-bg-main text-[13px] font-bold hover:bg-green-primary/90 transition-all shadow-green-glow focus:outline-none focus:ring-2 focus:ring-green-primary"
                >
                  💾 Save Trade
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
