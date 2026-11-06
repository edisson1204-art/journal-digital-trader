import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { dispatchTraderEmail } from "@/lib/emailDispatcher";

/** Comparación en tiempo constante para no filtrar el secreto por diferencias de tiempo. */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export async function POST(req: Request) {
  try {
    const expectedSecret = process.env.SYSTEME_WEBHOOK_SECRET;
    if (!expectedSecret) {
      console.error("[Systeme Webhook] SYSTEME_WEBHOOK_SECRET no está configurado: petición rechazada");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
    }
    const incomingSecret = req.headers.get("x-webhook-secret") || req.headers.get("x-systeme-secret") || "";
    if (!safeEqual(incomingSecret, expectedSecret)) {
      console.warn("[Systeme Webhook] Acceso rechazado — secreto inválido");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await req.json();

    const email =
      payload?.data?.contact?.email ||
      payload?.contact?.email ||
      payload?.email ||
      payload?.customer?.email ||
      payload?.order?.contact?.email;

    const firstName =
      payload?.data?.contact?.first_name ||
      payload?.contact?.first_name ||
      payload?.customer?.name ||
      "Trader";

    if (!email) {
      console.error("[Systeme Webhook] Error: No se encontró un correo electrónico en el payload.");
      return NextResponse.json({ error: "Email missing in webhook payload" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof email !== "string" || !emailRegex.test(email)) {
      console.error("[Systeme Webhook] Error: formato de email inválido");
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Disparamos siempre el recibo VIP Post-Compra y el correo de Bienvenida con sus imágenes 1200x675
    const [vipReceipt, welcomeMail] = await Promise.all([
      dispatchTraderEmail({ template: "vipPurchase", to: email, traderName: String(firstName) }),
      dispatchTraderEmail({ template: "welcome", to: email, traderName: String(firstName) }),
    ]);

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        source: "systeme_webhook",
        created_at: new Date().toISOString(),
      },
    });

    if (userError) {
      if (
        userError.message.includes("already registered") ||
        userError.message.includes("already been invited") ||
        userError.status === 422
      ) {
        return NextResponse.json({
          message: "User already has access.",
          email,
          emailsDispatched: [vipReceipt.messageId, welcomeMail.messageId],
        }, { status: 200 });
      }

      if (
        userError.status === 429 ||
        userError.message.toLowerCase().includes("rate limit")
      ) {
        const { data: fallbackData, error: fallbackErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            source: "systeme_webhook_ratelimit_fallback",
            created_at: new Date().toISOString(),
          },
        });
        if (!fallbackErr) {
          return NextResponse.json(
            {
              success: true,
              email,
              user_id: fallbackData?.user?.id,
              mode: "direct_confirmed",
              emailsDispatched: [vipReceipt.messageId, welcomeMail.messageId],
            },
            { status: 200 }
          );
        }
      }

      console.error("[Systeme Webhook] Error creando usuario en Supabase:", userError);
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      email,
      user_id: userData?.user?.id,
      emailsDispatched: [vipReceipt.messageId, welcomeMail.messageId],
    }, { status: 200 });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Systeme Webhook] Error interno:", msg);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
