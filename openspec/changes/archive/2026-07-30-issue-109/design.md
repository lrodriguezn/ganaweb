# Design: Typed Animal List Query State (Issue #109)

## Technical Approach

`AnimalsListRoute` owns URL/history, requests, and 400 recovery. Extend the adapter beside verified `ANIMAL_LIST_COLUMNS` and `cargarListadoDesktop`. `AnimalListadoDesktop` receives models/callbacks only.

## Architecture Decisions

| Decision | Options / trade-off | Choice and rationale |
|---|---|---|
| Ownership | Local state can drift from Back/Forward | Derive committed state from URL; only uncommitted search text is local for 300 ms. |
| Metadata | Hand-authored values can disagree with #107 | Derive `columnId, responseKey, filterKey, sortKey, grammar` from `ANIMAL_LIST_COLUMNS`. |
| Navigation/currency | Late responses and noisy history | Filter/chip/clear/sort push; debounced search and valid 400 correction replace. A request token gates model, toast, and correction. |
| #111 seam | `{ search: string }` is ambiguous | Export a read-only complete-query value, not merely global search. #109 adds no export UI or execution. |

## Data Flow

```text
URL / Back-Forward -> route query controller -> canonical serializer -> cargarListadoDesktop
                         ^       |                       |                 |
desktop callbacks --------+       +-- push/replace URL ---+          200 / 400
                         #111 reads FinalizedAnimalListadoQuery        |
                               (no navigation or fetch) <--- request-token gate
```

The parser can report `page`, `pageSize`, `sort`, `cols`, or `f.<filterKey>`; not `q`. Unknown/null/non-present `campo` retains the URL and shows an error.

| Reported `campo` | Dataset-shaping? | URL correction |
|---|---|---|
| `page` | No | Delete `page`; no additional deletion (default is page 1). |
| `pageSize`, `sort` | No (view window/order) | Delete reported parameter and `page`. |
| `cols` | No (projection) | Delete only `cols`; preserve `page`. |
| `f.codigo`, `f.nombre`, `f.sexoKey`, `f.razaId`, `f.fechaNacimiento`, `f.edadAnios`, `f.colorId`, `f.tipoIngresoId`, `f.codigoMadre`, `f.nombreMadre`, `f.codigoPadre`, `f.nombrePadre`, `f.propietarioId`, `f.hierroId`, `f.numeroPezones`, `f.calidadAnimalId`, `f.codigoArete`, `f.fechaCompra`, `f.precioCompra`, `f.pesoCompraKg`, `f.tatuado`, `f.herrado`, `f.descornado`, `f.codigoRfid`, `f.potreroId`, `f.sectorId`, `f.loteId`, `f.grupoId`, `f.comentarios`, `f.saludKey`, `f.categoriaReproductivaKey`, `f.estadoKey`, `f.pesoUltimoKg`, `f.codigoQr`, `f.esDeMonta`, `f.tipoExplotacionId` | Yes | Delete that exact `f.*` parameter and `page`. |

Retain the last successful model during each valid correction and reload one field at a time. Response `sort` remains the `aria-sort` source, including absent `sort` -> `codigo:asc`.

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/web/src/features/animal-listado/animal-listado-route-adapter.ts` | Modify | Add metadata-backed query models, canonical serialization/mutations, exact 400 mapping, and finalized-query value. |
| `apps/web/src/routes/_app/fincas/$fincaId/animales.tsx` | Modify | Own debounce, navigation, request token, recovery, and pass presentational models. |
| `packages/ui/src/ganado/animal-listado-desktop.tsx` | Modify | Render supplied search/filter/chip/clear/sort controls while retaining #108 states/RBAC. |
| `apps/web/tests/animal-listado-route.test.tsx` | Modify | Add RED tests for serialization, correction mapping, and request-token rules. |
| `apps/web/tests/animal-listado-route-integration.test.tsx` | Modify | Test replay, history, retention, and sequential 400 responses. |
| `packages/ui/tests/animal-ui.test.tsx` | Modify | Test typed callback delegation, labels, keyboard sort, and `aria-sort`. |

## Interfaces / Contracts

```ts
type FilterOption = Readonly<{ value: string; label: string }>
type AnimalListadoFilterGrammar = (typeof ANIMAL_LIST_COLUMNS)[number][4]
type FilterControlModel = Readonly<{
  filterKey: AnimalListFilterKey; grammar: AnimalListadoFilterGrammar; label: string
  committedValue: string | null; options: readonly FilterOption[]
}>
type FilterCommit = Readonly<{ filterKey: AnimalListFilterKey; grammar: AnimalListadoFilterGrammar; value: string | null }>
type QueryChip = Readonly<{ queryKey: "q" | `f.${AnimalListFilterKey}`; label: string; valueLabel: string }>
type FinalizedAnimalListadoQuery = Readonly<{ searchParams: string }>
```

`FilterOption.value` is the stable ID/key, never its label. The route accepts a commit only when grammar matches metadata: non-null serializes `f.${filterKey}=grammar:value`; null removes it. `onRemoveChip(queryKey)` removes exactly `q` or `f.*`; `onClearAll()` removes `q`/all `f.*`, retaining `sort`, `pageSize`, `cols`; both delete `page`. `onSort(columnId)` exists only for metadata-sortable columns and cycles asc, desc, absent `sort`.

`searchParams` is the complete final `URLSearchParams` serialization (without `?`): valid `page`, `pageSize`, `sort`, `q`, `f.*`, and `cols`; absent defaults retain #107 semantics. It excludes `fincaId`/endpoint. #111 may read/pass it to export, not mutate/navigate/fetch the list.

## Testing Strategy

| Layer | What to test | Approach |
|---|---|---|
| Unit | Correction rows, grammar/ID serialization, sort, final query | Vitest RED tests for adapter helpers. |
| Integration | Debounce/history, retained model, sequential 400, stale suppression | Deferred `fetch` and route rendering. |
| UI | Exact callback keys, chips/clear, keyboard sort, `aria-sort` | Existing UI suite. |
| E2E | Shared URL and Back/Forward | Playwright when available; otherwise manual evidence. |

## Threat Matrix

| Boundary | Applicability | Design response | Planned RED tests |
|---|---|---|---|
| Documentation-like paths | N/A — browser routing does not classify/execute files | None | None |
| Git repository selection | N/A — no VCS integration | None | None |
| Commit state | N/A — no automated commits | None | None |
| Push state | N/A — no remote push | None | None |
| PR commands | N/A — no PR command composition | None | None |

## Migration / Rollout

No migration or flag. Revert the route/controller and UI callback changes; #107 defaults and #108 desktop table remain at `codigo:asc`.

## Open Questions

- [ ] None.
