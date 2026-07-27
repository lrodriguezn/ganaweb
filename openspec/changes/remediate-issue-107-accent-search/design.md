# Design: Remediate issue #107 accent search

## Technical Approach

Correct the PostgreSQL adapter only. An additive Drizzle migration installs `unaccent` in `public`; migration validation and PostgreSQL integration prove the listing credential can invoke it. `buildAnimalListadoPredicates` gets one bound, literal-safe, accent/case-normalized `LIKE` expression for `q` and validated `contains`. HTTP, RBAC, DTO, SQLite, and UI contracts do not change.

## Architecture Decisions

| Decision | Options / tradeoff | Choice and rationale |
|---|---|---|
| Normalization | Persisted columns; collation/`translate`; extension | Install `unaccent`; it is the smallest PostgreSQL-native change and leaves write paths untouched. Persisted columns are deferred unless the gate fails. |
| Extension location | Implicit `search_path`; explicit schema | Migration uses `CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public`; queries and validation call `public.unaccent` (and `pg_catalog.lower`) explicitly. This prevents function resolution changing with `$user`/runtime `search_path`. Existing unqualified public table references are unchanged. |
| Pattern semantics | Treat `%`/`_` as wildcards; literal search | Preserve literal matching: escape `!` as `!!`, `%` as `!%`, and `_` as `!_`; surround the escaped value with `%`; emit `ESCAPE '!'`. The complete pattern remains one Drizzle-bound value. |
| Capability failure | Retain `lower LIKE`; normalized columns now | Fail before rollout; do not deploy corrected predicates. Return to separately approved normalized-column design. |

## Data Flow

```text
DATABASE_URL migration -> public.unaccent installed + callable check
request q/filter -> validated registry -> escapeLikeLiteral(value)
  -> public.unaccent(pg_catalog.lower(column)) LIKE
     public.unaccent(pg_catalog.lower($boundPattern)) ESCAPE '!'
  -> shared WHERE -> page rows + filtered count
finca-wide unfiltered count remains unchanged
```

`q` retains OR over its four fields; filters retain AND. The validated `animalListFilterColumns` map routes every `contains` field (code/name, parent aliases, ear/RFID/QR, comments) through this helper; no request key or identifier is interpolated. The shared `where` remains the page and filtered-count predicate; finca/active, authorization, sort, and `a.id ASC` ties remain intact.

## File Changes

| File | Action | Description |
|---|---|---|
| `packages/db/migrations/0003_animal_list_unaccent.sql` | Create | Idempotent public-schema extension provision plus callable capability assertion. |
| `packages/db/migrations/meta/_journal.json` | Modify | Register the new forward migration; never edit `0002`. |
| `packages/db/src/animal-infrastructure.ts` | Modify | Add literal-pattern helper and shared qualified accent/case predicate. |
| `packages/db/tests/animal-listado-postgres.test.ts` | Modify | Add strict PostgreSQL RED/GREEN semantic, safety, isolation, counter, and page tests. |
| `packages/db/tests/animal-list-indexes.test.ts` | Modify | Assert migration text/journal provision the extension without altering prior migrations. |

## Interfaces / Contracts

No public TypeScript or HTTP contract changes. Internal helper shape:

```ts
function escapeLikeLiteral(value: string): string // ! -> !!, % -> !%, _ -> !_
function normalizedContains(column: SQL, value: string): SQL
// public.unaccent(pg_catalog.lower(column)) LIKE
// public.unaccent(pg_catalog.lower($boundPattern)) ESCAPE '!'
```

Migration verifies `to_regprocedure('public.unaccent(text)')`, `has_function_privilege(current_user, 'public.unaccent(text)', 'EXECUTE')`, and invokes `public.unaccent('Árbol')`. A distinct runtime role must run this validation as itself before acceptance.

## Testing Strategy

| Layer | What to test | Approach |
|---|---|---|
| Migration | Repeated provision, journal, callable/execute permission | Disposable PostgreSQL 17 DB; rerun repository migration and qualified call. RED creation/use denial fails with the capability blocker. |
| Integration RED/GREEN | `q` four fields; ten `contains`; `áéíóúñ` and case both directions | Table-driven `animal-listado-postgres.test.ts`; lower-only bytes fail, corrected bytes pass. `%`, `_`, `!`, and SQL-like text remain literal and bound. |
| Contract | Finca-B lookalikes, counters, tied pages | Isolated fixture IDs; exact counts, repeated page IDs (`id ASC` ties), no duplicate/omission, existing bounded statement count. |

No UI/E2E/SQLite evidence substitutes. Local Docker is PostgreSQL 17.10 as `postgres`, has database CREATE privilege, default `"$user", public` search path, and lacks `unaccent`; this superuser is not proof for a production listing role.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

Apply the forward migration before predicate deployment. If creation or invocation fails, stop: no successful migration record or enabled code. An unusable existing extension may remain, but rollout stops. Roll back code only; never edit an applied migration or drop a shared extension without a reviewed forward migration.

`unaccent(lower(column))` plus leading `%` can bypass ordinary btree benefits; existing `idx_animales_finca_activo_codigo` still supports finca/active narrowing, not a §11 performance claim. No benchmark fixture or p95/plan evidence is created here, so §11 remains blocked.

## Open Questions

- [ ] Identify and validate the production listing credential if it differs from the migration `DATABASE_URL` role.

## Review Slice

One approved-exception PR: migration + predicate + focused PostgreSQL tests, target under the approved 800 changed-line budget. Exclude normalized columns, #112/UI, SQLite, and §11 fixture/benchmark work.
