# Apply Progress: Remediate issue #107 accent search

**Mode:** Strict TDD
**Delivery:** Maintainer-approved `size:exception` on `feat/issue-107-server-contract`
**Work unit:** PostgreSQL `unaccent` migration, literal-safe predicates, and integration proof; corrective audit test evidence.

## Completed Tasks

- [x] 1.1–1.4 Capability inspection and RED migration/PostgreSQL behavior proof.
- [x] 2.1–2.4 Forward migration, qualified normalized predicates, and GREEN proof.
- [x] 3.1–3.2 Focused/full validation and source normalization.
- [x] 3.3 Independent audit and evidence preparation — PASS: both prior gaps closed; focused tests 23/23; typecheck and Biome passed; diff is clean; the full suite had one unrelated UI timeout whose isolated rerun passed 3/3.

## External Delivery Gate — Parent-Owned (Not a Task Checkbox)

Before opening or advancing the PR, the parent MUST obtain a **fresh content-bound review** of the final normalized bytes. It MUST NOT reuse any prior receipt. This delivery gate is intentionally external to the mutable task checklist: after candidate identity freezes, it does not require a repository checkbox mutation.

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
| Audit corrective evidence | `packages/db/tests/animal-listado-postgres.test.ts` | PostgreSQL integration | Existing suite: 20/20 passed | Test-first reversible lower-only predicate run: 2/2 selected scenarios failed (inverse `q`/`contains` returned `[]`; 26-row normalized page returned `[]`) | Restored existing qualified helper without production changes; 23/23 focused tests passed | Adds inverse query-against-unaccented storage for representative `q` + `contains`; adds 26 tied rows at page size 25 across repeated pages 1 and 2, with exact IDs, full union, totals, and finca-B exclusion | Test fixtures only; existing fixture count assertions updated for the one additional unaccented row |
| 3.1–3.2 | All changed files | Integration | Focused suite green | N/A — verification task | Full Turbo suite 13/13 tasks passed | Fresh migration plus target re-run | `biome format --write` only on changed TS/JSON files; retested |

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ganaweb pnpm --filter @ganaweb/db exec vitest run tests/animal-list-indexes.test.ts tests/animal-listado-postgres.test.ts` — exit 0; 2 files, 23 tests passed. |
| Runtime harness command/scenario and exact result | `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ganaweb pnpm --filter @ganaweb/db migrate` — exit 0; existing target migration chain re-applied successfully. The focused PostgreSQL repository test then exercised the real `public.unaccent` query path over inverse equivalence and pages 1/2. |
| Rollback boundary | Revert the audit additions in `packages/db/tests/animal-listado-postgres.test.ts` to remove only this evidence expansion; no production behavior changes. The original migration/predicate unit remains independently revertible as documented above. |

## Verification Commands

- `pnpm turbo test` — exit 0; 13/13 tasks successful.
- `pnpm turbo typecheck` — exit 0; 13/13 tasks successful.
- `pnpm exec biome ci .` — exit 0; 8 pre-existing warnings in excluded UI files, no fixes applied.
- `pnpm exec biome format --write` on changed TS/JSON files — exit 0; one file normalized.
- Corrective focused PostgreSQL/migration suite — exit 0; 2 files, 23 tests passed.
- `pnpm turbo test` — exit 0; 13/13 tasks successful; DB suite 47 passed, 2 skipped.
- `pnpm turbo typecheck` — exit 0; 13/13 tasks successful.
- `pnpm exec biome ci .` — exit 0; 8 existing warnings, no fixes applied.
- Independent re-audit at `3c9b937` — PASS: both prior gaps closed; focused PostgreSQL/migration suite 23/23; typecheck and check-only Biome passed; `git diff --check` was clean. The full suite had one unrelated UI timeout; its isolated rerun passed 3/3.

## Deviations and Scope

None — implementation follows the approved design. This corrective batch changes tests only; the existing `public.unaccent` production predicate already satisfies both new scenarios. No UI, SQLite/WASM, issue #112, normalized columns, or RF-ANIM-LIST §11 benchmark fixture was changed. The production listing credential remains an explicit deployment validation requirement; this authorized local listing credential is `postgres`.

## Changed Paths

- `packages/db/migrations/0003_animal_list_unaccent.sql`
- `packages/db/migrations/meta/_journal.json`
- `packages/db/src/animal-infrastructure.ts`
- `packages/db/tests/animal-list-indexes.test.ts`
- `packages/db/tests/animal-listado-postgres.test.ts`
- `packages/db/tests/animal-infrastructure.test.ts`
- `openspec/changes/remediate-issue-107-accent-search/{tasks.md,apply-progress.md}`

## Corrective Audit Coverage

- Representative inverse equivalence: accented `q` and `codigo` `contains` inputs each find one unaccented stored counterpart.
- Real pagination: 26 accent-filtered, equal-sort rows with contractual `pageSize: 25`; page 1 has the first 25 `id ASC` values and page 2 has the remaining value. Repeated reads retain both sequences; their union has every expected ID exactly once; both filtered totals are 26; `totalSinFiltro` is 34; a matching finca-B row is absent.
- Task 3.3 is complete: independent audit and evidence preparation passed at `3c9b937`. This executor did not call any review lifecycle command. A fresh, content-bound review of the final normalized bytes remains a parent-owned external delivery gate and MUST NOT reuse a prior receipt.
