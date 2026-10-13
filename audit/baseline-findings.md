# Baseline findings — Journal Digital Trader Invest

**Rama de reparación:** `repair/integridad-ledger-v1` · **Commit base:** `580e0bd` (main)
**Stack:** Next.js 16.3.5 (Turbopack), React 19.2.8, Supabase (Auth + Postgres, RLS), zustand (persist localStorage), Vercel AI SDK 3.1.32 + OpenAI `gpt-4o` (BYOK), Tailwind 4.
**Pagos:** no hay integración real. Hay un webhook de Systeme.io; Stripe solo se menciona en textos legales.
**Pruebas:** no existían. Se añadió Vitest + fast-check + decimal.js.
**Variables de entorno (solo nombres):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (+ `SYSTEME_WEBHOOK_SECRET` esperada en el webhook).
**Evidencia previa:** `audit/test-results/baseline.log` (código base sin modificar; 6 pruebas fallan).

> El Agente 1 (subagente auditor) quedó bloqueado por permisos y no produjo hallazgos. Lo que sigue lo verificó directamente el agente principal leyendo el código. Todo lo marcado HIPÓTESIS requiere prueba en entorno.

## Matemática financiera

| ID | Sev. | Hallazgo | Evidencia | Estado |
|---|---|---|---|---|
| L01 | BLOQUEANTE | Una salida parcial calcula P&L sobre **todos** los contratos (2 entrados, 1 salido → bruto 400 en vez de 200) y cierra el trade. | `tradeTypes.ts` `calculateTrade` (base); test `BUG-L01` falla en base | CONFIRMADO |
| L02 | ALTO | `isBreakeven = abs(net) < comisión + 0.01` marca como Breakeven trades con pérdida neta (T03: -0.36). | base `tradeTypes.ts:278`; test `BUG-L03` | CONFIRMADO |
| L03 | ALTO | R realizado calculado sobre bruto y devuelve `0` si el stop = entrada (valor silencioso). | base `tradeTypes.ts:275-276`; test `BUG-L04` | CONFIRMADO |
| L04 | ALTO | `avgExit` se divide por `(contractsExited \|\| 1)`: un valor vacío se convierte en 1 en silencio. | `RegisterTradeModal.tsx:569-571` | CONFIRMADO |
| M01 | ALTO | PF devuelve centinela `999.99` sin pérdidas. | base `tradeTypes.ts:344`; test `BUG-M01` | CONFIRMADO |
| M02 | ALTO | PF sobre P&L **bruto**, no neto (T15: 2.0 en vez de 1.9955). | base `tradeTypes.ts:306-307`; test `BUG-M02` | CONFIRMADO |
| M03 | MEDIO | Duración desconocida / 0 se promedia mal (`avgHoldTime` ignora 0 pero divide mal). | base `tradeTypes.ts:334`; test `BUG-M04` | CONFIRMADO |
| M04 | MEDIO | Drawdown ordenaba por `dateOpen` sin hora. | base `tradeTypes.ts:297` | CONFIRMADO |

## Seguridad

| ID | Sev. | Hallazgo | Evidencia | Estado |
|---|---|---|---|---|
| S01 | BLOQUEANTE | `/api/chat` no exige sesión: cualquiera con una clave OpenAI usa el endpoint; no hay límite de tamaño ni de tasa. Con clave propia el coste es del usuario, pero el endpoint es un proxy abierto. | `api/chat/route.ts:7-22` | CONFIRMADO |
| S02 | ALTO | Webhook Systeme: **si `SYSTEME_WEBHOOK_SECRET` no está definido, no valida nada** y cualquiera puede crear cuentas con service role. | `webhooks/systeme/route.ts:10-14` | CONFIRMADO (código); falta confirmar si la variable existe en Vercel |
| S03 | ALTO | El webhook registra el payload completo (PII/email) en logs. | `route.ts:17` | CONFIRMADO |
| S04 | ALTO | La clave OpenAI se "encripta" con un ofuscador reversible en localStorage; la UI afirma "encriptada". | `settingsStore.ts:16-35`; `settings/page.tsx:57` | CONFIRMADO (afirmación engañosa) |
| S05 | ALTO | Logout es un `<Link href="/">`: **no llama a `supabase.auth.signOut()`** ni limpia stores/caché. | `AppShell.tsx:201` | CONFIRMADO |
| S06 | MEDIO | No hay `middleware`/`proxy`: las rutas `/app/*` se protegen solo en cliente. | búsqueda de `middleware.ts` sin resultados | CONFIRMADO |
| S07 | MEDIO | El historial del mentor en localStorage (`chatKey`) no se borra al cambiar de usuario. | `ai-mentor/page.tsx:180-197` | HIPÓTESIS (revisar clave por usuario) |
| S08 | MEDIO | Recuperación de contraseña: enlace `href="#"`. | `login/page.tsx:90` | CONFIRMADO |
| S09 | MEDIO | `npm audit` (prod): 13 vulnerabilidades (1 crítica en `next` 16.0–16.3.7, 4 altas). | `npm audit --omit=dev` | CONFIRMADO |

## Producto

| ID | Sev. | Hallazgo | Evidencia | Estado |
|---|---|---|---|---|
| P01 | ALTO | Precio inconsistente: login dice `$14.99/mes`, la barra lateral muestra `$16.99/mo`; no hay lectura de estado real de suscripción. | `login/page.tsx:106`; `AppShell` | CONFIRMADO |
| P02 | ALTO | Textos legales mencionan Stripe, pero no hay Stripe integrado. | `privacy`, `terms`, `refund-policy` | CONFIRMADO |
| P03 | ALTO | Informes mensuales afirman "validando tu ventaja estadística", "certifica", "riesgo de ruina" sin evidencia ni muestra mínima. | `reports/page.tsx:194-241` | CONFIRMADO |
| P04 | ALTO | Psicología: "Discipline Score" combina plan, WR y una fórmula arbitraria de P&L; con 3 trades muestra 87/100 y 100% WR. | `psychology/page.tsx:80-87` | CONFIRMADO |
| P05 | MEDIO | `href="#"` en varios enlaces (login, y otro en footer/legal). | grep | CONFIRMADO |
| P06 | MEDIO | Mezcla ES/EN en la interfaz de `/app`. | `reports/page.tsx`, `journal` | CONFIRMADO |
| P07 | MEDIO | No existen migraciones de BD en el repo (RLS y esquema no auditables). | ausencia de `*.sql` | CONFIRMADO |

## No verificado

- Aislamiento entre dos usuarios A/B (RLS real): requiere entorno de staging y dos cuentas de prueba. No se hizo con claves administrativas, según tus reglas.
- Comportamiento en producción de las variables de entorno.
- Accesibilidad (contraste, teclado) y responsive: pendiente.
