# Design: Benchmark issue #115 animal-list p95

## Technical Approach

Replace the incomplete v1 benchmark contract with `rf-anim-list-11-v2`, measuring the unchanged PostgreSQL `DrizzleAnimalListadoReadModel.listar` path. The runner resets an isolated PG17 target, seeds the exact v2 distribution, then produces version-bound LA-100/102/103 evidence for S01–S07. No endpoint, production SQL, schema, migration, or external page-size behavior changes.

## Architecture Decisions

| Decision | Options / tradeoff | Choice and rationale |
|---|---|---|
| Product-scale fixture | Retain 100k v1 / use supported scale | Seed A/B/C exactly 1,000 each, 900 active each. This is the approved maximum and keeps every selectivity meaningful. |
| Deterministic identity | Source-only checksum / seeded-data checksum | Define canonical v2 cohorts, catalog/null/latest-weight distributions and hash their ordered canonical representation; manifest records the checksum. This detects a changed fixture, not merely changed source metadata. |
| S04 page size | Alter spec / widen public API | Preserve S04 `pageSize:10` only in the direct benchmark request adapter. The web parser remains 25/50/100, so public behavior is unchanged. |
| Evidence migration | Reuse or rename v1 output / segregate versions | Leave `rf-anim-list-11-v1-*` bytes and labels untouched as historical non-acceptance evidence. New runs use only `benchmark-runs/rf-anim-list-11-v2-*` and v2 manifests. |
| Measurement and plans | HTTP timing / read-model timing | Time 20 unrecorded warmups plus 100 sequential `hrtime.bigint()` read-model samples; exclude setup, plans, logs, and HTTP. Retain three `EXPLAIN (ANALYZE, BUFFERS)` plans and exactly-three-statement LA-103 evidence per successful invocation. |

## Data Flow

```
isolated PG17 -> reset/migrate -> v2 seed + ANALYZE -> lock
  -> S01–S07 warmups/samples -> result + statement assertions -> v2 immutable evidence
```

Every request uses `benchmark-reader`, `finca-A`, and `cols:["codigo","nombre"]`; results exclude B/C. Exact v2 matrix: S01 `p1/25 codigo asc` 900; S02 `p9/100 codigo asc` 900; S03 `p1/50`, `sexoKey=1,tatuado=true` 225; S04 `p2/10 fechaNacimiento desc`, `raza-01,2018-01-01..2021-12-31` 16; S05 `p3/25 pesoUltimoKg desc`, `500..509` 63; S06 `p1/25 codigo asc,q=AUREA NANDU 07` 9; S07 `p1/25 codigo asc,estadoKey=1` 90. Seed 10 catalog values, 20% nullable relations, 30% null latest weights, and equal-thirds 1/3/12 remaining weights.

## File Changes

| File | Action | Description |
|---|---|---|
| `packages/db/src/benchmark/animal-listado.ts` | Modify | Replace v1 constants, cohorts, seed, checksum, lock, and S01–S07 matrix with v2. |
| `packages/db/src/benchmark/run-animal-listado.ts` | Modify | Emit v2-only run paths/manifests; preserve immutable partial failure evidence and non-zero exits. |
| `packages/db/tests/animal-listado-benchmark.test.ts` | Modify | RED/GREEN v2 counts, checksum, exact inputs, output segregation, and immutable-v1 tests. |
| `packages/db/tests/animal-listado-postgres.test.ts` | Modify | Reuse PG/auth setup without weakening its 24 assertions. |
| `packages/aplicacion/src/puertos/animal-listado-port.ts` | Modify | Support the benchmark-only internal S04 request adapter while retaining route validation. |
| `packages/db/README.md`, `packages/db/package.json`, `.gitignore` | Modify | Document/run v2 and ignore v2 generated output without touching v1 receipts. |
| `openspec/changes/.../tasks.md`, `apply-progress.md` | Modify downstream | Replace stale v1 totals/version references; record v1 attempt as historical non-acceptance, not acceptance evidence. |

## Interfaces / Contracts

`BenchmarkScenario` remains readonly but v2-bound: `{ id, request, expectedRows, fixtureVersion, scenarioMatrixVersion }`. The manifest and failure report retain their existing required identity, environment, sample, plan, statement, completion, and artifact-path fields, with both versions `rf-anim-list-11-v2`. Temp-then-rename creates each unique artifact; finalized files are never overwritten. Any wrong version/checksum, altered matrix, environment/lock failure, missing plan/LA-103 assertion, insufficient/error sample, or p95 `>=400 ms` preserves available evidence, writes failure details, and exits non-zero.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | v2 canonical checksum/distributions, S01–S07, v1 immutability, percentile and failure contracts | Vitest RED then GREEN. |
| Integration | PG17 prerequisites, A isolation, 3 statements, three plans, immutable v2 paths | Disposable target; wrong locale/lock/version/checksum and partial-write RED cases. |
| Runtime | Seven v2 p95 results | Explicit isolated command; evidence review, never CI timing. |

## Threat Matrix

| Boundary | Applicability | Design response | Planned RED tests |
|---|---|---|---|
| Documentation-like paths | N/A — fixed package script accepts no path/classifier input | None | None |
| Git repository selection | N/A — no Git process | None | None |
| Commit state | N/A — no commit process | None | None |
| Push state | N/A — no push process | None | None |
| PR commands | N/A — no PR process | None | None |

## Migration / Rollout

No production migration. Update implementation tasks before resuming apply: v2 fixture/matrix first, v2 runner/evidence second, then a fresh contractual run. Retain old v1 directories unchanged; do not overwrite, move, relabel, or use them for v2 acceptance.

## Open Questions

None.
