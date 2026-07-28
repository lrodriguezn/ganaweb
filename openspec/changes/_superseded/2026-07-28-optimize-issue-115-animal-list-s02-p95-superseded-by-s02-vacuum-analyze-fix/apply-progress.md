# Apply Progress: S02 p95 Fix via Deferred CTE Lateral Join

## Implementation

`DrizzleAnimalListadoReadModel.listar` now pages animal IDs in `pagina` before
the catalog/self joins and `ultimo_peso` LATERAL join. The page CTE keeps
joined-field semantics by using correlated scalar expressions only when a
filter or sort needs a parent label, catalog label, or latest weight; it does
not carry the 13 LEFT JOINs or LATERAL join. Filtered and unfiltered counts
retain their original logical forms, and `lastStatementCount` remains three.

## Contractual Receipt

- Passing receipt: `packages/db/benchmark-runs/rf-anim-list-11-v2-1785182475584/`
- Environment: disposable PostgreSQL 17, UTC, `es_CO.UTF-8`, `public.unaccent`.
- S01–S07 p95 (ms): S01 348.476228, S02 344.530818, S03 267.676943,
  S04 205.232360, S05 293.612017, S06 188.994903, S07 271.662892.
- LA-103: three statements and zero per-row statements for every scenario.
- S02 plan: the CTE is separate from the catalog/self/LATERAL join and the
  downstream LATERAL executes 100 times for the 100 returned rows.
- Open requirement: on the 3,000-row fixture PostgreSQL selects
  `idx_animales_finca_activo` plus a sort for the CTE instead of the specified
  `idx_animales_finca_activo_codigo` ordered scan. The p95 target passes, but
  this exact plan-shape assertion remains for verification/remediation.
- INCLUDE decision: no migration. The CTE-only S02 p95 is below 400 ms.

The preceding failed environment receipt and S05 outlier receipt remain
immutable historical evidence:
`rf-anim-list-11-v2-1785182308213/` and
`rf-anim-list-11-v2-1785182344604/`.

## Corrective Apply — Ordered S02 CTE Plan

- Diagnosis: the initial CTE ordered by `a.codigo ASC, a.id ASC`. Although
  `uq_animales_finca_codigo` proves that `codigo` is unique within the fixed
  `finca_id`, the redundant inner `a.id` tie-break prevented
  `idx_animales_finca_activo_codigo` from satisfying the order. PostgreSQL
  therefore chose the smaller two-column index plus a bitmap heap scan and
  sort.
- Query correction: the CTE now omits the redundant `a.id` tie-break only for
  `codigo` sorting. The outer query retains `a.codigo, a.id`, so response order
  remains deterministic and byte-equivalent.
- Index correction: `0004_animal_list_page_index_covering.sql` recreates the
  required composite index with `INCLUDE (id)`. This is the minimum migration
  justified by LA-102: the CTE selects `id`, and the include enables the
  required ordered index-only scan. It was not added for the already-passing
  latency gate.
- Passing receipt: `packages/db/benchmark-runs/rf-anim-list-11-v2-1785183798775/`.
  S01–S07 p95 (ms): S01 264.643480, S02 250.844797, S03 252.727569,
  S04 156.616504, S05 370.715863, S06 223.601915, S07 283.149993.
  Every scenario is below 400 ms.
- S02 evidence: the `pagina` CTE uses `Index Only Scan` on
  `idx_animales_finca_activo_codigo` with no CTE sort; the deferred
  `ultimo_peso` lookup executes 100 times. `S02.statements.json` records
  LA-103 as three statements with zero per-row statements.
- Prior receipts, including the two corrective-attempt failure receipts, were
  not modified.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | `animal-listado-postgres.test.ts` | Integration | 22/24 pre-existing pass; 2 joined-filter failures exposed | Existing joined-filter RED | 25/25 | Parent filter + parent sort | Extracted page-only column maps |
| 1.2 | `animal-listado-postgres.test.ts` | Integration | Same baseline | Parent-label sort test written first, failed | 25/25 | Parent contains + sort | Shared page `WHERE`/`ORDER BY` |
| 1.3 | `animal-listado-postgres.test.ts` | Integration | Same baseline | Existing result/count contract | 25/25 | Filtered/unfiltered count assertions | None needed |
| 1.4 | `animal-listado-postgres.test.ts` | Integration | Same baseline | Approval coverage | 25/25 | Count and stability cases | No production change |
| 2.1–2.3 | `animal-listado-postgres.test.ts` | Integration | N/A (verification) | N/A | 25/25 | Filters, tie, pagination, statement count | None needed |
| 2.4 | `animal-listado-benchmark.test.ts` | Unit | N/A (verification) | N/A | 8/8; typecheck passed | Fixture and runner contracts | None needed |
| 3.1–3.5 | benchmark runner | Runtime | N/A (runtime evidence) | N/A | S01–S07 passed | Seven contractual scenarios | No production change |
| 4.1–4.3 | benchmark receipt | Runtime | N/A (conditional) | N/A | S02 p95 344.530818 ms | CTE-only gate evaluated | INCLUDE not warranted |
| 5.1–5.4 | OpenSpec artifacts | Documentation | N/A (structural) | N/A | Published | Receipt plus task checks | None needed |
| Corrective 5.4 | `animal-listado-benchmark.test.ts` | Unit + Runtime | 8/8 baseline | Plan assertion written first and failed before export | 9/9; isolated PG17 run passed | Ordered index-only and rejected bitmap+sort fixtures | Added plan assertion and minimal index migration |

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command | `pnpm --filter @ganaweb/db exec vitest run tests/animal-listado-postgres.test.ts` — 25/25 passed; `pnpm --filter @ganaweb/db exec vitest run tests/animal-listado-benchmark.test.ts` — 8/8 passed |
| Runtime harness | `BENCHMARK_DATABASE_URL=postgresql://postgres:postgres@localhost:5433/ganaweb_benchmark pnpm --filter @ganaweb/db benchmark:animal-listado` — exit 0, S01–S07 p95 all <400 ms |
| Rollback boundary | Revert `packages/db/src/animal-infrastructure.ts` and `packages/db/tests/animal-listado-postgres.test.ts`; the immutable receipt remains audit evidence but is unused by reverted code |

| Corrective focused test command | `pnpm --filter @ganaweb/db exec vitest run tests/animal-listado-benchmark.test.ts` — 9/9 passed; `pnpm --filter @ganaweb/db exec vitest run tests/animal-listado-postgres.test.ts` — 25/25 passed |
| Corrective runtime harness | `BENCHMARK_DATABASE_URL=postgresql://postgres:postgres@localhost:5433/ganaweb_benchmark pnpm --filter @ganaweb/db benchmark:animal-listado` — exit 0; fresh `rf-anim-list-11-v2-1785183798775/`, S01–S07 p95 <400 ms, LA-103=3, S02 ordered index-only scan |
| Corrective rollback boundary | Revert `packages/db/src/animal-infrastructure.ts`, `packages/db/src/benchmark/run-animal-listado.ts`, `packages/db/migrations/0004_animal_list_page_index_covering.sql`, its journal entry, and the matching tests; immutable receipts remain audit evidence only |

## Quality Checks

- `pnpm turbo typecheck` — exit 0.
- `pnpm biome ci .` — exit 0 (nine pre-existing warnings; no errors).
- Corrective: `pnpm turbo test` — exit 0; `pnpm turbo typecheck` — exit 0; `pnpm biome ci .` — exit 0 (nine warnings, no errors).
