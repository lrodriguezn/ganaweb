# Apply Progress: Issue #107 Animal List Server Contract

**Mode:** Strict TDD
**Delivery:** Maintainer-approved `size:exception` on `feat/issue-107-server-contract`

## Completed Tasks

- [x] 1.1 Dedicated branch and work-unit delivery controls.
- [x] 1.2 Contract RED tests.
- [x] 1.3 Canonical DTO/registry/parser/error foundation, deterministic derivations, and `origen` fallback.
- [x] 1.4 Application-layer normalized animal-list read port and public export.
- [x] 2.3 Additive LA-102 schema metadata, migration, and migration journal entry.
- [x] 2.1 PostgreSQL RED integration coverage for authorization/isolation, filters/counters/pagination, latest-weight/origen fallback, and bounded listing statement count.
- [x] 2.2 Parameterized PostgreSQL `DrizzleAnimalListadoReadModel` with fresh RBAC authorization, joined page rows, filtered/finca-wide counts, and fixed three-statement listing execution.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | N/A | Process | N/A | N/A — delivery control | Branch verified | N/A | N/A |
| 1.2 | `apps/web/tests/animal-list-server-contract.test.ts` | Unit harness | N/A (new files) | `tsx` failed with `ERR_MODULE_NOT_FOUND` for missing contract module | `pnpm --filter @ganaweb/web exec tsx tests/animal-list-server-contract.test.ts` — exit 0 | 4 cases: registry/nullability, defaults/cols, invalid grammar, error IDs | Biome format/check clean |
| 1.3 | `apps/web/tests/animal-list-server-contract.test.ts` | Unit harness | N/A (new file) | Same missing-module failure above | Partial: parser/DTO tests pass; task remains open for derivations | Parser valid/invalid and nullable DTO cases | Extracted validation helpers; explicit 36-field mapping |
| 1.3 | `apps/web/tests/animal-list-server-contract.test.ts` | Unit harness | ✅ 4 prior cases passing | ✅ Added derivation/fallback cases before implementation; missing exports failed with `SyntaxError` | ✅ `tsx` exit 0 | ✅ Null/future age, date+ID tie-break, configured/unknown/null origen | ✅ Pure deterministic helpers; focused test remains green |
| 1.4 | `packages/aplicacion/tests/animal-listado-port.test.ts` | Type contract harness | N/A (new file) | ✅ Type-only contract test written before port; missing module would fail `tsc --noEmit` | ✅ application typecheck exit 0; harness exit 0 | ➖ Structural-only contract; normalized request and result exercise distinct values | ✅ interfaces only; no route or persistence dependency |
| 2.3 | `packages/db/tests/animal-list-indexes.test.ts` | Migration artifact harness | N/A (new migration) | ✅ Missing `0002_animal_list_indexes.sql` failed `ENOENT` | ✅ `tsx` exit 0 | ✅ Both animal-list and latest-weight index assertions | ✅ Schema metadata and additive SQL names match |
| 2.1 | `packages/db/tests/animal-listado-postgres.test.ts` | PostgreSQL integration | N/A (new test) | ✅ Test imported missing `DrizzleAnimalListadoReadModel`; run failed 4/4 with `is not a constructor` | ✅ `DATABASE_URL=... pnpm --filter @ganaweb/db exec vitest run tests/animal-listado-postgres.test.ts` — 4/4 passed | ✅ 4 independent scenarios: indistinguishable RBAC/isolation, filters/counts/pages, tie-break/fallback, bounded statements | ✅ Fixture uses unique IDs and cleans up all inserted rows |
| 2.2 | `packages/db/tests/animal-listado-postgres.test.ts` | PostgreSQL integration | ✅ Same focused suite: 4/4 passed before final production refactor | ✅ Read-model behavior was absent (same 4/4 RED evidence) | ✅ Focused PostgreSQL suite 4/4 passed after implementation | ✅ Multiple rows and cross-farm row prove finca scoping; same-date weight IDs prove deterministic selection | ✅ Fixed read execution to three queries and retained a typed application port |

## Work Unit Evidence

