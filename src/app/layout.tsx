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
  title: "Journal Digital Trader Invest — Opera con Datos. Mejora con Evidencia.",
  description:
    "El diario de trading profesional con analítica avanzada, calculadoras de riesgo, simulador Monte Carlo y Mentor IA. Empieza gratis 7 días. $14.99/mes.",
  keywords: [
    "trading journal", "diario de trading", "trade analytics", "analítica de trading",
    "risk calculator", "calculadora de riesgo", "AI trading mentor", "mentor de trading IA",
    "funded accounts", "cuentas fondeadas", "forex journal", "futures journal",
    "trading strategy", "estrategia de trading", "monte carlo simulator", "simulador monte carlo",
    "FTMO journal", "prop firm tracker", "psychology trading journal",
  ],
  openGraph: {
    title: "Journal Digital Trader Invest — Opera con Datos. Mejora con Evidencia.",
    description:
      "Diario de trading + analítica avanzada + calculadoras de riesgo + Mentor IA. 7 días gratis, luego $14.99/mes.",
    type: "website",
    url: "https://journal-digital-trader.vercel.app",
    locale: "es_ES",
    alternateLocale: "en_US",
    siteName: "Journal Digital Trader Invest",
    images: [
      {
        url: "https://journal-digital-trader.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "Journal Digital Trader Invest — Opera con Datos. Mejora con Evidencia.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Journal Digital Trader Invest",
    description: "Opera con Datos. Mejora con Evidencia. Journal + Analítica + Riesgo + IA. 7 días gratis.",
    images: ["https://journal-digital-trader.vercel.app/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://journal-digital-trader.vercel.app",
    languages: {
      "es": "https://journal-digital-trader.vercel.app",
      "en": "https://journal-digital-trader.vercel.app/en",
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
