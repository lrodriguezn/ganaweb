# DB Schema Bootstrap Specification

## Purpose

Bootstraps `packages/db` with PostgreSQL support only, a minimal Drizzle schema for `fincas` and `animales` that enforces RN-001, and a seed script derived from `seed_v3.ts`.

## Requirements

### Requirement 1: PostgreSQL-only driver

`packages/db` MUST configure Drizzle for PostgreSQL and MUST NOT include SQLite/WASM/OPFS drivers, packages, or references.

#### Scenario: No SQLite references

- GIVEN the repository is searched for `wa-sqlite`, `sqlite`, or `OPFS`
- WHEN the search completes
- THEN zero matches exist outside planning docs.

### Requirement 2: Minimal schema for RN-001

The Drizzle schema MUST define `fincas` and `animales` tables sufficient to represent `id`, `finca_id`, `codigo`, `nombre`, timestamps, and a unique constraint equivalent to `uq_animales_finca_codigo`.

#### Scenario: Uniqueness is enforced at DB level

- GIVEN the schema is migrated to Postgres
- WHEN two rows with the same `finca_id` and `codigo` are inserted
- THEN the database MUST reject the second insert.

### Requirement 3: Seed script

`packages/db` MUST expose a runnable `seed_v3.ts` script that populates the dev database with at least one finca and one animal.

#### Scenario: Dev database is seedable

- GIVEN a fresh Postgres dev database
- WHEN `pnpm --filter db seed` runs
- THEN `fincas` and `animales` each contain ≥1 row and no unique-constraint error occurs.

### Requirement 4: Type-safe exports

`packages/db` MUST export typed schema definitions and a configured Drizzle client that consumers can import without importing driver internals.

#### Scenario: Consumer uses typed client

- GIVEN `apps/web` imports `db` from `packages/db`
- WHEN a query is written against `animales`
- THEN TypeScript infers the row shape from the Drizzle schema.

## Rule Citations

- RN-001 — `uq_animales_finca_codigo` enforces código único por finca.
- T-003 — Domain table names in Spanish: `fincas`, `animales`.
- TS-003 — Fixtures from `seed_v3.ts`.
