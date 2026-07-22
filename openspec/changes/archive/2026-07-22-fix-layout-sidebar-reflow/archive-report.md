# Archive Report: fix-layout-sidebar-reflow

**Archived**: 2026-07-22 (report corrected 2026-07-22)
**Artifact store**: openspec
**Status**: **ARCHIVED — CORRECTED REPORT (final merged state)**

> **Correction notice**: The original archive was created during the initial `w-full` attempt
> (which proved incomplete). Per the orchestrator's instruction, this report is corrected to
> reflect the **actual merged fix** in commit `d3420bf` / PR #73 (merged manually by user).
> The `w-full` approach was abandoned because it didn't address the root cause; the working
> fix required replacing the CSS grid with flexbox + `min-w-0` AND migrating 7
> full-page-reload calls to SPA navigation.

---

## Change Summary

**GitHub issue**: #72 — Layout reflow flash on first paint (sidebar/header disappearing)
**PR**: #73 — Merged manually by user, all CI checks pass
**Merge commit**: `a60af90c0da5eb96379c91c734ddc3f60bf4adde`
**Implementing commit**: `d3420bfd1e92256072c66492bd2f6822edd320bd`

Two bugs fixed under **BUG-LAYOUT-001** across 6 files (25 insertions, 16 deletions):

### Bug #1 — Layout reflow flash

Content rendered inside the sidebar column (~230px) during SPA route transitions,
then "jumped" to the correct position after reflow. Root cause: CSS Grid
`md:grid md:grid-cols-[240px_1fr]` auto-placement failed during React route
transitions because the `<Outlet />` is briefly empty between unmount and mount
of child routes.

**Working fix** (in `apps/web/src/routes/_app.tsx`):
- Replaced `md:grid md:grid-cols-[240px_1fr]` with `md:flex-row` so the content
  wrapper is a flex sibling of the sidebar, not a grid cell subject to
  auto-placement behavior during transition frames.
- Added `min-w-0` to the content wrapper div and `<main>` element to prevent
  content-forced width collapse inside flex items (overrides the default
  `min-width: auto` for flex items).
- Added `staleTime: 60_000` to the `_app` route `beforeLoad` to cache the
  session check across navigations.

**Failed attempt**: The initial `w-full` approach (adding `width: 100%` to
wrapper and `<main>`) was insufficient — it didn't prevent the grid cell's
auto-placement from briefly miscomputing the column during the transition window.

### Bug #2 — Sidebar/header disappearing during navigation

7 `window.location.assign()`/`reload()` calls caused full page reloads (SSR
re-render), hiding sidebar and header until the server responded. The app shell
mounted from scratch on every navigation.

**Fix**: Replaced all 7 calls with TanStack Router `navigate()` for true SPA
transitions:

| File | Calls replaced |
|------|----------------|
| `animales.tsx` | 3 (goNew + 2x onPressAnimal) |
| `$animalId.tsx` | 1 (post-delete reload → navigate to list) |
| `nuevo.tsx` | 1 (post-create redirect) |
| `editar.tsx` | 1 (post-update redirect) |
| `mas.tsx` | 1 (logout redirect) |

---

## Gate Checks

| Gate | Result |
|------|--------|
| Native Review Receipt | N/A — no review gate artifacts; orchestrator dispatched archive directly |
| Task Completion (Implementation) | ✅ RECONCILED — Tasks corrected per orchestrator instruction (see below) |
| Task Completion (Verification automated) | ✅ PASS — Build, typecheck, tests all green |
| Task Completion (Verification manual) | ✅ PASS — User confirmed manual testing in PR #73 body |
| CRITICAL issues in verify-report | ✅ None |
| Spec deltas to sync | ✅ None — behavior-preserving layout refactor + navigation migration |

### Task Reconciliation

