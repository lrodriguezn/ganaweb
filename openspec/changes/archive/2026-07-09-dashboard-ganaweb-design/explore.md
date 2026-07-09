## Exploration: Dashboard / Inicio screen for GanaWeb

### Current State

- The monorepo scaffold is in place: TanStack Start app at `apps/web`, reusable UI package at `packages/ui` with migrated `ganado/` components and v1.2 design tokens.
- `packages/ui` already exports `MetricCard`, `SyncPill`, `AnimalCard`, `FincaSwitcher`, `ThemeToggle`, `Button`, `Drawer`, etc.
- The token system (`packages/ui/src/styles/globals.css`) already maps light/dark colors from `ganaweb-design.md` and is enforced by `packages/ui/tests/tokens.test.ts` (no `dark:` variants).
- `apps/web/src/routes/index.tsx` is currently a smoke-test landing page with hard-coded demo data, not the designed dashboard.
- No app-shell components (sidebar, bottom nav, header, FAB) and no dashboard-specific widgets (acción, producción, actividad reciente) exist yet.
- No application/domain use cases or DB queries for dashboard aggregates (metrics, alerts, production 7d, recent activity) exist yet.

### Affected Areas

- `apps/web/src/routes/index.tsx` — replace smoke-test landing with the Dashboard / Inicio route.
- `apps/web/src/routes/__root.tsx` (or a new layout route) — add the responsive app shell (sidebar on desktop, bottom nav on mobile, header).
- `packages/ui/src/ganado/` — add reusable shell widgets: `Sidebar`, `BottomNav`, `AppHeader`, `Fab`, `SearchTrigger`, `CardAccion`, `CardProduccion`, `CardActividad`.
- `packages/ui/src/index.ts` — export the new components from the barrel.
- `packages/aplicacion/src/` — define read use cases for dashboard data (resumen dashboard, alertas, producción semanal, actividad reciente) if real data is required in this change.
- `packages/ui/tests/` — add component tests for new widgets; the existing `tokens.test.ts` remains the guard for T-004.

### Approaches

1. **Reusable shell + dashboard widgets in `packages/ui`, demo data first**
   Build shell components and dashboard widgets in `packages/ui` as domain components; render them from `apps/web/src/routes/index.tsx` with typed props fed by hard-coded demo fixtures. Replace fixtures later with server functions / use cases.
   - Pros: Follows the existing `packages/ui` migration pattern (IA-003), reusable for other routes, keeps the route thin, makes it easy to lock design pixel-to-token.
   - Cons: Expands `packages/ui` surface; requires updating barrel exports and rebuilding the package.
   - Effort: Medium

2. **Page-local components in `apps/web`**
   Implement the dashboard layout and widgets as local components inside `apps/web`, importing only existing `MetricCard`/`SyncPill` from `packages/ui`.
   - Pros: Fastest initial implementation, less package surface.
   - Cons: Shell components (sidebar/bottom nav) would be duplicated for future routes, harder to unit-test in isolation, weaker reuse.
   - Effort: Low/Medium

3. **Full-stack first (domain + DB + UI)**
   Define dashboard read models, application use cases, repository queries, and DB views before building the UI.
   - Pros: Clean architecture from day one, testable aggregates.
   - Cons: Depends on repositories/schema readiness; longer feedback loop; may delay design verification against the `.op` frames.
   - Effort: High

### Recommendation

Go with **Approach 1**, scoped in two slices:

1. **UI/Layout slice**: create reusable `Sidebar`, `BottomNav`, `AppHeader`, `CardAccion`, `CardProduccion`, `CardActividad`, and update `index.tsx` to render the dashboard with fixture data. This lets us prove the design exactly against the Figma `.op` frames and the v1.2 tokens, including both light and dark modes.
2. **Data slice**: add server functions in `apps/web` that delegate to `packages/aplicacion` use cases (e.g., `ObtenerResumenDashboard`, `ObtenerAlertas`, `ObtenerProduccionSemanal`) to replace fixtures.

This balances reuse, design fidelity, and clean-architecture dependency rules.

### Risks

- `MetricCard` currently renders context inline after the value; the desktop design shows context on a separate line for the "Preñadas" metric. A layout variant or prop will be needed to match the design without breaking existing consumers.
- The 7-day production chart is simple bars; pure CSS/flexbox bars match the design, but if future charts need axes/tooltips, a chart library will be required later.
- No command palette or real search exists yet; the "Buscar animal… ⌘K" field is a placeholder in this scope unless explicitly expanded.
- Navigation shell active state and route integration must be decided: add to `__root.tsx` or create a TanStack Start layout route (`_app.tsx`). The latter is cleaner but needs verification of the file-based layout convention.
- Dashboard data aggregates may require new DB views or indexes; if implemented in the same change, it touches `packages/db` and `packages/aplicacion`, increasing review size.
- The emoji placeholder (🔍) in the search field could render inconsistently; using a `lucide-react` icon is more robust but is a minor deviation from the `.op` literal.

### Ready for Proposal

Yes. The next step is `sdd-propose` to decide: (a) whether to implement shell components in `packages/ui` or locally in `apps/web`, (b) whether the first slice uses fixture data or real server functions, and (c) the layout route strategy.
