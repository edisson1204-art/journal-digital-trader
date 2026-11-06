"use client";

import { Logo } from "@/components/Logo";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ShieldCheck, Lock, CreditCard, CheckCircle2, ArrowRight } from "lucide-react";

const PLAN_DETAILS: Record<string, { title: string; price: string; period: string; badge: string }> = {
  mensual: {
    title: "Membresía Trader Pro (Mensual)",
    price: "$29.00 USD",
    period: "Facturación mensual · Cancela cuando quieras",
    badge: "PLAN MENSUAL VIP",
  },
  anual: {
    title: "Licencia Institucional VIP (Anual)",
    price: "$197.00 USD",
    period: "Facturación anual · Ahorras 43% ($151 USD)",
    badge: "🔥 PLAN ANUAL VIP · MÁS ELEGIDO",
  },
};

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlan = searchParams.get("plan") === "mensual" ? "mensual" : "anual";

  const [selectedPlan, setSelectedPlan] = useState<"mensual" | "anual">(initialPlan);
  const [paymentGateway, setPaymentGateway] = useState<"hotmart" | "systeme" | "direct">("hotmart");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const externalHotmartUrl = process.env.NEXT_PUBLIC_HOTMART_CHECKOUT_URL || "";
  const externalSystemeUrl = process.env.NEXT_PUBLIC_SYSTEME_CHECKOUT_URL || "";

  const handleCompleteOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      return setError("Por favor ingresa tu nombre completo.");
    }
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return setError("Por favor ingresa un correo electrónico válido.");
    }

    setLoading(true);
    try {
      const res = await fetch("/api/checkout/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          plan: selectedPlan,
          method: paymentGateway,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.redirectUrl) {
        setError(data?.error || "No se pudo procesar tu orden.");
        setLoading(false);
        return;
      }

      if (paymentGateway === "hotmart" && externalHotmartUrl) {
        window.location.href = `${externalHotmartUrl}?email=${encodeURIComponent(cleanEmail)}&name=${encodeURIComponent(cleanName)}`;
        return;
      }
      if (paymentGateway === "systeme" && externalSystemeUrl) {
        window.location.href = `${externalSystemeUrl}?email=${encodeURIComponent(cleanEmail)}&first_name=${encodeURIComponent(cleanName)}`;
        return;
      }

      router.push(data.redirectUrl);
    } catch {
      setError("Error de conexión. Intenta nuevamente.");
      setLoading(false);
    }
  };

  const currentPlan = PLAN_DETAILS[selectedPlan];
  const inputCls =
    "w-full px-4 py-3 rounded-btn bg-bg-section border border-border-card text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-green-primary focus:ring-1 focus:ring-green-primary transition-colors";

  return (
    <div className="min-h-screen bg-bg-main py-10 px-4 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <Link href="/">
            <Logo size="md" />
          </Link>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-primary bg-green-primary/10 border border-green-primary/30 px-3 py-1.5 rounded-full">
            <Lock className="w-3.5 h-3.5" />
            Checkout Seguro SSL 256-bit
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Columna Izquierda: Resumen del Plan */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            <div className="bg-bg-card border border-border-card rounded-card p-6 shadow-card">
              <p className="text-[11px] font-extrabold text-green-primary uppercase tracking-wider mb-3">
                1. SELECCIONA TU MEMBRESÍA
              </p>

              <div className="grid grid-cols-2 gap-2.5 mb-5">
                <button
                  type="button"
                  onClick={() => setSelectedPlan("mensual")}
                  className={`py-2.5 px-3 rounded-btn text-xs font-bold border transition-all ${
                    selectedPlan === "mensual"
                      ? "bg-green-primary/15 border-green-primary text-green-primary"
                      : "bg-bg-section border-border-card text-text-secondary"
                  }`}
                >
                  Mensual ($29)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPlan("anual")}
                  className={`py-2.5 px-3 rounded-btn text-xs font-bold border transition-all ${
                    selectedPlan === "anual"
                      ? "bg-green-primary/15 border-green-primary text-green-primary"
                      : "bg-bg-section border-border-card text-text-secondary"
                  }`}
                >
                  Anual VIP ($197)
                </button>
              </div>

              <div className="p-4 rounded-xl bg-bg-section border border-border-card mb-5">
                <span className="inline-block text-[10px] font-extrabold text-green-primary uppercase mb-1">
                  {currentPlan.badge}
                </span>
                <h2 className="text-lg font-bold text-text-primary">{currentPlan.title}</h2>
                <p className="text-2xl font-extrabold text-green-primary mt-2">{currentPlan.price}</p>
                <p className="text-xs text-text-muted mt-1">{currentPlan.period}</p>
              </div>

              <ul className="flex flex-col gap-2.5 text-xs text-text-secondary">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-primary shrink-0" />
                  Acceso inmediato a la Suite de Fondeo (MFFU, Lucy, TopStep, Apex, FTMO)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-primary shrink-0" />
                  Candado EOD (🔒), Calculadora de Riesgo e Importador CSV
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-primary shrink-0" />
                  5 Informes Institucionales + Simulador Monte Carlo + Mentor IA
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-primary shrink-0" />
                  Entrega automática en /bienvenida-vip sin esperas
                </li>
              </ul>
            </div>
          </div>

          {/* Columna Derecha: Datos del Comprador y Pasarela */}
          <div className="lg:col-span-7">
            <div className="bg-bg-card border border-border-card rounded-card p-6 sm:p-8 shadow-card">
              <p className="text-[11px] font-extrabold text-green-primary uppercase tracking-wider mb-2">
                2. DATOS DEL OPERADOR &amp; MÉTODO DE ACTIVACIÓN
              </p>
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary mb-6">
                Completa tu orden para activar tu licencia VIP
              </h1>

              {error && (
                <div
                  role="alert"
                  className="bg-red-loss/10 border border-red-loss/20 text-red-loss text-xs px-4 py-3 rounded-lg text-center mb-4"
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleCompleteOrder} className="flex flex-col gap-4" noValidate>
                <div>
                  <label htmlFor="co-name" className="block text-xs font-medium text-text-secondary mb-1.5">
                    Nombre completo del Trader
                  </label>
                  <input
                    id="co-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Edisson Trader"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label htmlFor="co-email" className="block text-xs font-medium text-text-secondary mb-1.5">
                    Correo electrónico (donde recibirás tu membresía VIP)
                  </label>
                  <input
                    id="co-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tucorreo@gmail.com"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-2">
                    Pasarela de Pago Seleccionada
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setPaymentGateway("hotmart")}
                      className={`py-3 px-3 rounded-btn text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                        paymentGateway === "hotmart"
                          ? "bg-green-primary/15 border-green-primary text-green-primary"
                          : "bg-bg-section border-border-card text-text-secondary"
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      Hotmart
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentGateway("systeme")}
                      className={`py-3 px-3 rounded-btn text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                        paymentGateway === "systeme"
                          ? "bg-green-primary/15 border-green-primary text-green-primary"
                          : "bg-bg-section border-border-card text-text-secondary"
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      Systeme.io
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentGateway("direct")}
                      className={`py-3 px-3 rounded-btn text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                        paymentGateway === "direct"
                          ? "bg-green-primary/15 border-green-primary text-green-primary"
                          : "bg-bg-section border-border-card text-text-secondary"
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Acceso Directo
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full py-4 font-extrabold text-bg-main bg-green-primary rounded-btn hover:bg-green-primary/90 transition-all text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                >
                  {loading ? "Procesando tu Orden VIP..." : `Continuar y Activar ${currentPlan.title} (${currentPlan.price})`}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <p className="text-[11px] text-text-muted text-center mt-5">
                Al completar tu orden serás redirigido automáticamente a <strong>/bienvenida-vip</strong> para elegir tu contraseña y entrar de inmediato a la plataforma.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg-main" />}>
      <CheckoutContent />
    </Suspense>
  );
}