| Work unit | Focused test | Runtime harness | Rollback boundary |
|---|---|---|---|
| Contract foundation | `pnpm --filter @ganaweb/web exec tsx tests/animal-list-server-contract.test.ts` — exit 0, 4 behavior cases | N/A — pure parser/DTO module has no runtime boundary | Revert `apps/web/src/server/animal-list-contract.ts` and its test; no legacy action/UI changes |
| Contract derivations and application port | `pnpm --filter @ganaweb/web exec tsx tests/animal-list-server-contract.test.ts && pnpm --filter @ganaweb/aplicacion exec tsx tests/animal-listado-port.test.ts` — exit 0 | N/A — pure derivation and interfaces-only port have no runtime boundary | Revert `apps/web/src/server/animal-list-contract.ts`, `packages/aplicacion/src/puertos/animal-listado-port.ts`, export, and tests; no route/UI behavior changes |
| LA-102 indexes | `pnpm --filter @ganaweb/db exec tsx tests/animal-list-indexes.test.ts` — exit 0, 2 index assertions | Blocked — `DATABASE_URL` is not configured and the exact RF-ANIM-LIST §11 PostgreSQL fixture/harness is absent; no plan or query execution was claimed | Revert schema metadata and `0002_animal_list_indexes.sql` only; for an applied migration, reverse in a new migration rather than editing it |
| PostgreSQL read model | `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ganaweb pnpm --filter @ganaweb/db exec vitest run tests/animal-listado-postgres.test.ts` — exit 0, 4/4 integration tests | `pnpm db:up` recreated only local `ganaweb-postgres` / `ganaweb_pgdata`, applied migrations and seeded demo data; focused fixture executed authorization + read queries against PostgreSQL | Revert `packages/db/src/animal-infrastructure.ts` read-model additions and `packages/db/tests/animal-listado-postgres.test.ts`; no legacy action/UI behavior changes |

## Commands

- `pnpm --filter @ganaweb/web typecheck` — exit 0.
- `pnpm exec biome ci apps/web/src/server/animal-list-contract.ts apps/web/tests/animal-list-server-contract.test.ts` — exit 0.
- `pnpm turbo typecheck` — exit 0 (13/13 tasks successful).
- `pnpm exec biome check apps/web/src/server/animal-list-contract.ts apps/web/tests/animal-list-server-contract.test.ts packages/aplicacion/src/puertos/animal-listado-port.ts packages/aplicacion/src/index.ts packages/aplicacion/tests/animal-listado-port.test.ts packages/db/src/schema/animales.ts packages/db/src/schema/pesos-produccion.ts packages/db/tests/animal-list-indexes.test.ts` — exit 0.
- `pnpm db:up` — exit 0; authorized destructive recreation limited to local `ganaweb-postgres` and `ganaweb_pgdata`; migration `0002_animal_list_indexes.sql` applied.
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ganaweb pnpm --filter @ganaweb/db exec vitest run tests/animal-listado-postgres.test.ts` — exit 0, 4/4.
- `pnpm --filter @ganaweb/db exec tsc --noEmit` — exit 0.
- `pnpm exec biome check packages/db/src/animal-infrastructure.ts packages/db/tests/animal-listado-postgres.test.ts` — exit 0 after source normalization.
- `docker exec ganaweb-postgres psql -U postgres -d ganaweb -c "EXPLAIN (ANALYZE, BUFFERS) ..."` — actual demo-seed plan: `idx_pesos_animal_fecha_id` used by the LATERAL latest-weight lookup (13 loops, no per-row statement); `animales` used a sequential scan because the disposable demo table held only 20 rows. Execution time: 0.929 ms. This is query-plan evidence only, not RF-ANIM-LIST §11 p95 acceptance.
- `pnpm turbo test` — exit 1 from pre-existing unrelated suites: `@ganaweb/aplicacion/tests/animal-listado-port.test.ts` has no Vitest suite, and `@ganaweb/db/tests/animal-infrastructure.test.ts` still expects only `0000_initial` and `0001_animal_sync_audit` despite the already-applied additive `0002_animal_list_indexes` migration. Focused PostgreSQL tests remain green; these failures were not changed in this work unit.

## Work-unit Commit

- `6f711f7 feat(animals): add listing derivations and indexes`
- Changed paths: contract derivations/tests; application read-port/export/test; LA-102 schema metadata, additive migration/journal, and migration test; task status.
- Pending conventional work-unit commit: `feat(animals): add PostgreSQL listing read model` — includes the real read model, PostgreSQL integration test, and this task/evidence update.

## Blockers / Deviations

- Historical note (superseded by this batch): tasks 1.4 and 2.3 were previously unchecked; they are now complete. The PostgreSQL read model, HTTP route, and PostgreSQL benchmark evidence remain unimplemented.
- Historical note (superseded by this batch): age/latest-weight and `origen` helper derivations are now implemented and unit-tested; database-backed derivation remains pending task 2.2.
- PostgreSQL benchmark fixture and RF-ANIM-LIST §11 measurement harness remain unavailable, as documented in the design. LA-100 p95 acceptance remains blocked and has not been inferred from this local query plan.
- Task 2.4 remains unchecked: the feasible PostgreSQL plan capture is recorded above, but its tiny disposable seed chose a sequential `animales` scan. The latest-weight LA-102 index is used; a representative finalized benchmark plan for the animal-list index still requires the absent §11 fixture/scenarios.
