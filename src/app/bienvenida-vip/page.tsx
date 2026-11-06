"use client";

import { Logo } from "@/components/Logo";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { CheckCircle2, ShieldCheck, Sparkles, Lock } from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PW = 8;

function BienvenidaVipContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const qEmail = searchParams.get("email") || searchParams.get("buyer_email") || "";
    const qName = searchParams.get("name") || searchParams.get("first_name") || "";
    if (qEmail) setEmail(qEmail.trim().toLowerCase());
    if (qName) setName(qName.trim());
  }, [searchParams]);

  const handleActivateVip = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanName) {
      return setError("Ingresa tu nombre de operador para personalizar tu licencia VIP.");
    }
    if (!EMAIL_RE.test(cleanEmail)) {
      return setError("Ingresa el correo electrónico con el que realizaste tu compra.");
    }
    if (password.length < MIN_PW) {
      return setError(`Tu contraseña debe tener al menos ${MIN_PW} caracteres.`);
    }

    setLoading(true);
    try {
      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          password,
          isVipCheckout: true,
          provider: searchParams.get("source") || "hotmart_systeme_vip_redirect",
        }),
      });
      const regJson = await regRes.json().catch(() => ({}));

      if (!regRes.ok) {
        setError(regJson?.error || "No se pudo activar la cuenta VIP.");
        setLoading(false);
        return;
      }

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (signInErr) {
        setError("Tu membresía VIP fue activada. Inicia sesión con tu correo y contraseña.");
        setLoading(false);
        router.push("/login");
        return;
      }

      router.replace("/app");
    } catch {
      setError("Error de conexión al activar tu acceso VIP. Intenta nuevamente.");
      setLoading(false);
    }
  };

  const inputCls =
    "w-full px-4 py-3 rounded-btn bg-bg-section border border-border-card text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-green-primary focus:ring-1 focus:ring-green-primary transition-colors";

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="flex justify-center mb-6">
          <Link href="/">
            <Logo size="md" />
          </Link>
        </div>

        <div className="bg-bg-card border border-border-card rounded-card overflow-hidden shadow-card">
          {/* Banner Oficial VIP 1200x675 */}
          <div className="relative border-b border-border-card">
            <img
              src="/emails/email-compra-vip.png"
              alt="Membresía Oficial Confirmada — Journal Digital Trader Invest"
              className="w-full h-auto block"
            />
          </div>

          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-primary/15 border border-green-primary/30 text-green-primary text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                PAGO VERIFICADO · LICENCIA VIP ACTIVA
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
                <ShieldCheck className="w-3.5 h-3.5 text-green-primary" />
                Hotmart &amp; Systeme.io Acceso Directo
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-text-primary mb-2">
              Activa tu llave de acceso inmediato en 10 segundos
            </h1>
            <p className="text-sm text-text-secondary leading-relaxed mb-6">
              Completa tus datos aquí abajo para entrar directamente a tu terminal cuantitativa sin tener que esperar correos ni confirmaciones externas:
            </p>

            {error && (
              <div
                role="alert"
                className="bg-red-loss/10 border border-red-loss/20 text-red-loss text-xs px-4 py-3 rounded-lg text-center mb-4"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleActivateVip} className="flex flex-col gap-4" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="vip-name" className="block text-xs font-medium text-text-secondary mb-1.5">
                    Tu Nombre o Alias de Trader
                  </label>
                  <input
                    id="vip-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Carlos Trader"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="vip-email" className="block text-xs font-medium text-text-secondary mb-1.5">
                    Correo electrónico de tu compra
                  </label>
                  <input
                    id="vip-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tucorreo@gmail.com"
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="vip-password" className="block text-xs font-medium text-text-secondary mb-1.5">
                  Crea tu Contraseña de Acceso (mínimo 8 caracteres)
                </label>
                <input
                  id="vip-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Escribe una contraseña segura para tu terminal"
                  className={inputCls}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 font-extrabold text-bg-main bg-green-primary rounded-btn hover:bg-green-primary/90 transition-all text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                {loading ? "Activando tu Terminal VIP..." : "Activar mi Licencia y Entrar a mi Terminal Ahora →"}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-border-card flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-green-primary" />
                Tus cuentas de fondeo y métricas quedan sincronizadas en la nube.
              </span>
              <Link href="/login" className="text-green-primary hover:underline font-semibold">
                ¿Ya tienes contraseña? Inicia sesión aquí →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BienvenidaVipPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg-main" />}>
      <BienvenidaVipContent />
    </Suspense>
  );
}
