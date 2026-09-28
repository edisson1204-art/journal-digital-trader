"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useSettingsStore } from "@/store/settingsStore";
import { useTradeStore } from "@/store/tradeStore";
import { Key, Eye, EyeOff, CheckCircle2, Globe, Shield, ExternalLink, BrainCircuit, AlertTriangle, Trash2 } from "lucide-react";

export default function SettingsPage() {
  const { openAiKey, setOpenAiKey, language, setLanguage } = useSettingsStore();
  const clearTrades = useTradeStore(s => s.clearTrades);
  
  // Local state for the API key input to allow editing before saving
  const [keyInput, setKeyInput] = useState(openAiKey);
  const [showKey, setShowKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveKey = () => {
    setOpenAiKey(keyInput.trim());
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000); // Hide success message after 3s
  };

  const handleResetTrades = () => {
    const isConfirmed = window.confirm(
      "🛑 ATENCIÓN: Estás a punto de BORRAR TODAS TUS OPERACIONES.\n\nEsta acción es irreversible. Todos tus reportes, estadísticas y balances regresarán a 0.\n\n¿Estás absolutamente seguro de querer empezar desde cero?"
    );
    if (isConfirmed) {
      clearTrades();
      alert("✅ Historial borrado exitosamente. Tu cuenta ahora está limpia.");
    }
  };

  return (
    <AppShell title="Configuración del Sistema" subtitle="Preferencias, idioma y seguridad">
      <div className="max-w-[800px] mx-auto flex flex-col gap-8 w-full mt-4">
        
        {/* ─── AI Mentor BYOK Section ─── */}
        <section className="rounded-card border border-border-card bg-bg-card overflow-hidden">
          <div className="p-6 border-b border-border-card/60 bg-bg-section/30 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-violet-accent/10 border border-violet-accent/20">
              <BrainCircuit className="h-5 w-5 text-violet-accent" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-text-primary tracking-tight">Motor de Inteligencia Artificial</h2>
              <p className="text-[12px] text-text-muted mt-0.5">Modelo BYOK (Bring Your Own Key) para privacidad absoluta</p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex items-start gap-4 p-4 rounded-xl border border-blue-accent/20 bg-blue-accent/5">
              <Shield className="h-5 w-5 text-blue-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[13px] font-bold text-text-secondary mb-1">Privacidad y Seguridad Garantizada</p>
                <p className="text-[12px] text-text-muted leading-relaxed">
                  Para proteger tus datos financieros y ahorrar en suscripciones costosas, operamos bajo el estándar BYOK. 
                  Tu <b>API Key de OpenAI</b> se encripta y guarda exclusivamente en el almacenamiento local de tu navegador. 
                  Ningún servidor externo (ni nosotros) tiene acceso a tu llave ni a tu facturación.
                </p>
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-accent hover:underline mt-3">
                  Obtener mi API Key en OpenAI <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-bold text-text-secondary mb-2 uppercase tracking-wider">
                OpenAI API Key (ChatGPT)
              </label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Key className="h-4 w-4 text-text-muted" />
                  </div>
                  <input
                    type={showKey ? "text" : "password"}
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="sk-proj-..."
                    className="w-full rounded-lg bg-bg-section border border-border-card pl-10 pr-10 py-3 text-[13px] text-text-primary font-mono focus:outline-none focus:border-violet-accent transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-primary transition-colors"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <button
                  onClick={handleSaveKey}
                  className="px-6 rounded-lg bg-violet-accent hover:bg-violet-accent/90 text-white text-[13px] font-bold transition-all flex items-center gap-2 shadow-sm"
                >
                  {isSaved ? <><CheckCircle2 className="h-4 w-4" /> Guardada</> : "Guardar Llave"}
                </button>
              </div>
              <p className="text-[11px] text-text-muted mt-2">
                Recomendamos utilizar una llave vinculada a los modelos <b>GPT-4o</b> o <b>GPT-4o-mini</b> para un análisis de gráficos óptimo.
              </p>
            </div>
          </div>
        </section>

        {/* ─── Preferences Section ─── */}
        <section className="rounded-card border border-border-card bg-bg-card overflow-hidden">
          <div className="p-6 border-b border-border-card/60 bg-bg-section/30 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-border-card/50 border border-border-card">
              <Globe className="h-5 w-5 text-text-secondary" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-text-primary tracking-tight">Preferencias del Sistema</h2>
              <p className="text-[12px] text-text-muted mt-0.5">Idioma y formatos de visualización</p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="block text-[12px] font-bold text-text-secondary mb-3 uppercase tracking-wider">
                Idioma de la Interfaz
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setLanguage("es")}
                  className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                    language === "es" 
                      ? "border-green-primary bg-green-primary/5 shadow-green-glow-sm" 
                      : "border-border-card bg-bg-section hover:border-green-primary/50"
                  }`}
                >
                  <span className="text-2xl">🇪🇸</span>
                  <span className={`text-[13px] font-bold ${language === "es" ? "text-green-primary" : "text-text-secondary"}`}>
                    Español
                  </span>
                </button>
                <button
                  onClick={() => setLanguage("en")}
                  className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                    language === "en" 
                      ? "border-green-primary bg-green-primary/5 shadow-green-glow-sm" 
                      : "border-border-card bg-bg-section hover:border-green-primary/50"
                  }`}
                >
                  <span className="text-2xl">🇺🇸</span>
                  <span className={`text-[13px] font-bold ${language === "en" ? "text-green-primary" : "text-text-secondary"}`}>
                    English
                  </span>
                </button>
              </div>
              <p className="text-[11px] text-text-muted mt-3">
                * El cambio de idioma es instantáneo. Actualmente soporta el menú lateral y los componentes principales.
              </p>
            </div>
          </div>
        </section>

        {/* ─── Danger Zone ─── */}
        <section className="rounded-card border border-red-500/20 bg-red-500/5 overflow-hidden">
          <div className="p-6 border-b border-red-500/10 flex items-center gap-3 bg-red-500/10">
            <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-red-500 tracking-tight">Zona de Peligro</h2>
              <p className="text-[12px] text-red-500/80 mt-0.5">Acciones irreversibles sobre tu cuenta</p>
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-bold text-text-primary mb-1">Borrar Historial de Operaciones</p>
                <p className="text-[12px] text-text-muted max-w-lg">
                  Esto eliminará permanentemente todos tus trades, regresando el balance, los reportes PDF y el simulador a 0. 
                  Usar solo si deseas iniciar una bitácora nueva.
                </p>
              </div>
              <button 
                onClick={handleResetTrades}
                className="ml-4 px-6 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-[13px] font-bold transition-all flex shrink-0 items-center gap-2 shadow-sm"
              >
                <Trash2 className="h-4 w-4" /> Resetear Cuenta
              </button>
            </div>
          </div>
        </section>

      </div>
    </AppShell>
  );
}
