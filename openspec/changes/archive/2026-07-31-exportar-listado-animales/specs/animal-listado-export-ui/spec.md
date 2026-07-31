# Delta for Animal Listado Export UI

## ADDED Requirements

### Requirement: Export Dialog

The export dialog MUST let the user choose scope (`Vista actual` / `Todas`) and format (XLSX / CSV / PDF) (LA-071, LA-074). When `scope=todas` AND `format=pdf`, it MUST warn that 36 columns may be hard to read, recommend Excel, and allow the user to continue or switch to Excel (LA-074).

#### Scenario: Dialog offers scope and format
- GIVEN the user opens the export dialog
- WHEN it renders
- THEN it offers `Vista actual` / `Todas` and XLSX / CSV / PDF.

#### Scenario: PDF 36-column warning
- GIVEN `scope=todas` and `format=pdf`
- WHEN the user proceeds
- THEN a warning recommends Excel
- AND the user can continue with PDF or switch to Excel.

### Requirement: Download Transport

A confirmed export MUST fetch the endpoint, receive the binary response as a blob, and trigger a client download (LA-070). The transport MUST NOT render the artifact inline or navigate away from the list.

#### Scenario: Successful export downloads a file
- GIVEN a valid authorized export request
- WHEN the server returns the artifact
- THEN the browser downloads the file and the list remains in place.

### Requirement: Export Error and Retry Contract

The export UI MUST map server outcomes to distinct, non-destructive states (LA-040, LA-041, LA-072, LA-076). A 400 MUST sanitize invalid parameters and keep the last valid table; a 403 MUST show access denied without data; a 413 MUST prompt to refine filters; a timeout MUST show a specific message. A 500 MUST keep the dialog open, show a non-destructive message, and offer `Reintentar` preserving the active filters, scope, and format.

#### Scenario: 400 keeps the last valid table
- GIVEN a valid table and an invalid export parameter
- WHEN the 400 is handled
- THEN invalid parameters are sanitized, the table remains, and a toast announces the correction.

#### Scenario: 403 denies access
- GIVEN a denied export request
- WHEN the 403 is handled
- THEN access-denied is shown with no data.

#### Scenario: 413 prompts to refine filters
- GIVEN an HTTP 413 response
- WHEN it is handled
- THEN the user is prompted to refine the filters.

#### Scenario: Timeout shows a specific message
- GIVEN a timeout signal
- WHEN it is handled
- THEN a specific timeout message is shown.

#### Scenario: 500 keeps the dialog and retries in place
- GIVEN an HTTP 500 with the dialog open and a chosen scope/format
- WHEN the user selects `Reintentar`
- THEN the dialog stays open and the retry preserves the active filters, scope, and format
- AND the table is not cleared and no empty download occurs.

### Requirement: Export Visual RBAC Gate

`Exportar` MUST render only when the user holds both `animales:ver` and `reportes:exportar` (LA-RBAC-03). Missing either permission MUST hide the entry point; this visual gate MUST NOT replace server authorization.

#### Scenario: Missing export permission hides Exportar
- GIVEN a user with `animales:ver` but without `reportes:exportar`
- WHEN the list renders
- THEN `Exportar` is absent.

#### Scenario: Missing view permission hides Exportar
- GIVEN a user without `animales:ver`
- WHEN the list renders
- THEN `Exportar` is absent.

## Rule Citations

- LA-071/074 — scope/format selection and PDF 36-column warning.
- LA-070 — server-generated artifact delivered as a download.
- LA-040/041 — 400 sanitization keeping the last valid table; 403 denial.
- LA-072 — 413 refine-filters prompt and specific timeout message.
- LA-076 — 500 keeps the dialog open with `Reintentar` preserving filters/scope/format.
- LA-RBAC-03 — visual gate requiring both permissions.
