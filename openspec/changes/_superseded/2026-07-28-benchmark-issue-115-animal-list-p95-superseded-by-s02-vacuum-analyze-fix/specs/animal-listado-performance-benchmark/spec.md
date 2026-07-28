# Animal Listado Performance Benchmark Specification

## Purpose

§11 PostgreSQL evidence; no behavior change.

## Requirements

### Requirement: Deterministic Fixture

The benchmark MUST reset isolated PostgreSQL 17 and load `rf-anim-list-11-v2`: 3,000 animals in A/B/C (1,000 each), 90% active per finca, 10 catalog values, 20% nullable relations, 30% null latest weights, and remaining weights 1/3/12 in equal thirds. A MUST have 900 active rows, including 90 (10%) `estadoAnimalKey=1`, requested only with supported `estadoKey`. Fixture values MUST be deterministic; A requests MUST NOT return B/C rows. Migrations, `public.unaccent`, UTC, `es_CO.UTF-8`, refreshed statistics, and exclusive traffic are required.

#### Scenario: Fixture is reproducible

- GIVEN a reset target and `rf-anim-list-11-v2`
- WHEN the fixture is loaded twice
- THEN counts, S07's 90 rows, and checksums MUST match.

#### Scenario: Finca isolation is retained

- GIVEN a three-finca fixture and an A request
- WHEN any matrix scenario executes
- THEN results and totals MUST exclude B/C rows.

### Requirement: Authoritative §11 Scenario Matrix

The benchmark MUST execute each authoritative §11 row through the read model using `usuarioId:"benchmark-reader"`, `fincaId:"finca-A"`, and `cols:["codigo","nombre"]`.

| ID | Request | Expected rows |
|---|---|---:|
| S01 | `page:1,pageSize:25,sort:"codigo:asc",q:null,filters:[]` | 900 |
| S02 | `page:9,pageSize:100,sort:"codigo:asc",q:null,filters:[]` | 900 |
| S03 | `page:1,pageSize:50,sort:"codigo:asc",filters:[sexoKey in "1",tatuado bool "true"]` | 225 (25%) |
| S04 | `page:2,pageSize:10,sort:"fechaNacimiento:desc",filters:[razaId in "raza-01",fechaNacimiento drange "2018-01-01,2021-12-31"]` | 16 (1.78%) |
| S05 | `page:3,pageSize:25,sort:"pesoUltimoKg:desc",filters:[pesoUltimoKg range "500,509"]` | 63 (7%) |
| S06 | `page:1,pageSize:25,sort:"codigo:asc",q:"AUREA NANDU 07",filters:[]` | 9 (1%) |
| S07 | `page:1,pageSize:25,sort:"codigo:asc",q:null,filters:[estadoKey in "1"]` | 90 (10%) |

#### Scenario: Matrix coverage

- GIVEN the declared fixture
- WHEN a run executes
- THEN it MUST emit S01–S07 once each.

#### Scenario: Matrix input is altered

- GIVEN an altered ID, filter, sort, page, or size
- WHEN submitted as contractual evidence
- THEN the run MUST fail.

### Requirement: Versioned Evidence Compatibility

Fixture and scenario identities MUST be `rf-anim-list-11-v2`; differing bytes/counts MUST NOT qualify. The 100,000-row `rf-anim-list-11-v1` is historical non-acceptance evidence only and MUST NEVER satisfy v2.

#### Scenario: Historical evidence is encountered

- GIVEN `rf-anim-list-11-v1` 100,000-row evidence
- WHEN reviewed for v2
- THEN it MUST be historical non-acceptance evidence only.

#### Scenario: Evidence matches v2

- GIVEN v2 identities and matching bytes/counts
- WHEN reviewed
- THEN it MAY be evaluated against §11 criteria.

### Requirement: Contractual Measurement and Percentiles

Each scenario MUST use 20 unrecorded warmups and 100 sequential monotonic-clock samples of page, filtered-count, and unfiltered-count read-model work; setup, plans, logging, and HTTP are excluded. p50/p95/p99 MUST use ascending nearest-rank 50/95/99. Every p95 MUST be <400 ms.

#### Scenario: Contractual timing passes

- GIVEN 100 valid samples
- WHEN p95 is 399.99 ms
- THEN it MUST pass LA-100.

#### Scenario: Threshold or sample validity fails

- GIVEN fewer samples, an error, or p95 ≥400 ms
- WHEN summarized
- THEN it MUST fail LA-100.

### Requirement: Plan and Statement Evidence

The runner MUST retain `EXPLAIN (ANALYZE, BUFFERS)` for page and both counts: SQL, timings, rows, buffers, and scan/index nodes. It MUST prove LA-103: exactly three statements per successful invocation, with no per-row statements.

#### Scenario: Evidence proves query shape

- GIVEN a completed scenario
- WHEN evidence is inspected
- THEN it MUST contain three plans and a three-statement LA-103 record.

### Requirement: Reproducible Output and Failure Reporting

Each run MUST immutably write samples, percentiles, checksum, manifests, plans, and statement evidence. HTTP timing MAY be supplemental but MUST NOT affect contractual percentiles. Failure reports MUST identify run, scenario, criterion, expected/observed values, error, and paths; preserve evidence; and return non-zero.

#### Scenario: Optional HTTP timing is present

- GIVEN supplemental HTTP measurements
- WHEN written
- THEN they MUST be non-contractual and excluded from LA-100.

#### Scenario: Run fails partway through

- GIVEN failure after measurement begins
- WHEN the run exits
- THEN it MUST preserve artifacts and emit a failure report.

## Rule Citations

- §11; LA-100/102/103; PE-001–003.
