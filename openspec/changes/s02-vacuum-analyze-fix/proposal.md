# Proposal: S02 Visibility-Map Fix via VACUUM ANALYZE

## Intent

Close the S02 p95 gap on the existing covering index `idx_animales_finca_activo_codigo INCLUDE (id)` (migration `0004_animal_list_page_index_covering.sql`). The index exists, but PostgreSQL needs the **visibility map** primed for `Index Only Scan` — and **only `VACUUM` sets the visibility map** (`ANALYZE` only updates planner stats). Diagnostics on a fresh PG 17 disposable target (`packages/db/s02-diag-*.json`) confirm: `relallvisible=0` pre-`VACUUM` and a named `Index Only Scan` with `Heap Fetches: 0` post-`VACUUM ANALYZE`. The fix is **operational**, not a code refactor.

## Scope

### In Scope

- `packages/db/scripts/vacuum-analyze.ts` — new; `VACUUM (ANALYZE) animales` **outside any transaction**.
- `packages/db/package.json` — new `vacuum:analyze` npm script.
- `packages/db/tests/vacuum-analyze-postgres.test.ts` — new red-green regression on a fresh PG 17 disposable fixture.
- `packages/db/README.md` — short operator note.

### Out of Scope

- Endpoint, DTO, filter grammar, sort matrix, predicates, mapping, catalog ports, schema, `animal-infrastructure.ts`, migration `0004`, the benchmark runner, the two blocked OpenSpec changes, and their receipts — unchanged.
- Forcing planner GUCs or weakening LA-102. `VACUUM FULL`, `REINDEX`, table rewrites, autovacuum tuning.

## Capabilities

### New Capabilities

- `animal-list-vacuum-maintenance`: Operational contract for priming the visibility map so the existing covering index serves S02 as `Index Only Scan`. Defines the script entry point, SQL, npm wiring, disposable-fixture test, and plan assertions.

### Modified Capabilities

None. `animal-listado-server-contract` and `animal-listado-performance-benchmark` are **measured, not behaviorally changed**. LA-100/102/103 and `uq_animales_finca_codigo` (RN-001) are not redefined here.

## Approach

Open a dedicated `postgres-js` client with **no `BEGIN`**, issue `VACUUM (ANALYZE) <table>` per table, close. The regression test is a strict-TDD red-green flow: reset disposable PG 17, load all migrations + `rf-anim-list-11-v2` fixture, capture pre-script S02 plan and assert it is **not** the named `Index Only Scan` (red), invoke the script, re-execute S02 and assert the named plan + `lastStatementCount === 3` (green). No planner GUCs are set; the assertion holds against the unmodified covering index. Gating reuses `assertDisposableBenchmarkTarget`.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `packages/db/scripts/vacuum-analyze.ts` | New | Maintenance script; no transaction. |
| `packages/db/package.json` | Modified | Adds `vacuum:analyze` npm script. |
| `packages/db/tests/vacuum-analyze-postgres.test.ts` | New | Red-green disposable-fixture regression. |
| `packages/db/README.md` | Modified | Short operator note. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| `VACUUM` taken inside a transaction (PG rejects) | Low | Dedicated client, no `BEGIN`; lint-forbid `sql.begin` in script. |
| Maintenance lock blocks writes on large tables | Med | Plain `VACUUM (ANALYZE)`, not `VACUUM FULL`; document autovacuum-window respect. |
| Plan shape drifts if fixture distribution changes | Low | Test re-seeds `rf-anim-list-11-v2`; assertion is on plan shape, not timing. |

## Rollback Plan

Delete `scripts/vacuum-analyze.ts`, the `vacuum:analyze` npm entry, the new test, and the README note. `VACUUM (ANALYZE)` is non-destructive: no DB-side effect to reverse. No migration added/removed; blocked changes' receipts remain byte-identical.

## Dependencies

- Merged `benchmark-issue-115-animal-list-p95` fixture, runner, disposable-DB guards, `assertDisposableBenchmarkTarget`.
- PG 17 with `public.unaccent`, `es_CO.UTF-8`, literal UTC, all five migrations applied.
- `postgres-js` (already a `@ganaweb/db` dependency).

## Success Criteria

- [ ] Red test: pre-`VACUUM` S02 plan on fresh PG 17 disposable DB is **not** the named `Index Only Scan` with `Heap Fetches: 0`.
- [ ] Green test: post-`VACUUM` S02 plan is the named `Index Only Scan` on the covering index with `Heap Fetches: 0`, no inner `Sort` in `pagina` CTE, `lastStatementCount === 3` (LA-103).
- [ ] `pnpm --filter @ganaweb/db vacuum:analyze` documented and runnable against `DATABASE_URL` without a transaction error.
- [ ] `pnpm turbo test typecheck` and `biome ci .` pass; existing 25/25 integration tests green.
- [ ] Blocked changes and their receipts remain byte-identical; no planner GUC is set.
