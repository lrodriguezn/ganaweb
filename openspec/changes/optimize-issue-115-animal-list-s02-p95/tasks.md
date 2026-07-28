# Tasks: S02 p95 Fix via Deferred CTE Lateral Join

## Review Workload Forecast

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: none
400-line budget risk: Low

Estimated changed lines: 60–120 (CTE split + new query form + docs/apply-progress; INCLUDE migration is conditional).

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | CTE restructure + verification + rerun + docs | PR 1 | `pnpm --filter @ganaweb/db exec vitest run tests/animal-listado-postgres.test.ts` | `BENCHMARK_DATABASE_URL=… pnpm --filter @ganaweb/db benchmark:animal-listado` on isolated PG17 | single commit reverting `packages/db/src/animal-infrastructure.ts` L827–881; new v2 receipt dir remains but unused |

## Phase 1: CTE Restructure (Foundation)

- [x] 1.1 Split `animalListadoFrom` (L827–843) into `animalListadoJoins` (13 LEFT JOINs + LATERAL only); keep text verbatim.
- [x] 1.2 Rewrite page `execute` (L870–872) to `WITH pagina AS (SELECT a.id … LIMIT … OFFSET …) SELECT … FROM pagina p JOIN animales a ON a.id = p.id ${animalListadoJoins} ${where} ORDER BY ${order} LIMIT … OFFSET …` raw `sql\`…\``.
- [x] 1.3 Rewrite filtered-count `execute` (L874–876) to `FROM animales a ${animalListadoJoins} ${where}` (no CTE; pre-CTE shape).
- [x] 1.4 Leave unfiltered-count `execute` (L878–880) byte-identical.

## Phase 2: Safety-Net Verification

- [x] 2.1 Run `pnpm --filter @ganaweb/db exec vitest run tests/animal-listado-postgres.test.ts` — 25/25 green (one regression test added for parent-label sorting).
- [x] 2.2 Verify LA-103 anchors: L198 `lastStatementCount === 3`, L339 `<= 3`; per-row statement count = 0.
- [x] 2.3 Verify byte-identical 36-field DTO across S01–S07: anchors L162, L176–179, L188–190, L208, L222, L234–235, L259–269, L281–282, L293–296.
- [x] 2.4 Run `pnpm turbo test typecheck` + `pnpm biome ci .` — all exit 0 (Biome reports nine pre-existing warnings, no errors).

## Phase 3: Contractual Benchmark Rerun (S01–S07)

- [x] 3.1 Re-run `BENCHMARK_DATABASE_URL=… pnpm --filter @ganaweb/db benchmark:animal-listado` on isolated PG17 (existing runner + v2 fixture from `benchmark-issue-115-animal-list-p95`).
- [x] 3.2 Capture S01–S07 p95 samples, 21 plans (3 per scenario), LA-103 statements, environment/checksum.
- [x] 3.3 Publish new receipt `packages/db/benchmark-runs/rf-anim-list-11-v2-1785182475584/` with explicit pass; all S01–S07 p95 are < 400 ms.
- [x] 3.4 Verify prior v1 + earlier v2 receipts are byte-identical (un-touched).
- [x] 3.5 Capture S02 `EXPLAIN (ANALYZE, BUFFERS)`; confirm LATERAL executes 100×, not 900×.

## Phase 4: Conditional INCLUDE Index (Only if S02 ≥ 400 ms)

- [x] 4.1 Add the minimal, separately justified LA-102 correction: recreate `idx_animales_finca_activo_codigo` with `INCLUDE (id)` so the CTE can index-only scan its selected id without a sort. This is not a latency-gate migration.
- [x] 4.2 Apply the migration to the isolated PG17 target and issue a fresh immutable run `rf-anim-list-11-v2-1785183798775/`; prior receipts remain untouched.
- [x] 4.3 CTE-only latency still clears LA-100; the INCLUDE exists solely for the mandatory ordered-plan assertion.

## Phase 5: Documentation and Evidence Publication

- [x] 5.1 Update `apply-progress.md` with CTE diff summary, 25/25 result, LA-103 evidence, corrected v2 receipt path, and LA-102-only INCLUDE rationale.
- [x] 5.2 Update `packages/db/README.md` and `proposal.md` success-criteria checklist with v2 receipt path + S01–S07 outcomes.
- [x] 5.3 Publish evidence to repo docs/issue-115 location (the immutable `packages/db/benchmark-runs/rf-anim-list-11-v2-1785182475584/` receipt).
- [x] 5.4 Hand off to `sdd-verify` — the fresh S02 CTE plan uses an ordered `idx_animales_finca_activo_codigo` index-only scan, has no inner CTE sort, and preserves LA-103 = 3.
