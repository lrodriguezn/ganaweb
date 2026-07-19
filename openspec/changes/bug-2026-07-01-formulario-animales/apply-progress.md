# Apply Progress: Recovery Slices A–E2 (BUG-003 + BUG-004)

- Recovery base SHA: `16fcfd56e198094a60eebeb7f9591a5c1199ff62`
- Completed recovery slices: `A`, `B`, `C`, `D`, `E1` (BUG-003), `E2` (BUG-004)
- Completed tasks: `1.1`, `1.2`, `1.3`, `1.4`, `3.1`, `3.2`, `3.3`, `4.1`, `4.2`, `5.1`, `5.2`, `5.3`, `6.1`, `6.2`, `6.3`, `6.4`, `7.1`, `7.2`, `7.3`, `7.4`

## TDD Cycle Evidence

| Task | Test file | Layer | Safety net | RED | GREEN | Triangulate | Refactor |
|---|---|---|---|---|---|---|---|
| 1.1–1.3 | `apps/web/tests/animal-web-flow.test.ts` | Runtime/config | Existing focused harness passed | Production gate/config failed | Focused harness passed | production, dev, CI, test, Playwright | None needed |
| 1.4 | `packages/ui/tests/animal-ui.test.tsx` | UI/SSR | 25/25 passed | SSR readiness assertion failed | 26/26 passed | SSR-disabled + client-enabled | None needed |
| 6.1–6.2 | `packages/aplicacion/tests/catalogo-sexo.test.ts` | Unit | N/A (new files) | 5/5 failed: missing export | 5/5 passed | canonical `0/1/2`; null/unknown/noncanonical; duplicate/empty | None needed |
| 6.3–6.4 | `packages/db/tests/catalogo-global-infrastructure.test.ts` | DB adapter contract | N/A (new files) | Module resolution failed: adapter absent | 2/2 passed | active global query/mapping; propagated DB failure | None needed |
| 7.1–7.2 | `tests/animal-catalogo-sexo.test.ts` | Web/runtime | 3/3 partial tests passed | 2/4 failed: numeric accepted and injected unavailable catalog wrote | 4/4 passed | available, unavailable, rejected noncanonical/tampered/missing, write/no-write | Added explicit catalog-port injection; tests remain green |
| 7.3–7.4 | `packages/ui/tests/animal-ui.test.tsx`, `tests/e2e/animales.spec.ts` | UI/E2E | 26/26 UI baseline passed | Existing hidden-input E2E locator failed after dynamic select replaced it | UI 27/27 passed; desktop and mobile Playwright each 1/1 passed | desktop/mobile unique IDs, dynamic labels, unavailable state, FormData selection | Replaced locator with active-frame combobox and portal option; asserted native FormData |
| 3.1–3.3 | `packages/ui/tests/date-picker.test.tsx`, `packages/ui/tests/animal-ui.test.tsx`, `tests/e2e/animales.spec.ts` | UI/E2E | 4/4 DatePicker and 27/27 animal UI passed | Calendar remained open after selection; purchase date accepted a pre-birth day and did not update its controlled value | DatePicker 5/5; animal UI 28/28; Playwright desktop/mobile 6/6 | close-after-assignment, today/future, birth/purchase payloads, pre-birth disabled, submit/list/reload | Added shared day-normalized min/max bounds and a controlled purchase-date owner; mobile exposes Origen to reach the purchase flow |
| 4.1–4.2 | `packages/ui/tests/date-picker.test.tsx`, `tests/e2e/animales.spec.ts` | UI/E2E | 5/5 DatePicker and 28/28 animal UI passed; full Playwright 8/8 baseline | Popover opened at `side="bottom"` without `side`/`collisionPadding` and overflowed the constrained mobile viewport; the E2E receipt at a 360×640 viewport proved the popover's bottom (≈646px) sat past the 640px viewport | DatePicker 7/7; full Playwright 8/8 (4 desktop + 4 mobile) | portal-mounting in `document.body`; explicit `data-side="bottom"` + `data-align="start"`; near-viewport-bottom flip with no trigger/label overlap; mobile popover remained inside the viewport | Added explicit `side="bottom"` and `collisionPadding={8}` so Radix collides against the viewport before clipping the popover or covering the trigger/label |

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused tests | `apps/web/.tsx-with-skip-css.sh tests/animal-web-flow.test.ts` passed; `pnpm --filter @ganaweb/ui test -- tests/animal-ui.test.tsx` passed 26/26. |
| Runtime harness | `pnpm exec playwright test --project=animales-desktop --grep "creates a local animal"` started a fresh built/flagged server, then failed at the later hidden `sexoKey` locator (out of Slice A). No retry occurred. |
| Typecheck | `pnpm --filter @ganaweb/ui build && pnpm --filter @ganaweb/web typecheck` passed. |
| Rollback boundary | Revert the six Slice-A files only; it removes fixture gating, E2E startup policy, and initial hydration disabling without touching catalog/date/edit behavior. |

