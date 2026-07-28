# Superseded — `benchmark-issue-115-animal-list-p95`

**Status**: Superseded by [`s02-vacuum-analyze-fix`](../archive/2026-07-28-s02-vacuum-analyze-fix/) (commit `14bcf10` on branch `fix/issue-115-s02-vacuum-analyze`, PR #116).

**Date**: 2026-07-28
**Author of supersession decision**: lrodriguezn

## Why superseded

This change was the attempt to "definir el §11 scenario matrix" for the animal-list benchmark on PostgreSQL 17. It reached 9/11 tasks and was blocked at `resolve-blockers` (the bound compact post-apply gate context had changed after multiple resets).

Its core value — the §11 fixture, `runAnimalListadoBenchmark`, the manifest emission, and the `assertDisposableBenchmarkTarget`/`assertS02OrderedCompositeIndexPlan` helpers — was committed in `14bcf10` together with `s02-vacuum-analyze-fix`. The §11 contract here is now part of the change artifacts under `openspec/changes/archive/2026-07-28-s02-vacuum-analyze-fix/`.

The two outstanding tasks (2.4 manifest emission, 3.3 Biome `noRestrictedSyntax` override) were resolved during the `s02-vacuum-analyze-fix` apply: 2.4 by reusing the existing manifest emission at `run-animal-listado.ts:292`; 3.3 by acknowledging Biome 1.9.4 lacks the rule and adopting the Vitest grep test as the CI gate.

## Preserved for reference

- `proposal.md` — Intent, scope, approach, success criteria.
- `design.md` — Benchmark infrastructure design (resettable PG 17 target, deterministic multi-finca data, raw samples, percentile summary).
- `tasks.md` — 14 tasks; 9/11 complete at the time of supersession.
- `apply-progress.md` — Diagnostics from the original apply phase, including the S02 plan shape that motivated the operational fix.
- `exploration.md` — Comparison of approaches considered before settling on operational VACUUM.
- `specs/animal-listado-performance-benchmark/spec.md` — Authoritative §11 contract (Fixture, Scenarios, Run Lifecycle, Measurement, Evidence).

## To revive (not recommended)

If a future change needs to extend the §11 matrix, the easiest path is to copy `specs/animal-listado-performance-benchmark/spec.md` into a new change folder, copy `animal-listado.ts` + the relevant pieces of `run-animal-listado.ts`, and open a fresh change. The old receipts are stale and the sdd-attempt ledger entries in `.git/gentle-ai/` are historical only.
