## Exploration: iniciemos desarrollo de issue # 108

### Current State
Issue #108 is the frontend slice of epic #106: an online-only desktop animal table, explicitly dependent on the completed server-side contract from #107. Both issues remain open and carry `status:needs-review`; no implementation PR should be opened until the epic is approved.

The functional source of truth is RF-ANIM-LIST v2.1. It requires 36 DTO columns, 29 visible by default, seven optional columns, frozen Código/Nombre, server-owned data access, visual RBAC, five differentiated data/error states, URL-preserving 400 handling, semantic/accessibility behavior, and validation across the ten runtime themes. #108 intentionally covers the table, states, visual RBAC, and accessibility; filters/search/order, pagination/column preferences, and export belong to #109–#111.

The server contract is already represented in `apps/web/src/server/animal-list-contract.ts`, `apps/web/src/server/animal-list-http.ts`, `packages/aplicacion/src/puertos/animal-listado-port.ts`, and `packages/db/src/animal-infrastructure.ts`. The current route `apps/web/src/routes/_app/fincas/$fincaId/animales.tsx` still calls the legacy `listAnimalsAction` and passes a small CRUD-shaped `AnimalListItem[]` to `AnimalDesktopScreen`. The current component in `packages/ui/src/ganado/animal-crud.tsx` renders only four columns (Código, Nombre, Estado, Ubicación), has a basic search input without server query wiring, and lacks the required loading/empty/error/persistence/accessibility contract. Existing UI tests cover the legacy component but no coverage was found for the normalized list contract or the full desktop table.

### Affected Areas
- `apps/web/src/routes/_app/fincas/$fincaId/animales.tsx` — replace the legacy loader/data shape with the server-side list flow while preserving nested animal routes and ficha navigation.
- `apps/web/src/routes/api/fincas/$fincaId/animales.ts` — existing HTTP endpoint and session/RBAC boundary that the frontend must consume; do not duplicate authorization in the UI.
- `apps/web/src/server/animal-list-contract.ts` — canonical column IDs, response keys, filter keys, sort keys, defaults, and URL parsing that the UI must recognize exactly.
- `packages/ui/src/ganado/animal-crud.tsx` — current `AnimalDesktopScreen` is the primary replacement/extension point, but its CRUD item props are not the 36-field server DTO.
- `packages/ui/tests/animal-ui.test.tsx` — existing component test location; add focused table, states, keyboard, sticky/frozen-column, and permission tests in the proposal scope.
- `packages/aplicacion/src/puertos/animal-listado-port.ts` — server DTO types (`AnimalListadoRow`, `AnimalListadoResult`) consumed by the web adapter.
- `features/feature-003-listado_animales-desktop/requisito_listado_animales.md` — requirements LA-RBAC-02/03, LA-040–043, LA-060–063, LA-080–091 and acceptance criteria 1–3, 6, 9, 12 are the direct #108 coverage.
- `openspec/specs/animal-listado-server-contract/spec.md` — existing server-contract source of truth; #108 should consume it rather than redefine backend behavior.
- `openspec/specs/web/spec.md` and `openspec/specs/ui/spec.md` — enforce TanStack route/dependency direction, reuse of `packages/ui`, Spanish domain vocabulary, token-only theming, and no `dark:` variants.

### Approaches
1. **Extend the existing `AnimalDesktopScreen` in place** — evolve its props and rendering from CRUD rows to the normalized server DTO, then add query/state controls around it.
   - Pros: reuses the existing route/component exports and test location; smallest navigation surface; preserves current mobile/desktop split.
   - Cons: mixes the legacy CRUD presentation with a substantially different analytical-table contract; risks regressions and a large, hard-to-review component.
   - Effort: Medium

2. **Introduce a dedicated server-side animal-list desktop feature component** — keep `AnimalDesktopScreen` as a compatibility/legacy surface, add a focused table/state component and a thin route adapter using the existing HTTP contract.
   - Pros: isolates the new 29/36-column contract, makes state and accessibility tests explicit, and keeps the change aligned with the epic’s sub-issue boundaries.
   - Cons: requires new typed adapters and export wiring; temporary coexistence of two desktop list surfaces must be clearly named and tested.
   - Effort: Medium

### Recommendation
Use the dedicated feature component approach. Proposal scope should be frontend-only and limited to #108: route integration with the already-delivered #107 endpoint, 29-column canonical rendering with 7-column awareness, server-driven loading and data states, 400/403/500/timeout presentation semantics, visual RBAC for `Nuevo animal` and `Exportar`, row navigation, sticky/frozen layout, semantic table keyboard behavior, and component/route tests. Explicitly defer filter controls and URL mutation, pagination/column preference persistence, and export execution to #109–#111, while leaving extension points for those issues. The proposal must call out the #107 dependency and the epic approval gate.

### Risks
- #106 and #108 are still `status:needs-review`; implementation planning may be invalidated by maintainer scope changes before approval.
- The current route uses a legacy action and CRUD DTO, while the new endpoint returns a different 36-field contract; an adapter boundary is required to avoid accidental field/label drift.
- The requirement says `Exportar` is visually gated in #108, but export behavior is #111; the proposal must define a disabled/absent action contract without implementing export.
- RF-ANIM-LIST requires 10 theme validation and accessibility evidence, but OpenSpec testing metadata currently marks unit, integration, E2E, lint, typecheck, and coverage tooling as unavailable; test strategy and manual verification limits must be explicit.
- Sticky/frozen columns plus a wide 29-column table can create overflow, stacking, contrast, and keyboard-focus regressions; tests should verify semantics rather than only snapshots.
- Existing `AnimalDesktopScreen` has no `scope` attributes, `aria-sort`, loading/error states, or full-column rendering, so this is a material UI replacement rather than a small visual tweak.

### Ready for Proposal
Yes. Tell the proposal phase to create a frontend-only #108 change explicitly dependent on #107 and scoped to the table, state handling, visual RBAC, row navigation, layout/accessibility, and tests. It should preserve the epic’s online-only/29-visible/36-total contract, cite the direct RF requirements, and list #109–#111 capabilities as out of scope.
