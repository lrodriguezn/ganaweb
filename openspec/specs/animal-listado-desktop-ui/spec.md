# Animal Listado Desktop UI Specification

## Purpose

Define #108's #107-backed table.

## Requirements

### Requirement: Canonical Online Table Contract

The UI MUST consume #107 `AnimalListadoResponseDto`, render the 29 default columns in canonical order, and recognize all 36 `columnId`/`responseKey` pairs without label-derived data. Nulls MUST display `-` or `Sin registrar`, never `null` or zero. The table MUST remain online-only; `Lugar compra` MUST NOT render.

#### Scenario: Canonical response renders
- GIVEN authorized #107 rows with populated and null fields
- WHEN `/fincas/$fincaId/animales` renders
- THEN it shows 29 canonical columns in order with Spanish labels
- AND it presents null fields safely.

#### Scenario: Optional field awareness
- GIVEN a response includes all seven optional column fields
- WHEN the default table renders
- THEN all seven optional columns are recognized but hidden by default
- AND the 29 canonical default columns remain visible.

### Requirement: Data and Failure States

The UI MUST retain headers with 36–40 px loading skeletons and distinguish finca-empty, no-results, 403, and 500/timeout. A 400 MUST preserve the last valid table, sanitize invalid `campo` URL parameters, reset page when applicable, and announce a toast. A 403 MUST clear data, state `No tienes acceso a esta finca`, and offer safe return; 500/timeout MUST offer `Reintentar`, never a silent empty table.

#### Scenario: Invalid query preserves data
- GIVEN a valid table and invalid 400 query fields
- WHEN the error is handled
- THEN the table remains and invalid URL values are removed
- AND a toast announces the correction.

#### Scenario: Empty and retriable states
- GIVEN empty-finca, no-results, or timeout responses
- WHEN each response renders
- THEN it shows each state; no-results reflects the server response
- AND timeout offers `Reintentar`.

#### Scenario: No-results filter integration boundary
- GIVEN #109 supplies filter state and a `Limpiar filtros` action to the list host
- WHEN #108 renders a no-results response
- THEN it MAY render the supplied action in the no-results state without owning its behavior
- AND #108 MUST NOT add filter controls or mutate general filter URL parameters.

### Requirement: Visual RBAC and Ficha Navigation

`Nuevo animal` MUST render only with `animales:crear`; `Exportar` only with `animales:ver` and `reportes:exportar`. Visual gates MUST NOT replace server authorization. A row click or Enter outside a control MUST navigate to its ficha; controls retain their action.

#### Scenario: Permission-gated actions
- GIVEN a viewer lacks create and export permissions
- WHEN the list renders
- THEN `Nuevo animal` and `Exportar` are absent
- AND the table remains usable.

#### Scenario: Keyboard row navigation
- GIVEN a visible row has focus
- WHEN the user presses Enter outside an embedded control
- THEN navigation opens that row's animal ficha.

### Requirement: Dense Accessible Token-Themed Layout

The header MUST be sticky; `Código` and `Nombre` MUST remain frozen during horizontal scroll. Rows and skeletons MUST be 36–40 px. Semantic markup, scoped headers, `aria-sort`, visible focus, labelled controls, and `aria-live` are REQUIRED. All ten appearances MUST meet AA contrast through CSS tokens only; `dark:` variants are prohibited.

#### Scenario: Scroll retains context
- GIVEN the 29-column table overflows
- WHEN the user scrolls horizontally and vertically
- THEN the header, `Código`, and `Nombre` remain visible
- AND the focused row/control remains visibly focused.

#### Scenario: Theme and assistive technology support
- GIVEN each of the five styles in claro and oscuro modes
- WHEN the table and its states render
- THEN labels and live announcements remain available with AA contrast
- AND no appearance-specific component variant is required.

### Requirement: Presentational Query Controls

The UI MUST render #109-supplied typed filter, global-search, active-chip, clear-all, and sortable-header models with callbacks, without owning URL/history, request execution, or correction policy. Controls MUST use supplied stable IDs/keys for mutations and human-readable labels for display. The UI MUST expose the route's effective server sort through `aria-sort` and MUST remain compatible with #108 loading, data, failure, and RBAC behavior.

#### Scenario: Controls delegate a typed mutation

- GIVEN the route supplies a raza option, its stable ID, label, and callback
- WHEN the user selects that option
- THEN the UI invokes the callback with the stable ID
- AND it displays the supplied label in the control and active chip.

#### Scenario: Clear-all delegates without owning state

- GIVEN active filters and a route-supplied clear-all callback
- WHEN the user activates `Limpiar todo`
- THEN the UI invokes that callback once
- AND it does not mutate URL parameters or execute a request itself.

#### Scenario: Effective default sort is accessible

- GIVEN the URL contains no `sort` parameter and the server response is `codigo:asc`
- WHEN the table renders headers
- THEN `Código` exposes ascending `aria-sort`
- AND the control can request the next sort transition through its callback.

## Non-Goals

This change MUST NOT implement #110 pagination controls, column selection, or preferences; #111 export execution, dialogs, or downloads. The UI MUST NOT add export behavior, mutate `pageSize` or `cols`, or implement offline, multi-sort, or `Lugar compra` behavior. Changes to #107, offline behavior, and `Lugar compra` are excluded.

## Rule Citations

- LA-RBAC-02/03, LA-040–043, LA-060–063, LA-080–091; PE-001–003; T-004; IA-003.
- LA-001, LA-010–012, LA-020–021 (added by #109).
