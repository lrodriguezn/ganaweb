## Exploration: Benchmark RF-ANIM-LIST §11 for issue #115

### Current State
Issue #107 provides the PostgreSQL-only server-side animal-list contract through `GET /api/fincas/{fincaId}/animales`. The read model performs authorization, one paginated joined query, one filtered count, and one unfiltered count; latest weight is resolved with a lateral subquery ordered by `fecha DESC, id DESC`. Request validation accepts page sizes 25/50/100, the canonical search field, the bounded filter grammar, and the registered sort keys. The current schema declares `idx_animales_finca_activo_codigo` and the latest-weight index is migration-backed, but the repository has only local `EXPLAIN (ANALYZE, BUFFERS)` evidence against the approximately 20-row demo seed. That plan sequential-scans `animales`, and the previous #107 artifacts explicitly state that the exact §11 fixture, scenarios, and p95 harness are absent; therefore LA-100/representative LA-102 acceptance is still unproven.

Issue #113 corrected date and boolean filter behavior and added focused PostgreSQL integration coverage, but it did not add performance infrastructure. Existing database tests use Vitest, `postgres-js`, and a real PostgreSQL database/container; they are suitable for correctness but not yet isolated, deterministic latency measurement. The active OpenSpec source defines LA-100 (<400 ms p95), LA-102 index measurement, and LA-103 no N+1, while the detailed §11 scenario matrix is not present in the current repository and must be recovered from issue #115/maintainer acceptance before implementation.

### Affected Areas
- `packages/db/src/animal-infrastructure.ts` — canonical query path to benchmark: joins, filters, stable ordering, pagination, counts, and lateral latest-weight lookup.
- `packages/db/src/schema/animales.ts` — declares the finca/active/code access index that the benchmark must validate against the applied migration.
- `packages/db/src/schema/pesos-produccion.ts` and the migration directory — latest-weight index definition and migration provenance to include in LA-102 evidence.
- `packages/db/tests/animal-listado-postgres.test.ts` — existing real-PostgreSQL fixture/setup and statement-count assertions can provide reusable harness primitives, but the tiny correctness fixture must not be used as contractual performance evidence.
- `apps/web/src/server/animal-list-contract.ts` and `apps/web/src/server/animal-list-http.ts` — source of truth for accepted filters, sorts, page sizes, response shape, and request-to-read-model mapping.
- `features/feature-003-listado_animales-desktop/requisito_listado_animales.md` — RF-ANIM-LIST §11 and LA-100–103 requirements; it currently specifies the threshold but not a concrete dataset.
- `openspec/changes/implement-issue-107-server-contract/{proposal.md,design.md,route-contract-evidence.md,apply-progress.md}` — records the intentional benchmark evidence gap and the existing demo-seed plan limitation.
- `openspec/changes/archive/2026-07-27-validate-issue-113-animal-list-reliability/` — confirms the latest filter/date fixes and existing integration-test conventions.

### Approaches
1. **Deterministic PostgreSQL benchmark harness with generated fixture** — create a disposable benchmark schema/database or resettable benchmark finca, load a fixed seed at a contractual scale (recommended starting point: 100,000 animals across multiple fincas, with documented skew for active/inactive rows, searchable prefixes, catalog values, nullable relationships, dates, and weights), run the exact agreed scenario matrix through the read model, and emit raw samples, percentile calculations, environment metadata, and `EXPLAIN (ANALYZE, BUFFERS)` plans.
   - Pros: reproducible, exercises the actual PostgreSQL query and indexes, separates correctness fixtures from performance evidence, supports reruns and CI/manual evidence review.
   - Cons: requires fixture ownership, database reset/isolation, scenario agreement, and careful control of machine/container noise; generated data must preserve realistic selectivity rather than merely increase row count.
   - Effort: Medium

2. **Extend the existing integration test with a large in-test seed and timing assertions** — insert a larger deterministic dataset in the current test setup, time each request with Node's monotonic clock, and assert p95 directly in Vitest while capturing plans separately.
   - Pros: reuses existing setup and test commands; low initial scaffolding cost.
   - Cons: test-runner overhead and shared database state make latency noisy; setup time and transaction behavior can distort measurements; a pass/fail assertion alone is weak evidence and is unsuitable for stable CI gating without environment controls.
   - Effort: Medium

3. **External load tool against a running HTTP server** — seed PostgreSQL, start the production-like web server, and use a load generator to measure end-to-end request latency for the scenario matrix.
   - Pros: validates HTTP serialization, routing, and realistic concurrency in addition to query latency.
   - Cons: mixes server/network/process noise with database evidence, makes LA-102 plan capture and deterministic percentile attribution harder, and can conceal the exact query scenario that regressed.
   - Effort: High

### Recommendation
Use approach 1 as the contractual benchmark, with a small reusable command/script rather than a normal correctness test. First resolve the missing §11 scenario matrix with issue #115/maintainer acceptance. Then define a versioned deterministic fixture (seed/version, row counts, finca distribution, value frequencies, null rates, and fixed IDs), run `ANALYZE`, and execute every required combination of search/no search, representative filters, sorts (including `codigo` and latest-weight ordering), and pages (first, middle, deep) at page sizes 25/50/100. Use a warmup phase followed by a fixed number of measured iterations per scenario, record individual elapsed times, compute p50/p95/p99 with a declared percentile method, and report p95 <400 ms per scenario rather than only an aggregate. Capture `EXPLAIN (ANALYZE, BUFFERS)` for the paginated query and both count queries, including planning/execution time, buffers, row estimates, index usage, and statement count/no-N+1 evidence. Keep PostgreSQL-only assumptions explicit: PostgreSQL 17, applied migrations, `unaccent` availability, fixed timezone/locale, dedicated database/container, stable hardware limits, statistics refreshed, and no concurrent benchmark traffic.

This approach directly closes the evidence gap documented by #107 while preserving the existing query implementation and test conventions. It should produce reviewable artifacts containing the fixture manifest, scenario manifest, environment snapshot, raw measurements, percentile summary, and plans; it must not claim LA-100 from the 20-row demo seed.

### Risks
- The exact RF-ANIM-LIST §11 scenarios are not currently encoded in the repository; proceeding without maintainer confirmation could produce valid but non-contractual evidence.
- A fixed row count alone is insufficient: skew, selectivity, nullable joins, catalog distribution, and latest-weight cardinality can materially change plans and p95.
- PostgreSQL planner choices depend on statistics, version, configuration, hardware, and cache state; all relevant assumptions and warm/cold procedure must be recorded.
- Leading-wildcard `unaccent(lower(...))` search can remain expensive even with the current indexes; the benchmark may expose a need for a separate index/query design change rather than merely benchmark infrastructure.
- Timing inside Vitest or across a shared developer database can produce flaky results; contractual evidence should run against an isolated, resettable PostgreSQL target and retain raw samples.
- Deep offsets and count queries may dominate different scenarios; measuring only the first page or only the data query would underrepresent the endpoint contract.
- Benchmark fixture insertion/reset must not mutate ordinary demo data or applied migrations; rollback must be a database teardown/reset operation.

### Ready for Proposal
Yes, after one explicit clarification is recorded: the authoritative RF-ANIM-LIST §11 scenario matrix (or approval to define it in this change). The proposal can then specify the fixture manifest, benchmark command/output artifacts, percentile methodology, PostgreSQL environment contract, and evidence acceptance rule (every required scenario p95 <400 ms plus LA-102 plans and LA-103 statement-count proof).
