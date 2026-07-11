# Archive Report: Five-Style Appearance Rollout

## Change Summary

| Field | Value |
|-------|-------|
| **Change name** | `cinco-estilos-apariencia` |
| **Archive date** | 2026-07-11 |
| **PR** | [#35](https://github.com/lrodriguezn/ganaweb/pull/35) — merged to master (`fb8cf00`) |
| **PR diff stat** | 22 files / +2,927 / −366 |
| **Issue** | [#27](https://github.com/lrodriguezn/ganaweb/issues/27) — closed by merge |
| **Verdict** | PASS — 7/7 requirements, 11/11 scenarios compliant |

## Gate Verdicts

### Review Receipt Gate

**PASS**. The verify-report records `verdict: pass`, `blockers: 0`, `critical_findings: 0`, `requirements: 7/7`, and `scenarios: 11/11`. No CRITICAL issues were found. All prior severe review findings (R3-001, R3-002, RESILIENCE-001) were fixed and re-verified. The lint-blocker fixes (native radio inputs, token regex complexity split) were applied and verified.

### Task Completion Gate

**PASS (with reconciliation)**. All implementation tasks (1.2–4.3) are checked `[x]`. Task 1.1 (`- [ ]`) is the only unchecked item:

> "Create/approve GitHub issue for `cinco-estilos-apariencia`; create draft tracker PR on `feature/cinco-estilos-apariencia` and branch `feat/cinco-estilos-tokens`. Issue #27 is created/approved and local branches are prepared; draft tracker PR is pending push/PR commands."

**Reconciliation reason**: The orchestrator explicitly instructed that task 1.1 (tracker PR push/creation) was deferred to a no-push instruction. Issue #27 was created and approved, local branches were prepared, and all substantive implementation work was completed. The no-push instruction prevents the GitHub PR creation step, not the feature work itself. Apply-progress (#76) and verify-report (#85) confirm all behavior is implemented and tested. This single stale checkbox is reconciled for archive with this documented reason.

## Spec Sync Actions

### UI Spec (`openspec/specs/ui/spec.md`)

| Action | Requirement | Details |
|--------|-------------|---------|
| MODIFIED | Requirement 2: Token migration | Updated from matching `ganaweb-design.md` to the shared Campo baseline and five-style runtime catalog (`ganaweb-estilos.md`). Added 10-combination scenario. |
| MODIFIED | Requirement 3: No dark: variants | Updated to include five independent style ids alongside claro/oscuro mode. |
| ADDED | Requirement 6: Five-style visual selector | Token-driven visual-card selector for Campo, Moderna, Índigo, Cielo, Grafito. Supersedes binary Campo/Moderna semantics. |
| ADDED | Requirement 7: Accessible selector cards | Radio-style options with visible focus, selected state, Spanish labels, palette preview, 44px touch targets. |
| REMOVED | Binary Campo/Moderna switcher semantics | _No-op_ — this requirement was not present in the main spec. The delta noted its removal for audit traceability. Reason: binary pill does not scale to five styles. |

**Result**: 7 requirements total (5 original + 2 added). Requirements 2 and 3 were updated. Requirements 1, 4, 5 were preserved unchanged.

### Web Spec (`openspec/specs/web/spec.md`)

| Action | Requirement | Details |
|--------|-------------|---------|
| ADDED | Requirement 6: Appearance surfaces render five style cards | Five-style selector on mobile `/mas` and desktop Avatar menu, aligned to screens 16/17. |
| ADDED | Requirement 7: Independent style and claro/oscuro state | 10 runtime combinations. Style persists locally in `ganaweb-estilo`; claro/oscuro in `ganaweb-theme`. No cross-key overwrites. |
| ADDED | Requirement 8: Anti-flash first paint | Selected style class and `dark` class applied before first paint. Missing/invalid → Campo fallback. |

**Result**: 8 requirements total (5 original + 3 added). No modifications or removals.

## Spec Sync Table

| Domain | Action | Requirements Added | Requirements Modified | Requirements Removed |
|--------|--------|--------------------|-----------------------|----------------------|
| ui | Updated | 2 (Five-style visual selector, Accessible selector cards) | 2 (Token migration, No dark: variants) | 0 (no-op) |
| web | Updated | 3 (Appearance surfaces, Independent state, Anti-flash) | 0 | 0 |

## Implementation Task Status

| Task | Status | Notes |
|------|--------|-------|
| 1.1 | ⬜ Reconciled | Issue #27 created/approved. Tracker PR push deferred to no-push instruction. |
| 1.2 RED: tokens test | ✅ | 10 style×claro/oscuro combinations tested |
| 1.3 GREEN: globals.css | ✅ | Campo baseline + theme-moderna, theme-indigo, theme-cielo, theme-grafito |
| 2.1 RED: selector tests | ✅ | Five radios, Spanish labels, 44px targets, Home/End, focus, storage independence |
| 2.2 GREEN: estilo-switcher.tsx | ✅ | EstiloId, ESTILOS catalog, legacy cleanup, visual cards |
| 3.1 RED: surface tests | ✅ | Five cards on /mas and AvatarMenu |
| 3.2 RED: anti-flash tests | ✅ | Grafito oscuro, missing→Campo, legacy mapping |
| 3.3 GREEN: surfaces + anti-flash | ✅ | apariencia-card.tsx, avatar-menu.tsx, __root.tsx |
| 4.1 dark: audit | ✅ | Zero matches |
| 4.2 OpenPencil parity | ✅ | Screens 16/17 verified for all 5 styles |
| 4.3 PR chain evidence | ✅ | Boundaries, diagram, test results, rollback recorded |

## User-Reported Regression Fixes

| Regression | Cause | Fix | Tests |
|------------|-------|-----|-------|
| Bare `border` → near-black lines | `border` utility resolved to `currentColor` without a `border-color` base layer | `@layer base { *, ::before, ::after, ::backdrop { border-color: var(--color-border); } }` | 5-class bento selector list, estado-badge dot |
| MetricCard hero low contrast | Colored hero background → white foreground invisible | `.dashboard-metric-hero` colored bg + 6 on-primary text remap rules at top level | 35 regression sentinels (9 source + 26 runtime) |
| Bento hero full-width on desktop | `grid-column: 1 / -1` applied at all viewports | Scoped bento LAYOUT to `@media (max-width: 767px)`; desktop 4-column grid restored | `metric-hero-mobile-only.test.ts` (26 tests) |

## Archive Contents

```
openspec/changes/archive/2026-07-11-cinco-estilos-apariencia/
├── archive-report.md          ← this file
├── exploration.md
├── issue-ready.md
├── proposal.md
├── design.md
├── tasks.md
├── phase-4-evidence.md
├── verify-report.md
└── specs/
    ├── ui/spec.md
    └── web/spec.md
```

## Updated Main Specs

| Path | Status |
|------|--------|
| `openspec/specs/ui/spec.md` | Updated — 7 requirements |
| `openspec/specs/web/spec.md` | Updated — 8 requirements |

## Engram Observation IDs

| Topic | ID | Type |
|-------|----|------|
| Apply-progress (bento fix included) | #76 | architecture |
| Verify-report | #85 | architecture (`sdd/cinco-estilos-apariencia/verify-report`) |
| Product rules decision | #71 | decision |
| Architecture design | #74 | architecture |
| Chain strategy decision | #75 | decision |
| Review blockers fixed | #84 | bugfix |
| Lint blockers fixed | #86 | bugfix |
| Local review-budget exception | #79 | decision |
| Archive report (new) | ✨ | architecture (`sdd/cinco-estilos-apariencia/archive-report`) |

## SDD Cycle Complete

The five-style appearance rollout has been fully planned (`sdd-propose`, `sdd-spec`, `sdd-design`, `sdd-tasks`), implemented (`sdd-apply` × 4 phases), reviewed and corrected (4R review cycle with severe→accepted→fixed→re-verified), verified (`sdd-verify` with 3 regression-fix cycles), and now archived. Ready for the next change or for the tracker PR push when the no-push instruction is lifted.
