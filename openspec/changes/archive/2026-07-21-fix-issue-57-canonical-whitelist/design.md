# Design: Fix Issue #57 — Remove CANONICAL whitelist from 8 catalog use cases

## Current State Problem

Each of the 8 catalog use cases declares a `CANONICAL_*_IDS: ReadonlySet<string>` and a `if (!CANONICAL_*_IDS.has(row.id)) return NO_DISPONIBLE` check inside the decoder loop. The check returns `NO_DISPONIBLE` on the first non-canonical id, so one unknown id collapses the entire catalog to `tipo: "no_disponible"`. E2E mode is already broken: `e2e-animals-fixture.server.ts` uses IDs like `potrero-norte` and `lc-feria` that are NOT in any whitelist. The DB is authoritative — adapters filter `WHERE activo = 1` and FK constraints prevent orphans. The whitelist adds zero safety and breaks the system.

## Reference Pattern: `listarCatalogoSexo`

`packages/aplicacion/src/casos-uso/listar-catalogo-sexo.ts` validates `value` structurally (`"0" | "1" | "2"`) and trusts the DB for which `id` values exist. No id whitelist. No `no_disponible` return for unknown ids. We align the 8 use cases to this pattern.

## Target State — Per-File Diff

All removals are inside `packages/aplicacion/src/casos-uso/`. The JSDoc above each constant (which says "The strict decoder rejects any ID not in this set") must be deleted with the constant — leaving the doc would be a lie. In finca-scoped files, also delete the JSDoc line containing the PR-4 note (it references columns that have no bearing on the id check).

| File | Remove lines | Keep |
|------|--------------|------|
| `listar-catalogo-raza.ts` | 11-14 (JSDoc), 15-27 (CANONICAL_RAZA_IDS), 41 (check) | null guard L40, duplicate L42-43, empty L36, try/catch L34-50, sort L46, NO_DISPONIBLE L29, interface L6-9 |
| `listar-catalogo-color.ts` | 11-14 (JSDoc), 15-24 (CANONICAL_COLOR_IDS), 38 (check) | null guard L37, duplicate L39-40, empty L33, try/catch L31-47, sort L43, NO_DISPONIBLE L26, interface L6-9 |
| `listar-catalogo-calidad.ts` | 11-14 (JSDoc), 15-20 (CANONICAL_CALIDAD_IDS), 34 (check) | null guard L33, duplicate L35-36, empty L29, try/catch L27-43, sort L39, NO_DISPONIBLE L22, interface L6-9 |
| `listar-potreros-por-finca.ts` | 8-12 (JSDoc), 13-20 (CANONICAL_POTRERO_IDS), 37 (check) | fincaId L29, null guard L36, duplicate L38-39, empty L32, try/catch L28-46, sort L42, NO_DISPONIBLE L22, interface L3-6 |
| `listar-sectores-por-finca.ts` | 8-12 (JSDoc), 13-19 (CANONICAL_SECTOR_IDS), 36 (check) | fincaId L28, null guard L35, duplicate L37-38, empty L31, try/catch L27-45, sort L41, NO_DISPONIBLE L21, interface L3-6 |
| `listar-lotes-por-finca.ts` | 8-14 (JSDoc+PR-4), 15-20 (CANONICAL_LOTE_IDS), 37 (check) | fincaId L29, null guard L36, duplicate L38-39, empty L32, try/catch L28-46, sort L42, NO_DISPONIBLE L22, interface L3-6 |
| `listar-grupos-por-finca.ts` | 8-14 (JSDoc+PR-4), 15 (CANONICAL_GRUPO_IDS), 32 (check) | fincaId L24, null guard L31, duplicate L33-34, empty L27, try/catch L23-41, sort L37, NO_DISPONIBLE L17, interface L3-6 |
| `listar-lugares-compra-por-finca.ts` | 8-15 (JSDoc+PR-4), 16 (CANONICAL_LUGAR_COMPRA_IDS), 33 (check) | fincaId L25, null guard L32, duplicate L34-35, empty L28, try/catch L24-42, sort L38, NO_DISPONIBLE L18, interface L3-6 |

**Resulting decoder body** (identical for all 8):

```ts
for (const row of rows) {
  if (!row.id || typeof row.id !== "string") return NO_DISPONIBLE
  if (seen.has(row.id)) return NO_DISPONIBLE
  seen.add(row.id)
}
```

## Test Migration

