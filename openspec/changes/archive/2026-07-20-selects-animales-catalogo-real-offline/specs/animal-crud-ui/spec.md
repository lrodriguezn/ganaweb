# Delta for Animal CRUD UI

## MODIFIED Requirements

### Requirement: Catalog-backed fields use labeled selectors

The animal form MUST render catalog-backed values as selector controls with human-readable labels and MUST preserve the corresponding ids or keys in submitted form data. The source of catalog options MUST be the real PostgreSQL database through `CatalogoAnimalMaestroPort` (raza, color, calidad) and `CatalogoFincaPort` (potrero, sector, lote, grupo, lugarCompra); mock fixtures MUST NOT be used in production routes after Phase 1. This satisfies CA-UI-001 and CA-UI-003.
(Previously: options came from `getAnimalFormCatalogOptions()` mock fixture.)

#### Scenario: User selects catalog labels

- GIVEN the animal form has catalog options for sex and ingreso/origen
- WHEN the user opens each catalog-backed control
- THEN the user sees descriptive option labels instead of ids or raw keys
- AND saving preserves the selected ids/keys in the payload

#### Scenario: Catalog option is missing

- GIVEN a persisted id/key has no available label in the loaded catalog options
- WHEN the form renders that field
- THEN the field MUST show a safe unavailable-label state
- AND it MUST NOT expose the raw id/key as the user-facing label

### Requirement: Raza, Color, and Calidad render as labeled catalog selectors

The form MUST render `raza` and `color` as `SelectConCreacion` and `calidad` as `Select`, displaying the Spanish label and persisting the catalog `id`. The form MUST NOT display raw numeric or UUID keys. The source MUST be the real DB via `CatalogoAnimalMaestroPort.listarActivos(tabla)`. The Color DTO MUST carry `meta.hex` from `config_colores.codigo` for Phase 2 use; the Phase 1 `SelectConCreacion` primitive MUST NOT render a swatch. Extends CA-UI-001.
(Previously: options were hardcoded in the mock fixture; Color DTO `meta.hex` contract was not specified.)

#### Scenario: Raza/Color/Calidad show labels

- GIVEN catalog options are loaded for `raza`, `color`, and `calidad`
- WHEN the form renders
- THEN each control shows the option label
- AND the payload carries the catalog `id`

#### Scenario: Color DTO carries meta.hex but no swatch is rendered

- GIVEN the Color DTO is loaded from `config_colores`
- WHEN the form receives the catalog payload
- THEN each Color option carries `meta.hex` equal to the `codigo` value
- AND the Phase 1 select primitive does NOT render a swatch for that option

### Requirement: "+ Crear nuevo" affordance is gated on `configuracion:crear`

The form MUST show `+ Crear nuevo` inside the `raza`, `color`, `lugar_compra`, `potrero`, `sector`, `lote`, and `grupo` dropdowns ONLY when the user has `configuracion:crear`. `calidad` MUST NOT expose the affordance. Phase 1 keeps the action stubbed (no creation flow opens). This satisfies CA-UI-002.
(Previously: the affordance was rendered for `raza`, `color`, and `lugar_compra` only.)

#### Scenario: Affordance visibility tracks permission

- GIVEN the user has `configuracion:crear` and the user lacks it (two variants)
- WHEN they open the Raza, Color, or Lugar de compra dropdown
- THEN the last option is `+ Crear nuevo` (with permission) or absent (without)

### Requirement: Empty catalog renders EmptyState with "+ Crear el primero"

When `raza`, `color`, `calidad`, or `lugar_compra` is empty, the dropdown MUST render an `EmptyState`. If the user has `configuracion:crear`, the empty state MUST show `+ Crear el primero`; otherwise the field MUST render disabled with a hint. When a finca-scoped catalog (`potrero`, `sector`, `lote`, `grupo`) is empty, the `+ Crear el primero` affordance MUST render disabled (CA-UI-004); Phase 1 MUST NOT open a creation flow. This satisfies CA-UI-004.
(Previously: the empty-state affordance was not scoped per catalog kind; the `+ Crear el primero` action was always enabled when the permission was granted.)

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

