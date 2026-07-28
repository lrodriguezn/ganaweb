# Proposal: Benchmark issue #115 animal-list p95

## Intent

Close issue #107's only remaining performance-evidence gap: reproducibly prove RF-ANIM-LIST §11 LA-100 and LA-102 for the existing PostgreSQL read model. This change is authorized to define the missing authoritative §11 scenario matrix. References: LA-100, LA-102, LA-103; PE-001–003.

## Scope

### In Scope
- Define a versioned §11 matrix: dataset volume/distribution, filters, searches, sorts, pages, warmup, iterations, percentile method, and PostgreSQL environment assumptions.
- Add a deterministic, isolated PostgreSQL fixture and benchmark command for the existing read model; retain raw samples, manifest, percentile summary, and `EXPLAIN (ANALYZE, BUFFERS)` evidence.
- Require per-scenario p95 <400 ms and plans for paginated, filtered-count, and unfiltered-count queries, including index use and LA-103 statement-count evidence.

### Out of Scope
- Changes to endpoint behavior, query design, schema/index migrations, UI, SQLite/WASM, or ordinary correctness fixtures.
- Treating HTTP routing/serialization timing as LA-100 evidence; it is optional, separately labelled supplemental timing.

## Capabilities

### New Capabilities
- `animal-listado-performance-benchmark`: Authoritative PostgreSQL §11 fixture, scenario matrix, measurement protocol, and LA-100/LA-102 evidence artifacts.

### Modified Capabilities
None. The existing server contract is measured, not behaviorally changed.

## Approach

Use a resettable dedicated PostgreSQL 17 target with applied migrations, `unaccent`, fixed locale/timezone, refreshed statistics, and no concurrent benchmark traffic. Generate deterministic multi-finca data with documented selectivity, nulls, catalog values, and latest-weight distribution. Warm the read model, collect fixed raw monotonic-clock samples per scenario, calculate declared p50/p95/p99, and capture plans separately. Query/read-model timing is contractual; optional HTTP/serialization timing must not be combined with it.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `openspec/specs/animal-listado-performance-benchmark/` | New | §11 benchmark contract |
| `packages/db/tests/animal-listado-postgres.test.ts` | Modified | Reusable PostgreSQL setup only |
| `packages/db/` benchmark tooling | New | Fixture, runner, evidence output |
| `packages/db/src/animal-infrastructure.ts` | Measured | Existing read-model target |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Environment noise invalidates timing | Med | Isolated target, manifest, raw samples |
| Matrix misses costly selectivity/deep pages | Med | Authorized explicit distributions and scenarios |
| p95 fails | Med | Report failure; open a separate query/index change |

## Rollback Plan

Remove benchmark-only tooling and teardown its disposable database/fixture. Do not alter production data, endpoint code, or applied migrations.

## Dependencies

- PostgreSQL 17 disposable target with migrations and `public.unaccent` available.
- Maintainer authorization recorded for the authoritative §11 matrix.

## Success Criteria

- [ ] Every defined query/read-model scenario has reproducible raw samples and p95 <400 ms.
- [ ] LA-102 plans prove the finalized access paths; LA-103 statement-count evidence is retained.
- [ ] Optional HTTP/serialization results, if produced, are explicitly separate from contractual timing.
