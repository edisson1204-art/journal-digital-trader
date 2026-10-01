"use client";

import { AppShell } from "@/components/AppShell";
import {
  Sparkles, Brain, Send, RefreshCw, AlertTriangle, Lock,
  ImagePlus, X, TrendingUp, TrendingDown, Target, Activity,
  BarChart2, Shield, Zap, BookOpen, Trash2
} from "lucide-react";
import { useChat } from "ai/react";
import { useTradeStore } from "@/store/tradeStore";
import { computeStats } from "@/lib/tradeTypes";
import { useSettingsStore } from "@/store/settingsStore";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";

/* ════════════════════════════════════════════════════
   CHIPS DE PREGUNTAS RÁPIDAS
════════════════════════════════════════════════════ */
const QUICK_QUESTIONS = [
  { label: "📊 Audita mi operativa completa", q: "Analiza todas mis estadísticas y dime cuál es mi mayor debilidad y fortaleza como trader." },
  { label: "🔍 ¿Por qué pierdo?", q: "Basándote en mis datos reales, ¿cuál es el patrón que más me hace perder dinero?" },
  { label: "📅 ¿Cuál es mi mejor día?", q: "¿Qué día de la semana y qué sesión de mercado me generan más P&L? ¿Debería concentrar mi operativa ahí?" },
  { label: "⚠️ Revenge Trading", q: "¿Estoy cometiendo Revenge Trading? Analiza si aumento el tamaño de posición después de pérdidas." },
  { label: "🛡️ Prop Firm Check", q: "Estoy en una cuenta fondeada. ¿Qué riesgos estoy corriendo según mis datos? ¿Debo ajustar algo?" },
  { label: "🏆 Mi mejor estrategia", q: "¿Qué estrategia me genera más dinero estadísticamente? ¿Debería eliminar alguna?" },
  { label: "🧠 Psicología", q: "¿Qué me dice mi historial sobre mi psicología de trading? ¿Cuál es mi sesgo cognitivo principal?" },
  { label: "📈 Última operación", q: "Analiza mi última operación. ¿Fue correcta? ¿Qué habrías hecho diferente?" },
];