The original `tasks.md` (from the `w-full` proposal phase) contained stale tasks
that did not match the actual fix. Per the orchestrator's explicit instruction,
the tasks artifact has been updated to reflect the final merged implementation.
The actual work done is verified by the commit diff (`d3420bf`), the PR body
(manual testing confirmed), and the CI pipeline (build/typecheck/tests passed).

---

## Spec Sync

No spec delta files were present — this change touches the app shell layout
(not in spec scope per the original proposal) and replaces full-page reloads
with SPA navigation (implementation detail, not behavioral contract in specs).
The existing spec `openspec/specs/ui/app-shell.md` scenarios cover observable
behavior (content offset, safe areas) which is preserved.

---

## Archive Contents

| Artifact | Present | Notes |
|----------|---------|-------|
| `proposal.md` | ✅ | Note: describes initial `w-full` approach (superseded) |
| `exploration.md` | ✅ | Root cause analysis and approach comparison |
| `tasks.md` | ✅ | **Corrected** — now reflects final merged implementation |
| `apply-progress.md` | ✅ | Documents initial `w-full` apply (superseded by PR #73) |
| `verify-report.md` | ✅ | Documents initial `w-full` verification (superseded by PR #73) |
| `archive-report.md` | ✅ | This file — corrected closure summary |

---

## Implementation Verification (final merged state)

| Check | Result | Evidence |
|-------|--------|----------|
| Build (`pnpm turbo build`) | ✅ PASS | PR #73 CI — verified |
| Typecheck (`pnpm turbo typecheck`) | ✅ PASS | 13/13 tasks, exit 0 |
| Tests (`pnpm test apps/web`) | ✅ PASS | 1/1 vitest e2e, exit 0 |
| Diff scope | ✅ PASS | 6 files, 25 insertions, 16 deletions — well under 400-line budget |
| PR merged | ✅ YES | Merged manually by user at `2026-07-22T18:56:06Z` |

---

## Issues at Archive Time

### CORRECTION — Initial Artifacts Reflected Stale Approach

The initial SDD cycle (`exploration` → `proposal` → `apply` → `verify` →
`archive`) was based on the `w-full` CSS-only approach, which was a failed
attempt. The actual fix required a broader change:

1. **Layout**: Grid → flex-row + `min-w-0` (not `w-full`)
2. **Navigation**: 7 full-page reloads → SPA `navigate()`
3. **Scope**: 6 files, 41 total lines changed (not 2 lines in 1 file)

The artifacts at `proposal.md`, `tasks.md`, `apply-progress.md`, and
`verify-report.md` document the initial approach and are retained in the
archive as an audit trail of the development process. The definitive
source of truth for the fix is commit `d3420bf` / PR #73.

### Task Accuracy

The corrected `tasks.md` now reflects the actual work done. All tasks
verified:
- Implementation: Both bug fixes applied and committed
- Automated checks: Build, typecheck, tests all green
- Manual verification: Confirmed by user in PR body
- PR merged: Main branch contains the fix

---

## Source of Truth

No spec artifacts were modified — the app shell spec
(`openspec/specs/ui/app-shell.md`) scenarios describe observable behavior
(content offset, safe areas) that is preserved. The navigation migration
is an implementation improvement with no behavioral contract change.

The authoritative fix is:
- **Commit**: `d3420bfd1e92256072c66492bd2f6822edd320bd`
- **PR**: #73 (MERGED)
- **Closes**: GitHub issue #72

---

## SDD Cycle

| Phase | Status |
|-------|--------|
| Explore | ✅ Complete |
| Proposal | ✅ Complete (approach superseded by actual fix) |
| Spec | N/A (no spec-level changes) |
| Design | ✅ Complete (via exploration) |
| Tasks | ✅ Corrected to reflect final state |
| Apply | ✅ Complete (via PR #73, supersedes initial apply) |
| Verify | ✅ PASS (PR #73 CI + user manual confirmation) |
| Archive | ✅ Complete (report corrected to final merged state) |

---

## Rollback

```bash
git revert d3420bf
```

Reverts the entire fix (layout + navigation migration). No migrations,
no data impact.
