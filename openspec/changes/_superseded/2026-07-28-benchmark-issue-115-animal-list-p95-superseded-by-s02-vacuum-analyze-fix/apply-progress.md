# Apply Progress: Benchmark issue #115 animal-list p95

**Mode**: Strict TDD

**Delivery**: `size:exception` approved for a single PR; no commit or PR created.

## Status

**Partial / failed contractual evidence.** A disposable PostgreSQL 17 target was safely provisioned
on `127.0.0.1:55432` with a generated `es_CO.UTF-8` locale, UTC, `public.unaccent`, and the
isolated `ganaweb_benchmark` database. The runner now resets and deterministically seeds the
100,000-row fixture, and its seeded S01–S07 selectivities were checked directly. The real run
failed truthfully at S01: p95 was **1909.298629 ms**, above LA-100's `<400 ms` threshold. It
retained `environment.json`, S01's 100 samples, LA-103 statement evidence, and `failure.json`.
No p95 pass or plan evidence was fabricated; plan capture and the remaining scenarios were not
reached after the contractual failure.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | `packages/db/tests/animal-listado-benchmark.test.ts` | Unit | N/A (new) | ✅ Missing fixture module (exit 1) | ✅ 7 tests pass | ✅ deterministic reset plus cohort/S07 cases | ✅ fixture SQL extracted |
| 1.2 | — | Integration | ✅ `animal-listado-postgres.test.ts`: 24/24 | ➖ Not started | ➖ Not started | ➖ Not started | ➖ Not started |
| 1.3 | `packages/db/tests/animal-listado-benchmark.test.ts` | Unit | N/A (new) | ✅ Missing fixture module (exit 1) | ✅ exact S01–S07 and altered input rejection pass | ✅ page-size and predicate variants | ➖ None needed |
| 1.4 | `packages/db/tests/animal-listado-benchmark.test.ts` | Integration | ✅ 7/7 benchmark contracts | ✅ Missing reset fixture export (exit 1) | ⚠️ Fixture reset/seed runs against isolated PG17; migration remains external provisioning | ✅ direct database counts verified for S03–S07 | ✅ SQL fixture is deterministic |
| 2.1 | `packages/db/tests/animal-listado-benchmark.test.ts` | Unit | N/A (new) | ✅ Missing fixture module (exit 1) | ✅ 100 samples, percentiles, threshold/failure cases pass | ✅ valid, insufficient, invocation-error, boundary cases | ✅ tick helper clarified |
| 2.2 | — | Integration | ✅ `animal-listado-postgres.test.ts`: 24/24 | ➖ Not started | ➖ Blocked by fixture target | ➖ Not started | ➖ Not started |
| 2.3 | `packages/db/tests/animal-listado-benchmark.test.ts` | Unit | N/A (new) | ✅ Missing runner module (exit 1) | ✅ environment/lock, immutable artifact, and failure-shape cases pass | ✅ wrong version, locale, lock, duplicate artifact | ➖ None needed |
| 2.4 | `packages/db/tests/animal-listado-benchmark.test.ts` | Unit | N/A (new) | ✅ Missing runner module (exit 1) | ⚠️ Partial: run directory and receipt helpers pass | ✅ duplicate run/plan-shape cases | ➖ None needed |
| 3.1 | — | Documentation/config | N/A | ➖ Structural | ✅ script, ignore rule, and README present | Triangulation skipped: structural work | ➖ None needed |
| 3.2 | — | Runtime | N/A | ➖ Not started | ❌ Exit 1: S01 p95 1909.298629 ms violates LA-100 | ➖ Subsequent scenarios not run after contractual failure | ➖ None needed |
| 3.3 | — | Runtime | N/A | ➖ Not started | ⚠️ Partial immutable receipt retained; no pass publication | ➖ Not applicable after S01 failure | ➖ None needed |

## Work Unit Evidence

