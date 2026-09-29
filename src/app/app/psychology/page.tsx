"use client";

import { AppShell } from "@/components/AppShell";
import { useMemo } from "react";
import { useTradeStore } from "@/store/tradeStore";
import { HeartPulse, AlertTriangle, TrendingUp, Brain, Target, Clock } from "lucide-react";

/* ═══════════════════════════════════════════════════════
   MOTOR DE PSICOLOGÍA — 100% datos reales del tradeStore
═══════════════════════════════════════════════════════ */

export default function PsychologyPage() {
  const trades = useTradeStore(s => s.trades);
  const isHydrated = useTradeStore(s => s.isHydrated);

  const psych = useMemo(() => {
    const closed = trades.filter(t => t.result !== "Open");
    if (closed.length < 3) return null;

    // 1. Distribución de emociones (real)
    const emotionMap: Record<string, { count: number; pnl: number; wins: number }> = {};
    for (const t of closed) {
      const em = t.emotionEntry || "Neutral";
      if (!emotionMap[em]) emotionMap[em] = { count: 0, pnl: 0, wins: 0 };
      emotionMap[em].count++;
      emotionMap[em].pnl += t.netPnl || 0;
      if (t.result === "Win") emotionMap[em].wins++;
    }
    const emotions = Object.entries(emotionMap)
      .map(([label, d]) => ({
        label,
        count: d.count,
        pnl: d.pnl,
        winRate: Math.round((d.wins / d.count) * 100),
        pct: (d.count / closed.length) * 100,
      }))
      .sort((a, b) => b.count - a.count);

    // 2. Mejor y peor emoción por win rate (mínimo 2 trades)
    const emotionsWithSample = emotions.filter(e => e.count >= 2);
    const bestEmotion = emotionsWithSample.reduce((a, b) => a.winRate > b.winRate ? a : b, emotionsWithSample[0]);
    const worstEmotion = emotionsWithSample.reduce((a, b) => a.winRate < b.winRate ? a : b, emotionsWithSample[0]);

    // 3. P&L emocional: diferencia entre operar con mejor vs peor emoción
    const emotionalPnlDiff = bestEmotion && worstEmotion
      ? Math.round(bestEmotion.pnl - worstEmotion.pnl)
      : 0;

    // 4. Rendimiento por día de la semana (real)
    const DOW_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const dowMap: Record<number, { pnl: number; trades: number; wins: number }> = {};
    for (const t of closed) {
      const parts = t.dateOpen.split("-").map(Number);
      const dow = new Date(parts[0], parts[1] - 1, parts[2]).getDay();
      if (!dowMap[dow]) dowMap[dow] = { pnl: 0, trades: 0, wins: 0 };
      dowMap[dow].pnl += t.netPnl || 0;
      dowMap[dow].trades++;
      if (t.result === "Win") dowMap[dow].wins++;
    }
    const dowStats = Object.entries(dowMap)
      .map(([dow, d]) => ({
        day: DOW_NAMES[Number(dow)],
        dow: Number(dow),
        pnl: Math.round(d.pnl),
        trades: d.trades,
        wins: d.wins,
        winRate: Math.round((d.wins / d.trades) * 100),
      }))
      .sort((a, b) => a.dow - b.dow);

    const bestDay  = dowStats.reduce((a, b) => a.pnl > b.pnl ? a : b, dowStats[0]);
    const worstDay = dowStats.reduce((a, b) => a.pnl < b.pnl ? a : b, dowStats[0]);

    // 5. Plan follow rate (disciplina real)
    const planTrades = closed.filter(t => t.planFollowed !== undefined);
    const planFollowRate = planTrades.length
      ? Math.round((planTrades.filter(t => t.planFollowed).length / planTrades.length) * 100)
      : 0;

    // 6. Discipline Score compuesto (0-100)
    const winsTotal = closed.filter(t => t.result === "Win").length;
    const winRate = Math.round((winsTotal / closed.length) * 100);
    const disciplineScore = Math.round(
      planFollowRate * 0.4 +
      Math.min(winRate, 100) * 0.3 +
      Math.min(Math.max((100 - (worstDay ? Math.abs(worstDay.pnl) / 20 : 0)), 0), 100) * 0.3
    );

    // 7. Patrones de comportamiento reales detectados
    const behaviors: { behavior: string; detail: string; impact: string; positive: boolean }[] = [];

    // Revenge Trading: ¿opera con más contratos después de una pérdida?
    let revengeTrades = 0;
    for (let i = 1; i < closed.length; i++) {
      const prev = closed[i - 1];
      const curr = closed[i];
      if (prev.result === "Loss" && curr.totalContracts > prev.totalContracts * 1.3) {
        revengeTrades++;
      }
    }
    if (revengeTrades > 0) {
      const revPnl = closed.filter((_, i) => {
        if (i === 0) return false;
        return closed[i - 1].result === "Loss" && closed[i].totalContracts > closed[i - 1].totalContracts * 1.3;
      }).reduce((s, t) => s + (t.netPnl || 0), 0);
      behaviors.push({
        behavior: "Revenge Trading",
        detail: `Detectado ${revengeTrades} veces — subes posición tras pérdidas`,
        impact: `${revPnl >= 0 ? "+" : ""}$${Math.round(revPnl)}`,
        positive: revPnl > 0,
      });
    }

    // Sobreoperiación: días con más de 5 trades
    const dailyTrades: Record<string, number> = {};
    closed.forEach(t => { dailyTrades[t.dateOpen] = (dailyTrades[t.dateOpen] || 0) + 1; });
    const overTradingDays = Object.values(dailyTrades).filter(n => n > 5).length;
    if (overTradingDays > 0) {
      const overTradingPnl = closed
        .filter(t => (dailyTrades[t.dateOpen] || 0) > 5)
        .reduce((s, t) => s + (t.netPnl || 0), 0);
      behaviors.push({
        behavior: "Sobreoperación",
        detail: `${overTradingDays} días con más de 5 trades`,
        impact: `${overTradingPnl >= 0 ? "+" : ""}$${Math.round(overTradingPnl)}`,
        positive: overTradingPnl > 0,
      });
    }

    // Plan Follow impact
    if (planTrades.length >= 3) {
      const followedPnl = planTrades.filter(t => t.planFollowed).reduce((s, t) => s + (t.netPnl || 0), 0);
      const notFollowedPnl = planTrades.filter(t => !t.planFollowed).reduce((s, t) => s + (t.netPnl || 0), 0);
      behaviors.push({
        behavior: "Adherencia al Plan",
        detail: `${planFollowRate}% de trades siguiendo el plan`,
        impact: `Siguiendo: ${followedPnl >= 0 ? "+" : ""}$${Math.round(followedPnl)} | Sin plan: $${Math.round(notFollowedPnl)}`,
        positive: followedPnl > notFollowedPnl,
      });
    }

    // Best emotion trades
    if (bestEmotion) {
      behaviors.push({
        behavior: `Mejor Estado Mental: "${bestEmotion.label}"`,
        detail: `${bestEmotion.count} trades con ${bestEmotion.winRate}% win rate`,
        impact: `${bestEmotion.pnl >= 0 ? "+" : ""}$${Math.round(bestEmotion.pnl)}`,
        positive: bestEmotion.pnl > 0,
      });
    }

    return {
      emotions, bestEmotion, worstEmotion, emotionalPnlDiff,
      dowStats, bestDay, worstDay,
      planFollowRate, disciplineScore, winRate,
      behaviors, totalTrades: closed.length,
    };
  }, [trades]);

  if (!isHydrated) return null;

  // Estado vacío profesional
  if (!psych) {
    return (
      <AppShell title="Diario de Psicología" subtitle="Entiende tu comportamiento — mejora tu disciplina">
        <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
          <Brain className="h-14 w-14 text-text-muted" />
          <p className="text-[15px] font-semibold text-text-secondary">Aún no hay suficientes datos</p>
          <p className="text-[12px] text-text-muted max-w-xs">
            Registra al menos 3 operaciones cerradas para comenzar a ver tu análisis psicológico en tiempo real.
          </p>
        </div>
      </AppShell>
    );
  }

  const scoreColor = psych.disciplineScore >= 75 ? "text-green-primary"
    : psych.disciplineScore >= 50 ? "text-blue-accent"
    : psych.disciplineScore >= 30 ? "text-yellow-warn" : "text-red-loss";

  return (
    <AppShell title="Diario de Psicología" subtitle="Análisis conductual basado en tus operaciones reales">
      <div className="flex flex-col gap-5 w-full max-w-[1800px] mx-auto">

        {/* ── KPIs reales ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Discipline Score",
              value: `${psych.disciplineScore} / 100`,
              color: scoreColor,
              icon: HeartPulse,
              sub: psych.disciplineScore >= 70 ? "Excelente disciplina" : psych.disciplineScore >= 50 ? "Mejorable" : "Necesita atención",
            },
            {
              label: "Mejor Emoción",
              value: psych.bestEmotion?.label ?? "—",
              color: "text-green-primary",
              icon: TrendingUp,
              sub: psych.bestEmotion ? `${psych.bestEmotion.winRate}% win rate` : "",
            },
            {
              label: "Peor Día de la Semana",
              value: psych.worstDay?.day ?? "—",
              color: "text-red-loss",
              icon: AlertTriangle,
              sub: psych.worstDay ? `$${Math.round(psych.worstDay.pnl)} neto` : "",
            },
            {
              label: "P&L Emocional",
              value: `${psych.emotionalPnlDiff >= 0 ? "+" : ""}$${psych.emotionalPnlDiff}`,
              color: psych.emotionalPnlDiff >= 0 ? "text-green-primary" : "text-red-loss",
              icon: psych.emotionalPnlDiff >= 0 ? Target : AlertTriangle,
              sub: "Mejor vs peor estado mental",
            },
          ].map(({ label, value, color, icon: Icon, sub }) => (
            <div key={label} className="rounded-card border border-border-card bg-bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`h-3.5 w-3.5 ${color}`} />
                <p className="text-[10px] text-text-muted">{label}</p>
              </div>
              <p className={`text-[16px] font-bold ${color}`}>{value}</p>
              {sub && <p className="text-[10px] text-text-muted mt-0.5">{sub}</p>}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Rendimiento por día de la semana */}
          <div className="rounded-card border border-border-card bg-bg-card p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-1">P&L por Día de la Semana</h2>
            <p className="text-[11px] text-text-muted mb-5">Basado en {psych.totalTrades} operaciones reales</p>
            <div className="flex flex-col gap-3">
              {psych.dowStats.map(d => {
                const maxAbs = Math.max(...psych.dowStats.map(x => Math.abs(x.pnl)), 1);
                const barW = Math.min((Math.abs(d.pnl) / maxAbs) * 100, 100);
                return (
                  <div key={d.day} className="flex items-center gap-3">
                    <span className="text-[11px] text-text-muted w-8 flex-shrink-0 font-medium">{d.day}</span>
                    <div className="flex-1 h-5 bg-border-card rounded-full overflow-hidden relative">
                      <div
                        className={`h-full rounded-full transition-all ${d.pnl >= 0 ? "bg-green-primary/70" : "bg-red-loss/70"}`}
                        style={{ width: `${barW}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-text-muted w-12 text-right">{d.trades}T</span>
                    <span className={`text-[12px] font-bold tabular-nums w-20 text-right ${d.pnl >= 0 ? "text-green-primary" : "text-red-loss"}`}>
                      {d.pnl >= 0 ? "+" : ""}${d.pnl.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-3 border-t border-border-card/40 text-[10px] text-text-muted">
              📊 Mejor día: <strong className="text-green-primary">{psych.bestDay?.day}</strong> ({psych.bestDay?.winRate}% WR) ·
              Peor día: <strong className="text-red-loss">{psych.worstDay?.day}</strong> ({psych.worstDay?.winRate}% WR)
            </div>
          </div>

          {/* Distribución de emociones */}
          <div className="rounded-card border border-border-card bg-bg-card p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-1">Distribución de Emociones</h2>
            <p className="text-[11px] text-text-muted mb-5">Cómo te sentiste en cada operación real</p>
            <div className="flex flex-col gap-3">
              {psych.emotions.slice(0, 7).map(e => (
                <div key={e.label}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[12px] text-text-secondary font-medium">{e.label}</span>
                    <div className="flex items-center gap-2 text-[11px] text-text-muted">
                      <span className={`font-bold ${e.winRate >= 50 ? "text-green-primary" : "text-red-loss"}`}>{e.winRate}% WR</span>
                      <span>{e.count} trades ({e.pct.toFixed(0)}%)</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-border-card overflow-hidden">
                    <div
                      className={`h-full rounded-full ${e.winRate >= 60 ? "bg-green-primary" : e.winRate >= 40 ? "bg-blue-accent" : "bg-red-loss"}`}
                      style={{ width: `${e.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Patrones de comportamiento detectados */}
        <div className="rounded-card border border-border-card bg-bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border-card/60">
            <h2 className="text-sm font-semibold text-text-primary">Patrones de Comportamiento Detectados</h2>
            <p className="text-[11px] text-text-muted">Análisis algorítmico basado en tus {psych.totalTrades} operaciones reales</p>
          </div>
          {psych.behaviors.length === 0 ? (
            <p className="text-[12px] text-text-muted text-center py-8">No se detectaron patrones con la muestra actual. Continúa registrando trades.</p>
          ) : (
            <div className="divide-y divide-border-card/30">
              {psych.behaviors.map((b, i) => (
                <div key={i} className="flex items-start justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 ${b.positive ? "bg-green-primary/10" : "bg-red-loss/10"}`}>
                      {b.positive
                        ? <TrendingUp className={`h-4 w-4 text-green-primary`} />
                        : <AlertTriangle className={`h-4 w-4 text-red-loss`} />}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-text-primary">{b.behavior}</p>
                      <p className="text-[11px] text-text-muted mt-0.5">{b.detail}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`text-[13px] font-bold tabular-nums ${b.positive ? "text-green-primary" : "text-red-loss"}`}>
                      {b.impact}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Discipline Score visual */}
        <div className="rounded-card border border-border-card bg-bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Puntuación de Disciplina</h2>
              <p className="text-[11px] text-text-muted">Calculado de: adherencia al plan (40%), win rate (30%), consistencia (30%)</p>
            </div>
            <span className={`text-[32px] font-extrabold tabular-nums ${scoreColor}`}>{psych.disciplineScore}<span className="text-[16px] text-text-muted">/100</span></span>
          </div>
          <div className="h-4 rounded-full bg-border-card overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                psych.disciplineScore >= 75 ? "bg-green-primary" :
                psych.disciplineScore >= 50 ? "bg-blue-accent" :
                psych.disciplineScore >= 30 ? "bg-yellow-warn" : "bg-red-loss"
              }`}
              style={{ width: `${psych.disciplineScore}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-[9px] text-text-muted">
            <span>Plan Follow: {psych.planFollowRate}%</span>
            <span>Win Rate: {psych.winRate}%</span>
            <span>Score: {psych.disciplineScore}/100</span>
          </div>
        </div>

        <p className="text-[10px] text-text-muted italic text-center pb-1">
          ☁️ Todos los datos provienen de tus operaciones reales registradas en el Journal. Cero datos inventados.
        </p>
      </div>
    </AppShell>
  );
}
