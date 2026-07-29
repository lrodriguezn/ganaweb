# Tasks: Session Error Hardening & Concurrent Index Deployment (Issue #112)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~280–320 |
| 400-line budget risk | Low |
| 800-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR, 2 commits (independent phases; optional 2 stacked PRs) |
| Delivery strategy | auto-chain |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low
800-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Session errors caught inside boundary → sanitized 500, fail-closed | Commit 1 | `pnpm --filter @ganaweb/web test animal-list-server-contract` | N/A — control-flow restructure proven by mocked-dep contract test; no server/DB boundary | Revert `animal-list-http.ts` + test additions; db package untouched |
| 2 | Idempotent CONCURRENTLY index build/recovery script + runbook | Commit 2 | `pnpm --filter @ganaweb/db test concurrent-index-deploy animal-list-indexes` | Manual disposable PG 17: `DATABASE_URL='...' pnpm --filter @ganaweb/db concurrent-index-deploy` ×2 → exit 0, `indisvalid=true` | `DROP INDEX CONCURRENTLY` + revert script/tests/README/package.json; web package untouched |

## Phase 1: Session Error Boundary (apps/web)

- [x] 1.1 RED — `apps/web/tests/animal-list-server-contract.test.ts`: in `testHttpContract()`, mock `getUsuarioId` to reject; assert `500` + sanitized `ApiErrorDto` (`Error interno`, `campo:null`, `requestId`), `reportError` called once. Fails now.
- [x] 1.2 RED — same file: fail-closed case — `getUsuarioId` rejects; assert `status !== 200`, `listingReads === 0` (no data read).
- [x] 1.3 GREEN — `apps/web/src/server/animal-list-http.ts`: move `getUsuarioId(fincaId)` + null-check (lines 27–28) INSIDE `try`; keep `isForbidden→403`, `reportError→500`; 400 short-circuit stays before try.
- [x] 1.4 Verify — `pnpm --filter @ganaweb/web test`: new 500/fail-closed pass AND existing 400 (`sessionReads===0`), 403, 200 still pass (PE-001/002/003 unchanged).

## Phase 2: Concurrent Index Deployment (packages/db)

- [x] 2.1 RED — create `packages/db/tests/concurrent-index-deploy-source.test.ts` (follow `vacuum-analyze-script-source.test.ts`): assert script exists, contains `CONCURRENTLY`, no `.begin(`/`BEGIN`. Fails (absent).
- [x] 2.2 RED — extend `packages/db/tests/animal-list-indexes.test.ts`: assert script exists, contains `CREATE INDEX CONCURRENTLY` + `REINDEX CONCURRENTLY`, references `pg_index.indisvalid`, no transaction wrapper.
- [x] 2.3 GREEN — create `packages/db/scripts/concurrent-index-deploy.ts` (follow `vacuum-analyze.ts`): needs `DATABASE_URL`; for `idx_animales_finca_activo_codigo` + `idx_pesos_animal_fecha_id` check `indisvalid`; invalid → `DROP INDEX CONCURRENTLY` + `REINDEX CONCURRENTLY`; absent → `CREATE INDEX CONCURRENTLY IF NOT EXISTS`; verify valid; exit 0/1; no transaction.
- [x] 2.4 GREEN — add `concurrent-index-deploy` script to `packages/db/package.json` (`tsx scripts/concurrent-index-deploy.ts`).
- [x] 2.5 REFACTOR — `packages/db/README.md`: runbook section — execution command, `indisvalid` diagnostic query, recovery procedure, `DROP INDEX CONCURRENTLY` rollback, "never via drizzle-kit migrate".

## Phase 3: Verification & Manual Integration

- [x] 3.1 `pnpm turbo test` — all packages green (web contract + db source-invariant + indexes).
- [x] 3.2 Manual disposable PG 17: run script twice → both exit 0, `indisvalid=true`, second run no-op (spec: re-run no-op).
- [x] 3.3 Manual recovery: leave invalid index (`indisvalid=false`), run → drop + `REINDEX CONCURRENTLY`, valid, exit 0 (spec: interrupted build recovered).
- [x] 3.4 Manual RBAC/rollback: animal-list authorization identical post-deploy; `DROP INDEX CONCURRENTLY` keeps queries correct (spec: additive + reversible).
