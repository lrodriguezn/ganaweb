# Apply Progress: fix-layout-sidebar-reflow

## Status

**Phase 1 (Implementation)**: Complete
**Phase 2 (Verification)**: Build verified (2.1); manual visual checks (2.2–2.5) pending for user.

## Completed Tasks

### Phase 1: Implementation

- [x] **1.1** Content wrapper div (L172): added `w-full` → `flex flex-col flex-1 min-h-0 w-full`
- [x] **1.2** `<main>` element (L191): added `w-full` → `flex-1 min-h-0 w-full overflow-y-auto pb-[calc(var(--h-bottomnav)+env(safe-area-inset-bottom))] md:pb-0`

### Phase 2: Verification

- [x] **2.1** `pnpm turbo build` — **PASSED**. All 7 packages built successfully (7/7 tasks, 3 cached, 4 rebuilt). No type or lint errors. Build time: 58.3s.
- [ ] **2.2** Manual: dashboard `/` under Slow 3G — pending user verification
- [ ] **2.3** Manual: `/fincas/{fincaId}/animales` under Slow 3G — pending user verification
- [ ] **2.4** Manual: `/fincas/{fincaId}/animales/{animalId}` under Slow 3G — pending user verification
- [ ] **2.5** Manual: spot-check `/mas`, `nuevo`, `editar`, `imagenes` at normal speed — pending user verification
- [x] **2.6** `git diff --stat` — **2 lines changed** (both class additions), well under ≤ 4 line target.

## Git Diff Summary

```diff
-      <div className="flex flex-col flex-1 min-h-0">
+      <div className="flex flex-col flex-1 min-h-0 w-full">

-        <main className="flex-1 min-h-0 overflow-y-auto pb-[calc(var(--h-bottomnav)+env(safe-area-inset-bottom))] md:pb-0">
+        <main className="flex-1 min-h-0 w-full overflow-y-auto pb-[calc(var(--h-bottomnav)+env(safe-area-inset-bottom))] md:pb-0">
```

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm turbo build` — 7/7 tasks successful, 0 failures, exit 0 |
| Runtime harness command/scenario and exact result | N/A — pure CSS layout fix, no runtime boundary; visual verification requires manual browser testing under Slow 3G |
| Rollback boundary | Revert 2 class additions (`w-full`) in `apps/web/src/routes/_app.tsx` lines 172 and 191 |

## Files Changed

| File | Action | Lines Changed |
|------|--------|---------------|
| `apps/web/src/routes/_app.tsx` | Modified | L172, L191 (2 lines) |

## Rollback

```bash
git checkout apps/web/src/routes/_app.tsx
```

Single file, no migrations, no data impact.

## Issues

None.

## Deviations from Design

None — implementation matches design exactly.

## Remaining Tasks (for user)

- [ ] 2.2–2.5: Manual visual verification across all `_app/` routes under Slow 3G network throttling in a browser.
