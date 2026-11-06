import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Endpoint Keep-Alive para evitar que el proyecto de Supabase entre en pausa (INACTIVE)
 * por inactividad en el plan gratuito. Ejecutado automáticamente por Vercel Cron.
 */
export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      return NextResponse.json({ ok: false, reason: "missing_env" }, { status: 200 });
    }
    const supabase = createClient(url, key);
    const { error } = await supabase.from("trades").select("id").limit(1);
    return NextResponse.json({
      ok: !error,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ ok: false, timestamp: new Date().toISOString() }, { status: 200 });
  }
}
