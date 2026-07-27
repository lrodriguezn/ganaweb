# Apply Progress: Remediate issue #107 accent search

**Mode:** Strict TDD
**Delivery:** Maintainer-approved `size:exception` on `feat/issue-107-server-contract`
**Work unit:** PostgreSQL `unaccent` migration, literal-safe predicates, and integration proof.

## Completed Tasks

- [x] 1.1–1.4 Capability inspection and RED migration/PostgreSQL behavior proof.
- [x] 2.1–2.4 Forward migration, qualified normalized predicates, and GREEN proof.
- [x] 3.1–3.2 Focused/full validation and source normalization.
- [ ] 3.3 Independent verification and fresh content-bound review; intentionally not started because this apply execution must not call review lifecycle commands.

## Capability Evidence

- Authorized disposable target: `postgresql://postgres:postgres@localhost:5432/ganaweb`, Docker container `ganaweb-postgres`, PostgreSQL 17.10, role `postgres`.
- Before migration, a transaction-only `CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public` verified `public.unaccent(text)`, EXECUTE privilege, and `public.unaccent('Árbol') = 'Arbol'`; the transaction rolled back.
- The forward migration then applied successfully to the disposable target and was safely re-run with no pending migration failure.
- A fresh disposable database `ganaweb_accent_migration_test` applied the full migration chain, returned `unaccent(text)`, `executable = true`, and `Arbol`, then was dropped. The migration itself raises an explicit `animal list accent search capability blocker` before predicate rollout when create/use capability is unavailable.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | PostgreSQL capability commands | Integration | Existing PostgreSQL list suite: 4/4 passed | `unaccent` absent before provision | Transactional provision/use check passed | Fresh + already-provisioned migration paths | N/A — capability only |
| 1.2, 2.1–2.2 | `packages/db/tests/animal-list-indexes.test.ts` | Migration integration | Existing TS harness passed before conversion | Missing `0003` failed `ENOENT` | 2/2 passed after forward migration/journal | Preserved `0002`; asserted extension, callable, privilege, and journal | Converted focused harness to behavioral Vitest |
| 1.3–1.4, 2.3–2.4 | `packages/db/tests/animal-listado-postgres.test.ts` | PostgreSQL integration | Existing suite: 4/4 passed | 17/20 failed with lower-only predicates; unaccented inputs returned no matches | 20/20 passed after qualified helper | 4 `q` fields × three equivalents; 10 `contains` fields × three equivalents; literal and page/isolation cases | Extracted `escapeLikeLiteral` + one `normalizedContains` helper; focused suite remained green |
| 3.1–3.2 | All changed files | Integration | Focused suite green | N/A — verification task | Full Turbo suite 13/13 tasks passed | Fresh migration plus target re-run | `biome format --write` only on changed TS/JSON files; retested |

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ganaweb pnpm --filter @ganaweb/db exec vitest run tests/animal-list-indexes.test.ts tests/animal-listado-postgres.test.ts` — exit 0; 2 files, 22 tests passed. |
| Runtime harness command/scenario and exact result | Fresh `ganaweb_accent_migration_test`: `pnpm --filter @ganaweb/db migrate` — exit 0; qualified callable, EXECUTE privilege, and `Árbol -> Arbol` passed; temporary database dropped. Target re-run also exited 0. |
| Rollback boundary | Revert `0003`, its journal entry, the normalized predicate helper, and accent tests together. If applied outside this disposable target, use a reviewed forward migration; never edit `0002` or drop a shared extension. |

## Verification Commands

- `pnpm turbo test` — exit 0; 13/13 tasks successful.
- `pnpm turbo typecheck` — exit 0; 13/13 tasks successful.
- `pnpm exec biome ci .` — exit 0; 8 pre-existing warnings in excluded UI files, no fixes applied.
- `pnpm exec biome format --write` on changed TS/JSON files — exit 0; one file normalized.

## Deviations and Scope

None — implementation follows the approved design. No UI, SQLite/WASM, issue #112, normalized columns, or RF-ANIM-LIST §11 benchmark fixture was changed. The production listing credential remains an explicit deployment validation requirement; this authorized local listing credential is `postgres`.

## Changed Paths

- `packages/db/migrations/0003_animal_list_unaccent.sql`
- `packages/db/migrations/meta/_journal.json`
- `packages/db/src/animal-infrastructure.ts`
- `packages/db/tests/animal-list-indexes.test.ts`
- `packages/db/tests/animal-listado-postgres.test.ts`
- `packages/db/tests/animal-infrastructure.test.ts`
- `openspec/changes/remediate-issue-107-accent-search/{tasks.md,apply-progress.md}`
