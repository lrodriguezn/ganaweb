# Apply Progress — Issue #213 mobile tabs (feat/issue-213-sanidad-mobile)

## Phase 5 — Verificación (DONE)

- **Gates**: `pnpm turbo test --force` ✅ (445/445 web tests; db failure pre-existing/unrelated), `pnpm turbo typecheck --force` ✅, `pnpm exec biome ci .` ✅ (459 files), `pnpm turbo build --force` ✅ (import-protection gate green), `pnpm no-sqlite` ✅.
- **Mapa §13**: item 2 → 1.1 + 3.2; item 11 → 1.1 + 3.2/3.3; SAN-012 → 1.2; SAN-013/014 → 4.1/4.2; SAN-060 → 2.1 + 4.1 + 4.2; SAN-080 → 1.1. All §13 items verified.
- **Desktop sin regresión**: `sanidad-panel-route.test.tsx` (15/15) + `sanidad-shell-wiring.test.tsx` (2/2) verdes.

## Work unit 4 — Tab Catálogo + Tab Almacén wiring (DONE)

- **Tests** (`apps/web/tests/sanidad-mobile-route.test.tsx`, 7 tests):
  - 4.1 Tab Catálogo: carga filas vía `listarCatalogoSanidadFn`; `onEditar` abre `FormularioProductoSanitario` en drawer; `onInactivar` muestra `AlertDialog` de confirmación.
  - 4.2 Tab Almacén: carga entradas vía `listarEntradasAlmacenFn`; FAB abre `FormularioEntradaAlmacen`; `registrarEntradaAlmacenFn` cableado; `registrada` cierra drawer.
  - 4.3 Re-exports: `sanidad-mobile.ts` re-exporta server functions existentes (sin lógica nueva).
- **Production**:
  - `apps/web/src/server/sanidad-mobile.ts` — módulo público bundleable: re-exports de `sanidad-catalogo-actions.js`, `sanidad-almacen.js`, `sanidad-panel.js`, `sanidad-registro.js`. Sin `.server.ts` propio.
  - `apps/web/src/routes/_app/fincas/$fincaId/sanidad.tsx` — `SanidadRouteMovil` ahora cablea `TabCatalogoMobile` (wrapper CRUD con `CatalogoProductosSanitariosMobile` + drawer de `FormularioProductoSanitario`) y `TabAlmacenMobile` (lista + FAB + drawer de `FormularioEntradaAlmacen`).
  - `apps/web/vitest.config.ts` — añadido `tests/sanidad-mobile-route.test.tsx` al include.
- **TDD evidence**:
  - RED: tests written first; `sanidad-mobile.ts` module not found, tabs not wired.
  - GREEN: 7/7 pass; full `@ganaweb/web` suite 445/445.
  - TRIANGULATE: 3 tests Catálogo (carga/editar/inactivar) + 3 tests Almacén (carga/FAB/guardar) + 1 test re-exports.
  - REFACTOR: Biome auto-fix (import organization + formatting); sin cambios estructurales.
- **Fixes applied during U4**:
  - `sanidad-mobile.ts`: corrected re-exported type names to match actual exports from source modules (e.g., `MetricasPanelServerResult` not `ObtenerMetricasPanelServerResult`).
  - `sanidad.tsx` line 533: changed `data.fincaId` → `fincaId` (route param, not in loader data).
