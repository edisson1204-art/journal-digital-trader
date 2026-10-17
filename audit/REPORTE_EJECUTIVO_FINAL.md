# Informe Ejecutivo y Técnico de Reparación — Ronda 2 (Journal Digital Trader Invest)

**Fecha de cierre de Ronda 2:** 16 de octubre de 2026 (`America/Chicago`)  
**Repositorio:** `C:\Users\ediss\testing\REGISTRO DE OPERACIONES\trading-intelligence`  
**Rama aislada:** `repair/integridad-ledger-v1`  
**Commit base auditado:** `580e0bd4561e98ce78a836a5711940b7de70dc8b` (`580e0bd`)  
**Declaración de independencia (§2):** La verificación y corrección fue ejecutada en fases secuenciales dentro del entorno local y con apoyo de un subagente forense de solo lectura. **No constituye una revisión externa independiente**, por lo que ningún ítem se declara `APROBADO`. Se utilizan exclusivamente los estados admisibles del mandato (§11): `VERIFICADO LOCALMENTE`, `VERIFICADO EN STAGING`, `PENDIENTE DE REVISIÓN EXTERNA`, `BLOQUEADO`, `NO REPRODUCIDO`.

---

## 1. Verificación de Referencias Git Declaradas (§1)

| Referencia corta | Hash completo (40 caracteres) | Fecha | Mensaje de commit |
|---|---|---|---|
| `580e0bd` (Base) | `580e0bd4561e98ce78a836a5711940b7de70dc8b` | 2026-10-06 16:52:58 -0500 | `UI: Ajustar espacios vacios en la pantalla de psicologia y agregar tarjeta de Impacto de Errores` |
| `e35a330` | `e35a330aa75534d95ae2dbf6a28ab2f7bbdce66f` | 2026-10-13 15:18:46 -0500 | `fix(ledger): P&L decimal desde ejecuciones, parciales, PF neto sin centinela, tests T01-T16 + propiedades; auditoria baseline` |
| `62b2cf6` | `62b2cf6818998604bae7fb6908d7a9f83ed8499a` | 2026-10-13 15:32:55 -0500 | `security: logout real, proxy de rutas, webhook fail-closed, /api/chat con sesion y limites, recuperacion de contrasena, textos honestos sobre la clave BYOK; tests SEC-01..07` |
| `65989a1` | `65989a1ee18e769089c2d8c1b655a9616aa6b889` | 2026-10-16 18:56:43 -0500 | `security(db): migracion RLS en public.trades (revocar anon, user_id NOT NULL, indice y politicas authenticated)` |
| `bb0ca09` | `bb0ca09c7dddabcdb5c3abaf84e5c8b633920510` | 2026-10-16 19:43:02 -0500 | `fix(audit-oct14): resolve MAT-01..02, LED-01..06, STA-02..05, REP-01..04, empty states and landing integrity` |

---

## 2. Matriz Maestra de Requisitos de Ronda 2 (`R2-01` a `R2-08`)

