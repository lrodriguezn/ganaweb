# Tasks: Dashboard / Inicio — UI/Layout Slice

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Total estimated lines | ~900 (PR1:360 + PR2:360 + PR3:220) |
| 400-line budget risk | Medium (per-PR safe; cumulative >400) |
| Chained PRs recommended | Yes |
| Suggested split | PR1 → PR2 → PR3 (stacked to main) |
| Delivery strategy | force-chained |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | PR | Base |
|------|------|----|------|
| 1 | Shell + shared types | PR 1 | `main` |
| 2 | Dashboard widgets | PR 2 | `main` (after PR1) |
| 3 | Route integration | PR 3 | `main` (after PR2) |

## PR 1 — Shell + Types (~360 lines)

- [x] **T-015** Add to `packages/ui/src/ganado/types.ts`: `ItemNav { id; label; icon: LucideIcon; href }`, `AlertaAccion { id; texto; severidad: "alerta"|"peligro"; href? }`, `DatoProduccion { dia; valor }`, `ActividadReciente { id; descripcion; tiempo }`. ~30 lines. **Accept**: compile + re-exported from barrel.
- [x] **T-001** Create `packages/ui/src/ganado/sidebar.tsx` — 240px desktop nav (props per design.md). Top: **Logo (30px green square `rounded-lg bg-primary` + "GanaWeb" 15px/600)**. Items: Inicio/Animales/Eventos/Sanidad/Reportes/Tareas + Configuración footer. Active: `bg-seleccion` + **`text-pasto-700` light / `text-primary-soft-text` (#A5D8B2) dark**. Add `className?: string`. Deps: T-015. ~100 lines. **Accept**: Logo top; 6 items; corrected active tokens per `specs/app-shell.md` §Active route.
- [x] **T-002** Create `packages/ui/src/ganado/bottom-nav.tsx` — mobile 64px; 5 slots (Inicio, Animales, [Fab], Tareas, Más); active label primary. Add `className?: string`. Deps: T-015. ~85 lines. **Accept**: visible `<768px`; Fab 48px elevated; per app-shell §Mobile navigation.
- [x] **T-003** Create `packages/ui/src/ganado/app-header.tsx` — 56px. **Desktop**: `FincaSwitcher` left, `SearchTrigger` center (lucide `Search` + "Buscar animal… ⌘K"), `SyncPill`+`ThemeToggle` right. **Mobile (<768px)**: simplified — finca name 15px/500 + sync subtitle 10px muted; NO search/SyncPill/ThemeToggle. Props: `fincas: FincaResumen[]`, `fincaActivaId`, `offline`, `estadoSync: EstadoSync`, `pendientes?`, `onBuscar`, `onSync`, `onCambiarFinca`, `className?` (design.md authoritative). Deps: T-015. ~115 lines. **Accept**: desktop 3 regions; mobile simplified; reuses `FincaSwitcher`+`SyncPill` (IA-003).
- [x] **T-004** Create `packages/ui/src/ganado/fab.tsx` — 48px circle `bg-primary text-on-primary rounded-full size-12`, lucide `Plus`. Props: `onClick?`, `ariaLabel`, `className?`. ~30 lines. **Accept**: 48px circle; no `dark:`.
- [x] **T-005** Modify `packages/ui/src/index.ts` — export `Sidebar`, `BottomNav`, `AppHeader`, `Fab` + types `ItemNav`, `AlertaAccion`, `DatoProduccion`, `ActividadReciente`. Deps: T-001..T-004, T-015. ~10 lines. **Accept**: barrel + `pnpm -F ui typecheck` pass.

## PR 2 — Dashboard Widgets (~360 lines)

- [x] **T-006** Create `packages/ui/src/ganado/card-accion.tsx` — title "**Requiere acción**" (NOT "atención"). `count` badge (`bg-danger-bg text-danger`); rows (dot + text + chevron + 1px divider); `severidad: "alerta"|"peligro"`. Props: `count: number`, `alertas: AlertaAccion[]`, `onVerTodas?`, `className?`. Deps: T-005. ~110 lines. **Accept**: badge shows `count`; empty state at count=0 per `specs/dashboard.md` §Empty alerts.
- [x] **T-007** Create `packages/ui/src/ganado/card-produccion.tsx` — "Producción 7 días"; title + delta badge (success/danger) + 7 CSS flexbox bars `bg-dom-produccion`; height = `(value/max)*100%`; **day labels (Lun, Mar, Mié, Jue, Vie, Sáb, Dom) under each bar, fontSize 10, text-muted**. Props: `datos: DatoProduccion[]`, `deltaPct: number`, `className?`. Deps: T-006. ~120 lines. **Accept**: 7 bars + 7 labels; tallest top; negative delta → danger.
- [x] **T-008** Create `packages/ui/src/ganado/card-actividad.tsx` — "Actividad reciente" rows: text left + timestamp right (text-muted), 1px dividers (`border-tierra-200`), ellipsis. Props: `actividades: ActividadReciente[]`, `className?`. Deps: T-007. ~85 lines. **Accept**: rows separated; truncate without breaking layout.
- [x] **T-009** Modify `packages/ui/src/ganado/metric-card.tsx` — add `contextBelow?: boolean`; **context responsive by default** (desktop: separate line below value; mobile <768px: inline "128 · 61%"). `contextBelow=true` forces desktop. Deps: T-008. ~35 lines. **Accept**: responsive via CSS; API unchanged when props omitted.
- [x] **T-010** Modify `packages/ui/src/index.ts` — export `CardAccion`, `CardProduccion`, `CardActividad`. Deps: T-006..T-009. ~10 lines. **Accept**: barrel + typecheck pass.

## PR 3 — Route Integration (~220 lines)

- [x] **T-011** Create `apps/web/src/routes/_app.tsx` — pathless layout (TanStack Start); `md:grid-cols-[240px_1fr]`; mounts `Sidebar`+`AppHeader` desktop / `BottomNav` mobile + `<Outlet/>`; safe-area padding. Deps: T-010. ~80 lines. **Accept**: 1440px sidebar 240 + header 56; 390px BottomNav only + 64px bottom padding.
- [x] **T-012** Create `apps/web/src/lib/fixtures/dashboard.ts` — `MOCK_METRICS` (4, **responsive labels**: mobile "Activos"/"Preñadas"/"Leche hoy"/"Enfermos"; desktop "Animales activos"/"Vacas preñadas"/"Leche hoy (L)"/"Enfermos"), `MOCK_ALERTAS` (5 mixed), `MOCK_PRODUCCION` (7 entries, `dia: "Lun"…"Dom"`), `MOCK_ACTIVIDAD` (3) matching frame-0080/0133. Deps: T-011. ~70 lines. **Accept**: TS aligns; zero `any`; responsive labels documented.
- [x] **T-013** Modify `apps/web/src/routes/index.tsx` — **page title "Inicio" (20px/600) + date subtitle + "Registrar evento" primary button**; replace smoke-test: **4-up `MetricCard` grid (4 cols desktop / 2 cols mobile)** + `CardAccion` + `CardProduccion` + `CardActividad`; **CardActividad accordion on mobile (<768px)**. Deps: T-012. ~70 lines. **Accept**: dashboard renders; mobile → 2-col grid + accordion.
- [x] **T-014** Verify — `grep -rE "dark:" packages/ui/src/ganado/{sidebar,bottom-nav,app-header,fab,card-accion,card-produccion,card-actividad}.tsx` empty; `pnpm turbo typecheck && ppnpm turbo build` exit 0. Deps: T-013. **Accept**: no `dark:`; typecheck + build pass.
