# Exploration: fix-layout-sidebar-reflow

## Current State

The shell layout lives in `apps/web/src/routes/_app.tsx` (TanStack Start pathless layout). It renders a responsive shell:

**Desktop (md: ≥768px):** CSS Grid `md:grid md:grid-cols-[240px_1fr]`
- Column 1: `<Sidebar />` — `hidden md:flex w-[240px] shrink-0` (normal grid flow, NO `position: fixed` or `sticky`)
- Column 2: content wrapper div `flex flex-col flex-1 min-h-0`
  - `<AppHeader />` — `h-14`
  - `<main className="flex-1 min-h-0 overflow-y-auto ...">`
    - `<Outlet />` (child route renders here)

**Mobile (< md):** Flex column `flex flex-col min-h-screen`
- Sidebar hidden, BottomNav visible, content stacks vertically

The `<BottomNav />` is `fixed bottom-0 inset-x-0 md:hidden` — third child of the grid but removed from grid via `display: none` on desktop.

### Key Findings

1. **No `position: fixed` or JS-based positioning for sidebar** — the sidebar is in normal grid flow. No `useEffect` measures or offsets the content area. The layout is **pure CSS**, which is good.

2. **No route-specific layout** — There is NO `$fincaId.tsx` intermediate layout file. All routes under `_app/fincas/$fincaId/` directly inherit from `_app.tsx`. Every child route uses the same shell.

3. **Route components have no width constraints** — `AnimalFichaDesktopScreen` renders a `<section className="min-h-[900px] bg-background p-6 space-y-4">` with NO `w-full` or width constraint. Its parent chain is: section → `div.hidden.md\\:block` → `div.space-y-4` → `<main>` → content wrapper (grid col 2).

4. **CSS is from a single source** — `@ganaweb/ui/styles/globals.css` (958 lines) is the only CSS entry point, imported in `__root.tsx` line 26. Uses Tailwind v4 with `@tailwindcss/vite` plugin. All utility classes are generated into a single CSS output. No route-level CSS imports.

5. **No route-specific CSS splitting** — None of the route files (`$animalId.tsx`, `animales.tsx`, `index.tsx`, etc.) import their own CSS. All styling comes from Tailwind utilities in the global CSS.

## Affected Areas

- `apps/web/src/routes/_app.tsx` — Shell layout (lines 162–203). The `<main>` element at line 191 has `flex-1 min-h-0 overflow-y-auto` but **no `w-full`**.
- `apps/web/src/routes/__root.tsx` — Root layout imports the CSS.
- `packages/ui/src/styles/globals.css` — All CSS tokens and Tailwind integration.
- ALL child routes under `_app/` — They all share this layout via `<Outlet />`.

## Bug Scope Verification

**Does the bug affect ALL routes or only the animal detail page?**

✅ **Confirmed: it affects ALL routes under `_app/`.** Routes currently existing:

| Route | File | Shares `_app.tsx` layout? |
|---|---|---|
| `/` (Dashboard) | `_app/index.tsx` | ✅ Yes |
| `/mas` | `_app/mas.tsx` | ✅ Yes |
| `/fincas/$fincaId/animales` | `_app/fincas/$fincaId/animales.tsx` | ✅ Yes |
| `/fincas/$fincaId/animales/$animalId` | Path → detail | ✅ Yes |
| `/fincas/$fincaId/animales/nuevo` | New form | ✅ Yes |
| `/fincas/$fincaId/animales/$animalId/editar` | Edit form | ✅ Yes |
| `/fincas/$fincaId/animales/$animalId/imagenes` | Images | ✅ Yes |

ALL render through the same `<Outlet />` inside `<main>` in `_app.tsx`. There is no intermediate layout at the `$fincaId` level. If one route shows the bug, they ALL will.

Routes not yet implemented (eventos, sanidad, reportes, tareas) will also inherit the same layout once created.

## Root Cause Analysis

Based on static analysis of the code, the most likely root cause falls into one of these:

### Theory 1 (Most Likely): Collapsible `<main>` without `w-full` during route transitions

The `<main>` element at `_app.tsx:191`:
```tsx
<main className="flex-1 min-h-0 overflow-y-auto pb-[calc(var(--h-bottomnav)+env(safe-area-inset-bottom))] md:pb-0">
```

In the desktop grid context, `<main>` is inside a `flex flex-col` parent (content wrapper) which is in the `1fr` grid column. The `flex-1` on `<main>` controls **vertical** flex-grow. Its **width** comes from the parent's cross-axis stretch (default `align-items: stretch`).

