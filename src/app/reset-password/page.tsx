"use client";

import { Logo } from "@/components/Logo";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

const MIN_LENGTH = 8;

function extractCodeFromInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    if (trimmed.includes("code=")) {
      const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
      const c = url.searchParams.get("code");
      if (c) return c.trim();
    }
  } catch {
    const match = trimmed.match(/[?&]code=([^&#\s]+)/i);
    if (match?.[1]) return match[1].trim();
  }
  // Si pegó directamente el UUID del código
  if (/^[0-9a-fA-F-]{20,}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [manualLinkOrCode, setManualLinkOrCode] = useState("");
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setReady(true);
        setChecked(true);
      }
    });

    async function verifyFromUrl() {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const tokenHash = params.get("token_hash");
        const type = params.get("type");

        if (code) {
          const { data, error: exchErr } = await supabase.auth.exchangeCodeForSession(code);
          if (!exchErr && data.session && active) {
            setReady(true);
            setChecked(true);
            return;
          }
        }

        if (tokenHash && (type === "recovery" || !type)) {
          const { data, error: otpErr } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery",
          });
          if (!otpErr && data.session && active) {
            setReady(true);
            setChecked(true);
            return;
          }
        }

        const { data } = await supabase.auth.getSession();
        if (active) {
          if (data.session) setReady(true);
          setChecked(true);
        }
      } catch {
        if (active) setChecked(true);
      }
    }

    verifyFromUrl();
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleManualCodeExchange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const extracted = extractCodeFromInput(manualLinkOrCode);
    if (!extracted) {
      setError("Pega la URL completa (ej. localhost:3000/?code=...) o el código del enlace.");
      return;
    }
    setVerifyingCode(true);
    try {
      const { data, error: exchErr } = await supabase.auth.exchangeCodeForSession(extracted);
      if (exchErr || !data.session) {
        setError("Ese código ya expiró o fue usado en otro navegador. Solicita un enlace nuevo desde la misma ventana.");
      } else {
        setReady(true);
      }
    } catch {
      setError("No se pudo validar el código. Solicita un enlace nuevo.");
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_LENGTH) {
      return setError(`La contraseña debe tener al menos ${MIN_LENGTH} caracteres.`);
    }
    if (password !== confirm) {
      return setError("Las contraseñas no coinciden.");
    }
    setLoading(true);
    const { error: updErr } = await supabase.auth.updateUser({ password });
    if (updErr) {
      setError("No se pudo actualizar la contraseña: " + updErr.message);
      setLoading(false);
      return;
    }
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
            <div role="status" className="text-sm text-text-secondary text-center leading-relaxed flex flex-col gap-4">
              <p className="text-green-primary font-bold text-base">¡Contraseña actualizada con éxito!</p>
              <Link
                href="/login"
                className="w-full py-3 font-bold text-bg-main bg-green-primary rounded-btn hover:bg-green-primary/90 transition-all text-sm text-center"
              >
                Iniciar sesión ahora
              </Link>
            </div>
          ) : !checked ? (
            <p className="text-sm text-text-muted text-center">Verificando enlace de recuperación…</p>
          ) : !ready ? (
            <div className="flex flex-col gap-4">
              <div role="alert" className="text-xs text-text-secondary bg-bg-section border border-border-card rounded-lg p-3.5 leading-relaxed">
                <p className="font-bold text-text-primary mb-1">
                  ¿El correo de recuperación te envió a <code className="text-green-primary">localhost:3000/?code=...</code>?
                </p>
                <p>
                  Copia esa dirección completa de la barra de tu navegador (donde salió <em>localhost rechazó la conexión</em>) y pégala aquí abajo para activar el cambio de contraseña inmediatamente:
                </p>
              </div>

              {error && (
                <div role="alert" className="bg-red-loss/10 border border-red-loss/20 text-red-loss text-xs px-3.5 py-2.5 rounded-lg text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleManualCodeExchange} className="flex flex-col gap-3">
                <input
                  type="text"
                  value={manualLinkOrCode}
                  onChange={(e) => setManualLinkOrCode(e.target.value)}
                  placeholder="Pega aquí: http://localhost:3000/?code=555512a4-..."
                  className={inputCls}
                />
                <button
                  type="submit"
                  disabled={verifyingCode}
                  className="w-full py-3 font-bold text-bg-main bg-green-primary rounded-btn hover:bg-green-primary/90 transition-all text-sm disabled:opacity-50"
                >
                  {verifyingCode ? "Validando código..." : "Validar enlace y cambiar contraseña"}
                </button>
              </form>

              <p className="text-center text-xs text-text-muted pt-2 border-t border-border-card/60">
                ¿Necesitas un correo nuevo?{" "}
                <Link href="/forgot-password" className="text-green-primary hover:underline font-semibold">
                  Solicitar otro enlace
                </Link>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              {error && (
                <div role="alert" className="bg-red-loss/10 border border-red-loss/20 text-red-loss text-sm px-4 py-3 rounded-lg text-center">{error}</div>
              )}
              <div>
                <label htmlFor="pw" className="block text-xs font-medium text-text-secondary mb-1.5">Nueva contraseña (mínimo 8 caracteres)</label>
                <input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="Escribe tu nueva contraseña" className={inputCls} />
              </div>
              <div>
                <label htmlFor="pw2" className="block text-xs font-medium text-text-secondary mb-1.5">Confirmar contraseña</label>
                <input id="pw2" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" placeholder="Repite tu nueva contraseña" className={inputCls} />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3.5 font-bold text-bg-main bg-green-primary rounded-btn hover:bg-green-primary/90 transition-all text-sm focus:outline-none focus:ring-2 focus:ring-green-primary focus:ring-offset-2 focus:ring-offset-bg-card disabled:opacity-50">
                {loading ? "Guardando..." : "Guardar nueva contraseña"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
