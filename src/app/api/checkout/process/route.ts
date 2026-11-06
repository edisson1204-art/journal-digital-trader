import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { dispatchTraderEmail } from "@/lib/emailDispatcher";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Procesador de Orden de Checkout VIP (/api/checkout/process):
 * - Valida datos del comprador, registra la orden aprobada en `public.vip_purchases_log`,
 *   despacha el recibo oficial `vipPurchase` (`email-compra-vip.png`) y devuelve la URL
 *   de redirección inmediata hacia `/bienvenida-vip`.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const plan = String(body?.plan || "anual").trim();
    const method = String(body?.method || "hotmart_systeme_direct").trim();

    if (!name) {
      return NextResponse.json({ error: "Ingresa tu nombre completo." }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Ingresa un correo electrónico válido." }, { status: 400 });
    }

    const transactionId = `ORD-${plan.toUpperCase()}-${Date.now()}`;

    try {
      await supabaseAdmin.from("vip_purchases_log").insert({
        buyer_email: email,
        buyer_name: name,
        provider: `${method}_${plan}`,
        transaction_id: transactionId,
        status: "approved",
      });
    } catch {
      // Non-blocking DB log
    }

    const receipt = await dispatchTraderEmail({
      template: "vipPurchase",
      to: email,
      traderName: name,
    });

    const redirectUrl = `/bienvenida-vip?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&source=${encodeURIComponent(method)}&tx=${encodeURIComponent(transactionId)}`;

    return NextResponse.json(
      {
        success: true,
        transactionId,
        plan,
        email,
        receiptMessageId: receipt.messageId,
        redirectUrl,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "No se pudo procesar la orden de pago." },
      { status: 500 }
    );
  }
}
