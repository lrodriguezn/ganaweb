# Web App Bootstrap Specification

## Purpose

Scaffolds `apps/web` as a minimal TanStack Start application that proves the monorepo can boot, exposes a health-check route, and connects to the seeded PostgreSQL dev database.

## Requirements

### Requirement 1: TanStack Start application

`apps/web` MUST be a runnable TanStack Start project with the standard `app/` (or `src/`) directory, routing, and Nitro-based server.

#### Scenario: Dev server boots

- GIVEN `pnpm install` has completed
- WHEN `pnpm --filter web dev` runs
- THEN the dev server starts on its configured port with no build errors.

### Requirement 2: Health-check route

`apps/web` MUST expose `GET /api/health` that returns HTTP 200 and a JSON body indicating the application is alive.

#### Scenario: Health endpoint responds

- GIVEN the dev server is running
- WHEN a request is made to `/api/health`
- THEN the response status is 200 and the body contains `{ "status": "ok" }` or equivalent.

### Requirement 3: Database connectivity check

The health route SHOULD verify connectivity to the PostgreSQL dev database and reflect the result in its response.

#### Scenario: Healthy database

- GIVEN Postgres dev DB is running and seeded
- WHEN `/api/health` is requested
- THEN the response indicates the database is reachable (e.g., `db: "ok"`).

#### Scenario: Unhealthy database

- GIVEN Postgres dev DB is unavailable
- WHEN `/api/health` is requested
- THEN the response status is not 200 or the body reports `db: "error"`.

### Requirement 4: Dependency direction

`apps/web` MAY depend on `packages/aplicacion`, `packages/ui`, and `packages/db`, but MUST NOT depend directly on `packages/dominio`.

#### Scenario: Layer rule holds

- GIVEN `dependency-cruiser` runs in CI
- WHEN it evaluates `apps/web`
- THEN no direct import from `packages/dominio` is reported.

### Requirement 5: Build output

`apps/web` MUST produce a production build via `pnpm turbo build` that can be started with the Nitro output server.

#### Scenario: Production build boots

- GIVEN `pnpm turbo build` succeeds
- WHEN the Nitro output server starts
- THEN `/api/health` returns 200.

## Rule Citations

- T-003 — Domain names in Spanish where they appear in routes/data.
- IA-003 — Reuse `packages/ui` components for any UI surfaced in this change.
