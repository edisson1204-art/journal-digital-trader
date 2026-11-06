import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { dispatchTraderEmail } from "@/lib/emailDispatcher";

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/**
 * Webhook Oficial para Hotmart (v2.0):
 * - Escucha eventos PURCHASE_APPROVED y PURCHASE_COMPLETE.
 * - Verifica cabecera x-hotmart-hottok contra HOTMART_WEBHOOK_SECRET (o SYSTEME_WEBHOOK_SECRET).
 * - Crea la cuenta pre-confirmada en Supabase, registra la venta en vip_purchases_log y despacha los correos VIP + Bienvenida.
 */
export async function POST(req: Request) {
  try {
    const expectedSecret =
      process.env.HOTMART_WEBHOOK_SECRET || process.env.SYSTEME_WEBHOOK_SECRET;

    if (!expectedSecret) {
      console.error("[Hotmart Webhook] HOTMART_WEBHOOK_SECRET no está configurado: petición rechazada");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
    }

    const incomingHottok =
      req.headers.get("x-hotmart-hottok") ||
      req.headers.get("x-webhook-secret") ||
      "";

    if (!safeEqual(incomingHottok, expectedSecret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await req.json();
    const event = String(payload?.event || "PURCHASE_APPROVED").toUpperCase();

    // Ignorar eventos de carrito abandonado o reembolso sin dar error 500 a Hotmart
    if (
      event &&
      !event.includes("APPROVED") &&
      !event.includes("COMPLETE") &&
      !event.includes("SALE")
    ) {
      return NextResponse.json({ ignored: true, event }, { status: 200 });
    }

    const email = String(
      payload?.data?.buyer?.email ||
        payload?.buyer?.email ||
        payload?.email ||
        ""
    )
      .trim()
      .toLowerCase();

    const buyerName = String(
      payload?.data?.buyer?.name ||
        payload?.buyer?.name ||
        payload?.name ||
        "Trader"
    ).trim();

    const transactionId = String(
      payload?.data?.purchase?.transaction ||
        payload?.transaction ||
        `hm_${Date.now()}`
    );

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid buyer email" }, { status: 400 });
    }

    try {
      await supabaseAdmin.from("vip_purchases_log").insert({
        buyer_email: email,
        buyer_name: buyerName,
        provider: "hotmart",
        transaction_id: transactionId,
        status: "approved",
      });
    } catch {
      // Non-blocking log
    }

    const [vipReceipt, welcomeMail] = await Promise.all([
      dispatchTraderEmail({ template: "vipPurchase", to: email, traderName: buyerName }),
      dispatchTraderEmail({ template: "welcome", to: email, traderName: buyerName }),
    ]);

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: buyerName,
        source: "hotmart_webhook",
        transaction_id: transactionId,
        vip_active: true,
      },
    });

    if (createErr) {
      const msg = createErr.message.toLowerCase();
      if (msg.includes("already") || msg.includes("registered") || createErr.status === 422) {
        return NextResponse.json(
          {
            success: true,
            message: "Buyer already registered.",
            email,
            emailsDispatched: [vipReceipt.messageId, welcomeMail.messageId],
          },
          { status: 200 }
        );
      }
      return NextResponse.json({ error: createErr.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        provider: "hotmart",
        email,
        user_id: created?.user?.id,
        transaction_id: transactionId,
        emailsDispatched: [vipReceipt.messageId, welcomeMail.messageId],
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
