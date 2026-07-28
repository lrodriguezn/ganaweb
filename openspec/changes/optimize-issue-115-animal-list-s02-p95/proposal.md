# Proposal: S02 p95 Fix via Deferred Lateral Join

## Intent

Close the LA-100 S02 p95 gap. In `rf-anim-list-11-v2`, LATERAL `ultimo_peso` runs for 900 candidates although only 100 rows are returned.

## Scope

### In Scope
- Restructure `DrizzleAnimalListadoReadModel.listar` with a CTE that pages `animales.id` before catalog/self joins and LATERAL `ultimo_peso`; preserve LA-103.
- Authorize only `idx_animales_finca_activo_codigo INCLUDE (id)` in `0004_animal_list_page_index_covering.sql` when CTE-only S02 p95 is ≥400 ms **or** mandatory LA-102 requires ordered index-only/no-sort CTE evidence, including when latency passes.
- Rerun `rf-anim-list-11-v2` (S01–S07); record immutable v2 evidence.

### Out of Scope
- Endpoint, DTO, filter grammar, sort matrix, mapping, predicates, catalog ports, and RN-001 uniqueness — unchanged. New benchmark capability; SQLite/WASM parity (RF-ANIM-LIST §11).

## Capabilities

### New Capabilities
None. Pure read-model refactor.

### Modified Capabilities
None. Existing capabilities are measured, not behaviorally changed.


## Approach

Use `WITH pagina AS (SELECT a.id … LIMIT … OFFSET …)`, then re-join `animales` and retain the existing joins and LATERAL. This reduces S02 LATERAL executions from 900 to 100. Apply the minimal INCLUDE migration only through either authorization path. Acceptance requires the named no-sort ordered index-only CTE plan, S01–S07 p95 <400 ms, LA-103, and unchanged output.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `packages/db/src/animal-infrastructure.ts` | Modified | Deferred `page` CTE; LATERAL unchanged. |
| `packages/db/tests/animal-listado-postgres.test.ts` | Verify-only | Re-run. |
| `packages/db/migrations/0004_animal_list_page_index_covering.sql` | Conditional | Minimal INCLUDE index for latency or mandatory LA-102 plan evidence. |
| `packages/db/benchmark-runs/` | Create | Fresh receipt; history untouched. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| CTE plan regression | Low | Inspect plan and rerun S01–S07. |
| Filtered scenario regression | Med | Rerun S01–S07; roll back if any p95 ≥400 ms. |
| Index added despite passing latency | Low | Named minimal INCLUDE only; require LA-102 evidence, equivalence, and LA-103. |

## Rollback Plan

Revert the page-query diff. If applied, concurrently drop only the covering index and restore its prior definition. Historical receipts remain immutable.

## Dependencies

- Merged `benchmark-issue-115-animal-list-p95` fixture, runner, and LA-100/102/103 harness.
- PG 17 and `public.unaccent`.

## Success Criteria

- [x] S01–S07 p95 <400 ms; LA-103 remains 3; S02 records the named ordered index-only/no-sort CTE scan after the minimal migration is authorized by either condition.
- [x] No external behavior drift: 25/25 integration tests, `turbo test`, `typecheck`, and `biome ci .` pass.
- [ ] Historical v1 and v2 receipts remain byte-identical.
