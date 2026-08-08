# Apply Progress — Issue #213 mobile tabs (feat/issue-213-sanidad-mobile)

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
