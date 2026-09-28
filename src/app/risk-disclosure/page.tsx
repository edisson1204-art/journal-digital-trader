import Link from "next/link";

function LegalLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-main px-6 py-20">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-xs text-green-primary hover:underline mb-8 block">
          ← Back to Journal Digital Trader Invest
        </Link>
        <h1 className="text-3xl font-bold text-text-primary mb-2">{title}</h1>
        <p className="text-sm text-text-muted mb-8">Last updated: September 2025</p>
        <div className="prose prose-invert max-w-none text-text-secondary text-sm leading-relaxed space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function RiskDisclosurePage() {
  return (
    <LegalLayout title="Risk Disclosure">
      <p className="text-yellow-warn font-semibold">
        ⚠️ IMPORTANT: Please read this Risk Disclosure carefully before using Journal Digital Trader Invest.
      </p>
      <h2 className="text-text-primary font-semibold text-base mt-6">Trading Involves Risk</h2>
      <p>
        Trading financial instruments including futures, forex, stocks, options, cryptocurrencies,
        and other instruments involves substantial risk of loss. You can lose more than your initial investment.
        Past performance is not indicative of future results.
      </p>
      <h2 className="text-text-primary font-semibold text-base mt-6">Journal Digital Trader Invest Is Not a Broker</h2>
      <p>
        Journal Digital Trader Invest is a trading journal, analytics, and educational software platform.
        It does not execute trades, provide brokerage services, or manage your capital in any way.
      </p>
      <h2 className="text-text-primary font-semibold text-base mt-6">Demo Data</h2>
      <p>
        Any metrics, charts, or trade examples shown on the platform or marketing materials are demo data
        for illustration purposes only. They do not represent real customer results or guarantees of any kind.
      </p>
      <h2 className="text-text-primary font-semibold text-base mt-6">Backtesting & Simulation</h2>
      <p>
        Backtesting results and simulated performance do not guarantee future results. Simulated trading
        has inherent limitations and does not account for real market conditions, slippage, or liquidity.
      </p>
      <h2 className="text-text-primary font-semibold text-base mt-6">No Financial Advice</h2>
      <p>
        Nothing on this platform constitutes financial, investment, legal, or tax advice.
        Consult a qualified financial professional before making any trading decisions.
      </p>
    </LegalLayout>
  );
}
