# Delta for Animal CRUD UI

## ADDED Requirements

### Requirement: BUG-001 catalog-selection diagnosis and closure gate

BUG-001 MUST remain a diagnosis, not a confirmed correction, until a route-level reproduction establishes a failing selection contract. For Raza, Color, Calidad, and Lugar de compra, desktop and mobile regression evidence MUST prove click and keyboard selection, visible label, closure, dirty form state, and submitted catalog ID (CA-UI-001, IA-001). A code change MAY be made only after the demonstrated cause is recorded; no BUG-001 work item SHALL close without this regression.

#### Scenario: Desktop catalog selection evidence

- GIVEN the create or edit route with all four catalog fields and seeded options
- WHEN each field is searched, selected by click and by Down Arrow plus Enter, then saved
- THEN each trigger shows the human-readable label, its overlay closes, and the payload contains its ID
- AND the form is dirty before submission

#### Scenario: Mobile keyboard selection evidence

- GIVEN the mobile route with the same four fields
- WHEN each field is opened, searched, and selected by click and by Down Arrow plus Enter
- THEN each visible label, closure, dirty state, and submitted ID matches the desktop contract

#### Scenario: No reproduction is found

- GIVEN the route-level regression passes before a BUG-001 code change
- WHEN diagnosis is reviewed
- THEN the report records the symptom as unreproduced and does not claim a corrective fix

### Requirement: Purchase-date selection and submission

When `origen = "comprado"`, `fecha_compra` MUST update its displayed es-CO value and submitted ISO value after a valid selection. It MUST allow today, reject future dates, and reject dates before `fecha_nacimiento` when that value exists (RN-002). The same behavior MUST be verified on desktop and mobile; BUG-002 SHALL not close without its regression.

#### Scenario: Valid purchase date is submitted

- GIVEN a purchased animal and a selectable past date
- WHEN the user selects the date and saves on desktop or mobile
- THEN the trigger displays `dd/mm/aaaa` and the payload contains the selected ISO date

#### Scenario: Purchase-date boundaries are enforced

- GIVEN today is frozen and `fecha_nacimiento` is optionally populated
- WHEN the calendar opens
- THEN today is selectable while future and pre-birth days are disabled
- AND an invalid value cannot be submitted

#### Scenario: Birth-date selection remains guarded

- GIVEN the same frozen date on desktop and mobile
- WHEN the user selects today or attempts to select a later birth date
- THEN today is accepted and the later date remains unavailable under RN-002

### Requirement: Ordered, reviewable bug closure

The remediation MUST preserve BUG-001 → BUG-002 → BUG-003 → BUG-004 delivery order. Each bug MUST have its own regression, cite its `BUG-xxx` identifier in commit and PR metadata, and remain within the 400 changed-line review budget in its feature-branch-chain slice.

#### Scenario: A bug slice is proposed for closure

- GIVEN its predecessor slice is accepted
- WHEN a BUG-xxx PR is prepared
- THEN it contains that bug's focused regression and identifier
- AND it does not close another bug or exceed the review budget

### Requirement: Global key-value catalog reader for sex

The system MUST provide one reusable reader for global `config_key_values` catalogs, initially supporting only `opcion = "sexo"`. It MUST read only `activo = 1` rows, map `key` to the displayed label and `value` to the emitted/persisted value, and MUST NOT scope the catalog by finca. For `sexo`, it MUST accept exactly raw strings `"0" | "1" | "2"` and strictly decode them to numeric `0 | 1 | 2`; it MUST reject and diagnose null, unknown, coercible-but-noncanonical values (including `"01"`), duplicate values for the option, and empty results. It MUST order valid entries by numeric value ascending, then `key`, then `id`. Production routes MUST fail safely and MUST NOT substitute demo or hardcoded options. `estado` and `salud` remain event-derived and MUST NOT become editable selects. `tipo_ingreso_id` is the contextual seed column; future `type_ingreso` MAY persist numeric values while retaining expressive domain strings, but is out of scope for this slice.

#### Scenario: Active sex catalog is decoded

- GIVEN global active `sexo` rows with `key` labels and canonical values `"0"`, `"1"`, and `"2"`
- WHEN the catalog reader loads `sexo`
- THEN it returns the labels with emitted numeric values `0`, `1`, and `2`
- AND no finca identifier is required or applied

#### Scenario: Inactive rows and ordering are handled deterministically

- GIVEN active sex rows arrive unordered with equal numeric values ruled out and an inactive row present
- WHEN the reader loads `sexo`
- THEN the inactive row is excluded and valid rows sort by numeric value, `key`, then `id`

#### Scenario: Invalid catalog data is diagnosed

- GIVEN a `sexo` row is null, unknown, noncanonical such as `"01"`, or duplicates another value
- WHEN the reader validates the catalog
- THEN it rejects the catalog with a diagnosable failure
- AND it emits no partially decoded options or default value

#### Scenario: Empty or unavailable production catalog fails safely

- GIVEN no active `sexo` rows exist or the catalog cannot be loaded in a production route
- WHEN the route prepares form options
- THEN it exposes a safe failure state rather than demo or hardcoded options
- AND `estado` and `salud` remain non-editable event-derived values
