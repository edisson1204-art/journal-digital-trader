"use client";

import { Logo } from "@/components/Logo";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [pastedUrl, setPastedUrl] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    } catch {
      /* respuesta neutral */
    }
    setSent(true);
    setLoading(false);
  };

  const handleConvertLocalhostLink = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = pastedUrl.trim();
    if (!raw) return;
    const match = raw.match(/[?&]code=([^&#\s]+)/i);
    if (match?.[1]) {
      router.push(`/reset-password?code=${encodeURIComponent(match[1].trim())}`);
      return;
    }
    if (/^[0-9a-fA-F-]{20,}$/.test(raw)) {
      router.push(`/reset-password?code=${encodeURIComponent(raw)}`);
    }
  };

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link href="/"><Logo size="md" /></Link>
        </div>
        <div className="bg-bg-card border border-border-card rounded-card p-8 shadow-card">
          <h1 className="text-2xl font-bold text-text-primary text-center mb-2">Recuperar contraseña</h1>
          {sent ? (
            <div className="flex flex-col gap-4 mt-4">
              <div role="status" className="text-sm text-text-secondary text-center leading-relaxed">
                Si existe una cuenta con ese correo, te enviamos un enlace para restablecer la contraseña.
                Revisa tu bandeja de entrada o spam.
              </div>

              <div className="rounded-lg border border-border-card bg-bg-section p-3.5 text-xs text-text-secondary flex flex-col gap-2.5">
                <p className="font-bold text-text-primary">
                  💡 ¿Al abrir el enlace del correo te salió <code className="text-green-primary">localhost:3000/?code=...</code>?
                </p>
                <p>
                  Copia esa URL de la barra de direcciones y pégala aquí para ir directo a cambiar tu contraseña:
                </p>
                <form onSubmit={handleConvertLocalhostLink} className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={pastedUrl}
                    onChange={e => setPastedUrl(e.target.value)}
                    placeholder="http://localhost:3000/?code=..."
                    className="w-full px-3 py-2 rounded-btn bg-bg-card border border-border-card text-text-primary text-xs focus:outline-none focus:border-green-primary"
                  />
                  <button
                    type="submit"
                    className="w-full py-2.5 font-bold text-bg-main bg-green-primary rounded-btn hover:bg-green-primary/90 transition-all text-xs"
                  >
                    Ir a crear nueva contraseña →
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-text-muted text-center mb-8">
                Escribe tu correo y te enviaremos un enlace para crear una contraseña nueva.
              </p>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label htmlFor="email" className="block text-xs font-medium text-text-secondary mb-1.5">Correo electrónico</label>
                  <input
                    id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    required autoComplete="email" placeholder="tu@email.com"
                    className="w-full px-4 py-3 rounded-btn bg-bg-section border border-border-card text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-green-primary focus:ring-1 focus:ring-green-primary transition-colors"
                  />
                </div>
                <button
                  type="submit" disabled={loading}
                  className="w-full py-3.5 font-bold text-bg-main bg-green-primary rounded-btn hover:bg-green-primary/90 transition-all text-sm focus:outline-none focus:ring-2 focus:ring-green-primary focus:ring-offset-2 focus:ring-offset-bg-card disabled:opacity-50"
                >
                  {loading ? "Enviando..." : "Enviar enlace"}
                </button>
              </form>
            </>
          )}
          <p className="text-center text-xs text-text-muted mt-6">
            <Link href="/login" className="text-green-primary hover:underline">Volver a iniciar sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
