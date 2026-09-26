"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { Logo } from "./Logo";

const socialLinks = [
  { label: "X (Twitter)", href: "#", icon: "𝕏" },
  { label: "YouTube", href: "#", icon: "▶" },
  { label: "Instagram", href: "#", icon: "◻" },
  { label: "LinkedIn", href: "#", icon: "in" },
];

export function Footer() {
  const { t } = useI18n();

  const legalLinks = [
    { key: "footer.terms", href: "/terms" },
    { key: "footer.privacy", href: "/privacy" },
    { key: "footer.risk", href: "/risk-disclosure" },
    { key: "footer.refund", href: "/refund-policy" },
    { key: "footer.contact", href: "#" },
  ];

  return (
    <footer className="border-t border-border-card bg-bg-main py-10 px-6" role="contentinfo">
      <div className="max-w-content mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
        {/* Logo */}
        <div className="flex-shrink-0">
          <Logo size="sm" />
        </div>

        {/* Legal links */}
        <nav aria-label="Legal navigation">
          <ul className="flex flex-wrap gap-x-6 gap-y-2" role="list">
            {legalLinks.map(({ key, href }) => (
              <li key={key}>
                <Link
                  href={href}
                  className="text-xs text-text-muted hover:text-text-secondary transition-colors"
                >
                  {t(key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Social + copyright */}
        <div className="flex flex-col items-start sm:items-end gap-3">
          {/* Social icons */}
          <div className="flex items-center gap-4" aria-label="Social media">
            {socialLinks.map(({ label, href, icon }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="w-8 h-8 rounded-lg border border-border-card flex items-center justify-center text-text-muted hover:text-text-primary hover:border-border-subtle transition-colors text-sm font-bold"
              >
                {icon}
              </a>
            ))}
          </div>

          {/* Copyright */}
          <p className="text-[11px] text-text-muted">{t("footer.copyright")}</p>
        </div>
      </div>
    </footer>
  );
}
