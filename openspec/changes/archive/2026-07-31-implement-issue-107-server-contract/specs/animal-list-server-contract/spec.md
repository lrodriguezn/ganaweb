# Animal List Server Contract Specification

## Purpose

Define the PostgreSQL-only, online `GET /api/fincas/{fincaId}/animales` contract for issue #107. UI, preferences, exports, and SQLite/WASM parity are excluded.

## Requirements

### Requirement: Canonical DTO and derived values (LA-001–LA-005)

The endpoint MUST return `AnimalListadoResponseDto` with `data`, `page`, `pageSize` (25|50|100), `total`, `totalSinFiltro`, `sort`, and normalized `cols`. Each row MUST include `id` plus these 36 canonical matrix fields: `codigo`, `nombre`, `sexo`, `raza`, `fechaNacimiento`, `edadAnios`, `color`, `origen`, `codigoMadre`, `nombreMadre`, `codigoPadre`, `nombrePadre`, `propietario`, `hierro`, `numeroPezones`, `calidad`, `codigoArete`, `fechaCompra`, `precioCompra`, `pesoCompraKg`, `tatuado`, `herrado`, `descornado`, `codigoRfid`, `potrero`, `sector`, `lote`, `grupo`, `comentarios`, `salud`, `categoriaReproductiva`, `estado`, `pesoUltimo`, `codigoQr`, `esDeMonta`, and `tipoExplotacion`. Relations MUST use stable `{id|key,label}` values; absent optional values MUST be `null`, dates ISO 8601, and booleans non-null.

Age MUST be derived at request time to one decimal. Latest weight MUST select greatest weight date then greatest ID. `tipo_ingreso_id` MUST resolve through `config_key_values.tipo_ingreso`; unknown IDs MUST return `{id,label:"Desconocido (<id>)"}` and null MUST remain null.

#### Scenario: Complete nullable row
- GIVEN an authorized finca has an animal with missing optional relations and no weights
- WHEN its page is requested
- THEN all 36 fields are present with contractual nullability and `pesoUltimo` is null.

#### Scenario: Deterministic derivations
- GIVEN two weights share the latest date and an unknown `tipo_ingreso_id`
- WHEN the animal is returned
- THEN `pesoUltimo` uses the greatest weight ID and `origen` uses the required fallback label.

### Requirement: Query grammar, filtering, ordering, and counters (LA-010–LA-021, LA-050)

The endpoint MUST accept one-based `page` (default 1), `pageSize` (default 25), `sort=<matrix sortKey>:asc|desc`, `q`, `f.<matrix filterKey>`, and `cols`. Filters MUST accept only matrix-declared `contains`, `in`, `range`, `drange`, or `bool` grammar; filters combine with AND and `q` OR-matches `codigo`, `nombre`, `codigo_arete`, and `codigo_rfid`. PostgreSQL `q` MUST match case and Spanish accents bidirectionally across all four fields. Every matrix `contains` field—`codigo`, `nombre`, `codigoMadre`, `nombreMadre`, `codigoPadre`, `nombrePadre`, `codigoArete`, `codigoRfid`, `comentarios`, and `codigoQr`—MUST provide the same case/accent behavior. Request values MUST remain bound parameters, and `%`, `_`, `!`, and SQL-like text MUST retain literal rather than wildcard or executable semantics. `cols` MUST contain unique valid `columnId`s, MUST NOT change row shape, and MUST be echoed normalized. Default sort MUST be `codigo:asc`; every order MUST add `id:asc`. `total` MUST use the same normalized predicate as page rows and `totalSinFiltro` MUST remain finca-wide and unfiltered.

#### Scenario: Filtered stable page
- GIVEN matching animals share a selected sort value
- WHEN page 1 and page 2 are requested with identical query parameters
- THEN rows do not overlap or reorder, and both counters have their contractual meaning.

#### Scenario: Bidirectional global-search equivalence
- GIVEN each of the four `q` fields contains representative accented or unaccented Spanish text
- WHEN accented, unaccented, and case-varied equivalent values are requested in both storage/query directions
- THEN each value returns its matching row through the contractual OR search.

#### Scenario: Bidirectional contains equivalence
- GIVEN each of the ten validated `contains` fields has accented or unaccented Spanish text
- WHEN accented, unaccented, and case-varied equivalent filter values are requested in both storage/query directions
- THEN the selected field matches through the contractual AND filter grammar.

