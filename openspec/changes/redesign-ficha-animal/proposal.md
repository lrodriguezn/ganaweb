# Proposal: Redesign Animal Ficha (Desktop) with Real Data

## Intent

The desktop animal ficha runs on stub data: age and weight hardcoded "—", reproduction/weight cards as placeholders, timeline showing one synthetic event. Operators see no real history and cannot register events. This rebuilds the desktop ficha to match the approved design (OpenPencil frame f-400107) with real data.

## Scope

### In Scope
- Visual rewrite of `AnimalFichaDesktopScreen`: breadcrumb, title + badges + meta, DATOS / REPRODUCCIÓN / PESO Y CONDICIÓN cards, tabbed timeline card.
- `obtenerFichaAnimal` aggregates resolved raza/color, computed age, latest weight + GDP, reproductive summary (último servicio, palpación, gestación, partos, IEP, días abiertos), body condition.
- Rewrite `DrizzleAnimalTimelineRepository`: union the 11 event tables with domain/tipo mapping and cursor pagination.
- Wire "+ Registrar evento" to existing EventDrawer.
- Edit save returns to the ficha.

### Out of Scope
- Mobile ficha redesign (canvas is desktop-only).
- New event form implementations.
- Any screen other than the ficha.

## Capabilities

### New Capabilities
- `animal-ficha-desktop-ui`: layout, badges, cards, tabbed timeline UI, drawer wiring, edit-return.
- `animal-ficha-read-model`: enriched ficha aggregation contract.
- `animal-timeline`: event-table union, domain/tipo mapping, pagination.

### Modified Capabilities
None.

## Approach

Extend the read model up the stack (db → aplicacion → handler → ui); rewrite the screen with existing design tokens only — no new themes, no `dark:` variants. Summaries derive from events (TR-010, TR-014/RN-041); timeline respects event-date rules (RN-002).

## Functional Requirements

1. Screen matches design structure across 5 themes × light/dark.
2. Cards render real values; missing data shows structured empty states.
3. Tabs (Resumen/Eventos/Reproducción/Producción/Sanidad) filter real events by domain; "Ver N eventos más" paginates.
4. "+ Registrar evento" opens/closes the EventDrawer.
5. Edit save returns to the ficha.

Acceptance: Given/When/Then delta specs; UI, use-case, repository, harness tests.

## Assumptions

- TODO drawer forms remain follow-up; only open/close is wired.
- Existing tokens cover all design colors, radii, spacing.

## Affected Areas

| Area | Impact |
|------|--------|
| `packages/ui/src/ganado/animal-crud.tsx`, `types.ts` | Modified — screen rewrite, ficha fields |
| `packages/dominio/src/animal.ts` | Modified — ficha fields |
| `packages/aplicacion/src/casos-uso/animales/index.ts` | Modified — aggregation |
| `packages/db/src/animal-infrastructure.ts` | Modified — timeline union, read models |
| `apps/web/src/server/animal-actions.server.ts` | Modified — mappers |
| `apps/web/src/routes/_app/fincas/$fincaId/animales/$animalId.tsx`, `editar.tsx` | Modified — drawer wiring, navigation |
| `packages/ui/tests/animal-ui.test.tsx` | Modified — layout assertions |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Timeline union across 11 tables | Med | Per-table mapping + pagination tests |
| UI tests break on rewrite | High | Update assertions in same slice |
| Aggregation adds loader latency | Low | Single read-model path, indexed dates |

## Rollback Plan

Revert PR slices in reverse order; old screen, stub repository, and list navigation restore independently. No migrations or backfill.

## Dependencies

None.

## Delivery Note

One coherent requirement; chained PR slices (visual shell → data layer → timeline) decided in tasks phase.

## Success Criteria

- [ ] Ficha matches design with real data in all three cards.
- [ ] Timeline shows real events filtered by 5 tabs with pagination.
- [ ] Registrar evento opens drawer; edit save returns to ficha.
- [ ] `pnpm turbo test` passes.
