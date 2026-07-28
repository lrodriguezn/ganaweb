# Design: S02 p95 Fix via Deferred CTE Lateral Join

## Technical Approach

Keep the deferred-join CTE in `DrizzleAnimalListadoReadModel.listar`: page only `animales.id`, then attach the unchanged catalog/self joins and `ultimo_peso` LATERAL for the returned rows. This retains the three-statement flow and reduces S02's LATERAL executions from 900 candidates to 100 rows. No HTTP, DTO, filter, sort, mapping, or count contract changes are permitted.

## Architecture Decisions

| Decision | Choice | Alternative | Rationale |
|---|---|---|---|
| CTE shape | Raw one-statement `WITH pagina AS (SELECT a.id ...)` then `JOIN animales a` and `animalListadoJoins` | Carry `a.*`, duplicate joins, or add statements | Keeps the page narrow, preserves existing SQL style, and maintains LA-103 = 3. |
| Counts and contracts | Keep filtered-count logically equivalent and unfiltered-count verbatim; reuse predicate/sort maps and `mapAnimalListadoDbRow` | Refactor counts or interfaces | Preserves S01–S07 output, 36-field DTO, grammar, and endpoint behavior. |
| Covering index | Authorize `idx_animales_finca_activo_codigo INCLUDE (id)` through `0004_animal_list_page_index_covering.sql` for either CTE-only S02 p95 >=400 ms **or** mandatory LA-102 ordered index-only evidence | Latency-only authorization; broader indexes | The CTE selects `id`; this smallest index supports the required ordered index-only plan without external drift. |
| Evidence | Make receipt completeness an acceptance gate | Timing-only receipt | Performance claims require reproducible behavior, plan, migration, and immutability proof. |

## Data Flow

```text
request → predicates / page predicates / order (unchanged)
        → pagina: ids + LIMIT/OFFSET
        → page rows: ids → animales + 13 joins + LATERAL
        → filtered count → unfiltered count → DTO mapping
```

The page, filtered count, and unfiltered count remain exactly three statements. The outer `codigo, id` order remains deterministic; the LATERAL tie-break remains `fecha DESC, id DESC`.

## File Changes

| File | Action | Description |
|---|---|---|
| `packages/db/src/animal-infrastructure.ts` | Modify | Preserve deferred CTE, joins, counts, and mapping boundaries. |
| `packages/db/migrations/0004_animal_list_page_index_covering.sql` | Existing / apply | Recreate the named composite index with `INCLUDE (id)` when either authorization path applies. |
| `packages/db/src/benchmark/run-animal-listado.ts` and benchmark tests | Modify | Emit and validate complete acceptance evidence. |
| `packages/db/benchmark-runs/rf-anim-list-11-v2-*/` | Create | Immutable fresh acceptance receipt; never edit historical receipts. |

## Interfaces / Contracts

No public contract changes. `pagina` exposes only `id`; `BenchmarkAnimalListadoReadRequest`, filter grammar, sort matrix, endpoint validation, `mapAnimalListadoDbRow`, and the 36-field response stay unchanged.

## Testing Strategy

| Layer | What to test | Acceptance evidence |
|---|---|---|
| Integration | S01–S07 deterministic DTOs and `total`/`totalSinFiltro`; tie, filters, stable order | Store prior/current canonical DTO and count hashes or deterministic comparison records for every S01–S07. |
| Runtime | Isolated PG17 benchmark | Record S01–S07 p95 <400 ms and LA-103 (`3` statements, `0` per-row). |
| Plan/migration | S02 CTE shape | Assert named `Index Only Scan` on `idx_animales_finca_activo_codigo`, no inner `pagina` sort, 100 LATERAL loops, and recorded application of `0004_animal_list_page_index_covering.sql`. |
| Receipt integrity | Historical evidence | Store before/after checksums for every prior receipt and fail if any differs. |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

The CTE requires no migration. If either authorization path applies, apply `0004_animal_list_page_index_covering.sql`, record it in applied-migration evidence, then generate a new receipt. Roll back code and migration separately; historical receipts remain immutable audit artifacts.

## Open Questions

None.
