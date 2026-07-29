# db-concurrent-index-deployment Specification

## Purpose

Defines the contract for deploying animal-list supporting indexes with `CREATE INDEX CONCURRENTLY` outside any transaction (manual `psql`, never via `drizzle-kit migrate`), detecting interrupted/invalid builds via `pg_index.indisvalid`, and recovering them idempotently with `REINDEX CONCURRENTLY`. The deployment is additive and MUST NOT weaken RBAC, per-finca isolation, or rollback reversibility.

## Requirements

### Requirement: Non-Transactional Concurrent Index Build

The index deployment script MUST issue `CREATE INDEX CONCURRENTLY` and MUST run outside any explicit transaction block, because `CONCURRENTLY` cannot execute inside a transaction and `drizzle-kit migrate` always wraps statements in one. The script MUST be executed manually via `psql`, MUST exit `0` on success, and MUST NOT be invoked from the migration runner.

#### Scenario: Concurrent build runs outside a transaction

- GIVEN a disposable PostgreSQL 17 database without the target index
- WHEN the script is executed via `psql`
- THEN `CREATE INDEX CONCURRENTLY` succeeds with no surrounding transaction
- AND the script exits `0` and the index is valid (`indisvalid = true`).

#### Scenario: Script is not run through drizzle-kit migrate

- GIVEN the deployment runbook
- WHEN an operator follows it
- THEN the index is built by the standalone `psql` script, not by `drizzle-kit migrate`.

### Requirement: Idempotent Invalid-Index Detection and Recovery

The script MUST be idempotent. Before building, it MUST inspect `pg_index.indisvalid`; if a prior build was interrupted and left an invalid index, the script MUST drop the invalid index and rebuild with `REINDEX CONCURRENTLY`. Re-running against an already-valid index MUST be a no-op that exits `0`.

#### Scenario: Re-run on a valid index is a no-op

- GIVEN the target index already exists and is valid
- WHEN the script is executed again
- THEN it performs no destructive action and exits `0`.

#### Scenario: Interrupted build is detected and recovered

- GIVEN an interrupted prior build left the index with `indisvalid = false`
- WHEN the script is executed
- THEN it drops the invalid index and rebuilds via `REINDEX CONCURRENTLY`
- AND the resulting index is valid (`indisvalid = true`) and the script exits `0`.

### Requirement: Additive Deployment Preserves RBAC, Isolation, and Reversibility

The index deployment MUST be additive (schema object only) and MUST NOT alter RBAC, per-finca isolation, or query authorization. Rollback MUST remain reversible via `DROP INDEX CONCURRENTLY`; an invalid or absent index MUST NOT affect query correctness, only performance.

#### Scenario: Deployment does not weaken access control

- GIVEN the index is built
- WHEN any animal-list query runs
- THEN RBAC and per-finca isolation behave identically to before the deployment.

#### Scenario: Rollback is reversible and correctness-preserving

- GIVEN the index exists (valid or invalid)
- WHEN an operator runs `DROP INDEX CONCURRENTLY`
- THEN queries remain correct and the change is fully reversible.

## Rule Citations

- RN-001 — `uq_animales_finca_codigo` untouched; this capability adds only supporting indexes.
