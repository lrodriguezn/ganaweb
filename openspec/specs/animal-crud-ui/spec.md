# Animal CRUD UI Specification

## Purpose

Define the animal create/edit form UI contract for catalog-backed fields, sex labels, split location controls, and CA-UI remediation acceptance. This specification is limited to the animal form; shell/header finca-label behavior is out of scope.

## Requirements

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

### Requirement: Sex selection hides raw numeric keys

The `sexo_key` field MUST display domain labels for `0=Macho`, `1=Hembra`, and `2=Pajuela`, while preserving `0`, `1`, or `2` internally. The UI MUST NOT show raw numeric values such as `1` as the visible selection. This satisfies CA-UI-001 and CA-UI-003.

#### Scenario: Default female value is labeled

- GIVEN the create form initializes `sexo_key` to `1`
- WHEN the form is shown
- THEN the visible selection is `Hembra`
- AND the submitted value remains `1`

#### Scenario: User changes sex value

- GIVEN the user changes the sex selector to `Macho`
- WHEN the form is submitted
- THEN the payload contains `sexo_key=0`
- AND no raw numeric sex key is displayed to the user

### Requirement: Location controls are semantically split

The animal form MUST represent location as separate controls for potrero, sector, lote, and grupo. It MUST NOT merge location into one ambiguous free-text control. This satisfies CA-UI-005.

#### Scenario: Create mode captures optional split location

- GIVEN the user is creating an animal
- WHEN the location section is displayed
- THEN potrero, sector, lote, and grupo are separate optional controls
- AND selected values are submitted as their respective ids

#### Scenario: Location is not collapsed

- GIVEN location controls are available
- WHEN the user reviews the form
- THEN there is no single free-text field labeled as a combined potrero/sector/lote/grupo value

### Requirement: Edit mode respects location move semantics

In edit mode, location fields MUST respect CA-UPD-001: potrero, sector, lote, and grupo are not directly editable in the animal data form after creation. The form MUST present current location as read-only and SHOULD provide a `Mover animal` action when movement is available.

#### Scenario: Edit mode shows read-only location

- GIVEN an existing animal has current location data
- WHEN the edit form renders
- THEN potrero, sector, lote, and grupo are displayed as read-only values
- AND the form does not submit direct location mutations

#### Scenario: Move flow is offered from edit mode

- GIVEN the user has permission to move an animal
- WHEN the edit form shows the read-only location section
- THEN the UI SHOULD expose a `Mover animal` action
- AND movement is handled outside the data edit submission

### Requirement: CA-UI acceptance traceability

Acceptance evidence for this remediation MUST explicitly cite CA-UI-001, CA-UI-003, and CA-UI-005 in tests and review notes.

#### Scenario: Verification cites rules

- GIVEN the remediation is ready for review
- WHEN tests and PR notes are prepared
- THEN they explicitly reference CA-UI-001, CA-UI-003, and CA-UI-005

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

The form MUST show `+ Crear nuevo` inside the `raza`, `color`, `lugar_compra`, `potrero`, `sector`, `lote`, and `grupo` dropdowns ONLY when the user has `configuracion:crear`. `calidad` and `tipoExplotacion` MUST NOT expose the affordance — both are read-only catalogs. Phase 1 keeps the action stubbed (no creation flow opens). This satisfies CA-UI-002.
(Previously: the affordance was rendered for `raza`, `color`, and `lugar_compra` only.)

#### Scenario: Affordance visibility tracks permission

- GIVEN the user has `configuracion:crear` and the user lacks it (two variants)
- WHEN they open the Raza, Color, or Lugar de compra dropdown
- THEN the last option is `+ Crear nuevo` (with permission) or absent (without)

### Requirement: Empty catalog renders EmptyState with "+ Crear el primero"

