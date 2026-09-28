"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { 
  BookOpen, PlayCircle, Cpu, Brain, FileText, 
  CheckCircle2, ArrowRight, Lightbulb, Key, 
  Target, BarChart2 
} from "lucide-react";

const GUIDE_MODULES = [
  {
    id: "journal",
    title: "1. Registrar Operaciones (Diario)",
    icon: BookOpen,
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
    content: (
      <div className="space-y-4">
        <p className="text-[14px] text-text-secondary leading-relaxed">
          El Diario (Journal) es el corazón de tu progreso. Aquí debes registrar cada operación que realizas en el mercado para que la Inteligencia artificial pueda analizarte.
        </p>
        <ul className="space-y-3 mt-4">
          <li className="flex gap-3 text-[13px] text-text-primary items-start">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <span>Ve a la sección <b>Diario</b> y haz clic en "Añadir Trade".</span>
          </li>
          <li className="flex gap-3 text-[13px] text-text-primary items-start">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <span>Llena los datos matemáticos: P&L (Ganancia o Pérdida), Riesgo asumido e Instrumento operado.</span>
          </li>
          <li className="flex gap-3 text-[13px] text-text-primary items-start">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <span><b>Paso Clave:</b> Sube una captura de pantalla de tu gráfico (TradingView/NinjaTrader) para que el Mentor IA pueda ver tu análisis técnico visualmente.</span>
          </li>
        </ul>
      </div>
    )
  },
  {
    id: "simulator",
    title: "2. Utilizar el Simulador de Riesgo",
    icon: Cpu,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    content: (
      <div className="space-y-4">
        <p className="text-[14px] text-text-secondary leading-relaxed">
          Antes de fondear una cuenta real, debes comprobar matemáticamente si tu estrategia funciona a largo plazo. Para eso sirve el Simulador Monte Carlo.
        </p>
        <ul className="space-y-3 mt-4">
          <li className="flex gap-3 text-[13px] text-text-primary items-start">
            <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <span>Ve al <b>Simulador</b> e ingresa el tamaño de la cuenta que quieres fondear (Ej. $100,000).</span>
          </li>
          <li className="flex gap-3 text-[13px] text-text-primary items-start">
            <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <span>Coloca tu Win Rate (Tasa de Acierto) y tu Riesgo:Beneficio promedio.</span>
          </li>
          <li className="flex gap-3 text-[13px] text-text-primary items-start">
            <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <span>Haz clic en "Correr Simulación". El algoritmo proyectará 1,000 operaciones futuras y te dirá tu <b>Riesgo de Ruina</b> (Probabilidad de quemar la cuenta).</span>
          </li>
        </ul>
      </div>
    )
  },
  {
    id: "mentor",
    title: "3. Conversar con el Mentor IA",
    icon: Brain,
    color: "text-violet-400",
    bgColor: "bg-violet-400/10",
    content: (
      <div className="space-y-4">
        <p className="text-[14px] text-text-secondary leading-relaxed">
          Tu Mentor IA es un analista de Wall Street en tu bolsillo. Está entrenado con conceptos institucionales (ICT, SMC, Wyckoff).
        </p>
        <div className="bg-bg-section border border-border-card p-4 rounded-lg my-2">
          <p className="text-[12px] font-bold text-amber-500 flex items-center gap-2 mb-2">
            <Key className="h-4 w-4" /> REQUISITO PREVIO (BYOK)
          </p>
          <p className="text-[12px] text-text-secondary">
            Para que la IA funcione, debes ir a <b>Settings (Configuración)</b> y pegar tu propia API Key de OpenAI. Esto asegura privacidad total y costos ultra bajos.
          </p>
        </div>
        <ul className="space-y-3 mt-4">
          <li className="flex gap-3 text-[13px] text-text-primary items-start">
            <CheckCircle2 className="h-4 w-4 text-violet-500 mt-0.5 flex-shrink-0" />
            <span>Pídele al Mentor que analice tu último trade. Él leerá la captura de pantalla que subiste en el Diario.</span>
          </li>
          <li className="flex gap-3 text-[13px] text-text-primary items-start">
            <CheckCircle2 className="h-4 w-4 text-violet-500 mt-0.5 flex-shrink-0" />
            <span>Pídele que te "regañe" si rompiste tus reglas. La IA conoce tu perfil psicológico.</span>
          </li>
        </ul>
      </div>
    )
  },
  {
    id: "reports",
    title: "4. Generar Reportes y Auditorías",
    icon: FileText,
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
    content: (
      <div className="space-y-4">
        <p className="text-[14px] text-text-secondary leading-relaxed">
          Cuando termine el mes, debes exportar tus resultados para compartirlos con inversores, empresas de fondeo o para tu propia declaración de impuestos.
        </p>
        <ul className="space-y-3 mt-4">
          <li className="flex gap-3 text-[13px] text-text-primary items-start">
            <CheckCircle2 className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <span>Ve a la sección de <b>Reportes</b>.</span>
          </li>
          <li className="flex gap-3 text-[13px] text-text-primary items-start">
            <CheckCircle2 className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <span>Elige el periodo (Mensual, Semestral o Anual).</span>
          </li>
          <li className="flex gap-3 text-[13px] text-text-primary items-start">
            <CheckCircle2 className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <span>Elige el tipo de Reporte (El "Quant" es el más profundo, revela tu edge matemático). Haz clic en Generar e <b>Imprímelo como PDF</b>.</span>
          </li>
        </ul>
      </div>
    )
  }
];

