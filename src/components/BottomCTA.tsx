"use client";

import { useI18n } from "@/lib/i18n";
import Link from "next/link";

export function BottomCTA() {
  const { t } = useI18n();

  return (
    <section className="relative overflow-hidden">
      {/* Background - cinematic dark landscape */}
      <div
        className="relative py-28 sm:py-40"
        style={{
          background: "linear-gradient(180deg, #061421 0%, #030e1a 40%, #020b15 100%)",
        }}
      >
        {/* Mountain silhouette SVG */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Horizon glow */}
          <div className="absolute bottom-0 left-0 right-0 h-48"
            style={{
              background: "linear-gradient(to top, rgba(32,229,141,0.04) 0%, transparent 100%)",
            }}
          />
          {/* Mountain range SVG */}
          <svg
            viewBox="0 0 1440 400"
            className="absolute bottom-0 left-0 w-full"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M0,400 L0,300 L80,250 L160,280 L240,200 L320,240 L400,160 L480,200 L520,140 L560,160 L620,80 L680,120 L740,60 L800,100 L860,40 L920,80 L980,50 L1040,90 L1100,30 L1160,70 L1220,110 L1280,180 L1360,250 L1440,300 L1440,400 Z"
              fill="#050e18"
            />
            <path
              d="M0,400 L0,350 L100,320 L200,340 L300,280 L420,300 L520,240 L600,260 L700,200 L800,230 L900,180 L1000,220 L1100,170 L1200,210 L1300,280 L1440,320 L1440,400 Z"
              fill="#040c14"
              opacity="0.9"
            />
          </svg>

          {/* Subtle grid */}
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: "linear-gradient(#20E58D 1px, transparent 1px), linear-gradient(90deg, #20E58D 1px, transparent 1px)",
              backgroundSize: "80px 80px",
            }}
          />

          {/* Right decorative text */}
          <div className="absolute right-8 sm:right-16 bottom-1/3 transform translate-y-1/2 text-right hidden lg:block">
            <p className="text-[11px] italic text-text-muted opacity-60">Small steps.</p>
            <p className="text-[11px] italic text-green-primary opacity-50 font-medium">Big results.</p>
          </div>

          {/* Silhouette figure */}
          <svg
            viewBox="0 0 100 200"
            className="absolute bottom-0 left-1/2 -translate-x-1/2 h-48 sm:h-64 opacity-20"
            aria-hidden="true"
          >
            <ellipse cx="50" cy="80" rx="12" ry="12" fill="#20E58D" />
            <rect x="42" y="92" width="16" height="50" rx="6" fill="#20E58D" />
            <rect x="30" y="100" width="12" height="35" rx="5" fill="#20E58D" transform="rotate(-15 36 100)" />
            <rect x="58" y="100" width="12" height="35" rx="5" fill="#20E58D" transform="rotate(15 64 100)" />
            <rect x="36" y="142" width="10" height="45" rx="5" fill="#20E58D" />
            <rect x="54" y="142" width="10" height="45" rx="5" fill="#20E58D" />
          </svg>
        </div>

        {/* Text content */}
        <div className="relative text-center px-6 max-w-3xl mx-auto">
          <p className="text-xs font-semibold tracking-[0.2em] text-green-primary uppercase mb-6">
            {t("cta_section.accent")}
          </p>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary leading-tight mb-8">
            {t("cta_section.line1")}
            <br />
            <span className="text-green-primary">{t("cta_section.line2")}</span>
          </h2>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 font-bold text-bg-main bg-green-primary rounded-btn hover:bg-green-primary/90 transition-all shadow-green-glow text-base focus:outline-none focus:ring-2 focus:ring-green-primary focus:ring-offset-2 focus:ring-offset-bg-main"
          >
            {t("cta_section.button")} →
          </Link>
        </div>
      </div>
    </section>
  );
}