## ADDED Requirements

### Requirement: Global catalog use cases (raza, color, calidad)

The system MUST provide three use cases — `listarCatalogoRaza`, `listarCatalogoColor`, `listarCatalogoCalidad` — that consume `CatalogoAnimalMaestroPort` and return strict, typed DTOs. The port MUST accept a typed table parameter and expose only `activo=1` rows. Each use case MUST return canonical `id` and Spanish `label`, MUST sort es-CO by `nombre` (T-003), and MUST reject null, unknown, duplicate, and noncanonical rows. The Color DTO MUST include `meta.hex` from `config_colores.codigo`. On empty result, the loader MUST return `{ tipo: "no_disponible" }` for the corresponding catalog and MUST NOT substitute demo or hardcoded options.

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

### Requirement: Finca-scoped catalog use cases (potrero, sector, lote, grupo, lugarCompra)

The system MUST provide five use cases — `listarPotrerosPorFinca`, `listarSectoresPorFinca`, `listarLotesPorFinca`, `listarGruposPorFinca`, `listarLugaresCompraPorFinca` — that consume `CatalogoFincaPort`. The port MUST expose `listarPorFinca(fincaId, tabla)`. The server loader MUST revalidate `session.fincaActivaId === fincaId` (PE-002, PE-003) before invoking the port; requests for any other `fincaId` MUST be denied. Each use case MUST return only rows for the requested `fincaId` with `activo=1`, MUST sort es-CO by `nombre`, and MUST reject null, unknown, and duplicate rows. On empty result, the loader MUST return `{ tipo: "no_disponible" }`.

#### Scenario: Only rows for the active finca are returned

- GIVEN rows for two fincas and `session.fincaActivaId = finca-A`
- WHEN `listarPorFinca("finca-A", ...)` runs
- THEN only rows for `finca-A` are returned
- AND rows for `finca-B` are excluded

#### Scenario: Cross-finca request is denied

- GIVEN `session.fincaActivaId = finca-A` and a request for `finca-B`
- WHEN the loader revalidates
- THEN the request is denied before the port is invoked
- AND no catalog data is returned

#### Scenario: Empty per-finca catalog returns no_disponible

- GIVEN the active finca has no active `potreros`
- WHEN the loader composes the catalog
- THEN the potrero state is `{ tipo: "no_disponible" }`
- AND the UI renders EmptyState with disabled `+ Crear el primero`

### Requirement: loadAnimalCatalogs server loader composition

`apps/web` MUST expose a `loadAnimalCatalogs(fincaId)` server function that revalidates the session (PE-002), calls the eight catalog use cases in parallel (sexo + three maestro + five finca-scoped), and returns a composite `AnimalCatalogs` object. Each catalog value MUST be wrapped in `{ tipo: "disponible" | "no_disponible" }` matching the existing `AnimalSexoCatalog` pattern. On DB error, the loader MUST return `no_disponible` for every catalog and MUST NOT substitute demo or mock data (IA-001, T-003).

#### Scenario: All eight catalogs are composed

- GIVEN an authenticated session with `fincaActivaId = finca-A`
- WHEN `loadAnimalCatalogs("finca-A")` runs
- THEN it returns a composite object containing `sexo`, `raza`, `color`, `calidad`, `potrero`, `sector`, `lote`, `grupo`, `lugarCompra`
- AND each value is wrapped in `{ tipo: "disponible" | "no_disponible" }`

#### Scenario: DB error returns no_disponible for all

- GIVEN the database is unavailable
- WHEN the loader composes catalogs
- THEN every catalog state is `{ tipo: "no_disponible" }`
- AND no mock or demo data is returned

### Requirement: BUG-001 selection contract

