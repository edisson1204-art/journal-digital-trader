# MANIFEST_REVISION.md — Entrega Revisable de Ronda 2

**Proyecto:** Journal Digital Trader Invest  
**Fecha de corte:** 16 de octubre de 2026 (`America/Chicago`)  
**Rama:** `repair/integridad-ledger-v1`  
**Commit base auditado:** `580e0bd4561e98ce78a836a5711940b7de70dc8b` (`580e0bd`)  
**Commit de código Ronda 2:** `70c3e7507095f4a24a6e047e85384c2d18aea0ca` (`70c3e75`)  
**Política de estados (§11):** Ningún ítem se declara `APROBADO` por el propio sistema agente. Estados utilizados exclusivamente: `VERIFICADO LOCALMENTE`, `VERIFICADO EN STAGING`, `PENDIENTE DE REVISIÓN EXTERNA`, `BLOQUEADO`, `NO REPRODUCIDO`.

---

## 1. Cadena de Commits en `repair/integridad-ledger-v1`

```text
70c3e7507095f4a24a6e047e85384c2d18aea0ca | 70c3e75 | 2026-10-16 21:50:27 -0500 | fix(r2-audit): complete R2-01..R2-08 ledger datasets, priceParser, BE preview, R gross/net, report traceability, DB invariants & 78 tests
bb0ca09c7dddabcdb5c3abaf84e5c8b633920510 | bb0ca09 | 2026-10-16 19:43:02 -0500 | fix(audit-oct14): resolve MAT-01..02, LED-01..06, STA-02..05, REP-01..04, empty states and landing integrity
65989a1ee18e769089c2d8c1b655a9616aa6b889 | 65989a1 | 2026-10-16 18:56:43 -0500 | security(db): migracion RLS en public.trades (revocar anon, user_id NOT NULL, indice y politicas authenticated)
62b2cf6818998604bae7fb6908d7a9f83ed8499a | 62b2cf6 | 2026-10-13 15:32:55 -0500 | security: logout real, proxy de rutas, webhook fail-closed, /api/chat con sesion y limites, recuperacion de contrasena, textos honestos sobre la clave BYOK; tests SEC-01..07
e35a330aa75534d95ae2dbf6a28ab2f7bbdce66f | e35a330 | 2026-10-13 15:18:46 -0500 | fix(ledger): P&L decimal desde ejecuciones, parciales, PF neto sin centinela, tests T01-T16 + propiedades; auditoria baseline
580e0bd4561e98ce78a836a5711940b7de70dc8b | 580e0bd | 2026-10-06 16:52:58 -0500 | UI: Ajustar espacios vacios en la pantalla de psicologia y agregar tarjeta de Impacto de Errores
```

---

## 2. Comandos Exactos de Verificación Reproducible

```powershell
# 1. Instalar dependencias exactas del lockfile
npm ci

# 2. Verificación estática de tipos TypeScript (debe terminar con código 0)
npx tsc --noEmit

# 3. Ejecutar la suite completa de 78 pruebas automatizadas (5 archivos)
npx vitest run --reporter=verbose

# 4. Ejecutar el oráculo matemático independiente en Python (decimal.Decimal)
python audit/oracle_r2.py
```

### Resumen de Ejecución de Pruebas (`audit/test-results/r2-vitest.log`)
- `src/app/api/security.test.ts`: **7 passed (7)** (`SEC-01` a `SEC-07`)
- `src/lib/ledger/regression.test.ts`: **8 passed (8)** (`BUG-L01..L04`, `BUG-M01..M04`)
- `src/lib/ledger/ledger.test.ts`: **20 passed (20)** (`T01..T16` + 3 propiedades `fast-check`)
- `src/lib/ledger/audit_oct14.test.ts`: **16 passed (16)** (`MAT-01..02`, `LED-01..06`, `STA-02..05`, `REP-01..04`)
- `src/lib/ledger/r2_audit.test.ts`: **27 passed (27)** (`R2-01-A..B`, `R2-02-A..D`, `R2-03-A..F`, `R2-04-A..F`, `R2-05-A..F`, `R2-06-A..C`)
- **Total:** **5 Test Files passed (5) | 78 Tests passed (78) | 0 failed**

