# Design: Redesign Animal Ficha (Desktop) with Real Data

## Technical Approach

Extend the ficha read model up the hexagonal stack: new Drizzle read model aggregates event-derived summaries; `obtenerFichaAnimal` orchestrates via a new port; handler maps to a view model; `AnimalFichaDesktopScreen` rewritten with existing tokens only. The timeline becomes one `UNION ALL` over the 11 event tables with server-side domain filtering composed with keyset cursor pagination. Satisfies all three delta specs. Online-first (`client.ts` D3); ports preserve offline symmetry.

## Architecture Decisions

| # | Decision | Options | Choice & rationale |
|---|----------|---------|--------------------|
| D1 | Timeline query | (a) UNION ALL + keyset; (b) per-table merge in JS | **(a)** — one round trip; existing `(animal_id, fecha)` indexes; atomic order/pagination. |
| D2 | Tab filtering | Server vs client | **Server** — lactation = 1 row/day (RN-021), hundreds per animal; client filtering loads full history; `nextCursor` already server-side. |
| D3 | Cursor | Offset vs keyset `(fecha, id)` | **Keyset**, base64url JSON `{f, id}`; unique text PKs give `(fecha DESC, id DESC)` total order; inserts don't shift pages; tampered cursor → first page. |
| D4 | Summary derivation | SQL aggregates vs dominio functions | **Dominio pure functions** (config: domain logic in dominio, TDD ≥90%) derive age, GDP, gestation, partos, IEP, días abiertos from event rows. TR-010/TR-014: events are truth; `categoriaReproductiva` cache never read. |
| D5 | New types | Extend `AnimalResumen` vs new projection | **New projection** `FichaAnimalResumen` — `AnimalResumen` stays the list contract; no list-screen blast radius. |
| D6 | UI rewrite | New file vs `animal-crud.tsx` | **Rewrite in place**, keep export `AnimalFichaDesktopScreen` (barrel/route/test contract); sub-components stay in-file. |
| D7 | Missing indexes | Add vs none | **None** (no migrations). `muertes`/`condicionCorporal` lack `(animal_id, fecha)`; volume small; follow-up note. |

### Complete dominio/tipo mapping (resolves Q1)

- **produccion**: pesos→pesaje · produccionesLacteas→produccion · animalesCondicionCorporal→condicion
- **reproduccion**: servicios→servicio · palpaciones→palpacion · partos→parto
- **sanidad**: aplicacionesSanitarias→vacunacion · revisionesVeterinarias→revision
- **manejo**: ventas→venta · muertes→muerte · animalesUbicacionHistorico→reubicacion

`partosCrias`: link table (no `fecha`/`animalId`) — not a source. Titles compose in TS from tipo + signature column. Tabs: Resumen = all; Eventos = manejo; rest = own domain.

## Data Flow

```
Loader ─ getAnimalFichaAction({animalId, tab?, cursorTimeline?})
 └ harness.ficha → obtenerFichaAnimal (aplicacion)
    ├ animales.obtenerPorIdYFinca
    ├ fichaResumen.obtener → dominio: edad/IEP/GDP/gestación/días abiertos
    └ timeline.listarPagina({dominio?, cursor}) → UNION ALL (11 tables)
 ← view model {animal, resumen, timeline{items, nextCursor?}, permissions}
"Ver N más" / tab switch → same server fn from client (append / reset)
```

## File Changes