| ID | Requisito | Implementación y Archivo:Línea | Prueba Automatizada / Oráculo | Estado Admisible |
|---|---|---|---|---|
| **R2-01** | **Dataset original (`T1..T4` + `1 OPEN` + `1 PARTIALLY_CLOSED`) y conservación del dataset alternativo con nombre distinto; política `ROUND_HALF_UP_2DP` y conciliación de abiertas/parciales** | `src/lib/tradeTypes.ts` (`computeStats`, `exactExpectancy`, `exactProfitFactor`, `roundingPolicy: "ROUND_HALF_UP_2DP"`, `openPositionsCount`, `partialPositionsCount`, `partialRealizedNet`, `openExecutionCommission`, `totalAccruedCommissions`) | `src/lib/ledger/r2_audit.test.ts` (`R2-01-A` y `R2-01-B`) + `audit/oracle_r2.py` | `VERIFICADO LOCALMENTE` / `PENDIENTE DE REVISIÓN EXTERNA` |
| **R2-02** | **Integración de flujo (`OPEN -> recarga -> PARTIALLY_CLOSED -> CLOSED`), rechazo de sobre-cierre (`3/2`) en UI/store/concurrencia/DB, propagación de edición a 5 vistas y manejo explícito de `loadError`/`syncError`/`syncStatus`** | `src/store/tradeStore.ts` (`validateAndNormalizeTrade`, `tradeMutationLocks`, `loadError`, `syncError`, `syncStatus`), `supabase/migrations/20261016_r2_trades_constraints.sql` (`enforce_trades_ledger_invariants`) | `src/lib/ledger/r2_audit.test.ts` (`R2-02-A..D`) + `audit/test-results/r2-postgres-rls-trigger.json` | `VERIFICADO LOCALMENTE` / `PENDIENTE DE REVISIÓN EXTERNA` |
| **R2-03** | **Separación entre presencia (`EMPTY` vs `PRESENT`) y validez financiera (`0`, negativos, no finitos, separador coma, tick size por instrumento y rechazo de instrumento desconocido)** | `src/lib/ledger/priceParser.ts` (`parsePresence`, `parseAndValidateInstrumentPrice`, `INSTRUMENT_PRICE_SPECS`), `src/components/RegisterTradeModal.tsx` | `src/lib/ledger/r2_audit.test.ts` (`R2-03-A..F`) | `VERIFICADO LOCALMENTE` / `PENDIENTE DE REVISIÓN EXTERNA` |
| **R2-04** | **Atajo Breakeven transparente (no sobrescribe salidas reales ni cierra parciales abiertos; valida tick en entradas escalonadas) y separación explícita `grossRMultiple` (`0.50R`) vs `rMultiple` (`0.4996R`, exacto `0.49955R`) sobre riesgo inicial completo (`initialStopLoss`)** | `src/lib/tradeTypes.ts` (`calculateTradeFromFills`), `src/components/RegisterTradeModal.tsx` (`computeStep3Preview`) | `src/lib/ledger/r2_audit.test.ts` (`R2-04-A..F`) + `audit/oracle_r2.py` | `VERIFICADO LOCALMENTE` / `PENDIENTE DE REVISIÓN EXTERNA` |
| **R2-05** | **Eliminación del certificado de `30` operaciones y notas `A+` / `"ventaja confirmada"` / `"calidad institucional"` / `"viable para funded"`; Wilson `50/50 -> 92.865%`; Sharpe muestral sin anualizar; Monte Carlo determinista (`$11,000`, `$9,000`, `$10,990`) y variabilidad Bernoulli** | `src/app/app/simulator/page.tsx` (`generateReport`, `runMonteCarlo`, `wilsonCI`), `src/lib/ledger/metrics.ts` | `src/lib/ledger/r2_audit.test.ts` (`R2-05-A..F`, probado en `n = 0, 1, 5, 20, 29, 30, 31, 50, 100`) | `VERIFICADO LOCALMENTE` / `PENDIENTE DE REVISIÓN EXTERNA` |
| **R2-06** | **Generación de los 5 informes (`monthly`, `strategy`, `tax`, `psychology`, `technical`) con datos no vacíos, eliminación de `efficiencyPassive` (`Set & Forget`), no conversión de `mae`/`mfe`/`holdTimeMinutes` vacíos en `0`, y trazabilidad de cada frase (`ruleId`, `period`, `sampleN`, `metricsUsed`)** | `src/app/app/reports/page.tsx` (`calculateQuantStats`, `generateNarrativeWithTrace`, `generateNarrativeTraceability`) | `src/lib/ledger/r2_audit.test.ts` (`R2-06-A..C`, probado en `n = 0, 1, 5, 20, 29, 30, 31, 50, 100`) | `VERIFICADO LOCALMENTE` / `PENDIENTE DE REVISIÓN EXTERNA` |
| **R2-07** | **Seguridad, alcance de pruebas unitarias vs RLS real, inventario de variables de entorno por nombre y protocolo de webhook Systeme.io** | `src/app/api/webhooks/systeme/route.ts`, `src/app/api/chat/route.ts`, `audit/security-review.md`, `audit/verify_staging_rls.mjs` | Unitarias: `VERIFICADO LOCALMENTE` (`SEC-01..07`); Motor Postgres 17.6 `pg_temp` con `ROLE authenticated` y `ROLLBACK`: `VERIFICADO LOCALMENTE`; Staging HTTP 2 usuarios separados: `BLOQUEADO` (no existe proyecto Supabase de staging separado de producción) | `VERIFICADO LOCALMENTE` (Unit + PG `ROLLBACK`) / `BLOQUEADO` (Staging HTTP separado) |
| **R2-08** | **Paquete revisable limpio (`.zip` sin `.env`, `node_modules`, `.next`), `MANIFEST_REVISION.md`, diff completo, logs de pruebas, oráculo Python y archivo `.sha256` externo** | `MANIFEST_REVISION.md`, `audit/oracle_r2.py`, `audit/test-results/r2-vitest.log`, `audit/test-results/r2-python-oracle.log` | Paquete y `.sha256` generados y verificados | `VERIFICADO LOCALMENTE` / `PENDIENTE DE REVISIÓN EXTERNA` |