When `raza`, `color`, `calidad`, `tipo_explotacion`, or `lugar_compra` is empty, the dropdown MUST render an `EmptyState`. If the user has `configuracion:crear`, the empty state MUST show `+ Crear el primero` for `raza`, `color`, and `lugar_compra`; for `calidad` and `tipo_explotacion` the affordance MUST NOT be shown because both are read-only catalogs. Otherwise the field MUST render disabled with a hint. When a finca-scoped catalog (`potrero`, `sector`, `lote`, `grupo`) is empty, the `+ Crear el primero` affordance MUST render disabled (CA-UI-004); Phase 1 MUST NOT open a creation flow. This satisfies CA-UI-004.
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

### Requirement: Submit button shows in-flight state and respects validity

The `Guardar` button MUST display `Guardando…` while the create action is in flight, MUST preserve its width, and MUST be disabled when the form has any validation error. This satisfies CA-UI-006.

#### Scenario: In-flight and disabled states

- GIVEN the form state is valid with action in flight, OR has any validation error
- WHEN the button is rendered
- THEN the label is `Guardando…` and the button is disabled (in flight) — width preserved
- AND the button is disabled without calling the action (invalid)

### Requirement: Origen toggle mounts/unmounts conditional fields and discards stale values

The form MUST render `madre`/`padre` ONLY when `origen = "nacido_en_finca"` and the four purchase inputs (`fecha_compra`, `precio_compra`, `peso_compra`, `lugar_compra`) ONLY when `origen = "comprado"`. When `origen` flips, the abandoned fields MUST unmount and their typed values MUST NOT be submitted. This satisfies CA-UI-007 and CA-CRE-002.

#### Scenario: Mode-driven block visibility

- GIVEN `origen` is `nacido_en_finca` or `comprado`
- WHEN the form renders
- THEN `Madre` and `Padre` are visible AND no purchase block (nacido)
- AND the four purchase inputs are visible AND parents are not (comprado)

#### Scenario: Flip discards abandoned values

- GIVEN a value was typed in the abandoned mode's field
- WHEN the user flips `origen`
- THEN that field is not rendered
- AND the payload does NOT include the abandoned field

### Requirement: DatePicker "Estimar por edad" shortcut

The `Fecha de nacimiento` `DatePicker` MUST expose an `Estimar por edad` action. Activating it MUST produce a date and the form MUST append `[fecha estimada]` to `comentarios`. This satisfies CA-CRE-004.

#### Scenario: Estimar emits date and tags comentarios

- GIVEN the user invokes `Estimar por edad` with `3 años`
- WHEN they confirm
- THEN `fecha_nacimiento` is set to the computed ISO date
- AND `comentarios` ends with `[fecha estimada]`

### Requirement: Fecha de nacimiento rejects future dates

The `Fecha de nacimiento` `DatePicker` MUST NOT allow selecting a future date, and the form validation MUST reject any future date submitted by any path. This satisfies RN-002.

#### Scenario: Future date blocked at UI and validation

- GIVEN today is `15/07/2026`
- WHEN the user opens the calendar OR a programmatic submit carries `fecha_nacimiento = "2099-01-01"`
- THEN any day after `15/07/2026` is disabled in the day grid
- AND the form validation rejects the submit and marks the field `aria-invalid="true"`

### Requirement: Numeric inputs use es-CO formatting

`precio_compra` and `peso_compra` MUST accept es-CO formatted input (`,` decimal, `.` thousand). The form MUST normalize to a JavaScript number before persisting.

#### Scenario: User enters 1.500,75

- GIVEN the user types `1.500,75` into `precio_compra`
- WHEN the form normalizes
- THEN the persisted value is the number `1500.75`

### Requirement: Global catalog use cases (raza, color, calidad, tipoExplotacion)

The system MUST provide four use cases — `listarCatalogoRaza`, `listarCatalogoColor`, `listarCatalogoCalidad`, and `listarCatalogoTipoExplotacion` — that consume `CatalogoAnimalMaestroPort` and return strict, typed DTOs. The port MUST accept a typed table parameter. `listarCatalogoRaza`, `listarCatalogoColor`, and `listarCatalogoCalidad` MUST expose only `activo=1` rows. `listarCatalogoTipoExplotacion` MUST return ALL rows from `config_tipos_explotacion` (no `activo=1` filter) so users can still select an inactive category for an existing animal. Each use case MUST return canonical `id` and Spanish `label`, MUST sort es-CO by `nombre` (T-003), and MUST reject null, unknown, duplicate, and noncanonical rows. The Color DTO MUST include `meta.hex` from `config_colores.codigo`. On empty result, the loader MUST return `{ tipo: "no_disponible" }` for the corresponding catalog and MUST NOT substitute demo or hardcoded options.

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

