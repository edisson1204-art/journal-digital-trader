import Link from "next/link";
import { Logo } from "@/components/Logo";

interface LegalShellProps {
  title: string;
  updated?: string;
  children: React.ReactNode;
}

export function LegalShell({ title, updated = "September 2025", children }: LegalShellProps) {
  return (
    <div className="min-h-screen bg-bg-main">
      {/* Mini header */}
      <header className="border-b border-border-card/40 bg-bg-main/80 backdrop-blur-md sticky top-0 z-30 px-6 py-3 flex items-center justify-between">
        <Link href="/"><Logo size="sm" /></Link>
        <Link href="/" className="text-xs text-text-muted hover:text-green-primary transition-colors">
          ← Back to home
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-text-primary mb-1">{title}</h1>
        <p className="text-sm text-text-muted mb-10">Last updated: {updated}</p>

        <div className="space-y-8 text-[14px] leading-relaxed text-text-secondary">
          {children}
        </div>
      </main>

      <footer className="border-t border-border-card mt-16 py-8 px-6">
        <div className="max-w-3xl mx-auto flex flex-wrap gap-4 text-xs text-text-muted">
          {[
            { label: "Terms", href: "/terms" },
            { label: "Privacy", href: "/privacy" },
            { label: "Risk Disclosure", href: "/risk-disclosure" },
            { label: "Refund Policy", href: "/refund-policy" },
          ].map(({ label, href }) => (
            <Link key={href} href={href} className="hover:text-text-secondary transition-colors">{label}</Link>
          ))}
        </div>
      </footer>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-text-primary mb-3">{title}</h2>
      <div className="space-y-3 text-text-secondary">{children}</div>
    </section>
  );
}
