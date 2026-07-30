# Delta for Animal Listado Desktop UI

## ADDED Requirements

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

#110 owns pagination controls, column selection, and preferences. #111 owns export execution, dialog, and download. The UI MUST NOT add export behavior, mutate `pageSize` or `cols`, or implement offline, multi-sort, or `Lugar compra` behavior.

## Rule Citations

- LA-001, LA-010–012, LA-020–021, LA-060–063, LA-080–091; PE-001–003.
