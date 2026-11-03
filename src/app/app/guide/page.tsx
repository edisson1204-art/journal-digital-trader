"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  BookOpen, PlayCircle, Cpu, Brain, FileText,
  CheckCircle2, ArrowRight, Lightbulb, Key,
  Briefcase, ShieldCheck, RotateCcw, Layers, Lock
} from "lucide-react";

const GUIDE_MODULES = [
  {
    id: "journal",
    title: "1. Diario de Trading & Ledger FIFO",
    icon: BookOpen,
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
    content: (
      <div className="space-y-4">
        <p className="text-[14px] text-text-secondary leading-relaxed">
          El <b>Diario de Operaciones (Journal)</b> es el epicentro contable de la plataforma. Utiliza un motor <b>Ledger FIFO con aritmética exacta Decimal (`ROUND_HALF_UP`)</b> que calcula automáticamente tu P&amp;L Bruto, Comisiones por Lado, P&amp;L Neto y Múltiplo R sin errores de punto flotante.
        </p>
        <ul className="space-y-3 mt-4">
          <li className="flex gap-3 text-[13px] text-text-primary items-start">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <span>Haz clic en <b>&ldquo;Añadir Trade&rdquo;</b> e ingresa tu instrumento (`NQ`, `MNQ`, `ES`, `MES`, Forex, Acciones o Cripto), dirección (`Compra / Long` o `Venta / Short`), entradas y salidas.</span>
          </li>
          <li className="flex gap-3 text-[13px] text-text-primary items-start">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <span><b>Soporte Multi-Ejecución (Scale-In / Scale-Out):</b> Puedes registrar salidas parciales (`Parcial`) o dejar posiciones abiertas (`Abierta`). Las métricas cerradas y parciales se reconcilian por separado al centavo.</span>
          </li>
          <li className="flex gap-3 text-[13px] text-text-primary items-start">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <span><b>Brokers &amp; Prop Firms Preconfigurados:</b> Selecciona entre `My Funded Futures (MFFU)`, `Lucy Trading / Lucid Trading`, `TopStep`, `Apex`, `Take Profit Trader`, `FTMO`, `NinjaTrader` o `Tradovate`, y vincula la operación a una cuenta específica mediante etiquetas (`tags`).</span>
          </li>
          <li className="flex gap-3 text-[13px] text-text-primary items-start">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <span><b>Evidencia Gráfica &amp; MAE/MFE:</b> Adjunta la captura de tu gráfico y registra excursión máxima adversa (`MAE`) y favorable (`MFE`) en puntos para alimentar los informes técnicos y el Mentor IA.</span>
          </li>
        </ul>
      </div>
    )
  },
  {
    id: "accounts",
    title: "2. Cuentas de Fondeo & Prop Firms",
    icon: Briefcase,
    color: "text-cyan-400",
    bgColor: "bg-cyan-400/10",
    content: (
      <div className="space-y-4">
        <p className="text-[14px] text-text-secondary leading-relaxed">
          El módulo <b>Cuentas / Prop Firms</b> fue diseñado para operadores que gestionan desde una evaluación individual hasta un portafolio multi-cuenta (`x1` a `x20+` cuentas en paralelo).
        </p>
        <div className="bg-bg-section border border-border-card p-4 rounded-lg my-2">
          <p className="text-[12px] font-bold text-cyan-400 flex items-center gap-2 mb-1.5">
            <Layers className="h-4 w-4" /> ARRANQUE EN CERO — TÚ ELIGES TUS EMPRESAS
          </p>
          <p className="text-[12px] text-text-secondary leading-relaxed">
            Al iniciar o tras resetear tu cuenta, el módulo comienza completamente limpio (`0 cuentas`). Primero seleccionas la empresa de fondeo que deseas operar (<b>My Funded Futures</b>, <b>Lucy Trading / Lucid</b>, <b>TopStep</b>, <b>Apex</b>, <b>Take Profit Trader</b> o <b>FTMO</b>) y eliges cuántas cuentas crear en lote (`x1`, `x3`, `x5`, `x10`).
          </p>
        </div>
        <ul className="space-y-3 mt-4">
          <li className="flex gap-3 text-[13px] text-text-primary items-start">
            <CheckCircle2 className="h-4 w-4 text-cyan-400 mt-0.5 flex-shrink-0" />
            <span><b>Piso de Liquidación EOD con Candado (<Lock className="h-3.5 w-3.5 inline text-emerald-400" />):</b> Calcula tu High-Water Mark al cierre del día (`EOD`) y bloquea automáticamente el piso de liquidación en tu balance inicial cuando tu colchón supera el drawdown máximo.</span>
          </li>
          <li className="flex gap-3 text-[13px] text-text-primary items-start">
            <CheckCircle2 className="h-4 w-4 text-cyan-400 mt-0.5 flex-shrink-0" />
            <span><b>6 Reglas Modulares en Tiempo Real:</b> Monitorea Objetivo de Ganancia (`Profit Target`), Límite de Pérdida Diaria (`DLL`), Drawdown EOD, Regla de Consistencia (`30% / 40% / 50%`), Días Mínimos Operados y Límite de Contratos/Micros.</span>
          </li>
          <li className="flex gap-3 text-[13px] text-text-primary items-start">
            <CheckCircle2 className="h-4 w-4 text-cyan-400 mt-0.5 flex-shrink-0" />
            <span><b>Vista Tarjetas vs. Vista Matriz &amp; Split 90%:</b> Alterna entre tarjetas detalladas o tabla ejecutiva densa, filtra por carpetas de empresa y visualiza tu retiro neto estimado tras el `Split` (`80% / 90% / 100%`).</span>
          </li>
        </ul>
      </div>
    )
  },
  {
    id: "simulator",
    title: "3. Calculadora de Riesgo & Monte Carlo",
    icon: Cpu,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    content: (
      <div className="space-y-4">
        <p className="text-[14px] text-text-secondary leading-relaxed">
          Protege tu cuenta antes de abrir una orden y proyecta la viabilidad matemática de tu sistema con herramientas cuantitativas de grado institucional.
        </p>
        <ul className="space-y-3 mt-4">
          <li className="flex gap-3 text-[13px] text-text-primary items-start">
            <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <span><b>Calculadora de Riesgo con Comisiones Round-Trip:</b> En la sección <b>Riesgo</b>, ingresa tu balance, porcentaje de riesgo, precio de entrada y Stop Loss. El motor integra el valor por punto del contrato y la comisión ida y vuelta para darte el número exacto de contratos sin exceder tu riesgo máximo.</span>
          </li>
          <li className="flex gap-3 text-[13px] text-text-primary items-start">
            <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <span><b>Simulador Monte Carlo Trinomial (`Win / Loss / Breakeven`):</b> En <b>Simulador</b>, carga automáticamente las estadísticas reales de tu Diario (`Usar mis datos del Journal`) o simula escenarios personalizados.</span>
          </li>
          <li className="flex gap-3 text-[13px] text-text-primary items-start">
            <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <span><b>Cono de Probabilidad (`FanChart`):</b> Visualiza las bandas percentiles `P5–P95`, `P25–P75`, la trayectoria mediana (`P50`), la mejor/peor simulación y tu <b>Probabilidad de Ruina</b> exacta en hasta 1,000 trayectorias estocásticas.</span>
          </li>
        </ul>
      </div>
    )
  },
  {
    id: "mentor",
    title: "4. Psicología & Mentor IA (Visión GPT-4o)",
    icon: Brain,
    color: "text-violet-400",
    bgColor: "bg-violet-400/10",
    content: (
      <div className="space-y-4">
        <p className="text-[14px] text-text-secondary leading-relaxed">
          Combina el diagnóstico algorítmico de tus emociones en la pestaña <b>Psicología</b> con tu <b>Mentor IA</b> entrenado en estructura institucional (`ICT`, `SMC`, `Wyckoff`, `Order Flow`) y conectado en vivo a las métricas de tu Diario.
        </p>
        <div className="bg-bg-section border border-border-card p-4 rounded-lg my-2">
          <p className="text-[12px] font-bold text-amber-500 flex items-center gap-2 mb-2">
            <Key className="h-4 w-4" /> ARQUITECTURA SEGURA BYOK (BRING YOUR OWN KEY)
          </p>
          <p className="text-[12px] text-text-secondary">
            Ve a <b>Configuración (Settings)</b> o al ícono de candado en <b>Mentor IA</b> e ingresa tu API Key de OpenAI (`sk-...`). Tu clave se almacena ofuscada localmente en tu navegador y nunca se guarda en texto plano en servidores externos.
          </p>
        </div>
        <ul className="space-y-3 mt-4">
          <li className="flex gap-3 text-[13px] text-text-primary items-start">
            <CheckCircle2 className="h-4 w-4 text-violet-500 mt-0.5 flex-shrink-0" />
            <span><b>Auditoría Visual de Gráficos:</b> Adjunta una imagen de tu entrada en el chat para que el Mentor IA evalúe liquidez, zonas de oferta/demanda y ubicación del Stop Loss.</span>
          </li>
          <li className="flex gap-3 text-[13px] text-text-primary items-start">
            <CheckCircle2 className="h-4 w-4 text-violet-500 mt-0.5 flex-shrink-0" />
            <span><b>Detección de Revenge Trading y Sesgos:</b> El sistema identifica caídas de disciplina tras rachas perdedoras y te entrega reglas accionables para corregirlas.</span>
          </li>
        </ul>
      </div>
    )
  },
  {
    id: "reports",
    title: "5. Centro de 5 Informes Institucionales",
    icon: FileText,
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
    content: (
      <div className="space-y-4">
        <p className="text-[14px] text-text-secondary leading-relaxed">
          Genera auditorías ejecutivas 100% en español y reconciliadas matemáticamente con el Diario, listas para imprimir o exportar en PDF para inversores o firmas de fondeo.
        </p>
        <ul className="space-y-3 mt-4">
          <li className="flex gap-3 text-[13px] text-text-primary items-start">
            <CheckCircle2 className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <span><b>5 Informes Especializados:</b> `1. Rendimiento Ejecutivo`, `2. Auditoría de Estrategias`, `3. Gestión de Riesgo y Capital`, `4. Psicología y Disciplina` y `5. Eficiencia Técnica (MAE / MFE en puntos y USD)`.</span>
          </li>
          <li className="flex gap-3 text-[13px] text-text-primary items-start">
            <CheckCircle2 className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <span><b>Filtrado por Fecha Efectiva de Cierre:</b> Filtra por Mes, Año o Histórico Total y por tipo de cuenta (`Todas`, `Fondeadas` o `Personales`), garantizando conciliación 1:1 con tu Ledger.</span>
          </li>
          <li className="flex gap-3 text-[13px] text-text-primary items-start">
            <CheckCircle2 className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <span><b>Narrativa Trazable Automática:</b> Cada informe redacta conclusiones cuantitativas verificables a partir de tu Win Rate, Profit Factor, Expectancy y sesiones operadas.</span>
          </li>
        </ul>
      </div>
    )
  },
  {
    id: "settings",
    title: "6. Sincronización Cloud & Reseteo Total",
    icon: ShieldCheck,
    color: "text-rose-400",
    bgColor: "bg-rose-400/10",
    content: (
      <div className="space-y-4">
        <p className="text-[14px] text-text-secondary leading-relaxed">
          Tus operaciones están protegidas mediante políticas <b>Row-Level Security (RLS)</b> en Supabase y respaldadas localmente para una experiencia instantánea.
        </p>
        <ul className="space-y-3 mt-4">
          <li className="flex gap-3 text-[13px] text-text-primary items-start">
            <CheckCircle2 className="h-4 w-4 text-rose-400 mt-0.5 flex-shrink-0" />
            <span><b>Sincronización Automática:</b> Cada operación creada, editada o eliminada en tu Diario se sincroniza automáticamente con tu cuenta privada en la nube.</span>
          </li>
          <li className="flex gap-3 text-[13px] text-text-primary items-start">
            <RotateCcw className="h-4 w-4 text-rose-400 mt-0.5 flex-shrink-0" />
            <span><b>Botón &ldquo;Resetear Cuenta&rdquo; (Limpieza Total en Cero):</b> Ubicado en <b>Configuración → Zona de Peligro</b>. Al confirmarlo, elimina todas tus operaciones tanto en la nube (`Supabase`) como en el dispositivo local y limpia todas las cuentas de fondeo configuradas, dejando la aplicación 100% en cero lista para una nueva etapa operativa.</span>
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
      subtitle="Guía interactiva actualizada con todas las herramientas cuantitativas y de fondeo"
    >
      <div className="flex flex-col lg:flex-row gap-8 max-w-[1200px] mx-auto w-full">
        
        {/* Left Column: Navigation */}
        <div className="w-full lg:w-[400px] flex flex-col gap-6">
          {/* Welcome Card */}
          <div className="rounded-card border border-border-card bg-bg-card p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-primary/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
            <Lightbulb className="h-8 w-8 text-green-primary mb-4" />
            <h2 className="text-[18px] font-bold text-text-primary mb-2">Bienvenido a Bordo</h2>
            <p className="text-[13px] text-text-secondary leading-relaxed">
              Esta plataforma fue diseñada por y para operadores institucionales y gestores de cuentas de fondeo. Explora los 6 módulos para dominar cada algoritmo.
            </p>
          </div>

          {/* Module Selector */}
          <div className="rounded-card border border-border-card bg-bg-card flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border-card bg-bg-section/50">
              <p className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Temario Interactivo (6 Módulos)</p>
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

              {/* Resumen de Flujo Operativo Recomendado */}
              <div className="mt-10 rounded-xl border border-border-card bg-bg-section p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-green-primary/40 transition-colors">
                <div className="flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-full bg-green-primary/15 flex items-center justify-center flex-shrink-0">
                    <PlayCircle className="h-6 w-6 text-green-primary" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-white">Flujo Institucional Recomendado</p>
                    <p className="text-[11px] text-text-muted">
                      1. Elige tus empresas en Cuentas → 2. Calcula lotes en Riesgo → 3. Registra en Diario → 4. Audita en Informes y Mentor IA
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation Arrows */}
              <div className="mt-8 flex justify-end">
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