`apps/web` MUST expose a `loadAnimalCatalogs(fincaId)` server function that revalidates the session (PE-002), calls the twelve catalog use cases in parallel (sexo + four maestro [raza, color, calidad, tipoExplotacion] + five finca-scoped + madre + padre), and returns a composite `AnimalCatalogs` object. Each value MUST be wrapped in `{ tipo: "disponible" | "no_disponible" }` matching the `AnimalSexoCatalog` pattern. On DB error, the loader MUST return `no_disponible` for every catalog and MUST NOT substitute mock data (IA-001, T-003). The `madre`/`padre` slots MUST consume `CatalogoPadresPort` (see `animal-parent-selector` spec). The edit route MUST consume the server loader via `getAnimalCatalogsAction()` and pass `excludedIds = [currentAnimalId]`.
(Previously: composed only the eight config catalogs; `madre`/`padre` were never queried, and the edit route consumed a mock fixture that throws in production.)

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

### Requirement: Single-instance form rendering per route

The animal create route (`animales/nuevo`) and edit route (`animales/$animalId/editar`) MUST mount exactly one `AnimalFormScreen` instance per page. The component MUST NOT be rendered twice with different `mode` values inside responsive wrapper divs (`hidden md:block` paired with `md:hidden`). This satisfies issue #59.

#### Scenario: One DOM tree per route

- GIVEN the user navigates to `animales/nuevo` or `animales/$animalId/editar`
- WHEN the route view mounts
- THEN the DOM contains exactly one `<form>` rendered by `AnimalFormScreen`
- AND no second `AnimalFormScreen` is mounted under a `hidden md:block` / `md:hidden` pair

### Requirement: Viewport-responsive mode derived from `matchMedia`

`AnimalFormScreen` MUST determine the responsive `mode` ("desktop" | "mobile") reactively from a `matchMedia("(min-width: 768px)")` listener. The internal `mobile` boolean MUST update when the viewport crosses the 768px breakpoint. The SSR / pre-hydration default MUST be desktop, and the existing `isHydrated` gate MUST suppress mismatches during the first render.

#### Scenario: Desktop viewport reports desktop

- GIVEN `window.matchMedia("(min-width: 768px)")` matches
- WHEN `AnimalFormScreen` renders
- THEN the desktop layout, field set, and footer position are used
- AND the desktop `data-testid` / `aria-label` are applied

#### Scenario: Cross below 768px switches to mobile

- GIVEN the form is rendered at desktop width
- WHEN the viewport becomes narrower than 768px (matchMedia `change` fires)
- THEN the form re-renders with the mobile layout, filtered field set, and sticky footer
- AND the mobile `data-testid` / `aria-label` are applied

#### Scenario: SSR renders desktop before hydration

- GIVEN the route is server-rendered
- WHEN the HTML is sent to the client
- THEN the rendered markup matches the desktop variant
- AND the client agrees on the first paint because of the `isHydrated` gate

### Requirement: Form state persists across viewport changes

`AnimalFormScreen` MUST keep every typed value in its internal state across viewport transitions. When the viewport crosses 768px while the user has data in any field (including but not limited to `comentarios`, `fechaNacimiento`, `fechaCompra`, `origen`, `origenFlipCount`), the values MUST remain in the form after the re-render. This satisfies issue #59.

#### Scenario: Typed text survives resize

- GIVEN the user has typed `animal enfermo` into `comentarios` at desktop width
- WHEN the viewport crosses 768px and the form re-renders as mobile
- THEN the `comentarios` input still shows `animal enfermo`
- AND `fecha_nacimiento` (if set) and `origen` (if set) are preserved

#### Scenario: Mobile-to-desktop preserves state

