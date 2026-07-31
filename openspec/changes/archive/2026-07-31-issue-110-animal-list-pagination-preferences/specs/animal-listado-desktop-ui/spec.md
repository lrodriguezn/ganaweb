# Delta for Animal Listado Desktop UI

## ADDED Requirements

### Requirement: Presentational Pagination and Preference Controls

The UI MUST render route-supplied pagination, page-size, column-selector, reset, preference-warning, and retry models without owning URL, authorization, persistence, or request execution. It MUST keep `Código` and `Nombre` selected and immutable.

#### Scenario: Viewer changes presentation
- GIVEN supplied models for 25, 50, and 100 rows and registered columns
- WHEN the viewer changes page, size, or optional columns
- THEN the UI invokes the corresponding supplied callback.

#### Scenario: Mandatory columns cannot be removed
- GIVEN the column selector is open
- WHEN the viewer attempts to deselect `Código` or `Nombre`
- THEN both remain selected and the UI does not invoke removal.

#### Scenario: Retryable preference warning
- GIVEN preference loading or saving failed
- WHEN the UI renders the supplied warning model
- THEN it preserves the current table selection and invokes retry on request.

#### Scenario: Reset controls delegate
- GIVEN a non-default supplied selection
- WHEN the viewer activates reset
- THEN the UI invokes the supplied reset callback once.

## MODIFIED Requirements

### Requirement: Canonical Online Table Contract

The UI MUST consume #107 `AnimalListadoResponseDto`, render the effective supplied columns in canonical order, and recognize all 36 `columnId`/`responseKey` pairs without label-derived data. First visit, reset, or unavailable preferences MUST show 29 base columns. Nulls MUST display `-` or `Sin registrar`, never `null` or zero. The table MUST remain online-only; `Lugar compra` MUST NOT render.
(Previously: The UI always rendered 29 canonical default columns.)

#### Scenario: Canonical response renders
- GIVEN authorized #107 rows with populated and null fields
- WHEN `/fincas/$fincaId/animales` renders
- THEN it shows effective columns in canonical order with Spanish labels
- AND it presents null fields safely.

#### Scenario: Optional field awareness
- GIVEN a response includes all seven optional column fields
- WHEN the base table renders
- THEN all seven optional columns are recognized but hidden by default
- AND the 29 base columns remain visible.

## Rule Citations

- LA-040–043, LA-060–063, LA-080–091; PE-001–003.
