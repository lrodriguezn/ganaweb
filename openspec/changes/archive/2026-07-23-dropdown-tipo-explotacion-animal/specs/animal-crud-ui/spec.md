# Delta for Animal CRUD UI

## ADDED Requirements

### Requirement: Tipo de explotación renders as catalog selector

The animal form MUST render `tipoExplotacionId` as a `CatalogSelectField` (not `SelectConCreacion`) with the visible label "Tipo de explotación", sourced from `CatalogoAnimalMaestroPort.listarActivos("tipoExplotacion")`. The control MUST display the Spanish `nombre` for each option, MUST mark the field as required (`aria-required="true"` plus a visible "obligatorio" marker), and the submitted payload MUST carry the canonical catalog `id`. The control MUST NOT expose a `+ Crear nuevo` affordance and MUST NOT expose a `+ Crear el primero` empty-state action — the catalog is read-only for the user. This satisfies CA-UI-001, CA-UI-002, and CA-CRE-001 for the `tipoExplotacion` field.

(Previously: `tipoExplotacionId` fell through to the generic `Field` text input; no catalog options were rendered and the field carried no required-state marker.)

#### Scenario: Tipo de explotación shows labels and submits ids

- GIVEN catalog options for `tipoExplotacion` are loaded from the real DB
- WHEN the user opens the `Tipo de explotación` dropdown
- THEN each option shows its Spanish `nombre`
- AND the submitted payload carries the canonical catalog `id`

#### Scenario: No creation affordance on tipo de explotación

- GIVEN the user opens the `Tipo de explotación` dropdown (populated or empty)
- WHEN the dropdown body is rendered
- THEN no `+ Crear nuevo` option is present
- AND no `+ Crear el primero` empty-state action is rendered

#### Scenario: Required marker on tipo de explotación

- GIVEN the form renders in create or edit mode
- WHEN the `Tipo de explotación` control mounts
- THEN a visible "obligatorio" marker is rendered next to the label
- AND the underlying input carries `aria-required="true"`

## MODIFIED Requirements

### Requirement: Global catalog use cases (raza, color, calidad, tipoExplotacion)

The system MUST provide four use cases — `listarCatalogoRaza`, `listarCatalogoColor`, `listarCatalogoCalidad`, and `listarCatalogoTipoExplotacion` — that consume `CatalogoAnimalMaestroPort` and return strict, typed DTOs. The port MUST accept a typed table parameter. `listarCatalogoRaza`, `listarCatalogoColor`, and `listarCatalogoCalidad` MUST expose only `activo=1` rows. `listarCatalogoTipoExplotacion` MUST return ALL rows from `config_tipos_explotacion` (no `activo=1` filter) so users can still select an inactive category for an existing animal. Each use case MUST return canonical `id` and Spanish `label`, MUST sort es-CO by `nombre` (T-003), and MUST reject null, unknown, duplicate, and noncanonical rows. The Color DTO MUST include `meta.hex` from `config_colores.codigo`. On empty result, the loader MUST return `{ tipo: "no_disponible" }` for the corresponding catalog and MUST NOT substitute demo or hardcoded options.

(Previously: the family contained three use cases and the `activo=1` filter was unconditional for every maestro table.)

#### Scenario: Active rows are returned and sorted

- GIVEN `config_razas` has active rows
- WHEN `listarCatalogoRaza` runs
- THEN it returns one option per active row with `id` and `label`
- AND options are sorted by `nombre` with es-CO locale

#### Scenario: Inactive, null, unknown, and duplicate rows are rejected

- GIVEN the source table contains inactive, null, unknown, and duplicate rows
- WHEN the use case validates
- THEN those rows are excluded or the catalog is rejected with a diagnosable failure
- AND no partial option set is emitted

#### Scenario: Empty catalog returns no_disponible

