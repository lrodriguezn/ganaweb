## Exploration: Issue #110 — Listado animales: paginación, 36 columnas y preferencias persistentes

**Original requested change title/context:** `arranquemos  con el issuse #110`
**GitHub issue:** [#110](https://github.com/lrodriguezn/ganaweb/issues/110) — `Listado animales: paginación, 36 columnas y preferencias persistentes`

### Current State

The repository already contains the #107/#108/#109 online animal-list foundation. The server contract accepts `page`, `pageSize` (`25|50|100`), `sort`, filters, and `cols`; it normalizes unknown or duplicate columns through the query parser and defaults to the first 29 of the 36 registered columns. The database read model performs filtered and unfiltered counts, applies SQL `LIMIT/OFFSET`, and returns `data`, `page`, `pageSize`, `total`, `totalSinFiltro`, `sort`, and `cols`.

The desktop route currently renders the canonical 29 default columns and consumes the query state owned by #109. It does not yet expose pagination controls, a column selector, or server-backed preference loading/saving. Existing #108/#109 specs explicitly mark those concerns as #110 non-goals. No existing schema/table or repository for per-user/per-finca animal-list column preferences was found; `config_parametros_finca` is configuration, not user preference storage. The issue requires online-only behavior, cross-device persistence, finca isolation, RBAC, and no `localStorage`.

Tests already cover the list HTTP contract, query parsing, route behavior, and authorization/read-model seams. The OpenSpec test configuration requires TDD, but the configured unit, integration, E2E, coverage, lint, and type-check capabilities are currently marked unavailable.

### Affected Areas

- `apps/web/src/server/animal-list-contract.ts` — existing 36-column registry, canonical 29-column default, and `page`/`pageSize`/`cols` normalization boundary.
- `apps/web/src/server/animal-list-http.ts` and `apps/web/src/routes/api/fincas/$fincaId/animales.ts` — list API authorization and transport seam; likely preference endpoints or extensions must preserve sanitized errors and finca isolation.
- `packages/aplicacion/src/puertos/animal-listado-port.ts` — read result already exposes the pagination totals and effective columns; new preference ports/contracts will need a clean application boundary.
- `packages/db/src/animal-infrastructure.ts` — existing filtered count, unfiltered count, stable ordering, and page query can support the API, but preference persistence needs a separate repository/schema path.
- `apps/web/src/features/animal-listado/animal-listado-route-adapter.ts` — column registry/labels and desktop model currently distinguish 29 visible-by-default from 36 recognized columns.
- `apps/web/src/routes/_app/fincas/$fincaId/animales.tsx` — route-owned query state must gain page/page-size/column mutations while retaining #109 history, correction, and stale-request behavior.
- `packages/db/src/schema/` and migrations — no current per-user/per-finca list-preference table was identified; schema, unique key, and migration strategy are required.
- `apps/web/tests/animal-list-server-contract.test.ts`, `apps/web/tests/animal-listado-route.test.tsx`, and related application/database tests — extend contracts for pagination display, column normalization, preference authorization, persistence, and failure fallback.
- `openspec/specs/animal-listado-desktop-ui/spec.md` and `openspec/specs/animal-listado-query-state/spec.md` — existing #110 non-goals define the boundary that this change must now implement without regressing #107–#109 behavior.

### Approaches

1. **Dedicated per-user/per-finca preference repository and API** — add a normalized persistence table keyed by `(usuarioId, fincaId)`, an application port/use case, authenticated GET/PUT endpoints, and route integration that reads preferences and saves validated column/page-size selections.
   - Pros: satisfies cross-device persistence, clean-architecture boundaries, explicit RBAC/isolation, testable fallback behavior, and avoids coupling preferences to animal reads.
   - Cons: requires schema migration, endpoint contracts, concurrency/last-write semantics, and coordinated frontend changes.
   - Effort: High

2. **Embed preferences in an existing user/finca or generic configuration record** — store serialized columns and page size in an existing table or `config_parametros_finca`.
   - Pros: fewer new tables and potentially less migration code.
   - Cons: wrong ownership model for per-user preferences, weaker validation/concurrency semantics, greater risk of cross-user leakage, and conflates operational finca configuration with user UI state.
   - Effort: Medium initially, High risk

3. **URL-only state with server synchronization later** — implement pagination and column selection in `pageSize`/`cols` immediately, without persistence.
   - Pros: smallest change and reuses #109 query serialization.
   - Cons: fails the core cross-device persistence acceptance criterion and would leave the change incomplete.
   - Effort: Medium

### Recommendation

Use Approach 1. Keep the existing list read contract authoritative for page data and totals, and introduce a dedicated application port plus database adapter for validated per-user/per-finca preferences. The server should normalize to the canonical 36-column registry, enforce immutable `codigo`/`nombre` visibility and RBAC, and return base 29-column defaults when preference reads fail or contain invalid data. The route should use server preferences as initial state, mutate `pageSize`/`cols` through the existing URL-owned query model, reset to page 1 on dataset-affecting changes, and debounce or otherwise serialize saves so stale writes cannot overwrite newer selections.

### Risks

- A new preference table/migration must preserve strict user-and-finca isolation and handle users changing active finca.
- Concurrent devices can overwrite each other; the design must define last-write-wins, versioning, or conflict behavior.
- Existing #109 URL replay and invalid-query correction can conflict with asynchronously loaded preferences; initialization order must avoid visible state flicker and stale writes.
- `codigo` and `nombre` are mandatory columns, and unknown/duplicate IDs must never corrupt stored preferences.
- The existing test-capability manifest reports runners and quality tools unavailable despite TDD/test commands being configured; verification planning must account for this limitation.
- A broad implementation is likely to exceed the 400-line review budget; the configured `auto-chain` delivery strategy recommends splitting backend persistence/API and frontend pagination/selector work into reviewable slices.

### Ready for Proposal

Yes. The orchestrator should carry forward the normalized change identifier `issue-110-animal-list-pagination-preferences`, the original requested title/context, and the recommendation to define a dedicated per-user/per-finca preference contract before implementation. Proposal work should explicitly resolve preference write concurrency, fallback semantics, endpoint shape, and whether pagination state is persisted alongside column visibility or only retained in the URL.
