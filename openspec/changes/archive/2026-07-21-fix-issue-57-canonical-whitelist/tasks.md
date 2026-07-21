# Tasks: Fix Issue #57 — Remove CANONICAL_*_IDS whitelist

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~64 (16 files × ~4 lines removed) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr-default |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Phase 1: Maestro Catalogs — Drop `CANONICAL_*_IDS` (global, no `fincaId`)

- [x] 1.1 `packages/aplicacion/src/casos-uso/listar-catalogo-raza.ts` — remove JSDoc L11-14, `CANONICAL_RAZA_IDS` L15-27, check L41. Keep null guard, duplicate check, empty, try/catch, es-CO sort.
- [x] 1.2 `packages/aplicacion/src/casos-uso/listar-catalogo-color.ts` — remove JSDoc L11-14, `CANONICAL_COLOR_IDS` L15-24, check L38. Same keeps.
- [x] 1.3 `packages/aplicacion/src/casos-uso/listar-catalogo-calidad.ts` — remove JSDoc L11-14, `CANONICAL_CALIDAD_IDS` L15-20, check L34. Same keeps.

## Phase 2: Finca-Scoped Catalogs — Drop `CANONICAL_*_IDS` (with `fincaId` guard)

- [x] 2.1 `packages/aplicacion/src/casos-uso/listar-potreros-por-finca.ts` — remove JSDoc L8-12, `CANONICAL_POTRERO_IDS` L13-20, check L37. Keep `fincaId`, null/duplicate/empty, try/catch, sort.
- [x] 2.2 `packages/aplicacion/src/casos-uso/listar-sectores-por-finca.ts` — remove JSDoc L8-12, `CANONICAL_SECTOR_IDS` L13-19, check L36. Same keeps.
- [x] 2.3 `packages/aplicacion/src/casos-uso/listar-lotes-por-finca.ts` — remove JSDoc+PR-4 L8-14, `CANONICAL_LOTE_IDS` L15-20, check L37. Same keeps.
- [x] 2.4 `packages/aplicacion/src/casos-uso/listar-grupos-por-finca.ts` — remove JSDoc+PR-4 L8-14, `CANONICAL_GRUPO_IDS` L15, check L32. Same keeps.
- [x] 2.5 `packages/aplicacion/src/casos-uso/listar-lugares-compra-por-finca.ts` — remove JSDoc+PR-4 L8-15, `CANONICAL_LUGAR_COMPRA_IDS` L16, check L33. Same keeps.

## Phase 3: Test Migration — Maestro Catalogs (RED → GREEN)

- [x] 3.1 `packages/aplicacion/tests/catalogo-raza.test.ts` — delete old "non-canonical id → no_disponible" block; ADD positive test asserting `{tipo:"disponible", options:[…]}` for `id:"raza-desconocida-xyz"`.
- [x] 3.2 `packages/aplicacion/tests/catalogo-color.test.ts` — delete old block; ADD positive test for `id:"col-desconocido-xyz"`.
- [x] 3.3 `packages/aplicacion/tests/catalogo-calidad.test.ts` — delete old block; ADD positive test for `id:"cal-desconocida-xyz"`.

## Phase 4: Test Migration — Finca-Scoped Catalogs (RED → GREEN)

- [x] 4.1 `packages/aplicacion/tests/catalogo-finca-potrero.test.ts` — delete old block; ADD positive test for `id:"pot-desconocido-xyz"`.
- [x] 4.2 `packages/aplicacion/tests/catalogo-finca-sector.test.ts` — delete old block; ADD positive test for `id:"sec-desconocido-xyz"`.
- [x] 4.3 `packages/aplicacion/tests/catalogo-finca-lote.test.ts` — delete old block; ADD positive test for `id:"lote-desconocido-xyz"`.
- [x] 4.4 `packages/aplicacion/tests/catalogo-finca-grupo.test.ts` — delete old block; ADD positive test for `id:"grupo-desconocido-xyz"`.
- [x] 4.5 `packages/aplicacion/tests/catalogo-finca-lugar-compra.test.ts` — delete old block; ADD positive test for `id:"lc-desconocido-xyz"`.

## Phase 5: Verification

- [x] 5.1 `pnpm --filter @ganaweb/aplicacion test` — all 8 catalog test files pass; new positive tests assert `tipo:"disponible"`.
- [x] 5.2 `pnpm turbo test` — full suite green; no regressions in dominio/db/sync/ui.
- [x] 5.3 `rg -n "CANONICAL_[A-Z_]+_IDS" packages/` returns no matches — all 8 constants removed.

## Implementation Notes

- TDD discipline: positive tests (3.1–4.5) are added before/during the production removals (1.1–2.5) so the new contract is locked. Old negative tests are removed in the same step.
- Each use case decodes to the same body: `for (const row of rows) { if (!row.id || typeof row.id !== "string") return NO_DISPONIBLE; if (seen.has(row.id)) return NO_DISPONIBLE; seen.add(row.id) }`.
- No migration, no feature flag, no data backfill. Git revert per use case restores prior (buggy) state.
- Threat matrix: N/A — no routing, shell, subprocess, VCS/PR automation, or process-integration boundary touched.