- GIVEN no active rows exist for the catalog
- WHEN the loader composes the catalog
- THEN the catalog state is `{ tipo: "no_disponible" }`
- AND the UI renders EmptyState (not demo or hardcoded options)

### Requirement: "+ Crear nuevo" affordance is gated on `configuracion:crear`

The form MUST show `+ Crear nuevo` inside the `raza`, `color`, `lugar_compra`, `potrero`, `sector`, `lote`, and `grupo` dropdowns ONLY when the user has `configuracion:crear`. `calidad` and `tipoExplotacion` MUST NOT expose the affordance — both are read-only catalogs. Phase 1 keeps the action stubbed (no creation flow opens). This satisfies CA-UI-002.

(Previously: `calidad` was the only catalog that MUST NOT expose the affordance; `tipoExplotacion` was not part of the catalog list.)

#### Scenario: Affordance visibility tracks permission

- GIVEN the user has `configuracion:crear` and the user lacks it (two variants)
- WHEN they open the Raza, Color, or Lugar de compra dropdown
- THEN the last option is `+ Crear nuevo` (with permission) or absent (without)

### Requirement: Empty catalog renders EmptyState with "+ Crear el primero"

When `raza`, `color`, `calidad`, `tipo_explotacion`, or `lugar_compra` is empty, the dropdown MUST render an `EmptyState`. If the user has `configuracion:crear`, the empty state MUST show `+ Crear el primero` for `raza`, `color`, and `lugar_compra`; for `calidad` and `tipo_explotacion` the affordance MUST NOT be shown because both are read-only catalogs. Otherwise the field MUST render disabled with a hint. When a finca-scoped catalog (`potrero`, `sector`, `lote`, `grupo`) is empty, the `+ Crear el primero` affordance MUST render disabled (CA-UI-004); Phase 1 MUST NOT open a creation flow. This satisfies CA-UI-004.

(Previously: the empty-state affordance was not scoped per catalog kind; the `+ Crear el primero` action was always enabled when the permission was granted, for every listed catalog.)

#### Scenario: Empty catalog behavior

- GIVEN `raza` is empty
- WHEN the user opens the Raza dropdown
- THEN the body shows `EmptyState` with `+ Crear el primero` if `configuracion:crear` is granted
- AND otherwise the field is disabled with a hint

#### Scenario: Finca-scoped empty catalog renders disabled affordance

- GIVEN `potrero` is empty for the active finca
- WHEN the user opens the Potrero dropdown
- THEN the EmptyState shows `+ Crear el primero` rendered disabled
- AND no creation flow opens

### Requirement: loadAnimalCatalogs server loader composition

`apps/web` MUST expose a `loadAnimalCatalogs(fincaId)` server function that revalidates the session (PE-002), calls the twelve catalog use cases in parallel (sexo + four maestro [raza, color, calidad, tipoExplotacion] + five finca-scoped + madre + padre), and returns a composite `AnimalCatalogs` object. Each value MUST be wrapped in `{ tipo: "disponible" | "no_disponible" }` matching the `AnimalSexoCatalog` pattern. On DB error, the loader MUST return `no_disponible` for every catalog and MUST NOT substitute mock data (IA-001, T-003). The `madre`/`padre` slots MUST consume `CatalogoPadresPort` (see `animal-parent-selector` spec). The edit route MUST consume the server loader via `getAnimalCatalogsAction()` and pass `excludedIds = [currentAnimalId]`.

(Previously: composed only three maestro + five finca-scoped catalogs; `tipoExplotacion` was never queried, and the count was ten use cases per invocation.)

#### Scenario: All twelve catalogs are composed

- GIVEN an authenticated session with `fincaActivaId = finca-A`
- WHEN `loadAnimalCatalogs("finca-A")` runs
- THEN it returns `sexo`, `raza`, `color`, `calidad`, `tipoExplotacion`, `potrero`, `sector`, `lote`, `grupo`, `lugarCompra`, `madre`, `padre`
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
