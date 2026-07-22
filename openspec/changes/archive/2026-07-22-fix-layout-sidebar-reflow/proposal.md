# Proposal: fix-layout-sidebar-reflow

## Intent

On first paint of every authenticated route under `_app/` (dashboard, animal list, detail, "Más", new/edit/imágenes), page content is briefly compressed into the sidebar column (~230px) for 1–3 seconds, then jumps to its correct position after reflow. The fix must restore correct first-paint layout without JS, animations, or behavioral changes.

## Scope

### In Scope

- Add `w-full` to content wrapper (L172) and `<main>` (L191) in `apps/web/src/routes/_app.tsx`.
- Verify the fix on every existing `_app/` route under production build.

### Out of Scope

- Sidebar behavior, layout redesign, animations/transitions, Suspense fallbacks.
- Route components, CSS, or shared package changes.
- Mobile layout (bug is desktop-only).

## Capabilities

> Contract with sdd-spec. No spec-level behavior changes.

### New Capabilities

None.

### Modified Capabilities

None — the shell layout is not in `openspec/specs/web/spec.md` (covers bootstrap, auth, session, theme, health). Pure CSS bug fix stays out of spec scope.

## Approach

Apply `w-full` to two elements in the desktop grid column so the chain (cell → wrapper → main) holds full width even when `<Outlet />` is briefly empty during transitions.

- **Content wrapper** (L172): `flex flex-col flex-1 min-h-0` → `flex flex-col flex-1 min-h-0 w-full`
- **`<main>`** (L191): `flex-1 min-h-0 overflow-y-auto …` → `flex-1 min-h-0 w-full overflow-y-auto …`

No JS, no new dependencies. `w-full` is idempotent inside a `1fr` grid cell — it cannot shrink or break the layout.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/web/src/routes/_app.tsx` | Modified | Two class additions on L172 and L191. |

All 7 child routes under `_app/` benefit transitively (shared shell): dashboard, `/mas`, animales list, detail, nuevo, editar, imágenes.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Child route overrides width | Low | Exploration: no child route sets an outermost width constraint. |
| Bug does not reproduce in dev mode | Medium | Verify in production build (`pnpm turbo build && pnpm start`); HMR may mask timing. |
| Other latent collapse points | Low | `w-full` at both chain boundaries covers descendant-driven collapse. |

## Rollback Plan

Revert the two `w-full` class additions in `apps/web/src/routes/_app.tsx` (L172, L191). Single-file revert, no migrations, no data impact.

## Dependencies

None.

## Success Criteria

- [ ] No content compression into the sidebar column on first paint of any `_app/` route.
- [ ] `pnpm turbo build` succeeds with no type or lint regressions.
- [ ] Manual verification across all 7 existing `_app/` routes shows correct first-paint layout.
- [ ] Slow 3G throttle: no 1–3s reflow jump observed.
- [ ] `git diff` ≤ 4 lines.

## Related

- GitHub issue: #72 (sidebar reflow bug on first paint)
- Exploration: `openspec/changes/fix-layout-sidebar-reflow/exploration.md`

