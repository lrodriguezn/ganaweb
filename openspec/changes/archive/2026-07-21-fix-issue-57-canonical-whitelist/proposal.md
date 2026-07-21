# Proposal: Fix Issue #57 — Remove CANONICAL_*_IDS whitelist from 8 catalog use cases

## Intent

Eight catalog use cases in `packages/aplicacion/src/casos-uso/` hardcode `CANONICAL_*_IDS` whitelists and return `{ tipo: "no_disponible", options: [] }` when ANY row has an unknown ID, collapsing the whole catalog. E2E mode is broken (`e2e-animals-fixture.server.ts` uses IDs like `potrero-norte` not in any whitelist). Fix aligns the 8 use cases with the proven `listarCatalogoSexo` pattern: trust the DB, validate structure only.

## Scope

### In Scope
- Drop `CANONICAL_*_IDS` constant + `if (!CANONICAL_*_IDS.has(row.id)) return NO_DISPONIBLE` line from 8 use case files.
- Remove the "non-canonical id → no_disponible" test from 8 test files.
- Keep structural validations: null/duplicate/empty, `fincaId`, `try/catch`, es-CO sort.

### Out of Scope
- Return shape `{ tipo, options }` and consumer code (`mapUcSettled`, UI) — unchanged.
- DB adapters, schema, FK constraints, E2E fixture content, new validations.

## Capabilities

### New Capabilities
- `catalog-queries`: contract for the 8 catalog use cases (raza, color, calidad, potrero, sector, lote, grupo, lugar-compra). Rule: DB is the source of truth, only structural validation, hardcoded ID whitelists are forbidden.

### Modified Capabilities
None.

## Approach

Surgical removal per file: delete the `CANONICAL_*_IDS` `ReadonlySet` and the single check line. Other validations stay. Remove the matching "non-canonical id" test assertion (it asserted the bug). All other tests remain valid.

## Affected Areas

| Area | Impact | Notes |
|------|--------|-------|
| `packages/aplicacion/src/casos-uso/listar-catalogo-{raza,color,calidad}.ts` | Modified | Drop constant + check |
| `packages/aplicacion/src/casos-uso/listar-{potreros,sectores,lotes,grupos,lugares-compra}-por-finca.ts` | Modified | Drop constant + check |
| `packages/aplicacion/tests/catalogo-*.test.ts` (8 files) | Modified | Remove "non-canonical id" test |
| `openspec/specs/catalog-queries/spec.md` | New | Capability spec for the 8 use cases |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Stale DB rows surface unexpected values | Very Low | FK constraints + adapter `activo=1` filter |
| 8 unit tests fail after the fix | Certain | Test updates are in scope; those tests asserted the bug |
| Downstream consumer breaks | Very Low | `mapUcSettled` reads `options[].id` and `options[].nombre` only |

## Rollback Plan

Git revert. Each use case is self-contained — restoring the `CANONICAL_*_IDS` block restores the previous (buggy) behavior. No data/schema/infra impact.

## Dependencies

None.

## Success Criteria

- [ ] `CANONICAL_*_IDS` removed from all 8 use case files; no remaining repo references.
- [ ] All 8 use case files compile; remaining unit tests pass.
- [ ] 8 test files no longer assert "unknown ID → no_disponible".
- [ ] E2E mode runs without catalog collapse from non-canonical IDs.
- [ ] Return shape `{ tipo, options }` unchanged; new `openspec/specs/catalog-queries/spec.md` documents the "DB is source of truth" rule.