---

## 3. Índice de Artefactos de Auditoría Incluidos

| Ruta | Descripción |
|---|---|
| `MANIFEST_REVISION.md` | Este manifiesto de entrega revisable con hashes completos, comandos, exclusiones y plan de reversión |
| `audit/REPORTE_EJECUTIVO_FINAL.md` | Informe ejecutivo de Ronda 2 con matriz `R2-01` a `R2-08` y estados admisibles |
| `audit/skills-procedures.md` | Documentación de los procedimientos y roles `A0..A5` aplicados y declaración de no independencia |
| `audit/security-review.md` | Distinción entre pruebas unitarias, verificación `pg_temp` con `ROLE authenticated` (`ROLLBACK`), estado `BLOQUEADO` de staging HTTP separado, inventario de variables de entorno por nombre y protocolo de webhook |
| `audit/oracle_r2.py` | Oráculo independiente en Python `decimal.Decimal` para `R2-01`, `R2-04` y `R2-05` |
| `audit/verify_staging_rls.mjs` | Script ejecutable para prueba HTTP PostgREST con 2 usuarios sintéticos ordinarios y clave `anon` en staging |
| `audit/r2-diff-from-base.patch` | Diff completo desde el commit base `580e0bd` hasta `HEAD` |
| `audit/test-results/r2-vitest.log` | Salida completa de `npx vitest run --reporter=verbose` (`78 passed`) |
| `audit/test-results/r2-python-oracle.log` | Salida JSON de `python audit/oracle_r2.py` (`ALL_ASSERTIONS_PASSED`) |
| `audit/test-results/r2-postgres-rls-trigger.json` | Resultado de la prueba transaccional (`BEGIN ... ROLLBACK`) en PostgreSQL 17.6 bajo `ROLE authenticated (NOBYPASSRLS)` |
| `supabase/migrations/20261013_harden_trades_rls.sql` | Migración de endurecimiento RLS para `public.trades` |
| `supabase/migrations/20261013_harden_trades_rls.rollback.sql` | Reversión de la migración RLS |
| `supabase/migrations/20261016_r2_trades_constraints.sql` | Migración de trigger PostgreSQL (`enforce_trades_ledger_invariants`) contra sobre-cierre y datos corruptos |
| `supabase/migrations/20261016_r2_trades_constraints.rollback.sql` | Reversión inmediata del trigger `enforce_trades_ledger_invariants` |

---

## 4. Exclusiones del Paquete Revisable (`.zip`)

El archivo comprimido de revisión excluye estrictamente:
- Cualquier archivo de secretos o variables de entorno (`.env`, `.env.local`, `.env.*`).
- Dependencias instaladas (`node_modules/`).
- Cachés de compilación y artefactos efímeros (`.next/`, `out/`, `.vercel/`, `.git/`).

El hash criptográfico SHA-256 del paquete `.zip` se entrega en un archivo externo hermano `.sha256` para evitar autorreferencia circular.

---

## 5. Plan Concreto de Reversión (Rollback)

1. **Reversión de código en Git:**
   ```powershell
   git checkout 580e0bd4561e98ce78a836a5711940b7de70dc8b
   # O para revertir únicamente la Ronda 2 conservando Ronda 1:
   git revert 70c3e7507095f4a24a6e047e85384c2d18aea0ca
   ```
2. **Reversión de migraciones SQL (si se hubiesen aplicado en un entorno de staging):**
   - Ejecutar `supabase/migrations/20261016_r2_trades_constraints.rollback.sql`
   - Ejecutar `supabase/migrations/20261013_harden_trades_rls.rollback.sql`
