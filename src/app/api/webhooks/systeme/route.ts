import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Comparación en tiempo constante para no filtrar el secreto por diferencias de tiempo. */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export async function POST(req: Request) {
  try {
    // SEGURIDAD: fallar cerrado. Sin secreto configurado NO se acepta ninguna petición
    // (antes, si faltaba la variable, cualquiera podía crear cuentas con la service role).
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

    // Extraer el correo del payload de Systeme.io
    const email =
      payload?.data?.contact?.email ||
      payload?.contact?.email ||
      payload?.email ||
      payload?.customer?.email ||
      payload?.order?.contact?.email;

    if (!email) {
      console.error("[Systeme Webhook] Error: No se encontró un correo electrónico en el payload.");
      return NextResponse.json({ error: "Email missing in webhook payload" }, { status: 400 });
    }

    // Validación básica de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof email !== "string" || !emailRegex.test(email)) {
      console.error("[Systeme Webhook] Error: formato de email inválido");
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    console.log("[Systeme Webhook] Procesando acceso (email omitido del log)");

    // Invitar al usuario a Supabase (crea la cuenta y envía el correo de bienvenida)
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        source: "systeme_webhook",
        created_at: new Date().toISOString(),
      },
    });

    if (userError) {
      // Si el usuario ya existe, lo dejamos pasar (acceso renovado)
      if (
        userError.message.includes("already registered") ||
        userError.message.includes("already been invited") ||
        userError.status === 422
      ) {
        console.log("[Systeme Webhook] El usuario ya tiene acceso.");
        return NextResponse.json({ message: "User already has access.", email }, { status: 200 });
      }

      console.error("[Systeme Webhook] Error creando usuario en Supabase:", userError);
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    console.log("[Systeme Webhook] Cuenta creada e invitación enviada.");

    return NextResponse.json({
      success: true,
      email,
      user_id: userData?.user?.id,
    }, { status: 200 });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Systeme Webhook] Error interno:", msg);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
