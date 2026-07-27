# Tasks: Animal List Reliability (Issue #113)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~220 (production ~50, tests ~170) |
| 400-line budget risk | Low |
| 800-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | single-pr-default |
| Chain strategy | size-exception (not required — well under budget) |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

## Phase 1: Cycle 1 — `isIsoDate` strictness (UNIT)

- [x] 1.1 RED — Add `testIsIsoDateStrictness` in `apps/web/tests/animal-list-server-contract.test.ts`: assert impossible dates rejected (`2026-02-31`, `2026-04-31`, non-leap `2026-02-29`, `2026-13-01`); leap `2024-02-29` accepted.
- [x] 1.2 RED — Add parser test: `f.fechaNacimiento=drange:2026-02-31,2026-03-15` returns `{ok:false, error:{campo:"f.fechaNacimiento", motivo:"Valor de filtro no permitido"}}`.
- [x] 1.3 GREEN — Replace `isIsoDate` body in `apps/web/src/server/animal-list-contract.ts` (line 327) with regex + UTC round-trip check (`getUTCFullYear/Month/Date`).
- [x] 1.4 Run `pnpm turbo test --filter @ganaweb/web`; confirm 1.1+1.2 GREEN, no regressions.

## Phase 2: Cycle 2 — epoch→ISO read mapping (INTEGRATION)

- [x] 2.1 RED — Extend `packages/db/tests/animal-listado-postgres.test.ts` `beforeAll`: set `fecha_nacimiento` on `animal-1` (1577836800=2020-01-01), `animal-2` (1615507200=2021-03-12), `animal-3` (1735689600=2025-01-01); update `afterAll` only if cleanup needs widening.
- [x] 2.2 RED — Add `it("maps epoch columns to ISO fechaNacimiento and edadAnios")`: assert response row has `fechaNacimiento: "2020-01-01"` and `edadAnios` matches year delta.
- [x] 2.3 GREEN — Add file-private `epochToIsoDate(epoch)` in `packages/db/src/animal-infrastructure.ts` next to `nullableString` (line 687). Wire into `mapAnimalListadoDbRow` for `fecha_nacimiento` (line 722) and `fecha_compra` (line 755).
- [x] 2.4 Run `pnpm turbo test --filter @ganaweb/db`; confirm 2.2 GREEN.

## Phase 3: Cycles 3+4 — bool 0/1 + drange epoch (INTEGRATION, parallel after Phase 2)

- [x] 3.1 RED — In `animal-listado-postgres.test.ts` `beforeAll`: insert `${fixture}-animal-bool` with `es_de_monta=1`. Add `it("bool filter on esDeMonta returns matching rows")` asserting no 500 and matching row returned.
- [x] 3.2 RED — Add `it("drange filter on fechaNacimiento returns matching rows")`: filter `drange:2021-03-12,2021-03-20` returns `animal-2` only, excludes `animal-1` and `animal-3`.
- [x] 3.3 GREEN — In `animal-infrastructure.ts` `buildAnimalListadoPredicates` (lines 796-800): coerce `bool`→`1`/`0`; add `isoToEpochStart(iso)` helper; in `drange` branch, convert bounds for `fechaNacimiento`/`fechaCompra` keys via `isoToEpochStart` (mirror reverse of `epochToIsoDate`).
- [x] 3.4 Run `pnpm turbo test --filter @ganaweb/db`; confirm 3.1+3.2 GREEN.

## Phase 4: Cycle 5 — full regression (VERIFY)

- [x] 4.1 Run `pnpm turbo test` from repo root: all unit + integration pass.
- [x] 4.2 Run `pnpm turbo typecheck` and `pnpm turbo lint`; no type or lint regressions.
- [x] 4.3 Mark tasks complete; ready for `sdd-verify`.

## Dependency Graph

- Phase 1 (Cycle 1) is independent.
- Phase 2 (Cycle 2) must complete before Phase 3 (Cycle 4's integration test asserts ISO strings in response).
- Phase 3 cycles 3 + 4 are independent of each other.
- Phase 4 (Cycle 5) depends on all prior phases.
