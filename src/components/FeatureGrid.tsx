"use client";

import { useI18n } from "@/lib/i18n";
import {
  BookOpen, BarChart2, ShieldCheck, Cpu, Brain, HeartPulse, Wallet, Globe
} from "lucide-react";
import { PricingCard } from "./PricingCard";
import { Check, Star } from "lucide-react";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  accentClass: string; // e.g. "card-hover-green"
  iconColor: string;
  iconBg: string;
}

function FeatureCard({ icon, title, description, accentClass, iconColor, iconBg }: FeatureCardProps) {
  return (
    <div className={`group relative flex flex-col gap-3 rounded-card border border-border-card bg-bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 ${accentClass}`}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg} transition-transform group-hover:scale-105`}>
        <span className={iconColor}>{icon}</span>
      </div>
      <div>
        <h3 className="mb-1 text-sm font-semibold text-text-primary">{title}</h3>
        <p className="text-[12px] leading-relaxed text-text-muted">{description}</p>
      </div>
    </div>
  );
}

function TestimonialPlaceholder() {
  return (
    <div className="flex flex-col gap-4 rounded-card border border-border-card bg-bg-card p-6">
      {/* Stars */}
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="h-4 w-4 fill-yellow-warn text-yellow-warn" />
        ))}
      </div>
      {/* Quote text placeholder */}
      <blockquote className="text-sm leading-relaxed text-text-secondary italic">
        &ldquo;This platform completely changed the way I analyze my trades. The AI mentor is like having a personal coach.&rdquo;
      </blockquote>
      {/* Attribution */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-accent to-violet-accent flex items-center justify-center text-white text-xs font-bold">
          DM
        </div>
        <div>
          <p className="text-xs font-semibold text-text-primary">— Daniel M.</p>
          <p className="text-[11px] text-text-muted">Futures Trader</p>
        </div>
      </div>
      <p className="text-[10px] text-text-muted border-t border-border-card pt-3">
        ⚠️ Sample testimonial — not real customer data. Real testimonials coming soon.
      </p>
    </div>
  );
}

export function FeatureGrid() {
  const { t } = useI18n();

  const features = [
    {
      icon: <BookOpen className="h-5 w-5" />,
      titleKey: "features.journal_title",
      descKey: "features.journal_desc",
      iconColor: "text-green-primary",
      iconBg: "bg-green-primary/10",
      accentClass: "card-hover-green",
    },
    {
      icon: <BarChart2 className="h-5 w-5" />,
      titleKey: "features.analytics_title",
      descKey: "features.analytics_desc",
      iconColor: "text-blue-accent",
      iconBg: "bg-blue-accent/10",
      accentClass: "card-hover-blue",
    },
    {
      icon: <ShieldCheck className="h-5 w-5" />,
      titleKey: "features.risk_title",
      descKey: "features.risk_desc",
      iconColor: "text-yellow-warn",
      iconBg: "bg-yellow-warn/10",
      accentClass: "card-hover-green",
    },
    {
      icon: <Cpu className="h-5 w-5" />,
      titleKey: "features.simulator_title",
      descKey: "features.simulator_desc",
      iconColor: "text-blue-accent",
      iconBg: "bg-blue-accent/10",
      accentClass: "card-hover-blue",
    },
    {
      icon: <Brain className="h-5 w-5" />,
      titleKey: "features.ai_title",
      descKey: "features.ai_desc",
      iconColor: "text-violet-accent",
      iconBg: "bg-violet-accent/10",
      accentClass: "card-hover-violet",
    },
    {
      icon: <HeartPulse className="h-5 w-5" />,
      titleKey: "features.psychology_title",
      descKey: "features.psychology_desc",
      iconColor: "text-violet-accent",
      iconBg: "bg-violet-accent/10",
      accentClass: "card-hover-violet",
    },
    {
      icon: <Wallet className="h-5 w-5" />,
      titleKey: "features.funded_title",
      descKey: "features.funded_desc",
      iconColor: "text-blue-accent",
      iconBg: "bg-blue-accent/10",
      accentClass: "card-hover-blue",
    },
    {
      icon: <Globe className="h-5 w-5" />,
      titleKey: "features.multimarket_title",
      descKey: "features.multimarket_desc",
      iconColor: "text-green-primary",
      iconBg: "bg-green-primary/10",
      accentClass: "card-hover-green",
    },
  ];

  return (
    <section id="features" className="bg-bg-main py-20 px-6">
      <div className="mx-auto max-w-content">

        {/* ── Two-column layout: left = header+grid, right = testimonial+pricing ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-10 xl:gap-8">

          {/* Left: section header + feature cards */}
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-text-primary sm:text-4xl leading-tight mb-2">
                {t("features.title")}
              </h2>
              <p className="text-text-secondary text-[15px]">{t("features.subtitle")}</p>
            </div>

            {/* Feature cards grid — 4 columns, 2 rows */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {features.map((f) => (
                <FeatureCard
                  key={f.titleKey}
                  icon={f.icon}
                  title={t(f.titleKey)}
                  description={t(f.descKey)}
                  iconColor={f.iconColor}
                  iconBg={f.iconBg}
                  accentClass={f.accentClass}
                />
              ))}
            </div>
          </div>

          {/* Right: testimonial + pricing stacked */}
          <div className="flex flex-col gap-4">
            <TestimonialPlaceholder />
            <div id="pricing">
              <PricingCard />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
