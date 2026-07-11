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

### Requirement 6: Appearance surfaces render five style cards

`apps/web` MUST render the five-style selector on mobile `/mas` and in the desktop Avatar menu, aligned to screens 16 and 17. The surfaces MUST preserve Spanish labels and MUST NOT alter account, finca, role, or domain workflow behavior.

#### Scenario: Mobile appearance selection

- GIVEN a mobile user opens `/mas`
- WHEN Apariencia is shown
- THEN cards for Campo, Moderna, Índigo, Cielo, and Grafito are available.

#### Scenario: Desktop avatar selection

- GIVEN a desktop user opens the Avatar menu
- WHEN the appearance section renders
- THEN the same five cards and selected state are shown.

### Requirement 7: Independent style and claro/oscuro state

`apps/web` MUST combine five styles with claro/oscuro for 10 runtime appearances. Style MUST persist locally in `ganaweb-estilo`; claro/oscuro MUST remain in `ganaweb-theme`; changing either MUST NOT overwrite the other.

#### Scenario: Ten combinations are reachable

- GIVEN each style is available
- WHEN the user toggles claro/oscuro for each style
- THEN all 10 combinations render without changing stored style id.

#### Scenario: No server preference sync

- GIVEN a user changes appearance
- WHEN network requests are observed
- THEN no account, finca, or role preference sync is sent.

### Requirement 8: Anti-flash first paint

`apps/web` MUST apply the selected style class and `dark` class, when applicable, before first paint. Missing or invalid local style MUST fall back to Campo.

#### Scenario: Stored Grafito oscuro loads

- GIVEN `ganaweb-estilo=grafito` and `ganaweb-theme=dark`
- WHEN the document first paints
- THEN `<html>` already reflects Grafito and dark mode.

#### Scenario: Missing local values load

- GIVEN no appearance values are stored
- WHEN the document first paints
- THEN Campo claro is applied without visible style flash.

## Rule Citations

- T-003 — Domain names in Spanish where they appear in routes/data.
- IA-003 — Reuse `packages/ui` components for any UI surfaced in this change.
