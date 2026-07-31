# Design: Desktop Animal List (Issue #108)

## Technical Approach

Replace only the desktop branch with a typed #107 adapter and presentational `@ganaweb/ui` table. Keep the legacy mobile surface. A separate typed server-function projection supplies visual-only action flags without changing #107, backend authorization, or #109–#111.

## Architecture Decisions

| Decision | Option / tradeoff | Choice and rationale |
|---|---|---|
| DTO boundary | Reuse `AnimalListItem` / typed #107 adapter | Create `apps/web/src/features/animal-listado/animal-listado-route-adapter.ts`, typed from `AnimalListadoResponseDto` and `ANIMAL_LIST_COLUMNS`. It recognizes all 36 IDs/keys, renders the canonical 29, and prevents label-derived mapping or a `packages/ui` dependency on web. |
| Permission source | Infer from #107 DTO or legacy list / session projection | Add the smallest read-only projection: `animal-listado-permissions.server.ts` resolves the current finca session, and `getAnimalListadoVisualPermissionsAction` in `animal-actions.ts` serializes its two booleans. #107 has no permission payload and the legacy model lacks export permission. |
| RBAC semantics | UI authorization / visual gates | The projection only hides actions: `canCreate` means `animales:crear`; `canExport` means both `animales:ver` and `reportes:exportar` (or global `*:*`). It never authorizes a request. Existing create enforcement remains authoritative; #111 must enforce export independently. |
| UI shape | Expand legacy desktop / focused feature | Add `AnimalListadoDesktop`; retain `AnimalDesktopScreen` as the legacy desktop rollback surface and leave `AnimalListMobile` unchanged. The 29/36-column state machine is incompatible with the four-column CRUD surface. |

## Data Flow

```text
route loader ─┬─> GET /api/fincas/{fincaId}/animales (#107 authorization)
              │     -> AnimalListadoResponseDto
              │     -> typed route adapter -> AnimalListadoDesktop -> ficha navigation
              ├─> getAnimalListadoVisualPermissionsAction(fincaId)
              │     -> obtenerSesionActual(getAuthDeps())(readSessionToken(), fincaId)
              │     -> typed { canCreate, canExport }
              └─> legacy list action -> AnimalListMobile (unchanged mobile branch)
```

The desktop adapter consumes only #107 `AnimalListadoResponseDto`; legacy CRUD rows remain mobile-only. The helper checks the requested finca's authorized `SesionAutorizada.permisos`; denied or failed projection returns both flags `false`, without a false 403. #107 403 clears data and offers safe return; 500/timeout retries. A 400 retains the last model, sanitizes reported invalid parameters (and page when required), and announces correction. Loading retains 36–40 px headers/skeletons. `totalSinFiltro === 0` is finca-empty; `total === 0` is no-results.

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/web/src/routes/_app/fincas/$fincaId/animales.tsx` | Modify | Load #107 DTO plus visual-permission projection for desktop; preserve `Outlet`, navigation, and the legacy-action mobile branch. |
| `apps/web/src/features/animal-listado/animal-listado-route-adapter.ts` | Create | Parse #107 responses/errors, canonical registry, state model, and URL sanitization. |
| `apps/web/src/server/animal-listado-permissions.server.ts` | Create | Typed, read-only session-to-visual-permission projection. |
| `apps/web/src/server/animal-actions.ts` | Modify | Expose the projection through TanStack `createServerFn`; no mutation or authorization policy change. |
| `packages/ui/src/ganado/animal-listado-desktop.tsx` | Create | Presentational semantic table and token-only states/layout. |
| `packages/ui/src/index.ts` | Modify | Export table API. |
| `packages/ui/tests/animal-ui.test.tsx` | Modify | Table, state, focus, token, and visual-RBAC coverage. |
| `apps/web/tests/animal-listado-route.test.tsx` | Create | Adapter, HTTP failure, and permission-projection integration fixtures. |

## Interfaces / Contracts

```ts
type AnimalListadoVisualPermissions = Readonly<{
  canCreate: boolean // animales:crear
  canExport: boolean // animales:ver && reportes:exportar
}>
type AnimalListadoDesktopModel = Readonly<{
  columns: readonly AnimalListadoColumn[] // 29 visible; 36 recognized
  rows: readonly AnimalListadoRowDto[]
  total: number; totalSinFiltro: number
  permissions: AnimalListadoVisualPermissions
}>
```

UI receives data and flags only. It uses semantic table headers, `aria-sort`, labelled controls and `aria-live`; row click/Enter navigates unless a control owns the event. Sticky header/`Código`/`Nombre`, focus, borders and contrast use CSS tokens—never `dark:`. `Exportar` is inert; no dialog, download, filters, pagination, selector, or preference persistence is introduced.

## Testing Strategy

| Layer | What to test | Approach |
|---|---|---|
| Unit | 36-ID registry, 29 order, null formatting; each permission combination and global grant | Adapter/projection fixtures; RED tests before implementation. |
| Component | semantics, focus/Enter, all states, absent actions, sticky token classes | Extend `packages/ui/tests/animal-ui.test.tsx`. |
| Route | #107 success/400/403/500-timeout reaches only the desktop adapter; denied/projection-failure flags fail closed; legacy action remains mobile-only | Route fixtures and navigation spies. |
| Manual QA | AA contrast across five styles × claro/oscuro | Required because configured runners are unavailable. |

## Threat Matrix

| Boundary | Applicability | Design response / RED tests |
|---|---|---|
| Documentation-like paths | N/A — no execution/classification | None |
| Git repository selection | N/A — no VCS integration | None |
| Commit state | N/A — no commit automation | None |
| Push state | N/A — no push automation | None |
| PR commands | N/A — no PR automation | None |

In-app TanStack routing is the only routing boundary; it invokes no shell or process.

## Migration / Rollout

No migration required. Do not open an implementation PR before #106 approval and #107 delivery. Rollback restores the legacy desktop surface, leaves the mobile branch unchanged, and stops the desktop from requesting the new visual projection; #107 remains untouched. #109–#111 remain excluded.

## Open Questions

None.
