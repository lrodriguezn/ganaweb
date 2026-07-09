# Design: Dashboard / Inicio — UI/Layout Slice

## Technical Approach

Build the Dashboard / Inicio as **presentational shell + widget components in `packages/ui`**, wired into a TanStack Start **layout route** (`_app.tsx`) with fixture data in `apps/web`. All components consume CSS tokens from `globals.css` via Tailwind v4 `@theme` mappings — zero `dark:` variants (theme switch is `<html class="dark">`, exactly like `ThemeToggle`). Reuse existing `MetricCard`, `SyncPill`, `FincaSwitcher`, `ThemeToggle`. The 7-day production bars are pure CSS flexbox using the `dom-produccion` token (no chart library). Maps to proposal PR1 (shell) → PR2 (widgets) → PR3 (route + fixtures).

## Architecture Decisions

### Decision: Layout route convention

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `_app.tsx` pathless layout route | Shell renders once; `Outlet` per page; TanStack file-based convention | ✅ Chosen |
| Shell inside `__root.tsx` | Root already owns `<html>`/`<head>`/globals import — mixing shell there blurs concerns | Rejected |
| Shell repeated per route | DRY violation, drift risk | Rejected |

`_app.tsx` is a pathless layout (TanStack auto-treats `_`-prefixed files as layout routes). `__root.tsx` stays the document shell; `_app.tsx` is the **app chrome** (Sidebar + AppHeader + BottomNav + `<Outlet/>`).

### Decision: Responsive shell strategy

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Sidebar + BottomNav both mounted, CSS-toggled at `md:` (768px) | One tree, no JS branching, matches design system breakpoint | ✅ Chosen |
| JS `useMediaQuery` to swap components | Hydration mismatch risk, extra state | Rejected |

CSS Grid shell: `grid-cols-[240px_1fr]` on `md+` → `grid-cols-1` on mobile. Sidebar `hidden md:flex`; BottomNav `flex md:hidden`. AppHeader always visible (56px, `--h-header`).

### Decision: Production chart rendering

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Pure CSS flexbox bars, height `%` of max | Zero deps, matches `.op` (rectangles only), theme tokens auto-apply | ✅ Chosen |
| Recharts/visx | 80KB+ for 7 bars, out of scope | Rejected |

Bars use `bg-dom-produccion` token; height = `(value/max)*100%`. Delta badge uses `text-exito-600`.

## Data Flow

    _app.tsx (shell) ── props ──→ Sidebar / AppHeader / BottomNav
         │                                              │
         └── Outlet ──→ index.tsx ──→ MetricCard[] / CardAccion / CardProduccion / CardActividad
                              │
                              └── reads typed fixtures from lib/fixtures/dashboard.ts

No server functions, no DB. All props typed; fixtures are the single source for the demo slice.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `packages/ui/src/ganado/sidebar.tsx` | Create | Desktop nav (240px): Inicio/Animales/Eventos/Sanidad/Reportes/Tareas + Configuración footer; active item `bg-seleccion` + `text-pasto-600` |
| `packages/ui/src/ganado/bottom-nav.tsx` | Create | Mobile 5-slot nav (64px, `--h-bottomnav`) + centered elevated FAB (48px, `-mt-3.5`) |
| `packages/ui/src/ganado/app-header.tsx` | Create | 56px header composing `FincaSwitcher` (left), `SearchTrigger` placeholder (lucide `Search` + "Buscar animal… ⌘K", center-right), `SyncPill` + `ThemeToggle` (right) |
| `packages/ui/src/ganado/fab.tsx` | Create | Floating action button — `bg-primary text-on-primary rounded-full size-12` |
| `packages/ui/src/ganado/card-accion.tsx` | Create | "Requiere atención" card; `AlertRow` list (dot + text + chevron), dot color by `severidad: "alerta" \| "peligro"` |
| `packages/ui/src/ganado/card-produccion.tsx` | Create | 7 CSS bars + title + delta badge; `DatoProduccion[]` prop (7 entries) |
| `packages/ui/src/ganado/card-actividad.tsx` | Create | "Actividad reciente" rows: text left + timestamp caption right, 1px dividers (`border-tierra-200`) |
| `packages/ui/src/ganado/types.ts` | Modify | Add `ItemNav`, `AlertaAccion`, `DatoProduccion`, `ActividadReciente` types |
| `packages/ui/src/index.ts` | Modify | Export 7 new components + 4 types |
| `apps/web/src/routes/_app.tsx` | Create | Pathless layout: Grid shell + Sidebar/AppHeader/BottomNav + `<Outlet/>` |
| `apps/web/src/routes/index.tsx` | Modify | Replace smoke-test with dashboard: 4 MetricCards grid, 3 cards, page title "Inicio" |
| `apps/web/src/lib/fixtures/dashboard.ts` | Create | Typed fixture constants matching frames 0080/0133 |

## Interfaces / Contracts

```ts
export interface ItemNav { id: string; label: string; ruta: string; icono: ReactNode }
export interface SidebarProps { items: ItemNav[]; activoId: string; onNavigate: (i: ItemNav) => void; puedeConfigurar?: boolean }
export interface BottomNavProps { items: ItemNav[]; activoId: string; onNavigate: (i: ItemNav) => void; onFab: () => void }
export interface AppHeaderProps { fincas: FincaResumen[]; fincaActivaId: string; offline: boolean; estadoSync: EstadoSync; pendientes?: number; onBuscar: () => void; onSync: () => void; onCambiarFinca: (f: FincaResumen) => void }
export interface AlertaAccion { id: string; texto: string; severidad: "alerta" | "peligro" }
export interface CardAccionProps { alertas: AlertaAccion[]; onVerTodas: () => void }
export interface DatoProduccion { dia: string; litros: number }
export interface CardProduccionProps { datos: DatoProduccion[]; deltaPct: number }
export interface ActividadReciente { id: string; texto: string; hace: string }
export interface CardActividadProps { actividades: ActividadReciente[] }
```

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | Each shell/widget renders props, active states, bar heights | Vitest + Testing Library on `packages/ui` |
| Unit | Token resolution (no `dark:` leakage) | Lint rule / grep assertion in CI |
| Integration | `_app.tsx` + `index.tsx` render with fixtures, responsive classes present | Vitest + router stub |
| E2E | Desktop 1440x900 & mobile 390x844 match frames | Playwright (deferred — runner not scaffolded per `openspec/config.yaml`) |

## Migration / Rollout

No migration. PR3 reverts trivially to smoke-test `index.tsx`; PR1/PR2 are additive (new files only).

## Open Questions

- [ ] Confirm `_app.tsx` pathless-layout behavior under TanStack Start v1 (verify before PR1)
- [ ] MetricCard: design shows 24px value vs component's `text-metric` (28px) — accept minor delta or add `size` prop?
