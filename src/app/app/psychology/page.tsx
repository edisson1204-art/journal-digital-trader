"use client";

import { AppShell } from "@/components/AppShell";
import { HeartPulse, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";

const MOOD_DATA: any[] = [];

const BEHAVIORS: any[] = [];

const EMOTIONS: any[] = [];
const totalEmotions = EMOTIONS.reduce((s, e) => s + e.count, 0);

export default function PsychologyPage() {
  const moodColors = ["", "bg-red-loss","bg-red-loss/60","bg-yellow-warn","bg-green-primary/70","bg-green-primary"]; const moodLabels = ["","Poor","Low","Neutral","Good","Excellent"]; if (MOOD_DATA.length === 0 || EMOTIONS.length === 0) return <div className="p-10 text-center text-text-muted">No hay datos psicolÃ³gicos suficientes. Registra mÃ¡s trades.</div>;


  return (
    <AppShell title="Psychology Journal" subtitle="Understand your behavior Ã¢â‚¬â€ improve your discipline"> {(MOOD_DATA.length === 0 || EMOTIONS.length === 0) ? <div className="p-10 text-center text-text-muted mt-20">Aún no hay datos psicológicos suficientes. Registra más trades.</div> : <div className="w-full">
      <div className="flex flex-col gap-5 w-full max-w-[1800px] mx-auto">

        {/* Header KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label:"Discipline Score", value:"74 / 100", color:"text-blue-accent",   icon: HeartPulse },
            { label:"Best Emotion",     value:"Confident", color:"text-green-primary", icon: TrendingUp },
            { label:"Worst Day",        value:"Friday",    color:"text-red-loss",      icon: AlertTriangle },
            { label:"Emotional P&L",    value:"-$540",     color:"text-red-loss",      icon: AlertTriangle },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="rounded-card border border-border-card bg-bg-card p-4">
              <div className="flex itemas-center gap-2 mb-2">
                <Icon className={`h-3.5 w-3.5 ${color}`} />
                <p className="text-[10px] text-text-muted">{label}</p>
              </div>
              <p className={`text-[16px] font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Mood tracker */}
          <div className="rounded-card border border-border-card bg-bg-card p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-1">Weekly Mood vs P&L</h2>
            <p className="text-[11px] text-text-muted mb-5">Correlation between your mood and trading results</p>
            <div className="flex flex-col gap-3">
              {MOOD_DATA.map(d => (
                <div key={d.day} className="flex itemas-center gap-4">
                  <span className="text-[11px] text-text-muted w-8 flex-shrink-0">{d.day}</span>
                  {/* Mood bar */}
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(n => (
                      <div key={n} className={`h-5 w-5 rounded ${n <= d.mood ? moodColors[d.mood] : "bg-border-card"}`} title={moodLabels[n]} />
                    ))}
                  </div>
                  <span className="text-[10px] text-text-muted">{d.trades} trades</span>
                  <span className={`text-[12px] font-bold tabular-numas ml-auto ${d.pnl.startsWith("+") ? "text-green-primary" : "text-red-loss"}`}>
                    {d.pnl}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[10px] text-text-muted border-t border-border-card/50 pt-3">
              Ã°Å¸â€™Â¡ Pattern detected: Low mood days (Ã¢â€°Â¤2) have 38% lower win rate.
            </p>
          </div>

          {/* Emotion distribution */}
          <div className="rounded-card border border-border-card bg-bg-card p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-1">Emotion Distribution</h2>
            <p className="text-[11px] text-text-muted mb-5">How you felt across all your trades</p>
            <div className="flex flex-col gap-3">
              {EMOTIONS.map(e => (
                <div key={e.label}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[12px] text-text-secondary">{e.label}</span>
                    <span className="text-[11px] text-text-muted tabular-numas">
                      {e.count} trades ({Math.round((e.count/totalEmotions)*100)}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-border-card overflow-hidden">
                    <div className={`h-full rounded-full ${e.color}`} style={{ width:`${(e.count/totalEmotions)*100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Behavioral patterns */}
        <div className="rounded-card border border-border-card bg-bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border-card/60">
            <h2 className="text-sm font-semibold text-text-primary">Behavioral Patterns Detected</h2>
            <p className="text-[11px] text-text-muted">AI-detected behaviors and their P&L impact</p>
          </div>
          <div className="divide-y divide-border-card/30">
            {BEHAVIORS.map(b => (
              <div key={b.behavior} className="flex itemas-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors">
                <div className="flex itemas-center gap-3">
                  <div className={`h-8 w-8 rounded-xl ${b.bg} flex itemas-center justify-center`}>
                    <b.icon className={`h-4 w-4 ${b.color}`} />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-text-primary">{b.behavior}</p>
                    <span className={`text-[10px] font-medium ${
                      b.frequency === "High" ? "text-red-loss" :
                      b.frequency === "Medium" ? "text-yellow-warn" : "text-green-primary"
                    }`}>{b.frequency} frequency</span>
                  </div>
                </div>
                <span className={`text-[15px] font-bold tabular-numas ${b.impact.startsWith("+") ? "text-green-primary" : "text-red-loss"}`}>
                  {b.impact}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-text-muted italic text-center pb-2">Ã¢Å¡Â Ã¯Â¸Â Demo data Ã¢â‚¬â€ not real trading results.</p>
      </div>
    </div>}</AppShell>
  );
}