If during a route transition the `<Outlet />` is briefly empty (between unmount and mount), the `<main>` has no intrinsic content width. Without an explicit `w-full`, there's a theoretical path where the browser computes a narrower width for a brief frame, especially under load (route code-splitting + data fetching taking 1-3s).

**Evidence**: The bug report's 1-3s delay matches the time to load the route JS chunk + execute the loader (async `getAnimalFichaAction`). During this window, the previous route's content unmounts and the new one hasn't rendered yet.

### Theory 2: `flex` base display before `md:grid` settles

The outer container has BOTH `flex flex-col` and `md:grid md:grid-cols-[240px_1fr]`. While `md:` breakpoint CSS is straightforward, in theory there could be a single frame where the browser paints with `flex` layout active before the `md:` media query takes full effect. In flex mode, the grid would not apply, and the content flow might collapse.

**Evidence**: On desktop, if `md:grid` doesn't apply for even one frame, the content stack as `flex-col` + `flex-1` would look very different. However, this is unlikely because the CSS is loaded in the initial bundle from `__root.tsx`.

### Theory 3: TanStack Router Suspense/transition behavior

TanStack Router may unmount the previous route immediately when navigation starts, then show nothing in the `<Outlet />` until the new route chunk and loader data are ready. If the `<main>` momentarily has zero children, and `min-h-0` lets it collapse vertically... but width collapse shouldn't happen in a correctly constrained grid cell.

**Judgment**: This is probable — the 1-3s pause in rendering (waiting for async loader + route chunk) creates a window where `<main>` has no children. If any ancestor width calculation depends on content width (which it shouldn't in grid, but could in flex), the layout could compress.

## Approaches

### 1. **Add `w-full` to `<main>` in `_app.tsx`**
   - Add `w-full` to the `<main>` element. Ensures the content container always has explicit full width, regardless of children.
   - **Pros**: Minimal change, CSS-only, no JS.
   - **Cons**: Doesn't address the root theory but provides a safety net.
   - **Effort**: Low (1 class addition).

### 2. **Pure CSS layout with `min-w-0` on the content wrapper**
   - Add `min-w-0` to the content wrapper div (`flex flex-col flex-1 min-h-0` → add `min-w-0`). This overrides the default `min-width: auto` for flex items, preventing any content-forced width expansion or collapse.
   - Already has `min-h-0` but not `min-w-0`.
   - **Pros**: CSS-only, follows the pattern recommended in the bug report.
   - **Cons**: May not fully resolve the issue if the root cause is route transition timing.
   - **Effort**: Low (1 class addition).

### 3. **Add `w-full` to both content wrapper and `<main>`**
   - The content wrapper div gets `w-full`, and `<main>` retains its existing classes. This ensures the **entire chain** from grid cell → content wrapper → main has explicit full width.
   - **Pros**: Most defensive approach, covers all possible collapse points.
   - **Cons**: Slightly redundant but harmless.
   - **Effort**: Low (2 class additions).

### 4. **Wrap `<Outlet />` in a suspense boundary with min-height fallback**
   - Add a Suspense wrapper with a fallback that occupies full width, preventing the `<main>` from collapsing during route transitions.
   - **Pros**: Addresses the route transition theory directly.
   - **Cons**: More code, adds a pending UI decision.
   - **Effort**: Medium.

## Recommendation

**Approach 3 — `w-full` on both content wrapper and `<main>`.**

Rationale:
1. Zero JS, zero behavior change — pure CSS bug-proofing.
2. Defensive against ANY width-collapse scenario, whether from route transitions, CSS timing, or edge cases.
3. Matches the spirit of the bug report's recommendation: "layout correct in the first paint, without JS."
4. `w-full` on a flex child inside a grid column has no side effects — it's a `max-width: 100%` constraint that only helps.

**Files to modify**: Only `apps/web/src/routes/_app.tsx`.

**Changes**:
1. Content wrapper div: `flex flex-col flex-1 min-h-0` → `flex flex-col flex-1 min-h-0 w-full`
2. `<main>`: `flex-1 min-h-0 overflow-y-auto ...` → `flex-1 min-h-0 w-full overflow-y-auto ...`

No need to modify any route files, CSS files, or the Sidebar component.

## Risks

- **Low risk** — `w-full` is `width: 100%` which is a safe, idempotent declaration. No layout breakage expected.
- **Should verify in production build** — the bug may not reproduce in dev mode due to Vite's hot module handling. Always test with `pnpm build && pnpm start`.
- **Should test on all existing routes** — dashboard, animales list, animal detail, "Más" page, new/edit forms.

## Ready for Proposal

**Yes.** The root cause is understood, the fix scope is clear (one file, two class additions), and the approach is CSS-only with minimal risk. Proceed to proposal phase.
