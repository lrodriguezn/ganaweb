# Animal CRUD UI Specification

## Purpose

Define the animal create/edit form UI contract for catalog-backed fields, sex labels, split location controls, and CA-UI remediation acceptance. This specification is limited to the animal form; shell/header finca-label behavior is out of scope.

## Requirements

### Requirement: Catalog-backed fields use labeled selectors

The animal form MUST render catalog-backed values as selector controls with human-readable labels and MUST preserve the corresponding ids or keys in submitted form data. This satisfies CA-UI-001 and CA-UI-003.

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

- CA-UI-001 — Catalog-backed fields render as labeled selectors, not raw inputs. (Extended to v1.3 fields: raza, color, calidad, lugar_compra.)
- CA-UI-002 — `+ Crear nuevo` affordance is gated on the `configuracion:crear` permission.
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
- T-003 — Domain names and UI text in Spanish.
- T-004 — No `dark:` variants; token-only theming.