- GIVEN the user has typed values at mobile width
- WHEN the viewport grows past 768px and the form re-renders as desktop
- THEN every typed value is still present
- AND the submit payload reflects the user-entered values

### Requirement: `mode` prop is optional and overrides the media query

The `mode` prop of `AnimalFormScreen` MUST be optional. When `mode` is provided (`"desktop"` or `"mobile"`), the component MUST use it as an override and skip the `matchMedia` listener. When `mode` is `undefined`, the component MUST derive the responsive variant from the media query. The `mode` prop exists for SSR defaults and for tests that need a stable variant; production routes MUST NOT pass `mode`.

#### Scenario: No `mode` prop uses the media query

- GIVEN the route renders `<AnimalFormScreen />` without a `mode` prop
- WHEN the viewport changes
- THEN the layout tracks the media query

#### Scenario: Explicit `mode` overrides the media query

- GIVEN a test renders `<AnimalFormScreen mode="mobile" />`
- WHEN a `matchMedia` `change` event fires
- THEN the component still renders the mobile variant
- AND the media-query listener is not consulted while `mode` is set

#### Scenario: Form `id` is stable across variants

- GIVEN the form is rendered
- WHEN the viewport changes or `mode` toggles
- THEN the rendered form `id` is `animal-form-${currentAnimalId ?? "new"}` (no `mode` segment)
- AND the same form element is reused (no remount caused by `id` change)

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

## Future / Out of Scope

**Phase 2 — `catalogo-animal-offline`** (separate change, future): SQLite WASM + OPFS local replica per finca; read-through cache (online → Drizzle adapter; offline → local adapter); catalog sync/seed/refresh from server to local; read-only offline (no `sync_outbox` writer for catalogs); color swatch rendering using `meta.hex` becomes available. Phase 1 MUST NOT introduce SQLite references, OPFS access, or `sync_outbox` writer paths for catalogs.

## Rule Citations

- CA-UI-001 — Catalog-backed fields render as labeled selectors, not raw inputs. (Extended to all 8 catalogs: raza, color, calidad, potrero, sector, lote, grupo, lugarCompra.)
- CA-UI-002 — `+ Crear nuevo` affordance is gated on the `configuracion:crear` permission. (Extended to potrero, sector, lote, grupo.)
- CA-UI-003 — Domain sex/origin labels are shown to users; raw numeric keys are preserved internally only.
- CA-UI-004 — Empty catalog renders `EmptyState` with `+ Crear el primero`; otherwise field is disabled with a hint.
- CA-UI-005 — Location is split into potrero, sector, lote, and grupo controls; no merged free-text `ubicacion` field.
- CA-UI-006 — Submit button shows `Guardando…` while in flight and is disabled when any validation error exists; width is preserved.
- CA-UI-007 — Origen toggle remounts the abandoned conditional block; abandoned values are NOT submitted.
- CA-CRE-002 — `origen` is rendered as `PillsSegmentadas` (Nacimiento / Comprado) with `key={origen}` remount semantics.
- CA-CRE-003 — `madre`/`padre` comboboxes exclude the current animal id and use `código · nombre` row labels.
- CA-CRE-004 — `Estimar por edad` DatePicker shortcut produces a date and appends `[fecha estimada]` to `comentarios`.
- CA-UPD-001 — After creation, animal location is moved through a dedicated `Mover animal` flow, not through the data edit submission.
- RN-002 — `Fecha de nacimiento` rejects future dates at the calendar AND at form validation.
- IA-003 — Reuse `packages/ui` components for any UI surfaced in this change.
- T-003 — Domain names and UI text in Spanish; es-CO `localeCompare` ordering for catalog options.
- T-004 — No `dark:` variants; token-only theming.
- PE-002 — Server function revalidates the session and effective permissions per finca.
- PE-003 — Finca-scoped permissions: `session.fincaActivaId === fincaId` is required.
- RN-001 — Unique code per finca (`uq_animales_finca_codigo`); no schema changes in Phase 1.
- RN-050 — Masters referenced by events are not removed (Phase 1 is read-only, no impact).
- IA-001 — Ambiguity stops work (applied to BUG-001 diagnosis-first); mock data must not substitute for real data.
