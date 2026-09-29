import json

en = {
  "nav": {
    "product": "Product",
    "features": "Features",
    "pricing": "Pricing",
    "resources": "Resources",
    "login": "Login",
    "cta": "Start 7-Day Free Trial"
  },
  "hero": {
    "eyebrow": "DISCIPLINE \u2022 DATA \u2022 BETTER DECISIONS",
    "title1": "Trade with Data.",
    "title2": "Improve with Evidence.",
    "subtitle": "The all-in-one trading journal, analytics, risk tools and AI mentor designed to help you become a more consistent trader.",
    "feature1": "Journal & Analytics",
    "feature2": "Risk Calculators",
    "feature3": "Strategy Simulator",
    "feature4": "AI Mentor 24/7",
    "cta_primary": "Start 7-Day Free Trial",
    "cta_secondary": "See how it works",
    "disclaimer": "7 days free, then $14.99/mo. Cancel anytime.",
    "dashboard_greeting": "Good morning, Trader!",
    "dashboard_quote": "\"Discipline today, freedom tomorrow.\""
  },
  "markets": {
    "title": "TRADE ANY MARKET",
    "futures": "Futures",
    "forex": "Forex",
    "stocks": "Stocks",
    "options": "Options",
    "crypto": "Crypto",
    "indexes": "Indexes",
    "commodities": "Commodities",
    "etfs": "ETFs",
    "prop_firms": "Prop Firms",
    "stat1": "10,000+",
    "stat1_label": "Traders",
    "stat2": "95%",
    "stat2_label": "Satisfied Users",
    "stat3": "24/7",
    "stat3_label": "AI Support",
    "stat4": "Global",
    "stat4_label": "Community"
  },
  "features": {
    "title": "Everything you need to grow as a trader",
    "subtitle": "Powerful tools. Real insights. Better decisions.",
    "journal_title": "Trading Journal",
    "journal_desc": "Track every trade with complete details and tags.",
    "analytics_title": "Advanced Analytics",
    "analytics_desc": "Discover what really works with detailed statistics.",
    "risk_title": "Risk Calculators",
    "risk_desc": "Calculate position size, risk, margin and more.",
    "simulator_title": "Strategy Simulator",
    "simulator_desc": "Backtest and simulate your strategies.",
    "ai_title": "AI Trading Mentor",
    "ai_desc": "Receive personalized insights from your own data.",
    "psychology_title": "Psychology Journal",
    "psychology_desc": "Understand behavior and improve discipline.",
    "funded_title": "Funded Account Tracking",
    "funded_desc": "Monitor multiple funded accounts and rules.",
    "multimarket_title": "Multi-Market Support",
    "multimarket_desc": "Futures, Forex, Stocks, Options, Crypto and more."
  },
  "pricing": {
    "badge": "Most Popular",
    "title": "Journal Digital Trader Invest PRO",
    "price": "$14.99",
    "period": "/month",
    "feature1": "Trading Journal",
    "feature2": "Advanced Analytics",
    "feature3": "Risk Calculators",
    "feature4": "Strategy Simulator",
    "feature5": "AI Mentor",
    "feature6": "Funded Accounts",
    "feature7": "Psychology Tools",
    "feature8": "Multi-Market Support",
    "feature9": "English & Espa\u00f1ol",
    "feature10": "Cancel anytime",
    "cta": "Start 7-Day Free Trial",
    "billing_note": "Billed monthly. Cancel anytime."
  },
  "platform": {
    "title": "See the platform in action",
    "subtitle": "Real tools. Real insights. Demo data.",
    "tab_dashboard": "Dashboard",
    "tab_journal": "Journal",
    "tab_analytics": "Analytics",
    "tab_risk": "Risk Calculator",
    "tab_ai": "AI Mentor",
    "demo_label": "DEMO DATA",
    "disclaimer": "Sample data for demonstration purposes. Not real trading results.",
    "equity": "Account Equity",
    "win_rate": "Win Rate",
    "profit_factor": "Profit Factor",
    "avg_rr": "Avg R/R",
    "max_dd": "Max Drawdown",
    "perf_by_strategy": "Performance by Strategy",
    "strategy1": "Breakout",
    "strategy2": "Trend Following",
    "strategy3": "Mean Reversion",
    "strategy4": "Scalping"
  },
  "trust": {
    "title": "Built for serious traders",
    "secure_title": "Secure & Private",
    "secure_desc": "Your data is encrypted and always yours.",
    "cloud_title": "Cloud Sync",
    "cloud_desc": "Access your data from anywhere, any device.",
    "bilingual_title": "Bilingual",
    "bilingual_desc": "English & Espa\u00f1ol.",
    "updates_title": "Regular Updates",
    "updates_desc": "New features continuously."
  },
  "cta_section": {
    "line1": "A better trader.",
    "line2": "A brighter future.",
    "accent": "Discipline. Data. Freedom.",
    "button": "Start Now"
  },
  "footer": {
    "terms": "Terms",
    "privacy": "Privacy",
    "risk": "Risk Disclosure",
    "refund": "Refund Policy",
    "contact": "Contact",
    "copyright": "\u00a9 2026 Journal Digital Trader Invest. All rights reserved."
  },
  "metrics": {
    "total_pnl": "Total P&L",
    "win_rate": "Win Rate",
    "profit_factor": "Profit Factor",
    "total_trades": "Total Trades",
    "recent_trades": "Recent Trades",
    "trade_distribution": "Trade Distribution",
    "win": "Win",
    "loss": "Loss",
    "breakeven": "Breakeven"
  }
}

with open("public/locales/en.json", "w", encoding="utf-8") as f:
    json.dump(en, f, ensure_ascii=False, indent=2)

print("EN dictionary written successfully")
