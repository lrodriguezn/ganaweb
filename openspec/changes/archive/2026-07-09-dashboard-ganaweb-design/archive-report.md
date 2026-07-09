# Archive Report: Dashboard / Inicio — UI/Layout Slice

**Change**: `dashboard-ganaweb-design`
**Archived**: 2026-07-09
**Mode**: OpenSpec

## Executive Summary

Successfully archived the dashboard-ganaweb-design SDD change. All 15 implementation tasks were completed across 3 stacked PRs (PR1: Shell + Types, PR2: Dashboard Widgets, PR3: Route Integration). Delta specs for `app-shell` and `dashboard` were copied to the main specs directory. No CRITICAL verification issues remain.

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| ui/app-shell | Created (new capability) | Responsive layout shell: Sidebar, BottomNav, AppHeader, Fab — 5 requirements |
| ui/dashboard | Created (new capability) | Dashboard / Inicio page: MetricCards, CardAccion, CardProduccion, CardActividad — 5 requirements |
| ui/spec.md | Updated (cross-references) | Added "Related Capabilities" section linking to new app-shell and dashboard specs |

## PR Summary

| PR | Scope | Status | Key Deliverables |
|----|-------|--------|-----------------|
| PR1 | Shell + Types (~360 lines) | ✅ Complete | Sidebar, BottomNav, AppHeader, Fab, ItemNav/AlertaAccion/DatoProduccion/ActividadReciente types |
| PR2 | Dashboard Widgets (~360 lines) | ✅ Complete | CardAccion, CardProduccion (7-day CSS bars), CardActividad, responsive MetricCard |
| PR3 | Route Integration (~220 lines) | ✅ Complete | `_app.tsx` pathless layout, `index.tsx` dashboard, fixture data, barrel exports |

## Task Completion (15/15)

### PR 1 — Shell + Types
- [x] T-015 — Shared types (`ItemNav`, `AlertaAccion`, `DatoProduccion`, `ActividadReciente`)
- [x] T-001 — `sidebar.tsx` (240px desktop nav, 6 items + Configuración footer)
- [x] T-002 — `bottom-nav.tsx` (mobile 64px, 5 slots + FAB)
- [x] T-003 — `app-header.tsx` (56px, FincaSwitcher + SearchTrigger + SyncPill + ThemeToggle)
- [x] T-004 — `fab.tsx` (48px circle, primary bg)
- [x] T-005 — Barrel exports update

### PR 2 — Dashboard Widgets
- [x] T-006 — `card-accion.tsx` ("Requiere acción", count badge, alert rows)
- [x] T-007 — `card-produccion.tsx` (7-day CSS bars, delta indicator)
- [x] T-008 — `card-actividad.tsx` (recent activity rows with dividers)
- [x] T-009 — `metric-card.tsx` responsive context (`contextBelow` prop)
- [x] T-010 — Barrel exports update

### PR 3 — Route Integration
- [x] T-011 — `_app.tsx` pathless layout (Grid shell + Sidebar/AppHeader/BottomNav + Outlet)
- [x] T-012 — Fixture data (`MOCK_METRICS`, `MOCK_ALERTAS`, `MOCK_PRODUCCION`, `MOCK_ACTIVIDAD`)
- [x] T-013 — `index.tsx` dashboard (page title, 4-up MetricCards, CardAccion, CardProduccion, CardActividad)
- [x] T-014 — Verification: no `dark:` variants, typecheck + build pass

## Verification Results

| Check | Result |
|-------|--------|
| All 15 tasks complete | ✅ |
| No `dark:` variants in new components | ✅ (T-014 grep confirmed) |
| TypeScript typecheck passes | ✅ (`pnpm turbo typecheck`) |
| Build passes | ✅ (`pnpm turbo build`) |
| CRITICAL issues | None |

Verify reports persisted in Engram:
- `sdd/dashboard-ganaweb-design/verify-pr1`
- `sdd/dashboard-ganaweb-design/verify-pr2`
- `sdd/dashboard-ganaweb-design/verify-pr3`

## Archive Contents

```
openspec/changes/archive/2026-07-09-dashboard-ganaweb-design/
├── archive-report.md    (this file)
├── proposal.md          (intent, scope, approach, risks, rollback)
├── explore.md           (exploration notes)
├── design.md            (architecture decisions, data flow, interfaces)
├── tasks.md             (15/15 tasks complete)
└── specs/
    ├── app-shell.md     (5 requirements, responsive shell)
    └── dashboard.md     (5 requirements, dashboard page)
```

## Source of Truth Updated

| File | Status |
|------|--------|
| `openspec/specs/ui/app-shell.md` | Created (new capability spec) |
| `openspec/specs/ui/dashboard.md` | Created (new capability spec) |
| `openspec/specs/ui/spec.md` | Updated (cross-references added) |

## Components Delivered

| Component | File | Type |
|-----------|------|------|
| Sidebar | `packages/ui/src/ganado/sidebar.tsx` | New |
| BottomNav | `packages/ui/src/ganado/bottom-nav.tsx` | New |
| AppHeader | `packages/ui/src/ganado/app-header.tsx` | New |
| Fab | `packages/ui/src/ganado/fab.tsx` | New |
| CardAccion | `packages/ui/src/ganado/card-accion.tsx` | New |
| CardProduccion | `packages/ui/src/ganado/card-produccion.tsx` | New |
| CardActividad | `packages/ui/src/ganado/card-actividad.tsx` | New |
| MetricCard (modified) | `packages/ui/src/ganado/metric-card.tsx` | Modified |
| Types (modified) | `packages/ui/src/ganado/types.ts` | Modified |
| _app.tsx | `apps/web/src/routes/_app.tsx` | New |
| index.tsx (dashboard) | `apps/web/src/routes/index.tsx` | Modified |
| Fixtures | `apps/web/src/lib/fixtures/dashboard.ts` | New |

## Risks

- **None remaining**. All proposal risks were mitigated:
  - `contextBelow` prop added to MetricCard for layout variant ✅
  - `_app.tsx` pathless layout convention confirmed ✅
  - Lucide `Search` icon used instead of emoji ✅

## SDD Cycle Complete

The change has been fully planned, implemented, verified, and archived.
Ready for the next change.
