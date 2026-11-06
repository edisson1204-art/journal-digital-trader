"use client";

import Link from "next/link";
import { Check, Sparkles, ShieldCheck, Crown } from "lucide-react";

const PLANS = [
  {
    id: "mensual",
    name: "Membresía Trader Pro",
    badge: "ACCESO COMPLETO MENSUAL",
    price: "$29",
    period: "/ mes",
    description: "Ideal para operadores en evaluación de fondeo que buscan proteger su Piso EOD y auditar cada sesión.",
    popular: false,
    features: [
      "Suite de Cuentas de Fondeo ilimitadas (MFFU, Lucy, TopStep, Apex, FTMO)",
      "Candado EOD automático (🔒) y cálculo de Retiro Neto (Split 90%)",
      "Importador .CSV directo para NinjaTrader 8 y Tradovate",
      "Calculadora de Riesgo con comisiones incluidas (MNQ, NQ, MES, ES)",
      "5 Informes Institucionales en Español + Simulador Monte Carlo",
      "Mentor IA Psicológico y Cuantitativo 24/7",
    ],
    cta: "Comenzar Plan Mensual →",
  },
  {
    id: "anual",
    name: "Licencia Institucional VIP",
    badge: "🔥 MÁS ELEGIDO · AHORRA 43%",
    price: "$197",
    period: "/ año",
    description: "Para operadores comprometidos con vivir del trading y escalar múltiples cuentas fondeadas todo el año.",
    popular: true,
    features: [
      "Todo lo incluido en el Plan Trader Pro sin límites",
      "Sincronización Multi-Dispositivo en la Nube en tiempo real",
      "Gestión de hasta 20+ cuentas de fondeo en paralelo",
      "Certificación Estadística de Muestra (30+ operaciones FIFO)",
      "7 Alertas y Reportes Automáticos (Escudo Anti-Tilt y Ritual de Viernes)",
      "Acceso prioritario a todas las actualizaciones y soporte VIP",
    ],
    cta: "Obtener Licencia Anual VIP →",
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="relative bg-bg-main py-24 px-6 border-t border-border-card/40">
      <div className="mx-auto max-w-[1200px]">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-xs font-bold tracking-[0.22em] text-green-primary uppercase mb-3">
            INVERSIÓN EN TU DISCIPLINA CUANTITATIVA
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-text-primary leading-tight mb-4">
            Una sola cuenta salvada paga <span className="text-green-primary">años de tu terminal.</span>
          </h2>
          <p className="text-sm sm:text-base text-text-secondary">
            Elige tu plan, realiza tu pago seguro vía Hotmart / Systeme.io o Checkout Directo y recibe acceso inmediato en menos de 10 segundos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col justify-between rounded-card p-8 border transition-all ${
                plan.popular
                  ? "bg-bg-card border-green-primary shadow-green-glow"
                  : "bg-bg-card/80 border-border-card"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wide ${
                      plan.popular
                        ? "bg-green-primary text-bg-main"
                        : "bg-green-primary/10 text-green-primary border border-green-primary/30"
                    }`}
                  >
                    {plan.popular ? <Crown className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {plan.badge}
                  </span>
                </div>

                <h3 className="text-2xl font-bold text-text-primary mb-2">{plan.name}</h3>
                <p className="text-xs text-text-secondary leading-relaxed mb-6">{plan.description}</p>

                <div className="flex items-baseline gap-1.5 mb-6 pb-6 border-b border-border-card">
                  <span className="text-4xl sm:text-5xl font-extrabold text-text-primary">{plan.price}</span>
                  <span className="text-sm text-text-muted font-medium">USD {plan.period}</span>
                </div>

                <ul className="flex flex-col gap-3 mb-8">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-xs sm:text-sm text-text-secondary">
                      <Check className="w-4 h-4 text-green-primary shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-3">
                <Link
                  href={`/checkout?plan=${plan.id}`}
                  className={`w-full py-4 rounded-btn font-extrabold text-sm text-center transition-all ${
                    plan.popular
                      ? "bg-green-primary text-bg-main hover:bg-green-primary/90 shadow-lg"
                      : "bg-bg-section border border-green-primary/40 text-green-primary hover:bg-green-primary hover:text-bg-main"
                  }`}
                >
                  {plan.cta}
                </Link>
                <p className="text-[11px] text-text-muted text-center flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-green-primary" />
                  Activación automática inmediata en /bienvenida-vip tras completar tu orden
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
