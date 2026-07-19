## Exploration: Animal form bugs BUG-001 through BUG-004

### Current State

Investigation was performed in order against the source report and the dedicated worktree at commit `5e0a8f4`.

- **BUG-001 — not reproduced / reported root cause not confirmed.** `packages/ui/src/primitives/select-con-creacion.tsx` already uses `Command.Item onSelect`, closes after `onChange`, emits the option value, and filters through a value-to-label index. The existing primitive regression test covers search, click selection, displayed label, and emitted id. No evidence supports the report's `CommandItem onClick`, lowercase-id, premature-unmount, or missing-form-state hypotheses in this checkout. The form has four shared consumers: raza, color, calidad, and lugarCompra. Mobile and desktop both render `AnimalFormScreen` and therefore the same primitive.
- **BUG-002 — root cause confirmed for purchase date wrapper.** `DatePicker` correctly wires `DayPicker onSelect` to its `onChange` prop and has a hidden ISO date input. However, `FechaCompraField` passes `onChange={() => {}}` and keeps `value={initialValue}`, so a calendar click cannot update the trigger or hidden input after mount. The shared `DatePicker` also compares days against `new Date()` through `isAfter`; this should be regression-tested for today and future dates before changing the matcher. Birth date currently passes a live state setter and is a different path.
- **BUG-003 — configuration gap confirmed, geometry symptom not fully reproduced.** Both date pickers use a Radix portal and `z-50`, so the non-portal and missing-z-index hypotheses are not supported. Their `Popover.Content` has only `align="start"` and `sideOffset`; it does not explicitly set `side`, `collisionPadding`, or a trigger-safe collision policy. Runtime visual behavior still needs Playwright evidence at multiple scroll positions; Radix may legitimately flip upward near the viewport edge.
- **BUG-004 — styling/configuration gap confirmed.** `DatePicker` delegates default `react-day-picker` caption and cell classes and does not set the requested token classes, `captionLayout`, `startMonth`, or `endMonth`. The shared primitive is the correct remediation point for both dates and both responsive form modes.

### Affected Areas

- `packages/ui/src/primitives/select-con-creacion.tsx` — shared searchable catalog control and current BUG-001 behavior.
- `packages/ui/src/primitives/date-picker.tsx` — shared calendar selection, date constraints, portal, and calendar styling for BUG-002–004.
- `packages/ui/src/ganado/animal-crud.tsx` — desktop/mobile form composition; `FechaCompraField` contains the confirmed no-op callback; `FechaNacimientoField` is the comparison path.
- `apps/web/src/routes/_app/fincas/$fincaId/animales/nuevo.tsx` and `.../$animalId/editar.tsx` — route wiring and payload/error mapping; verify FormData IDs remain unchanged.
- `packages/ui/tests/select-con-creacion.test.tsx` — existing BUG-001 primitive regression coverage.
- `packages/ui/tests/date-picker.test.tsx` — existing selection, future-day, keyboard, and display coverage; it does not cover the purchase wrapper, today boundary, portal geometry, or BUG-004 classes.
- `packages/ui/tests/animal-ui.test.tsx` — form-level desktop/mobile rendering and conditional purchase block coverage, but no purchase-date selection regression.
- `tests/e2e/animales.spec.ts` and `apps/web/tests/animal-create-e2e.test.tsx` — existing E2E/integration harnesses; the Playwright suite currently does not exercise catalog selection or date purchase submission.
- `openspec/config.yaml` — requires Vitest/Playwright, strict TDD, token-only styling, and `pnpm turbo test/build`; current capability flags say the configured runners are not yet available.

### Approaches

1. **Shared primitive plus wrapper regression tests (recommended)** — fix the confirmed purchase wrapper, harden `DatePicker` behavior/configuration once in `packages/ui`, and add primitive plus form/E2E tests for both responsive modes.
   - Pros: one source of truth, respects IA-003, preserves desktop/mobile parity, smallest blast radius.
   - Cons: requires explicit visual/portal assertions and careful date timezone handling.
   - Effort: Medium

2. **Field-local fixes** — patch only `FechaCompraField` and duplicate calendar styling/behavior in the form.
   - Pros: narrow immediate diff.
   - Cons: violates the report's shared-control requirement, risks birth-date drift, and leaves other consumers/regressions exposed.
   - Effort: Medium, with higher maintenance risk

### Recommendation

Use approach 1. Do not close BUG-001 until a route-level regression test proves all four catalog fields in desktop and mobile; the primitive test alone proves the current implementation, not the reported production symptom. Fix BUG-002 first by making purchase date controlled (or by lifting the value state into the purchase block), then harden the shared `DatePicker` matcher and selection contract. Apply BUG-003 and BUG-004 in the same shared primitive only after the date selection regression is green. Every bug must have its own verification test before closure.

Use `force-chained` delivery with one bug-focused PR/work unit per PR, keeping each behavior and its tests together and counting additions plus deletions. Suggested order:

1. **PR1 / BUG-001** — prove/fix catalog selection contract and desktop/mobile E2E coverage.
2. **PR2 / BUG-002** — controlled purchase-date value, today/future/birth-date constraints, payload regression.
3. **PR3 / BUG-003** — portal/collision/anchor behavior with scroll-position visual regression.
4. **PR4 / BUG-004** — token-only calendar typography/sizing and visual coverage across the 10 themes.

Each PR should remain below 400 changed lines, state its start/end and dependency on the previous PR, and use a Conventional Commit and PR title/body containing the exact identifier `BUG-001` through `BUG-004`. CI or review automation should reject a bug PR/commit without its identifier; the final PR descriptions should link the source report and name the regression test that closes the bug. No `size:exception` is currently justified.

### Risks

- The current checkout already contains partial fixes relative to the report; treating BUG-001 as still broken without a failing reproduction would violate IA-001.
- Date comparisons can vary with timezone/time-of-day; tests must freeze time and assert the local day boundary, especially “today selectable.”
- Radix collision behavior may intentionally open upward near the viewport; BUG-003 must assert that the trigger is not covered, not blindly require `side="bottom"` in every viewport.
- The configured test capability flags report unit, E2E, type-check, lint, and coverage runners unavailable; this must be resolved or explicitly recorded before verification.
- Mobile may use a different catalog presentation in future; regression tests must assert the selection contract, not assume Popover markup.

### Ready for Proposal

Yes, with an explicit proposal scope that preserves the four-bug order, treats BUG-001 as unconfirmed pending route-level reproduction, and makes each bug's regression test a completion gate. The next phase should define exact Given/When/Then scenarios and the CI/PR identifier enforcement mechanism before implementation.
