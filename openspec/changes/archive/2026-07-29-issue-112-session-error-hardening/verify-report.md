```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:f761872ace9bee4a859310ef6b0c87bdbc2d90f6efe970e26ae96eba67841c76
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 4/4
scenarios: 10/10
test_command: pnpm turbo test --filter=@ganaweb/web --filter=@ganaweb/db --force
test_exit_code: 0
test_output_hash: sha256:f761872ace9bee4a859310ef6b0c87bdbc2d90f6efe970e26ae96eba67841c76
build_command: pnpm turbo build --filter=@ganaweb/web --filter=@ganaweb/db --force
build_exit_code: 0
build_output_hash: sha256:1cbffd9359405b0896d3bfb762246438036c6e8d58369f41d3abe57483219ed8
```

## Verification Report

**Change**: issue-112-session-error-hardening
**Version**: N/A
**Mode**: Strict TDD

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 13 |
| Tasks complete | 13 |
| Tasks incomplete | 0 |

All 13 tasks are checked in `tasks.md` (Phase 1: 1.1–1.4; Phase 2: 2.1–2.5; Phase 3: 3.1–3.4). Branch `feat/issue-112-session-error-hardening` is 4 commits ahead of master; working tree clean.

### Build & Tests Execution
**Build**: ✅ Passed
```text
pnpm turbo build --filter=@ganaweb/web --filter=@ganaweb/db --force
@ganaweb/db:build  > tsc --noEmit            → clean (no output)
@ganaweb/web:build > tsr generate && vite build → ✓ built (client + ssr)
Tasks: 7 successful, 7 total | Cached: 0 | exit 0
```
Non-fatal noise (pre-existing, unrelated to this change): vite "Can't resolve original location of error" sourcemap-reporting lines and a >500 kB chunk-size warning. Build still exits 0.

**Tests**: ✅ all passed (fresh, cache-bypassed run)
```text
pnpm turbo test --filter=@ganaweb/web --filter=@ganaweb/db --force
@ganaweb/web:test > ✅ animal-list-server-contract.test.ts passed
                    + vitest animal-create-e2e 1 passed
@ganaweb/db:test  > 12 files passed | 2 skipped (DB_SMOKE-gated)
                    73 passed | 3 skipped (76)
                    incl. concurrent-index-deploy-source.test.ts (3) ✅
                          animal-list-indexes.test.ts (3) ✅
Tasks: 8 successful, 8 total | Cached: 0 | exit 0
```
Note: a prior `pnpm turbo test` (whole repo) returned FULL TURBO cache replay (exit 0, 13/13). The forced run above re-executed the two changed packages from scratch to produce genuine runtime evidence and a real output hash.

**Coverage**: ➖ Not run for changed files in isolation. Whole-suite db run reports 73 passed / 3 skipped (DB_SMOKE-gated). No coverage threshold configured for this change.

