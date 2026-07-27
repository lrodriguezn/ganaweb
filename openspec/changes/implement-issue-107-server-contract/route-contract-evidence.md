# Route Contract and Apply Evidence: Issue #107

## Implemented Route

`GET /api/fincas/{fincaId}/animales` is an online, PostgreSQL-only route. It
validates the canonical query grammar before the listing read, resolves the
authenticated session, delegates fresh finca membership and `animales:ver`
authorization to `DrizzleAnimalListadoReadModel`, and returns the canonical
36-field row DTO with page metadata, filtered and finca-wide counts, normalized
columns, and `ApiErrorDto` failures.

The database adapter performs a joined paginated row query plus filtered and
finca-wide count queries. It has a fixed listing execution count of three
statements; it does not issue a query per returned row. Latest weight is selected
by `fecha DESC, id DESC` through a lateral lookup.

LA-010 search is implemented with qualified
`public.unaccent(pg_catalog.lower(...))` on both columns and bound patterns for
all four `q` fields and all ten validated `contains` fields. `%`, `_`, and `!`
are escaped with `ESCAPE '!'`, so wildcard and SQL-like request text remains
literal. The page query and filtered count share the same normalized predicate.

## Support Boundary

- Supported: PostgreSQL for this HTTP route and its Drizzle read model.
- Explicitly excluded: SQLite and WASM/SQLite parity. No compatibility claim or
  parity evidence is made for either excluded target.
- Explicitly excluded from this change: animal-list UI, filters/preferences,
  exports, and unrelated UI behavior.

## Available PostgreSQL Evidence

Local disposable PostgreSQL used:
`postgresql://postgres:postgres@localhost:5432/ganaweb`.

- Focused PostgreSQL integration: `DATABASE_URL=... pnpm --filter @ganaweb/db
  exec vitest run tests/animal-listado-postgres.test.ts` exited 0, 4/4 passed.
- The integration test verifies RBAC/isolation, filters/counts/stable pages,
  latest-weight tie-break and origin fallback, and the fixed three-statement
  listing count.
- `EXPLAIN (ANALYZE, BUFFERS)` on the finalized local query recorded
  `idx_pesos_animal_fecha_id` for the lateral latest-weight lookup across 13
  loops. This proves that lookup uses the LA-102 index without per-row SQL
  execution. The tiny disposable demo seed (20 `animales` rows) selected a
  sequential scan for `animales`; execution time was 0.929 ms.
- Migration review confirmed applied PostgreSQL indexes
  `idx_animales_finca_activo_codigo` and `idx_pesos_animal_fecha_id` with their
  expected definitions. The Drizzle ledger is `drizzle.__drizzle_migrations`.
- Migration `0003_animal_list_unaccent.sql` applied on fresh and existing
  PostgreSQL 17.10 databases and proved qualified callability, EXECUTE privilege,
  and `public.unaccent('Árbol') = 'Arbol'` for the authorized local role.
- Controlled case-only RED failed 17/20 focused scenarios; corrected GREEN passed
  20/20. Independent audit added inverse stored-text and 26-row page-size-25
  coverage; the combined focused migration/PostgreSQL suite passed 23/23.

## Acceptance Blocker

The agreed RF-ANIM-LIST §11 fixture, its exact query scenarios, and an automated
p95 measurement harness are absent. Therefore representative animal-list-index
plan evidence and per-scenario p95 measurements cannot be produced. The tiny
demo-seed sequential scan is not substituted for the agreed fixture, and neither
LA-100 p95 <400 ms nor full LA-102 benchmark acceptance is claimed.

Any later independent verification must report this blocker again if the agreed
fixture/harness remains unavailable. This consolidation does not create a verify
report.

Production listing-role callability remains a deployment validation risk when
that credential differs from the locally validated migration role. Rollout must
fail explicitly rather than silently reverting to case-only search.

## Candidate Verification Prepared by Apply

- `pnpm exec biome format --write .` completed with no fixes.
- Focused web, application, migration, DB, and PostgreSQL tests passed.
- `pnpm turbo test` exited 0 (13 tasks; UI 409/409).
- `pnpm turbo typecheck` exited 0 (13/13).
- `pnpm exec biome ci .` exited 0 with eight pre-existing warnings in excluded
  animal create/UI files; no fixes were applied.
- `CA-UI-002` was run alone twice: one pass and one 5-second timeout with an
  unrelated `MutationObserver is not a constructor` teardown rejection. A later
  full suite passed it. This is classified as nondeterministic unrelated UI-test
  infrastructure behavior; no UI behavior was changed to mask it.

Bounded review is an external delivery gate owned by the parent orchestrator and
is intentionally not run or represented as an apply-time source mutation.

Fresh independent verification and a fresh content-bound review of the next
frozen identity remain external delivery gates. Prior receipts must not be reused.
