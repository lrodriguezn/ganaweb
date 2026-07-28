# Superseded — `optimize-issue-115-animal-list-s02-p95`

**Status**: Superseded by [`s02-vacuum-analyze-fix`](../archive/2026-07-28-s02-vacuum-analyze-fix/) (commit `14bcf10` on branch `fix/issue-115-s02-vacuum-analyze`, PR #116).

**Date**: 2026-07-28
**Author of supersession decision**: lrodriguezn

## Why superseded

This change attempted to close the S02 p95 gap on the read model by restructuring `DrizzleAnimalListadoReadModel.listar` with a `WITH pagina AS (SELECT a.id … LIMIT … OFFSET …)` CTE that pages `animales.id` before catalog/self joins and LATERAL `ultimo_peso`. The hypothesis was that the LATERAL was running for 900 candidates when only 100 rows were returned, and the CTE would reduce it to 100.

Diagnostic work in three disposable PG 17 runs proved the approach was wrong:

1. `s02-diag-no-analyze.json` — fresh DB, no ANALYZE: planner uses bitmap heap scan + sort, `relallvisible=0`.
2. `s02-diag-with-analyze.json` — same DB after ANALYZE: planner still rejects Index Only Scan, `relallvisible` unchanged. **ANALYZE alone does not set the visibility map.**
3. `s02-diag-vacuum-prime.json` — after `VACUUM (ANALYZE) animales` + a repeated warm session: `Index Only Scan` via `idx_animales_finca_activo_codigo`, `relallvisible=83`, `Heap Fetches: 0`. **Only VACUUM sets the visibility map bits that enable Index Only Scan.**

The real fix is operational, not a code refactor. `s02-vacuum-analyze-fix` operationalized it as a maintenance script plus a strict-IOS plan helper.

The change reached 20/20 tasks because the diagnostic capture, spec, design, and "implement the read-model refactor" all completed. The refactored read model was committed locally (reverted before `14bcf10`) and the CTE+INCLUDE migration was never authorized (the "≥400 ms OR mandatory LA-102 evidence" gate never tripped once the visibility map was set).

## Preserved for reference

- `proposal.md` — CTE + minimal INCLUDE refactor intent; valuable as a counter-example.
- `design.md` — Plan for the deferred lateral join.
- `tasks.md` — 20/20 tasks complete at the time of supersession.
- `apply-progress.md` — Diagnostic captures (the `s02-diag-*.json` evidence files are in `packages/db/` and remain untracked at repo root).
- `exploration.md` — The 3 diagnostic captures, full reasoning of why the plan-shape approach failed.
- `specs/animal-listado-server-contract/spec.md` — Read-model contract (only the contract was meant to change; no production behavior was modified).

## To revive (not recommended)

Do not. The approach was disproven. If a future optimization is needed (e.g., the LATERAL cost becomes dominant for some other reason), start a new change from the operational baseline set by `s02-vacuum-analyze-fix`.
