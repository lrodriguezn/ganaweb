# Delta for animal-listado-server-contract

## Purpose

Restructure `DrizzleAnimalListadoReadModel.listar`'s pagination query into a deferred `pagina` CTE so LATERAL `ultimo_peso` fires only for fetched rows. The referenced benchmark spec owns LA-100 timing, generic plan capture, LA-103 statement evidence, and the S01–S07 matrix. This delta owns the concrete LA-102 acceptance contract: named-index usage, migration provenance, ordered index-only/no-sort evidence, behavioral equivalence, and receipt checksums.

## ADDED Requirements

### Requirement: Deferred Pagination via CTE Before Joins

`DrizzleAnimalListadoReadModel.listar` MUST paginate on `animales.id` via `WITH pagina AS (SELECT a.id ... LIMIT ... OFFSET ...)` BEFORE applying the 13 catalog LEFT JOINs, madre/padre self-joins, and the LATERAL `ultimo_peso` subquery. The main SELECT MUST re-join `animales a ON a.id = pagina.id`. The `pagina` CTE MUST NOT carry the 13 LEFT JOINs or the LATERAL subquery.

(Previously: the pagination query applied all 13 LEFT JOINs and the LATERAL against the candidate set, then ran `ORDER BY … LIMIT … OFFSET …` over the joined rows.)

#### Scenario: LATERAL `ultimo_peso` runs only for fetched page rows (S02)

- GIVEN the `rf-anim-list-11-v2` fixture on PG 17
- WHEN S02 (`page:9, pageSize:100, sort:"codigo:asc"`) executes
- THEN the LATERAL MUST execute for 100 rows, not 900 candidate rows.

#### Scenario: CTE scan uses the finca-activo-codigo index

- GIVEN `idx_animales_finca_activo_codigo` is migrated
- WHEN the CTE scan runs
- THEN the plan MUST show an index-ordered scan and MUST NOT include the 13 LEFT JOINs or the LATERAL subquery.

### Requirement: Three-Statement Contract Preserved (LA-103)

`listar` MUST continue to execute exactly three SQL statements per successful invocation: pagination, filtered-count, unfiltered-count. The CTE restructure MUST NOT add statements, per-row queries, or a separate count CTE. `readModel.lastStatementCount` MUST remain 3 for every matrix scenario.

#### Scenario: Statement count and per-row count are unchanged

- GIVEN any S01–S07 matrix scenario
- WHEN `lastStatementCount` and the captured statement trace are read
- THEN `lastStatementCount` MUST equal 3 and per-row statement count MUST be 0.

### Requirement: Filtered- and Unfiltered-Count Logical Equivalence

The filtered-count query MUST stay logically equivalent to its pre-CTE form: same `FROM animales a …` join graph, same `WHERE a.finca_id = $1 AND a.activo = 1 AND <predicate chain>`, same `count` row. The unfiltered-count query MUST remain `SELECT count(*)::int AS count FROM animales WHERE finca_id = $1 AND activo = 1`. Neither MUST wrap its work in the new `pagina` CTE. Generic plan capture is defined by the referenced benchmark spec; this delta defines the concrete LA-102 acceptance evidence.

#### Scenario: filtered- and unfiltered-count match the prior receipt

- GIVEN any matrix scenario, the prior v2 receipt, and `fincaId:"finca-A"`
- WHEN both count queries run
- THEN the filtered scalar MUST equal the prior receipt's `total` and the unfiltered SQL MUST be `SELECT count(*)::int AS count FROM animales WHERE finca_id = 'finca-A' AND activo = 1` (verbatim).

### Requirement: Byte-Identical 36-Field DTO Across S01–S07

The restructure MUST NOT alter the 36-field DTO from `mapAnimalListadoDbRow`. For every S01–S07 under `rf-anim-list-11-v2`, the page result (rows + `total` + `totalSinFiltro` + `page` + `pageSize` + `sort` + `cols`) MUST be byte-identical to the pre-optimization output. The LATERAL tie-breaker (`ORDER BY fecha DESC, id DESC LIMIT 1`) MUST be preserved verbatim inside the deferred join.

