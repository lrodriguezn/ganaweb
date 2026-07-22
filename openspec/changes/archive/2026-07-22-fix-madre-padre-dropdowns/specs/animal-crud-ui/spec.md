# Delta for Animal CRUD UI

## MODIFIED Requirements

### Requirement: loadAnimalCatalogs server loader composition

`apps/web` MUST expose a `loadAnimalCatalogs(fincaId)` server function that revalidates the session (PE-002), calls the ten catalog use cases in parallel (sexo + three maestro + five finca-scoped + madre + padre), and returns a composite `AnimalCatalogs` object. Each value MUST be wrapped in `{ tipo: "disponible" | "no_disponible" }` matching the `AnimalSexoCatalog` pattern. On DB error, the loader MUST return `no_disponible` for every catalog and MUST NOT substitute mock data (IA-001, T-003). The `madre`/`padre` slots MUST consume `CatalogoPadresPort` (see `animal-parent-selector` spec). The edit route MUST consume the server loader via `getAnimalCatalogsAction()` and pass `excludedIds = [currentAnimalId]`.
(Previously: composed only the eight config catalogs; `madre`/`padre` were never queried, and the edit route consumed a mock fixture that throws in production.)

#### Scenario: All ten catalogs are composed

- GIVEN an authenticated session with `fincaActivaId = finca-A`
- WHEN `loadAnimalCatalogs("finca-A")` runs
- THEN it returns `sexo`, `raza`, `color`, `calidad`, `potrero`, `sector`, `lote`, `grupo`, `lugarCompra`, `madre`, `padre`
- AND each is wrapped in `{ tipo: "disponible" | "no_disponible" }`

#### Scenario: DB error returns no_disponible for all

- GIVEN the database is unavailable
- WHEN the loader composes catalogs
- THEN every catalog state (including `madre` and `padre`) is `{ tipo: "no_disponible" }`
- AND no mock or demo data is returned

#### Scenario: Edit route consumes the server loader

- GIVEN the edit route loader for `animales/$animalId/editar`
- WHEN it composes catalogs
- THEN it calls `getAnimalCatalogsAction({ data: { fincaId } })` instead of the mock fixture
- AND passes `excludedIds = [currentAnimalId]`


