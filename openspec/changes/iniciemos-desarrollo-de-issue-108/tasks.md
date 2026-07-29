# Tasks: Desktop Animal List (Issue #108)

Gates/exclusions: #106 approved + #107 delivered before any PR (task 1.1); #109 filters/search/order, #110 pagination/selector/prefs, #111 export execution excluded; `Lugar compra` never renders; online-only. Strict TDD: RED before GREEN (`pnpm turbo test`). Design cites `animal-actions.ts`; verified real path is `animal-actions.server.ts`.

## Phase 1: Foundation — #107 Adapter and Visual Permission Projection (PR 1)

- [x] 1.1 **Gate verification** — confirm epic #106 approved and #107 endpoint delivered. Files: none. AC: both confirmed in tracker before PR 1. ~0 lines. (Verified 2026-07-29: #107 CLOSED/delivered; #106 epic OPEN — `status:approved` label still pending; PR opening gated on it.)
- [x] 1.2 **RED: adapter registry tests** — 36 `columnId`/`responseKey` recognition, 29 canonical order, null → `-`/`Sin registrar` (never `null`/0). Files: `apps/web/tests/animal-listado-route.test.tsx` (create). AC: tests fail for those assertions. ~90 lines.
- [x] 1.3 **GREEN: route adapter** — typed from `AnimalListadoResponseDto` + `ANIMAL_LIST_COLUMNS`; builds `AnimalListadoDesktopModel`; no label-derived mapping. Files: `apps/web/src/features/animal-listado/animal-listado-route-adapter.ts` (create). AC: 1.2 passes. ~160 lines.
- [x] 1.4 **400 sanitization (LA-040–043)** — RED then GREEN: retain last valid model, strip invalid `campo`, reset page when required, emit toast payload. Files: adapter + route tests. AC: spec scenario "Invalid query preserves data" passes. ~60 lines.
- [x] 1.5 **RED: projection tests** — every permission combination plus global `*:*`; denial/failure fails closed. Files: route tests. AC: failing tests — both flags false on denial/error, no false 403. ~60 lines.
- [x] 1.6 **GREEN: permission projection** — `obtenerSesionActual(getAuthDeps())(readSessionToken(), fincaId)` → `{canCreate, canExport}`; canCreate = `animales:crear`; canExport = `animales:ver && reportes:exportar`. Files: `apps/web/src/server/animal-listado-permissions.server.ts` (create). AC: 1.5 passes. ~50 lines.
- [x] 1.7 **Server fn exposure** — `getAnimalListadoVisualPermissionsAction` via `createServerFn`; read-only, no authorization policy change. Files: `apps/web/src/server/animal-actions.server.ts` (modify). AC: typed flags serialize; #107 untouched. ~25 lines.

## Phase 2: Presentational Table (PR 2)

