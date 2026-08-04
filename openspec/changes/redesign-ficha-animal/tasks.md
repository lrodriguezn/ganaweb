# Tasks: Redesign Animal Ficha (Desktop)

3 revertible PR slices (auto-chain); DB tests need live Postgres (`DATABASE_URL`).

## Work Units

| Unit | Focused test | Runtime harness | Rollback boundary |
|------|--------------|-----------------|-------------------|
| 1 (PR 1, 550 ln): visual shell + drawer + edit-return | `pnpm -F @ganaweb/ui test` | `pnpm dev`: ficha + drawer | revert UI/routes → old screen |
| 2 (PR 2, 650 ln): read model | `pnpm -F @ganaweb/dominio test`, `pnpm -F @ganaweb/db test` | loader returns enriched fields | revert data layer → empty states |
| 3 (PR 3, 500 ln): timeline union | `pnpm -F @ganaweb/db test` | real events + pagination | revert repository → stub |

## Phase 1 (PR 1): Visual Shell

- [x] 1.1 `packages/ui/src/ganado/types.ts`: extend `AnimalFichaResumen`/`AnimalTimelineTipo` with enriched fields (raza/color, ageMonths, lastWeight+gdp, reproductive summary, bodyCondition).
- [x] 1.2 RED: rewrite desktop assertions in `packages/ui/tests/animal-ui.test.tsx` — breadcrumb, title+badges+meta, 3 cards, 5 tabs, empty states, pagination control hidden without cursor.
- [x] 1.3 GREEN: rewrite `AnimalFichaDesktopScreen`/`AnimalFichaHeader` in `packages/ui/src/ganado/animal-crud.tsx` — breadcrumb, badges+meta header, DATOS/REPRODUCCIÓN/PESO Y CONDICIÓN cards with structured empty states, tabbed timeline; tokens only, no `dark:`.
- [x] 1.4 Wire EventDrawer open/close in `apps/web/src/routes/_app/fincas/$fincaId/animales/$animalId.tsx` (preselected animal, close without navigation); RED test first.
- [x] 1.5 `apps/web/.../$animalId/editar.tsx`: save returns to ficha.

## Phase 2 (PR 2): Data Layer

- [x] 2.1 RED: `packages/dominio/tests/animal-ficha.test.ts` — `calcularEdadMeses` (birth present/absent), `calcularGdp` (2 weighings; 1 → null), `derivarResumenReproductivo` (servicio/palpación/gestación/partos/IEP/días abiertos; male TR-013 → empty; TR-014 events over cache).
- [x] 2.2 GREEN: create `packages/dominio/src/animal-ficha.ts` (pure functions, injected `hoy`).
- [ ] 2.3 Create `packages/aplicacion/src/puertos/animal-ficha-resumen-port.ts` (raza/color, potrero/lote/grupo, last 2 weighings, reproductive sequence, latest condition).
- [ ] 2.4 RED: full vs empty history in `packages/aplicacion/tests/animal-use-cases.test.ts` (missing → null, never fabricated); GREEN: aggregate in `obtenerFichaAnimal` (`packages/aplicacion/src/casos-uso/animales/index.ts`).
- [ ] 2.5 Implement `DrizzleAnimalFichaReadModel` in `packages/db/src/animal-infrastructure.ts`.
- [ ] 2.6 RED+GREEN integration: `packages/db/tests/animal-ficha-postgres.test.ts`.
- [ ] 2.7 Map resumen in `apps/web/src/server/animal-actions.server.ts`; assert DTO in `animal-web-flow.test.ts`.

## Phase 3 (PR 3): Timeline Union

- [ ] 3.1 `packages/aplicacion/src/puertos/animal-timeline-port.ts`: DTO += `dominio`/`tipo`/`detalle?`; query += `dominio?`.
- [ ] 3.2 RED: `packages/db/tests/animal-timeline-postgres.test.ts` — multi-table union, per-table mapping, desc order, cursor resume no dup/gap, domain-filter pagination, empty → no synthetic event.
- [ ] 3.3 RED (threat hygiene): tampered/garbage `cursorTimeline` returns first page — no throw, no injection.
- [ ] 3.4 GREEN: rewrite `DrizzleAnimalTimelineRepository` in `packages/db/src/animal-infrastructure.ts` — UNION ALL 11 tables, keyset `(fecha DESC, id DESC)`, cursor validate+bind, dominio filter; delete stub.
- [ ] 3.5 Real dominio/tipo + `tabTimeline` input in `apps/web/src/server/animal-actions.server.ts`; passthrough assertions in `animal-web-flow.test.ts`.
- [ ] 3.6 Update `apps/web/src/server/e2e-animals-fixture.server.ts` timeline to new DTO; update `tests/e2e/animales.spec.ts` (tabs, pagination, drawer, edit-return).
- [ ] 3.7 Tab switch / "Ver N más" call server function with `dominio` + cursor (reset/append) in route + screen.

## Review Workload Forecast

PR 1 → PR 2 → PR 3; chain strategy pending. Each slice fits the 800-line budget; unsplit ~1700 does not.

Chained PRs recommended: Yes
Estimated changed lines: 1700 (slice 1: 550, slice 2: 650, slice 3: 500)
800-line budget risk: Medium
Decision needed before apply: No
Chain strategy: pending