#### Scenario: Search literals remain safe
- GIVEN `q` or `contains` includes `%`, `_`, `!`, or SQL-like payload text
- WHEN the request is executed
- THEN the value is bound and escaped as literal text and cannot broaden or execute the query.

#### Scenario: Accent-filtered pages remain isolated and stable
- GIVEN 26 equivalent matches with tied sort values in finca A and a matching row in finca B
- WHEN repeated page 1 and page 2 requests use page size 25 and the same normalized query
- THEN page IDs are stable in `id:asc` order, their union contains every expected finca-A row exactly once, the finca-B row is absent, `total` is 26, and `totalSinFiltro` retains its finca-wide meaning.

#### Scenario: Invalid query
- GIVEN `pageSize=30`, repeated `cols`, or an unsupported `f.*`/sort key
- WHEN the endpoint is requested
- THEN it returns the contractual 400 error without executing a listing response.

### Requirement: Server authorization and finca isolation (LA-RBAC-01, LA-RBAC-04, LA-RBAC-05)

The endpoint MUST validate an authenticated user's active `usuarios_fincas` membership for `fincaId` and `animales:ver` before any listing query. It MUST return 403 without data or finca-existence disclosure when either check fails.

#### Scenario: Missing permission
- GIVEN an active finca member lacks `animales:ver`
- WHEN the endpoint is requested
- THEN it returns 403 and no rows or counters.

#### Scenario: Cross-farm request
- GIVEN a user is authorized only for finca A
- WHEN the user requests finca B
- THEN it returns the same 403 contract without revealing finca B.

### Requirement: Contractual failures and PostgreSQL read execution (LA-040, LA-043, LA-103)

All 400, 403, 500, and listing-timeout responses MUST be `ApiErrorDto` with `error`, nullable `campo`, `motivo`, and `requestId`. The paginated PostgreSQL read MUST resolve joins, catalogs, derivations, filters, ordering, and counts without per-row queries (N+1). SQLite/WASM support and parity MUST NOT be claimed or required.

#### Scenario: Server failure
- GIVEN the PostgreSQL listing read fails or times out
- WHEN the endpoint handles the failure
- THEN it returns a 500 error envelope with a request ID.

#### Scenario: No N+1 listing
- GIVEN a page containing multiple animals with related catalogs and weights
- WHEN the page is read under query instrumentation
- THEN no additional query is issued per returned animal.

### Requirement: PostgreSQL performance acceptance (LA-100)

The finalized endpoint MUST demonstrate p95 below 400 ms for the exact agreed RF-ANIM-LIST §11 benchmark dataset and query scenarios. If the required PostgreSQL integration or benchmark infrastructure is unavailable, verification MUST report a blocker/deviation; it MUST NOT weaken this criterion or expand scope.

#### Scenario: Exact benchmark evidence
- GIVEN the agreed PostgreSQL fixture and §11 scenarios are available
- WHEN repeatable measurements run against the finalized query
- THEN recorded p95 is below 400 ms for every agreed scenario.

#### Scenario: Missing evidence infrastructure
- GIVEN the required fixture, PostgreSQL target, or measurement harness is unavailable
- WHEN acceptance evidence is attempted
- THEN verification reports the specific blocker/deviation and does not mark LA-100 satisfied.

### Requirement: PostgreSQL RED/GREEN accent-search evidence

Focused PostgreSQL integration evidence MUST demonstrate the same accent-equivalence, literal-safety, isolation, counter, and pagination cases failing under case-only predicates and passing under the corrected implementation. SQLite/WASM, UI, export, preferences, issue #112, and RF-ANIM-LIST §11 fixture creation MUST NOT substitute for this evidence.

#### Scenario: Accent-search evidence gate
- GIVEN the PostgreSQL integration environment is available
- WHEN controlled RED and GREEN runs execute the contractual accent-search scenarios
- THEN recorded output identifies failure under case-only predicates and success under the corrected qualified predicates.

#### Scenario: Missing PostgreSQL environment
- GIVEN PostgreSQL integration cannot run
- WHEN accent-search evidence is requested
- THEN verification reports a blocker and does not claim GREEN acceptance.
