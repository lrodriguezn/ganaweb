# Proposal: fix madre/padre dropdowns in animal create/edit form

## Intent

`Madre`/`Padre` comboboxes in animal create/edit are always empty. `loadAnimalCatalogs` loads nine config catalogs but never queries `animales`. The edit route also consumes a fixture that throws in production. This change fixes both gaps.

## Scope

### In Scope
- New `CatalogoPadresPort` (`listarMadres`/`listarPadres`) in `packages/aplicacion`.
- New `DrizzleCatalogoPadresAdapter` in `packages/db` — queries `animales` by `fincaId` + `sexoKey`, all estados, ordered by `codigo`.
- Extend `AnimalCatalogs`, `AnimalCatalogPorts`, `loadAnimalCatalogs`, `catalogsToFormOptions` for `madre`/`padre`.
- Migrate `editar.tsx` loader from fixture to `getAnimalCatalogsAction()`.
- Pass `excludedIds = [currentAnimalId]` to `ParentsBlock` on edit.
- E2E fixture mock + unit tests.

### Out of Scope
- Schema changes (RN-001); filtering by estado, age, or reproductive category; refactor of the other eight catalog use cases; Phase 2 offline replication.

## Capabilities

### New Capabilities
- `animal-parent-selector`: port + adapter returning `ComboboxOption[]` for madre (sexoKey=1) and padre (sexoKey=0 ∪ 2 including pajuelas) within the active finca, excluding the animal being edited.

### Modified Capabilities
- `animal-crud-ui`: extend `loadAnimalCatalogs` to include the two parent lists. Edit route consumes the server loader instead of the mock fixture. `AnimalFormCatalogOptions` carries the two new keys; `catalogsToFormOptions` maps them.

## Approach

Clean/Hexagonal port-and-adapter, consistent with the eight existing catalog use cases. `CatalogoPadresPort` stays separate from `CatalogoFincaPort` because the result shape (`ComboboxOption`) and queried table differ. `loadAnimalCatalogs` adds two parallel `Promise.allSettled` calls; on error, both slots return `{ tipo: "no_disponible" }`.

## Affected Areas

- `packages/aplicacion/src/puertos/catalogo-padres-port.ts` — new port
- `packages/db/src/catalogo-padres-infrastructure.ts` — new adapter
- `apps/web/src/server/animal-actions.server.ts` — extend types + loader
- `apps/web/src/routes/.../nuevo.tsx` — `catalogsToFormOptions` maps madre/padre
- `apps/web/src/routes/.../editar.tsx` — loader uses real action, passes `excludedIds`
- `apps/web/src/server/e2e-animals-fixture.server.ts` — mock for new port
- `tests/animal-catalogos.test.ts` — coverage for madre/padre composition

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Edit route regression after fixture removal | Mock fixture retained as stub; rollback path stays valid |
| `nombre` nullable on `animales` | Mapper coerces `null` → `""` |
| E2E mode crash without mock | Add mock alongside existing E2E mocks |
| Cross-finca leakage | Loader revalidates `session.fincaActivaId === fincaId` (PE-002/PE-003) |

## Rollback Plan

Revert `editar.tsx` to the fixture. Remove the two `Promise.allSettled` slots from `loadAnimalCatalogs`. Mock fixture retained as stub. No schema/data changes — no DB rollback needed.

## Success Criteria

- [ ] Create mode: `Madre`/`Padre` show finca animals (madres: sexoKey=1; padres: sexoKey=0 ∪ 2)
- [ ] Edit mode: real DB load, no throw, current animal excluded
- [ ] Loader returns `{ tipo: "no_disponible" }` for both on DB error
- [ ] E2E uses fixture mock; tests cover both lists + empty/error
- [ ] Existing eight catalogs unchanged; sexo flow preserved
