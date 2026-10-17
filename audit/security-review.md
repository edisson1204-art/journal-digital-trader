# Revisión de Seguridad, RLS, Variables de Entorno y Alcance — Ronda 2 (R2-07)

**Rama:** `repair/integridad-ledger-v1` · **Base:** `580e0bd62fd8e0f10d4f0cf5b4b13c64a0ba1ef5`

---

## 1. Distinción Estricta de Alcance de Pruebas (R2-07)

Para cumplir con el mandato de Ronda 2, se separa sin ambigüedad qué verifica cada nivel de prueba:

| Nivel de prueba | Qué verifica | Qué NO verifica | Evidencia | Estado admisible |
|---|---|---|---|---|
| **1. Pruebas unitarias de rutas API con mocks** (`src/app/api/security.test.ts`) | Que `/api/webhooks/systeme` falle cerrado (`503`) cuando `SYSTEME_WEBHOOK_SECRET` no está definido, rechace secretos inválidos (`401`) con comparación en tiempo constante (`timingSafeEqual`), no imprima PII en logs, y que `/api/chat` exija sesión (`401`), rechace payloads `> 40` mensajes (`400`) y no acepte `Authorization` como clave OpenAI (`401`). | **NO demuestra** políticas RLS en PostgreSQL ni aislamiento real entre sesiones de Supabase. | `audit/test-results/r2-vitest.log` (`SEC-01` a `SEC-07`, 7/7 pruebas aprobadas) | `VERIFICADO LOCALMENTE` |
| **2. Inspección del catálogo `pg_policy` + Ejecución transaccional en PostgreSQL 17.6 con `ROLE authenticated (NOBYPASSRLS)` y `ROLLBACK`** | Que las 4 políticas activas en `public.trades` (`trades_select_own`, `trades_insert_own`, `trades_update_own`, `trades_delete_own`) evalúan `((SELECT auth.uid() AS uid) = user_id)`, que bajo el rol no privilegiado `authenticated` (`NOBYPASSRLS`) el `user_b` obtiene `0` filas en `SELECT/UPDATE/DELETE` sobre registros de `user_a`, recibe error `42501` al intentar `INSERT` con `user_id = user_a`, y que el trigger `enforce_trades_ledger_invariants` rechaza sobre-cierres (`3` sobre `2`) con código `23514`. Todo ejecutado en `pg_temp` dentro de `BEGIN ... ROLLBACK` sin tocar un solo registro real. | **NO sustituye** una prueba HTTP de extremo a extremo con dos cuentas reales de GoTrue en un proyecto Supabase de staging independiente. | `audit/test-results/r2-postgres-rls-trigger.json` | `VERIFICADO LOCALMENTE` (motor Postgres 17.6 con `ROLLBACK`) |
| **3. Prueba HTTP PostgREST de extremo a extremo con 2 usuarios sintéticos ordinarios (`anon` key) en proyecto de Staging separado** | Login real con `signInWithPassword` para `userA` y `userB` usando `NEXT_PUBLIC_SUPABASE_ANON_KEY` (sin `service_role`) contra un proyecto de staging aislado. | No se ejecutó contra el proyecto `ukeqvdklgtzsnkhtkrvm` porque es la base de datos de producción activa y no existe una rama/proyecto de staging separado (`list_branches = []`). Crear usuarios o filas en producción violaría la Regla §1 (*"No mezcles pruebas con registros reales. No publiques cambios, no apliques migraciones a producción"*). | Script listo en `audit/verify_staging_rls.mjs` | `BLOQUEADO` (falta proyecto Supabase de staging separado de producción) |

---

## 2. Políticas RLS Comprobadas en `public.trades` (Inspección `pg_policy` de solo lectura)

Consulta de solo lectura ejecutada sobre `pg_policy` y `pg_constraint`:

- `trades_select_own` (`SELECT`): `USING (((SELECT auth.uid() AS uid) = user_id))`
- `trades_insert_own` (`INSERT`): `WITH CHECK (((SELECT auth.uid() AS uid) = user_id))`
- `trades_update_own` (`UPDATE`): `USING (((SELECT auth.uid() AS uid) = user_id))` / `WITH CHECK (((SELECT auth.uid() AS uid) = user_id))`
- `trades_delete_own` (`DELETE`): `USING (((SELECT auth.uid() AS uid) = user_id))`
- Clave primaria y foránea: `trades_pkey PRIMARY KEY (id)`, `trades_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`

### Migraciones preparadas en el repositorio (NO aplicadas a producción)
1. `supabase/migrations/20261013_harden_trades_rls.sql` y su reversión `20261013_harden_trades_rls.rollback.sql`.
2. `supabase/migrations/20261016_r2_trades_constraints.sql` y su reversión `20261016_r2_trades_constraints.rollback.sql`:
   - Añade el trigger `trg_enforce_trades_ledger_invariants` (`enforce_trades_ledger_invariants()`) que impide en PostgreSQL cualquier `INSERT` o `UPDATE` donde la suma de contratos de `exits[]` supere la suma de contratos de `entries[]`, donde los precios/cantidades no sean positivos, o donde `data->>'id'` no coincida con `id::text`.

---

## 3. Inventario de Variables de Entorno por Nombre (Sin Valores)

| Nombre de Variable | Ámbito | Propósito | Comportamiento si falta |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Público (Cliente/Servidor) | URL del proyecto Supabase (`@supabase/ssr`) | Falla la inicialización del cliente Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Público (Cliente/Servidor) | Clave anónima sujeta a RLS (`ROLE authenticated` / `anon`) | Falla la inicialización del cliente Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Secreto exclusivo de Servidor (`src/lib/supabase/admin.ts`) | Invitación de usuarios desde `/api/webhooks/systeme` (`auth.admin.inviteUserByEmail`). **Nunca importada en componentes cliente (`"use client"`).** | El webhook devuelve error `500` al intentar invitar; ninguna ruta cliente depende de ella |
| `SYSTEME_WEBHOOK_SECRET` | Secreto exclusivo de Servidor (`src/app/api/webhooks/systeme/route.ts`) | Autenticación en tiempo constante (`timingSafeEqual`) del header `x-webhook-secret` / `x-systeme-secret` | **Falla cerrado (`503 Webhook not configured`)** y rechaza toda solicitud sin crear usuarios |

---

## 4. Protocolo de Configuración y Verificación del Webhook de Systeme.io (Pre-Producción)

Dado que `/api/webhooks/systeme` ahora **falla cerrado (`503`)** si `SYSTEME_WEBHOOK_SECRET` no está definido:

1. **Generación del secreto (fuera del repositorio):**
   - Generar un token aleatorio de 32 bytes hexadecimales (`openssl rand -hex 32`).
2. **Configuración en Vercel (Staging / Preview antes de Producción):**
   - Definir `SYSTEME_WEBHOOK_SECRET` en las variables de entorno del proyecto en Vercel.
3. **Configuración en Systeme.io:**
   - En la regla de automatización / webhook de Systeme.io, configurar el header HTTP `x-webhook-secret` con el mismo valor.
4. **Verificación previa al corte:**
   - Petición sin header `x-webhook-secret` $\rightarrow$ debe devolver `401 Unauthorized`.
   - Petición con header incorrecto $\rightarrow$ debe devolver `401 Unauthorized`.
   - Petición con header válido y payload de prueba en staging $\rightarrow$ debe devolver `200 OK` sin imprimir el email en los logs de función.
