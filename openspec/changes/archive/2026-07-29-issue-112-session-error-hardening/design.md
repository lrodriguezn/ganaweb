# Design: Session Error Hardening & Concurrent Index Deployment (Issue #112)

## Technical Approach

Two independent phases. **Phase 1** widens the existing try/catch in `createAnimalListadoHttpHandler` to wrap `getUsuarioId()`, reusing the current 500 `ApiErrorDto` mapping. **Phase 2** adds a standalone TypeScript script (following the `vacuum-analyze.ts` pattern) that runs `CREATE INDEX CONCURRENTLY` outside any transaction via `psql`/`postgres-js`, with `indisvalid` checks and `REINDEX CONCURRENTLY` recovery.

## Architecture Decisions

| Decision | Options | Tradeoff | Choice |
|----------|---------|----------|--------|
| Session boundary fix | (A) Local restructure of try/catch; (B) Shared error-wrapper middleware | B adds abstraction for one call site; A is 5-line diff preserving existing patterns | **A — local restructure** |
| Error mapping | (A) Generic 500 `ApiErrorDto`; (B) Distinct `SessionError` class | B leaks infra details to clients, requires new contract surface; A reuses sanitized envelope | **A — generic 500** (proposal Approach A) |
| Concurrent index delivery | (A) drizzle-kit migration; (B) Standalone script | drizzle-kit wraps in transactions → CONCURRENTLY fails; B matches `vacuum-analyze.ts` precedent | **B — standalone script** |
| Script language | (A) Raw `.sql` + README; (B) TypeScript script | B enables `indisvalid` checks, idempotency logic, exit codes; matches existing `scripts/vacuum-analyze.ts` | **B — TypeScript** |

## Data Flow

### Phase 1 — Session error boundary

```
Request ──→ parseQuery ──→ [400 if invalid]
                │
                ▼
         try { getUsuarioId(fincaId) }  ←── MOVED INSIDE
                │
         null ──→ 403 forbiddenResponse
                │
         readPort.listar() ──→ 200 JSON
                │
         catch ──→ isForbidden? ──→ 403
                │
                └──→ reportError + 500 ApiErrorDto
```

### Phase 2 — Concurrent index script

```
concurrent-index-deploy.ts
    │
    ├─ Check pg_index.indisvalid for target indexes
    │   ├─ invalid found → DROP INDEX CONCURRENTLY → REINDEX CONCURRENTLY
    │   └─ valid → skip
    │
    ├─ CREATE INDEX CONCURRENTLY IF NOT EXISTS (each target)
    │
    └─ Verify indisvalid = true → exit 0 | exit 1
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/web/src/server/animal-list-http.ts` | Modify | Move `getUsuarioId` + null-check inside try/catch (lines 27-28 → inside line 30 block) |
| `apps/web/tests/animal-list-server-contract.test.ts` | Modify | Add `getUsuarioId` throw → 500 + `reportError` called; RBAC regression: no 200 without session |
| `packages/db/scripts/concurrent-index-deploy.ts` | Create | Idempotent CONCURRENTLY build + `indisvalid` recovery, following `vacuum-analyze.ts` pattern |
| `packages/db/tests/concurrent-index-deploy-source.test.ts` | Create | Source-invariant: asserts no `sql.begin`/transaction wrapper (like `vacuum-analyze-script-source.test.ts`) |
| `packages/db/tests/animal-list-indexes.test.ts` | Modify | Extend: assert script file exists, contains CONCURRENTLY, no transaction |
| `packages/db/README.md` | Modify | Add runbook section: execution command, recovery procedure, `indisvalid` diagnostic query |

## Interfaces / Contracts

No new public interfaces. Phase 1 changes only the internal control flow of `createAnimalListadoHttpHandler` — the `AnimalListadoHttpDependencies` interface and `ApiErrorDto` contract are unchanged.

Phase 2 script contract (CLI):

```typescript
// Exit codes: 0 = all indexes valid, 1 = failure or invalid after build
// Env: DATABASE_URL required (same pattern as vacuum-analyze.ts)
// Target indexes: idx_animales_finca_activo_codigo, idx_pesos_animal_fecha_id
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `getUsuarioId` throw → 500 `ApiErrorDto` with `requestId`; `reportError` called | Extend `testHttpContract()` in `animal-list-server-contract.test.ts` — mock `getUsuarioId` to reject |
| Unit | RBAC fail-closed: no 200 when session throws | Same file — assert status !== 200 for all `getUsuarioId` failure modes |
| Unit | 400 short-circuit still skips `getUsuarioId` | Existing `sessionReads === 0` assertion already covers this |
| Source-invariant | Script has no transaction wrapper | `concurrent-index-deploy-source.test.ts`: read source, assert no `sql.begin`, no `BEGIN` |
| Snapshot | Migration 0002 unchanged | Existing `animal-list-indexes.test.ts` — no modification needed |
| Integration | Script idempotency on disposable PG 17 | Manual: run twice on disposable DB, verify `indisvalid = true`, exit 0. Cannot automate in CI (CONCURRENTLY needs real PG outside transaction) |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. The HTTP handler change is internal control flow; the script is a DBA ops tool run manually via `pnpm --filter`.

## Migration / Rollout

- **Phase 1**: Zero-migration code change. Deploy normally. Rollback: revert commit.
- **Phase 2**: Additive (indexes only). Run script manually during maintenance window:
  ```sh
  DATABASE_URL='postgresql://...' pnpm --filter @ganaweb/db concurrent-index-deploy
  ```
  Rollback: `DROP INDEX CONCURRENTLY` if needed. Invalid indexes don't affect query correctness — PostgreSQL ignores them in planning.
- Migration 0004 already dropped and recreated `idx_animales_finca_activo_codigo` with `INCLUDE (id)`. The script targets the covering-index state post-0004.

## Open Questions

None — all decisions resolved by codebase evidence and proposal constraints.
