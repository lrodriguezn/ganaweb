# `animal-list-vacuum-maintenance`

## Purpose

Operational contract for priming the visibility map so the existing covering index `idx_animales_finca_activo_codigo INCLUDE (id)` (migration `0004`) serves S02 as `Index Only Scan`. Defines the script, SQL, npm wiring, disposable-fixture test, and strict plan assertions. Purely operational: no planner GUCs, no redefinition of LA-100/102/103 or RN-001, no modification of the two referenced capabilities.

## Requirements

### Requirement: VACUUM ANALYZE Script Outside Any Transaction

`packages/db/scripts/vacuum-analyze.ts` MUST open a dedicated `postgres-js` client from `DATABASE_URL`, issue `VACUUM (ANALYZE) animales` (plus S02-relevant tables), and close it. The script MUST NOT call `sql.begin` or wrap the call in a transaction; a Biome rule MUST forbid `sql.begin` here. The script, test, and helpers MUST NOT set or override planner GUCs.

#### Scenario: VACUUM inside a transaction is rejected

- GIVEN a `postgres-js` client that has called `BEGIN`
- WHEN `VACUUM (ANALYZE) animales` is issued
- THEN PostgreSQL returns a "VACUUM cannot run inside a transaction block" error
- AND the script is lint-checked to never call `sql.begin`.

### Requirement: Strict Red-Green Disposable-Fixture Test

A new Vitest test `packages/db/tests/vacuum-analyze-postgres.test.ts` MUST run on a fresh PG 17 disposable fixture (migrations + `rf-anim-list-11-v2`), gated by `assertDisposableBenchmarkTarget` (reused, not duplicated). It MUST capture `EXPLAIN (ANALYZE, BUFFERS)` of S02 and assert the plan is NOT `Index Only Scan` on `idx_animales_finca_activo_codigo` with `Heap Fetches: 0` (red). After running the script, it MUST assert the plan IS that IOS with `Heap Fetches: 0`, no inner `Sort` in the `pagina` CTE, and `lastStatementCount === 3` (LA-103). Since `assertS02OrderedCompositeIndexPlan` accepts both scan types, this delta REQUIRES a new helper (or parallel assertion) that asserts `Index Only Scan` strictly.

#### Scenario: Pre-VACUUM S02 plan is not the named IOS (red)

- GIVEN a fresh PG 17 disposable DB with migrations and `rf-anim-list-11-v2`
- WHEN `EXPLAIN (ANALYZE, BUFFERS)` of S02 runs before the script
- THEN the plan is NOT `Index Only Scan` on `idx_animales_finca_activo_codigo` with `Heap Fetches: 0`.

#### Scenario: Post-VACUUM S02 plan is the named IOS (green)

- GIVEN the same fresh PG 17 disposable DB
- WHEN the script runs and the same `EXPLAIN` is captured
- THEN the plan IS `Index Only Scan` on `idx_animales_finca_activo_codigo` with `Heap Fetches: 0`
- AND the `pagina` CTE has no inner `Sort`
- AND `lastStatementCount` equals 3.

### Requirement: npm Entry Point and Operator Note

`packages/db/package.json` MUST expose `vacuum:analyze` wired to the script, and `packages/db/README.md` MUST contain a short operator note listing trigger conditions (post-bulk-load, post-backfill, S02 plan regression). The script MUST exit 0 without a transaction error against the disposable DB.

#### Scenario: npm script completes cleanly

- GIVEN `DATABASE_URL` set to the disposable DB
- WHEN `pnpm --filter @ganaweb/db vacuum:analyze` runs
- THEN it exits 0 without a transaction error.

#### Scenario: README points operators at the script

- GIVEN `packages/db/README.md`
- WHEN an operator searches for "vacuum" or "analyze"
- THEN the note is present and points at the npm script.

### Requirement: Non-Destructive Rollback and CI Gates

`VACUUM (ANALYZE)` is non-destructive: rollback deletes only the script, the npm entry, the test, and the README note. The two blocked changes and their receipts MUST remain byte-identical. `pnpm turbo test`, `pnpm turbo typecheck`, and `biome ci .` MUST pass; 25/25 integration tests MUST stay green. `animal-infrastructure.ts`, migration `0004`, the benchmark runner, and the two blocked changes MUST NOT be modified.

#### Scenario: Rollback leaves no DB-side effect and CI stays green

- GIVEN the script has run once
- WHEN the script, npm entry, test, and README note are deleted
- THEN no migration, table, or row is changed
- AND the two blocked changes' receipts are byte-identical
- AND `pnpm turbo test typecheck` and `biome ci .` exit 0 with 25/25 green.

## Rule Citations

- RN-001 — `uq_animales_finca_codigo` uniqueness preserved.
- LA-100/102/103, S01–S07, benchmark fixtures — referenced, not redefined.
- Migration `0004`, `animal-infrastructure.ts`, benchmark runner, the two blocked changes and receipts — untouched.
