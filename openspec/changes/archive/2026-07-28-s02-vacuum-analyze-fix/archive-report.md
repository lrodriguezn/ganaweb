# Archive Report — `s02-vacuum-analyze-fix`

**Change**: `s02-vacuum-analyze-fix`
**Archived**: 2026-07-28
**PR**: [#116](https://github.com/lrodriguezn/ganaweb/pull/116) (`fix/issue-115-s02-vacuum-analyze` → `master`)
**Commit**: `14bcf10`
**Review receipt**: `sha256:b7084bc62ed08462510a8c7589c2ebdb6b056e8cb45902e40c9f159210181810` (lineage `review-be3fcf273142c91c`, post-apply gate ALLOWED)
**Verdict**: PASS WITH WARNINGS (0 CRITICAL, 2 WARNING, 5 SUGGESTION)

## Final state

- **6 in-scope files committed**: `packages/db/scripts/vacuum-analyze.ts`, additive helper at `packages/db/src/benchmark/run-animal-listado.ts:117`, 3 new test files under `packages/db/tests/`, `vacuum:analyze` npm entry in `packages/db/package.json`, and a "Maintenance" section in `packages/db/README.md`. All 5 in-scope files pass `biome ci` with 0 errors; 69/72 vitest tests pass (3 env-gated); 13/13 typecheck tasks pass.
- **§11 benchmark infrastructure committed**: covering index migration `0004_animal_list_page_index_covering.sql`, `runAnimalListadoBenchmark` with manifest emission, `assertDisposableBenchmarkTarget` and `assertS02OrderedCompositeIndexPlan` helpers, the 8 modifications in `aplicacion` and `db` ports, and the new `packages/db/src/benchmark/{animal-listado,run-animal-listado}.ts`.
- **3 disposable PG 17 diagnostic captures committed** (`packages/db/s02-diag-{no-analyze,with-analyze,vacuum-prime}.json` + `packages/db/src/benchmark/s02-plan-diagnostic.ts`): the raw plan evidence that proved the visibility map is the root cause.
- **OpenSpec artifacts in this archive folder**: proposal, spec for the new `animal-list-vacuum-maintenance` capability, design with rationale, tasks with the Review Workload Forecast, apply-progress documenting the per-attempt journey, verify-report with `PASS WITH WARNINGS`.

## Deviations from spec

- **Task 3.3 (Biome `noRestrictedSyntax` override) intentionally skipped**: Biome 1.9.4 in this repo lacks the rule (added in Biome 2.0+). The Vitest source-invariant test in `vacuum-analyze-script-source.test.ts` Part A is the CI gate. Documented in `design.md` "Architecture Decisions" table.
- **2 non-blocking WARNINGs** from the verify report: (a) integration test (b) uses inline EXPLAIN rather than reusing `runAnimalListadoBenchmark` and reading `S02.statements.json` from the manifest; (b) the `lastStatementCount === 3` (LA-103) sub-assertion is not covered. Both are scoped, documented, and can be addressed in a follow-up change.

## Supersedes

- `benchmark-issue-115-animal-list-p95` (9/11 tasks) — moved to `openspec/changes/_superseded/2026-07-28-benchmark-issue-115-animal-list-p95-superseded-by-s02-vacuum-analyze-fix/` with NOTE.md.
- `optimize-issue-115-animal-list-s02-p95` (20/20 tasks) — moved to `openspec/changes/_superseded/2026-07-28-optimize-issue-115-animal-list-s02-p95-superseded-by-s02-vacuum-analyze-fix/` with NOTE.md.

Both follow-up moves are part of the same closing pass (separate docs commit on the `chore/issue-115-supersede` branch).

## Rollback

`git revert 14bcf10` on `master` (or `git revert HEAD` on `fix/issue-115-s02-vacuum-analyze` before merging). `VACUUM (ANALYZE)` is non-destructive; no DB-side effect to reverse.

## Open follow-ups (out of scope for this archive)

- The 2 verify-report WARNINGs: refactor integration test (b) to reuse the benchmark manifest; add the `lastStatementCount === 3` sub-assertion.
- 9 pre-existing biome errors in `s02-plan-diagnostic.ts` and the `s02-diag-*.json` files are out of scope (they predate this change and are diagnostic evidence, not production code).
