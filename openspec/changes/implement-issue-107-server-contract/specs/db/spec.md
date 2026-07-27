# Delta for DB

## ADDED Requirements

### Requirement: LA-102 migration-backed listing indexes and plan evidence

PostgreSQL migrations MUST create the measured LA-102 indexes required by the finalized animal-list query, including support equivalent to `animales(finca_id, activo, codigo)` and latest-weight ordering by `pesos(animal_id, fecha, id)`. The indexes MUST NOT be declared existing until their migration is applied. PostgreSQL query-plan evidence MUST show the finalized paginated query uses the measured access strategy and preserves LA-103 no-N+1 execution. SQLite/WASM parity is explicitly excluded.

#### Scenario: Applied migration and plan
- GIVEN the PostgreSQL migration has run on the benchmark schema
- WHEN the finalized listing query plan is captured for its supported filter/sort scenarios
- THEN evidence identifies the applied LA-102 indexes and the query has no per-row execution.

#### Scenario: Unavailable PostgreSQL evidence
- GIVEN PostgreSQL plan capture or the required benchmark environment is unavailable
- WHEN LA-102 evidence is evaluated
- THEN verification reports a blocker/deviation and does not substitute SQLite/WASM evidence.

### Requirement: PostgreSQL unaccent capability migration

Additive migration `0003_animal_list_unaccent.sql` MUST idempotently provision the `unaccent` extension in schema `public`. Deployment validation MUST prove `public.unaccent(text)` exists, is callable, and has `EXECUTE` privilege for the listing role before accent-normalized search is accepted. Applied migrations MUST NOT be edited. If provisioning or invocation is unavailable, deployment MUST fail with an explicit capability blocker and MUST NOT silently use case-only matching; a persisted normalized-column fallback requires separate design approval.

#### Scenario: Idempotent provision and use
- GIVEN a fresh or already-provisioned PostgreSQL database
- WHEN the full migration chain and capability validation run repeatedly
- THEN `public.unaccent(text)` remains available and callable without duplicate-extension or migration-ledger failure.

#### Scenario: Provisioning or use is denied
- GIVEN the migration role cannot create the extension or the listing role cannot invoke it
- WHEN migration or deployment validation executes
- THEN rollout fails before accent search is accepted, records the capability blocker, and does not enable case-only fallback behavior.

#### Scenario: Applied migration correction
- GIVEN an earlier migration has been applied
- WHEN a correction is required
- THEN a new forward migration is used and the applied migration remains unchanged.
