# Review Policy: add-animals-crud-flow

## Selection

Full 4R bounded review is required for this change because it exceeds 400 changed lines and touches RBAC, server functions, destructive delete/inactivate flows, sync/tombstones, migrations, and E2E fixture boundaries.

## Frozen Review Ledger

The review transaction records the already-completed manual 4R post-apply review. Do not run new review lenses for this receipt.

Severe findings were raised across risk, reliability, resilience, and readability review passes, then fixed and scoped-validated:

- RISK-001 GET-triggered delete/inactivate fixed.
- RELIABILITY-001/R4-001 production runtime boundary made honest/fail-fast.
- RELIABILITY-002 image server/application validation fixed.
- RELIABILITY-003/R4-002 physical delete audit/tombstone/transaction fixed.
- R4-003 additive migration fixed via `0001_animal_sync_audit.sql`.
- R4-004 E2E fixture production guard fixed.
- R2-001 Nuevo Animal double-submit fixed and scoped validator approved.
- R2-002 overlapping delete triggers fixed.
- R2-003 no-op image controls fixed.

## Gate Decision

All severe findings are fixed and scoped-validated. Remaining notes are warning/info only: guarded E2E fixture environment risk, static-source tests, duplicate types, and stale comments are non-blocking.

## Evidence

Evidence is recorded in `openspec/changes/add-animals-crud-flow/apply-progress.md`, including domain/application/web/ui/db focused tests, typechecks, Playwright animals 6/6, and Biome changed-file checks.
