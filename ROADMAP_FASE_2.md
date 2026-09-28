# 🚀 HOJA DE RUTA - FASE 2: LANZAMIENTO (Journal Digital Trader Invest)

El desarrollo del software V1 ha sido completado. A partir de este punto, el objetivo es desplegar la aplicación y automatizar las ventas.

## Tareas Pendientes para la Próxima Sesión

### [ ] 1. Despliegue en Servidores Públicos (Vercel)
- [ ] Subir el código fuente desde el entorno local a un repositorio seguro (GitHub).
- [ ] Conectar el repositorio a Vercel para obtener hosting gratuito con auto-escalado.
- [ ] Configurar las Variables de Entorno de Supabase (`.env.local`) en el panel de Vercel.
- [ ] Obtener la URL pública de producción (ej. `https://journal-digital-trader.vercel.app`).

### [ ] 2. Configuración Comercial (Hotmart / Systeme.io)
- [ ] (Responsabilidad del Usuario): Crear el producto de membresía recurrente a $14.99/mes en la plataforma elegida.
- [ ] (Responsabilidad del Usuario): Diseñar la Landing Page o Embudo de Ventas.

### [ ] 3. Programación del Puente de Automatización (Webhooks)
- [ ] Programar la ruta `/api/webhooks` dentro de Next.js para recibir pagos.
- [ ] Conectar el Webhook con la base de datos de Supabase para que cree los usuarios y contraseñas automáticamente cuando se recibe una compra.
- [ ] Vincular la URL del Webhook de producción en el panel de desarrolladores de Hotmart o Systeme.io.

### [ ] 4. Pruebas Finales (QA Beta Test)
- [ ] Realizar una transacción de prueba simulada ($1 o modo test).
- [ ] Verificar la recepción de correos de acceso y la fluidez del login.
- [ ] Verificar que al cancelar la suscripción, el acceso en la aplicación quede bloqueado automáticamente.

---
**Estado del Sistema:**
- Base de datos conectada: ✅
- UX/UI y Bilingüismo: ✅
- Precio de Oferta: $14.99/mes (Modelo BYOK para Inteligencia Artificial).
