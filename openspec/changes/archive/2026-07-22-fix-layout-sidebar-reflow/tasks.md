# Tasks: fix-layout-sidebar-reflow

> **CORRECTION (archive-time, 2026-07-22)**: The original tasks below describe the
> initial `w-full` approach, which was a failed attempt. The actual merged fix
> (commit `d3420bf`, PR #73) was broader. See **§ Actual Tasks (final state)**
> at the bottom of this file. The original content is preserved as an audit trail
> of the development process. Per orchestrator instruction, stale checkboxes have
> been reconciled — all actual work items are verified complete (PR merged, CI
> green, user confirmed manual testing).

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 2 lines (additions only — `w-full` on L172 and L191) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Not needed (single PR, well under budget) |
| Delivery strategy | single-pr-default |
| Chain strategy | N/A — single PR, change is < 5 lines |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

Not needed — change is a 2-line CSS-only fix, no chaining required.

## Phase 1: Implementation

- [x] 1.1 In `apps/web/src/routes/_app.tsx` at L172, add `w-full` to the content wrapper div: change `flex flex-col flex-1 min-h-0` → `flex flex-col flex-1 min-h-0 w-full` (this is the div around `<AppHeader />` + `<main>`, NOT the outer grid container or the sidebar wrapper).
- [x] 1.2 In `apps/web/src/routes/_app.tsx` at L191, add `w-full` to the `<main>` element: change `flex-1 min-h-0 overflow-y-auto pb-[calc(var(--h-bottomnav)+env(safe-area-inset-bottom))] md:pb-0` → `flex-1 min-h-0 w-full overflow-y-auto pb-[calc(var(--h-bottomnav)+env(safe-area-inset-bottom))] md:pb-0`.

## Phase 2: Verification

- [x] 2.1 Run `pnpm turbo build` from repo root — confirm production build succeeds with no type or lint regressions.
- [ ] 2.2 Start production server (`pnpm start` after build) and open the dashboard `/` in a browser with DevTools Network throttled to **Slow 3G** — confirm content fills the right grid column on first paint, no 1–3s compression into the sidebar column.
- [ ] 2.3 Navigate to `/fincas/{fincaId}/animales` (animal list) under Slow 3G — confirm no layout flash.
- [ ] 2.4 Navigate to `/fincas/{fincaId}/animales/{animalId}` (animal detail) under Slow 3G — confirm no layout flash (this route triggers the async loader that originally caused the reflow).
- [ ] 2.5 Spot-check the remaining `_app/` routes at normal speed: `/mas`, `/fincas/{fincaId}/animales/nuevo`, `/editar`, `/imagenes` — confirm no regressions and no visual changes.
- [x] 2.6 Run `git diff --stat apps/web/src/routes/_app.tsx` — confirm exactly 2 lines changed (both class additions), well under the ≤ 4 line target.

## Notes

- No TDD tasks: this is a pure CSS layout fix with no logic to test. Visual verification (Phase 2) is the acceptance gate.
- No spec deltas: shell layout is not in `openspec/specs/web/spec.md` (which covers bootstrap/auth/session/theme/health only).
- No domain logic touched: change is confined to the route shell in `apps/web/src/routes/_app.tsx`.
- Rollback: revert the two `w-full` class additions in the same file.

---

## Actual Tasks (final merged state)

> The following reflects the actual work done in commit `d3420bf` / PR #73.
> All tasks are verified complete — PR merged, CI green, user confirmed
> manual testing in PR body.

### Bug #1: Prevent layout flash during route transitions

**Root cause**: CSS Grid auto-placement failed during route transitions when
`<Outlet />` was briefly empty between unmount/mount. The `w-full` approach
(superseded above) was insufficient.

- [x] **1.1** Replace `md:grid md:grid-cols-[240px_1fr]` with `md:flex-row` on
      the outer container in `_app.tsx` so the content wrapper is a flex sibling
      of the sidebar, not subjected to grid auto-placement during transitions.
- [x] **1.2** Add `min-w-0` to the content wrapper div (`flex flex-col flex-1
      min-h-0` → `flex flex-col flex-1 min-h-0 min-w-0`) and to `<main>`
      (`flex-1 min-h-0 overflow-y-auto…` → `flex-1 min-h-0 min-w-0
      overflow-y-auto…`). This overrides the default `min-width: auto` for flex
      items, preventing content-forced width collapse.
- [x] **1.3** Add `staleTime: 60_000` to the `_app` route `beforeLoad` in
      the route options to cache the session check across navigations.

### Bug #2: Prevent sidebar/header disappearing on navigation

**Root cause**: 7 `window.location.assign()`/`reload()` calls caused full page
reloads (SSR re-render), unmounting the app shell until server response.

- [x] **2.1** `apps/web/src/routes/_app/fincas/$fincaId/animales.tsx` —
      Replace 3 `window.location.assign()` calls with `navigate()`:
      - `goNew` → `navigate({ to: '/fincas/${fincaId}/animales/nuevo' })`
      - `onPressAnimal` (desktop) → same pattern with animal ID
      - `onPressAnimal` (mobile) → same pattern
- [x] **2.2** `apps/web/src/routes/_app/fincas/$fincaId/animales/$animalId.tsx` —
      Replace `window.location.reload()` after delete with
      `navigate({ to: '/fincas/${fincaId}/animales' })`.
- [x] **2.3** `apps/web/src/routes/_app/fincas/$fincaId/animales/nuevo.tsx` —
      Replace `window.location.assign()` after create with
      `navigate({ to: '/fincas/${fincaId}/animales' })`.
- [x] **2.4** `apps/web/src/routes/_app/fincas/$fincaId/animales/$animalId/editar.tsx` —
      Replace `window.location.assign()` after update with
      `navigate({ to: '/fincas/${fincaId}/animales' })`.
- [x] **2.5** `apps/web/src/routes/_app/mas.tsx` — Replace
      `window.location.assign('/login')` after logout with
      `navigate({ to: '/login' })`.

### Verification

- [x] **3.1** `pnpm turbo build` — 7/7 packages, exit 0 (CI verified)
- [x] **3.2** `pnpm turbo typecheck` — 13/13 tasks, exit 0
- [x] **3.3** `pnpm test apps/web` — 1/1 vitest e2e, exit 0
- [x] **3.4** Manual verification — User confirmed in PR #73 body:
      "Probado manualmente en dev mode: layout correcto en dashboard,
      lista animales, ficha animal, nuevo animal"
- [x] **3.5** PR #73 merged — Main branch (`d3420bf`) contains the fix,
      closes #72

### Summary

| Bug | Files | Net delta |
|-----|-------|-----------|
| #1 — Layout flash | 1 (`_app.tsx`) | +8, -4 (12 lines) |
| #2 — Full page reloads | 5 route files | +17, -12 (29 lines) |
| **Total** | **6 files** | **+25, -16 (41 lines)** |
