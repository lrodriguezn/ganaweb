# Animal List Accent Search Specification

## Purpose

Define PostgreSQL-only, accent-insensitive listing search for RF-ANIM-LIST LA-010 without changing the #107 API contract.

## Requirements

### Requirement: Accent-insensitive contractual text search (LA-010, LA-011)

PostgreSQL `q` MUST case-fold and match accents bidirectionally across `codigo`, `nombre`, `codigo_arete`, and `codigo_rfid`. Every matrix field using `contains`—`codigo`, `nombre`, `codigoMadre`, `nombreMadre`, `codigoPadre`, `nombrePadre`, `codigoArete`, `codigoRfid`, `comentarios`, and `codigoQr`—MUST provide the same behavior. `q` MUST retain OR composition; filters MUST retain AND composition.

#### Scenario: Global-search fields are equivalent
- GIVEN each `q` field contains representative accented and unaccented Spanish text
- WHEN accented, unaccented, and case-varied `q` values are requested
- THEN each equivalent value returns its matching row through the contractual OR search.

#### Scenario: Contains fields are equivalent
- GIVEN every `contains` field has an accented value and an unaccented counterpart
- WHEN equivalent accented, unaccented, and case-varied `contains` values are requested
- THEN the selected field matches only according to its validated filter grammar.

#### Scenario: Search literals remain safe
- GIVEN `q` or `contains` includes `%`, `_`, the escape character, or SQL-like payload text
- WHEN it is submitted as a request value
- THEN it is bound safely and retains the existing literal wildcard/escape matching semantics.

### Requirement: Preserved list contract (LA-021, LA-050)

Accent normalization MUST NOT weaken finca isolation, authorization, ordering, pagination, counters, DTO shape, or error behavior. `total` MUST use the same normalized predicate as page rows; `totalSinFiltro` MUST remain finca-wide and unfiltered.

#### Scenario: Isolated, stable filtered pages
- GIVEN equivalent matches exist in two fincas and tied selected sort values in the authorized finca
- WHEN repeated page 1 and page 2 requests use the same accent-normalized query
- THEN no foreign-finca row, duplicate, omission, or ordering change occurs and `id:asc` resolves ties.

#### Scenario: Counters and contract are unchanged
- GIVEN a filtered request, an unfiltered request, and an invalid request
- WHEN each is executed with accent-normalized values where applicable
- THEN counters, DTO fields, and contractual errors equal their pre-remediation meanings.

### Requirement: PostgreSQL RED/GREEN proof

The change MUST provide focused PostgreSQL integration evidence that first demonstrates the specified accent cases fail (RED) and then pass (GREEN) against the corrected implementation. SQLite/WASM, UI, export, preferences, issue #112, and RF-ANIM-LIST §11 fixture creation MUST NOT substitute for this evidence.

#### Scenario: Evidence gate
- GIVEN the PostgreSQL integration environment is available
- WHEN RED and GREEN runs execute the equivalence, safety, isolation, counter, and pagination scenarios
- THEN recorded output identifies the RED failure and the GREEN pass for the same PostgreSQL contract.

#### Scenario: Missing PostgreSQL environment
- GIVEN PostgreSQL integration cannot run
- WHEN evidence is requested
- THEN verification reports a blocker and MUST NOT claim GREEN acceptance.