The animal form MUST register a selection when the user clicks a `raza`, `color`, `calidad`, `potrero`, `sector`, `lote`, `grupo`, or `lugar_compra` option. After the click, the option MUST become visible as selected, the hidden `<input>` MUST carry the canonical catalog `id`, and `FormData` on submit MUST contain that `id` (CA-UI-001, T-003). The diagnosis-first evidence trail (`diagnosis-bug-001.md`) MUST document the reproduction with real DB data and the root cause (IA-001). If the bug does NOT reproduce with real data, the mock ID mismatch is the root cause and the fix MUST be in the data source rather than the `SelectConCreacion` or `SelectConCreacionField` primitive. Tasks 2.1–2.3 of `bug-2026-07-01-formulario-animales` are absorbed by this requirement.

#### Scenario: Click registers selection with real data

- GIVEN the form rendered with real DB catalog options
- WHEN the user clicks an option in the raza or color select
- THEN the option becomes selected (visible)
- AND the hidden input updates to the canonical id
- AND FormData on submit carries the canonical id

#### Scenario: Keyboard selection registers the canonical id

- GIVEN a select with real DB options focused
- WHEN the user presses Down Arrow then Enter
- THEN the visible label matches the option
- AND the hidden input carries the canonical id
- AND FormData on submit carries the canonical id

#### Scenario: No reproduction with real data closes by absorption

- GIVEN a route-level regression with real DB data passes
- WHEN the diagnosis is reviewed
- THEN the report records the symptom as not reproduced
- AND the bug-change tasks 2.1–2.3 close by absorption (no primitive change)

### Requirement: Sexo non-regression and mock fixture stub

Phase 1 MUST NOT regress the existing `sexo` flow. `CatalogoGlobalPort`, `listarCatalogoSexo`, and `DrizzleCatalogoGlobalAdapter` MUST remain untouched. The mock fixture `getAnimalFormCatalogOptions()` MUST be retained as a stub fallback for rollback safety and SHOULD NOT be consumed by production routes after Phase 1 (IA-001).

#### Scenario: Sexo flow is intact

- GIVEN the existing sexo adapter and use case
- WHEN Phase 1 ships
- THEN the sexo source-of-truth files are unchanged
- AND the sexo regression tests pass

#### Scenario: Mock fixture retained as stub

- GIVEN `getAnimalFormCatalogOptions()` is imported by routes or tests
- WHEN Phase 1 is rolled back
- THEN the fixture still returns the same demo options
- AND the routes can be reverted to fixture-sourced options

## Future / Out of Scope

**Phase 2 — `catalogo-animal-offline`** (separate change, future): SQLite WASM + OPFS local replica per finca; read-through cache (online → Drizzle adapter; offline → local adapter); catalog sync/seed/refresh from server to local; read-only offline (no `sync_outbox` writer for catalogs); color swatch rendering using `meta.hex` becomes available. Phase 1 MUST NOT introduce SQLite references, OPFS access, or `sync_outbox` writer paths for catalogs.

## Rule Citations

- PE-002 — server function revalidates the session and effective permissions per finca.
- PE-003 — finca-scoped permissions: `session.fincaActivaId === fincaId` is required.
- RN-050 — masters referenced by events are not removed (Phase 1 is read-only, no impact).
- RN-001 — `uq_animales_finca_codigo` not affected (no schema changes).
- CA-UI-001 — labels shown to the user; canonical id carried in the payload.
- CA-UI-002 — `+ Crear nuevo` gated on `configuracion:crear`; stubbed in Phase 1.
- CA-UI-004 — EmptyState with `+ Crear el primero`; disabled for empty finca-scoped catalogs.
- CA-UI-005 — location split into `potrero`, `sector`, `lote`, `grupo`; no merged free-text.
- T-003 — Spanish labels; es-CO `localeCompare` ordering.
- T-004 — token-only theming (no `dark:` variants).
- IA-001 — diagnosis-first closure for BUG-001; ambiguity stops work.
- IA-003 — reuse `packages/ui` primitives; no duplicated select primitive.
