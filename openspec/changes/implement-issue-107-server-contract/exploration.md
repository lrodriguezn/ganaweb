## Exploration: Implement issue #107 server-side animal-list contract

### Current State

Approval gate passed: GitHub issue #107 is OPEN and has the exact label `status:approved` (also `status:needs-review`); the approved label is the required evidence for proceeding. Issue #107 is titled `Listado animales: implementar contrato server-side v2.1`, references RF-ANIM-LIST v2.1 sections 3, 6, and 11, and explicitly blocks #108–#111. Epic #106 was read completely: it describes the online-only desktop animal listing, its dependency order, and says the epic itself remains `status:needs-review`; it identifies #107 as the contract/DTO/query/index prerequisite.

The complete source of truth is `features/feature-003-listado_animales-desktop/requisito_listado_animales.md` (RF-ANIM-LIST v2.1). It defines 36 total columns, 29 default columns, the canonical response/filter/sort matrix, DTOs, validation/error behavior, RBAC and finca isolation, pagination, LA-100–LA-103 performance/index rules, and the explicit exclusions.

The current implementation is an older server-function/view-model path, not the requested HTTP contract. `apps/web/src/routes/_app/fincas/$fincaId/animales.tsx` calls `listAnimalsAction` with only `fincaId`. `apps/web/src/server/animal-actions.ts` exposes that action, while `apps/web/src/server/animal-actions.server.ts` authorizes the session and then loads all animals through `listarPorFinca`, applies a small in-memory filter set, sorts by code, and returns a `tipo: "lista"` view model. It has no page/pageSize, canonical 36-field DTO, `ApiErrorDto`, query validation, total counters, or server-side sorting/filtering.

The database schema has `animales(finca_id, activo)` (`idx_animales_finca_activo`) and `pesos(animal_id, fecha)` (`idx_pesos_animal`), but `DrizzleAnimalRepository.listarPorFinca` selects all rows for a finca and orders in application-facing repository code. `usuarios_fincas` and dynamic permission tables exist; current route authorization checks the active session finca and `animales:ver`, but the new endpoint must make the membership and permission checks explicit in its HTTP contract. `tipo_ingreso_id` exists on `animales`; the inspected schema did not yet confirm a `config_key_values` table/port or the requested latest-weight listing query.

Testing configuration confirms Vitest is intended for unit/integration tests and performance evidence, but the OpenSpec config marks unit, integration, coverage, linter, and type-checker tooling as not yet available. Existing animal tests cover CRUD/UI/catalog behavior, not this listing contract.

### Affected Areas

- `apps/web/src/routes/_app/fincas/$fincaId/animales.tsx` — current loader consumes the legacy list view model; likely migration boundary, while UI/filter work remains excluded.
- `apps/web/src/server/animal-actions.ts` — current server-function surface; likely replaced or complemented by the route-level HTTP endpoint and typed contract.
- `apps/web/src/server/animal-actions.server.ts` — current authorization, in-memory filtering, and list orchestration; candidate extraction point for server contract validation/RBAC adapters, not a place to retain N+1/in-memory listing.
- `apps/web/src/routes/api/` — existing TanStack Start HTTP route pattern (`health.ts`); add the `/api/fincas/{fincaId}/animales` route here or follow the repository’s established API route convention after confirming route generation.
- `packages/db/src/schema/animales.ts` — canonical animal columns and existing `idx_animales_finca_activo`; add LA-102 index definitions only through a migration-backed schema change.
- `packages/db/src/schema/pesos-produccion.ts` — latest-weight source and current `(animal_id, fecha)` index; add a deterministic ID tie-breaker index/query support.
- `packages/db/src/schema/auth.ts` — `usuarios_fincas`, roles, permissions, and assignments are the isolation/RBAC data sources; verify active-row semantics and permission joins.
- `packages/db/src/animal-infrastructure.ts` — current non-paginated `listarPorFinca`; introduce a dedicated paginated query/repository rather than extending the all-rows path.
- `packages/db/drizzle/` or repository migration directory — locate the migration convention during design and add measured LA-102 indexes.
- `apps/web/src/server/*` and `packages/*/tests/*` — add contract parsing/DTO unit tests, database-backed integration tests for PG/SQLite symmetry where supported, and a repeatable p95 performance scenario.

### Scope Boundaries

