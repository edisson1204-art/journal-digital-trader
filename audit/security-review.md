# Security review — fase B (parcial)

**Rama:** `repair/integridad-ledger-v1` · **Base:** `580e0bd` · **Entorno de prueba:** pruebas de unidad con Supabase simulado + build local. **No se probó contra la base real ni contra producción.**

## Corregido (con prueba que falla antes y pasa después)

| ID | Problema | Causa raíz | Corrección | Prueba (antes → después) |
|---|---|---|---|---|
| SEC-01 | El webhook de Systeme creaba cuentas con la service role si `SYSTEME_WEBHOOK_SECRET` no estaba definida | `if (expectedSecret && ...)`: la validación era opcional | Falla cerrado (503) sin secreto; comparación en tiempo constante | `SEC-01`: 200 → 503 |
| SEC-03 | El webhook imprimía el payload completo y el email en logs | `console.log` del payload | Se eliminan esos logs | `SEC-03`: falla → pasa |
| SEC-04 | `/api/chat` no exigía sesión (proxy abierto) | No había comprobación de usuario | `supabase.auth.getUser()` en servidor, 401 sin sesión | `SEC-04`: 500 → 401 |
| SEC-06 | Sin límite de mensajes/tamaño | — | Máx. 40 mensajes y 6 MB | `SEC-06`: 500 → 400 |
| SEC-07 | El header `Authorization` se aceptaba como clave OpenAI | Fallback `Authorization` | Solo `x-openai-key` | `SEC-07`: 500 → 401 |
| S05 | Logout no cerraba la sesión | Era un `<Link href="/">` | `logout()`: `signOut`, vaciar stores, borrar `localStorage` privado, recarga completa | Sin prueba automatizada (ver "No verificado") |
| S06 | Rutas `/app/*` protegidas solo en el cliente | No existía proxy | `src/proxy.ts` valida con `getUser()` y responde `no-store` | Sin prueba automatizada |
| S08 | Recuperación de contraseña era `href="#"` | No implementada | `/forgot-password` (respuesta neutral) y `/reset-password` (sesión de recuperación, mín. 10 caracteres, cierra sesión al terminar) | Sin prueba automatizada |
| S04 | La UI decía "encriptada" y "nunca se envía a nuestros servidores" | Ofuscación reversible; la clave sí viaja al servidor en cada consulta | Textos corregidos; la clave se borra al cerrar sesión | — |
| — | Errores de OpenAI devueltos crudos (pueden incluir fragmentos de la clave) | `error.message` directo | Mensajes genéricos y sin log del mensaje | — |
| — | Dos clientes de Supabase con sesiones distintas (cookies vs localStorage) | `lib/supabase/client.ts` usaba `supabase-js` plano | Un solo cliente `@supabase/ssr` | Sin prueba automatizada |

Los resultados de las pruebas están en `audit/test-results/security-before.log` (código original) y `audit/test-results/after-security.log`.

## Ventana de sesión (no se afirma revocación inmediata)
`signOut()` revoca el refresh token, pero el access token (JWT) ya emitido sigue siendo válido hasta que expire (valor por defecto de Supabase: 1 hora). Una API que valide con `getUser()` consulta a Supabase Auth, por lo que la sesión revocada deja de funcionar en `/api/chat` y en el proxy; la ventana aplica a la validación local del JWT, por ejemplo con RLS en la base de datos.

## No verificado / pendiente
- **Aislamiento A/B (RLS):** no hay migraciones en el repo; la política real de `public.trades` no se pudo auditar. Hay que exportar el esquema o probarlo en un entorno de staging con dos cuentas de prueba, sin usar la service role.
- **Flujo de recuperación de contraseña de extremo a extremo:** exige que `https://journal-digital-trader.vercel.app/reset-password` esté en *Redirect URLs* de Supabase Auth y que el correo salga con la plantilla correcta. No lo pude comprobar.
- **Logout, proxy y cambio de usuario en el mismo navegador:** requieren una prueba E2E con navegador; no se hizo.
- **Webhook:** si en Vercel `SYSTEME_WEBHOOK_SECRET` no existe, tras desplegar este cambio el webhook responderá 503 hasta que se configure el secreto y el mismo valor en Systeme.io.
- **`/signup` crea cuentas sin pasar por pago** (`supabase.auth.signUp` directo): decisión de producto pendiente.
- **Almacenamiento de la clave BYOK:** sigue en `localStorage` ofuscada. Cifrarla de verdad en el navegador no aporta protección contra XSS; la alternativa es guardarla cifrada en servidor.
- **`npm audit`:** 13 vulnerabilidades (1 crítica en `next` 16.0–16.3.7); falta decidir la actualización.
- **Limitación de tasa (rate limit)** del endpoint de IA: solo hay límites de tamaño.
