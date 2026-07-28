# Tasks: Benchmark issue #115 animal-list p95

> v1 foundation tests and `rf-anim-list-11-v1-*` receipts remain verified historical non-acceptance evidence. No v2 task is complete until v2 tests and v2 evidence exist.

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 430–600 incremental authored lines |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | v2 fixture/contracts → runner/plans → PG17 receipt/publication |
| Delivery strategy | exception-ok |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | v2 fixture and matrix contracts | Single PR / commit 1 | `pnpm --filter @ganaweb/db exec vitest run tests/animal-listado-benchmark.test.ts` | N/A: no timing claim | benchmark fixture, port adapter, tests |
| 2 | v2 runner, plans, failure receipts | Single PR / commit 2 | same focused Vitest command | disposable PG17 dry run | runner and v2 receipt helpers |
| 3 | contractual v2 evidence | Single PR / commit 3 | focused Vitest + `pnpm --filter @ganaweb/db typecheck` | `BENCHMARK_DATABASE_URL=… pnpm --filter @ganaweb/db benchmark:animal-listado` | v2 run directory and publication docs |

## Phase 1: V2 Fixture and Contract RED/GREEN

- [x] 1.1 RED: update `packages/db/tests/animal-listado-benchmark.test.ts` for `rf-anim-list-11-v2`: A/B/C 1,000, 900 active, catalog/null/weight distributions, checksum, and A-only isolation.
- [x] 1.2 GREEN: replace v1 seed/cohorts/checksum in `packages/db/src/benchmark/animal-listado.ts`; retain all `packages/db/benchmark-runs/rf-anim-list-11-v1-*` bytes and labels unchanged.
- [x] 1.3 RED: assert exact v2 S01–S07 requests/totals: 900, 900, 225, 16, 63, 9, 90; reject altered matrix inputs and wrong fixture identity.
- [x] 1.4 GREEN: expose v2 scenarios and benchmark-only S04 `pageSize:10` adapter in `packages/aplicacion/src/puertos/animal-listado-port.ts` without relaxing route validation.

## Phase 2: V2 Runner, Plans, and Failure Safety

- [x] 2.1 RED: add v2 tests for 20 warmups, 100 samples, nearest-rank percentiles, p95 `<400`, wrong locale/lock/checksum, and immutable partial failure.
- [x] 2.2 GREEN: update `packages/db/src/benchmark/run-animal-listado.ts` to reset/analyze v2 PG17 data, time only `listar`, and assert totals plus exactly three statements.
- [x] 2.3 RED: require missing/invalid page, filtered-count, or unfiltered-count `EXPLAIN (ANALYZE, BUFFERS)` evidence to fail LA-102/103 with preserved paths.
- [ ] 2.4 GREEN: write v2-only immutable manifests, samples, summaries, three plans per scenario, LA-103 records, and complete failure receipts.

## Phase 3: Contractual Rerun and Publication

- [x] 3.1 Update `packages/db/package.json`, `packages/db/README.md`, `.gitignore`, and `apply-progress.md` for v2 commands/output; record v1 only as historical non-acceptance.
- [x] 3.2 Run focused v2 Vitest, PostgreSQL safety tests, and typecheck; fix only benchmark tooling, never production query/index behavior.
- [ ] 3.3 Rerun all S01–S07 on isolated PG17; publish the v2 receipt with 700 samples, percentiles, 21 plans, LA-103 records, environment/checksum, and explicit pass/failure status.
