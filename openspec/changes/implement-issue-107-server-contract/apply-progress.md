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
- [x] 3.1 HTTP contract RED coverage for validation-before-read, non-disclosing authorization, sanitized failures, and complete nullable rows.
- [x] 3.2 TanStack Start GET route and testable HTTP adapter with request IDs, session composition, PostgreSQL read-model delegation, and contractual responses.
- [x] 3.3 Kept DB exports unchanged (existing `./animal-infrastructure` export suffices) and verified legacy action/UI/filter/preference/export paths were untouched.
- [x] 2.4 Preserved local `EXPLAIN (ANALYZE, BUFFERS)` and fixed-query-count evidence; recorded the absent §11 fixture/scenarios as the blocker for representative animal-list-index evidence.
- [x] 4.1 Recorded the absent agreed §11 fixture, scenarios, and p95 harness without claiming LA-100/LA-102 acceptance.
- [x] 4.2 Added PostgreSQL-only route-contract and evidence documentation; SQLite/WASM parity remains excluded.
- [x] 4.3 Normalized the candidate and completed final apply verification evidence; bounded review is the subsequent external parent-orchestrator gate.

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
| 3.1 | `apps/web/tests/animal-list-server-contract.test.ts` | HTTP adapter contract | ✅ Existing pure contract harness passed before extension | ✅ Missing `animal-list-http` module failed `ERR_MODULE_NOT_FOUND` | ✅ `pnpm exec tsx tests/animal-list-server-contract.test.ts` — exit 0 | ✅ Invalid grammar avoids both reads; session and forbidden read yield equal 403; driver and timeout failures sanitize; nullable row has 37 keys | ✅ Extracted injected HTTP adapter; route remains framework-only composition |
| 3.2 | `apps/web/tests/animal-list-server-contract.test.ts` | HTTP adapter + PostgreSQL integration | N/A (new route) | ✅ Same absent-module RED from 3.1 | ✅ HTTP contract harness exit 0; PostgreSQL focused suite 4/4 passed | ✅ Contract tests cover independent validation, authorization, error, and nullable-row paths | ✅ Route delegates to a small injected handler and real session/read dependencies |
| 3.3 | `packages/aplicacion/tests/animal-listado-port.test.ts`; `packages/db/tests/animal-infrastructure.test.ts` | Vitest contract/regression | ✅ Both focused files initially failed: no Vitest suite and stale migration list | ✅ Existing introduced regression failures observed before correction | ✅ application port 2/2 and migration infrastructure 8/8 passed | ✅ Distinct request/page-size/sort contract values and additive journal entry | ✅ Converted the port harness to behavioral Vitest tests; updated only the additive migration expectation |
| 2.4 | `packages/db/tests/animal-listado-postgres.test.ts` | PostgreSQL integration/evidence | ✅ 4/4 focused suite baseline | N/A — evidence-only task; no production behavior added | ✅ 4/4 passed; local plan used `idx_pesos_animal_fecha_id` and the read model remained fixed at three listing statements | N/A — exact §11 scenarios are absent | ➖ No source refactor; preserved actual plan and documented the fixture blocker |
| 4.1 | N/A | Benchmark evidence | N/A — documentation/evidence task | N/A — no production behavior added | N/A — agreed §11 fixture/scenarios/p95 harness absent | N/A — no available scenarios to triangulate | ➖ Documented blocker without weakening LA-100/LA-102 |
| 4.2 | N/A | Contract documentation | N/A — documentation task | N/A — no production behavior added | ✅ `route-contract-evidence.md` records PostgreSQL-only support, excluded SQLite/WASM parity, contract, and evidence status | N/A — one static contract/evidence document | ➖ Documentation only; final verify report remains owned by `sdd-verify` |
| 4.3 | Existing focused/full suites | Candidate verification | ✅ Focused suites passed before final checks | N/A — normalization/evidence task; no production behavior added | ✅ format no fixes; focused tests, full suite, typecheck, and Biome command passed | ✅ CA-UI-002 isolated runs produced one pass and one timeout; full suite subsequently passed | ➖ No candidate code change; excluded UI timeout classified and not masked |

## Work Unit Evidence