export default function GuidePage() {
  const [activeModule, setActiveModule] = useState(GUIDE_MODULES[0].id);

  return (
    <AppShell 
      title="Centro de Entrenamiento" 
      subtitle="Guía inteligente para dominar Journal Digital Trader Invest SaaS"
    >
      <div className="flex flex-col lg:flex-row gap-8 max-w-[1200px] mx-auto w-full">
        
        {/* Left Column: Navigation / Video Placeholder */}
        <div className="w-full lg:w-[400px] flex flex-col gap-6">
          {/* Welcome Card */}
          <div className="rounded-card border border-border-card bg-bg-card p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-primary/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
            <Lightbulb className="h-8 w-8 text-green-primary mb-4" />
            <h2 className="text-[18px] font-bold text-text-primary mb-2">Bienvenido a Bordo</h2>
            <p className="text-[13px] text-text-secondary leading-relaxed">
              Esta plataforma fue diseñada por y para traders institucionales. Sigue esta guía paso a paso para sacarle el máximo provecho a tus algoritmos.
            </p>
          </div>

          {/* Module Selector */}
          <div className="rounded-card border border-border-card bg-bg-card flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border-card bg-bg-section/50">
              <p className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Temario Interactivo</p>
            </div>
            <div className="flex flex-col p-2 gap-1">
              {GUIDE_MODULES.map((mod) => (
                <button
                  key={mod.id}
                  onClick={() => setActiveModule(mod.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                    activeModule === mod.id 
                      ? "bg-white/5 border border-white/10 shadow-sm" 
                      : "hover:bg-white/[0.02] border border-transparent"
                  }`}
                >
                  <div className={`p-2 rounded-md flex-shrink-0 ${activeModule === mod.id ? mod.bgColor : "bg-bg-section"}`}>
                    <mod.icon className={`h-4 w-4 ${activeModule === mod.id ? mod.color : "text-text-muted"}`} />
                  </div>
                  <span className={`text-[13px] font-medium ${activeModule === mod.id ? "text-white" : "text-text-secondary"}`}>
                    {mod.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Content Display */}
        <div className="flex-1 flex flex-col">
          {GUIDE_MODULES.map((mod) => (
            <div 
              key={mod.id}
              className={`rounded-card border border-border-card bg-bg-card p-8 h-full transition-opacity duration-300 ${
                activeModule === mod.id ? "block animate-in fade-in slide-in-from-bottom-2" : "hidden"
              }`}
            >
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-border-card">
                <div className={`p-4 rounded-xl ${mod.bgColor}`}>
                  <mod.icon className={`h-8 w-8 ${mod.color}`} />
                </div>
                <div>
                  <p className="text-[12px] font-bold uppercase tracking-widest text-text-muted mb-1">Módulo de Estudio</p>
                  <h1 className="text-2xl font-black text-text-primary tracking-tight">{mod.title}</h1>
                </div>
              </div>
              
              <div className="prose prose-invert max-w-none">
                {mod.content}
              </div>

              {/* Video Placeholder */}
              <div className="mt-10 rounded-xl border border-border-card bg-bg-section aspect-video flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer hover:border-green-primary/50 transition-colors">
                <div className="absolute inset-0 bg-gradient-to-t from-bg-main/80 to-transparent z-10" />
                <div className="absolute inset-0 flex items-center justify-center z-20">
                  <div className="h-16 w-16 rounded-full bg-green-primary/20 flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
                    <PlayCircle className="h-8 w-8 text-green-primary ml-1" />
                  </div>
                </div>
                <div className="absolute bottom-4 left-4 z-20">
                  <p className="text-[13px] font-bold text-white">Ver Tutorial en Video</p>
                  <p className="text-[11px] text-text-muted">Duración: 2:30 min</p>
                </div>
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
              </div>

              {/* Navigation Arrows */}
              <div className="mt-10 flex justify-end">
                {GUIDE_MODULES.findIndex(m => m.id === mod.id) < GUIDE_MODULES.length - 1 && (
                  <button 
                    onClick={() => setActiveModule(GUIDE_MODULES[GUIDE_MODULES.findIndex(m => m.id === mod.id) + 1].id)}
                    className="flex items-center gap-2 text-[13px] font-bold text-green-primary hover:text-green-primary/80 transition-colors"
                  >
                    Siguiente Módulo <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
    </AppShell>
  );
}
