/**
 * Catálogo completo de las 7 plantillas de correo HTML institucionales
 * con imágenes integradas (1200x675 px), tono empático y motivador
 * para cubrir el 100% del ciclo de vida en Journal Digital Trader Invest.
 */

const APP_BASE_URL = "https://journal-digital-trader.vercel.app";

export const EMAIL_BANNER_URLS = {
  vipPurchase: `${APP_BASE_URL}/emails/email-compra-vip.png`,
  welcome: `${APP_BASE_URL}/emails/email-bienvenida.png`,
  passwordReset: `${APP_BASE_URL}/emails/email-recuperacion.png`,
  fundingHabit: `${APP_BASE_URL}/emails/email-fondeo-motivacion.png`,
  riskShieldPause: `${APP_BASE_URL}/emails/email-pausa-riesgo.png`,
  weeklyFridayAudit: `${APP_BASE_URL}/emails/email-auditoria-semanal.png`,
  goalApprovedPayout: `${APP_BASE_URL}/emails/email-meta-aprobada.png`,
} as const;

function buildBaseEmailCard(opts: {
  title: string;
  bannerUrl: string;
  bannerAlt: string;
  tagColor: string;
  tagText: string;
  headline: string;
  paragraphs: string[];
  ctaText: string;
  ctaUrl: string;
  quote: string;
}): string {
  const paragraphsHtml = opts.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 18px 0;font-size:15px;line-height:1.65;color:#cbd5e1;">${p}</p>`
    )
    .join("\n              ");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background-color:#0b0e14;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f3f6fa;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0b0e14;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background-color:#111622;border:1px solid #1e293b;border-radius:20px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.6);">
          <tr>
            <td style="padding:0;">
              <img src="${opts.bannerUrl}" alt="${opts.bannerAlt}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border-bottom:1px solid #1e293b;" />
            </td>
          </tr>
          <tr>
            <td style="padding:36px 36px 28px 36px;">
              <p style="margin:0 0 12px 0;font-size:13px;font-weight:700;color:${opts.tagColor};text-transform:uppercase;letter-spacing:1px;">
                ${opts.tagText}
              </p>
              <h1 style="margin:0 0 18px 0;font-size:24px;line-height:1.3;font-weight:800;color:#ffffff;">
                ${opts.headline}
              </h1>
              ${paragraphsHtml}
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:26px;">
                <tr>
                  <td align="center">
                    <a href="${opts.ctaUrl}" style="display:inline-block;background-color:#00e676;color:#0b0e14;font-size:15px;font-weight:800;text-decoration:none;padding:15px 34px;border-radius:12px;box-shadow:0 8px 25px rgba(0,230,118,0.3);">
                      ${opts.ctaText}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 36px;background-color:#0b0e14;border-top:1px solid #1e293b;text-align:center;">
              <p style="margin:0 0 6px 0;font-size:13px;font-style:italic;color:#fbbf24;">
                “${opts.quote}”
              </p>
              <p style="margin:0;font-size:11px;color:#64748b;">
                © Journal Digital Trader Invest · <a href="${APP_BASE_URL}" style="color:#00e676;text-decoration:none;">journal-digital-trader.vercel.app</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** 1. Confirmación VIP Post-Compra */
export function buildVipPurchaseEmailHtml(params?: { traderName?: string; actionUrl?: string }): string {
  const name = params?.traderName?.trim() || "Trader";
  return buildBaseEmailCard({
    title: "💎 Membresía Oficial Confirmada — Journal Digital Trader Invest",
    bannerUrl: EMAIL_BANNER_URLS.vipPurchase,
    bannerAlt: "Membresía Oficial Confirmada",
    tagColor: "#38bdf8",
    tagText: `💎 ¡Gracias por tu confianza, ${name}!`,
    headline: "Tu suscripción VIP a Journal Digital Trader Invest ya está activa.",
    paragraphs: [
      "Acabas de tomar la decisión más inteligente para proteger tu capital y profesionalizar tu carrera en el trading. Tu cuenta ya tiene habilitadas todas las herramientas cuantitativas sin límites.",
      "Puedes gestionar múltiples cuentas de fondeo en paralelo (MFFU, Lucy Trading, TopStep, Apex, FTMO), importar tus ejecuciones CSV de NinjaTrader o Tradovate y auditar tu ventaja real con el Mentor IA.",
    ],
    ctaText: "Acceder a mi Terminal VIP Ahora →",
    ctaUrl: params?.actionUrl || `${APP_BASE_URL}/login`,
    quote: "La mejor inversión de un trader siempre será la herramienta que protege su disciplina.",
  });
}

