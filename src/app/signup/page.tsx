"use client";

import { Logo } from "@/components/Logo";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

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

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        }
      }
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md bg-bg-card border border-border-card rounded-card p-8 shadow-card text-center">
          <h2 className="text-2xl font-bold text-green-primary mb-4">¡Cuenta Creada!</h2>
          <p className="text-text-secondary text-sm mb-6">
            Tu cuenta ha sido pre-aprobada en Supabase. Si esto fuera producción, habríamos enviado un correo de verificación.
          </p>
          <Link href="/login" className="text-green-primary hover:underline text-sm font-semibold">
            Ir a Iniciar Sesión
          </Link>
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