| File | Action | Description |
|---|---|---|
| `packages/dominio/src/animal-ficha.ts` | Create | `calcularEdadMeses`, `derivarResumenReproductivo` (TR-013 male → empty), `calcularGdp` (1 weighing → null GDP) |
| `packages/aplicacion/src/puertos/animal-timeline-port.ts` | Modify | DTO + `dominio`, `tipo`, `detalle?`; query + optional `dominio` |
| `packages/aplicacion/src/puertos/animal-ficha-resumen-port.ts` | Create | `obtener(animalId, fincaId)` → raza/color + potrero/lote/grupo names, last two weighings, reproductive sequence, latest condition |
| `packages/aplicacion/src/casos-uso/animales/index.ts` | Modify | `obtenerFichaAnimal` aggregates `resumen` via dominio; forwards `dominio`/cursor |
| `packages/db/src/animal-infrastructure.ts` | Modify | Rewrite `DrizzleAnimalTimelineRepository` (UNION ALL, keyset, mapping, stub removed); new `DrizzleAnimalFichaReadModel` |
| `apps/web/src/server/animal-actions.server.ts` (+ `e2e-animals-fixture.server.ts`) | Modify | `toTimelineItem` maps real dominio/tipo; resumen mapper; `tabTimeline` input; e2e stub → new DTO |
| `packages/ui/src/ganado/animal-crud.tsx` | Modify | Rewrite desktop screen: breadcrumb, badges+meta header, DATOS/REPRODUCCIÓN/PESO Y CONDICIÓN cards, tabbed timeline + "Ver N más"; reuse `InfoCard`, `domainStyle`, badges |
| `packages/ui/src/ganado/types.ts` | Modify | `AnimalFichaResumen` props; extend `AnimalTimelineTipo` |
| `apps/web/.../$animalId.tsx` | Modify | EventDrawer wiring (preselected animal, close without navigation); tab/cursor state |
| `apps/web/.../$animalId/editar.tsx` | Modify | Save navigates back to ficha |

## Interfaces / Contracts

```ts
listarPagina(q: { animalId: string; fincaId: string; cursor?: string; limit: 20;
  dominio?: DominioEvento }): Promise<{ items: readonly TimelineItemAnimalDto[]; nextCursor?: string }>
// TimelineItemAnimalDto += dominio; tipo: string; detalle?: string
// cursor = base64url(JSON.stringify({ f: "YYYY-MM-DD", id: string }))
```

UNION branch shape: `SELECT id, fecha::text, '<dominio>', '<tipo>', <detalle> WHERE animal_id = $1` (dominio filter drops branches; ubicación timestamptz casts to date); outer `ORDER BY fecha DESC, id DESC LIMIT limit+1` — extra row becomes `nextCursor`.

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| dominio (unit, TDD) | age, GDP, IEP, días abiertos, gestation, TR-013 empty, TR-014 event-derived | vitest, injected `hoy` |
| aplicacion (unit) | full vs empty history; dominio passthrough | mocked ports (`animal-use-cases.test.ts` pattern) |
| db (integration) | union coverage, mapping, desc order, cursor resume no dup/gap, domain-filter pagination, empty → no synthetic event | real Postgres (`animal-listado-postgres.test.ts` pattern) |
| web harness | ficha DTO, pagination passthrough | update `animal-web-flow.test.ts` + e2e fixture |
| ui (jsdom) | cards real/empty, tabs default/filter/empty, control hidden without cursor, drawer open/close | update `animal-ui.test.tsx` |
| e2e | tabs, "Ver N más", drawer, edit-return | update `tests/e2e/animales.spec.ts` |

## Threat Matrix

N/A — no server routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. Hygiene: `cursorTimeline` is client input — decode, validate, bind only; RED test: tampered cursor neither throws nor injects.

## Migration / Rollout — chained PR slices

1. **Visual shell** — UI rewrite (`resumen` optional → structured empty states), drawer wiring, edit-return. Revert restores old screen.
2. **Data layer** — dominio derivations + port + read model + mappers. Revert safe: UI tolerates nulls.
3. **Timeline** — UNION ALL repository, dominio/tipo DTO, tab filtering + pagination; stub removed here. Revert restores stub.

No data migration, no feature flags.

## Open Questions

- [x] Q1 (complete mapping) — list above; `partosCrias` excluded.
- [x] Q2 (tab filtering) — server-side (D2); `(dominio, cursor)` pairs independent; tab switch resets pagination.