/** 2. Bienvenida / Nuevo Registro */
export function buildWelcomeEmailHtml(params?: { traderName?: string; actionUrl?: string }): string {
  const name = params?.traderName?.trim() || "Trader";
  return buildBaseEmailCard({
    title: "🚀 ¡Bienvenido a Journal Digital Trader Invest!",
    bannerUrl: EMAIL_BANNER_URLS.welcome,
    bannerAlt: "Bienvenido a Journal Digital Trader Invest",
    tagColor: "#00e676",
    tagText: `✨ ¡Bienvenido a casa, ${name}!`,
    headline: "Hoy diste el paso que separa a los amateurs de los operadores consistentes.",
    paragraphs: [
      "Sabemos perfectamente lo que se siente estar frente al gráfico: los días en que dudas de tu entrada, la presión de cuidar el drawdown de una prueba de fondeo y el esfuerzo silencioso que haces cada semana por superarte.",
      "<strong style=\"color:#ffffff;\">Queremos que sepas algo importante: ya no estás operando a ciegas ni estás solo.</strong> Configura tu primera cuenta en la Suite de Fondeo, calcula tu riesgo antes de cada sesión y registra tu primer trade hoy mismo.",
    ],
    ctaText: "Entrar a mi Terminal Ahora →",
    ctaUrl: params?.actionUrl || `${APP_BASE_URL}/login`,
    quote: "Un día a la vez, un trade a la vez. Respeta tu plan y deja que la estadística trabaje a tu favor.",
  });
}

/** 3. Recuperación Empática de Contraseña */
export function buildPasswordResetEmailHtml(params?: { actionUrl?: string }): string {
  return buildBaseEmailCard({
    title: "🔐 Recupera tu acceso — Journal Digital Trader Invest",
    bannerUrl: EMAIL_BANNER_URLS.passwordReset,
    bannerAlt: "Recuperación de Acceso Segura",
    tagColor: "#38bdf8",
    tagText: "🔐 Recuperación de Contraseña",
    headline: "Tranquilo, trader: tus operaciones y tu progreso están 100% a salvo.",
    paragraphs: [
      "A todos nos pasa olvidar una clave entre tantos gráficos, niveles de liquidez y sesiones de mercado. Respira hondo: todo tu historial contable, tus métricas y tus cuentas de fondeo están intactos y esperándote.",
      "Haz clic en el botón de abajo para crear tu nueva contraseña en segundos y volver a tu terminal con serenidad y enfoque:",
    ],
    ctaText: "Crear mi Nueva Contraseña →",
    ctaUrl: params?.actionUrl || "{{ .ConfirmationURL }}",
    quote: "Un buen operador entra al mercado con mente fría, plan claro y riesgo controlado.",
  });
}

/** 4. Mentalidad y Hábito de Operador Fondeado */
export function buildFundingHabitEmailHtml(params?: { actionUrl?: string }): string {
  return buildBaseEmailCard({
    title: "🏆 El hábito que construye cuentas fondeadas",
    bannerUrl: EMAIL_BANNER_URLS.fundingHabit,
    bannerAlt: "Mentalidad de Operador Fondeado",
    tagColor: "#00e676",
    tagText: "🏆 Mentalidad de Operador Fondeado",
    headline: "El hábito de 2 minutos que separa un retiro exitoso de una cuenta quemada.",
    paragraphs: [
      "La diferencia entre quienes logran vivir del trading y quienes abandonan en el intento rara vez está en la estrategia de entrada: está en el hábito de medir, auditar y corregir sus números después de cada sesión.",
      "Dedica solo 2 minutos hoy a registrar o importar tus ejecuciones en tu Bitácora. Tu yo del futuro —y tu cuenta de fondeo— te lo agradecerán.",
    ],
    ctaText: "Registrar mi Sesión de Hoy →",
    ctaUrl: params?.actionUrl || `${APP_BASE_URL}/app/journal`,
    quote: "La disciplina que aplicas cuando nadie te ve es la que construye los retiros que todos admiran.",
  });
}

