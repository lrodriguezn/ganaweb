## Exploration: Listado animales: filtros tipados, búsqueda, orden y URL recuperable (Issue #109)

### Current State
Issue #109 is an approved, open sub-issue of epic #106. Its scope is the frontend filter/search/sort and canonical URL behavior for the online-only animal list, dependent on #107 (server contract) and #108 (desktop table). The issue requires typed `contains`, `in`, `range`, `drange`, and `bool` filters; stable ID/key transport with label-only presentation; AND-combined filters plus OR search with 300 ms debounce; chips and reset behavior; ASC/DESC/no-sort cycling; and synchronization of `page`, `pageSize`, `sort`, `q`, `f.*`, and valid `cols`.

The #107 contract is already available in `apps/web/src/server/animal-list-contract.ts`: the canonical 36-column matrix, default `codigo:asc`, filter grammar validation, stable filter keys, `cols` normalization, and `parseAnimalListadoQuery`. The HTTP adapter in `apps/web/src/features/animal-listado/animal-listado-route-adapter.ts` already accepts a serialized query and maps 400 responses to `consulta_invalida`. The #108 table in `packages/ui/src/ganado/animal-listado-desktop.tsx` already exposes an `onLimpiarFiltros` seam and mirrors server sort through `aria-sort`, but it deliberately does not own filter controls or general URL mutation.

The route `apps/web/src/routes/_app/fincas/$fincaId/animales.tsx` is the integration hub: it loads the list, owns route state, and renders the desktop component. Existing server parsing validates a query as a whole and returns one `campo` on invalid input; the frontend must therefore preserve the last valid table while removing or correcting all indicated invalid parameters across subsequent requests. The functional source of truth is `features/feature-003-listado_animales-desktop/requisito_listado_animales.md`, especially LA-001/010–021, LA-040, LA-043, and LA-100.

### Affected Areas
- `apps/web/src/routes/_app/fincas/$fincaId/animales.tsx` — primary state and integration boundary for URL-driven query changes, debounced search, reloads, invalid-query recovery, and page reset semantics.
- `apps/web/src/server/animal-list-contract.ts` — canonical column/filter/sort metadata and parser; the UI must consume these stable keys and grammars rather than duplicate labels or rules.
- `apps/web/src/features/animal-listado/animal-listado-route-adapter.ts` — query serialization/request seam and 400/valid-table handling boundary.
- `packages/ui/src/ganado/animal-listado-desktop.tsx` — toolbar/action and table extension points for search, chips, filter controls, sort interaction, `aria-sort`, and `onLimpiarFiltros`.
- `packages/ui/tests/animal-ui.test.tsx` — component coverage for controls, chips, accessible sort state, debounce-facing callbacks, and reset behavior.
- `apps/web/tests/animal-listado-route.test.tsx` — route/adapter coverage for URL replay, canonical serialization, page reset, and invalid-parameter sanitization.
- `features/feature-003-listado_animales-desktop/requisito_listado_animales.md` — normative RF-ANIM-LIST v2.1 matrix and acceptance criteria.
- `openspec/specs/animal-listado-server-contract/spec.md` and `openspec/specs/animal-listado-desktop-ui/spec.md` — existing contracts to extend without redefining #107 or violating #108 non-goals.

### Approaches
1. **Route-owned query controller with presentational filter controls** — keep canonical query state and serialization in the route/feature adapter, pass display-ready state and callbacks to focused UI controls, and reuse the existing parser metadata.
   - Pros: preserves clean route/server boundary; makes URL replay and last-valid-table recovery testable; avoids duplicating canonical keys; aligns with #108's existing action seam.
   - Cons: requires a deliberate typed view-model/callback contract and coordination across route, adapter, and toolbar.
   - Effort: Medium

2. **Generic client-side filter state library or local-only table state** — maintain filter/search/sort state inside the table and synchronize the URL as a secondary effect.
   - Pros: can reduce initial route plumbing and encapsulate control state.
   - Cons: risks divergent serialization, stale URL replay, incorrect 400 recovery, and coupling #109 behavior to a large UI component; contradicts the requirement that the URL be the reproducible source of view state.
   - Effort: Medium/High

### Recommendation
Use the route-owned query controller with focused presentational controls. Treat `URLSearchParams` as the canonical replayable state, derive typed control models from the existing #107 column matrix, serialize IDs/keys and grammar values exactly once, and pass the resulting query to `cargarListadoDesktop`. Keep the last successful model during 400 responses, remove every invalid parameter identified by `campo` over the correction cycle, reset to `page=1` for filter/search/sort/page-size changes, and expose a single #109-owned clear-filters callback to #108.

Keep #111's export UI read-only with respect to this contract: both issues touch the route and toolbar, so #109 should establish the stable query serialization seam first and #111 should rebase on it. #110 remains out of scope except for preserving valid `pageSize`/`cols` parameters.

### Risks
- The route and `AnimalListadoDesktop` toolbar are shared integration points with #111; uncontrolled edits would create merge collisions. Define narrow callbacks and rebase dependent work.
- The server parser currently reports one invalid field per parse; sanitization must iterate without discarding the last valid table or unrelated valid parameters.
- Search debounce, URL history behavior, and page reset can create duplicate requests or stale responses unless request identity/abort behavior is specified.
- The functional document permits no-sort while the current typed response model represents a sorted state; proposal/spec phases must resolve the exact URL representation and response behavior before implementation.
- OpenSpec testing metadata marks unit, integration, E2E, lint, and typecheck tooling unavailable despite repository test locations; downstream planning must state executable versus manual evidence explicitly.

### Ready for Proposal
Yes. Create the proposal for `issue-109` with explicit GitHub traceability to #109, dependency on completed #107/#108 contracts, frontend ownership of filter/search/sort/URL state, and a clear exclusion of pagination/column preferences (#110) and export execution (#111). The next phase should define the canonical serialization, invalid-URL correction loop, no-sort representation, history policy, and response-staleness behavior before task breakdown.
