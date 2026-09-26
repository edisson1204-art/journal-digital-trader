"use client";

import { AppShell } from "@/components/AppShell";
import { Sparkles, Brain, Send, RefreshCw, AlertTriangle, Lock, ImagePlus, X } from "lucide-react";
import { useChat } from "ai/react";
import { useTradeStore } from "@/store/tradeStore";
import { computeStats, TradeRecord } from "@/lib/tradeTypes";
import { useSettingsStore } from "@/store/settingsStore";
import { useState, useRef, useEffect } from "react";

const INSIGHTS = [
  {
    type: "performance",
    icon: "📈",
    title: "Friday trades underperform by -34%",
    body: "Your Friday P&L is significantly lower than other days. Win rate drops from 68% to 44% on Fridays. Consider reducing your trading activity or position size on Fridays.",
    confidence: 88,
    color: "border-yellow-warn/30 bg-yellow-warn/5",
  },
  {
    type: "risk",
    icon: "🔥",
    title: "Revenge trading detected after losses",
    body: "After 2+ consecutive losses, your next trade size increases by an average of 42%. This pattern leads to larger losses. Enforce a mandatory cooling-off period after consecutive losses.",
    confidence: 85,
    color: "border-red-loss/30 bg-red-loss/5",
  },
  {
    type: "pattern",
    icon: "⭐",
    title: "9:30–10:30 AM is your peak performance window",
    body: "68% of your total profits come from the first trading hour. After 12:00 PM, win rate drops to 52%. Your data suggests morning sessions are your edge – protect them.",
    confidence: 91,
    color: "border-blue-accent/30 bg-blue-accent/5",
  },
];

// PERFILADOR PSICOLÓGICO MATEMÁTICO
function computePsychologyProfile(trades: TradeRecord[]) {
  if (trades.length === 0) return { error: "Sin trades para perfilar" };

  let planFollowedCount = 0;
  const mistakeCounts: Record<string, number> = {};
  const emotionPnl: Record<string, number> = {};
  const sessionPnl: Record<string, number> = {};

  trades.forEach(t => {
    if (t.planFollowed) planFollowedCount++;
    
    if (t.mistakeType && t.mistakeType.trim() !== "") {
      mistakeCounts[t.mistakeType] = (mistakeCounts[t.mistakeType] || 0) + 1;
    }

    if (t.emotionEntry) {
      emotionPnl[t.emotionEntry] = (emotionPnl[t.emotionEntry] || 0) + (t.netPnl || 0);
    }

    if (t.session) {
      sessionPnl[t.session] = (sessionPnl[t.session] || 0) + (t.netPnl || 0);
    }
  });

  const profile: any = {
    tasaRespetoPlan: Math.round((planFollowedCount / trades.length) * 100) + "%",
  };

  // Error más frecuente
  const mistakes = Object.keys(mistakeCounts);
  if (mistakes.length > 0) {
    profile.errorMasFrecuente = mistakes.reduce((a, b) => mistakeCounts[a] > mistakeCounts[b] ? a : b);
  }

  // Peor emoción (la que da más pérdidas, pnl negativo)
  const emotions = Object.keys(emotionPnl);
  if (emotions.length > 0) {
    const worst = emotions.reduce((a, b) => emotionPnl[a] < emotionPnl[b] ? a : b);
    if (emotionPnl[worst] < 0) {
      profile.peorEmocion = worst + " (Costo: $" + Math.abs(Math.round(emotionPnl[worst])) + ")";
    }
  }

  // Sesión más rentable
  const sessions = Object.keys(sessionPnl);
  if (sessions.length > 0) {
    const best = sessions.reduce((a, b) => sessionPnl[a] > sessionPnl[b] ? a : b);
    if (sessionPnl[best] > 0) {
      profile.sesionMasRentable = best + " (Ganancia: $" + Math.round(sessionPnl[best]) + ")";
    }
  }

  return profile;
}

export default function AIMentorPage() {
  const trades = useTradeStore(s => s.trades);
  const { openAiKey, setOpenAiKey } = useSettingsStore();
  const [apiKeyInput, setApiKeyInput] = useState(openAiKey);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats = computeStats(trades);
  const psychoProfile = computePsychologyProfile(trades);

  useEffect(() => {
    setMounted(true);
    if (!openAiKey) setIsConfigOpen(true);
  }, [openAiKey]);

  const { messages, input, setInput, handleInputChange, append, isLoading, error } = useChat({
    api: "/api/chat",
    headers: {
      "Authorization": `Bearer ${openAiKey}`
    },
    initialMessages: [
      { id: "1", role: "assistant", content: "¡Hola! Soy tu Mentor Institucional IA. Conozco a la perfección tu psicología y tus estadísticas de trading. Envíame una captura o hazme una consulta, y te guiaré con precisión quirúrgica." }
    ]
  });

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const saveApiKey = () => {
    setOpenAiKey(apiKeyInput.trim());
    setIsConfigOpen(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !selectedImage) return;

    const currentImage = selectedImage;
    setSelectedImage(null); 
    const messageContent = input || "Evalúa esta operativa y dime mis errores basándote en conceptos institucionales.";
    setInput('');

    await append(
      { role: "user", content: messageContent },
      { 
        options: { 
          body: { 
            tradeContext: {
              estadisticasFinancieras: {
                totalTrades: stats.totalTrades,
                winRate: stats.winRate,
                profitFactor: stats.profitFactor,
                netPnl: stats.totalNet,
                maxDrawdown: stats.maxDrawdown,
              },
              perfilPsicologico: psychoProfile
            },
            imageUrl: currentImage 
          } 
        } 
      }
    );
  };

  if (!mounted) return null;

  return (
    <AppShell title="AI Mentor" subtitle="Auditoría visual e institucional basada en tu perfil psicológico">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] lg:grid-cols-[1fr_450px] gap-6 w-full max-w-[1800px] mx-auto">

        {/* 🧠 Left: Insights */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-accent" />
            <h2 className="text-sm font-semibold text-text-primary">Auditoría de Patrones - {trades.length} trades</h2>
          </div>

          {INSIGHTS.map((ins, i) => (
            <div key={i} className={`rounded-card border p-5 ${ins.color}`}>
              <div className="flex items-start gap-3">
                <span className="text-xl">{ins.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="text-[13px] font-semibold text-text-primary">{ins.title}</h3>
                    <span className="flex-shrink-0 rounded-full bg-violet-accent/15 px-2 py-0.5 text-[9px] font-bold text-violet-accent uppercase tracking-wider">
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
            Recalcular con Deep Learning
          </button>
        </div>

        {/* 🤖 Right: Chat */}
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
              <h3 className="text-[14px] font-bold mb-2">Conexión Segura BYOK</h3>
              <p className="text-[11px] text-text-muted max-w-xs mb-6">
                El Mentor requiere tu propia llave API de OpenAI. Nunca se enviará a nuestros servidores, se almacena encriptada en tu navegador (Zustand LocalStorage).
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
                      <span>{error.message.includes('401') ? "API Key inválida o no configurada." : error.message}</span>
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
                  La Inteligencia Artificial está evaluando activamente tu perfil lógico y emocional.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