- [x] 2.1 **RED: semantic tests** — table semantics, scoped headers, `aria-sort`, `aria-live`, labelled controls, 29 Spanish labels in canonical order. Files: `packages/ui/tests/animal-ui.test.tsx` (modify). AC: tests fail for those assertions. ~70 lines. (RED: module-missing failure.)
- [x] 2.2 **GREEN: table component** — renders 29 columns from model, recognizes 36, null-safe cells, no `Lugar compra`. Files: `packages/ui/src/ganado/animal-listado-desktop.tsx` (create). AC: 2.1 passes. ~180 lines. (10/10 pass.)
- [x] 2.3 **Row navigation (LA-080–091)** — RED then GREEN: click/Enter outside a control navigates to ficha; embedded controls keep their action. Files: component + tests. AC: keyboard scenario passes. ~50 lines. (RED 3 failed → GREEN 14/14.)
- [x] 2.4 **States (LA-060–063)** — RED then GREEN: loading skeletons 36–40 px retaining headers; finca-empty `totalSinFiltro===0`; no-results `total===0` with optional #109-supplied `Limpiar filtros` slot (no owned behavior); 403 clears data + `No tienes acceso a esta finca` + safe return; 500/timeout offers `Reintentar`, never silent empty. Files: component + tests. AC: all state scenarios pass. ~130 lines. (RED 5 failed → GREEN 19/19.)
- [x] 2.5 **Visual RBAC (LA-RBAC-02/03, PE-001–003)** — RED then GREEN: `Nuevo animal` only with canCreate; `Exportar` only with canExport and inert (no #111 dialog/download); absent without permission; table stays usable. Files: component + tests. AC: permission scenarios pass. ~50 lines. (RED 3 failed → GREEN 23/23. Presence is permission-only; route always wires handlers.)
- [x] 2.6 **Token layout (T-004, IA-003)** — RED then GREEN: sticky header, frozen `Código`/`Nombre`, 36–40 px rows, AA contrast across ten appearances via CSS tokens only, no `dark:`. Files: component + tests. AC: scroll-retains-context and theme scenarios pass. ~60 lines. (RED 3 failed → GREEN 28/28; ten-appearance sweep renders 29 headers + live status with zero `dark:` utilities.)
- [x] 2.7 **Public export** — export `AnimalListadoDesktop` and props. Files: `packages/ui/src/index.ts` (modify). AC: import resolves from `@ganaweb/ui`. ~5 lines. (RED: barrel import undefined → GREEN: identity + type re-export pass.)

## Phase 3: Route Wiring and Integration (PR 3)

- [x] 3.1 **RED: route integration tests** — #107 success/400/403/500-timeout reach only the desktop adapter; legacy action remains mobile-only; ficha navigation spies. Files: `apps/web/tests/animal-listado-route.test.tsx`, `apps/web/tests/animal-listado-route-integration.test.tsx` (create, jsdom), `apps/web/vitest.config.ts` (include). AC: tests fail for those assertions. ~90 lines. (RED: 20 failed — 11 unit `cargarListadoDesktop`/`orden` + 9 jsdom `AnimalsListRouteView`; safety net 21/21 stayed green.)
- [x] 3.2 **GREEN: route wiring** — desktop loads #107 DTO plus projection; preserve mobile branch, `Outlet`, navigation; projection fails closed. Files: `apps/web/src/routes/_app/fincas/$fincaId/animales.tsx` (modify), `apps/web/src/server/animal-actions.ts` (facade exposure), `apps/web/src/features/animal-listado/animal-listado-route-adapter.ts` (`cargarListadoDesktop` + `orden`). AC: 3.1 passes; `AnimalDesktopScreen` retained as rollback surface. ~90 lines. (GREEN: unit 32/32, integration 9/9, apps/web 42/42. Documented deviation: the #107 fetch runs in the exported `AnimalsListRouteView` client effect — LA-040–043 retain/sanitize/announce is client-stateful; loader keeps projection + legacy mobile data as designed.)
- [x] 3.3 **Manual QA** — AA contrast across five styles × claro/oscuro; states on a seeded finca. Files: `openspec/changes/iniciemos-desarrollo-de-issue-108/manual-qa-contrast-matrix.md`. AC: matrix recorded (automated runners unavailable per `openspec/config.yaml`). ~0 lines. (Human-executable matrix: 10 appearances × 10 token surfaces + state coverage; automated guards cited: ten-appearance render sweep + T-004 scanner.)

## Phase 4: Cleanup

- [x] 4.1 **Exclusion audit** — review final diff. Files: changed files. AC: no filter controls or URL mutation beyond LA-040, no #110, no #111 execution, no offline or `Lugar compra` changes. ~0 lines. (Audited 2026-07-29: 0 `lugarCompra`/offline/sync additions; sole `Exportar` addition is a boundary comment; 0 dominio/aplicacion/db/sync changes; #107 http/contract/api-route surface untouched; URL mutation only via the LA-040 `consulta_invalida` branch; integration tests 2–3 pin the legacy action to mobile.)
- [x] 4.2 **Boundary docs** — header comments citing #107 contract source and #109–#111 boundaries. Files: `animal-listado-desktop.tsx`, route adapter. AC: comments present. ~10 lines. (PR1/PR2 headers already cited source + boundaries; PR 3 added the wiring citations: route consumer in the adapter header, adapter contract + `ResultadoListadoDesktop` flow in the component header.)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 800–1,050 (PR1 ~445, PR2 ~545, PR3 ~180) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 (stacked to main) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Typed #107 adapter + fail-closed visual permission projection | PR 1 | `(cd apps/web && pnpm exec vitest run tests/animal-listado-route.test.tsx)` | N/A — pure logic, no UI surface yet | Delete `features/animal-listado/` + `animal-listado-permissions.server.ts`; revert `animal-actions.server.ts` |
| 2 | Presentational 29/36 table: states, RBAC, tokens | PR 2 | `(cd packages/ui && pnpm exec vitest run tests/animal-ui.test.tsx)` | N/A — presentational; exercised through the route in PR 3 | Remove `animal-listado-desktop.tsx` + `index.ts` export |
| 3 | Route wiring, integration, manual QA | PR 3 | `(cd apps/web && pnpm exec vitest run tests/animal-listado-route.test.tsx tests/animal-listado-route-integration.test.tsx)` | `pnpm dev` → `/fincas/{fincaId}/animales` with seeded session; contrast matrix 5×2 | Revert `animales.tsx` to legacy `AnimalDesktopScreen`; #107 untouched |