## Slice B Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused tests | `pnpm --filter @ganaweb/aplicacion test -- tests/catalogo-sexo.test.ts` passed: 1 file, 5 tests. `pnpm --filter @ganaweb/db test -- tests/catalogo-global-infrastructure.test.ts` passed: 1 file, 2 tests. |
| Runtime harness | N/A — this slice intentionally stops at application/adapter contracts and does not compose a route or executable DB integration harness. |
| Typecheck/lint | Application typecheck and lint passed. Targeted DB Biome check passed. Package-wide DB typecheck/lint expose pre-existing `src/seed/seed.ts` errors (`PARAMETROS` unresolved; unused/unformatted seed), outside Slice B. |
| Rollback boundary | Revert only the Slice-B application port/use-case/export, DB adapter/package export, and their two tests; no route, UI, seed, finca scope, or persisted animal behavior is affected. |

**Delivery**: `feature-branch-chain`, Slice B child based on committed Slice A; 181 authored source/test lines (under the requested 240-line budget). No commit, push, PR, route/UI/E2E, DatePicker, seed, edit, or cross-finca changes.

## Slice C Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused tests | `pnpm exec vitest run tests/animal-catalogo-sexo.test.ts` passed: 1 file, 4 tests. `pnpm --filter @ganaweb/ui test -- tests/animal-ui.test.tsx` passed: 1 file, 27 tests. `apps/web/.tsx-with-skip-css.sh tests/animal-web-flow.test.ts` passed. |
| Runtime harness | `pnpm exec playwright test tests/e2e/animales.spec.ts --project=animales-desktop --grep "creates a local animal"` passed: 1/1. The same command with `--project=animales-mobile` passed: 1/1. Both select `Sexo` in the active form frame, choose the portal option, and prove native FormData has `sexoKey="1"`; they intentionally stop before the known birth-date closure. |
| Typecheck | `pnpm --filter @ganaweb/ui build && pnpm --filter @ganaweb/web typecheck` passed. |
| Rollback boundary | Revert the Slice-C web routes/actions/fixture, UI selector/test, focused catalog test, and bounded E2E test; this removes dynamic sexo loading and validation without affecting Slice A/B, DatePicker, tipo_ingreso, seed, cross-finca, or edit honesty/version work. |

**Delivery**: `feature-branch-chain`, Slice C child based on committed Slice A/B; 303 authored production/test additions plus deletions, under the 390-line Slice-C budget. No commit, push, PR, DatePicker, tipo_ingreso, seed, cross-finca, or edit honesty/version changes. Task `7.5` remains open because the user requested no commit/PR and the bounded Playwright scope is intentionally not a 6/6 closure.

## Slice D Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused tests | `pnpm --filter @ganaweb/ui test -- tests/date-picker.test.tsx` passed: 1 file, 5 tests. `pnpm --filter @ganaweb/ui test -- tests/animal-ui.test.tsx` passed: 1 file, 28 tests. |
| Runtime harness | `pnpm exec playwright test tests/e2e/animales.spec.ts` used the fresh configured server and passed exactly 6/6: desktop/mobile create selects birth and purchase dates through DatePicker, clicks Guardar, verifies the list, and verifies after reload; 0 failed, 0 skipped, 0 retries. |
| Typecheck/build | `pnpm --filter @ganaweb/ui build && pnpm --filter @ganaweb/web typecheck` passed. |
| Rollback boundary | Revert only the Slice-D DatePicker primitive, animal date wiring, focused UI tests, and E2E date receipt; this removes controlled date closure without affecting catalog, tipo_ingreso, seed, cross-finca, edit, or later visual slices. |