| Work unit | Focused test command and exact result | Runtime harness command/scenario and exact result | Rollback boundary |
|---|---|---|---|
| Foundation contracts | `pnpm --filter @ganaweb/db exec vitest run tests/animal-listado-benchmark.test.ts` — exit 0, 6/6 tests | N/A: no isolated PG17 target was configured; `BENCHMARK_DATABASE_URL` is missing | Remove `packages/db/src/benchmark/animal-listado.ts` and `packages/db/tests/animal-listado-benchmark.test.ts` |
| Runner/config skeleton | Same focused command — exit 0, 6/6 tests; `pnpm --filter @ganaweb/db typecheck` — exit 0 | Not run: the contractual command requires `BENCHMARK_DATABASE_URL`, never falls back to `DATABASE_URL` | Remove `run-animal-listado.ts`, package script, README section, and ignore entry |
| Existing read-model safety net | `pnpm --filter @ganaweb/db exec vitest run tests/animal-listado-postgres.test.ts` — exit 0, 24/24 tests | Existing local PG integration path passed, but it is not §11 timing evidence | No production files changed; remove benchmark-only files only |
| Isolated fixture reset | `pnpm --filter @ganaweb/db exec vitest run tests/animal-listado-benchmark.test.ts` — exit 0, 7/7 tests | PostgreSQL 17 at `127.0.0.1:55432`: 100,000 total; S03/S04/S05/S06 direct counts 15,750/1,120/4,410/630 | Remove `fixtureSeedSql`, runner reset code, and the disposable Docker container/image |
| Contractual S01 attempt | Same focused suite — exit 0, 7/7; `pnpm --filter @ganaweb/db typecheck` — exit 0 | `BENCHMARK_DATABASE_URL=postgresql://benchmark:***@127.0.0.1:55432/ganaweb_benchmark pnpm --filter @ganaweb/db benchmark:animal-listado` — exit 1, p95 1909.298629 ms; immutable failure receipt retained | Remove only `packages/db/benchmark-runs/rf-anim-list-11-v1-1785173582225/` to discard this failed evidence |

## Remaining Blockers

1. LA-100 fails at S01 (p95 1909.298629 ms). Do not change production query/index behavior in this benchmark-only change; open a separate performance change before another run.
2. Implement exact three-query `EXPLAIN (ANALYZE, BUFFERS)` capture and complete artifact paths before asserting LA-102 or checking tasks 1.2, 1.4, 2.2, 2.4, 3.2, and 3.3.

## Commands Run

- `pnpm exec biome format --write …` — source-mutating normalizer completed.
- `pnpm exec biome format …` — exit 0; 4 files checked, no fixes.
- `pnpm --filter @ganaweb/db typecheck` — exit 0.
- Focused benchmark suite — exit 0, 6/6 tests.
- Existing PostgreSQL safety net — exit 0, 24/24 tests.
- Isolated PG17 provisioning — succeeded with Docker image `ganaweb-benchmark-postgres:17-esco`; migrated with `DATABASE_URL` scoped to `ganaweb_benchmark`.
- Contractual benchmark — exit 1; S01 p95 1909.298629 ms, with retained immutable partial evidence.

## V2 Resume Attempt (2026-07-27)

The v2 fixture and matrix were started through Strict TDD (RED: 4 failing v2 contract assertions;
GREEN: focused suite 8/8). A disposable PostgreSQL 17 container at `127.0.0.1:55432` was migrated,
run, and torn down. It produced immutable v2 partial receipts only; all existing
`rf-anim-list-11-v1-*` receipt bytes remain untouched historical non-acceptance evidence.

- `rf-anim-list-11-v2-1785177750619`: S01 completed; S02 failed LA-100 with p95 **504.482614 ms**.
- The runner preserved available samples, statements, and plan artifacts, then wrote `failure.json`.
- No v2 task checkbox is marked complete: the full S01–S07 contractual run, 700 samples, and 21 plans
  did not complete, so LA-100/102/103 acceptance is not claimed.

## Corrective Second Apply Attempt (2026-07-27)

This corrective attempt preserved every existing `rf-anim-list-11-v1-*` and prior
`rf-anim-list-11-v2-*` receipt byte unchanged. It corrected benchmark tooling only:
the v2 seed now produces exactly 3,000 animals, 900 active animals per finca, 900 animals
without a latest weight, and 700/700/700 animals with 1/3/12 latest-weight histories. The
S02 contract remains exactly `page:9,pageSize:100,sort:"codigo:asc"` for finca A.

A newly provisioned disposable PostgreSQL 17 target used `ganaweb_benchmark`, UTC,
`es_CO.UTF-8`, `public.unaccent`, the advisory lock, and no concurrent traffic. The independent
contractual command stopped at the first threshold failure as required:
`rf-anim-list-11-v2-1785178829053` completed S01 and S02, retained 200 raw samples, six plans,
and two LA-103 records. S02 p95 was **410.341067 ms**, so LA-100 still fails (`<400 ms`). This
independently reproduces the threshold failure after the prior 504.482614 ms result; results were
not averaged, and the full S03–S07/700-sample/21-plan acceptance receipt was not claimed.

