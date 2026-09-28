import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className, size = "md" }: LogoProps) {
  const dims = {
    sm: { mark: 32, textTop: "text-[11px]", textBot: "text-[8px]", gap: "gap-2" },
    md: { mark: 40, textTop: "text-[14px]", textBot: "text-[10px]", gap: "gap-3" },
    lg: { mark: 48, textTop: "text-[17px]", textBot: "text-[11px]", gap: "gap-3.5" },
  };
  const d = dims[size];

  return (
    <div className={cn(`flex items-center ${d.gap}`, className)}>
      {/* 🔹 Mark: Digital 'J' composed of grid blocks 🔹 */}
      <svg
        width={d.mark}
        height={d.mark}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="drop-shadow-lg"
      >
        {/* Background container */}
        <rect width="40" height="40" rx="10" fill="#0D2133" />

        {/* Digital J Blocks */}
        {/* Left Hook */}
        <rect x="9" y="17" width="6" height="6" rx="1.5" fill="#F8FAFC" />
        <rect x="9" y="25" width="6" height="6" rx="1.5" fill="#F8FAFC" />
        
        {/* Bottom Base */}
        <rect x="17" y="25" width="6" height="6" rx="1.5" fill="#F8FAFC" />
        
        {/* Right Stem */}
        <rect x="25" y="25" width="6" height="6" rx="1.5" fill="#F8FAFC" />
        <rect x="25" y="17" width="6" height="6" rx="1.5" fill="#F8FAFC" />
        
        {/* Top Right Dot (Green Accent - "Trader Invest") */}
        <rect x="25" y="9" width="6" height="6" rx="1.5" fill="#20E58D" className="animate-pulse" />
      </svg>

      {/* 🔹 Brand Text 🔹 */}
      <div className="flex flex-col leading-[1.15]">
        <span className={cn("font-black tracking-[0.11em] text-text-primary uppercase", d.textTop)}>
          JOURNAL DIGITAL
        </span>
        <span className={cn("font-semibold tracking-[0.16em] text-green-primary uppercase", d.textBot)}>
          TRADER INVEST
        </span>
      </div>
    </div>
  );
}