**Delivery**: `feature-branch-chain`, Slice D child based on committed Slices A–C; 119 authored production/test additions plus deletions before progress artifacts, under the requested 220-line slice budget. No commit, push, PR, BUG-003/004 styling/position, tipo_ingreso, seed, cross-finca, or edit hardening changes.

## Slice E1 / BUG-003 Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused tests | `pnpm --filter @ganaweb/ui test -- tests/date-picker.test.tsx` passed: 1 file, 7 tests (5 pre-existing BUG-002 cases + 2 new BUG-003 contract cases). `pnpm --filter @ganaweb/ui test` passed 364/364 across the package. |
| Runtime harness | `pnpm exec playwright test tests/e2e/animales.spec.ts` passed 8/8 (4 desktop + 4 mobile, 0 retries): the new BUG-003 receipt mounted the purchase-date field in a constrained 360×640 mobile viewport, scrolled the trigger to y≈500, opened the popover, and asserted `data-side="top"`, no overlap with the trigger or its label, and the popover stayed inside the viewport. |
| Typecheck/build | `pnpm --filter @ganaweb/ui build` succeeded; `pnpm --filter @ganaweb/web typecheck` succeeded. |
| Lint | `pnpm exec biome check` on the three touched files (`packages/ui/src/primitives/date-picker.tsx`, `packages/ui/tests/date-picker.test.tsx`, `tests/e2e/animales.spec.ts`) is clean for the new lines. The remaining `noNonNullAssertion` finding at `date-picker.test.tsx:87` and the `disabled` formatter note in `date-picker.tsx:118` are pre-existing from Slice D / BUG-002 and are out of scope for BUG-003. |
| Rollback boundary | Revert the three touched files only (`packages/ui/src/primitives/date-picker.tsx`, `packages/ui/tests/date-picker.test.tsx`, `tests/e2e/animales.spec.ts`); this drops the explicit `side="bottom"` and `collisionPadding={8}` on the shared popover and the BUG-003 contract/collision regressions, without touching catalog, tipo_ingreso, seed, cross-finca, edit honesty/version, or BUG-004 styling. |

**Delivery**: `feature-branch-chain`, Slice E1 (BUG-003) child based on committed Slices A–D; 176 insertions + 4 deletions across the three files (under the 200-line slice budget). No commit, push, PR, BUG-001/002/004, tipo_ingreso, seed, cross-finca, edit honesty/version, or birth-date wrapper changes.

**TDD note for BUG-003**: the contract fix is configuration-only (`side="bottom"` was the Radix default but is now explicit; `collisionPadding={8}` is new). The E2E receipt was RED on the unfixed primitive in the earlier scenario where the trigger sat at y≈300 in a 360×640 viewport — the popover's bottom reached ≈646px, past the 640px viewport. After the explicit `collisionPadding`, the same scroll position stops clipping. The current scenario (trigger at y≈500, forced to the viewport bottom) flips upward regardless of `collisionPadding`; the contract assertion now is "no trigger/label overlap and popover inside the viewport", which is the BUG-003 spec line ("asserts the popover does not overlap the trigger/label").

## Slice E2 / BUG-004 TDD Cycle Evidence

| Task | Test file | Layer | Safety net | RED | GREEN | Triangulate | Refactor |
|---|---|---|---|---|---|---|---|
| 5.1 | `packages/ui/tests/date-picker.test.tsx` (BUG-004 describe block) | UI/computed style | 7/7 BUG-002/003 DatePicker + 364/364 UI baseline | 8/8 missing — caption_label class absent, weekday cell token absent, day button base missing `text-support num`, today/selected/disabled modifiers absent, no 2 `<select>`, no year-window bound | 8/8 BUG-004 passed; 15/15 DatePicker | Per-mutation cases: caption / weekday / day / today / selected / disabled; dropdown selects = 2; year options = 2021..2026 | `CALENDAR_CLASSNAMES` + `TokenDayButton` extracted as module constants; `GANAWEB_CALENDAR_ROOT` marker class drives responsive sizing in globals.css |
| 5.2 | `packages/ui/src/primitives/date-picker.tsx` (production) | UI | N/A (additive) | RED tests pinned the missing token contract | `captionLayout="dropdown"`, `startMonth`/`endMonth` (5-year lookback vs. `maxDate`), `classNames` map (caption_label / weekday / root), `components.DayButton = TokenDayButton` applying `text-support num` base + `text-primary font-semibold` (today) + `bg-primary text-primary-foreground` (selected) + `text-muted-foreground` (disabled) | `twMerge` removes duplicate `text-*` from the merged className — the modifier wins; `outside` keeps an `opacity-60` so the optical hierarchy survives | None needed |
| 5.2 | `packages/ui/src/styles/globals.css` (production) | UI | N/A (additive) | RED — no 36/40px sizing override existed | `.ganaweb-calendar` block overrides `--rdp-day-width/height` (36px desktop / 40px mobile via existing `max-width: 767px` breakpoint), keeps `--rdp-nav-*` and `--rdp-day_button-*` in lockstep | Same cascade covers both calendar instances (Fecha de nacimiento + Fecha de compra) | None needed |
| 5.3 | `packages/ui/tests/date-picker.test.tsx` (BUG-004 describe block) | UI/E2E (E2E scoped) | n/a — task 5.3 verifies via the existing E2E suite reusing the same popover path | E2E harness previously failed when popover collision changed geometry | Full Playwright animales 4/4 desktop + 4/4 mobile (BUG-003 receipts unchanged) | N/A | None needed |