Fixture verification against the isolated target after the run returned:
`3000|900|900|900|900|700|700|700` for total animals, active A/B/C, null latest weights, and
1/3/12 weight-history cohorts respectively. S01/S02 each retained page, filtered-count, and
unfiltered-count `EXPLAIN (ANALYZE, BUFFERS)` artifacts and exact-three-statement LA-103 records.

### Corrective TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1–1.2 | `packages/db/tests/animal-listado-benchmark.test.ts` | Unit + isolated PG verification | ✅ 8/8 focused contracts | ✅ fixture-count contract absent (2 assertions failed) | ✅ 8/8 after seed correction | ✅ direct PG count query validates all eight fixture counts | ✅ exported expected-count contract |
| 1.3–1.4 | `packages/db/tests/animal-listado-benchmark.test.ts` | Unit | ✅ 8/8 | ✅ S02 exact-request assertion added before runner work | ✅ 8/8 | ✅ S01/S02/S03 altered-input coverage retained | ✅ none needed |
| 2.3–2.4 | `packages/db/tests/animal-listado-benchmark.test.ts` | Unit + runtime | ✅ 8/8 | ✅ missing execution-plan payload assertion failed | ✅ 8/8 after fail-closed plan validation | ✅ S01/S02 each wrote three named plans and LA-103 records | ✅ lint-safe named-plan handling |
| 3.2–3.3 | Existing focused/PG suites | Integration + runtime | ✅ benchmark 8/8; PostgreSQL safety 24/24 | ➖ runtime evidence task | ❌ contractual command exit 1 at S02 p95 410.341067 ms | ➖ stopped by fail-fast contractual policy | ➖ no production/query/index refactor allowed |

### Corrective Work Unit Evidence

| Work unit | Focused test command and exact result | Runtime harness command/scenario and exact result | Rollback boundary |
|---|---|---|---|
| Fixture and S02 contract correction | `pnpm --filter @ganaweb/db exec vitest run tests/animal-listado-benchmark.test.ts` — exit 0, 8/8 | Isolated PG17 direct verification — `3000|900|900|900|900|700|700|700`; S02 request remains p9/100 | Revert `packages/db/src/benchmark/animal-listado.ts` and its benchmark test assertions only |
| Plan evidence fail-closed check | Same focused command — exit 0, 8/8 | `rf-anim-list-11-v2-1785178829053` retained S01/S02 page, filtered-count, and unfiltered-count plans plus LA-103 records | Revert `packages/db/src/benchmark/run-animal-listado.ts` validation and related test only |
| Independent contractual rerun | Focused 8/8; `pnpm --filter @ganaweb/db exec vitest run tests/animal-listado-postgres.test.ts` — exit 0, 24/24 | `BENCHMARK_DATABASE_URL=postgresql://benchmark:***@127.0.0.1:55432/ganaweb_benchmark pnpm --filter @ganaweb/db benchmark:animal-listado` — exit 1, S02 p95 410.341067 ms; 200 samples, 6 plans, 2 LA-103 records retained | Remove only the new isolated v2 run directory to discard this failed evidence; do not touch prior v1/v2 receipt directories |

### Corrective Quality Checks

- `pnpm turbo typecheck` — exit 0, 13/13 tasks successful.
- `pnpm exec biome check .` — exit 0 after benchmark-adapter import ordering correction; existing complexity/dependency diagnostics remain warnings only.
- The temporary PostgreSQL 17 container was removed after evidence capture.

## Remaining Blocker

LA-100 remains unsatisfied. The repeated isolated S02 failure is not accepted as environment noise;
a separate authorized production query/index performance change is required before another §11
acceptance attempt. All task checkboxes remain unchecked because the required all-scenario receipt
did not complete.

## Reconciliation correction (2026-07-28)

Receipt `rf-anim-list-11-v2-1785183798775` supports seven passing scenarios, 700 samples, 21 plans,
seven LA-103 traces, and the PG17 environment, but contains no manifest artifact. The §11 requirement
and tasks 2.4/3.3 require an immutable manifest, so those tasks are reopened; no receipt, code, or test
bytes changed.

| Work unit | Focused test command and exact result | Runtime harness command/scenario and exact result | Rollback boundary |
|---|---|---|---|
| Documentary reconciliation | N/A: no code changed or test rerun | Immutable receipt audit — unsupported: no manifest artifact | Revert the two task checkboxes and this section |
