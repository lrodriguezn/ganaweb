# Proposal: Fix Animal Form State Loss on Viewport Change

## Intent
Animal create/edit routes mount two parallel `AnimalFormScreen` instances (one per `mode`); only the visible one receives input. Resize across 768px and every typed value is discarded. Violates the expectation that the same form keeps its values when only the layout changes. Issue #59.

## Scope
### In Scope
- Render one `AnimalFormScreen` per route; detect viewport reactively via `matchMedia`.
- Make `mode` **optional** (default = media query) so the 28+ existing tests stay green.
- Stabilize the form `id` (currently `animal-form-${mode}`).
- One unit test proving state survives a viewport flip.

### Out of Scope
- Dual mounts in `animales.tsx` and `$animalId.tsx` — different components per mode, no shared form state. Bug does not exist.
- A shared `useMediaQuery` hook — inline to keep the diff small.
- Cognitive-complexity refactor (issue #62).

## Capabilities
### New Capabilities
None.

### Modified Capabilities
- `animal-crud-ui`: `AnimalFormScreen` MUST render one instance per route; in-memory form state MUST persist across 768px. Make `mode` optional.

## Approach
`packages/ui/src/ganado/animal-crud.tsx`: `mode` → `mode?: "desktop" | "mobile"`; inline `useMatchMedia`; derive `isMobile = mode === "mobile" || (mode === undefined && !matches)`; replace `const mobile = mode === "mobile"` (line 654); `formId` → `animal-form-${currentAnimalId ?? "new"}`.

`nuevo.tsx` and `editar.tsx`: drop the two `hidden md:block` / `md:hidden` wrappers; render one `<AnimalFormScreen ... />`. Test: type into `comentarios`, fire `matchMedia` change, re-assert.

## Affected Areas
| Area | Impact | Notes |
|------|--------|-------|
| `packages/ui/src/ganado/animal-crud.tsx` | Modified | Optional `mode`, reactive viewport, stable `formId` |
| `apps/web/.../animales/nuevo.tsx` | Modified | Drop dual mount (238–261) |
| `apps/web/.../animales/$animalId/editar.tsx` | Modified | Drop dual mount (309–337) |
| `packages/ui/tests/animal-ui.test.tsx` | Modified (additive) | Viewport-flip test |
| `openspec/specs/animal-crud-ui/spec.md` | Modified | Single-instance + persistence requirement |

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| SSR hydration mismatch | Low | Hook defaults to `false` (desktop) on server + first render; reuse `isHydrated` gate. |
| `jsdom` does not implement `matchMedia` | Med | Polyfill in test setup; new test stub for the `change` event. |
| Existing tests fail (`mode` now optional) | Low | `mode` stays accepted; new behavior only when `mode === undefined`. |

## Rollback Plan
Revert the PR. (1) optional `mode` + hook — revert leaves routes working with explicit `mode`; (2) drop dual mounts — revert restores buggy state; component stays backward-compatible.

## Dependencies
None.

## Success Criteria
- [ ] Resizing desktop ↔ mobile preserves every typed field (E2E + steps in `exploration.md`); `pnpm turbo test` stays green; new unit test asserts `comentarios` survives a simulated viewport change.
- [ ] No SSR hydration warning on direct load.