| Work unit | Focused test | Runtime harness | Rollback boundary |
|---|---|---|---|
| Contract foundation | `pnpm --filter @ganaweb/web exec tsx tests/animal-list-server-contract.test.ts` — exit 0, 4 behavior cases | N/A — pure parser/DTO module has no runtime boundary | Revert `apps/web/src/server/animal-list-contract.ts` and its test; no legacy action/UI changes |
| Contract derivations and application port | `pnpm --filter @ganaweb/web exec tsx tests/animal-list-server-contract.test.ts && pnpm --filter @ganaweb/aplicacion exec tsx tests/animal-listado-port.test.ts` — exit 0 | N/A — pure derivation and interfaces-only port have no runtime boundary | Revert `apps/web/src/server/animal-list-contract.ts`, `packages/aplicacion/src/puertos/animal-listado-port.ts`, export, and tests; no route/UI behavior changes |
| LA-102 indexes | `pnpm --filter @ganaweb/db exec tsx tests/animal-list-indexes.test.ts` — exit 0, 2 index assertions | Blocked — `DATABASE_URL` is not configured and the exact RF-ANIM-LIST §11 PostgreSQL fixture/harness is absent; no plan or query execution was claimed | Revert schema metadata and `0002_animal_list_indexes.sql` only; for an applied migration, reverse in a new migration rather than editing it |
| PostgreSQL read model | `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ganaweb pnpm --filter @ganaweb/db exec vitest run tests/animal-listado-postgres.test.ts` — exit 0, 4/4 integration tests | `pnpm db:up` recreated only local `ganaweb-postgres` / `ganaweb_pgdata`, applied migrations and seeded demo data; focused fixture executed authorization + read queries against PostgreSQL | Revert `packages/db/src/animal-infrastructure.ts` read-model additions and `packages/db/tests/animal-listado-postgres.test.ts`; no legacy action/UI behavior changes |
| HTTP route and regression correction | `pnpm exec tsx apps/web/tests/animal-list-server-contract.test.ts` — exit 0; `pnpm --filter @ganaweb/aplicacion exec vitest run tests/animal-listado-port.test.ts` — 2/2; `pnpm --filter @ganaweb/db exec vitest run tests/animal-infrastructure.test.ts` — 8/8 | `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ganaweb pnpm --filter @ganaweb/db exec vitest run tests/animal-listado-postgres.test.ts` — exit 0, 4/4; validates the delegated PostgreSQL read model | Revert `apps/web/src/server/animal-list-http.ts`, `apps/web/src/routes/api/fincas/$fincaId/animales.ts`, related contract-test/package command changes, and the two regression-test corrections; legacy action/UI files remain isolated |
| Evidence and candidate readiness | `pnpm --filter @ganaweb/web test` — exit 0; application port 2/2; DB infrastructure 8/8; DB PostgreSQL 4/4; index harness exit 0; `pnpm turbo test` — exit 0, 13 tasks (UI 409/409) | Local PostgreSQL plan/migration review: latest-weight index used; list is fixed at three statements; tiny demo seed sequential-scanned `animales`; exact §11 fixture/scenarios/p95 harness unavailable | Revert only `openspec/changes/implement-issue-107-server-contract/{tasks.md,apply-progress.md,route-contract-evidence.md}` to remove apply evidence; feature behavior remains in prior dedicated commits |

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
- Regression correction: `pnpm --filter @ganaweb/aplicacion exec vitest run tests/animal-listado-port.test.ts` — exit 0, 2/2; `pnpm --filter @ganaweb/db exec vitest run tests/animal-infrastructure.test.ts` — exit 0, 8/8; followed by `pnpm turbo test` which no longer fails for either introduced regression.
- `pnpm --filter @ganaweb/web test` — exit 0; runs the HTTP contract harness and the web Vitest suite.
- `pnpm turbo typecheck` — exit 0, 13/13.
- `pnpm exec biome check` on all modified source and tests — exit 0.
- Final `pnpm turbo test` — exit 1 only because unrelated `@ganaweb/ui/tests/animal-ui.test.tsx` test `CA-UI-002` timed out (408/409 passed); no UI files were modified. The prior web timeout did not recur.
- `pnpm exec biome format --write .` — exit 0; formatted 250 files with no fixes.
- Isolated `CA-UI-002` twice: first pass (4.876 s), second timeout at 5 s with `MutationObserver is not a constructor` after teardown. The later full suite passed; this is nondeterministic excluded UI-test infrastructure behavior, not a candidate failure.
- Final focused evidence: web exit 0; application port 2/2; DB infrastructure 8/8; PostgreSQL read-model 4/4; index harness exit 0.
- Final `pnpm turbo test` — exit 0, 13 tasks successful; UI 409/409.
- Final `pnpm turbo typecheck` — exit 0, 13/13.
- Final `pnpm exec biome ci .` — exit 0, eight warnings in excluded pre-existing UI/create files; no fixes applied.
- Migration review: PostgreSQL contains `idx_animales_finca_activo_codigo` and `idx_pesos_animal_fecha_id` with expected definitions; migration ledger table is `drizzle.__drizzle_migrations`.

## Work-unit Commit

- `6f711f7 feat(animals): add listing derivations and indexes`
- Changed paths: contract derivations/tests; application read-port/export/test; LA-102 schema metadata, additive migration/journal, and migration test; task status.
- `bdd60b4 feat(animals): add PostgreSQL listing read model` — includes the real read model, PostgreSQL integration test, and this task/evidence update.

## Blockers / Deviations

- Historical note (superseded): the PostgreSQL read model and HTTP route are implemented. Only the exact §11 benchmark evidence remains unimplemented.
- Historical note (superseded by this batch): age/latest-weight and `origen` helper derivations are now implemented and unit-tested; database-backed derivation remains pending task 2.2.
- PostgreSQL benchmark fixture, RF-ANIM-LIST §11 exact scenarios, and p95 measurement harness remain unavailable. LA-100 p95 acceptance and full LA-102 benchmark acceptance remain blocked and have not been inferred from the local query plan.
- Task 2.4 is complete through its explicit blocker/deviation alternative: the actual local plan used `idx_pesos_animal_fecha_id` for latest weight across 13 loops, while the 20-row demo seed sequential-scanned `animales`. A representative animal-list-index plan still requires the absent §11 fixture/scenarios.
- Task 4.3 is complete as apply evidence preparation. Bounded review is a later external parent-orchestrator delivery gate, not an unchecked apply-time mutation after receipt freezing.
