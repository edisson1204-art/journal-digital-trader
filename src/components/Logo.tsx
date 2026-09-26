import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className, size = "md" }: LogoProps) {
  const dims = {
    sm: { mark: 32, textTop: "text-[13px]", textBot: "text-[9px]", gap: "gap-2" },
    md: { mark: 38, textTop: "text-[15px]", textBot: "text-[10px]", gap: "gap-2.5" },
    lg: { mark: 48, textTop: "text-[19px]", textBot: "text-[12px]", gap: "gap-3" },
  };
  const d = dims[size];

  return (
    <div className={cn(`flex items-center ${d.gap}`, className)}>
      {/* ── Mark: TI geometric icon ── */}
      <svg
        width={d.mark}
        height={d.mark}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Background */}
        <rect width="40" height="40" rx="8" fill="#0D2133" />

        {/* T horizontal bar */}
        <rect x="6" y="8" width="20" height="4.5" rx="1.5" fill="#F8FAFC" />
        {/* T vertical stem */}
        <rect x="13" y="12.5" width="6" height="16" rx="1.5" fill="#F8FAFC" />

        {/* I vertical (right side) */}
        <rect x="25" y="14" width="5" height="14.5" rx="1.5" fill="#20E58D" />

        {/* Green accent bar at bottom left */}
        <rect x="6" y="28.5" width="14" height="3" rx="1.5" fill="#20E58D" />
      </svg>

      {/* ── Brand text ── */}
      <div className="flex flex-col leading-[1.1]">
        <span className={cn("font-black tracking-[0.15em] text-text-primary uppercase", d.textTop)}>
          TRADING
        </span>
        <span className={cn("font-semibold tracking-[0.18em] text-green-primary uppercase", d.textBot)}>
          INTELLIGENCE
        </span>
      </div>
    </div>
  );
}
