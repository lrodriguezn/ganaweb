# Archive Report: issue-112-session-error-hardening

**Date**: 2026-07-29
**Verdict**: PASS WITH WARNINGS (0 blockers, 0 criticals)
**Issue**: #112 — feat(animales): endurecer errores de sesión y despliegue de índices del listado

## Summary

Two-phase hardening of the animal list endpoint:
1. Moved `getUsuarioId()` inside the try/catch error boundary so session-resolution failures map to sanitized 500 `ApiErrorDto` with `requestId` + `reportError` (fail-closed, RBAC untouched).
2. Added idempotent `CREATE INDEX CONCURRENTLY` deployment script with `indisvalid` recovery, executed manually via `psql` (never via `drizzle-kit migrate`).

## Metrics

- Tasks: 13/13 complete
- Changed lines: 307 (277+/4-)
- Requirements: 4/4 implemented
- Scenarios: 10/10 compliant (4 CI-automated, 6 manual disposable-PG-17)
- Tests: full suite green (pnpm turbo test --force, exit 0)
- Build: clean (pnpm turbo build --force, exit 0)

## Specs Merged

- `openspec/specs/animal-listado-server-contract/spec.md` — ADDED: Session Resolution Executes Inside the Error Boundary (4 scenarios)
- `openspec/specs/db-concurrent-index-deployment/spec.md` — NEW capability (3 requirements, 6 scenarios)

## Commits

- `2ee2cfb` docs(openspec): add issue-112 session error hardening change
- `ee90d59` fix(web): resolve animal-list session inside error boundary (issue #112)
- `97725ab` feat(db): add idempotent CONCURRENTLY index deploy script + runbook (issue #112)
- `4e2997c` docs(openspec): mark issue-112 session error hardening tasks complete

## Residual Warnings

- DB runtime scenarios (CONCURRENTLY build, no-op, recovery) are manual-only by design — `CONCURRENTLY` cannot run inside a transaction, so CI covers source-invariants only.

## Follow-up Suggestions

- Add `DB_SMOKE`-gated disposable integration test mirroring `vacuum-analyze-postgres.test.ts` precedent.
