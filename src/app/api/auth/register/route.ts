import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { dispatchTraderEmail } from "@/lib/emailDispatcher";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Registro directo de alta capacidad + Activación VIP Post-Compra (Hotmart / Systeme.io):
 * 1) Crea el usuario con `email_confirm: true` vía `supabaseAdmin`.
 * 2) Si el usuario viene de `/bienvenida-vip` y el Webhook de Hotmart/Systeme ya había pre-creado
 *    su correo segundos antes sin contraseña, actualiza su contraseña para que entre sin fricción.
 * 3) Dispara automáticamente los correos `vipPurchase` (si es compra VIP) y `welcome`.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const name = String(body?.name || "").trim();
    const isVipCheckout = Boolean(body?.isVipCheckout);
    const provider = String(body?.provider || (isVipCheckout ? "vip_redirect" : "direct_signup"));

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
        source: provider,
        vip_active: true,
      },
    });

    let finalUserId = data?.user?.id;

    if (error) {
      const msg = error.message.toLowerCase();
      const isAlreadyRegistered =
        msg.includes("already") || msg.includes("registered") || error.status === 422;

      if (isAlreadyRegistered && isVipCheckout) {
        // Si el webhook de Hotmart o Systeme.io pre-creó la cuenta segundos antes de que el comprador
        // llegara a /bienvenida-vip, buscamos el usuario y le asignamos la contraseña elegida si era cuenta de webhook.
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
        const existingUser = listData?.users?.find((u) => u.email?.toLowerCase() === email);
        const userSource = String(existingUser?.user_metadata?.source || "");

        if (
          existingUser &&
          (userSource.includes("webhook") || !existingUser.last_sign_in_at)
        ) {
          await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
            password,
            email_confirm: true,
            user_metadata: {
              ...existingUser.user_metadata,
              full_name: name || existingUser.user_metadata?.full_name,
              vip_active: true,
            },
          });
          finalUserId = existingUser.id;
        } else {
          return NextResponse.json(
            { error: "Este correo ya tiene una cuenta activa. Ve a Iniciar Sesión o recupera tu contraseña." },
            { status: 409 }
          );
        }
      } else if (isAlreadyRegistered) {
        return NextResponse.json(
          { error: "Este correo ya está registrado. Ve a Iniciar Sesión o recupera tu contraseña." },
          { status: 409 }
        );
      } else {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    const displayName = name || email.split("@")[0];

    if (isVipCheckout) {
      try {
        await supabaseAdmin.from("vip_purchases_log").insert({
          buyer_email: email,
          buyer_name: displayName,
          provider,
          status: "approved",
        });
      } catch {
        // Non-blocking log
      }
      await dispatchTraderEmail({
        template: "vipPurchase",
        to: email,
        traderName: displayName,
      });
    }

    const welcomeEmailDispatch = await dispatchTraderEmail({
      template: "welcome",
      to: email,
      traderName: displayName,
    });

    return NextResponse.json(
      {
        success: true,
        user_id: finalUserId,
        email,
        vip_activated: isVipCheckout,
        welcome_email: {
          sent: welcomeEmailDispatch.success,
          mode: welcomeEmailDispatch.mode,
          messageId: welcomeEmailDispatch.messageId,
        },
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