#### Scenario: S02 page result is byte-identical to the prior receipt

- GIVEN a fresh `rf-anim-list-11-v2` fixture and the prior v2 receipt
- WHEN S02 runs against the restructured read model
- THEN the DTO MUST match byte-for-byte (same 100 rows, `total = 900`, `totalSinFiltro = 900`).

#### Scenario: peso-fecha tie-breaker survives the deferral

- GIVEN the integration fixture's "greatest weight id on latest-date tie" row
- WHEN the LATERAL fires against the deferred page
- THEN `alpha.pesoUltimo` MUST equal `{ pesoKg: 425, fecha: "2026-01-01" }`.

#### Scenario: S04 filtered DTO is byte-identical

- GIVEN S04 filters (`razaId` + `fechaNacimiento` drange)
- WHEN the restructured page query runs
- THEN the 16 returned DTOs MUST match the pre-optimization 16 rows in field, value, and order.

### Requirement: Covering Index Authorization and Acceptance Evidence

LA-100 timing, generic plan capture, LA-103 statement evidence, and S01–S07 requirements are defined by the referenced benchmark spec. This delta defines LA-102 concretely and requires the minimal covering index `idx_animales_finca_activo_codigo INCLUDE (id)` to be added only in separately applied migration `0004_animal_list_page_index_covering.sql` when either CTE-only S02 p95 is ≥400 ms OR LA-102 needs an ordered index-only `pagina` CTE scan. An index-assisted acceptance receipt MUST record that migration as applied; MUST show an S02 ordered `Index Only Scan` using the named index with no inner `pagina` sort; MUST prove DTO and count equivalence with explicit prior/current payload hashes or deterministic comparison records; and MUST preserve historical receipt immutability with stored before/after checksums.

(Previously: an INCLUDE index was authorized only after CTE-only S02 p95 remained ≥400 ms.)

#### Scenario: LA-102 authorizes the minimal index despite passing latency

- GIVEN CTE-only S02 p95 is <400 ms but lacks the required ordered index-only plan
- WHEN `0004_animal_list_page_index_covering.sql` is applied
- THEN a fresh acceptance receipt MUST satisfy all index-assisted evidence.

#### Scenario: Latency failure remains an authorization path

- GIVEN CTE-only S02 p95 is ≥400 ms
- WHEN the minimal covering index is applied and rerun
- THEN the fresh receipt MUST satisfy the referenced benchmark requirements and this delta's index-assisted evidence.

#### Scenario: Receipt proves plan and behavioral equivalence

- GIVEN an index-assisted acceptance run
- WHEN its receipt is inspected
- THEN it MUST record migration application, the named no-sort index-only scan, and prior/current DTO and count comparisons.

#### Scenario: Incomplete or mutating evidence is rejected

- GIVEN a receipt lacks required evidence or historical before/after checksums differ
- WHEN reviewed for acceptance
- THEN it MUST fail and preserve the historical receipts.

### Requirement: No External Contract Drift

The restructure MUST NOT change the HTTP endpoint, route validation, the 36-field DTO schema, the filter grammar (`drange`, `bool`, `contains`, `in`, `eq`), the sort matrix, the catalog ports, or `mapAnimalListadoDbRow`. `buildAnimalListadoPredicates` and the sort resolver MUST be reused verbatim.

#### Scenario: Endpoint, filter grammar, and DTO are untouched

- GIVEN the read model after the restructure
- WHEN the HTTP handler, filter validator, predicate builder, sort resolver, and `mapAnimalListadoDbRow` are diffed against the pre-CTE baseline
- THEN they MUST be byte-identical (no new fields, no renamed keys, no grammar tokens added or removed).

## Rule Citations

- LA-100 timing, generic plan capture, LA-103 statement evidence, §11 percentiles, and S01–S07 matrix — referenced benchmark spec (not duplicated).
- Concrete LA-102 named-index, migration, no-sort, equivalence, and checksum acceptance evidence — this delta.
- This delta — named `idx_animales_finca_activo_codigo` index-only/no-sort `pagina` evidence plus migration, equivalence, and historical-checksum evidence.
- RN-001 — `uq_animales_finca_codigo` untouched.