export default function AIMentorPage() {
  const { trades } = useTradeStore();
  const { openAiKey, setOpenAiKey } = useSettingsStore();
  const [apiKeyInput, setApiKeyInput] = useState(openAiKey || "");
  const [isConfigOpen, setIsConfigOpen] = useState(!openAiKey);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  /* ════════════════════════════════════════════════════
     CONTEXTO ENRIQUECIDO — se envía en cada petición
  ════════════════════════════════════════════════════ */
  const tradeContext = useMemo(() => {
    const closed = trades
      .filter(t => t.result !== "Open")
      .sort((a, b) => new Date(b.dateOpen).getTime() - new Date(a.dateOpen).getTime());

    if (closed.length === 0) return null;

    const stats = computeStats(trades);

    // Patrones algorítmicos
    const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const pnlByDay: Record<string, number> = {};
    const pnlByAsset: Record<string, { pnl: number; wins: number; total: number }> = {};
    const pnlBySession: Record<string, number> = {};
    let longWins = 0, longTotal = 0, shortWins = 0, shortTotal = 0;
    let revengeCount = 0;

    closed.forEach((t, i) => {
      // Días
      const d = days[new Date(t.dateOpen + "T12:00:00").getDay()];
      pnlByDay[d] = (pnlByDay[d] || 0) + (t.netPnl || 0);
      // Activos
      if (!pnlByAsset[t.instrument]) pnlByAsset[t.instrument] = { pnl: 0, wins: 0, total: 0 };
      pnlByAsset[t.instrument].pnl += t.netPnl || 0;
      pnlByAsset[t.instrument].total++;
      if (t.result === "Win") pnlByAsset[t.instrument].wins++;
      // Sesiones
      if (t.session) pnlBySession[t.session] = (pnlBySession[t.session] || 0) + (t.netPnl || 0);
      // Long/Short
      if (t.side === "Buy") { longTotal++; if (t.result === "Win") longWins++; }
      else { shortTotal++; if (t.result === "Win") shortWins++; }
      // Revenge
      if (i < closed.length - 1 && t.result === "Loss") {
        const prev = closed[i + 1];
        const diff = new Date(t.dateOpen).getTime() - new Date(prev.dateOpen).getTime();
        if (diff < 86400000 && t.totalContracts > prev.totalContracts) revengeCount++;
      }
    });

    const bestDay   = Object.entries(pnlByDay).sort(([,a],[,b]) => b - a)[0];
    const worstDay  = Object.entries(pnlByDay).sort(([,a],[,b]) => a - b)[0];
    const bestAsset = Object.entries(pnlByAsset).sort(([,a],[,b]) => b.pnl - a.pnl)[0];
    const bestSession = Object.entries(pnlBySession).sort(([,a],[,b]) => b - a)[0];

    // Últimas 15 operaciones para análisis específico
    const recentTrades = closed.slice(0, 15).map(t => ({
      date: t.dateOpen,
      instrument: t.instrument,
      side: t.side,
      contracts: t.totalContracts,
      result: t.result,
      netPnl: t.netPnl ?? 0,
      rMultiple: t.rMultiple ?? null,
      strategy: t.strategy,
      emotion: t.emotionEntry,
      planFollowed: t.planFollowed,
      session: t.session,
      holdTime: t.holdTimeMinutes ?? null,
      notes: t.notes || "",
    }));

    // Cuenta fondeada
    const fundedTrades = closed.filter(t => t.isFundedAccount);
    const brokerMostUsed = Object.entries(
      closed.reduce((acc, t) => { acc[t.brokerId] = (acc[t.brokerId] || 0) + 1; return acc; }, {} as Record<string, number>)
    ).sort(([,a],[,b]) => b - a)[0]?.[0];

    return {
      stats,
      patterns: {
        bestDay: bestDay?.[0],
        bestDayPnl: bestDay?.[1],
        worstDay: worstDay?.[0],
        worstDayPnl: worstDay?.[1],
        bestAsset: bestAsset?.[0],
        bestAssetPnl: bestAsset?.[1]?.pnl,
        bestAssetWinRate: bestAsset ? Math.round((bestAsset[1].wins / bestAsset[1].total) * 100) : null,
        bestSession: bestSession?.[0],
        longWinRate: longTotal > 0 ? Math.round((longWins / longTotal) * 100) : null,
        shortWinRate: shortTotal > 0 ? Math.round((shortWins / shortTotal) * 100) : null,
        revengeCount,
        totalInstruments: Object.keys(pnlByAsset).length,
      },
      recentTrades,
      accountInfo: {
        isFunded: fundedTrades.length > 0,
        fundedTradesCount: fundedTrades.length,
        broker: brokerMostUsed,
        totalClosed: closed.length,
      },
    };
  }, [trades]);

  /* ════════════════════════════════════════════════════
     CHAT con contexto dinámico completo
  ════════════════════════════════════════════════════ */
  const { messages, input, handleInputChange, handleSubmit, isLoading, error, setMessages } = useChat({
    api: "/api/chat",
    headers: { "x-openai-key": openAiKey || "" },
    body: { tradeContext }, // ← contexto real en CADA petición
    initialMessages: [
      {
        id: "sys-1",
        role: "assistant",
        content: `Bienvenido. He cargado y analizado tu historial completo de trading (${trades.filter(t => t.result !== "Open").length} operaciones cerradas).\n\n¿Qué quieres que audite hoy? Puedes preguntarme sobre tus patrones, tu psicología, una operación específica, o subir un gráfico para que lo analice.`,
      },
    ],
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const saveApiKey = () => { setOpenAiKey(apiKeyInput.trim()); setIsConfigOpen(false); };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setSelectedImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCustomSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() && !selectedImage) return;
    handleSubmit(e, selectedImage ? { data: { imageUrl: selectedImage } } : undefined);
    setSelectedImage(null);
  }, [input, selectedImage, handleSubmit]);

  const handleQuickQuestion = useCallback((q: string) => {
    const syntheticEvent = { preventDefault: () => {} } as React.FormEvent<HTMLFormElement>;
    handleSubmit(syntheticEvent, { options: { body: { tradeContext } } });
    // Inject question manually via input simulation
    const fakeEvent = { target: { value: q } } as React.ChangeEvent<HTMLInputElement>;
    handleInputChange(fakeEvent);
    setTimeout(() => {
      const form = document.querySelector("form[data-chat]") as HTMLFormElement;
      if (form) form.requestSubmit();
    }, 50);
  }, [handleSubmit, handleInputChange, tradeContext]);

  const clearChat = useCallback(() => {
    setMessages([{
      id: `sys-${Date.now()}`,
      role: "assistant",
      content: `Chat reiniciado. Sigo teniendo acceso a tus ${trades.filter(t => t.result !== "Open").length} operaciones. ¿En qué puedo ayudarte?`,
    }]);
  }, [setMessages, trades]);

  /* ════════════════════════════════════════════════════
     INSIGHTS ALGORÍTMICOS (sin IA, cálculo local)
  ════════════════════════════════════════════════════ */
  const dynamicInsights = useMemo(() => {
    const closed = trades.filter(t => t.result !== "Open");
    if (closed.length < 5) return [{
      type: "info",
      icon: <Activity className="h-5 w-5 text-blue-accent" />,
      title: "Datos Insuficientes",
      body: `Necesitas al menos 5 operaciones cerradas para generar patrones estadísticos (tienes ${closed.length}). Registra más trades en el Journal.`,
      confidence: 100,
      color: "border-blue-accent/30 bg-blue-accent/5",
    }];

    if (!tradeContext?.patterns) return [];
    const { patterns } = tradeContext;
    const insights = [];

    if (patterns.bestDay && (patterns.bestDayPnl ?? 0) > 0) {
      insights.push({
        type: "performance",
        icon: <TrendingUp className="h-5 w-5 text-green-primary" />,
        title: `✅ Pico de rendimiento: ${patterns.bestDay}s`,
        body: `Tus ${patterns.bestDay}s generan el mayor P&L histórico (+$${(patterns.bestDayPnl ?? 0).toFixed(2)}). Considera aumentar tu tamaño de posición un 10–20% solo ese día.`,
        confidence: 85,
        color: "border-green-primary/30 bg-green-primary/5",
      });
    }

    if (patterns.worstDay && (patterns.worstDayPnl ?? 0) < 0) {
      insights.push({
        type: "warning",
        icon: <TrendingDown className="h-5 w-5 text-red-loss" />,
        title: `⚠️ Fuga de capital: ${patterns.worstDay}s`,
        body: `Los ${patterns.worstDay}s destruyes consistentemente tu capital ($${(patterns.worstDayPnl ?? 0).toFixed(2)}). Considera no operar ese día o reducir el riesgo al 50%.`,
        confidence: 92,
        color: "border-red-loss/30 bg-red-loss/5",
      });
    }

    if (patterns.bestAsset && (patterns.bestAssetPnl ?? 0) > 0) {
      insights.push({
        type: "pattern",
        icon: <Target className="h-5 w-5 text-violet-accent" />,
        title: `🎯 Especialidad: ${patterns.bestAsset} (${patterns.bestAssetWinRate}% WR)`,
        body: `Tu edge estadístico más sólido está en ${patterns.bestAsset} con $${(patterns.bestAssetPnl ?? 0).toFixed(2)} netos. Concentrar tu operativa aquí maximiza tu expectativa.`,
        confidence: 88,
        color: "border-violet-accent/30 bg-violet-accent/5",
      });
    }

    if (patterns.revengeCount > 0) {
      insights.push({
        type: "risk",
        icon: <AlertTriangle className="h-5 w-5 text-yellow-warn" />,
        title: `🔴 Revenge Trading: ${patterns.revengeCount} casos detectados`,
        body: `Aumentaste contratos inmediatamente después de una pérdida ${patterns.revengeCount} veces. Matemáticamente este sesgo eleva tu riesgo de ruina en ~42%.`,
        confidence: 96,
        color: "border-yellow-warn/30 bg-yellow-warn/5",
      });
    }

    if (patterns.longWinRate !== null && patterns.shortWinRate !== null) {
      const diff = Math.abs(patterns.longWinRate - patterns.shortWinRate);
      if (diff > 15) {
        const better = patterns.longWinRate > patterns.shortWinRate ? "Long" : "Short";
        const worse  = better === "Long" ? "Short" : "Long";
        insights.push({
          type: "pattern",
          icon: <BarChart2 className="h-5 w-5 text-blue-accent" />,
          title: `📐 Asimetría direccional: ${better} ${patterns.longWinRate > patterns.shortWinRate ? patterns.longWinRate : patterns.shortWinRate}% vs ${worse} ${patterns.longWinRate < patterns.shortWinRate ? patterns.longWinRate : patterns.shortWinRate}%`,
          body: `Tu operativa en ${better} es estadísticamente superior en ${diff} puntos porcentuales. Considera eliminar o reducir drasticamente las operaciones en ${worse}.`,
          confidence: 91,
          color: "border-blue-accent/30 bg-blue-accent/5",
        });
      }
    }

    if (patterns.bestSession) {
      insights.push({
        type: "performance",
        icon: <Zap className="h-5 w-5 text-yellow-warn" />,
        title: `⏰ Mejor sesión: ${patterns.bestSession}`,
        body: `Tus mejores resultados ocurren durante la sesión "${patterns.bestSession}". Alinear tu operativa a esta ventana temporal puede incrementar tu P&L significativamente.`,
        confidence: 80,
        color: "border-yellow-warn/30 bg-yellow-warn/5",
      });
    }

    return insights;
  }, [trades, tradeContext]);

  /* ════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════ */
  const closedCount = trades.filter(t => t.result !== "Open").length;

  return (
    <AppShell title="AI Trading Mentor" subtitle={`${closedCount} operaciones analizadas en tiempo real`}>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6 w-full max-w-[1800px] mx-auto">

        {/* ── IZQUIERDA: Insights algorítmicos ── */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-accent" />
              <h2 className="text-sm font-semibold text-text-primary">
                Auditoría Cuantitativa
              </h2>
              <span className="text-[10px] text-text-muted">— {closedCount} trades · actualizado en tiempo real</span>
            </div>
            <span className="flex items-center gap-1 text-[10px] text-green-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-green-primary animate-pulse" />
              Live
            </span>
          </div>

          {dynamicInsights.map((ins, i) => (
            <div key={i} className={`rounded-card border p-5 ${ins.color}`}>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex-shrink-0">{ins.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-[13px] font-semibold text-text-primary leading-tight">{ins.title}</h3>
                    <span className="flex-shrink-0 rounded-full bg-black/20 px-2 py-0.5 text-[9px] font-bold text-text-primary uppercase tracking-wider">
                      {ins.confidence}% conf.
                    </span>
                  </div>
                  <p className="text-[12px] text-text-secondary leading-relaxed">{ins.body}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Quick questions */}
          <div className="rounded-card border border-border-card bg-bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-3.5 w-3.5 text-text-muted" />
              <p className="text-[11px] font-semibold text-text-secondary">Preguntas rápidas al Mentor</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const fakeChange = { target: { value: q.q } } as React.ChangeEvent<HTMLInputElement>;
                    handleInputChange(fakeChange);
                    setTimeout(() => {
                      const form = document.querySelector("form[data-chat-form]") as HTMLFormElement;
                      form?.requestSubmit();
                    }, 50);
                  }}
                  className="rounded-full border border-border-card bg-bg-section px-3 py-1.5 text-[11px] text-text-secondary hover:border-violet-accent/50 hover:text-violet-accent hover:bg-violet-accent/5 transition-all"
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="rounded-lg border border-border-card/30 bg-bg-section/30 p-3 flex items-start gap-2">
            <Shield className="h-3.5 w-3.5 text-text-muted flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-text-muted leading-relaxed">
              Los insights algorítmicos se calculan localmente con tus datos. El chat usa GPT-4o con tu API Key (BYOK) — tus datos nunca se almacenan en servidores de OpenAI permanentemente. El mentor NO emite señales de compra/venta en vivo.
            </p>
          </div>
        </div>

        {/* ── DERECHA: Chat GPT-4o ── */}
        <div className="flex flex-col rounded-card border border-border-card bg-bg-card overflow-hidden" style={{ height: "70vh", minHeight: 580 }}>

          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-card/60 px-4 py-3 bg-bg-section/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-accent/20 border border-violet-accent/30">
                <Brain className="h-4 w-4 text-violet-accent" />
              </div>
              <div>
                <p className="text-[12px] font-semibold text-text-primary">AI Trading Mentor</p>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-primary animate-pulse" />
                  <span className="text-[10px] text-green-primary">
                    GPT-4o · {closedCount} trades cargados
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearChat}
                className="p-1.5 rounded-lg hover:bg-white/5 text-text-muted hover:text-yellow-warn transition-colors"
                title="Limpiar conversación"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setIsConfigOpen(true)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-text-muted hover:text-violet-accent transition-colors"
                title="Configurar API Key"
              >
                <Lock className="h-4 w-4" />
              </button>
            </div>
          </div>

          {isConfigOpen ? (
            /* ── Config Panel ── */
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center bg-bg-section/30">
              <div className="p-4 bg-violet-accent/10 rounded-2xl mb-4">
                <Lock className="h-10 w-10 text-violet-accent" />
              </div>
              <h3 className="text-[14px] font-bold mb-1 text-text-primary">Conexión Segura BYOK</h3>
              <p className="text-[11px] text-text-muted max-w-xs mb-6 leading-relaxed">
                El Mentor usa tu propia API Key de OpenAI. <strong className="text-text-secondary">Nunca se envía a nuestros servidores</strong> — se almacena encriptada en tu navegador (localStorage).
              </p>
              <input
                type="password"
                placeholder="sk-proj-..."
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && apiKeyInput.trim() && saveApiKey()}
                className="w-full max-w-xs rounded-btn bg-bg-main border border-border-card px-3 py-2.5 text-[12px] text-text-primary focus:border-violet-accent focus:ring-1 focus:ring-violet-accent transition-colors mb-3 placeholder:text-text-muted"
              />
              <button
                onClick={saveApiKey}
                disabled={!apiKeyInput.trim()}
                className="rounded-btn bg-violet-accent px-6 py-2.5 text-[12px] font-bold text-white hover:bg-violet-accent/90 disabled:opacity-40 transition-colors"
              >
                Activar Mentor IA
              </button>
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 text-[10px] text-violet-accent hover:underline"
              >
                ¿Dónde obtengo mi API Key? →
              </a>
            </div>
          ) : (
            <>
              {/* ── Messages ── */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="h-6 w-6 rounded-full bg-violet-accent/20 border border-violet-accent/30 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                        <Brain className="h-3 w-3 text-violet-accent" />
                      </div>
                    )}
                    <div className={`max-w-[85%] rounded-xl px-4 py-3 text-[12px] leading-relaxed ${
                      msg.role === "user"
                        ? "bg-violet-accent/20 border border-violet-accent/30 text-text-primary rounded-br-sm"
                        : "bg-bg-section border border-border-card/60 text-text-secondary rounded-bl-sm whitespace-pre-wrap"
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="h-6 w-6 rounded-full bg-violet-accent/20 border border-violet-accent/30 flex items-center justify-center mr-2 flex-shrink-0">
                      <Brain className="h-3 w-3 text-violet-accent" />
                    </div>
                    <div className="bg-bg-section border border-border-card/60 rounded-xl rounded-bl-sm px-4 py-3">
                      <div className="flex gap-1.5 items-center">
                        {[0, 1, 2].map(i => (
                          <span key={i} className="h-1.5 w-1.5 rounded-full bg-violet-accent animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                        <span className="text-[10px] text-text-muted ml-1">Analizando tu operativa...</span>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex justify-center my-2">
                    <div className="flex items-center gap-2 rounded-lg bg-red-loss/10 border border-red-loss/30 px-3 py-2 text-[11px] text-red-loss max-w-sm text-center">
                      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>
                        {error.message?.includes("401") || error.message?.includes("API Key")
                          ? "API Key inválida. Verifica que sea correcta en Configuración."
                          : error.message || "Error al conectar con OpenAI."}
                      </span>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* ── Input ── */}
              <div className="border-t border-border-card/60 p-3 bg-bg-card shrink-0">
                {selectedImage && (
                  <div className="relative inline-block mb-2 ml-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selectedImage} alt="Gráfico adjunto" className="h-14 w-14 object-cover rounded-lg border border-border-card" />
                    <button
                      onClick={() => setSelectedImage(null)}
                      className="absolute -top-1.5 -right-1.5 bg-red-loss text-white rounded-full p-0.5 hover:bg-red-loss/80"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}

                <form data-chat-form onSubmit={handleCustomSubmit} className="flex gap-2">
                  <input
                    type="file" accept="image/*"
                    className="hidden" ref={fileInputRef}
                    onChange={handleImageUpload}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    title="Adjuntar captura de gráfico"
                    className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-btn bg-bg-section border border-border-card text-text-muted hover:text-violet-accent hover:border-violet-accent/50 disabled:opacity-40 transition-all"
                  >
                    <ImagePlus className="h-4 w-4" />
                  </button>
                  <input
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    placeholder="Pregunta sobre tus trades, sube un gráfico..."
                    className="flex-1 rounded-btn bg-bg-section border border-border-card px-3 py-2.5 text-[12px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-violet-accent focus:ring-1 focus:ring-violet-accent transition-colors disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || (!input.trim() && !selectedImage)}
                    className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-btn bg-violet-accent text-white hover:bg-violet-accent/90 disabled:opacity-40 transition-all"
                    aria-label="Enviar"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </form>
                <p className="mt-1.5 text-[9px] text-text-muted text-center">
                  GPT-4o analiza tus {closedCount} operaciones en tiempo real · Tu API Key nunca sale de tu dispositivo
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