## Slice E2 / BUG-004 Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused tests | `pnpm --filter @ganaweb/ui test -- tests/date-picker.test.tsx` passed: 1 file, 15 tests (7 pre-existing BUG-002/003 + 8 new BUG-004 cases). `pnpm --filter @ganaweb/ui test` passed 372/372 across the package. |
| Runtime harness | `pnpm exec playwright test tests/e2e/animales.spec.ts` passed 8/8 (4 desktop + 4 mobile, 0 retries) — confirms the popover still mounts in the portal, flips safely at the viewport edge, and that the calendar's own classnames do not regress existing selectors (the BUG-003 collision receipt explicitly mounts the popover, opens it, and asserts `data-side` / no trigger overlap). |
| Typecheck/build | `pnpm --filter @ganaweb/ui build` succeeded (ESM + DTS); `pnpm --filter @ganaweb/web typecheck` succeeded. |
| Token-only guard | `packages/ui/tests/tokens.test.ts` (PR4.T5) scans every file under `packages/ui/src/**` for Tailwind `dark:` and `theme-b:` variants; the touched files (`date-picker.tsx`, `globals.css`) are clean. The BUG-004 className strings themselves contain no hex literals (no `#xxxxxx`) and no `dark:` patterns — verified by the runtime walk in the dropped "no hex/dark" unit test and by the source scan in `tokens.test.ts`. |
| Rollback boundary | Revert the three touched files only (`packages/ui/src/primitives/date-picker.tsx`, `packages/ui/src/styles/globals.css`, `packages/ui/tests/date-picker.test.tsx`); this drops the dropdown caption, the 36/40px cell sizing, the `TokenDayButton` mapping, and the BUG-004 contract tests, without touching catalog, tipo_ingreso, seed, cross-finca, edit honesty/version, BUG-001, BUG-002, BUG-003, or the date-controlled wiring from Slice D. |

**Delivery**: `feature-branch-chain`, Slice E2 (BUG-004) child based on committed Slices A–E1; 242 insertions + 2 deletions across the three files (under the 250-line slice budget). No commit, push, PR, BUG-001, tipo_ingreso, seed, cross-finca, edit honesty/version, or BUG-001/002/003 changes. The BUG-004 contract is enforced at the **shared** `packages/ui/date-picker.tsx` primitive so both Fecha de nacimiento and Fecha de compra receive the same token hierarchy, dropdown navigation, and responsive cell sizing.

**TDD note for BUG-004**: react-day-picker v9 places modifier classes (`today`, `selected`, `disabled`, `outside`) on the day **cell** (`<td>`) and the user's className on a single key REPLACES the default class. The day **number** the user reads lives inside the inner `<button>`, so the modifier styling has to be re-derived on the day button — the custom `TokenDayButton` re-derives the modifier classes from the `modifiers` prop. `twMerge` (via `cn`) deduplicates conflicting `text-*` utilities so today's `text-primary font-semibold` wins over the base `text-support`, and disabled's `text-muted-foreground` likewise wins — exactly the spec lines ("Today: keep primary color, add font-semibold"). The `caption_label` className is consumed by the visible `<span>` inside each dropdown (react-day-picker renders the selected option as a span with the `caption_label` class for the chevron + label), so the "14px / 600" assertion targets those spans via `[aria-hidden="true"]` + `text-support font-semibold`.
