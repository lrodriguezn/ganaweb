# Tasks: Issue #107 Animal List Server Contract

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 950–1,300 |
| 400-line budget risk | High |
| 800-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | Single PR only; work-unit commits with maintainer-approved `size:exception` |
| Delivery strategy | single-pr-default |
| Chain strategy | size-exception |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: High
800-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Contract and port | #107 | `pnpm --filter @ganaweb/web test -- animal-list-server-contract` | N/A: pure tests | Contract/port files |
| 2 | PostgreSQL read and indexes | #107 | `pnpm --filter @ganaweb/db test -- animal-listado-postgres` | PostgreSQL fixture/query instrumentation | Read model and new migration |
| 3 | Route and acceptance evidence | #107 | `pnpm turbo test --filter=@ganaweb/web` | HTTP GET against PostgreSQL | Route and contract tests |

## Phase 1: Delivery and Contract Foundation

- [x] 1.1 Require a dedicated `feat/issue-107-server-contract` branch, conventional work-unit commits, bounded review, and one PR closing #107; obtain `size:exception` before apply.
- [x] 1.2 RED: create `apps/web/tests/animal-list-server-contract.test.ts` for 36 fields/nullability, parser defaults, invalid grammar/repeated `cols`, and `ApiErrorDto` request IDs.
- [x] 1.3 Create `apps/web/src/server/animal-list-contract.ts`: typed registry, DTO/parser, normalized `cols`, errors, age, latest-weight, and `origen` fallback; GREEN/refactor 1.2.
- [x] 1.4 Create/export `packages/aplicacion/src/puertos/animal-listado-port.ts` normalized request/result contracts; keep logic out of the route.

## Phase 2: PostgreSQL Read Model and Migration

- [x] 2.1 RED: add `packages/db/tests/animal-listado-postgres.test.ts` for indistinguishable RBAC/isolation 403, filters/counts/stable pages, tie-break/fallback, and no-N+1 statement count.
- [x] 2.2 Add `DrizzleAnimalListadoReadModel` in `packages/db/src/animal-infrastructure.ts`: authorize before parameterized joined page plus filtered/finca-wide counts; GREEN/refactor 2.1.
- [x] 2.3 Add LA-102 metadata in `packages/db/src/schema/animales.ts` and `pesos-produccion.ts`, then migration `0002_animal_list_indexes.sql` and journal/meta; never edit applied migrations.
- [x] 2.4 Capture available `EXPLAIN (ANALYZE, BUFFERS)` evidence for finalized supported queries, indexes, and no per-row execution; record the absent agreed §11 fixture/scenarios as the blocker for representative animal-list-index evidence.

## Phase 3: HTTP Integration and Acceptance

- [x] 3.1 RED: extend `apps/web/tests/animal-list-server-contract.test.ts` for 400-before-read, indistinguishable 403, sanitized 500/timeout, and complete nullable rows.
- [x] 3.2 Create `apps/web/src/routes/api/fincas/$fincaId/animales.ts` with GET handler, request IDs, session/port composition, and contract responses; GREEN/refactor 3.1.
- [x] 3.3 Update `packages/db/package.json` only if needed; verify legacy `listAnimalsAction`, UI, filters, preferences, and export remain untouched.

## Phase 4: Evidence, Documentation, and Final Review

- [x] 4.1 Record the exact absence of the agreed §11 fixture, scenarios, and p95 harness as a blocker/deviation without weakening or claiming LA-100/LA-102 acceptance.
- [x] 4.2 Document PostgreSQL-only support, excluded SQLite/WASM parity, implemented contract, and current evidence status in `route-contract-evidence.md`; `sdd-verify` creates the final `verify-report.md`.
- [x] 4.3 Normalize source, prepare immutable candidate verification evidence with final test/typecheck/Biome/migration-plan review, and record bounded review as the subsequent external delivery gate; keep tests/docs with each work-unit commit.
