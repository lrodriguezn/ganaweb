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

## Rule Citations

- CA-UI-001 — Catalog-backed fields render as labeled selectors, not raw inputs.
- CA-UI-003 — Domain sex/origin labels are shown to users; raw numeric keys are preserved internally only.
- CA-UI-005 — Location is split into potrero, sector, lote, and grupo controls; no merged free-text `ubicacion` field.
- CA-UPD-001 — After creation, animal location is moved through a dedicated `Mover animal` flow, not through the data edit submission.
- IA-003 — Reuse `packages/ui` components for any UI surfaced in this change.
- T-003 — Domain names and UI text in Spanish.
- T-004 — No `dark:` variants; token-only theming.