Each test file in `packages/aplicacion/tests/` contains an `it("returns {tipo: no_disponible} when a row has an unknown/noncanonical id", ...)` block that asserts the bug. Delete that block. All other tests (null id, duplicate, empty list, sort, fincaId guard) remain valid and pass unchanged.

| Test File | Remove block | Optional new positive test |
|-----------|--------------|----------------------------|
| `catalogo-raza.test.ts` | Lines 35-39 | asserts `{tipo:"disponible", options:[…]}` for `id:"raza-desconocida-xyz"` |
| `catalogo-color.test.ts` | Lines 36-40 | same for `id:"col-desconocido-xyz"` |
| `catalogo-calidad.test.ts` | Lines 34-40 | same for `id:"cal-desconocido-xyz"` |
| `catalogo-finca-potrero.test.ts` | Lines 40-47 | same for `id:"pot-desconocido-xyz"` |
| `catalogo-finca-sector.test.ts` | Lines 38-45 | same for `id:"sec-desconocido-xyz"` |
| `catalogo-finca-lote.test.ts` | Lines 36-43 | same for `id:"lote-desconocido-xyz"` |
| `catalogo-finca-grupo.test.ts` | Lines 36-43 | same for `id:"grupo-desconocido-xyz"` |
| `catalogo-finca-lugar-compra.test.ts` | Lines 46-53 | same for `id:"lc-desconocido-xyz"` |

The new positive test, where added, proves the fix: a DB row with an arbitrary id is accepted and surfaces in `options[]` — the "DB is the source of truth" invariant in executable form.

## Decision Record

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Remove whitelist entirely vs. relax to a wider set | Remove | DB is authoritative; FK constraints prevent orphans; relaxing still couples code to data. |
| Keep `{tipo, options}` return shape | Yes | `mapUcSettled` / `mapColorSettled` in `animal-actions.server.ts` consume this contract; changing it cascades. |
| Keep `null/undefined` id guard | Yes | Defends against malformed adapter output; cheap. |
| Keep `seen` duplicate check | Yes | Catches data corruption; trivial. |
| Keep `empty rows` guard | Yes | Distinguishes "no data" from "data loaded"; same shape as `no_disponible`. |
| Add a new "unknown id accepted" test | Optional but recommended | Asserts the fix's invariant; protects against future reintroduction of the whitelist. |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary touched.

## Files Changed

| File | Action |
|------|--------|
| `packages/aplicacion/src/casos-uso/listar-catalogo-raza.ts` | Modify — drop CANONICAL block + check line |
| `packages/aplicacion/src/casos-uso/listar-catalogo-color.ts` | Modify — drop CANONICAL block + check line |
| `packages/aplicacion/src/casos-uso/listar-catalogo-calidad.ts` | Modify — drop CANONICAL block + check line |
| `packages/aplicacion/src/casos-uso/listar-potreros-por-finca.ts` | Modify — drop CANONICAL block + check line |
| `packages/aplicacion/src/casos-uso/listar-sectores-por-finca.ts` | Modify — drop CANONICAL block + check line |
| `packages/aplicacion/src/casos-uso/listar-lotes-por-finca.ts` | Modify — drop CANONICAL block + check line |
| `packages/aplicacion/src/casos-uso/listar-grupos-por-finca.ts` | Modify — drop CANONICAL block + check line |
| `packages/aplicacion/src/casos-uso/listar-lugares-compra-por-finca.ts` | Modify — drop CANONICAL block + check line |
| `packages/aplicacion/tests/catalogo-raza.test.ts` | Modify — delete "noncanonical id" test (optionally add positive test) |
| `packages/aplicacion/tests/catalogo-color.test.ts` | Modify — same |
| `packages/aplicacion/tests/catalogo-calidad.test.ts` | Modify — same |
| `packages/aplicacion/tests/catalogo-finca-potrero.test.ts` | Modify — same |
| `packages/aplicacion/tests/catalogo-finca-sector.test.ts` | Modify — same |
| `packages/aplicacion/tests/catalogo-finca-lote.test.ts` | Modify — same |
| `packages/aplicacion/tests/catalogo-finca-grupo.test.ts` | Modify — same |
| `packages/aplicacion/tests/catalogo-finca-lugar-compra.test.ts` | Modify — same |

16 files total. Zero new files. Zero changes in `packages/db/`, `apps/web/src/`, schema, or adapters.

## Migration / Rollout

No migration required. No feature flag. No data backfill. Git revert restores the previous (buggy) state per use case.

## Open Questions

None. Decision is unambiguous: remove the whitelist, keep the structural checks.
