# Animal Listado Server Contract Specification

## Purpose

Defines the server-side contract for the animal list endpoint: filter grammar validation, the read-row mapping that converts epoch-second date columns to ISO strings, and the predicate builder that emits safe SQL for `drange` and `bool` filters against typed columns.

## Requirements

### Requirement: Strict ISO Date Validation

`isIsoDate(value)` MUST accept only calendar-valid `YYYY-MM-DD` dates. It MUST reject impossible dates (Feb 31, Apr 31, non-leap Feb 29, month 13, day 0/32) and MUST accept valid dates including leap-year Feb 29.

#### Scenario: Impossible calendar date is rejected

- GIVEN a value `"2026-02-31"`
- WHEN `isIsoDate` is called
- THEN it returns `false`.

#### Scenario: Non-leap February 29 is rejected

- GIVEN a value `"2026-02-29"` (2026 is not a leap year)
- WHEN `isIsoDate` is called
- THEN it returns `false`.

#### Scenario: Leap-year February 29 is accepted

- GIVEN a value `"2024-02-29"`
- WHEN `isIsoDate` is called
- THEN it returns `true`.

### Requirement: Filter Grammar Validation Rejects Bad Input

`isValidFilterValue(grammar, value)` MUST enforce grammar rules: `drange` requires two comma-separated ISO dates, `bool` requires `"true"` or `"false"`. The HTTP handler MUST return 400 when a filter fails validation, without invoking the read model.

#### Scenario: drange with impossible date is rejected at HTTP layer

- GIVEN a request with `f.fechaNacimiento=drange:2026-02-31,2026-03-15`
- WHEN the HTTP handler processes it
- THEN it returns 400 without executing the read model.

#### Scenario: drange with valid dates is accepted

- GIVEN a request with `f.fechaNacimiento=drange:2021-03-12,2021-03-20`
- WHEN the HTTP handler processes it
- THEN it returns 200 and the parsed query contains a valid `drange` filter.

#### Scenario: bool grammar accepts only true/false

- GIVEN a value `"yes"`
- WHEN `isValidFilterValue("bool", "yes")` is called
- THEN it returns `false`.

### Requirement: Read-Row Mapping Converts Epoch Seconds to ISO Date

`mapAnimalListadoDbRow` MUST map integer epoch-second columns (`fecha_nacimiento`, `fecha_compra`) to ISO `YYYY-MM-DD` strings, and MUST compute `edadAnios` from `fechaNacimiento`.

#### Scenario: Epoch seconds map to ISO date

- GIVEN an epoch value `1615507200` (2021-03-12T00:00:00Z)
- WHEN the read model maps the row
- THEN `fechaNacimiento` is `"2021-03-12"`.

#### Scenario: Null epoch maps to null

- GIVEN `fecha_nacimiento` is `NULL` in the DB
- WHEN the read model maps the row
- THEN `fechaNacimiento` is `null` and `edadAnios` is `null`.

#### Scenario: edadAnios is computed from fechaNacimiento

- GIVEN an animal with `fecha_nacimiento` set to an epoch corresponding to 5 years before today
- WHEN the read model maps the row
- THEN `edadAnios` is an integer matching the year delta.

### Requirement: bool Filter Coerces to 0/1 for Integer Columns

`buildAnimalListadoPredicates` MUST coerce `bool` filter values to integer `1` or `0` so the comparison works against integer columns (`es_de_monta`) AND against native boolean columns (`tatuado`, `herrado`, `descornado`).

#### Scenario: bool filter on integer column

- GIVEN a filter `esDeMonta=bool:true`
- WHEN building the SQL predicate
- THEN the SQL compares `es_de_monta = 1` (integer, not boolean).

#### Scenario: bool filter on native boolean column still works

- GIVEN a filter `tatuado=bool:false`
- WHEN building the SQL predicate
- THEN the SQL compares `tatuado = 0` (PG coerces 0 to false).

### Requirement: drange Filter Converts ISO Dates to Epoch Seconds

`buildAnimalListadoPredicates` MUST convert `drange` ISO date boundaries to epoch seconds before emitting the SQL `BETWEEN` clause against integer epoch columns (`fecha_nacimiento`, `fecha_compra`).

#### Scenario: drange emits integer BETWEEN against epoch column

- GIVEN a filter `fechaNacimiento=drange:2021-03-12,2021-03-20`
- WHEN building the SQL predicate
- THEN the SQL compares `fecha_nacimiento BETWEEN 1615507200 AND 1616198400` (epoch seconds, not strings).

### Requirement: Session Resolution Executes Inside the Error Boundary

The animal list HTTP handler MUST resolve the caller identity (`getUsuarioId()`) INSIDE the try/catch error boundary, not before it. Any failure during session or authorization resolution MUST be caught and mapped to a sanitized `500` `ApiErrorDto` carrying a `requestId`, and MUST trigger `reportError`. The handler MUST NOT leak driver errors, stack traces, or PostgreSQL detail to the client.

Authorization MUST remain fail-closed: a session-resolution or authorization throw MUST deny access and MUST NOT produce a `200` response or any data access. Permission gating and per-finca resolution are unchanged (PE-001, PE-002, PE-003); only the catch location moves.

#### Scenario: Degraded session resolution returns sanitized 500

- GIVEN PostgreSQL is degraded and `getUsuarioId()` throws during session resolution
- WHEN the HTTP handler processes a list request
- THEN it returns `500` with an `ApiErrorDto` containing a `requestId`
- AND `reportError` is called and no driver/stack detail is exposed.

#### Scenario: Fail-closed — no 200 without an authorized session

- GIVEN session resolution throws before an authorized session is established
- WHEN the HTTP handler processes a list request
- THEN it MUST NOT return `200` and MUST NOT read or return animal data.

#### Scenario: Authorization denial remains fail-closed

- GIVEN a valid session whose authorization for the requested finca is denied
- WHEN the HTTP handler processes a list request
- THEN it denies access and MUST NOT return `200` with another finca's data.

#### Scenario: Healthy session is unaffected

- GIVEN a valid, authorized session
- WHEN the HTTP handler processes a well-formed list request
- THEN it returns `200` with the caller's per-finca rows as before.

## Rule Citations

- D11 — Seed Subset Extent: zero `animales` rows seeded; date columns are nullable in the schema.
- RN-001 — `uq_animales_finca_codigo` unchanged; this change touches only filter grammar and read-row mapping.
- PE-001 / PE-002 / PE-003 — permission gating and per-finca resolution unchanged; only the catch location moves.
