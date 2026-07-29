# Proposal: Session Error Hardening & Concurrent Index Deployment (Issue #112)

## Intent

- `getUsuarioId()` (`animal-list-http.ts:27`) runs OUTSIDE the try/catch (lines 30–40): PG degradation during session resolution escapes without `ApiErrorDto`, `requestId`, or `reportError`.
- Migrations 0002/0004 use blocking `CREATE INDEX` (SHARE lock halts writes); no recovery for invalid builds.

## Scope

### In Scope
- Session resolution inside the error boundary; failure → sanitized 500 `ApiErrorDto` with `requestId` + `reportError`
- Tests for session/authorization degradation (`getUsuarioId` throws)
- Non-transactional `CREATE INDEX CONCURRENTLY` script (manual `psql`, outside `drizzle-kit migrate`)
- Documented invalid-index recovery (`pg_index.indisvalid=false`)

### Out of Scope
- Rewriting migrations 0002/0004 (already in production)
- `animal-actions.server.ts` functions (different failure mode)
- CI/CD automation; GUCs/vacuum (`animal-list-vacuum-maintenance`)

## Capabilities

### New Capabilities
- `db-concurrent-index-deployment`: non-transactional CONCURRENTLY deployment, invalid-index detection, recovery contract

### Modified Capabilities
- `animal-listado-server-contract`: session resolution MUST occur inside the error boundary; failures MUST return sanitized `ApiErrorDto` (fail-closed: throw → 500, never access bypass)

## Approach

- **Phase 1 (code)**: widen try/catch to wrap `getUsuarioId`; reuse current 500 mapping (exploration Approach A). RBAC/finca isolation unchanged — authorization resolves inside `obtenerSesionActual`; a throw denies access.
- **Phase 2 (ops)**: standalone SQL script via `psql`, outside any transaction (drizzle-kit always wraps → CONCURRENTLY fails). Idempotent: check `indisvalid`, drop invalid, `REINDEX CONCURRENTLY`. README note.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/web/src/server/animal-list-http.ts` | Modified | `getUsuarioId` inside try/catch |
| `apps/web/tests/animal-list-server-contract.test.ts` | Modified | throw → 500 cases |
| `packages/db/scripts/` (new) | New | Concurrent build + recovery |
| `packages/db/tests/animal-list-indexes.test.ts` | Modified | Extended for script |
| `packages/db/README.md` | Modified | Execution + recovery runbook |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| CONCURRENTLY in drizzle-kit transaction fails | High | Manual `psql` script; test asserts no transaction |
| Interrupted build leaves invalid index | Medium | `indisvalid` check + `REINDEX CONCURRENTLY` retry |
| Perceived RBAC weakening | Low | Fail-closed 500; test: no 200 without session |

## Rollback Plan

- Phase 1: revert handler commit — restores current behavior, zero data impact
- Phase 2: additive (indexes only); `DROP INDEX CONCURRENTLY` if needed; invalid indexes don't affect correctness. 0004 already dropped the prior index — recovery assumes covering-index state

## Dependencies

- PostgreSQL 17; production `psql` access

## Success Criteria

- [ ] `getUsuarioId` throw → 500 `ApiErrorDto` with `requestId`; `reportError` called
- [ ] RBAC/finca isolation regression tests green
- [ ] Concurrent script: outside transaction, exits 0, idempotent on disposable PG 17
- [ ] `pnpm turbo test`, `typecheck`, `biome ci .` green

## Rule Citations

- PE-001/PE-002/PE-003 — permission gating and per-finca resolution unchanged; only catch location moves
- RN-001 — `uq_animales_finca_codigo` untouched
