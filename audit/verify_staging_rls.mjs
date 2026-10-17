#!/usr/bin/env node
/**
 * Script de verificación de aislamiento RLS multiusuario en Staging (R2-07).
 *
 * REGLAS ESTRICTAS:
 *  - Usa únicamente NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.
 *  - PROHIBIDO usar SUPABASE_SERVICE_ROLE_KEY para probar políticas RLS.
 *  - Requiere dos cuentas sintéticas ordinarias en un entorno de STAGING:
 *      STAGING_USER_A_EMAIL / STAGING_USER_A_PASSWORD
 *      STAGING_USER_B_EMAIL / STAGING_USER_B_PASSWORD
 *  - No debe ejecutarse contra producción.
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.STAGING_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.STAGING_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const userAEmail = process.env.STAGING_USER_A_EMAIL;
const userAPassword = process.env.STAGING_USER_A_PASSWORD;
const userBEmail = process.env.STAGING_USER_B_EMAIL;
const userBPassword = process.env.STAGING_USER_B_PASSWORD;

if (!url || !anonKey || !userAEmail || !userAPassword || !userBEmail || !userBPassword) {
  console.error(
    JSON.stringify(
      {
        status: "BLOQUEADO",
        reason:
          "Faltan credenciales de entorno de STAGING separado (STAGING_SUPABASE_URL, STAGING_SUPABASE_ANON_KEY, STAGING_USER_A_EMAIL/PASSWORD, STAGING_USER_B_EMAIL/PASSWORD). Por mandato §1 no se crean usuarios ni registros sintéticos en producción.",
      },
      null,
      2
    )
  );
  process.exit(2);
}

async function main() {
  const clientA = createClient(url, anonKey, { auth: { persistSession: false } });
  const clientB = createClient(url, anonKey, { auth: { persistSession: false } });

  const { data: authA, error: errA } = await clientA.auth.signInWithPassword({
    email: userAEmail,
    password: userAPassword,
  });
  if (errA || !authA.user) throw new Error(`Fallo login User A: ${errA?.message}`);

  const { data: authB, error: errB } = await clientB.auth.signInWithPassword({
    email: userBEmail,
    password: userBPassword,
  });
  if (errB || !authB.user) throw new Error(`Fallo login User B: ${errB?.message}`);

  const tradeId = "99999999-9999-4999-8999-999999999901";

  try {
    // 1. User A inserta un trade sintético propio
    const { error: insErr } = await clientA.from("trades").upsert({
      id: tradeId,
      user_id: authA.user.id,
      data: {
        id: tradeId,
        instrument: "NQ",
        side: "Buy",
        entries: [{ price: 20000, contracts: 2 }],
        exits: [{ price: 20010, contracts: 1 }],
      },
    });
    if (insErr) throw new Error(`User A insert falló: ${insErr.message}`);

    // 2. User B intenta leer el trade de User A con anon key + su propio JWT
    const { data: bSelect } = await clientB.from("trades").select("id").eq("id", tradeId);

    // 3. User B intenta modificar el trade de User A
    const { data: bUpdate } = await clientB
      .from("trades")
      .update({ data: { hacked: true } })
      .eq("id", tradeId)
      .select("id");

    // 4. User B intenta eliminar el trade de User A
    const { data: bDelete } = await clientB.from("trades").delete().eq("id", tradeId).select("id");

    // 5. User B intenta insertar un registro falsificando user_id = User A
    const { error: bImpersonateErr } = await clientB.from("trades").insert({
      id: "99999999-9999-4999-8999-999999999902",
      user_id: authA.user.id,
      data: { entries: [{ price: 20000, contracts: 1 }], exits: [] },
    });

    const result = {
      status: "VERIFICADO EN STAGING",
      userAId: authA.user.id,
      userBId: authB.user.id,
      userBSelectCount: bSelect?.length ?? 0,
      userBUpdateCount: bUpdate?.length ?? 0,
      userBDeleteCount: bDelete?.length ?? 0,
      userBImpersonateRejected: Boolean(bImpersonateErr),
      userBImpersonateError: bImpersonateErr?.message ?? null,
    };

    console.log(JSON.stringify(result, null, 2));
  } finally {
    // Limpieza del registro sintético por su propietario User A
    await clientA.from("trades").delete().eq("id", tradeId);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
