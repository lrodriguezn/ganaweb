# Apply Progress: Issue #107 Animal List Server Contract

**Mode:** Strict TDD
**Delivery:** Maintainer-approved `size:exception` on `feat/issue-107-server-contract`

## Completed Tasks

- [x] 1.1 Dedicated branch and work-unit delivery controls.
- [x] 1.2 Contract RED tests.
- [ ] 1.3 Canonical DTO/registry/parser/error foundation is partial; derivations and `origen` fallback are pending.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | N/A | Process | N/A | N/A — delivery control | Branch verified | N/A | N/A |
| 1.2 | `apps/web/tests/animal-list-server-contract.test.ts` | Unit harness | N/A (new files) | `tsx` failed with `ERR_MODULE_NOT_FOUND` for missing contract module | `pnpm --filter @ganaweb/web exec tsx tests/animal-list-server-contract.test.ts` — exit 0 | 4 cases: registry/nullability, defaults/cols, invalid grammar, error IDs | Biome format/check clean |
| 1.3 | `apps/web/tests/animal-list-server-contract.test.ts` | Unit harness | N/A (new file) | Same missing-module failure above | Partial: parser/DTO tests pass; task remains open for derivations | Parser valid/invalid and nullable DTO cases | Extracted validation helpers; explicit 36-field mapping |

## Work Unit Evidence

| Work unit | Focused test | Runtime harness | Rollback boundary |
|---|---|---|---|
| Contract foundation | `pnpm --filter @ganaweb/web exec tsx tests/animal-list-server-contract.test.ts` — exit 0, 4 behavior cases | N/A — pure parser/DTO module has no runtime boundary | Revert `apps/web/src/server/animal-list-contract.ts` and its test; no legacy action/UI changes |

## Commands

- `pnpm --filter @ganaweb/web typecheck` — exit 0.
- `pnpm exec biome ci apps/web/src/server/animal-list-contract.ts apps/web/tests/animal-list-server-contract.test.ts` — exit 0.

## Blockers / Deviations

- Tasks 1.4–4.3 remain unchecked. The port, PostgreSQL read model, migration, HTTP route, and PostgreSQL benchmark evidence have not yet been implemented.
- The current contract foundation does not yet calculate age/latest weight or resolve `origen`; those require the PostgreSQL read model and remain incomplete under task 1.3's broader wording.
- PostgreSQL benchmark fixture and RF-ANIM-LIST §11 measurement harness remain unavailable, as documented in the design.