### Spec Compliance Matrix
| Requirement | Scenario | Test / Evidence | Result |
|-------------|----------|-----------------|--------|
| Session Resolution Executes Inside the Error Boundary | Degraded session resolution returns sanitized 500 | `animal-list-server-contract.test.ts > testHttpContract` (degradedSession: status 500, sanitized `Error interno` body, `reportError`×1, no `password=secret` leak) | ✅ COMPLIANT |
| Session Resolution Executes Inside the Error Boundary | Fail-closed — no 200 without an authorized session | `testHttpContract` (degradedSession: `assert.notEqual(status,200)`, `degradedListingReads === 0`) | ✅ COMPLIANT |
| Session Resolution Executes Inside the Error Boundary | Authorization denial remains fail-closed | `testHttpContract` (forbiddenSession: `getUsuarioId` throws "forbidden" → 403, `reportError`×0, `listingReads === 0`; plus readPort-reject "forbidden" → 403) | ✅ COMPLIANT |
| Session Resolution Executes Inside the Error Boundary | Healthy session is unaffected | `testHttpContract` (valid session → 200, `cols` echo, 37-key row shape, nullable fields) | ✅ COMPLIANT |
| Non-Transactional Concurrent Index Build | Concurrent build runs outside a transaction | Source-invariant `concurrent-index-deploy-source.test.ts` (CREATE INDEX CONCURRENTLY present; no `.begin(`/`BEGIN`) ✅ automated + manual disposable PG 17 Run1 (fresh build, `indisvalid=true`, exit 0) | ✅ COMPLIANT |
| Non-Transactional Concurrent Index Build | Script is not run through drizzle-kit migrate | `packages/db/README.md` runbook ("Never via drizzle-kit migrate") + script header comment; migration 0002 unchanged (`animal-list-indexes.test.ts`) | ✅ COMPLIANT (documentation/inspection) |
| Idempotent Invalid-Index Detection and Recovery | Re-run on a valid index is a no-op | Source: `readIndisvalid()===true → no-op return` + manual disposable PG 17 Run2 (already-valid → no-op, exit 0) | ✅ COMPLIANT (manual harness) |
| Idempotent Invalid-Index Detection and Recovery | Interrupted build is detected and recovered | Source: `indisvalid=false → DROP INDEX CONCURRENTLY → CREATE/REINDEX CONCURRENTLY → re-verify` + manual Run3 (forced `indisvalid=false` → recovered valid, exit 0) | ✅ COMPLIANT (manual harness) |
| Additive Deployment Preserves RBAC, Isolation, and Reversibility | Deployment does not weaken access control | Index is additive only; RBAC/per-finca logic lives in the web handler (unchanged) and is regression-covered by the 4 contract scenarios above; manual 3.4 confirmed identical authorization | ✅ COMPLIANT |
| Additive Deployment Preserves RBAC, Isolation, and Reversibility | Rollback is reversible and correctness-preserving | Manual 3.4: `DROP INDEX CONCURRENTLY` → query results identical (count=2500, md5 match); README rollback section | ✅ COMPLIANT (manual harness) |

**Compliance summary**: 10/10 scenarios compliant. 4/4 (server-contract) are fully CI-automated and passed fresh. 6/10 (db-concurrent-index-deployment) are operational/runtime scenarios verified via the design's documented manual disposable-PG-17 harness + passing source-invariant automation + inspection; the approved design explicitly assigns these to manual verification because `CONCURRENTLY` cannot run inside a transaction (so it cannot run in the vitest/CI harness).

### Correctness (Static Evidence)
| Requirement | Status | Notes |
|------------|--------|-------|
| Session resolution inside error boundary | ✅ Implemented | `animal-list-http.ts`: `getUsuarioId(fincaId)` + null-check now inside `try` (L27–31); 400 short-circuit stays before `try`; `isForbidden→403`, else `reportError`+500. |
| Sanitized generic 500, no leak | ✅ Implemented | 500 body is `apiError("Error interno", null, "No fue posible consultar los animales", requestId)`; no driver/stack/PG detail. Test asserts `password=secret` throw yields sanitized body. |
| RBAC fail-closed | ✅ Implemented | No 200 path exists without an authorized `usuarioId`; throw before `readPort.listar` → catch → 403/500, `listar` never invoked (test: `listingReads === 0`). |
| Non-transactional CONCURRENTLY build | ✅ Implemented | `concurrent-index-deploy.ts` uses `client.unsafe()` (postgres-js autocommit, `max:1`); no `sql.begin`/`BEGIN`. |
| Idempotent indisvalid detection/recovery | ✅ Implemented | `readIndisvalid()` tri-state (true/false/null); valid→no-op, invalid→`DROP INDEX CONCURRENTLY`+rebuild, absent→`CREATE INDEX CONCURRENTLY IF NOT EXISTS`, defensive `REINDEX CONCURRENTLY`; exit 0/1. |
| Additive, reversible, RBAC-preserving | ✅ Implemented | Script touches only index objects; `uq_animales_finca_codigo` and migration 0002 untouched (test-asserted); rollback via `DROP INDEX CONCURRENTLY`. |

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| A — local restructure of try/catch (no shared middleware) | ✅ Yes | ~5-line control-flow move in one handler; no new abstraction. |
| A — generic 500 `ApiErrorDto` (no `SessionError` class) | ✅ Yes | Reuses existing `apiError` envelope; `AnimalListadoHttpDependencies` and `ApiErrorDto` contracts unchanged. |
| B — standalone script (not drizzle-kit migration) | ✅ Yes | `scripts/concurrent-index-deploy.ts`; migration 0002 snapshot unchanged; `concurrent-index-deploy` npm script added. |
| B — TypeScript script (not raw .sql) | ✅ Yes | `.ts` with `indisvalid` checks, idempotency logic, exit codes; follows `vacuum-analyze.ts` pattern. |
| File-change set matches design | ✅ Yes | All 6 designed files changed as specified (+ `package.json` script). |

