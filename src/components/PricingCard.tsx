"use client";

import { useI18n } from "@/lib/i18n";
import Link from "next/link";
import { Check } from "lucide-react";

const FEATURES = [
  "pricing.feature1","pricing.feature2","pricing.feature3","pricing.feature4",
  "pricing.feature5","pricing.feature6","pricing.feature7","pricing.feature8",
  "pricing.feature9","pricing.feature10",
] as const;

export function PricingCard() {
  const { t } = useI18n();

  return (
    <div className="relative rounded-card border border-green-primary/30 bg-bg-card p-6 flex flex-col gap-4 shadow-green-glow">
      {/* Most popular badge */}
      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
        <span className="rounded-full bg-green-primary px-4 py-1 text-[11px] font-bold text-bg-main shadow-green-glow-sm uppercase tracking-wider">
          {t("pricing.badge")}
        </span>
      </div>

      {/* Title */}
      <div className="pt-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-secondary mb-3">
          {t("pricing.title")}
        </p>

        {/* Price */}
        <div className="flex items-end gap-1">
          <span className="text-[52px] font-extrabold leading-none tabular-nums text-text-primary">
            {t("pricing.price")}
          </span>
          <span className="mb-2 text-sm text-text-secondary">{t("pricing.period")}</span>
        </div>
      </div>

      <hr className="border-border-card" />

      {/* Features */}
      <ul className="flex flex-col gap-2">
        {FEATURES.map((key) => (
          <li key={key} className="flex items-center gap-2.5">
            <Check className="h-[14px] w-[14px] flex-shrink-0 text-green-primary" />
            <span className="text-[13px] text-text-secondary">{t(key)}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Link
        href="/signup"
        className="mt-1 block w-full rounded-btn bg-green-primary py-3.5 text-center text-[14px] font-bold text-bg-main shadow-green-glow transition-all hover:bg-green-primary/90 focus:outline-none focus:ring-2 focus:ring-green-primary focus:ring-offset-2 focus:ring-offset-bg-card"
      >
        {t("pricing.cta")} →
      </Link>

      <p className="text-center text-[11px] text-text-muted">{t("pricing.billing_note")}</p>
    </div>
  );
}
