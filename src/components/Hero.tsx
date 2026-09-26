"use client";

import { useI18n } from "@/lib/i18n";
import { TrendingUp, ShieldCheck, Cpu, Brain } from "lucide-react";
import { HeroDashboard } from "./HeroDashboard";
import { MobileAppPreview } from "./MobileAppPreview";
import Link from "next/link";

const features = [
  { icon: TrendingUp, labelKey: "hero.feature1", color: "text-green-primary", bg: "bg-green-primary/10" },
  { icon: ShieldCheck, labelKey: "hero.feature2", color: "text-blue-accent", bg: "bg-blue-accent/10" },
  { icon: Cpu, labelKey: "hero.feature3", color: "text-green-primary", bg: "bg-green-primary/10" },
  { icon: Brain, labelKey: "hero.feature4", color: "text-violet-accent", bg: "bg-violet-accent/10" },
];

export function Hero() {
  const { t } = useI18n();

  return (
    <section className="relative overflow-hidden bg-bg-main pt-16 min-h-screen flex items-center">
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-1/4 h-[500px] w-[500px] rounded-full bg-green-primary/5 blur-[128px]" />
        <div className="absolute right-0 top-1/3 h-[400px] w-[400px] rounded-full bg-blue-accent/4 blur-[100px]" />
        <div className="absolute inset-0 grid-pattern opacity-[0.035]" />
      </div>

      <div className="relative mx-auto w-full max-w-[1380px] px-6 py-16 xl:py-24">
        <div className="grid grid-cols-1 xl:grid-cols-[44fr_56fr] gap-8 xl:gap-4 items-center">

          {/* ── LEFT COLUMN ── */}
          <div className="flex flex-col gap-5 animate-slide-up xl:pr-6">

            {/* Eyebrow */}
            <p className="text-[11px] font-bold tracking-[0.22em] text-green-primary uppercase">
              {t("hero.eyebrow")}
            </p>

            {/* Headline */}
            <h1 className="text-[2.6rem] leading-[1.1] font-extrabold text-text-primary sm:text-5xl xl:text-[3.5rem]">
              {t("hero.title1")}
              <br />
              <span className="text-green-primary">{t("hero.title2")}</span>
            </h1>

            {/* Description */}
            <p className="max-w-lg text-base leading-relaxed text-text-secondary sm:text-[17px]">
              {t("hero.subtitle")}
            </p>

            {/* Feature icons */}
            <div className="grid grid-cols-4 gap-2.5 mt-1">
              {features.map(({ icon: Icon, labelKey, color, bg }) => (
                <div
                  key={labelKey}
                  className="flex flex-col items-center gap-2 rounded-card border border-border-card bg-bg-card/60 p-3 text-center transition-all hover:border-border-subtle"
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${bg}`}>
                    <Icon className={`h-[18px] w-[18px] ${color}`} />
                  </div>
                  <span className="text-[10px] font-medium leading-tight text-text-secondary">
                    {t(labelKey)}
                  </span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 mt-1">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-btn bg-green-primary px-6 py-3 text-sm font-bold text-bg-main shadow-green-glow transition-all hover:bg-green-primary/90 focus:outline-none focus:ring-2 focus:ring-green-primary focus:ring-offset-2 focus:ring-offset-bg-main"
              >
                {t("hero.cta_primary")} →
              </Link>
              <button className="inline-flex items-center gap-2.5 text-sm text-text-secondary transition-colors hover:text-text-primary focus:outline-none focus:underline">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border-card bg-bg-card text-xs">
                  ▶
                </span>
                {t("hero.cta_secondary")}
              </button>
            </div>

            <p className="text-[11px] text-text-muted">{t("hero.disclaimer")}</p>
          </div>

          {/* ── RIGHT COLUMN — dashboard mockups ── */}
          <div className="relative flex items-center justify-center xl:justify-end">
            {/* Desktop dashboard */}
            <div className="w-full max-w-[640px] xl:max-w-none animate-fade-in">
              <HeroDashboard />
            </div>

            {/* Mobile overlay — bottom-right of the desktop mockup */}
            <div className="absolute -bottom-4 right-0 z-10 hidden xl:block">
              <MobileAppPreview />
            </div>
          </div>
        </div>

        {/* Sub-tagline */}
        <p className="mt-10 hidden text-right text-sm italic text-text-muted xl:block">
          More than a journal.{" "}
          <span className="not-italic font-semibold text-text-secondary">Your trading edge.</span>
        </p>
      </div>
    </section>
  );
}
