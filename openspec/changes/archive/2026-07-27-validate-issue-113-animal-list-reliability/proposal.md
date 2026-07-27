# Proposal: Animal List Reliability (Issue #113)

## Intent

Fix three confirmed defects in the server-side animal list endpoint that convert 400s into 500s or silently strip response data. The endpoint has **zero test coverage** for these paths. Impact:
- `fechaNacimiento` filter with impossible dates (Feb 31, non-leap Feb 29) crashes instead of 400.
- `esDeMonta=true|false` filter crashes with `operator does not exist: integer = boolean`.
- `fechaNacimiento`, `fechaCompra`, and `edadAnios` are always `null` (epoch seconds hit a string-type check).

## Scope

### In Scope
- Strict `isIsoDate` (rejects Feb 31, Apr 31, non-leap Feb 29, month 13).
- Epoch-to-ISO conversion for `fechaNacimiento` / `fechaCompra` in `mapAnimalListadoDbRow`.
- 0/1 coercion for `bool` filter against integer `es_de_monta`.
- `drange` filter converted to epoch seconds at the predicate layer.
- Unit + integration tests for all three risks.

### Out of Scope
- Changing `es_de_monta` column type, UI filter behavior, or other bool filters.
- Extracting `epochToIsoDate` to a shared utility.

## Capabilities

### New Capabilities
- `animal-listado-server-contract`: filter grammar validation and read-row mapping (epoch-to-ISO for date columns) for the server-side animal list endpoint.

### Modified Capabilities
None.

## Approach

**Test-first TDD** per `rules.apply.tdd: true`:

1. Add failing unit + integration tests; confirm RED.
2. Apply fixes: `isIsoDate` strictness → `epochToIsoDate` → `bool` 0/1 → `drange` epoch.
3. Confirm GREEN; no regressions in `pnpm turbo test`.

The `drange` test needs `epochToIsoDate` first (so the read mapping emits the expected ISO string). Both fixes ship together.

## Alternatives Considered

Static-inspection-only fix: rejected. One risk only manifests when two fixes land together. TDD prevents silent regression.

## Affected Areas

- `apps/web/src/server/animal-list-contract.ts` — strict `isIsoDate`; new `epochToIsoDate` helper.
- `packages/db/src/animal-infrastructure.ts` — read mapping uses `epochToIsoDate`; predicates coerce `bool`→0/1 and `drange`→epoch.
- `apps/web/tests/animal-list-server-contract.test.ts` — unit tests for the three risks.
- `packages/db/tests/animal-listado-postgres.test.ts` — date-bearing animals; `drange` / `bool` filter scenarios.

## Risks

- **Epoch off-by-1000 (ms vs s).** Unit test asserts `1615507200` → `"2021-03-12"`.
- **`bool`→0/1 breaks existing boolean columns.** PG accepts `boolean_col = 1`; integration covers all.
- **Existing filters regress.** Full `pnpm turbo test` must pass; existing 400/403/500 tests guard.

## Rollback Plan

Revert the single PR. No DB migrations, no schema changes, no API contract changes — only stricter validation and corrected output.

## Dependencies

None. Self-contained in contract + infrastructure layers. Uses the PostgreSQL test container already required by existing tests.

## Success Criteria

- [ ] `isIsoDate("2026-02-31")` returns `false`; valid dates still return `true`.
- [ ] Impossible-date `drange` returns 400 (not 500).
- [ ] `bool` filter on `esDeMonta` returns matching rows, no crash.
- [ ] Response includes correct ISO `fechaNacimiento`, `fechaCompra`, `edadAnios`.
- [ ] `pnpm turbo test` passes; new tests fail on `main` before the fix.
