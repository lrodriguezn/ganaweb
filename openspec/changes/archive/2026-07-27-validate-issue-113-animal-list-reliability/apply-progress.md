# Apply Progress: Animal List Reliability (Issue #113)

## Status: ALL TASKS COMPLETE (15/15)

## Implementation Summary

### Phase 1 — Cycle 1: `isIsoDate` strictness (UNIT)
- [x] 1.1 RED — Added `testIsIsoDateStrictness` with 7 impossible dates + leap year + valid drange + bool invalid
- [x] 1.2 RED — Parser test for `drange:2026-02-31,...` returning `{ok:false}`
- [x] 1.3 GREEN — Replaced `isIsoDate` with regex + UTC round-trip (`getUTCFullYear/Month/Date`)
- [x] 1.4 Confirmed GREEN, no regressions

### Phase 2 — Cycle 2: epoch→ISO read mapping (INTEGRATION)
- [x] 2.1 RED — Seeded `fecha_nacimiento` epoch values: animal-1=1577836800, animal-2=1615507200, animal-3=1735689600
- [x] 2.2 RED — Added integration test for epoch→ISO mapping + null epoch handling + edadAnios computation
- [x] 2.3 GREEN — Added `epochToIsoDate()` helper; wired into `mapAnimalListadoDbRow` for `fecha_nacimiento` and `fecha_compra`
- [x] 2.4 Confirmed GREEN, no regressions (22/22 tests pass)

### Phase 3 — Cycles 3+4: bool filter + drange filter (INTEGRATION)
- [x] 3.1 RED — Inserted `animal-bool` with `es_de_monta=1`; added bool filter test (confirmed RED: `operator does not exist: integer = boolean`)
- [x] 3.2 RED — Added drange filter test (confirmed RED: `invalid input syntax for type integer: "2021-03-12"`)
- [x] 3.3 GREEN — Coerced `bool`→`1`/`0`; added `isoToEpochStart()` + `isEpochDateColumn()`; wired into `drange` branch
- [x] 3.4 Confirmed GREEN, no regressions (24/24 tests pass)

### Phase 4 — Cycle 5: Full regression (VERIFY)
- [x] 4.1 `pnpm turbo test` — 13/13 tasks successful, all tests pass
- [x] 4.2 `pnpm turbo typecheck` — 13/13 tasks successful, no type regressions
- [x] 4.2 `pnpm turbo lint` — Pre-existing lint failures in auto-generated `routeTree.gen.ts` (not caused by this change). All modified files pass biome check.
- [x] 4.3 Tasks marked complete

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `apps/web/src/server/animal-list-contract.ts` | Modified | `isIsoDate`: replaced `Date.parse` with UTC round-trip check (regex + `getUTCFullYear/Month/Date`) |
| `apps/web/tests/animal-list-server-contract.test.ts` | Modified | Added `testIsIsoDateStrictness`: 7 impossible dates, leap year acceptance, valid drange, bool invalid values |
| `packages/db/src/animal-infrastructure.ts` | Modified | Added `epochToIsoDate()`, `isoToEpochStart()`, `isEpochDateColumn()`; wired epoch conversion into row mapper; coerced bool→1/0; converted drange bounds to epoch for date columns |
| `packages/db/tests/animal-listado-postgres.test.ts` | Modified | Seeded epoch dates; added `animal-bool` fixture; added 3 integration tests (epoch→ISO, bool filter, drange filter); updated count expectations for new fixture |

## Test Summary
- **Total tests written**: 10 new test cases (7 isIsoDate unit + 3 integration)
- **Total tests passing**: 24 postgres + 1 contract script (all pass)
- **Layers used**: Unit (web contract), Integration (postgres)
- **Pre-existing failures**: 0 (baseline 21 postgres + contract all passing before changes)
- **New regressions**: 0

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | `apps/web/tests/animal-list-server-contract.test.ts` | Unit | ✅ All pass | ✅ Written | ✅ Passed | ✅ 7 impossible dates + leap + valid | ✅ Clean |
| 1.2 | `apps/web/tests/animal-list-server-contract.test.ts` | Unit | ✅ All pass | ✅ Written | ✅ Passed | ✅ Valid drange accepted | ✅ Clean |
| 1.3 | `apps/web/src/server/animal-list-contract.ts` | N/A | ✅ All pass | N/A | ✅ isIsoDate rewritten | ➖ Single | ✅ Format fix |
| 1.4 | Full web test suite | Unit | ✅ Baseline | N/A | ✅ No regressions | ➖ Regression only | ➖ None |
| 2.1 | `packages/db/tests/animal-listado-postgres.test.ts` | Integration | ✅ 21/21 pass | ✅ Seeded | N/A (data setup) | ➖ Data only | ➖ None |
| 2.2 | `packages/db/tests/animal-listado-postgres.test.ts` | Integration | ✅ 21/21 pass | ✅ Written | ✅ Passed | ✅ 3 epochs + null + edadAnios | ➖ None needed |
| 2.3 | `packages/db/src/animal-infrastructure.ts` | N/A | ✅ 21/21 pass | N/A | ✅ epochToIsoDate wired | ➖ Single | ➖ None needed |
| 2.4 | Full db test suite | Integration | ✅ 21/21 | N/A | ✅ 22/22 pass | ➖ Regression only | ➖ None |
| 3.1 | `packages/db/tests/animal-listado-postgres.test.ts` | Integration | ✅ 22/22 pass | ✅ Written | ✅ Passed | ➖ Single scenario | ➖ None needed |
| 3.2 | `packages/db/tests/animal-listado-postgres.test.ts` | Integration | ✅ 22/22 pass | ✅ Written | ✅ Passed | ✅ Includes/Excludes assertions | ➖ None needed |
| 3.3 | `packages/db/src/animal-infrastructure.ts` | N/A | ✅ 22/22 pass | N/A | ✅ bool→1/0 + isoToEpochStart | ➖ Single | ✅ Complexity warning (non-blocking) |
| 3.4 | Full db test suite | Integration | ✅ 22/22 | N/A | ✅ 24/24 pass | ➖ Regression only | ➖ None |
| 4.1 | `pnpm turbo test` | Full | ✅ Baseline | N/A | ✅ 13/13 tasks | ➖ Regression only | ➖ None |
| 4.2 | `pnpm turbo typecheck + lint` | Full | ✅ Baseline | N/A | ✅ No regressions | ➖ N/A | ✅ Pre-existing routeTree.gen.ts |
| 4.3 | tasks.md | N/A | N/A | N/A | ✅ Marked [x] | ➖ N/A | ➖ None |

## Workload / PR Boundary
- Mode: single PR (well under 400-line budget, ~220 lines)
- Current work unit: All (single batch)
- Boundary: From main to feature/issue-107-server-contract
- Estimated review budget: ~220 changed lines (production ~50, tests ~170)

## Lint Note
`@ganaweb/web#lint` failure is pre-existing (auto-generated `routeTree.gen.ts`). All files modified by this change pass `biome check` cleanly. The `buildAnimalListadoPredicates` complexity warning (21, max 15) is non-blocking (biome exits 0 for warnings).
