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

`packages/db` MUST expose a runnable `seed-v3.ts` script that populates the dev database with at least one finca (zero animales per D11 — RN-001 is verified at the schema level via `uq_animales_finca_codigo`, not via seed data).

#### Scenario: Dev database is seedable

- GIVEN a fresh Postgres dev database
- WHEN `pnpm --filter db seed` runs
- THEN `fincas` contains ≥1 row; `animales` MAY be empty (D11: zero animales seeded — RN-001 verified via unique index + dominio unit test) and no unique-constraint error occurs.

### Requirement 4: Type-safe exports

`packages/db` MUST export typed schema definitions and a configured Drizzle client that consumers can import without importing driver internals.

#### Scenario: Consumer uses typed client

- GIVEN `apps/web` imports `db` from `packages/db`
- WHEN a query is written against `animales`
- THEN TypeScript infers the row shape from the Drizzle schema.

### Requirement 5: Auth schema exports

`packages/db` MUST expose typed Drizzle schema definitions for the auth tables required by first-slice user authentication, including users, password credentials, login audit/session records, and finca membership/authorization state from `docs/schema_v3_corregido.sql`.

#### Scenario: Auth tables are importable

- GIVEN an application auth adapter imports the DB schema
- WHEN it references user, password, session, login, and user-finca membership tables
- THEN TypeScript provides typed columns and relations without importing driver internals.

#### Scenario: Out-of-scope auth tables are not required

- GIVEN the SQL schema also includes recovery, 2FA, verification, and broader RBAC tables
- WHEN this change is implemented
- THEN those flows MUST NOT be required for registration, login, session persistence, or finca approval.

### Requirement 6: Authorization state is representable

`packages/db` MUST represent whether a registered user is pending or authorized for a finca so server-side guards can distinguish unauthenticated, pending, and approved access.

#### Scenario: Pending membership is persisted

- GIVEN a new account is registered
- WHEN its finca relationship is stored
- THEN the DB layer can persist a pending authorization state.

#### Scenario: Approved membership is queryable

- GIVEN a finca admin approves a user
- WHEN protected access is checked
- THEN the DB layer can return the user's approved finca authorization.

## Rule Citations

- RN-001 — `uq_animales_finca_codigo` enforces código único por finca.
- T-003 — Domain table names in Spanish: `fincas`, `animales`.
- TS-003 — Fixtures from `seed_v3.ts`.
- D11 — Seed Subset Extent: zero `animales` rows seeded; RN-001 verified at the Drizzle schema level via the `uq_animales_finca_codigo` unique index (integration test TS-004) and at the dominio unit-test level (TS-003), NOT via seed data. Real finca IDs `finca-esperanza` (GAN001) and `finca-roble` (GAN002) are seeded from `docs/seed_v3.ts` lines 204-217.
- PE-001, PE-002, PE-003, PE-007 — authorization checks rely on persisted finca-user permission state.
