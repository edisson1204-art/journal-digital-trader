/**
 * Plantillas de correo HTML institucionales con imágenes integradas,
 * tono empático y motivador para Journal Digital Trader Invest.
 */

const APP_BASE_URL = "https://journal-digital-trader.vercel.app";

export function buildWelcomeEmailHtml(params: {
  traderName?: string;
  actionUrl?: string;
}): string {
  const name = params.traderName?.trim() || "Trader";
  const url = params.actionUrl || `${APP_BASE_URL}/login`;
  const bannerUrl = `${APP_BASE_URL}/emails/email-bienvenida.png`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>¡Bienvenido a Journal Digital Trader Invest!</title>
</head>
<body style="margin:0;padding:0;background-color:#0b0e14;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f3f6fa;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0b0e14;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background-color:#111622;border:1px solid #1e293b;border-radius:20px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.6);">
          <!-- Imagen Principal de Bienvenida -->
          <tr>
            <td style="padding:0;">
              <img src="${bannerUrl}" alt="Bienvenido a Journal Digital Trader Invest" width="600" style="display:block;width:100%;max-width:600px;height:auto;border-bottom:1px solid #1e293b;" />
            </td>
          </tr>
          <!-- Cuerpo del Mensaje Empático -->
          <tr>
            <td style="padding:36px 36px 28px 36px;">
              <p style="margin:0 0 12px 0;font-size:13px;font-weight:700;color:#00e676;text-transform:uppercase;letter-spacing:1px;">
                ✨ ¡Bienvenido a casa, ${name}!
              </p>
              <h1 style="margin:0 0 18px 0;font-size:24px;line-height:1.3;font-weight:800;color:#ffffff;">
                Hoy diste el paso que separa a los amateurs de los operadores consistentes.
              </h1>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.65;color:#cbd5e1;">
                Sabemos perfectamente lo que se siente estar frente al gráfico: los días en que dudas de tu entrada, la presión de cuidar el drawdown de una prueba de fondeo y el esfuerzo silencioso que haces cada semana por superarte.
              </p>
              <p style="margin:0 0 24px 0;font-size:15px;line-height:1.65;color:#cbd5e1;">
                <strong style="color:#ffffff;">Queremos que sepas algo importante: ya no estás operando a ciegas ni estás solo.</strong> A partir de hoy tienes una terminal cuantitativa diseñada para proteger tu capital, medir tu ventaja matemática al centavo y acompañarte con inteligencia artificial en cada sesión.
              </p>

              <!-- Caja de 3 pasos -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0b0e14;border:1px solid #1e293b;border-radius:14px;padding:20px;margin-bottom:28px;">
                <tr>
                  <td>
                    <p style="margin:0 0 10px 0;font-size:13px;font-weight:700;color:#fbbf24;text-transform:uppercase;">
                      🎯 Tus primeros 3 pasos hacia la consistencia:
                    </p>
                    <p style="margin:0 0 8px 0;font-size:14px;line-height:1.5;color:#cbd5e1;">
                      <strong style="color:#00e676;">1. Configura tus Cuentas de Fondeo:</strong> Elige tus empresas (MFFU, Lucy Trading, TopStep, Apex o FTMO) y activa tu blindaje EOD.
                    </p>
                    <p style="margin:0 0 8px 0;font-size:14px;line-height:1.5;color:#cbd5e1;">
                      <strong style="color:#00e676;">2. Calcula tu Riesgo Antes de Entrar:</strong> Usa la Calculadora de Riesgo para dimensionar tus contratos incluyendo comisiones.
                    </p>
                    <p style="margin:0;font-size:14px;line-height:1.5;color:#cbd5e1;">
                      <strong style="color:#00e676;">3. Registra o Importa tu CSV:</strong> Analiza tus operativas con el Mentor IA y tus 5 Informes Institucionales.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Botón CTA -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${url}" style="display:inline-block;background-color:#00e676;color:#0b0e14;font-size:15px;font-weight:800;text-decoration:none;padding:15px 34px;border-radius:12px;box-shadow:0 8px 25px rgba(0,230,118,0.3);">
                      Entrar a mi Terminal Ahora →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Pie de página -->
          <tr>
            <td style="padding:22px 36px;background-color:#0b0e14;border-top:1px solid #1e293b;text-align:center;">
              <p style="margin:0 0 6px 0;font-size:13px;font-style:italic;color:#fbbf24;">
                “Un día a la vez, un trade a la vez. Respeta tu plan y deja que la estadística trabaje a tu favor.”
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

export function buildPasswordResetEmailHtml(params: {
  actionUrl?: string;
}): string {
  const url = params.actionUrl || "{{ .ConfirmationURL }}";
  const bannerUrl = `${APP_BASE_URL}/emails/email-recuperacion.png`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Recupera tu acceso — Journal Digital Trader Invest</title>
</head>
<body style="margin:0;padding:0;background-color:#0b0e14;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f3f6fa;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0b0e14;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background-color:#111622;border:1px solid #1e293b;border-radius:20px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.6);">
          <!-- Imagen Principal de Recuperación -->
          <tr>
            <td style="padding:0;">
              <img src="${bannerUrl}" alt="Recuperación de Acceso Segura" width="600" style="display:block;width:100%;max-width:600px;height:auto;border-bottom:1px solid #1e293b;" />
            </td>
          </tr>
          <!-- Cuerpo Empático -->
          <tr>
            <td style="padding:36px 36px 28px 36px;">
              <p style="margin:0 0 12px 0;font-size:13px;font-weight:700;color:#38bdf8;text-transform:uppercase;letter-spacing:1px;">
                🔐 Recuperación de Contraseña
              </p>
              <h1 style="margin:0 0 18px 0;font-size:24px;line-height:1.3;font-weight:800;color:#ffffff;">
                Tranquilo, trader: tus operaciones y tu progreso están 100% a salvo.
              </h1>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.65;color:#cbd5e1;">
                A todos nos pasa olvidar una clave entre tantos gráficos, niveles de liquidez y sesiones de mercado. Respira hondo: todo tu historial contable, tus métricas y tus cuentas de fondeo están intactos y esperándote.
              </p>
              <p style="margin:0 0 26px 0;font-size:15px;line-height:1.65;color:#cbd5e1;">
                Haz clic en el botón de abajo para crear tu nueva contraseña en segundos y volver a tu terminal con serenidad y enfoque:
              </p>

              <!-- Botón CTA -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="${url}" style="display:inline-block;background-color:#00e676;color:#0b0e14;font-size:15px;font-weight:800;text-decoration:none;padding:15px 34px;border-radius:12px;box-shadow:0 8px 25px rgba(0,230,118,0.3);">
                      Crear mi Nueva Contraseña →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:12px;line-height:1.5;color:#64748b;text-align:center;">
                Si tú no solicitaste este cambio, puedes ignorar este mensaje con total tranquilidad; tu cuenta sigue protegida.
              </p>
            </td>
          </tr>
          <!-- Pie de página -->
          <tr>
            <td style="padding:22px 36px;background-color:#0b0e14;border-top:1px solid #1e293b;text-align:center;">
              <p style="margin:0 0 6px 0;font-size:13px;font-style:italic;color:#fbbf24;">
                “Un buen operador entra al mercado con mente fría, plan claro y riesgo controlado.”
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
