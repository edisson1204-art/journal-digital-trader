import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { dispatchTraderEmail } from "@/lib/emailDispatcher";

const APP_BASE_URL = "https://journal-digital-trader.vercel.app";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Endpoint institucional de Recuperación de Contraseña:
 * 1) Genera el token criptográfico de recuperación con `supabaseAdmin.auth.admin.generateLink`.
 * 2) Construye el enlace directo de producción (`/reset-password?token_hash=...&type=recovery`) que nunca redirige a localhost.
 * 3) Dispara la plantilla HTML empática `passwordReset` con la tarjeta `email-recuperacion.png` y la registra en `email_dispatch_logs`.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Correo inválido." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${APP_BASE_URL}/reset-password`,
      },
    });

    if (error || !data?.properties?.hashed_token) {
      // Respuesta neutra por privacidad aunque el correo no exista
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const hashedToken = data.properties.hashed_token;
    const directRecoveryUrl = `${APP_BASE_URL}/reset-password?token_hash=${encodeURIComponent(hashedToken)}&type=recovery`;

    const dispatchResult = await dispatchTraderEmail({
      template: "passwordReset",
      to: email,
      actionUrl: directRecoveryUrl,
    });

    return NextResponse.json(
      {
        success: true,
        messageId: dispatchResult.messageId,
        mode: dispatchResult.mode,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ success: true }, { status: 200 });
  }
}
