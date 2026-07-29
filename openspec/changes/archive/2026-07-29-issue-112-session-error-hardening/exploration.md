## Exploration: issue-112-session-error-hardening

### Current State

The animal listado endpoint lives in `apps/web/src/routes/api/fincas/$fincaId/animales.ts` and delegates to `createAnimalListadoHttpHandler` (in `apps/web/src/server/animal-list-http.ts`).

**Problem 1 — Session resolution outside try/catch:**

In `animal-list-http.ts` (lines 17–41), the handler flow is:

```
1. Generate requestId
2. Parse query params (returns 400 on failure — safe)
3. await deps.getUsuarioId(fincaId)   ← OUTSIDE try/catch
4. if (!usuarioId) return 403
5. try { readPort.listar(...) } catch { → 500 with ApiErrorDto }
```

The `getUsuarioId` call at line 27 is **outside** the `try/catch` block (lines 30–40). If `obtenerSesionActual` (in `packages/aplicacion/src/casos-uso/auth/sesiones.ts`) throws due to PostgreSQL degradation (e.g., connection pool exhaustion, query timeout), the exception escapes unhandled — no `ApiErrorDto`, no correlated `requestId` in the response, no `reportError` telemetry.

The route file (`animales.ts` lines 15–17) wires `getUsuarioId` to call `obtenerSesionActual(getAuthDeps())(readSessionToken(), fincaId)`, which performs two DB queries: `obtenerSesionPorTokenHash` and `obtenerAutorizacionUsuario`. Both are vulnerable to PG failures.

**Problem 2 — Blocking CREATE INDEX in migrations:**

Migration `0002_animal_list_indexes.sql`:
```sql
CREATE INDEX "idx_animales_finca_activo_codigo" ON "animales" USING btree ("finca_id", "activo", "codigo");
CREATE INDEX "idx_pesos_animal_fecha_id" ON "pesos" USING btree ("animal_id", "fecha" DESC, "id" DESC);
```

Migration `0004_animal_list_page_index_covering.sql`:
```sql
DROP INDEX "idx_animales_finca_activo_codigo";
CREATE INDEX "idx_animales_finca_activo_codigo" ON "animales" USING btree ("finca_id", "activo", "codigo") INCLUDE ("id");
```

Both use conventional `CREATE INDEX`, which in PostgreSQL acquires a `SHARE` lock on the table — blocking all writes (INSERT/UPDATE/DELETE) for the duration of index construction. On populated tables (`animales`, `pesos`), this can cause significant downtime.

No migration in the project uses `CREATE INDEX CONCURRENTLY` (grep confirmed zero matches).

**Error handling pattern used elsewhere:**

The handler's `try/catch` block (lines 30–40) already demonstrates the correct pattern:
- Generate `requestId` via `deps.requestId()`
- Map unexpected errors to `apiError("Error interno", null, "No fue posible consultar los animales", requestId)` returning 500
- Call `deps.reportError({ requestId, fincaId, error })` for telemetry
- Return `ApiErrorDto` with shape `{ error, campo, motivo, requestId }`

This same pattern should wrap session resolution.

**Other handlers (animal-actions.server.ts):**

The `createAnimalActionHarness` pattern uses `getAuthorizedSession()` (line 1032–1040) which also calls `obtenerSesionActual` — but in that case, failures propagate to TanStack Start's `createServerFn` error boundary, which is a different failure mode (server function, not HTTP API). The HTTP API endpoint is the one that needs hardening because it has a contractual `ApiErrorDto` response shape.

### Affected Areas

- `apps/web/src/server/animal-list-http.ts` — The handler must move `getUsuarioId` inside the try/catch boundary. Session failures must map to `ApiErrorDto` with `requestId` and `reportError`.
- `apps/web/src/routes/api/fincas/$fincaId/animales.ts` — Route wiring; no structural change needed, but the `getUsuarioId` callback's error behavior changes (now caught by handler).
- `apps/web/tests/animal-list-server-contract.test.ts` — Existing tests cover `getUsuarioId` returning `null` (403) and `readPort.listar` rejecting (500). Must add tests for `getUsuarioId` throwing (session degradation).
- `packages/db/migrations/0002_animal_list_indexes.sql` — Already applied in production. Cannot be modified retroactively.
- `packages/db/migrations/0004_animal_list_page_index_covering.sql` — Already applied. Cannot be modified retroactively.
- `packages/db/tests/animal-list-indexes.test.ts` — Snapshot test that locks migration 0002 content. Must be updated if a new migration is added.
- A new migration file (e.g., `0005_...`) will be needed for `CONCURRENTLY` re-indexing.

### Approaches

#### Approach A — Widen the try/catch in the handler (Recommended)

Move `deps.getUsuarioId(fincaId)` inside the existing `try/catch` block. Session/authorization failures become 500 `ApiErrorDto` responses with `requestId` and `reportError` telemetry.

- **Pros:** Minimal change (move one line inside the block). Reuses the existing error contract. No new abstractions. Preserves RBAC — `null` return still maps to 403.
- **Cons:** Conflates "session resolution failure" (infrastructure) with "listing failure" (business). Both return 500 with the same generic message. Acceptable because the `ApiErrorDto` contract already hides internal details.
- **Effort:** Low

