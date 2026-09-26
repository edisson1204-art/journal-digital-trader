"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, BookOpen, BarChart2, Calendar,
  Shield, Cpu, Brain, Target, Wallet, HeartPulse,
  FileText, ChevronLeft, ChevronRight, Bell, Settings,
  LogOut, Menu, X, Globe
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useSettingsStore } from "@/store/settingsStore";

const accentMap: Record<string, string> = {
  violet: "text-violet-accent bg-violet-accent/10",
  default: "text-green-primary bg-green-primary/10",
};

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function AppShell({ children, title, subtitle }: AppShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // Translation Hooks
  const { t, language } = useTranslation();
  const { setLanguage } = useSettingsStore();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => setMounted(true), []);

  const NAV = [
    { icon: LayoutDashboard, label: t("sidebar.dashboard"),   href: "/app"              },
    { icon: BookOpen,         label: t("sidebar.journal"),     href: "/app/journal"      },
    { icon: BarChart2,        label: t("sidebar.analytics"),   href: "/app/analytics"    },
    { icon: Calendar,         label: t("sidebar.calendar"),    href: "/app/calendar"     },
    { icon: Shield,           label: t("sidebar.risk"),        href: "/app/risk"         },
    { icon: Cpu,              label: t("sidebar.simulator"),   href: "/app/simulator"    },
    { icon: Brain,            label: t("sidebar.aiMentor"),    href: "/app/ai-mentor",   accent: "violet" },
    { icon: Target,           label: t("sidebar.strategies"),  href: "/app/strategies"   },
    { icon: Wallet,           label: "Accounts",               href: "/app/accounts"     }, // TODO: translate
    { icon: HeartPulse,       label: t("sidebar.psychology"),  href: "/app/psychology",  accent: "violet" },
    { icon: FileText,         label: t("sidebar.reports"),     href: "/app/reports"      },
  ];


  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className={`flex items-center px-4 py-4 border-b border-border-card/60 ${collapsed ? "justify-center" : "gap-2"}`}>
        {collapsed ? (
          <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="8" fill="#0D2133" />
            <rect x="6" y="8" width="20" height="4.5" rx="1.5" fill="#F8FAFC" />
            <rect x="13" y="12.5" width="6" height="16" rx="1.5" fill="#F8FAFC" />
            <rect x="25" y="14" width="5" height="14.5" rx="1.5" fill="#20E58D" />
            <rect x="6" y="28.5" width="14" height="3" rx="1.5" fill="#20E58D" />
          </svg>
        ) : (
          <Logo size="sm" />
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5 overflow-y-auto" aria-label="App navigation">
        {NAV.map(({ icon: Icon, label, href, accent }) => {
          const isActive = pathname === href || (href !== "/app" && pathname.startsWith(href));
          const accentStyle = isActive
            ? (accent ? accentMap[accent] : accentMap.default)
            : "text-text-muted";

          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] font-medium transition-all hover:bg-white/5 hover:text-text-secondary group ${
                isActive ? `${accentStyle} bg-white/5` : "text-text-muted"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? accentStyle.split(" ")[0] : "text-text-muted group-hover:text-text-secondary"}`} />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom user section */}
      <div className={`border-t border-border-card/60 p-3 flex flex-col gap-1 ${collapsed ? "items-center" : ""}`}>
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-accent to-violet-accent flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
              T
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-text-primary truncate">Trader Pro</p>
              <p className="text-[10px] text-green-primary">Active · $9/mo</p>
            </div>
          </div>
        )}
        
        {/* Language Toggle */}
        <button 
          onClick={() => setLanguage(language === "es" ? "en" : "es")}
          className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] text-text-muted hover:text-text-secondary hover:bg-white/5 transition-colors w-full ${collapsed ? "justify-center" : ""}`}
        >
          <Globe className="h-3.5 w-3.5" />
          {!collapsed && (
            <div className="flex items-center justify-between flex-1">
              <span>{t("common.language")}</span>
              <span className="text-[9px] font-bold text-text-muted uppercase bg-bg-section px-1.5 py-0.5 rounded">
                {mounted ? language : 'es'}
              </span>
            </div>
          )}
        </button>

        <Link href="/app/settings" className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] text-text-muted hover:text-text-secondary hover:bg-white/5 transition-colors ${collapsed ? "justify-center" : ""}`}>
          <Settings className="h-3.5 w-3.5" />
          {!collapsed && t("sidebar.settings")}
        </Link>
        <Link href="/" className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] text-text-muted hover:text-red-loss hover:bg-red-loss/5 transition-colors ${collapsed ? "justify-center" : ""}`}>
          <LogOut className="h-3.5 w-3.5" />
          {!collapsed && t("sidebar.logout")}
        </Link>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-bg-main overflow-hidden">
      {/* ── Sidebar — desktop ── */}
      <aside
        className={`hidden md:flex flex-col flex-shrink-0 border-r border-border-card bg-bg-card transition-all duration-200 ${
          collapsed ? "w-14" : "w-52"
        }`}
      >
        <SidebarContent />

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute left-0 top-1/2 -translate-y-1/2 translate-x-full z-10 h-6 w-6 flex items-center justify-center rounded-r-md border border-l-0 border-border-card bg-bg-card text-text-muted hover:text-text-primary transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{ left: collapsed ? 56 : 208 }}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-56 flex-col bg-bg-card border-r border-border-card md:hidden">
            <SidebarContent />
          </aside>
        </>
      )}

      {/* ── Main area ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border-card/60 bg-bg-card/80 backdrop-blur-sm px-5">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              className="md:hidden text-text-muted hover:text-text-primary transition-colors"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>

            {title && (
              <div>
                <h1 className="text-[15px] font-semibold text-text-primary leading-none">{title}</h1>
                {subtitle && <p className="text-[11px] text-text-muted mt-0.5">{subtitle}</p>}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Demo data badge */}
            <span className="hidden sm:inline-flex rounded border border-yellow-warn/25 bg-yellow-warn/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-yellow-warn">
              DEMO DATA
            </span>

            {/* Notifications */}
            <button className="relative text-text-muted hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-green-primary rounded-md" aria-label="Notifications">
              <Bell className="h-4 w-4" />
              <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-green-primary" aria-hidden="true" />
            </button>

            {/* Avatar */}
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-accent to-violet-accent flex items-center justify-center text-[10px] font-bold text-white">
              T
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-5 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
