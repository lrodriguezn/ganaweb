# Apply Progress: Issue #107 Animal List Server Contract

**Mode:** Strict TDD
**Delivery:** Maintainer-approved `size:exception` on `feat/issue-107-server-contract`

## Completed Tasks

- [x] 1.1 Dedicated branch and work-unit delivery controls.
- [x] 1.2 Contract RED tests.
- [x] 1.3 Canonical DTO/registry/parser/error foundation, deterministic derivations, and `origen` fallback.
- [x] 1.4 Application-layer normalized animal-list read port and public export.
- [x] 2.3 Additive LA-102 schema metadata, migration, and migration journal entry.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | N/A | Process | N/A | N/A — delivery control | Branch verified | N/A | N/A |
| 1.2 | `apps/web/tests/animal-list-server-contract.test.ts` | Unit harness | N/A (new files) | `tsx` failed with `ERR_MODULE_NOT_FOUND` for missing contract module | `pnpm --filter @ganaweb/web exec tsx tests/animal-list-server-contract.test.ts` — exit 0 | 4 cases: registry/nullability, defaults/cols, invalid grammar, error IDs | Biome format/check clean |
| 1.3 | `apps/web/tests/animal-list-server-contract.test.ts` | Unit harness | N/A (new file) | Same missing-module failure above | Partial: parser/DTO tests pass; task remains open for derivations | Parser valid/invalid and nullable DTO cases | Extracted validation helpers; explicit 36-field mapping |
| 1.3 | `apps/web/tests/animal-list-server-contract.test.ts` | Unit harness | ✅ 4 prior cases passing | ✅ Added derivation/fallback cases before implementation; missing exports failed with `SyntaxError` | ✅ `tsx` exit 0 | ✅ Null/future age, date+ID tie-break, configured/unknown/null origen | ✅ Pure deterministic helpers; focused test remains green |
| 1.4 | `packages/aplicacion/tests/animal-listado-port.test.ts` | Type contract harness | N/A (new file) | ✅ Type-only contract test written before port; missing module would fail `tsc --noEmit` | ✅ application typecheck exit 0; harness exit 0 | ➖ Structural-only contract; normalized request and result exercise distinct values | ✅ interfaces only; no route or persistence dependency |
| 2.3 | `packages/db/tests/animal-list-indexes.test.ts` | Migration artifact harness | N/A (new migration) | ✅ Missing `0002_animal_list_indexes.sql` failed `ENOENT` | ✅ `tsx` exit 0 | ✅ Both animal-list and latest-weight index assertions | ✅ Schema metadata and additive SQL names match |

## Work Unit Evidence

| Work unit | Focused test | Runtime harness | Rollback boundary |
|---|---|---|---|
| Contract foundation | `pnpm --filter @ganaweb/web exec tsx tests/animal-list-server-contract.test.ts` — exit 0, 4 behavior cases | N/A — pure parser/DTO module has no runtime boundary | Revert `apps/web/src/server/animal-list-contract.ts` and its test; no legacy action/UI changes |
| Contract derivations and application port | `pnpm --filter @ganaweb/web exec tsx tests/animal-list-server-contract.test.ts && pnpm --filter @ganaweb/aplicacion exec tsx tests/animal-listado-port.test.ts` — exit 0 | N/A — pure derivation and interfaces-only port have no runtime boundary | Revert `apps/web/src/server/animal-list-contract.ts`, `packages/aplicacion/src/puertos/animal-listado-port.ts`, export, and tests; no route/UI behavior changes |
| LA-102 indexes | `pnpm --filter @ganaweb/db exec tsx tests/animal-list-indexes.test.ts` — exit 0, 2 index assertions | Blocked — `DATABASE_URL` is not configured and the exact RF-ANIM-LIST §11 PostgreSQL fixture/harness is absent; no plan or query execution was claimed | Revert schema metadata and `0002_animal_list_indexes.sql` only; for an applied migration, reverse in a new migration rather than editing it |

## Commands

- `pnpm --filter @ganaweb/web typecheck` — exit 0.
- `pnpm exec biome ci apps/web/src/server/animal-list-contract.ts apps/web/tests/animal-list-server-contract.test.ts` — exit 0.
- `pnpm turbo typecheck` — exit 0 (13/13 tasks successful).
- `pnpm exec biome check apps/web/src/server/animal-list-contract.ts apps/web/tests/animal-list-server-contract.test.ts packages/aplicacion/src/puertos/animal-listado-port.ts packages/aplicacion/src/index.ts packages/aplicacion/tests/animal-listado-port.test.ts packages/db/src/schema/animales.ts packages/db/src/schema/pesos-produccion.ts packages/db/tests/animal-list-indexes.test.ts` — exit 0.

## Work-unit Commit

- `6f711f7 feat(animals): add listing derivations and indexes`
- Changed paths: contract derivations/tests; application read-port/export/test; LA-102 schema metadata, additive migration/journal, and migration test; task status.

## Blockers / Deviations

- Tasks 1.4–4.3 remain unchecked. The port, PostgreSQL read model, migration, HTTP route, and PostgreSQL benchmark evidence have not yet been implemented.
- The current contract foundation does not yet calculate age/latest weight or resolve `origen`; those require the PostgreSQL read model and remain incomplete under task 1.3's broader wording.
- PostgreSQL benchmark fixture and RF-ANIM-LIST §11 measurement harness remain unavailable, as documented in the design.
- `DATABASE_URL` is not configured in this workspace. The required PostgreSQL integration fixture/harness is not present, so tasks 2.1, 2.2, and 2.4 remain unchecked: no RBAC/isolation, joined-read/no-N+1, or `EXPLAIN (ANALYZE, BUFFERS)` result has been invented or claimed.
