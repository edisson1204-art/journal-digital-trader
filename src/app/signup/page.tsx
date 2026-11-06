"use client";

import { Logo } from "@/components/Logo";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Sparkles, ShieldCheck, TrendingUp, HeartHandshake, ArrowRight } from "lucide-react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanEmail = email.trim().toLowerCase();

    try {
      // 1) Registro directo pre-confirmado en servidor (sin límite de 3 correos/hora)
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password, name: name.trim() }),
      });

      if (res.ok) {
        // Iniciar sesión automáticamente en segundo plano y mostrar tarjeta visual de bienvenida
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        }).catch(() => {});
        setSuccess(true);
        setLoading(false);
        return;
      }

      if (res.status === 409) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error || "Este correo ya está registrado.");
        setLoading(false);
        return;
      }
    } catch {
      // Si falla la ruta admin, hacer fallback a signUp estándar
    }

    // 2) Fallback estándar de Supabase Auth
    const { error: sbError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: name.trim(),
        },
      },
    });

    if (sbError) {
      setError(sbError.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    const traderName = name.trim() ? name.trim().split(" ")[0] : "Trader";
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg rounded-2xl border border-green-primary/30 bg-bg-card shadow-2xl overflow-hidden relative">
          {/* Banner Visual Superior con Ilustración y Gradiente */}
          <div className="relative bg-gradient-to-br from-emerald-500/25 via-bg-section to-blue-500/20 px-8 pt-8 pb-6 border-b border-border-card overflow-hidden">
            <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-green-primary/15 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-44 h-44 rounded-full bg-blue-accent/15 blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-2xl bg-green-primary/15 border border-green-primary/40 flex items-center justify-center mb-4 shadow-green-glow">
                <Sparkles className="h-8 w-8 text-green-primary" />
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-primary/15 border border-green-primary/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-green-primary mb-2">
                <ShieldCheck className="h-3.5 w-3.5" /> Acceso Institucional Activado
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
                ¡Bienvenido a casa, {traderName}! 🚀
              </h2>
            </div>
          </div>

          {/* Cuerpo Empático y Motivador */}
          <div className="p-8 space-y-5 text-center">
            <p className="text-[14px] text-text-secondary leading-relaxed">
              Sabemos que el camino del trading requiere coraje, paciencia y mucha disciplina.{" "}
              <b className="text-text-primary">Hoy acabas de dar el paso que separa a los amateurs de los profesionales:</b>{" "}
              medir cada decisión con datos reales.
            </p>

            <div className="rounded-xl bg-bg-section/80 border border-border-card p-4 text-left space-y-2.5">
              <div className="flex items-start gap-3">
                <HeartHandshake className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-text-secondary leading-relaxed">
                  <b className="text-text-primary">No estás solo en el mercado:</b> Tu Diario FIFO, tu Simulador Monte Carlo y tu Mentor IA están listos para cuidar tu capital y acompañarte hacia tus metas de fondeo.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-green-primary flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-text-secondary leading-relaxed">
                  <b className="text-text-primary">Un día a la vez, un trade a la vez:</b> Respeta tu plan, protege tu riesgo y deja que la estadística trabaje a tu favor. ¡Vamos por esa consistencia!
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  router.push("/app");
                  router.refresh();
                }}
                className="w-full py-3.5 px-6 font-bold text-bg-main bg-green-primary rounded-btn hover:bg-green-primary/90 transition-all shadow-green-glow text-sm flex items-center justify-center gap-2"
              >
                Entrar a mi Terminal Ahora <ArrowRight className="h-4 w-4" />
              </button>
              <Link href="/login" className="text-text-muted hover:text-green-primary text-xs font-medium transition-colors">
                O ir a la pantalla de inicio de sesión
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/"><Logo size="md" /></Link>
        </div>

        {/* Card */}
        <div className="bg-bg-card border border-border-card rounded-card p-8 shadow-card">
          <h1 className="text-2xl font-bold text-text-primary text-center mb-2">
            Únete a la Plataforma
          </h1>
          <p className="text-sm text-text-muted text-center mb-8">
            Accede a Journal Digital Trader Invest por{" "}
            <span className="text-green-primary font-semibold">$14.99/mes</span>
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {error && (
              <div className="bg-red-loss/10 border border-red-loss/20 text-red-loss text-sm px-4 py-3 rounded-lg text-center">
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="name" className="block text-xs font-medium text-text-secondary mb-1.5">
                Nombre completo
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                className="w-full px-4 py-3 rounded-btn bg-bg-section border border-border-card text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-green-primary focus:ring-1 focus:ring-green-primary transition-colors"
                placeholder="Tu nombre"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-text-secondary mb-1.5">
                Correo Electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-btn bg-bg-section border border-border-card text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-green-primary focus:ring-1 focus:ring-green-primary transition-colors"
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-text-secondary mb-1.5">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full px-4 py-3 rounded-btn bg-bg-section border border-border-card text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-green-primary focus:ring-1 focus:ring-green-primary transition-colors"
                placeholder="Min. 8 caracteres"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 font-bold text-bg-main bg-green-primary rounded-btn hover:bg-green-primary/90 transition-all shadow-green-glow text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-green-primary focus:ring-offset-2 focus:ring-offset-bg-card disabled:opacity-50"
            >
              {loading ? "Creando cuenta..." : "Crear Cuenta Segura"}
            </button>
          </form>

          <p className="text-center text-xs text-text-muted mt-6">
            ¿Ya tienes una cuenta?{" "}
            <Link href="/login" className="text-green-primary hover:underline">Iniciar Sesión</Link>
          </p>
        </div>

        <p className="text-center text-xs text-text-muted mt-6">
          🔒 Seguridad cifrada por Supabase Auth. Cancela en cualquier momento.
        </p>
      </div>
    </div>
  );
}
