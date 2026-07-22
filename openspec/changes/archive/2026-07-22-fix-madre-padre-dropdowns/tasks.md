# Tasks: fix madre/padre dropdowns in animal create/edit form

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~200 (7 files) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | single-pr-default |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

Single PR. ~200 lines spans 7 files inside the 400-line reviewer budget.
Focused test command: `pnpm turbo test --filter=animal-catalogos`
Runtime harness: real loader via `getAnimalCatalogsAction`; E2E via `e2e-animals-fixture`.
Rollback boundary: revert the PR; mock fixture retained as a stub.

## Phase 1: Port (aplicacion layer)

- [x] 1.1 RED: write `tests/animal-catalogos.test.ts` case asserting madre=hembras only, padre=macho+pajuela, excludedIds drops id, null nombre degrades to `código`
- [x] 1.2 Create `packages/aplicacion/src/puertos/catalogo-padres-port.ts` with `ComboboxOption` (id, label) and `CatalogoPadresPort` interface (`listarMadres`, `listarPadres`)
- [x] 1.3 Re-export port from `packages/aplicacion/src/index.ts`
- [x] 1.4 GREEN: confirm 1.1 passes against a mock port

## Phase 2: Adapter (db layer)

- [x] 2.1 Add `./catalogo-padres-infrastructure` export to `packages/db/package.json`
- [x] 2.2 Create `packages/db/src/catalogo-padres-infrastructure.ts` with `DrizzleCatalogoPadresAdapter` querying `animales` by `fincaId + sexoKey` (madre=1; padre `in [0,2]`), all estados, order by `codigo` es-CO, exclude `excludedIds`
- [x] 2.3 Map `código · nombre`; degrade to `código` when `nombre` is null/empty

## Phase 3: Loader integration in `apps/web/src/server/animal-actions.server.ts`

- [x] 3.1 Extend `AnimalCatalogs` interface with `madre` and `padre: AnimalCatalogResult`
- [x] 3.2 Extend `AnimalCatalogPorts` with `catalogoPadres: CatalogoPadresPort`
- [x] 3.3 Add two `Promise.allSettled` slots for madre/padre in `loadAnimalCatalogs`
- [x] 3.4 Add `mapComboboxSettled` helper (mirrors `mapUcSettled` but keeps `{value,label}`)
- [x] 3.5 Wire `catalogoPadres` into `getConfiguredAnimalCatalogPorts()` (real adapter + E2E)
- [x] 3.6 Add `madre`/`padre` to the cross-finca denial `NO_DISPONIBLE_CATALOG` return

## Phase 4: `nuevo.tsx` — `catalogsToFormOptions` maps madre/padre

- [x] 4.1 Extend `catalogsToFormOptions` in `apps/web/src/routes/.../animales/nuevo.tsx` to map `madre`/`padre` keys into `AnimalFormCatalogOptions`

## Phase 5: `editar.tsx` — migrate from fixture to `getAnimalCatalogsAction()`

- [x] 5.1 Import `getAnimalCatalogsAction` from `apps/web/src/server/animal-actions.js`
- [x] 5.2 Loader: replace `getAnimalFormCatalogOptions()`; call `getAnimalCatalogsAction({ data: { fincaId } })` and merge into `EditAnimalLoaderData`
- [x] 5.3 View: drop fixture call; map madre/padre from loader; pass `currentAnimalId={animalId}` (already plumbed to `ParentsBlock.excludedIds` in UI)

## Phase 6: E2E mock

- [x] 6.1 Add `createAnimalE2eCatalogoPadresPort()` in `apps/web/src/server/e2e-animals-fixture.server.ts` returning seeded hembras/machos/pajuelas for `finca-1`
- [x] 6.2 Return it from `getConfiguredAnimalCatalogPorts()` when E2E is enabled

## Phase 7: Tests in `tests/animal-catalogos.test.ts`

- [x] 7.1 Update the 4 existing cases to expect 10 catalogs (madre/padre added)
- [x] 7.2 Add case: madre query throws → madre `no_disponible`, padre `disponible`
- [x] 7.3 Add case: cross-finca madre/padre denied, no port call
- [x] 7.4 Add case: excludedIds drops the current animal from both lists

## Phase 8: Verification

- [x] 8.1 Run `pnpm turbo test --filter=animal-catalogos` — all green
- [x] 8.2 Run `pnpm turbo typecheck` — no errors
- [x] 8.3 Run `pnpm turbo lint` — biome clean (source files clean; routeTree.gen.ts pre-existing formatting issues)
