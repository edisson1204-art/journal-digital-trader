import json

es = {
  "nav": {
    "product": "Producto",
    "features": "Funciones",
    "pricing": "Precio",
    "resources": "Recursos",
    "login": "Iniciar sesi\u00f3n",
    "cta": "Prueba 7 D\u00edas Gratis"
  },
  "hero": {
    "eyebrow": "DISCIPLINA \u2022 DATOS \u2022 MEJORES DECISIONES",
    "title1": "Opera con Datos.",
    "title2": "Mejora con Evidencia.",
    "subtitle": "El sistema integral de diario de trading, anal\u00edtica, gesti\u00f3n de riesgo y mentor de IA dise\u00f1ado para ayudarte a operar con mayor consistencia.",
    "feature1": "Diario y Anal\u00edtica",
    "feature2": "Calculadoras de Riesgo",
    "feature3": "Simulador de Estrategias",
    "feature4": "Mentor IA 24/7",
    "cta_primary": "Prueba 7 D\u00edas Gratis",
    "cta_secondary": "Ver c\u00f3mo funciona",
    "disclaimer": "7 d\u00edas gratis, luego $14.99/mes. Cancela cuando quieras.",
    "dashboard_greeting": "\u00a1Buenos d\u00edas, Trader!",
    "dashboard_quote": "\"La disciplina de hoy construye la libertad de ma\u00f1ana.\""
  },
  "markets": {
    "title": "OPERA CUALQUIER MERCADO",
    "futures": "Futuros",
    "forex": "Forex",
    "stocks": "Acciones",
    "crypto": "Cripto",
    "indexes": "\u00cdndices",
    "etfs": "ETFs",
    "prop_firms": "Cuentas Fondeadas",
    "options": "Opciones",
    "commodities": "Materias Primas",
    "stat1": "10,000+",
    "stat1_label": "Traders",
    "stat2": "95%",
    "stat2_label": "Usuarios Satisfechos",
    "stat3": "24/7",
    "stat3_label": "Soporte IA",
    "stat4": "Global",
    "stat4_label": "Comunidad"
  },
  "features": {
    "title": "Todo lo que necesitas para crecer como trader",
    "subtitle": "Herramientas potentes. Informaci\u00f3n \u00fatil. Mejores decisiones.",
    "journal_title": "Diario de Trading",
    "journal_desc": "Registra cada operaci\u00f3n con detalles completos y etiquetas.",
    "analytics_title": "Anal\u00edtica Avanzada",
    "analytics_desc": "Descubre qu\u00e9 funciona realmente con estad\u00edsticas detalladas.",
    "risk_title": "Calculadoras de Riesgo",
    "risk_desc": "Calcula tama\u00f1o de posici\u00f3n, riesgo, margen y m\u00e1s.",
    "simulator_title": "Simulador de Estrategias",
    "simulator_desc": "Haz backtesting y simula tus estrategias.",
    "ai_title": "Mentor de Trading IA",
    "ai_desc": "Recibe insights personalizados basados en tus propios datos.",
    "psychology_title": "Diario de Psicolog\u00eda",
    "psychology_desc": "Entiende tu comportamiento y mejora tu disciplina.",
    "funded_title": "Cuentas Fondeadas",
    "funded_desc": "Monitorea m\u00faltiples cuentas fondeadas y sus reglas.",
    "multimarket_title": "M\u00faltiples Mercados",
    "multimarket_desc": "Futuros, Forex, Acciones, Opciones, Cripto y m\u00e1s."
  },
  "pricing": {
    "badge": "M\u00e1s Popular",
    "title": "Journal Digital Trader Invest PRO",
    "price": "$14.99",
    "period": "/mes",
    "feature1": "Diario de Trading",
    "feature2": "Anal\u00edtica Avanzada",
    "feature3": "Calculadoras de Riesgo",
    "feature4": "Simulador de Estrategias",
    "feature5": "Mentor IA",
    "feature6": "Cuentas Fondeadas",
    "feature7": "Herramientas de Psicolog\u00eda",
    "feature8": "M\u00faltiples Mercados",
    "feature9": "English & Espa\u00f1ol",
    "feature10": "Cancela cuando quieras",
    "cta": "Prueba 7 D\u00edas Gratis",
    "billing_note": "Facturaci\u00f3n mensual. Cancela cuando quieras."
  },
  "platform": {
    "title": "Mira la plataforma en acci\u00f3n",
    "subtitle": "Herramientas reales. Anal\u00edtica real. Datos de demostraci\u00f3n.",
    "tab_dashboard": "Dashboard",
    "tab_journal": "Diario",
    "tab_analytics": "Anal\u00edtica",
    "tab_risk": "Calculadora de Riesgo",
    "tab_ai": "Mentor IA",
    "demo_label": "DATOS DE DEMOSTRACI\u00d3N",
    "disclaimer": "Datos de muestra solo para demostraci\u00f3n. No son resultados reales de trading.",
    "equity": "Equity de Cuenta",
    "win_rate": "Tasa de \u00c9xito",
    "profit_factor": "Factor de Ganancia",
    "avg_rr": "R/R Promedio",
    "max_dd": "Drawdown M\u00e1ximo",
    "perf_by_strategy": "Rendimiento por Estrategia",
    "strategy1": "Ruptura",
    "strategy2": "Seguimiento de Tendencia",
    "strategy3": "Reversi\u00f3n a la Media",
    "strategy4": "Scalping"
  },
  "trust": {
    "title": "Dise\u00f1ado para traders serios",
    "secure_title": "Seguro y Privado",
    "secure_desc": "Tus datos est\u00e1n encriptados y siempre son tuyos.",
    "cloud_title": "Sincronizaci\u00f3n Cloud",
    "cloud_desc": "Accede a tus datos desde cualquier lugar y dispositivo.",
    "bilingual_title": "Biling\u00fce",
    "bilingual_desc": "English & Espa\u00f1ol.",
    "updates_title": "Actualizaciones Regulares",
    "updates_desc": "Nuevas funciones continuamente."
  },
  "cta_section": {
    "line1": "Un mejor trader.",
    "line2": "Un futuro m\u00e1s claro.",
    "accent": "Disciplina. Datos. Libertad.",
    "button": "Comenzar"
  },
  "footer": {
    "terms": "T\u00e9rminos",
    "privacy": "Privacidad",
    "risk": "Aviso de Riesgo",
    "refund": "Pol\u00edtica de Reembolso",
    "contact": "Contacto",
    "copyright": "\u00a9 2026 Journal Digital Trader Invest. Todos los derechos reservados."
  },
  "metrics": {
    "total_pnl": "P&L Total",
    "win_rate": "Tasa de \u00c9xito",
    "profit_factor": "Factor de Ganancia",
    "total_trades": "Total de Operaciones",
    "recent_trades": "Operaciones Recientes",
    "trade_distribution": "Distribuci\u00f3n de Operaciones",
    "win": "Ganancia",
    "loss": "P\u00e9rdida",
    "breakeven": "Empate"
  }
}

with open("public/locales/es.json", "w", encoding="utf-8") as f:
    json.dump(es, f, ensure_ascii=False, indent=2)

print("ES dictionary written successfully")