#### Approach B — Separate try/catch for session with distinct error mapping

Wrap `getUsuarioId` in its own `try/catch` that maps session failures to a distinct `ApiErrorDto` (e.g., `error: "Error de sesión"`). Keep the listing `try/catch` separate.

- **Pros:** More granular error classification. Easier to monitor session failures separately.
- **Cons:** Expands the `ApiErrorDto` contract surface. The client already treats all 500s as "retry or show generic error" — the distinction adds complexity without client-side benefit.
- **Effort:** Low-Medium

#### Approach C — Non-transactional migration with CONCURRENTLY

For the index problem, create a new migration (`0005_*`) that:
1. Drops the existing indexes (already done by 0004 for one; 0002's `idx_pesos_animal_fecha_id` remains).
2. Recreates them with `CREATE INDEX CONCURRENTLY`.

**Key constraint:** `CREATE INDEX CONCURRENTLY` cannot run inside a transaction block. Drizzle Kit's `drizzle-kit migrate` wraps each migration file in a transaction by default. This means:

- Option C1: Use a raw SQL migration file with explicit `BEGIN;` / `COMMIT;` only around non-concurrent statements, leaving `CREATE INDEX CONCURRENTLY` outside any transaction. This requires verifying that `drizzle-kit migrate` respects the absence of a wrapping transaction (it does NOT — it always wraps).
- Option C2: Provide a separate SQL script (not managed by drizzle-kit) to be run manually via `psql` during deployment. Document it in the change's deployment notes.
- Option C3: Use `drizzle-kit migrate` with a custom migration runner that detects `CONCURRENTLY` and skips the transaction wrapper.

- **Pros (C2 simplest):** No framework changes. Explicit operational control. Can include validation (`REINDEX` if index is invalid).
- **Cons:** Manual step in deployment pipeline. Must document and test.
- **Effort:** Medium

#### Approach D — Index recovery and validation

Add a post-migration check (or a dedicated maintenance query) that:
1. Queries `pg_index` for indexes with `indisvalid = false` (invalid indexes from interrupted `CONCURRENTLY` builds).
2. Drops invalid indexes and retries with `REINDEX CONCURRENTLY`.

This can be a SQL script or a database health-check endpoint.

- **Pros:** Addresses the "interrupted concurrent build" recovery requirement from the issue.
- **Cons:** Adds operational complexity. Could be a separate change.
- **Effort:** Medium

### Recommendation

**Phase 1 (this change):** Approach A — move `getUsuarioId` inside the try/catch. Add tests for session degradation. This is a focused, low-risk fix that closes the error-handling gap.

**Phase 2 (separate change or same PR):** Approach C2 — create a new migration `0005_*` with `CREATE INDEX CONCURRENTLY` as a standalone SQL script documented for manual execution. Include a recovery query for invalid indexes.

**Rationale:** The session error hardening is a code-only change with clear tests. The migration change is an operational concern that requires deployment coordination. Combining them in one change is possible but increases risk — the issue explicitly says "Evaluar y documentar" for the migration, suggesting it's a secondary deliverable.

### Risks

- **RBAC weakening:** Moving `getUsuarioId` inside try/catch does NOT weaken RBAC. A session failure returns 500 (not 403 or 200). The authorization check (`decision.tipo === "autorizado"`) still happens inside `getUsuarioId`. If it throws, the user gets no access — fail-closed.
- **Finca isolation:** The `fincaId` parameter is passed to `obtenerSesionActual` for authorization scoping. This is unchanged — the isolation boundary is in `obtenerAutorizacionUsuario`, not in the handler.
- **Migration reversibility:** `CREATE INDEX CONCURRENTLY` is reversible (`DROP INDEX CONCURRENTLY`). If the new index fails to build, the old one is already dropped (in migration 0004). Recovery: `REINDEX CONCURRENTLY`.
- **Drizzle Kit transaction wrapping:** `drizzle-kit migrate` wraps each migration in a transaction. `CONCURRENTLY` inside a transaction fails with `PGError: CREATE INDEX CONCURRENTLY cannot run inside a transaction block`. This MUST be handled by either a manual script or a custom runner.
- **Existing test snapshot:** `animal-list-indexes.test.ts` line 15–16 asserts the exact content of migration 0002. Adding a new migration does not break this test, but the test should be extended to cover the new migration.

### Ready for Proposal

**Yes.** The exploration reveals a clear, minimal fix for Problem 1 (move one call inside a try/catch + add tests) and a well-scoped operational path for Problem 2 (new migration with CONCURRENTLY + manual execution script). The orchestrator should proceed to the proposal phase.

The proposal should cover:
1. Moving `getUsuarioId` inside the try/catch in `animal-list-http.ts`
2. Adding test cases for session/authorization degradation (getUsuarioId throws)
3. A new migration file with `CREATE INDEX CONCURRENTLY` (or a documented manual script)
4. A recovery procedure for invalid indexes
