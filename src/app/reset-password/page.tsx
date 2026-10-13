"use client";

import { Logo } from "@/components/Logo";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

const MIN_LENGTH = 10;

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  // El enlace del correo trae un código de un solo uso; el cliente de Supabase lo canjea por una
  // sesión de recuperación. Sin esa sesión no se muestra el formulario.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      setChecked(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_LENGTH) return setError(`La contraseña debe tener al menos ${MIN_LENGTH} caracteres.`);
    if (password !== confirm) return setError("Las contraseñas no coinciden.");
    setLoading(true);
    const { error: updErr } = await supabase.auth.updateUser({ password });
    if (updErr) {
      setError("No se pudo actualizar la contraseña. Solicita un enlace nuevo.");
      setLoading(false);
      return;
    }
    // Cierra la sesión de recuperación para obligar a iniciar sesión con la clave nueva.
    await supabase.auth.signOut();
    setDone(true);
    setLoading(false);
  };

  const inputCls =
    "w-full px-4 py-3 rounded-btn bg-bg-section border border-border-card text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-green-primary focus:ring-1 focus:ring-green-primary transition-colors";

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link href="/"><Logo size="md" /></Link>
        </div>
        <div className="bg-bg-card border border-border-card rounded-card p-8 shadow-card">
          <h1 className="text-2xl font-bold text-text-primary text-center mb-6">Nueva contraseña</h1>

          {done ? (
            <div role="status" className="text-sm text-text-secondary text-center leading-relaxed">
              Contraseña actualizada. <Link href="/login" className="text-green-primary hover:underline">Inicia sesión</Link> con la nueva.
            </div>
          ) : !checked ? (
            <p className="text-sm text-text-muted text-center">Verificando enlace…</p>
          ) : !ready ? (
            <div role="alert" className="text-sm text-text-secondary text-center leading-relaxed">
              El enlace no es válido o ya caducó. <Link href="/forgot-password" className="text-green-primary hover:underline">Solicita uno nuevo</Link>.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              {error && (
                <div role="alert" className="bg-red-loss/10 border border-red-loss/20 text-red-loss text-sm px-4 py-3 rounded-lg text-center">{error}</div>
              )}
              <div>
                <label htmlFor="pw" className="block text-xs font-medium text-text-secondary mb-1.5">Nueva contraseña</label>
                <input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className={inputCls} />
              </div>
              <div>
                <label htmlFor="pw2" className="block text-xs font-medium text-text-secondary mb-1.5">Confirmar contraseña</label>
                <input id="pw2" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" className={inputCls} />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3.5 font-bold text-bg-main bg-green-primary rounded-btn hover:bg-green-primary/90 transition-all text-sm focus:outline-none focus:ring-2 focus:ring-green-primary focus:ring-offset-2 focus:ring-offset-bg-card disabled:opacity-50">
                {loading ? "Guardando..." : "Guardar contraseña"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