---

## 3. Contraste Numérico Exacto (`R2-01` y `R2-04`)

### 3.1 Dataset Original Mandatorio (`R2-01-A`)
- **T1:** Long 2 NQ @ `20000`, salidas `1 @ 20010` y `1 @ 20020`, comisión `$0.09`/lado $\rightarrow$ Bruto `$600.00`, Comisión `$0.36`, Neto **`$599.64`** (`Win`).
- **T2:** Short 1 NQ @ `20000`, salida `1 @ 20010`, comisión `$0.09`/lado $\rightarrow$ Bruto `-$200.00`, Comisión `$0.18`, Neto **`-$200.18`** (`Loss`).
- **T3:** Long 1 NQ @ `20000`, salida `1 @ 20000`, comisión `$0.09`/lado $\rightarrow$ Bruto `$0.00`, Comisión `$0.18`, Neto **`-$0.18`** (`Loss` por comisión, nunca `Breakeven`).
- **T4:** Short 1 NQ @ `20000`, salida `1 @ 19990`, comisión `$0.09`/lado $\rightarrow$ Bruto `$200.00`, Comisión `$0.18`, Neto **`$199.82`** (`Win`).
- **Agregados de cerradas (`n = 4`):**
  - Bruto total: **`$600.00`**
  - Comisiones cerradas: **`$0.90`**
  - Neto total: **`$599.10`**
  - Conteo: **`2` victorias, `2` pérdidas, `0` breakeven** (`Win Rate = 50%`)
  - Expectancy exacta: **`149.775`** | Expectancy visible (`ROUND_HALF_UP_2DP`): **`$149.78`**
  - Profit Factor neto exacto: **`799.46 / 200.36 = 3.99011778798`** | Visible (`2dp`): **`3.99`**
  - Max Drawdown realizado (secuencia `T1 -> T2 -> T3 -> T4`): **`$200.36`**
- **Conciliación separada de abiertas y parciales (`T5 OPEN` + `T6 PARTIALLY_CLOSED`):**
  - `openPositionsCount = 1`, `partialPositionsCount = 1`, `openContractsTotal = 3`
  - `partialRealizedGross = $200.00`, `partialRealizedCommission = $0.18`, `partialRealizedNet = $199.82`
  - `openExecutionCommission = $0.27` (`$0.18` de `T5` + `$0.09` del lote abierto de `T6`)
  - `totalAccruedCommissions = $1.35` (`$0.90` cerradas + `$0.18` parcial realizada + `$0.27` entradas abiertas)

### 3.2 Dataset Alternativo Conservado (`R2-01-B`)
- Conservado con nombre de prueba distinto (`R2-01-B (Dataset Alternativo Conservado)`):
  - Neto total: **`$398.92`**
  - Expectancy (4 trades): **`$99.73`**
  - Profit Factor neto exacto (`799.64 / 400.72`): **`1.9955080854`**
  - R neto medio: **`0.249325`**
