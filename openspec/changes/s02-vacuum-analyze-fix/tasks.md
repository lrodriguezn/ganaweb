# Tasks: S02 Visibility-Map Fix via VACUUM ANALYZE

Change: `s02-vacuum-analyze-fix`. Spec: `specs/animal-list-vacuum-maintenance/spec.md`. Design: `design.md`. Strict TDD (red → green) is the contract; helper + its unit tests precede the integration test so the disposable-fixture test can import the helper.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~270 (well under 400) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | single-pr (size:exception pre-approved at 800) |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

## Phase 1: Foundation — RED unit tests (TDD red)

- [x] 1.1 **RED**: add `packages/db/tests/assert-s02-ordered-index-only-scan-plan.test.ts` asserting `assertS02OrderedIndexOnlyScanPlan` rejects `Index Scan` and `Bitmap Index Scan`; also asserts acceptance of `Index Only Scan` on `idx_animales_finca_activo_codigo` with `Heap Fetches: 0` and no inner `Sort` in the `pagina` CTE.
- [x] 1.2 **RED**: add `packages/db/tests/vacuum-analyze-script-source.test.ts` part A — read `packages/db/scripts/vacuum-analyze.ts` and assert it does not match `/\.begin\(/`.
- [x] 1.3 **RED**: same file part B — assert `assertS02OrderedIndexOnlyScanPlan` is NOT imported by the existing §11 test `packages/db/tests/animal-listado-benchmark.test.ts` (tightening would break measurement).
- [x] 1.4 **RED**: same file part C — drift sentinels assert `FIXTURE_VERSION` from `packages/db/src/benchmark/animal-listado.ts` equals `"rf-anim-list-11-v2"` and `assertDisposableBenchmarkTarget` from `run-animal-listado.ts:201` is the same exported function referenced by the integration test.
- [x] 1.5 Confirm all four RED tests fail for the documented reason (missing exports / missing file).

## Phase 2: Core implementation (TDD green)

- [x] 2.1 Add `export function assertS02OrderedIndexOnlyScanPlan(plan: unknown)` next to `assertS02OrderedCompositeIndexPlan` in `packages/db/src/benchmark/run-animal-listado.ts` (after line 114), reusing the existing `planNodes` helper; reject any `Index Scan` or `Bitmap Index Scan`; require `Index Only Scan` on `idx_animales_finca_activo_codigo` with `Heap Fetches: 0`; reject inner `Sort` in `pagina` CTE.
- [x] 2.2 **GREEN**: 1.1–1.4 now pass via `pnpm --filter @ganaweb/db test`.
- [x] 2.3 Create `packages/db/scripts/vacuum-analyze.ts` — read `DATABASE_URL`, open `postgres(url, { max: 1 })`, run `VACUUM (ANALYZE) animales`, `await sql.end({ timeout: 5 })`, `process.exit(0)` on success / `process.exit(1)` on missing URL or thrown error. No `dominio`/`aplicacion` imports.
- [x] 2.4 Add `"vacuum:analyze": "tsx scripts/vacuum-analyze.ts"` to `scripts` in `packages/db/package.json` (reuses `tsx@^4.23.0` devDep at line 66).

## Phase 3: Disposable-fixture integration + lint guard

- [x] 3.1 **RED**: create `packages/db/tests/vacuum-analyze-postgres.test.ts` with three `it` blocks gated by `assertDisposableBenchmarkTarget(BENCHMARK_DATABASE_URL)`: (a) pre-`VACUUM` S02 plan is NOT strict IOS with `Heap Fetches: 0`; (b) post-`VACUUM` S02 plan IS strict IOS, no inner `Sort` in `pagina` CTE, `statementCount === 3`; (c) `spawnSync("pnpm", ["--filter", "@ganaweb/db", "vacuum:analyze"])` exits 0. Reuses `runAnimalListadoBenchmark` and `fixtureSeedSql`.
- [x] 3.2 **GREEN**: integration test passes via `DB_SMOKE=true pnpm --filter @ganaweb/db test`.
- [x] ~~3.3~~ **intentionally skipped** — Biome 1.9.4 lacks `noRestrictedSyntax` (added in 2.0+); Vitest test 1.2 is the CI gate. See design.md "Architecture Decisions" table.

## Phase 4: Documentation and final gates

- [x] 4.1 Add "Maintenance" section to `packages/db/README.md` listing triggers (post-bulk-load, post-backfill, S02 plan regression) and the `pnpm --filter @ganaweb/db vacuum:analyze` command.
- [x] 4.2 Run final gates: `pnpm turbo test typecheck` and `biome ci .`; confirm 25/25 integration tests stay green and blocked changes / migration `0004` / `animal-infrastructure.ts` / benchmark runner remain byte-identical. ✅ In-scope clean: `pnpm turbo test` 69 passed | 3 skipped (env-gated), `pnpm turbo typecheck` 13/13, `biome ci` on 5 in-scope files 0 errors. `biome ci .` exits non-zero with 11 errors — 9 are pre-existing (out of scope, see `apply-progress.md` §4.5 and `verify-report.md` "Severity classification" section) and 2 were in-scope template-literal errors fixed by the orchestrator after attempt 2 finished. Byte-identity confirmed for all blocked files. See `verify-report.md` (verdict: PASS WITH WARNINGS, 0 CRITICAL).
