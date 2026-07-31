# Delta for Animal Listado Export Server

## ADDED Requirements

### Requirement: Server-Side Full-Set Export Generation

The export endpoint `GET /api/fincas/{fincaId}/animales/exportar` MUST generate Excel (XLSX), CSV, and landscape PDF entirely on the server (LA-070). It MUST export the complete filtered set — not a single page — applying the same filters and order as the list endpoint (LA-071). Generation MUST be online-only; no offline path is provided.

#### Scenario: Full filtered set exceeds the visible page
- GIVEN a list with `total=40` and `pageSize=25`
- WHEN the export is requested with the same filters
- THEN the artifact contains all 40 rows
- AND no row outside the filter is included.

#### Scenario: Filters and order are preserved
- GIVEN the list is filtered and sorted (`sort=codigo:asc`, `f.sexoKey=in:1`)
- WHEN the export is requested with the same query
- THEN the artifact rows match the filtered set in the same order.

### Requirement: Export Scope and Column Rules

`scope=todas` MUST emit exactly the 36 canonical columns in ordinal order; `scope=vista` MUST emit the normalized effective `cols` from the list contract (LA-071). `Lugar compra` MUST NOT appear in any scope.

#### Scenario: Todas emits 36 columns
- GIVEN `scope=todas`
- WHEN the export is generated
- THEN the artifact has exactly 36 columns in canonical ordinal order.

#### Scenario: Vista actual respects normalized cols
- GIVEN `scope=vista` with normalized `cols=codigo,nombre,sexo,raza`
- WHEN the export is generated
- THEN the artifact has exactly those columns in that order.

### Requirement: Operational Limits From Config

The export MUST read `export_max_filas` and `export_timeout_segundos` from `config_parametros_finca`; no threshold MAY be hardcoded (LA-072). A result exceeding `export_max_filas` MUST return HTTP 413; generation exceeding `export_timeout_segundos` MUST return a timeout signal.

#### Scenario: Row overflow returns 413
- GIVEN `export_max_filas=50000` and a filtered set of more than 50000 rows
- WHEN the export is requested
- THEN the response is HTTP 413 and no artifact is produced.

#### Scenario: Generation timeout is signaled
- GIVEN generation exceeds `export_timeout_segundos=30`
- WHEN the export is requested
- THEN a timeout signal is returned instead of a partial artifact.

#### Scenario: Limits are config-driven
- GIVEN the seeded `config_parametros_finca` values change
- WHEN the export enforces limits
- THEN it uses the configured values, not hardcoded thresholds.

### Requirement: Spreadsheet Injection Neutralization

Cells beginning with `=`, `+`, `-`, `@`, tab, or CR MUST be neutralized in CSV and forced to text in XLSX (LA-073). Neutralization MUST apply across all filter grammars and every exported column.

#### Scenario: Formula is not executable in CSV
- GIVEN a cell value `=CMD()`
- WHEN the CSV is generated
- THEN the cell is neutralized so it is not executed as a formula.

#### Scenario: Formula is forced to text in XLSX
- GIVEN a cell value `=CMD()`
- WHEN the XLSX is generated
- THEN the cell is stored as text and is not executable.

#### Scenario: All dangerous prefixes are covered
- GIVEN values starting with `=`, `+`, `-`, `@`, tab, and CR
- WHEN CSV and XLSX are generated
- THEN every such value is neutralized in both formats.

### Requirement: RBAC Re-Validation and Finca Isolation

The export handler MUST re-validate `animales:ver` and `reportes:exportar` and per-finca membership (`usuarios_fincas`) on the server, fail-closed (LA-RBAC-04, LA-RBAC-05, LA-075). A missing permission or unauthorized finca MUST return 403 with no data; the visual gate is presentation only.

#### Scenario: Missing export permission is denied
- GIVEN a caller without `reportes:exportar`
- WHEN the export is requested
- THEN the response is 403 and no data is produced.

#### Scenario: Foreign finca is isolated
- GIVEN a caller not belonging to the requested `fincaId`
- WHEN the export is requested
- THEN the response is 403 and no other finca's data is returned.

### Requirement: Export Error Contract

The handler MUST return `ApiErrorDto` for 400/403/500 with a `requestId` and MUST NOT leak driver or stack detail (LA-043). An invalid parameter MUST return 400 identifying the offending `campo` (LA-040); a denied request MUST return 403 without data (LA-041).

#### Scenario: Invalid parameter returns 400 with campo
- GIVEN a request with an invalid `format` or `cols` value
- WHEN the export is requested
- THEN the response is 400 with an `ApiErrorDto` naming the `campo`.

#### Scenario: Server failure is sanitized
- GIVEN an unexpected generation failure
- WHEN the export is requested
- THEN the response is 500 with an `ApiErrorDto` carrying a `requestId` and no driver detail.

## Rule Citations

- LA-070/071 — server-side generation of the full filtered set with scope/column rules.
- LA-072 — config-driven row limit (413) and timeout signal.
- LA-073 — CSV neutralization and XLSX text-forcing.
- LA-RBAC-04/05, LA-075 — server re-validation and per-finca isolation, fail-closed.
- LA-040/041/043 — 400 sanitization, 403 denial, sanitized `ApiErrorDto`.
- PE-001/002/003 — permission gating and per-finca resolution.
