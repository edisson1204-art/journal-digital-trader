import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    // ✅ SEGURIDAD: Verificar el secreto del webhook para que nadie más pueda crear cuentas gratis
    const incomingSecret = req.headers.get("x-webhook-secret") || req.headers.get("x-systeme-secret");
    const expectedSecret = process.env.SYSTEME_WEBHOOK_SECRET;

    // Solo validar si el secreto está configurado en las variables de entorno
    if (expectedSecret && incomingSecret !== expectedSecret) {
      console.warn("[Webhook] Acceso rechazado — secreto inválido");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await req.json();
    console.log("[Systeme Webhook] Payload recibido:", JSON.stringify(payload, null, 2));

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
    if (!emailRegex.test(email)) {
      console.error("[Systeme Webhook] Error: Email inválido:", email);
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    console.log("[Systeme Webhook] Procesando acceso para:", email);

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
        console.log(`[Systeme Webhook] El usuario ${email} ya tiene acceso.`);
        return NextResponse.json({ message: "User already has access.", email }, { status: 200 });
      }

      console.error("[Systeme Webhook] Error creando usuario en Supabase:", userError);
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    console.log(`[Systeme Webhook] Éxito! Cuenta creada e invitación enviada a: ${email}`);

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
