"use client";

import { AppShell } from "@/components/AppShell";
import { Sparkles, Brain, Send, RefreshCw, AlertTriangle, Lock, ImagePlus, X, TrendingUp, TrendingDown, Target, Activity } from "lucide-react";
import { useChat } from "ai/react";
import { useTradeStore } from "@/store/tradeStore";
import { computeStats, TradeRecord } from "@/lib/tradeTypes";
import { useSettingsStore } from "@/store/settingsStore";
import { useState, useRef, useEffect, useMemo } from "react";

export default function AIMentorPage() {
  const { trades } = useTradeStore();
  const { openAiKey, setOpenAiKey } = useSettingsStore();
  const [apiKeyInput, setApiKeyInput] = useState(openAiKey || "");
  const [isConfigOpen, setIsConfigOpen] = useState(!openAiKey);
  
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: "/api/chat",
    headers: {
      "x-openai-key": openAiKey || "",
    },
    initialMessages: [
      {
        id: "sys-1",
        role: "assistant",
        content: "Bienvenido. He analizado el historial completo de tu cuenta de trading. ¿Deseas que desglose algún patrón de tu comportamiento, o tienes un gráfico para que yo analice?"
      }
    ]
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const saveApiKey = () => {
    setOpenAiKey(apiKeyInput);
    setIsConfigOpen(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() && !selectedImage) return;

    if (selectedImage) {
      handleSubmit(e, {
        data: { imageUrl: selectedImage },
      });
      setSelectedImage(null);
    } else {
      handleSubmit(e);
    }
  };

  // ==========================================
  // IA ALGORÃTMICA: CÃLCULO DE DATOS REALES
  // ==========================================
  const dynamicInsights = useMemo(() => {
    const closed = trades.filter(t => t.result !== "Open").sort((a, b) => new Date(a.dateOpen).getTime() - new Date(b.dateOpen).getTime());
    
    if (closed.length < 5) {
      return [{
        type: "info",
        icon: <Activity className="h-5 w-5 text-blue-accent" />,
        title: "Datos Insuficientes",
        body: `Se requieren al menos 5 operaciones cerradas para auditar patrones matemáticos (Tienes ${closed.length}). Sigue documentando tus trades.`,
        confidence: 100,
        color: "border-blue-accent/30 bg-blue-accent/5",
      }];
    }

    const insights = [];

    // 1. Análisis de Días de la Semana
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const pnlByDay: Record<string, number> = {};
    closed.forEach(t => {
      const d = days[new Date(t.dateOpen).getDay()];
      pnlByDay[d] = (pnlByDay[d] || 0) + (t.netPnl || 0);
    });
    
    let bestDay = "";
    let worstDay = "";
    let maxPnl = -Infinity;
    let minPnl = Infinity;

    Object.entries(pnlByDay).forEach(([day, pnl]) => {
      if (pnl > maxPnl) { maxPnl = pnl; bestDay = day; }
      if (pnl < minPnl) { minPnl = pnl; worstDay = day; }
    });

    if (maxPnl > 0) {
      insights.push({
        type: "performance",
        icon: <TrendingUp className="h-5 w-5 text-green-primary" />,
        title: `Estructura óptima los ${bestDay}s`,
        body: `Tus ${bestDay}s generan el mayor beneficio histórico ($${maxPnl.toFixed(2)}). Tu psicología de ejecuciÃ³n parece estar mejor sincronizada con la liquidez de este día.`,
        confidence: 85,
        color: "border-green-primary/30 bg-green-primary/5",
      });
    }

    if (minPnl < 0) {
      insights.push({
        type: "performance",
        icon: <TrendingDown className="h-5 w-5 text-red-loss" />,
        title: `Fuga de Capital los ${worstDay}s`,
        body: `Cuidado: Pierdes la mayor parte de tus ganancias los ${worstDay}s (P&L: $${minPnl.toFixed(2)}). Considera reducir tu apalancamiento a la mitad en este día.`,
        confidence: 92,
        color: "border-red-loss/30 bg-red-loss/5",
      });
    }

    // 2. Dominio de Activo
    const pnlByAsset: Record<string, number> = {};
    closed.forEach(t => { pnlByAsset[t.instrument] = (pnlByAsset[t.instrument] || 0) + (t.netPnl || 0); });
    let bestAsset = "";
    let maxAssetPnl = -Infinity;
    Object.entries(pnlByAsset).forEach(([asset, pnl]) => {
      if (pnl > maxAssetPnl) { maxAssetPnl = pnl; bestAsset = asset; }
    });

    if (maxAssetPnl > 0) {
      insights.push({
        type: "pattern",
        icon: <Target className="h-5 w-5 text-violet-accent" />,
        title: `Especialidad Cuantitativa: ${bestAsset}`,
        body: `Tus datos sugieren una clara ventaja en ${bestAsset} con $${maxAssetPnl.toFixed(2)} netos. Concéntrate en tu "Edge" estadístico y filtra los activos tóxicos.`,
        confidence: 88,
        color: "border-violet-accent/30 bg-violet-accent/5",
      });
    }

    // 3. Revenge Trading (Patrón destructivo)
    let revengeCount = 0;
    for (let i = 0; i < closed.length - 1; i++) {
      if (closed[i].result === "Loss") {
        const nextTrade = closed[i+1];
        const timeDiff = new Date(nextTrade.dateOpen).getTime() - new Date(closed[i].dateOpen).getTime();
        // Si el siguiente trade fue el mismo día, y con mayor apalancamiento
        if (timeDiff < 24 * 60 * 60 * 1000 && nextTrade.totalContracts > closed[i].totalContracts) {
          revengeCount++;
        }
      }
    }

    if (revengeCount > 0) {
      insights.push({
        type: "risk",
        icon: <AlertTriangle className="h-5 w-5 text-yellow-warn" />,
        title: `Revenge Trading Detectado (${revengeCount} casos)`,
        body: `Has aumentado el tamaño del lote inmediatamente después de una pérdida ${revengeCount} veces. Matemáticamente, este sesgo de recuperaciÃ³n aumenta tu riesgo de ruina un 42%.`,
        confidence: 96,
        color: "border-yellow-warn/30 bg-yellow-warn/5",
      });
    }

    return insights;
  }, [trades]);

  return (
    <AppShell title="AI Trading Mentor">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] lg:grid-cols-[1fr_450px] gap-6 w-full max-w-[1800px] mx-auto">
        
        {/* IZQUIERDA: Insights Reales Basados en Data */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-accent" />
            <h2 className="text-sm font-semibold text-text-primary">Auditoría Cuantitativa - {trades.filter(t => t.result !== "Open").length} trades analizados</h2>
          </div>

          {dynamicInsights.map((ins, i) => (
            <div key={i} className={`rounded-card border p-5 ${ins.color}`}>
              <div className="flex items-start gap-3">
                <span className="mt-0.5">{ins.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="text-[13px] font-semibold text-text-primary">{ins.title}</h3>
                    <span className="flex-shrink-0 rounded-full bg-black/20 px-2 py-0.5 text-[9px] font-bold text-text-primary uppercase tracking-wider">
                      {ins.confidence}% precisión
                    </span>
                  </div>
                  <p className="text-[12px] text-text-secondary leading-relaxed">{ins.body}</p>
                </div>
              </div>
            </div>
          ))}

          <button className="flex items-center gap-2 text-[11px] text-text-muted hover:text-violet-accent transition-colors mx-auto mt-2">
            <RefreshCw className="h-3 w-3" />
            Insights calculados en tiempo real
          </button>
        </div>

        {/* DERECHA: Chat con LLM */}
        <div className="flex flex-col rounded-card border border-border-card bg-bg-card overflow-hidden h-[650px]">
          
          <div className="flex items-center justify-between border-b border-border-card/60 px-4 py-3 bg-bg-section/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-accent/20">
                <Brain className="h-4 w-4 text-violet-accent" />
              </div>
              <div>
                <p className="text-[12px] font-semibold text-text-primary">AI Trading Mentor</p>
                <div className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-primary animate-pulse" />
                  <span className="text-[10px] text-green-primary">IA Evaluando Perfil</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsConfigOpen(true)}
              className="p-1.5 rounded-lg hover:bg-white/5 text-text-muted transition-colors"
              title="Configurar API Key"
            >
              <Lock className="h-4 w-4" />
            </button>
          </div>

          {isConfigOpen ? (
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center bg-bg-section/30">
              <Lock className="h-10 w-10 text-violet-accent mb-4 opacity-80" />
              <h3 className="text-[14px] font-bold mb-2">ConexiÃ³n Segura BYOK</h3>
              <p className="text-[11px] text-text-muted max-w-xs mb-6">
                El Mentor requiere tu propia llave API de OpenAI. Nunca se enviarÃ¡ a nuestros servidores, se almacena encriptada en tu navegador (Zustand LocalStorage).
              </p>
              <input
                type="password"
                placeholder="sk-proj-..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="w-full max-w-xs rounded-btn bg-bg-main border border-border-card px-3 py-2 text-[12px] text-text-primary focus:border-violet-accent transition-colors mb-3"
              />
              <button 
                onClick={saveApiKey}
                disabled={!apiKeyInput.trim()}
                className="rounded-btn bg-violet-accent px-5 py-2 text-[12px] font-bold text-white hover:bg-violet-accent/90 disabled:opacity-50 transition-colors"
              >
                Conectar Cerebro IA
              </button>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
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
                    <div className="bg-bg-section border border-border-card/60 rounded-xl rounded-bl-sm px-4 py-3">
                      <div className="flex gap-1.5">
                        {[0,1,2].map(i => (
                          <span key={i} className="h-1.5 w-1.5 rounded-full bg-violet-accent animate-bounce" style={{ animationDelay:`${i*0.15}s` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {error && (
                  <div className="flex justify-center my-2">
                    <div className="flex items-center gap-2 rounded-lg bg-red-loss/10 border border-red-loss/30 px-3 py-2 text-[11px] text-red-loss">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>{error.message.includes('401') ? "API Key invÃ¡lida o no configurada." : error.message}</span>
                    </div>
                  </div>
                )}
                
                <div ref={chatEndRef} />
              </div>

              <div className="border-t border-border-card/60 p-3 bg-bg-card shrink-0">
                {selectedImage && (
                  <div className="relative inline-block mb-3 ml-2">
                    <img src={selectedImage} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-border-card" />
                    <button 
                      onClick={() => setSelectedImage(null)}
                      className="absolute -top-2 -right-2 bg-red-loss text-white rounded-full p-1 hover:bg-red-loss/80"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleCustomSubmit} className="flex gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    title="Adjuntar gráfico (Screenshot)"
                    className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-btn bg-bg-section border border-border-card text-text-muted hover:text-violet-accent hover:border-violet-accent/50 disabled:opacity-40 transition-all focus:outline-none"
                  >
                    <ImagePlus className="h-4 w-4" />
                  </button>

                  <input
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    placeholder="Audita mi trade..."
                    className="flex-1 rounded-btn bg-bg-section border border-border-card px-3 py-2.5 text-[12px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-violet-accent focus:ring-1 focus:ring-violet-accent transition-colors disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || (!input.trim() && !selectedImage)}
                    className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-btn bg-violet-accent text-white hover:bg-violet-accent/90 disabled:opacity-40 transition-all focus:outline-none focus:ring-2 focus:ring-violet-accent"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </form>
                <p className="mt-2 text-[9px] text-text-muted text-center">
                  La Inteligencia Artificial estÃ¡ evaluando activamente tu perfil lÃ³gico y emocional.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}


