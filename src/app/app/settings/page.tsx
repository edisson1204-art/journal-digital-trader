"use client";

import { AppShell } from "@/components/AppShell";
import { useState } from "react";
import { User, Lock, Bell, CreditCard, Shield, LogOut, ChevronRight } from "lucide-react";

const SECTIONS = [
  { id:"profile",        icon: User,        label:"Perfil"                  },
  { id:"security",       icon: Lock,        label:"Seguridad"               },
  { id:"notifications",  icon: Bell,        label:"Notificaciones"          },
  { id:"subscription",   icon: CreditCard,  label:"Suscripción"             },
  { id:"privacy",        icon: Shield,      label:"Privacidad y Datos"      },
];

export default function SettingsPage() {
  const [section, setSection]     = useState("profile");
  const [saved, setSaved]         = useState(false);
  const [name, setName]           = useState("Trader Demo");
  const [email, setEmail]         = useState("trader@example.com");
  const [timezone, setTimezone]   = useState("America/Chicago");
  const [currency, setCurrency]   = useState("USD");
  const [notifEmail, setNEmail]   = useState(true);
  const [notifPush, setNPush]     = useState(false);
  const [notifDaily, setNDaily]   = useState(true);

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold text-text-secondary">{label}</label>
      {children}
    </div>
  );

  const TextInput = ({ value, onChange, type = "text", placeholder }: {
    value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
  }) => (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-green-primary focus:ring-1 focus:ring-green-primary transition-colors" />
  );

  const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
    <label className="flex items-center justify-between cursor-pointer py-3 border-b border-border-card/30">
      <span className="text-[13px] text-text-secondary">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-primary ${checked ? "bg-green-primary" : "bg-border-card"}`}
        role="switch" aria-checked={checked}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </label>
  );

  return (
    <AppShell title="Configuración" subtitle="Ajusta tu cuenta y preferencias">
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5 max-w-[900px]">

        {/* ── Sidebar nav ── */}
        <div className="flex flex-col gap-1">
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-[13px] font-medium transition-colors ${
                section === s.id
                  ? "bg-green-primary/10 text-green-primary border border-green-primary/25"
                  : "text-text-secondary hover:bg-bg-section hover:text-text-primary"
              }`}>
              <s.icon className="h-4 w-4 flex-shrink-0" />
              {s.label}
              <ChevronRight className={`h-3.5 w-3.5 ml-auto ${section === s.id ? "text-green-primary" : "text-text-muted"}`} />
            </button>
          ))}
          <div className="mt-4 pt-4 border-t border-border-card/40">
            <button className="flex items-center gap-3 rounded-xl px-4 py-3 text-[13px] font-medium text-red-loss hover:bg-red-loss/5 transition-colors w-full">
              <LogOut className="h-4 w-4" /> Cerrar Sesión
            </button>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="rounded-card border border-border-card bg-bg-card p-6">

          {/* PROFILE */}
          {section === "profile" && (
            <div className="flex flex-col gap-5">
              <h2 className="text-[15px] font-bold text-text-primary border-b border-border-card/50 pb-3">Perfil de Trader</h2>

              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-green-primary/30 to-blue-accent/30 flex items-center justify-center border border-border-card">
                  <User className="h-7 w-7 text-green-primary" />
                </div>
                <div>
                  <p className="text-[13px] text-text-secondary mb-1">{name}</p>
                  <button className="text-[11px] text-green-primary hover:underline">Cambiar foto de perfil</button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nombre completo">
                  <TextInput value={name} onChange={setName} />
                </Field>
                <Field label="Email">
                  <TextInput value={email} onChange={setEmail} type="email" />
                </Field>
                <Field label="Zona Horaria">
                  <select value={timezone} onChange={e => setTimezone(e.target.value)}
                    className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-green-primary transition-colors">
                    <option value="America/New_York">New York (ET)</option>
                    <option value="America/Chicago">Chicago (CT)</option>
                    <option value="America/Denver">Denver (MT)</option>
                    <option value="America/Los_Angeles">Los Angeles (PT)</option>
                    <option value="America/Bogota">Bogotá (COT)</option>
                    <option value="America/Mexico_City">Ciudad de México (CST)</option>
                    <option value="Europe/London">Londres (GMT)</option>
                    <option value="Europe/Madrid">Madrid (CET)</option>
                  </select>
                </Field>
                <Field label="Moneda base">
                  <select value={currency} onChange={e => setCurrency(e.target.value)}
                    className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-green-primary transition-colors">
                    <option>USD</option><option>EUR</option><option>GBP</option><option>CAD</option><option>MXN</option>
                  </select>
                </Field>
                <Field label="Experiencia de trading">
                  <select className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-green-primary transition-colors">
                    <option>Menos de 1 año</option><option>1–2 años</option>
                    <option>2–5 años</option><option>5–10 años</option><option>+10 años</option>
                  </select>
                </Field>
                <Field label="Tipo de trader">
                  <select className="w-full rounded-lg bg-bg-section border border-border-card px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-green-primary transition-colors">
                    <option>Day Trader</option><option>Swing Trader</option>
                    <option>Scalper</option><option>Position Trader</option><option>Mixto</option>
                  </select>
                </Field>
              </div>
            </div>
          )}

          {/* SECURITY */}
          {section === "security" && (
            <div className="flex flex-col gap-5">
              <h2 className="text-[15px] font-bold text-text-primary border-b border-border-card/50 pb-3">Seguridad</h2>
              <div className="grid grid-cols-1 gap-4">
                <Field label="Contraseña actual">
                  <TextInput value="" onChange={() => {}} type="password" placeholder="••••••••" />
                </Field>
                <Field label="Nueva contraseña">
                  <TextInput value="" onChange={() => {}} type="password" placeholder="••••••••" />
                </Field>
                <Field label="Confirmar nueva contraseña">
                  <TextInput value="" onChange={() => {}} type="password" placeholder="••••••••" />
                </Field>
              </div>
              <div className="rounded-xl border border-blue-accent/20 bg-blue-accent/5 p-4 text-[12px] text-text-secondary">
                <p className="font-semibold text-text-primary mb-1">Autenticación de 2 Factores (2FA)</p>
                <p className="mb-3">Agrega una capa extra de seguridad a tu cuenta.</p>
                <button className="rounded-btn border border-blue-accent/30 bg-blue-accent/10 px-4 py-2 text-[12px] font-semibold text-blue-accent hover:bg-blue-accent/20 transition-colors">
                  Activar 2FA
                </button>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {section === "notifications" && (
            <div className="flex flex-col gap-4">
              <h2 className="text-[15px] font-bold text-text-primary border-b border-border-card/50 pb-3">Notificaciones</h2>
              <Toggle checked={notifEmail} onChange={setNEmail} label="Resumen diario por email" />
              <Toggle checked={notifPush}  onChange={setNPush}  label="Notificaciones push en el navegador" />
              <Toggle checked={notifDaily} onChange={setNDaily} label="Alerta cuando se acerca al Daily Loss Limit" />
              <Toggle checked={true}       onChange={() => {}}  label="Notificación de nueva función disponible" />
              <Toggle checked={false}      onChange={() => {}}  label="Emails de marketing y novedades" />
            </div>
          )}

          {/* SUBSCRIPTION */}
          {section === "subscription" && (
            <div className="flex flex-col gap-5">
              <h2 className="text-[15px] font-bold text-text-primary border-b border-border-card/50 pb-3">Suscripción</h2>
              <div className="rounded-xl border border-green-primary/30 bg-green-primary/5 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] text-green-primary font-bold uppercase tracking-wider mb-1">Plan Activo</p>
                    <p className="text-[18px] font-extrabold text-text-primary">Plan Pro</p>
                    <p className="text-[13px] text-text-muted mt-1">$9 / mes · Facturado mensualmente</p>
                  </div>
                  <span className="rounded-full bg-green-primary/20 border border-green-primary/40 px-3 py-1 text-[11px] font-bold text-green-primary">Activo</span>
                </div>
                <div className="mt-4 pt-4 border-t border-green-primary/20 text-[12px] text-text-secondary">
                  <p>Próxima facturación: <strong className="text-text-primary">15 de Octubre, 2025</strong></p>
                  <p className="mt-1">Método de pago: <strong className="text-text-primary">Visa •••• 4242</strong></p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button className="rounded-btn border border-border-card px-4 py-2.5 text-[13px] text-text-secondary hover:bg-white/5 transition-colors self-start">
                  Cambiar método de pago
                </button>
                <button className="rounded-btn border border-red-loss/30 text-red-loss px-4 py-2.5 text-[13px] hover:bg-red-loss/5 transition-colors self-start">
                  Cancelar suscripción
                </button>
              </div>
            </div>
          )}

          {/* PRIVACY */}
          {section === "privacy" && (
            <div className="flex flex-col gap-5">
              <h2 className="text-[15px] font-bold text-text-primary border-b border-border-card/50 pb-3">Privacidad y Datos</h2>
              <div className="flex flex-col gap-3">
                <button className="flex items-center justify-between rounded-xl border border-border-card bg-bg-section px-4 py-3 hover:border-border-card text-[13px] text-text-secondary hover:text-text-primary transition-colors">
                  <span>Exportar todos mis datos (JSON)</span>
                  <ChevronRight className="h-4 w-4 text-text-muted" />
                </button>
                <button className="flex items-center justify-between rounded-xl border border-border-card bg-bg-section px-4 py-3 text-[13px] text-text-secondary hover:text-text-primary transition-colors">
                  <span>Exportar trades (CSV)</span>
                  <ChevronRight className="h-4 w-4 text-text-muted" />
                </button>
              </div>
              <div className="rounded-xl border border-red-loss/20 bg-red-loss/5 p-4">
                <p className="text-[13px] font-semibold text-red-loss mb-1">Zona de Peligro</p>
                <p className="text-[11px] text-text-muted mb-3">Esta acción es permanente e irreversible.</p>
                <button className="rounded-btn border border-red-loss/30 bg-red-loss/10 px-4 py-2 text-[12px] font-semibold text-red-loss hover:bg-red-loss/20 transition-colors">
                  Eliminar mi cuenta y todos mis datos
                </button>
              </div>
            </div>
          )}

          {/* Save button */}
          {["profile","security","notifications"].includes(section) && (
            <div className="flex items-center gap-3 mt-5 pt-5 border-t border-border-card/40">
              <button onClick={save}
                className="rounded-btn bg-green-primary px-6 py-2.5 text-[13px] font-bold text-bg-main hover:bg-green-primary/90 transition-all shadow-green-glow-sm focus:outline-none focus:ring-2 focus:ring-green-primary">
                Guardar Cambios
              </button>
              {saved && (
                <span className="text-[12px] text-green-primary font-medium animate-fade-in">
                  ✓ Cambios guardados
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
