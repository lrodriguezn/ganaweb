# Tasks: Remediate issue #107 accent search

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 280–380 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | One approved-exception corrective PR |
| Delivery strategy | exception-ok |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Prove and correct PostgreSQL search | Existing #107 PR | `pnpm --filter @ganaweb/db test -- animal-listado-postgres` | Disposable PostgreSQL 17 migration + listing-role query | `0003`, journal, predicate, and focused tests |

## Phase 1: Capability and RED proof

- [x] 1.1 Safely inspect local disposable PostgreSQL 17 extension provisioning and migration/listing-role `public.unaccent` EXECUTE privileges; record a blocker rather than changing shared state when unavailable.
- [x] 1.2 RED: in `packages/db/tests/animal-list-indexes.test.ts`, assert a new forward migration/journal is required, idempotently provisions `public.unaccent`, verifies qualified callable/EXECUTE use, and leaves `0002` untouched.
- [x] 1.3 RED: in `packages/db/tests/animal-listado-postgres.test.ts`, table-drive `q` across its four fields and all ten validated `contains` fields for bidirectional `áéíóúñ` and case equivalence.
- [x] 1.4 RED: add literal `%`, `_`, `!`, and SQL-like `q`/`contains` cases that match only bound escaped literals; assert cross-finca absence, filtered/unfiltered counters, and repeated tied pages have stable `id ASC` IDs without duplicates or omissions.

## Phase 2: Migration and predicate GREEN

- [x] 2.1 Create `packages/db/migrations/0003_animal_list_unaccent.sql` with idempotent `CREATE EXTENSION ... WITH SCHEMA public` and qualified callable/privilege assertions; register it in `packages/db/migrations/meta/_journal.json`.
- [x] 2.2 Make migration tests GREEN by rerunning the migration on fresh and already-provisioned disposable PostgreSQL; denied creation or invocation must fail with a capability blocker before predicate rollout.
- [x] 2.3 In `packages/db/src/animal-infrastructure.ts`, add `escapeLikeLiteral` and one parameterized `public.unaccent(pg_catalog.lower(column)) LIKE public.unaccent(pg_catalog.lower($pattern)) ESCAPE '!'` helper; route `q` OR and validated `contains` AND predicates through it.
- [x] 2.4 Make PostgreSQL RED tests GREEN while preserving shared page/filtered-count WHERE, finca-wide `totalSinFiltro`, authorization, DTOs, errors, sorting, and statement bounds.

## Phase 3: Verification and corrective review

- [x] 3.1 Run focused PostgreSQL tests, full `pnpm turbo test`, `pnpm turbo typecheck`, and `biome ci .`; rerun migration capability verification and report any unavailable environment as a blocker.
- [x] 3.2 Normalize corrected source bytes, inspect the final diff, and create one conventional, reviewable corrective commit on the existing #107 branch with tests and migration in the same work unit.
- [ ] 3.3 Obtain independent verification and a fresh content-bound review of the normalized corrected bytes before advancing the existing PR; do not reuse prior review evidence.
