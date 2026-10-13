"use client";

import { Logo } from "@/components/Logo";
import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    // Respuesta SIEMPRE neutral: no se revela si el correo existe (anti-enumeración).
    // El error real, si lo hay, no se muestra al usuario.
    try {
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    } catch {
      /* se ignora a propósito */
    }
    setSent(true);
    setLoading(false);
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
            <div role="status" className="text-sm text-text-secondary text-center mt-4 leading-relaxed">
              Si existe una cuenta con ese correo, te enviamos un enlace para restablecer la contraseña.
              El enlace es de un solo uso y caduca en poco tiempo. Revisa también la carpeta de spam.
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
