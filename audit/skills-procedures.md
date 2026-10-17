# Procedimientos y Roles Aplicados — Ronda 2

> **Declaración de ejecución (Sección 2 del mandato):**
> La verificación y corrección de Ronda 2 se ejecutó en fases secuenciales dentro del entorno local y mediante un subagente de auditoría forense de solo lectura (`conversationId: fd889f35-b5f6-4d14-93e5-b25be4ffb5a8`). **Se declara explícitamente que esta revisión fue realizada por el mismo sistema agente y NO sustituye a la revisión externa independiente**, por lo que ningún ítem se marca como `APROBADO`.

---

## 1. Mapa de Roles y Procedimientos

| Rol | Responsabilidad | Procedimientos aplicados | Artefactos de salida |
|---|---|---|---|
| **A0 — Coordinador** | Identificar hashes completos de Git, proteger alcance, conservar cambios previos y mantener matriz de estados admisibles | `evidence-first-debugging`, `release-evidence-review` | `MANIFEST_REVISION.md`, `audit/REPORTE_EJECUTIVO_FINAL.md` |
| **A1 — Ledger y Matemática** | Dataset original (`T1..T4` + `1 OPEN` + `1 PARTIALLY_CLOSED`), dataset alternativo conservado, parciales, R bruto vs R neto, comisiones, Breakeven transparente y parser estricto por instrumento | `trading-ledger-integrity`, `financial-math-verification` | `src/lib/ledger/priceParser.ts`, `src/lib/ledger/ledger.ts`, `src/lib/tradeTypes.ts`, `audit/oracle_r2.py` |
| **A2 — Estadística** | Eliminación del certificado `n=30` y notas `A+`, intervalo de Wilson (`z=1.96`), Sharpe muestral `s_{n-1}` sin anualización artificial y Monte Carlo determinista/Bernoulli | `statistical-validation` | `src/app/app/simulator/page.tsx`, `src/lib/ledger/metrics.ts` |
| **A3 — Informes y Frontend** | Generación de los 5 informes con `n = 0, 1, 5, 20, 29, 30, 31, 50, 100`, eliminación del contrafactual `Set & Forget`, no conversión de vacíos en `0` y trazabilidad de cada frase | `report-traceability`, `ui-accessibility-i18n` | `src/app/app/reports/page.tsx`, `src/components/RegisterTradeModal.tsx` |
| **A4 — Backend y Seguridad** | Invariantes de persistencia en `tradeStore.ts`, cola de mutación contra sobre-cierre concurrente, migración SQL con trigger de invariantes, inventario de variables de entorno y alcance RLS | `supabase-rls-and-auth`, `payment-entitlement-integrity` | `src/store/tradeStore.ts`, `supabase/migrations/20261016_r2_trades_constraints.sql`, `audit/security-review.md` |
| **A5 — Revisor de Ronda 2** | Verificación cruzada Vitest (`78/78`) + Oráculo Python Decimal (`audit/oracle_r2.py`) + paquete limpio `.zip` con hash `.sha256` | `release-evidence-review`, `evidence-first-debugging` | `audit/test-results/r2-vitest.log`, `audit/test-results/r2-python-oracle.log` |

---

## 2. Detalle de los Procedimientos Ejecutados

### `evidence-first-debugging`
1. Reproducir cada discrepancia antes de modificar código.
2. Registrar entrada exacta, salida observada, causa raíz en archivo/línea y prueba automatizada.
3. Prohibido ocultar errores mediante `|| 0`, `catch {}` silenciosos o constantes centinela (`999.99`).

### `trading-ledger-integrity` y `financial-math-verification`
1. Toda aritmética de precios, lotes, comisiones, P&L bruto/neto, Profit Factor, Expectancy y múltiplos R se realiza con `Decimal` (`decimal.js` en TypeScript y `decimal.Decimal` en el oráculo Python).
2. Política explícita de redondeo:
   - Cálculos intermedios: precisión decimal exacta sin truncamiento prematuro.
   - Moneda y ratios visibles en UI: `ROUND_HALF_UP` a 2 decimales (`ROUND_HALF_UP_2DP`), exponiendo simultáneamente el valor exacto (`exactExpectancy`, `exactProfitFactor`, `exactNetR`, `exactGrossR`) para auditoría.
3. Separación estricta entre presencia (`EMPTY` vs `PRESENT`) y validez financiera por especificación de instrumento (`INSTRUMENT_PRICE_SPECS`).

### `statistical-validation`
1. Ningún tamaño muestral fijo (`n = 30`) habilita certificados de `"ventaja confirmada"`, `"calidad institucional"`, `"viable para funded"` ni calificaciones tipo `"A+"`.
2. El intervalo de confianza de proporción de aciertos utiliza la fórmula de score de Wilson al 95% (`z = 1.96`), verificada contra el caso `50/50 -> [92.865%, 100.0%]`.
3. El simulador Monte Carlo calcula retornos por operación (`netPnl - fee`) con generador PRNG reproducible y separa variabilidad Bernoulli (cuando `variabilidad = 0%`) de dispersión intratrade.

### `report-traceability`
1. Cada frase emitida por `generateNarrativeWithTrace` adjunta metadatos verificables: `ruleId`, `period`, `sampleN` y `metricsUsed`.
2. Ninguna métrica ausente (`mae`, `mfe`, `holdTimeMinutes`) se convierte en `0`; si no existen observaciones reales, la sección se omite explícitamente.

### `supabase-rls-and-auth` y `payment-entitlement-integrity`
1. Separación documental y técnica entre pruebas unitarias con mocks (`src/app/api/security.test.ts`), pruebas transaccionales con `ROLE authenticated (NOBYPASSRLS)` y `ROLLBACK` en PostgreSQL 17.6, y pruebas HTTP multiusuario en entorno de staging.
2. Ninguna migración ni dato sintético se persiste en la base de producción.
