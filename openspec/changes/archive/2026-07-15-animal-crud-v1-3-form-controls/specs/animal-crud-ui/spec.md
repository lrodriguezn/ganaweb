# Delta for Animal CRUD UI

## Purpose

Extend `animal-crud-ui` with the v1.3 form-control behaviors: `Raza`/`Color`/`Calidad` labeled catalog selectors, the `+ Crear nuevo` affordance gated on `configuracion:crear`, the empty-catalog `EmptyState`, the in-flight submit state, the Origen toggle that mounts/unmounts conditional blocks, the `Estimar por edad` DatePicker shortcut, the future-date rejection, and the es-CO numeric formatting for `precio_compra` and `peso_compra`.

## ADDED Requirements

### Requirement: Raza, Color, and Calidad render as labeled catalog selectors

The form MUST render `raza` and `color` as `SelectConCreacion` and `calidad` as `Select`, displaying the Spanish label and persisting the catalog `id`. The form MUST NOT display raw numeric or UUID keys. Extends CA-UI-001 to the v1.3 catalog fields.

#### Scenario: Raza/Color/Calidad show labels

- GIVEN catalog options are loaded for `raza`, `color`, and `calidad`
- WHEN the form renders
- THEN each control shows the option label
- AND the payload carries the catalog `id`

### Requirement: "+ Crear nuevo" affordance is gated on `configuracion:crear`

The form MUST show `+ Crear nuevo` inside the `raza`, `color`, and `lugar_compra` dropdowns ONLY when the user has `configuracion:crear`. `calidad` MUST NOT expose the affordance. This satisfies CA-UI-002.

#### Scenario: Affordance visibility tracks permission

- GIVEN the user has `configuracion:crear` and the user lacks it (two variants)
- WHEN they open the Raza, Color, or Lugar de compra dropdown
- THEN the last option is `+ Crear nuevo` (with permission) or absent (without)

### Requirement: Empty catalog renders EmptyState with "+ Crear el primero"

When `raza`, `color`, `calidad`, or `lugar_compra` is empty, the dropdown MUST render an `EmptyState`. If the user has `configuracion:crear`, the empty state MUST show `+ Crear el primero`; otherwise the field MUST render disabled with a hint. This satisfies CA-UI-004.

#### Scenario: Empty catalog behavior

- GIVEN `raza` is empty
- WHEN the user opens the Raza dropdown
- THEN the body shows `EmptyState` with `+ Crear el primero` if `configuracion:crear` is granted
- AND otherwise the field is disabled with a hint

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

## Rule Citations

- CA-UI-001 (extended to v1.3 fields), CA-UI-002, CA-UI-003, CA-UI-004, CA-UI-005, CA-UI-006, CA-UI-007
- CA-CRE-002, CA-CRE-003, CA-CRE-004
- RN-002 — no future dates
- T-003 — Spanish labels; T-004 — token-only theming (no `dark:`)
