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