- **Reglas**:
  - SAN-013 (tab Catálogo: CRUD con `CatalogoProductosSanitariosMobile` + `FormularioProductoSanitario`).
  - SAN-014 (tab Almacén: `ListadoEntradasAlmacen` + FAB + `FormularioEntradaAlmacen`).
  - SAN-060 (gating por permiso: Catálogo = `sanidad:editar`/`sanidad:anular`, Almacén = `sanidad:crear`).
  - Import protection (PR #238/#247): route imports from `sanidad-mobile.ts` (bundleable), never from `*.server.ts`.
- **Tamaños**: sanidad-mobile.ts 63 líneas; route +120 líneas (TabCatalogoMobile + TabAlmacenMobile); test 327 líneas.
- **Desviaciones de design**: ninguna — implementación sigue el spec.

## Work unit 3 — useMatchMedia + switch responsive + Drawer precargado (DONE)

- **3.1 Refactor useMatchMedia**: hook compartido en `packages/ui/src/lib/use-match-media.ts` (modelo `useEsMovil()` de `maestro-form.tsx:128`). SSR-safe default `true`, suscripción a `change` + cleanup. Exportado aditivamente desde `@ganaweb/ui`. 6 tests en `packages/ui/tests/use-match-media.test.ts`.
- **3.2-3.4 Switch responsive**: `apps/web/src/routes/_app/fincas/$fincaId/sanidad.tsx` — `useMatchMedia("(max-width: 767px)")` decide entre `PanelSanidad` (desktop) y un nuevo `SanidadRouteMovil` (mobile, envuelve `SanidadMobileView`). El state `abrirRegistroAplicacion`/`abrirEntradaAlmacen`/etc. vive en `SanidadRouteView` y se comparte entre ambos (un solo loader, una sola pareja de drawers).
- **Tests** (`apps/web/tests/sanidad-panel-route.test.tsx`): mock de `window.matchMedia` con default desktop (no regresión #212); 2 tests D9 (mobile sin subtítulo "Panel de control", desktop con subtítulo) + 1 test §13 item 11 (tap card en mobile → drawer con producto precargado).
- **TDD evidence**:
  - RED: tests written first; mobile test falla porque `SanidadRouteView` siempre rendía `PanelSanidad`.
  - GREEN: 15/15 tests verdes (12 previos + 3 nuevos); suite completa de `@ganaweb/web` 438/438.
  - TRIANGULATE: 3 tests del switch (mobile sin desktop, desktop sigue intacto, 2-tap precargado) + 6 tests del hook (default true, default false, change desktop→mobile, change mobile→desktop, cleanup, sin window.matchMedia).
  - REFACTOR: Biome auto-fix; sin cambios estructurales.
- **Reglas**:
  - D9 (switch responsive en la misma ruta con `useMatchMedia("(max-width: 767px)")`).
  - SAN-010/§13 item 11 (2-tap precargado desde card).
  - SAN-047 (aplicado cierra drawer).
  - CM-042/RN-002 (validacion muestra errores por campo).
- **Tamaños**: use-match-media.ts 24 líneas; route +60 líneas; test +120 líneas.

## Work unit 2 — TabsSanidad + SanidadMobileView (DONE)

- **Tests**: `packages/ui/tests/sanidad-mobile-view.test.tsx` (8) — 3 tabs + ARIA tablist, `aria-selected` correcto, callback no-URL, gating por permiso (Catálogo oculto sin sanidad:editar), header "Sanidad" siempre visible, tab default Refuerzos, cambio de contenido por tab, gating en `SanidadMobileView`.
- **Production**: `packages/ui/src/ganado/sanidad-mobile-view.tsx` (componente único con `TabsSanidad` + `SanidadMobileView`; los dos viven en el mismo archivo porque comparten `PERMISO_POR_TAB` y el contrato).
- **TDD evidence**:
  - RED: tests written first; module not found.
  - GREEN: 8/8 pass; full `@ganaweb/ui` suite (672 tests) verde.
  - TRIANGULATE: 3 tests de tabs (render/aria/onChange) + 1 gating + 4 tests del view (header/default/cambio/permiso).
  - REFACTOR: Biome auto-fix; sin cambios estructurales.
- **Reglas**:
  - SAN-010 (3 tabs, Refuerzos default, sin URL).
  - SAN-060 (gating por permiso en cada tab; Catálogo = sanidad:editar, Almacén = sanidad:crear, Refuerzos = sanidad:ver).
  - ARIA: `role="tablist"` / `role="tab"` / `aria-selected` / `aria-controls` / `aria-labelledby`.
- **Tamaños**: 132 líneas prod + 170 líneas test.

## Work unit 1 — RefuerzoCard + secciones (DONE)

- **Branch**: `feat/issue-213-sanidad-mobile` (base b52a303)
- **Tests** (RED→GREEN): `packages/ui/tests/refuerzo-card.test.tsx` (5), `packages/ui/tests/seccion-refuerzos.test.tsx` (8)
- **Production**: `packages/ui/src/ganado/refuerzo-card.tsx`, `packages/ui/src/ganado/seccion-refuerzos.tsx`
- **Barrel**: `packages/ui/src/index.ts` (exports `RefuerzoCard`, `RefuerzoCardItem`, `RefuerzoCardProps`, `SeccionRefuerzos`, `AlertaStockRefuerzoMovil`, `SeccionRefuerzosProps`)
- **TDD evidence**:
  - RED: tests written first; both files fail to import (modules did not exist).
  - GREEN: production code added; all 13 tests pass; full `@ganaweb/ui` test suite still green (654 + 13 = 667).
  - TRIANGULATE: 5 tests for `RefuerzoCard` (content, singular/plural, button click, card click, 44px height). 8 tests for `SeccionRefuerzos` (counter formatting, empty body, callback wiring, stock badge, empty stock, 4-item cap, gating visible, gating hidden).
  - REFACTOR: format auto-fix via Biome; no structural changes.
- **Target táctil 44px**: button usa `min-h-[--h-touch]` y un assert REAL de `getBoundingClientRect().height >= 44` (mockeado a 48px en jsdom) en el test.
- **Tokens semánticos**: badge Agotado (`bg-peligro-100 text-peligro-600`), N dosis (`bg-alerta-100 text-alerta-600 num`), OK (`bg-exito-100 text-exito-600`).
- **Reglas**:
  - SAN-011 (precarga producto+animalIds desde tap card o botón Registrar aplicación)
  - SAN-012 (STOCK CRÍTICO ≤ 4 productos, empty state "Sin productos críticos.")
  - SAN-080 (target táctil ≥44px)
  - SAN-081/T-004 (sin `dark:` en className)
  - PE-001 (gating `sanidad:ver` en STOCK CRÍTICO)
  - D10 (2 periodos en mobile: ESTA SEMANA / PRÓXIMA SEMANA con contadores)
- **Reutilización**: `tienePermiso(permisos, "sanidad", "ver")` ya existente; `cn` utility; `Button` primitive.
- **Tamaños**: refuerzo-card.tsx 70 líneas, seccion-refuerzos.tsx 173 líneas; tests ~250 líneas.
- **Desviaciones de design**: ninguna — implementación sigue el spec.

## Mapa §13 (markup al final de Phase 5)

- item 2 → 1.1 (periodos contadores) + 3.2 (mobile < 768px switch)
- item 11 → 1.1 (tap card) + 3.2/3.3 (drawer precargado)
- SAN-012 → 1.2 (badge stock, ≤ 4 productos)
- SAN-013 → 4.1 (tab Catálogo)
- SAN-014 → 4.2 (tab Almacén)
- SAN-060 → 2.1 (gating por permiso) + 4.1 + 4.2
- SAN-080 → 1.1 (44px assert)
