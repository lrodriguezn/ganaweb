# Delta for Animal Listado Desktop UI

## MODIFIED Requirements

### Requirement: Visual RBAC and Ficha Navigation

`Nuevo animal` MUST render only with `animales:crear`; `Exportar` only with `animales:ver` and `reportes:exportar`. When rendered, `Exportar` MUST be active and open the export dialog; it MUST NOT remain inert. Visual gates MUST NOT replace server authorization. A row click or Enter outside a control MUST navigate to its ficha; controls retain their action.
(Previously: `Exportar` rendered but was inert — no `onClick`, dialog, or download; #111 export execution was a non-goal.)

#### Scenario: Permission-gated actions
- GIVEN a viewer lacks create and export permissions
- WHEN the list renders
- THEN `Nuevo animal` and `Exportar` are absent
- AND the table remains usable.

#### Scenario: Exportar opens the export dialog
- GIVEN a user with `animales:ver` and `reportes:exportar`
- WHEN the user activates `Exportar`
- THEN the export dialog opens
- AND the list table and its filters remain in place.

#### Scenario: Keyboard row navigation
- GIVEN a visible row has focus
- WHEN the user presses Enter outside an embedded control
- THEN navigation opens that row's animal ficha.

## Rule Citations

- LA-RBAC-02/03 — create/export visual gates unchanged; `Exportar` is now active.
- LA-091 — row click/Enter navigates to the ficha, unchanged.
- PE-001/002/003 — visual gates do not replace server authorization.
