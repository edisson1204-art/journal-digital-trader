import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Registro directo de alta capacidad (High-Volume Signup):
 * Crea el usuario con `email_confirm: true` vía `supabaseAdmin` para que:
 *  1) No consuma la cuota de 3 correos/hora del SMTP por defecto de Supabase.
 *  2) Cientos de compradores puedan registrarse en la misma hora e iniciar sesión de inmediato sin bloqueo por "Email not confirmed".
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const name = String(body?.name || "").trim();

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Formato de correo electrónico inválido." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        source: "direct_signup",
      },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("already") || msg.includes("registered") || error.status === 422) {
        return NextResponse.json(
          { error: "Este correo ya está registrado. Ve a Iniciar Sesión o recupera tu contraseña." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: true,
        user_id: data.user?.id,
        email: data.user?.email,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "No se pudo procesar el registro en el servidor." },
      { status: 500 }
    );
  }
}
