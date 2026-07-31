# Archive Report: implement-issue-107-server-contract

## Change Summary
- **Issue**: #107 — Animal list server contract (PostgreSQL-only `GET /api/fincas/{fincaId}/animales`)
- **Epic**: #106 (closed)
- **PRs**: #114 (implementation, merged) + #119 (hardening, merged)
- **Branch**: feat/issue-107-server-contract → master
- **Version**: RF-ANIM-LIST v2.1 (capability `animal-list-server-contract`)

## Lifecycle
| Phase | Status | Date |
|-------|--------|------|
| Exploration | ✅ Complete | — |
| Proposal | ✅ Complete | — |
| Design | ✅ Complete | — |
| Tasks | ✅ Complete (21 tasks, 5 phases) | — |
| Apply | ✅ Merged via PR #114 | — |
| Hardening | ✅ Merged via PR #119 (LA-010 accent-search correction) | — |
| Verify | ⚠️ No change-level verify-report (see Warnings) | — |
| PR Merge | ✅ #114 + #119 merged to master | — |
| Archive | ✅ Finalized | 2026-07-31 |

## Task Completion
All 21 tasks are checked `[x]` in `tasks.md`: phases 1 (1.1–1.4), 2 (2.1–2.4), 3 (3.1–3.3), 4 (4.1–4.3), and 5 (5.1–5.7, the LA-010 accent-search correction). The "External Delivery Gates — Parent-Owned" section is intentionally not checkbox-tracked (fresh independent verification and content-bound review are external gates by design).

## Evidence (final state, master @ cad6eb2)
- Issue #107 is CLOSED and merged to master (PR #114 + hardening #119); epic #106 is CLOSED.
- Epic-level functional QA on master @ cad6eb2 verified all 12 RF-ANIM-LIST v2.1 acceptance criteria MET.
- Epic test surface green: `animal-listado-route-integration` 20/20, `animal-listado-postgres` 25/25, `animal-exportacion-postgres` 6/6, `@ganaweb/web` 241/241.
- Change-level evidence artifacts retained in this folder: `route-contract-evidence.md`, `apply-progress.md`.

## Warnings (accepted, non-blocking)
1. **No change-level verify-report exists for this change.** This is intentional: the work shipped (PR #114 + #119) and was validated at epic level on master @ cad6eb2 (12/12 RF-ANIM-LIST v2.1 AC MET; epic test surface green). The LA-100 p95 < 400 ms benchmark and the agreed §11 fixture remain documented deviations/blockers in `route-contract-evidence.md` and `tasks.md` (4.1), not acceptance regressions.
2. PostgreSQL-only support; SQLite/WASM parity is explicitly excluded by the spec.

## Verdict
**INTENTIONAL-WITH-WARNINGS** — implementation complete and merged; acceptance established at epic level rather than via a change-level verify-report.

## Specs Promoted
- `openspec/specs/animal-list-server-contract/spec.md` — **created** from this change's delta (6 requirements: canonical DTO/derived values, query grammar/filtering/ordering/counters, server authorization/finca isolation, contractual failures/PostgreSQL read, performance acceptance, accent-search evidence). This is a distinct capability from the pre-existing `animal-listado-server-contract` spec (filter-grammar/read-row-mapping utilities), which is left untouched.
- `openspec/specs/db/spec.md` — **updated**: appended 2 ADDED requirements (LA-102 migration-backed listing indexes; PostgreSQL unaccent capability migration). 6 → 8 requirements.

## Out of Scope (delivered by other issues)
- UI / desktop table (#108), filters/search/order (#109), pagination/preferences (#110), export execution (#111).
