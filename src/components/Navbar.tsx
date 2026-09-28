"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useI18n } from "@/lib/i18n";

const NAV_LINKS = [
  { key: "nav.product",   href: "#features" },
  { key: "nav.features",  href: "#features" },
  { key: "nav.pricing",   href: "#pricing"  },
  { key: "nav.resources", href: "#"         },
];

export function Navbar() {
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 border-b border-border-card/40 bg-bg-main/80 backdrop-blur-md"
      role="banner"
    >
      <nav
        className="mx-auto flex h-14 max-w-[1380px] items-center justify-between px-6"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link href="/" aria-label="Journal Digital Trader Invest home">
          <Logo size="sm" />
        </Link>

        {/* Center nav links — desktop */}
        <ul className="hidden items-center gap-0.5 md:flex" role="list">
          {NAV_LINKS.map(({ key, href }) => (
            <li key={key}>
              <Link
                href={href}
                className="rounded-md px-4 py-2 text-[13px] text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary"
              >
                {t(key)}
              </Link>
            </li>
          ))}
        </ul>

        {/* Right actions — desktop */}
        <div className="hidden items-center gap-2 md:flex">
          <LanguageSwitcher />

          <div className="mx-1 h-4 w-px bg-border-card" aria-hidden="true" />

          <Link
            href="/login"
            className="px-4 py-1.5 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
          >
            {t("nav.login")}
          </Link>

          <Link
            href="/signup"
            className="rounded-btn bg-green-primary px-4 py-2 text-[13px] font-bold text-bg-main shadow-green-glow-sm transition-all hover:bg-green-primary/90 focus:outline-none focus:ring-2 focus:ring-green-primary focus:ring-offset-2 focus:ring-offset-bg-main"
          >
            {t("nav.cta")}
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="rounded-md p-2 text-text-secondary transition-colors hover:text-text-primary md:hidden focus:outline-none focus:ring-2 focus:ring-green-primary"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          id="mobile-menu"
          className="border-t border-border-card/40 bg-bg-main/95 backdrop-blur-md md:hidden"
        >
          <div className="flex flex-col gap-1 px-6 py-4">
            {NAV_LINKS.map(({ key, href }) => (
              <Link
                key={key}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="rounded-md py-2.5 px-2 text-[14px] text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary"
              >
                {t(key)}
              </Link>
            ))}

            <hr className="my-2 border-border-card/50" />

            <div className="flex items-center justify-between py-1.5">
              <span className="text-[13px] text-text-muted">Language</span>
              <LanguageSwitcher />
            </div>

            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="py-2.5 px-2 text-[14px] text-text-secondary transition-colors hover:text-text-primary"
            >
              {t("nav.login")}
            </Link>

            <Link
              href="/signup"
              onClick={() => setMobileOpen(false)}
              className="mt-2 block rounded-btn bg-green-primary py-3 text-center text-[14px] font-bold text-bg-main transition-all hover:bg-green-primary/90"
            >
              {t("nav.cta")}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
