# Animal Form Primitives Specification

## Purpose

Vendored UI primitives composed by the animal create/edit form for the v1.3 catalog fields, dates, and the Origen segmented control. Each primitive is fully controlled, exposes `aria-invalid` and `aria-describedby` for per-field error binding, uses `cmdk` for searchable selectors, and follows Spanish domain vocabulary with token-only theming.

## Requirements

### Requirement: DatePicker primitive

The `DatePicker` primitive MUST render an es-CO formatted date (`dd/mm/aaaa`), MUST be controlled via `value: string` (ISO `yyyy-mm-dd` or empty) and `onChange: (value: string) => void`, MUST set max selectable date to today (RN-002), MUST accept `aria-invalid` and `aria-describedby`, and MUST expose an `Estimar por edad` action that produces a date and signals the form to append `[fecha estimada]` to `comentarios` (CA-CRE-004).

#### Scenario: User picks a date

- GIVEN `DatePicker` renders with `value = ""` and `aria-invalid="true"` and `aria-describedby="err-fecha"`
- WHEN the user selects `15/03/2025`
- THEN `onChange` is called with `"2025-03-15"`
- AND the input carries both aria attributes
- AND an error node resolves by id `err-fecha`

#### Scenario: Future date is blocked

- GIVEN today is `15/07/2026`
- WHEN the user opens the calendar
- THEN any day after `15/07/2026` is disabled
- AND `onChange` cannot emit a future ISO string

#### Scenario: Estimar por edad emits date and tag

- GIVEN the user invokes `Estimar por edad` with `3` years
- WHEN they confirm
- THEN `onChange` emits an ISO date ≈ 3 years back
- AND the form appends `[fecha estimada]` to `comentarios`

### Requirement: SelectConCreacion primitive

The `SelectConCreacion` primitive MUST use `cmdk` as the search engine, MUST render options search-as-you-type, MUST show option labels (never raw keys) preserving the option `id` in the emitted value (CA-UI-001), MUST show `+ Crear nuevo` ONLY when `canCreate: boolean` is true (CA-UI-002), and MUST render `EmptyState` with `+ Crear el primero` when the list is empty AND `canCreate` is true (CA-UI-004).

#### Scenario: User searches and selects

- GIVEN options `[{id:"r1", label:"Angus"}, {id:"r2", label:"Brahman"}]`
- WHEN the user types `bra` and activates the row
- THEN `onChange` emits `"r2"`
- AND the visible text reads `Brahman`

#### Scenario: Empty list with canCreate

- GIVEN `options = []` and `canCreate = true`
- WHEN the dropdown opens
- THEN the body shows `EmptyState` with `+ Crear el primero`

#### Scenario: Empty list without canCreate

- GIVEN `options = []` and `canCreate = false`
- WHEN the dropdown opens
- THEN no `+ Crear` affordance is rendered
- AND the field renders disabled with a hint

### Requirement: PillsSegmentadas primitive

The `PillsSegmentadas` primitive MUST render exactly 2 options, MUST be controlled via `value` and `onChange`, MUST allow Left/Right arrow keys to move the active pill and Enter/Space to confirm, and MUST accept `aria-invalid` for error binding.

#### Scenario: User toggles Origen

- GIVEN options `[{value:"nacido", label:"Nacido en finca"}, {value:"comprado", label:"Comprado"}]` and `value = "nacido"` and `aria-invalid="true"`
- WHEN the user clicks `Comprado`
- THEN `onChange` is called with `"comprado"`
- AND the group exposes `aria-invalid="true"`

#### Scenario: Keyboard navigation

- GIVEN focus is on the active pill
- WHEN the user presses ArrowRight then Enter
- THEN `onChange` is called with the second option's value
- AND the active pill carries `aria-pressed="true"`

### Requirement: ComboboxBuscable primitive

The `ComboboxBuscable` primitive MUST use `cmdk` as the search engine, MUST accept `excludedIds: string[]` and filter out matching ids, MUST render each option label as `código · nombre`, and MUST preserve the option `id` (not label) in the emitted value (CA-UI-001, CA-CRE-003).

#### Scenario: User searches and selects

- GIVEN options `[{id:"a-100", codigo:"MT-100", nombre:"Lola"}, {id:"a-200", codigo:"MT-200", nombre:"Maya"}]`
- WHEN the user types `200` and activates the row
- THEN `onChange` emits `"a-200"`
- AND the row text reads `MT-200 · Maya`

#### Scenario: Excluded ids are hidden

- GIVEN `excludedIds = ["a-100"]`
- WHEN the dropdown opens
- THEN `MT-100 · Lola` is NOT in the list
- AND `MT-200 · Maya` IS in the list

#### Scenario: Aria error binding

- GIVEN the parent passes `aria-invalid="true"` and `aria-describedby="err-madre"`
- WHEN the input renders
- THEN both attributes are present on the combobox input

## Rule Citations

- CA-UI-001, CA-UI-002, CA-UI-003, CA-UI-004, CA-UI-005, CA-UI-007
- CA-CRE-002, CA-CRE-003, CA-CRE-004
- RN-002 — no future dates
- IA-003 — reuse `packages/ui`
- T-003 — Spanish labels; T-004 — token-only theming (no `dark:`)
