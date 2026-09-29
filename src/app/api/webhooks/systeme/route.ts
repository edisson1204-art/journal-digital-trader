import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    console.log("🔔 [Systeme Webhook] Recibido:", JSON.stringify(payload, null, 2));

    // Intentar extraer el correo del payload de Systeme.io (suele venir en payload.data.contact.email o payload.contact.email)
    const email = 
      payload?.data?.contact?.email || 
      payload?.contact?.email || 
      payload?.email ||
      payload?.customer?.email;

    if (!email) {
      console.error("❌ [Systeme Webhook] Error: No se encontró un correo electrónico en el payload.");
      return NextResponse.json({ error: "Email missing" }, { status: 400 });
    }

    // 1. Invitar al usuario a Supabase (Crea la cuenta automáticamente y le envía un correo para crear su contraseña)
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);

    if (userError) {
      // Si el usuario ya existe, Supabase devuelve un error. Lo capturamos y lo dejamos pasar.
      if (userError.message.includes("already registered") || userError.status === 422) {
        console.log(`ℹ️ [Systeme Webhook] El usuario ${email} ya existe en la base de datos.`);
        return NextResponse.json({ message: "User already exists, access updated." }, { status: 200 });
      }
      
      console.error("❌ [Systeme Webhook] Error creando usuario en Supabase:", userError);
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    console.log(`✅ [Systeme Webhook] ¡Éxito! Cuenta creada e invitación enviada a: ${email}`);

    return NextResponse.json({ success: true, email }, { status: 200 });

  } catch (error: any) {
    console.error("❌ [Systeme Webhook] Error interno:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