In scope: canonical `AnimalListadoRowDto`, `AnimalListadoResponseDto`, and `ApiErrorDto`; 36-column matrix fidelity and nullability; `page`, `pageSize`, `sort`, `q`, `f.*`, and `cols` parsing; database-side filtering/sorting/pagination; `total` and `totalSinFiltro`; catalog/key-label resolution; `tipo_ingreso_id` fallback; latest weight by date then ID; `animales:ver` and `usuarios_fincas` enforcement; actionable 400s, 403, and 500/timeout error envelopes; N+1 prevention; LA-102 migration and measurement; unit, integration, and performance tests.

Explicitly out of scope: table/UI filters, URL sanitation/toasts/loading/error presentation, preferences, column selector/reordering, export formats and export limits, `Lugar compra`, multi-order, offline support, and PR/branch/commit delivery. The endpoint’s `cols` input is validated and echoed as required by the server contract, but no UI or export implementation is included.

### Approaches

1. **Dedicated HTTP contract and paginated query service** — add a route adapter, pure request/response validation and DTO mapping, a dedicated repository query with joins/derived expressions, and migration-backed indexes.
   - Pros: preserves clean architecture, keeps HTTP errors contractual, prevents the legacy all-rows path from leaking into the new endpoint, and makes performance measurable.
   - Cons: requires a new query/read-model port and careful PG/SQLite SQL compatibility; catalog joins and 36-field mapping are substantial.
   - Effort: High

2. **Extend `listAnimalsAction` and retrofit the existing repository** — add filters and pagination to the current server-function harness and reuse its view-model path.
   - Pros: smaller initial surface and reuses existing session plumbing.
   - Cons: couples the canonical HTTP DTO to a legacy UI model, risks retaining in-memory filtering and incomplete fields, and makes exact 400/403/500 HTTP semantics and p95 evidence harder to prove.
   - Effort: High, with higher regression risk

### Recommendation

Use the dedicated HTTP contract and paginated query service. Keep authentication/session resolution reusable, but introduce a server-side read model whose input is the canonical matrix and whose query performs joins, derivations, filtering, stable ordering, and pagination in the database. Define a single validation/error mapper so every invalid `sort`, `f.*`, `cols`, page, and page size returns `ApiErrorDto` with `campo`, `motivo`, and `requestId`. Enforce `animales:ver` and active `usuarios_fincas` membership before querying, returning 403 without exposing cross-finca existence. Add LA-102 indexes only after query plans and the agreed p95 scenario demonstrate their need; test the migration and performance evidence together.

Confirmed implementation plan for proposal/design:

1. Inventory route, migration, config-value, permission, and test conventions; settle the HTTP route adapter and read-model port.
2. Encode the 36-column matrix as one typed canonical registry and derive allowed filter/sort/column validation from it without deriving response keys from labels.
3. Implement pure query parsing and `ApiErrorDto` mapping, including defaults, repeated/invalid values, stable `id:asc` tie-break, and request IDs.
4. Implement the paginated DB query with active/finca predicates, catalog/key-label joins, age calculation at query time, latest weight window/lateral strategy, counts, and no per-row queries.
5. Add explicit RBAC/finca-isolation integration coverage, including a foreign-finca denial and permission denial.
6. Add LA-102 migration/index definitions, inspect query plans, and record p95 <400 ms evidence for the agreed dataset and filter/sort scenarios.
7. Add unit coverage for all 36 response keys and nullability, parser/error cases, derivations, and stable pagination; add integration coverage against supported DB drivers; add performance coverage without expanding into UI/export tests.

### Risks

- The epic is still labeled `status:needs-review`, despite #107 also carrying `status:approved`; future orchestration must preserve the sub-issue approval evidence and not treat the epic as independently approved.
- Existing date columns are stored as integers while the contract requires ISO dates; timezone/epoch conversion must be specified and tested.
- `tipo_ingreso` configuration and several catalog schemas/ports were not fully confirmed in the inspected source; design must locate the authoritative `config_key_values` representation before implementation.
- PostgreSQL and SQLite/WASM query capabilities may differ for age calculation, locale ordering, and latest-weight selection; the configured dual-driver integration expectation may require a compatible query strategy or an explicitly documented limitation.
- A single large joined query can duplicate rows or distort counts; count queries and relation joins need cardinality tests.
- The current test/tooling registry reports server unit/integration/performance infrastructure as unavailable, so the implementation plan must include test harness setup or clearly document the capability gap before claiming evidence.

### Ready for Proposal

Yes. Exploration is complete and approval-gated. The next phase may produce a proposal for the dedicated server-side contract only, preserving the exclusions above and the later delivery constraints (dedicated branch, reviewable work-unit commits, and a PR closing #107).