### TDD Compliance
| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ✅ | "TDD Cycle Evidence" table present in apply-progress (#643) |
| All tasks have tests | ✅ | Phase 1 → contract test; Phase 2 → source-invariant tests; Phase 3 = verification/manual (non-test by design) |
| RED confirmed (tests exist) | ✅ | contract test, concurrent-index-deploy-source.test.ts, animal-list-indexes.test.ts all exist |
| GREEN confirmed (tests pass) | ✅ | Fresh forced run: web contract ✅, db source+indexes 6/6 ✅ |
| Triangulation adequate | ✅ | Web: 3 cases (500+reportError, fail-closed listingReads=0, forbidden→403 no reportError). DB: multiple invariants (CREATE/REINDEX CONCURRENTLY, indisvalid, pg_index, no .begin/BEGIN) |
| Safety Net for modified files | ✅ | Web baseline pass exit0; DB 2/2 index baseline before modification |

**TDD Compliance**: 6/6 checks passed

---

### Test Layer Distribution
| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit (contract) | 3 issue-112 cases (+ existing 400/403/200) | 1 | tsx + node:assert |
| Source-invariant | 6 | 2 | vitest |
| Integration | 0 automated (manual disposable PG 17 harness) | 0 | psql / postgres-js (manual) |
| E2E | 0 for this change | 0 | — |
| **Total (automated, this change)** | **9** | **3** | |

---

### Changed File Coverage
Coverage analysis skipped — no per-file coverage run for this change (no threshold configured; DB_SMOKE integration tests skipped without a live DB).

---

### Assertion Quality
**Assertion quality**: ✅ All assertions verify real behavior. No tautologies, no ghost loops (the `for` loop iterates a literal 2-element failure array, always runs), no orphan empty-checks, no mock-heavy imbalance. Contract-test mocks are DI overrides of `AnimalListadoHttpDependencies` (correct layer for a handler contract), and every issue-112 assertion calls the production handler and asserts status/body/side-effects.

---

### Quality Metrics
**Linter**: ✅ No errors — `biome check` on all 5 changed files: "Checked 5 files. No fixes applied." (exit 0)
**Type Checker**: ✅ No errors — `@ganaweb/db` `tsc --noEmit` clean; `@ganaweb/web` `tsr generate && vite build` succeeded (exit 0)

### Issues Found
**CRITICAL**: None

**WARNING**:
1. The 6 `db-concurrent-index-deployment` runtime scenarios (concurrent build outside a transaction, re-run no-op, interrupted-build recovery, RBAC unchanged, rollback reversible) are verified via a MANUAL disposable-PG-17 harness, not CI-automated. This is an explicit, justified design decision (`CONCURRENTLY` cannot run inside a transaction, so it cannot execute in the vitest/CI harness), and the structural contract IS guarded by passing source-invariant tests. Residual risk: a future regression in the script's runtime behavior would not be caught by CI — only structural invariants are protected. Manual-run evidence exists in apply-progress (Run1 fresh / Run2 no-op / Run3 recovery / rollback md5 match) but is not reproducible from CI.

**SUGGESTION**:
1. Add a `DB_SMOKE`-gated disposable integration test (e.g. `packages/db/tests/concurrent-index-deploy-postgres.test.ts`) mirroring the existing `vacuum-analyze-postgres.test.ts` precedent the design claims to follow. This would let `pnpm --filter @ganaweb/db test:smoke` exercise the real CONCURRENTLY build / no-op / recovery path on a disposable DB and close the CI-automation gap noted in WARNING #1.

### Verdict
PASS WITH WARNINGS
All 13 tasks complete; full suite green on a fresh forced run; build, lint, and type-check clean. All 4 requirements implemented and all 10 scenarios compliant (4 fully automated; 6 via the approved design's documented manual disposable-PG-17 harness + source-invariant automation). RBAC remains fail-closed, the CONCURRENTLY script has no transaction wrapper, and `indisvalid` recovery is present. One residual-risk WARNING (DB runtime scenarios are manual-only, by design) and one parity SUGGESTION; neither blocks archive.
