# Archive Report: iniciemos-desarrollo-de-issue-108

## Change Summary
- **Issue**: #108 — Desktop animal list table (29 columns, states, accessibility)
- **Epic**: #106 (approved)
- **PR**: #120 (merged 2026-07-29T23:25:16Z)
- **Branch**: feature/issue-108-desktop-animal-list → master

## Lifecycle
| Phase | Status | Date |
|-------|--------|------|
| Exploration | ✅ Complete | 2026-07-29 |
| Proposal | ✅ Complete | 2026-07-29 |
| Spec | ✅ Complete (1 corrective re-run) | 2026-07-29 |
| Design | ✅ Complete (2 corrective re-runs) | 2026-07-29 |
| Tasks | ✅ Complete (19 tasks, 4 phases) | 2026-07-29 |
| Apply PR1 | ✅ 7/7 tasks, 935 lines | 2026-07-29 |
| Apply PR2 | ✅ 7/7 tasks, 1,142 lines | 2026-07-29 |
| Apply PR3 | ✅ 5/5 tasks, 959 lines | 2026-07-29 |
| Verify | ✅ PASS WITH WARNINGS (0 CRITICAL) | 2026-07-29 |
| Manual QA | ✅ Executed by maintainer | 2026-07-29 |
| PR Merge | ✅ #120 merged | 2026-07-29 |
| Archive | ✅ Report authored 2026-07-29; finalized 2026-07-31 | 2026-07-31 |

## Final State (2026-07-31)
- Issue #108 is CLOSED and merged to master via PR #120; epic #106 is CLOSED.
- The test/build metrics in the Evidence section below are a snapshot from the 2026-07-29 verify run (`verdict: pass`, `critical_findings: 0`, "PASS WITH WARNINGS") and are attributed to that time.
- Final epic-level functional QA on master @ cad6eb2 verified all 12 RF-ANIM-LIST v2.1 acceptance criteria MET, with the epic test surface green (`animal-listado-route-integration` 20/20, `animal-listado-postgres` 25/25, `animal-exportacion-postgres` 6/6, `@ganaweb/web` 241/241).
- Residual (non-blocking): the AA-contrast manual matrix remains UNSIGNED (no automated visual runner); documented in the #106 closing comment. See Warning #4.

## Evidence
- Tests: 654 passing (70 new), typecheck 13/13, biome 0 errors, depcruise 0 errors (snapshot — 2026-07-29 verify run)
- Spec compliance: 9/9 scenarios verified
- TDD: Strict RED→GREEN throughout, all tests authored failing first
- Total: ~3,182 changed lines across 9 conventional commits

## Warnings (accepted, non-blocking)
1. #107 fetch in client effect (LA-040–043 client-stateful by design)
2. CSS-class proxy assertions for row height/focus (jsdom limitation)
3. LA-040 toast as `<output role=status>` (no toast infra exists)
4. AA-contrast manual matrix (`manual-qa-contrast-matrix.md`) is UNSIGNED — executed by the maintainer but not formally signed in file, and there is no automated visual runner (per `openspec/config.yaml`). Recorded as a non-blocking residual in the #106 closing comment. Automated guards (ten-appearance render sweep + T-004 zero-`dark:` scanner) cover the automatable portion.

## Spec Promoted
- `openspec/specs/animal-listado-desktop-ui/spec.md` (promoted from this change's delta during the 2026-07-29 partial archive).
- Final-archive note (2026-07-31): the main spec is already in sync and has since been superseded by #109 (presentational query controls), #110 (pagination/preferences), and #111 (active `Exportar`). It was verified — not re-merged — during this final archive to avoid regressing those later requirements (e.g. the #108 delta's inert `Exportar` vs. the current active `Exportar`).

## Out of Scope (delivered by future issues)
- #109: filters/search/order + URL mutation
- #110: pagination + column preferences
- #111: export execution
