```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:026460cff95e98ee2144813d022d3af129f7032b6c3de0d8c01dc25865c603f5
verdict: pass
blockers: 0
critical_findings: 0
requirements: 5/5
scenarios: 11/11
test_command: pnpm turbo test --force
test_exit_code: 0
test_output_hash: sha256:240eb12e51262c852691629f053a2108d8a0022314404d39f1f2198bbef9999b
build_command: pnpm turbo typecheck --force
build_exit_code: 0
build_output_hash: sha256:4aeda40de43817a356b132445e2a22a94d482297f30a7a5a57638225b755c040
```

## Verification Report

**Change**: issue-210-almacen-entradas (Issue #210 — Sanidad: almacén, entradas de stock append-only)
**Version**: RF-SANIDAD v0.2 (`requisito_sanidad.md`, worktree `feature-005-sanidad`)
**Mode**: Strict TDD (`strict_tdd: true`, runner vitest) — verificación estándar con evidencia runtime

Artefactos del cambio: solo `tasks.md` + `apply-progress.md` (sin proposal/specs/design propios). Especificación autoritativa: `requisito_sanidad.md` §2/§7/§11/§13.14 + Issue #210. Coherencia evaluada contra las decisiones documentadas en `apply-progress.md` (dimensión degradada por ausencia de design.md).

Worktree: `/home/lrodriguezn/ganaweb-worktrees/issue-210-sanidad-almacen` · rama `feat/issue-210-sanidad-almacen` · HEAD `0cfa4a1` (ahead 7 / behind 1 vs `origin/master`).

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 17 (Units 1–5 + 6.1) |
| Tasks complete | 17 |
| Tasks incomplete | 0 |

### Build & Tests Execution
**Build (typecheck)**: ✅ Passed
```text
pnpm turbo typecheck --force → Tasks: 13 successful, 13 total · exit 0
build_output_hash: sha256:4aeda40de43817a356b132445e2a22a94d482297f30a7a5a57638225b755c040
```

**Tests**: ✅ All passed
```text
pnpm turbo test --force → Tasks: 13 successful, 13 total · exit 0
  dominio 51 (sanidad) · aplicacion 136 · db 163 pass + 40 skipped (sin smoke) · ui 592 · web 401
test_output_hash: sha256:240eb12e51262c852691629f053a2108d8a0022314404d39f1f2198bbef9999b

DB_SMOKE=true pnpm --filter @ganaweb/db test:smoke (Postgres 17 real) →
  Test Files 24 passed | 1 skipped · Tests 202 passed | 1 skipped · exit 0
  sanidad-postgres.test.ts 12/12 (incluye atomicidad T-002 contra PG real)

pnpm exec tsx tests/sanidad-almacen-contract.test.ts (apps/web) → "sanidad-almacen-contract: OK" · exit 0
pnpm exec biome ci . → Checked 389 files · 0 errors · 0 warnings · exit 0
pnpm exec dependency-cruiser . → 0 errors, 251 warnings (4 nuevas, patrón preexistente) · exit 0
```

**Coverage**: ➖ Not available (`coverage.available: false` en `openspec/config.yaml`)

### Spec Compliance Matrix
| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| SAN-030 | Captura válida con precio/comentario aceptada | `packages/dominio/tests/sanidad.test.ts > SAN-030: acepta una captura válida` | ✅ COMPLIANT |
| SAN-030 | Dosis ≤ 0 / no entera rechazada | `sanidad.test.ts > SAN-030: rechaza dosis ≤ 0, no entera o no numérica` + `sanidad-use-cases.test.ts > SAN-030: rechaza dosis ≤ 0` + contract tsx | ✅ COMPLIANT |
| SAN-030 | Producto ausente rechazado; precio/comentario opcionales | `sanidad.test.ts > SAN-030: rechaza el producto ausente` / `opcionales` | ✅ COMPLIANT |
| RN-002 | Fecha futura rechazada (hoy aceptada) | `sanidad.test.ts > RN-002: rechaza una fecha futura` + `acepta la fecha igual a hoy` + aplicacion + contract (`detalle` cita RN-002) | ✅ COMPLIANT |
| SAN-030/T-002 | Entrada + fila sync_outbox en la MISMA transacción | `packages/db/tests/sanidad-postgres.test.ts > T-002/SAN-030: …misma transacción` (PG real, 12/12) | ✅ COMPLIANT |
| T-002 | FK inexistente → conflicto sin escribir entrada ni outbox | `sanidad-postgres.test.ts > T-002: FK inexistente → conflicto, sin escribir entrada ni outbox` (PG real) | ✅ COMPLIANT |
| SAN-031/RN-041 | Tras una entrada, stock de la vista inventario_sanitario coincide | `sanidad-postgres.test.ts > RN-041/SAN-031: …el stock de inventario_sanitario coincide` (80→100, PG real) + aplicacion caso feliz | ✅ COMPLIANT |
| SAN-031 | Stock negativo = alerta de reconciliación, no error | `sanidad-use-cases.test.ts > SAN-031: stock negativo… alerta sin bloquear` + `listado-entradas-almacen.test.tsx > alerta sin ocultar listado` | ✅ COMPLIANT |
| SAN-032/D-008 | Append-only: sin edición ni anulación; nota de contexto | inspección (solo insert/select sobre `almacen_entradas` en producción) + `formulario-entrada-almacen.test.tsx > nota append-only (D-008)` | ✅ COMPLIANT |
| PE-002/SAN-061 | Sin permiso sanidad:crear → permiso_denegado sin tocar puertos (invocación directa incluida) | `sanidad-use-cases.test.ts > SAN-061/PE-002` + `sanidad-almacen-contract.test.ts` (sin sesión/finca/permiso) | ✅ COMPLIANT |
| SAN-063/PE-006 | Scope por finca revalidado (join productos_sanitarios); usuario_creado_por en el insert | `sanidad-use-cases.test.ts > SAN-063: producto de otra finca` + `sanidad-postgres.test.ts > SAN-063/SAN-014: listarEntradasAlmacen acota por finca` + contract (finca_no_autorizada, usuarioCreadoPor) | ✅ COMPLIANT |

**Compliance summary**: 11/11 scenarios compliant · 5/5 requirements (SAN-030, SAN-031, SAN-032, SAN-061, SAN-063)

**Trazabilidad §13 criterio 14** (append-only + outbox misma transacción + fecha futura/dosis ≤ 0 rechazadas): CUBIERTO de punta a punta con tests runtime, incluida la atomicidad contra Postgres real (`sanidad-infrastructure.ts` L363–400: único `db.transaction` con ambos inserts).

### Correctness (Static Evidence)
| Requirement | Status | Notes |
|------------|--------|-------|
| SAN-030 validarEntradaAlmacen | ✅ Implemented | `packages/dominio/src/sanidad.ts`; reutiliza `validarFechaEventoSanidad`; errores `{campo, detalle}` |
| Caso de uso registrarEntradaAlmacen | ✅ Implemented | unión serializable registrada\|validacion\|permiso_denegado\|conflicto\|error; reloj inyectado |
| Adaptador DB transaccional | ✅ Implemented | insert entrada + syncOutbox en un solo `db.transaction`; FK 23503 → conflicto |
| Server functions PE-002 | ✅ Implemented | `sanidad-almacen.server.ts`: sesión de `auth.ts`, finca revalidada, unión 1:1 |
| UI SAN-014/SAN-031/D-008 | ✅ Implemented | componentes presentacionales en `packages/ui`; errores por props |
| Guardas de scope | ✅ Verified | sin rutas tocadas; sin archivos #209 (solo adiciones a puertos/exports); `packages/sync` intacto; append-only real |

### Coherence (Design)
| Decision (apply-progress.md) | Followed? | Notes |
|----------|-----------|-------|
| Errores UI por props, sin dep ui→aplicacion | ✅ Yes | patrón `fieldErrors` de animal-crud; dependency-cruiser confirma |
| Outbox payload camelCase | ✅ Yes | consistente con `outboxBase` de animales; `dispositivoId: "server"` como `animal-infrastructure.ts:1217` |
| Listado fecha DESC, created_at DESC | ✅ Yes | orden fijado por test db; el requisito no prescribe orden |
| sanidad:ver gateado en harness web | ✅ Yes | PE-002 cumplido en servidor; contract test cubre denegación; sin wildcard |

### Issues Found
**CRITICAL**: None
**WARNING**:
- W-1: El issue lista "Tab Almacén (desktop y mobile)" como tarea frontend; este cambio entrega los componentes reutilizables y el montaje del tab queda diferido a #212/#213 (ruta `/fincas/$fincaId/sanidad` aún inexistente). Desviación literal del cuerpo del issue, documentada en `tasks.md` (Restricciones transversales); no rompe §13.14 ni los criterios del issue.

**SUGGESTION**:
- S-1: dependency-cruiser suma 4 warnings nuevos (contract→server; server→session-cookie/auth-deps por import dinámico); exit 0, mismo patrón que `animal-actions.server.ts` en master. Considerar regla allowed para no crecer el ruido.
- S-2: el formulario envía `dosis: Number("")` = 0 con el campo vacío; dominio lo rechaza correctamente, pero deshabilitar el submit con dosis vacía ahorraría un round-trip.
- S-3: rama `behind 1` vs `origin/master`; rebasear antes del PR.

### Verdict
PASS WITH WARNINGS
Las 17 tareas completas; §13.14 cubierto con evidencia runtime contra Postgres real (atomicidad T-002 incluida); suites completas en verde; scope respetado. Único warning: montaje del tab diferido a #212/#213 (documentado).