/** 5. Escudo Emocional y Pausa Inteligente Anti-Tilt */
export function buildRiskShieldPauseEmailHtml(params?: { actionUrl?: string }): string {
  return buildBaseEmailCard({
    title: "🛡️ Escudo Emocional: Cerrar el gráfico a tiempo también es ganar",
    bannerUrl: EMAIL_BANNER_URLS.riskShieldPause,
    bannerAlt: "Escudo Emocional y Pausa Inteligente",
    tagColor: "#fbbf24",
    tagText: "🛡️ Escudo Emocional & Pausa Inteligente",
    headline: "Cerrar el gráfico a tiempo también es ganar: tu cuenta sigue viva y mañana el mercado abre de nuevo.",
    paragraphs: [
      "Incluso los mejores operadores institucionales de Wall Street tienen sesiones rojas. La única diferencia entre un profesional y un amateur es saber detenerse a tiempo antes de caer en el trading por venganza.",
      "Si hoy tuviste una sesión difícil, aléjate de la pantalla, respira hondo y escribe cómo te sentiste en tu Mentor IA. Proteger tu capital mental hoy es lo que te permitirá cobrar en grande mañana.",
    ],
    ctaText: "Revisar mi Colchón y Hablar con el Mentor IA →",
    ctaUrl: params?.actionUrl || `${APP_BASE_URL}/app/ai-coach`,
    quote: "Quien sabe perder pequeño hoy, conserva todo el capital para ganar en grande mañana.",
  });
}

/** 6. Ritual de Viernes y Auditoría Cuantitativa Semanal */
export function buildWeeklyFridayAuditEmailHtml(params?: { actionUrl?: string }): string {
  return buildBaseEmailCard({
    title: "📊 Ritual de Viernes: Tu Auditoría Cuantitativa Semanal",
    bannerUrl: EMAIL_BANNER_URLS.weeklyFridayAudit,
    bannerAlt: "Ritual de Viernes Auditoría Cuantitativa",
    tagColor: "#a855f7",
    tagText: "📊 Ritual de Viernes · Auditoría Cuantitativa",
    headline: "La semana en el gráfico terminó: ahora empieza el trabajo que te hace verdaderamente rentable.",
    paragraphs: [
      "Los operadores que cobran retiros todos los meses dedican 15 minutos cada viernes a medir sus números sin excusas. Tus datos de esta semana tienen la llave de tu crecimiento para el lunes.",
      "Entra a tu sección de Informes Institucionales, descubre qué sesión y qué estrategia te dieron dinero esta semana, y deja listo tu plan de riesgo para el lunes.",
    ],
    ctaText: "Abrir mis 5 Informes Institucionales →",
    ctaUrl: params?.actionUrl || `${APP_BASE_URL}/app/reports`,
    quote: "Lo que no se registra no se mide, y lo que no se mide jamás se puede escalar.",
  });
}

/** 7. Celebración de Meta Aprobada, Candado EOD y Retiro 90% */
export function buildGoalApprovedPayoutEmailHtml(params?: { actionUrl?: string }): string {
  return buildBaseEmailCard({
    title: "🏆 ¡Felicidades por tu disciplina, Trader! Protege tu victoria",
    bannerUrl: EMAIL_BANNER_URLS.goalApprovedPayout,
    bannerAlt: "Meta de Fondeo y Blindaje Logrado",
    tagColor: "#00e676",
    tagText: "🏆 ¡Meta de Fondeo y Blindaje Logrado!",
    headline: "¡Felicidades por tu disciplina, Trader! Tu paciencia dio frutos: ahora protege tu victoria.",
    paragraphs: [
      "Alcanzar tu objetivo y activar tu Candado EOD (🔒) no es producto de la suerte; es el resultado directo de respetar tu riesgo cuando nadie te veía.",
      "Disfruta este logro con humildad y mente fría: evita operar por euforia o exceso de confianza, protege tu piso bloqueado y asegura tu retiro neto del 90%.",
    ],
    ctaText: "Ver mi Suite de Fondeo y Retiro Neto →",
    ctaUrl: params?.actionUrl || `${APP_BASE_URL}/app/accounts`,
    quote: "Llegar a la cima exige valentía; mantenerse fondeado exige humildad y gestión de riesgo.",
  });
}
