import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — Trading Intelligence",
  description: "Your trading dashboard — journal, analytics, risk tools and AI mentor.",
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
