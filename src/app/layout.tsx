import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Journal Digital Trader Invest — Trade with data. Improve with evidence.",
  description:
    "The all-in-one trading journal, analytics, risk tools and AI mentor designed to help you become a more consistent trader. Start for $14.99/mes.",
  keywords: [
    "trading journal", "trade analytics", "risk calculator", "AI trading mentor",
    "funded accounts", "forex journal", "futures journal", "trading strategy",
    "diario de trading", "analítica de trading"
  ],
  openGraph: {
    title: "Journal Digital Trader Invest — Trade with data. Improve with evidence.",
    description:
      "The all-in-one trading journal, analytics, risk tools and AI mentor. Start for $14.99/mes.",
    type: "website",
    locale: "en_US",
    alternateLocale: "es_ES",
    siteName: "Journal Digital Trader Invest",
  },
  twitter: {
    card: "summary_large_image",
    title: "Journal Digital Trader Invest",
    description: "Trade with data. Improve with evidence. Journal + Analytics + Risk + AI. $14.99/mes.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/en",
      "es-ES": "/es",
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" translate="no" className="dark scroll-smooth" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body className={`${inter.variable} font-sans bg-bg-main text-text-primary antialiased`}>
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
