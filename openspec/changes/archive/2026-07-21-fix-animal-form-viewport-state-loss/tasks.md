# Tasks: Fix Animal Form State Loss on Viewport Change

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~50 (net negative) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr-default |
| Chain strategy | size-exception (not needed) |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | One-instance reactive form + drop dual mounts + viewport-flip test | PR 1 | `pnpm --filter @ganaweb/ui test animal-ui` | Manual: open `/fincas/:id/animales/nuevo`, type, resize past 768px | Revert restores dual-mount + optional `mode`; routes fall back to explicit prop |

## Phase 1: Foundation — Make `AnimalFormScreen` viewport-reactive

- [x] 1.1 In `packages/ui/src/ganado/animal-crud.tsx:504`, change `mode: "desktop" | "mobile"` to `mode?: "desktop" | "mobile"` on `AnimalFormScreenProps`.
- [x] 1.2 Add an inline `useMatchMedia("(min-width: 768px)")` hook inside the file (above `AnimalFormScreen`) that subscribes to `change` events; return SSR-safe default `true` and unsubscribe on unmount.
- [x] 1.3 Replace `const mobile = mode === "mobile"` (line 654) with `const mobile = mode === "mobile" || (mode === undefined && !mediaMatches)`.
- [x] 1.4 Change `formId = \`animal-form-${mode}\`` (line 712) to `\`animal-form-${currentAnimalId ?? "new"}\`` — no `mode` segment, so the form element is reused across variants.
- [x] 1.5 Keep `isHydrated` gate (`setIsHydrated(true)` on first effect) so the pre-hydration render stays desktop — no SSR mismatch.

## Phase 2: Core Implementation — Drop dual-mount in routes

- [x] 2.1 In `apps/web/src/routes/_app/fincas/$fincaId/animales/nuevo.tsx:238–261`, replace the two `<div hidden md:block>` / `<div md:hidden>` wrappers with a single `<AnimalFormScreen ... />` (no `mode` prop). Keep outer `<div className="mx-auto max-w-4xl">`.
- [x] 2.2 In `apps/web/src/routes/_app/fincas/$fincaId/animales/$animalId/editar.tsx:309–337`, same change for the edit route — single `<AnimalFormScreen ... />` without `mode`.

## Phase 3: Testing — Viewport-flip regression

- [x] 3.1 In `packages/ui/tests/animal-ui.test.tsx`, add a `matchMedia` polyfill at the top of the file (or a per-test `installMatchMedia` helper) that exposes `addEventListener` / `removeEventListener` and lets tests dispatch a `change` event — follow the pattern in `metric-hero-mobile-only.test.ts`.
- [x] 3.2 Add test "preserves comentarios and fechaNacimiento when viewport flips desktop → mobile": render `<AnimalFormScreen />` (no `mode`), type into `comentarios` and `fechaNacimiento`, fire a `matchMedia` `change` to mobile width, assert values still present and `data-testid="op-f-400233"`.
- [x] 3.3 Add test "preserves state on mobile → desktop flip": same flow inverted; assert `data-testid="op-f-400191"` after resize, and `formId` is `animal-form-new` (or `animal-form-{id}` in edit) in both states.
- [x] 3.4 Add test "explicit `mode` prop overrides the media query": render with `mode="mobile"`, dispatch a desktop `change` event, assert the mobile variant is still rendered and the `matchMedia` listener is bypassed.
- [x] 3.5 Add test "SSR markup is desktop": `renderToString(<AnimalFormScreen ... />)` (no `mode`) must produce the desktop `aria-label` and `data-testid`.

## Phase 4: Verification

- [x] 4.1 Run `pnpm turbo test` (or `pnpm --filter @ganaweb/ui test` and `pnpm --filter @ganaweb/web test`) — all green, including the four new scenarios.
- [x] 4.2 Run `pnpm biome check .` and `pnpm biome format --write .` on the touched files.
- [x] 4.3 Manual E2E: open `apps/web` dev server, navigate to `/fincas/:id/animales/nuevo`, type values into `Código`, `Comentarios`, and pick an `Origen`, resize the window across 768px in both directions — every field must keep its value, submit payload must include the typed values. Repeat on `/fincas/:id/animales/:animalId/editar`.
- [x] 4.4 Confirm no React hydration warning in the browser console on direct load of either route.
