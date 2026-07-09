# Proposal: Dashboard / Inicio — UI/Layout Slice

## Intent

The current `apps/web/src/routes/index.tsx` is a smoke-test landing page. GanaWeb needs the real Dashboard / Inicio screen matching the design in `ganaweb-diseno.op` (frame-0080 desktop, frame-0133 mobile) to serve as the primary entry point for livestock operators.

## Scope

### In Scope
- App shell: `Sidebar` (desktop 240px), `BottomNav` (mobile 64px + FAB), `AppHeader` (56px)
- Dashboard widgets: `CardAccion`, `CardProduccion`, `CardActividad`
- Route integration: replace `index.tsx` smoke-test with dashboard layout
- Fixture data (typed props, no real DB queries)
- Light + dark mode token compliance (no `dark:` variants)

### Out of Scope
- Real data: server functions, use cases, DB queries (deferred to data slice)
- Search/command palette (`Buscar animal… ⌘K` is placeholder)
- Route integration for Animales, Eventos, etc. (only dashboard route)
- Chart library (production bars are pure CSS/flexbox)

## Capabilities

### New Capabilities
- `app-shell`: Responsive shell — Sidebar (desktop), BottomNav + FAB (mobile), AppHeader with FincaSwitcher + SyncPill + SearchTrigger placeholder
- `dashboard`: Dashboard / Inicio page — MetricCards (4), CardAccion, CardProduccion, CardActividad with fixture data

### Modified Capabilities
- `ui`: Add 6 new components to `packages/ui` barrel (Sidebar, BottomNav, AppHeader, Fab, CardAccion, CardProduccion, CardActividad)

## Approach

1. **Shell components in `packages/ui`**: `Sidebar`, `BottomNav`, `AppHeader`, `Fab` as reusable domain components following the existing migration pattern (IA-003)
2. **Dashboard widgets in `packages/ui`**: `CardAccion` (alert rows with danger/warning badges), `CardProduccion` (7-day bar chart, CSS-only), `CardActividad` (recent activity rows)
3. **Route integration**: layout route (`_app.tsx`) for shell, `index.tsx` for dashboard content with typed fixture props
4. **Barrel exports**: update `packages/ui/src/index.ts`
5. **Fixture data**: typed constants file in `apps/web` with demo data matching `.op` frames

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/ui/src/ganado/sidebar.tsx` | New | Sidebar component (desktop nav) |
| `packages/ui/src/ganado/bottom-nav.tsx` | New | BottomNav + FAB (mobile) |
| `packages/ui/src/ganado/app-header.tsx` | New | Header shell component |
| `packages/ui/src/ganado/card-accion.tsx` | New | Alert/action card widget |
| `packages/ui/src/ganado/card-produccion.tsx` | New | 7-day production chart card |
| `packages/ui/src/ganado/card-actividad.tsx` | New | Recent activity card |
| `packages/ui/src/index.ts` | Modified | Add new exports |
| `apps/web/src/routes/_app.tsx` | New | Layout route with shell |
| `apps/web/src/routes/index.tsx` | Modified | Dashboard content with fixtures |
| `apps/web/src/lib/fixtures/dashboard.ts` | New | Typed fixture data |

## PR Strategy

| PR | Scope | Est. Lines |
|----|-------|------------|
| PR1 | Shell components (Sidebar, BottomNav, AppHeader, Fab) | ~350 |
| PR2 | Dashboard widgets (CardAccion, CardProduccion, CardActividad) | ~350 |
| PR3 | Route integration + fixtures + barrel exports | ~200 |

All PRs under 400-line budget. Chained: PR2 depends on PR1, PR3 depends on PR2.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| MetricCard layout variant needed (context on separate line) | Med | Add `contextBelow` prop variant |
| TanStack Start layout route convention unclear | Med | Verify `_app.tsx` convention before PR1 |
| Emoji (🔍) renders inconsistently | Low | Use `lucide-react` Search icon |

## Rollback Plan

Each PR is independently revertable. Shell components are additive (new files). Route integration (PR3) can revert to smoke-test `index.tsx` without affecting PR1/PR2 components.

## Dependencies

- Existing `MetricCard`, `SyncPill`, `FincaSwitcher` from `packages/ui`
- `lucide-react` for icons (already in shadcn deps)

## Success Criteria

- [ ] Desktop (1440x900): sidebar 240px, header 56px, 4 MetricCards, CardAccion, CardProduccion, CardActividad — matches frame-0080
- [ ] Mobile (390x844): no sidebar, BottomNav 64px with FAB, 2x2 MetricGrid, stacked cards — matches frame-0133
- [ ] Light + dark mode: all tokens resolve, zero `dark:` variants
- [ ] All new components exported from `packages/ui` barrel
- [ ] Component tests pass (Vitest)
