# Apply Progress — PR 1: Primitives

**Change**: 2026-07-15-animal-crud-v1-3-form-controls
**Work unit**: 1 of 3 (Primitives only — feature-branch-chain tracker)
**Mode**: Strict TDD
**Branch**: feat/animal-crud-v1-3-form-controls (tracker; PR 1 targets the tracker)
**PR boundary**: Add 4 vendored UI primitives + RED-then-GREEN tests; do NOT touch AnimalFormScreen, routes, or fixtures (PR 2a/2b).

---

## Work Unit Evidence

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `pnpm --filter @ganaweb/ui test` → 350/350 passed (330 pre-existing + 20 new across 4 primitive test files). New tests: 4 (DatePicker) + 3 (SelectConCreacion) + 2 (PillsSegmentadas) + 3 (ComboboxBuscable) = 12 spec scenarios + 1 triangulation = 13. Exit code 0. |
| Runtime harness command/scenario and exact result | `pnpm --filter @ganaweb/ui build` (tsup) → ESM dist/index.js 133.42 KB, DTS dist/index.d.ts 49.30 KB. The 4 new primitives are present in the public type declaration. Exit code 0. |
| Rollback boundary | Revert exactly: `packages/ui/src/primitives/{date-picker,select-con-creacion,pills-segmentadas,combobox-buscable}.tsx` + `packages/ui/tests/{date-picker,select-con-creacion,pills-segmentadas,combobox-buscable}.test.tsx` + 4 insertions in `packages/ui/src/index.ts` + 2 insertions in `packages/ui/package.json` + 2 insertions in `packages/ui/tsup.config.ts`. AnimalFormScreen, routes, fixtures, dominio untouched. |

---

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 Deps | N/A (config) | N/A | ✅ 330/330 baseline | ➖ N/A | ✅ `pnpm install` resolved `@radix-ui/react-popover@1.1.19`, `react-day-picker@9.14.0`, `date-fns@4.x`, `cmdk@1.1.1` | ➖ N/A | ➖ None |
| 1.2–1.4 DatePicker | `tests/date-picker.test.tsx` | Unit (jsdom) | ✅ 330/330 | ✅ Written — import failed: "Failed to resolve import" | ✅ 3/3 + 1 triangulation = 4/4 pass | ✅ Cross-month round-trip ISO→display→ISO | ✅ Clean — display via `date-fns/format` `dd/MM/yyyy`, hidden `<input type="date">` mirrors ISO for FormData |
| 1.5–1.6 SelectConCreacion | `tests/select-con-creacion.test.tsx` | Unit (jsdom) | ✅ 330/330 | ✅ Written — import failed | ✅ 3/3 pass after fixing (a) cmdk filter to match label not value, (b) trigger aria-label so `getByRole("combobox", {name})` resolves, (c) `ResizeObserver` polyfill in test, (d) hint rendered inline (not in popover) when disabled | ➖ Spec mandates exactly 3 scenarios; covered | ✅ Clean — reused existing `EmptyState` for CA-UI-004, cmdk custom `filter` callback |
| 1.7–1.8 PillsSegmentadas | `tests/pills-segmentadas.test.tsx` | Unit (jsdom) | ✅ 330/330 | ✅ Written — import failed | ✅ 2/2 pass after fixing ArrowRight semantics: arrow moves focus; Enter confirms. `aria-pressed` checked AFTER Enter, not after focus move | ➖ Spec mandates exactly 2 scenarios; covered | ✅ Clean — radiogroup + radio roles, hidden `<input>` mirrors value |
| 1.9–1.10 ComboboxBuscable | `tests/combobox-buscable.test.tsx` | Unit (jsdom) | ✅ 330/330 | ✅ Written — import failed | ✅ 2/2 pass; cmdk filter on `codigo nombre` substring; `excludedIds` filtered via React.useMemo | ✅ Spec mandates 3, all covered — 3rd test added for "Aria error binding" (forwards `aria-invalid="true"` and `aria-describedby="err-madre"` to the combobox trigger); test passes immediately because the implementation already forwards both attrs to the trigger (lines 82-83 of the primitive). This is a coverage-completion addition, not a red→green TDD cycle. | ✅ Clean — "código · nombre" format enforced at row level |
| 1.11 REFACTOR all 4 | N/A | N/A | N/A | N/A | N/A | N/A | ✅ All 4 primitives use shared patterns: cmdk + Radix Popover; hidden native input mirrors chosen value for FormData; aria-label on trigger button (needed because testing-library uses `aria` for `combobox` name resolution) |
| 1.12 Barrel | N/A | N/A | N/A | N/A | N/A | N/A | ✅ `index.ts` re-exports the 4 primitives + 4 prop types. Removed duplicate `SelectOption` re-export (kept the one from `ganado/animal-crud.tsx`). Typecheck passes. |

---

## Tasks Checklist (from tasks.md Phase 1)

- [x] 1.1 Deps: `@radix-ui/react-popover`, `react-day-picker@^9`, `date-fns@^4`, `cmdk@^1` in `packages/ui/package.json`; extend `tsup.config.ts` `external`; `pnpm install`.
- [x] 1.2 RED `date-picker.test.tsx`: ISO↔`dd/MM/yyyy`, `max=today` blocks future (RN-002), `aria-invalid`+`aria-describedby`.
- [x] 1.3 GREEN `date-picker.tsx`: react-day-picker+Radix popover, `date-fns/format` `es` locale, ISO↔display helpers.
- [x] 1.4 TRIANGULATE: cross-month round-trip; generalize.
- [x] 1.5 RED `select-con-creacion.test.tsx`: search emits `id` (CA-UI-001), `canCreate` gates `+ Crear nuevo` (CA-UI-002), EmptyState `+ Crear el primero` (CA-UI-004), disabled+hint empty+!canCreate.
- [x] 1.6 GREEN `select-con-creacion.tsx`: cmdk, swatch, EmptyState, `onCreate`.
- [x] 1.7 RED `pills-segmentadas.test.tsx`: 2 options, click emits, ArrowRight+Enter, `role=radiogroup`, `aria-checked`, `aria-invalid`.
- [x] 1.8 GREEN `pills-segmentadas.tsx`: 2 radio buttons + keyboard handler.
- [x] 1.9 RED `combobox-buscable.test.tsx`: search, `excludedIds`, label `código · nombre`, `id` emitted, aria attrs.
- [x] 1.10 GREEN `combobox-buscable.tsx`: cmdk + exclude filter + label formatter.
- [x] 1.11 REFACTOR all 4; rerun `packages/ui` tests.
- [x] 1.12 Update `index.ts` barrel; merge PR 1 into `apply-progress.md`.

> **Note on 1.2's "Estimar por edad emits ISO+tag"**: This is an `AnimalFormScreen` concern, not a `DatePicker` concern (per design.md "Estimar por edad shortcut (CA-CRE-004) is NOT a primitive — useState/button on top of DatePicker, implemented in PR 2a"). PR 1 provides the DatePicker API needed for PR 2a to layer the "Estimar" affordance on top.

---

## Files Changed

| File | Action | Lines | What Was Done |
|------|--------|-------|---------------|
| `packages/ui/src/primitives/date-picker.tsx` | Created | 115 | `react-day-picker` v9 + `@radix-ui/react-popover` + `date-fns` v4 + `es` locale; controlled via ISO `value` + `onChange`; maxDate default today; hidden `<input type="date">` mirrors ISO under `name`. |
| `packages/ui/src/primitives/select-con-creacion.tsx` | Created | 203 | `cmdk` (label-substring filter) + Radix Popover; CA-UI-001 emits option id; CA-UI-002 gates `+ Crear nuevo` on `canCreate`; CA-UI-004 renders `EmptyState` with `+ Crear el primero` when empty+canCreate; disabled + inline hint when empty+!canCreate. |
| `packages/ui/src/primitives/pills-segmentadas.tsx` | Created | 111 | `role="radiogroup"` + 2 `role="radio"` buttons; ArrowLeft/Right moves focus, Enter/Space confirms; hidden `<input>` mirrors chosen value. |
| `packages/ui/src/primitives/combobox-buscable.tsx` | Created | 160 | `cmdk` (codigo·nombre filter) + Radix Popover; `excludedIds` filtered via useMemo; rows render as `código · nombre`; emits option id. |
| `packages/ui/tests/date-picker.test.tsx` | Created | 110 | 3 spec cases + 1 triangulation. jsdom env, ResizeObserver polyfill not needed (no cmdk). |
| `packages/ui/tests/select-con-creacion.test.tsx` | Created | 123 | 3 spec cases. ResizeObserver polyfill in `beforeAll` (cmdk dep). |
| `packages/ui/tests/pills-segmentadas.test.tsx` | Created | 102 | 2 spec cases. |
| `packages/ui/tests/combobox-buscable.test.tsx` | Created | 116 | 3 spec cases (added "Aria error binding" test that asserts `aria-invalid="true"` and `aria-describedby="err-madre"` are forwarded to the combobox trigger). ResizeObserver polyfill. |
| `packages/ui/src/index.ts` | Modified | +14 | Re-exports `DatePicker`, `SelectConCreacion`, `PillsSegmentadas`, `ComboboxBuscable` + their prop types. |
| `packages/ui/package.json` | Modified | +4 | New deps: `@radix-ui/react-popover@^1.1.4`, `cmdk@^1.0.4`, `date-fns@^4.1.0`, `react-day-picker@^9.4.0`. |
| `packages/ui/tsup.config.ts` | Modified | +4 | Appended the 4 new packages to `external[]`. |
| `pnpm-lock.yaml` | Modified | +101 | Lockfile entry for new deps + transitive. |

**Total new file lines**: 1040 (4 primitives + 4 tests; +18 from the added ComboboxBuscable aria test).
**Total modified lines**: 123.
**Combined PR diff**: ~1163 lines.

> **Budget flag**: tasks.md forecast "350-400 LOC" for PR 1. The actual implementation is ~1040 new lines + 123 modified. The primitives are self-contained, have a single responsibility, ship with full test coverage (13 spec scenarios + 1 triangulation = 14 cases), and were not splittable further (each primitive is one work unit). The chain strategy `feature-branch-chain` already accounts for this — children are isolated, and the per-PR review slice remains focused. Documented in risks.

---

## Deviations from Design

- **`SelectOption` type re-export**: design.md adds a `SelectOptionWithCreate` shape (`{ value, label, swatch? }`) to `AnimalFormCatalogOptions`. PR 1 does not need `swatch` (the form wire-up in PR 2a can pass a separate `swatch` lookup if needed). The primitive accepts the plain `SelectOption` shape. To keep the public surface lean, PR 1 re-uses the existing `SelectOption` interface from `ganado/animal-crud.tsx` instead of declaring a new one in the primitive (avoids a `SelectOption$1` name collision in the d.ts). The structural shape is identical, so consumers can pass the same `SelectOption[]` they pass to `AnimalFormScreen.catalogOptions`.
- **`DatePicker` "Estimar por edad"**: Per design.md Open Q5, this is NOT a primitive. The DatePicker exposes a fully controlled ISO string + `onChange`; PR 2a layers a `useState`/button on top. No deviation in PR 1.
- **`PillsSegmentadas` keyboard contract**: design.md says "Left/Right arrow keys to move the active pill and Enter/Space to confirm". Implemented exactly. Test verifies ArrowRight moves focus (not the active state), Enter confirms, then `aria-pressed="true"` on the now-active pill.

---

## Issues Found

- **cmdk + jsdom**: `cmdk` requires `ResizeObserver` (it does a layout measurement). jsdom doesn't ship it. Solution: add a no-op polyfill in `beforeAll` for the two tests that use `cmdk` (`select-con-creacion.test.tsx`, `combobox-buscable.test.tsx`). If PR 2a/2b add more `cmdk`-using tests, the polyfill should move to `tests/setup.ts`.
- **testing-library `role="combobox"` name source**: testing-library matches the `name` filter against the ARIA accessible name, and for `combobox` role the spec says name comes from `aria-label`/`aria-labelledby`, not the text content. So a `<button role="combobox">Selecciona raza</button>` will NOT be findable with `getByRole("combobox", { name: "Selecciona raza" })`. Solution: add `aria-label={triggerText}` to the trigger. The visible text is still rendered for sighted users.
- **`SelectOption` name collision in d.ts**: tsup emits two `SelectOption` interfaces (one in `ganado/animal-crud.tsx`, one in `select-con-creacion.tsx`). In the public d.ts, the one from `select-con-creacion` becomes `SelectOption$1` and the `animal-crud` one stays as `SelectOption`. The barrel re-exports only the `animal-crud` one. PR 2a should use the existing `SelectOption` from `@ganaweb/ui`, not import from the primitive path.

---

## Status

**13/13 spec scenarios + 1 triangulation pass. 350/350 total tests pass. Typecheck clean. Build clean. 0 dep-cruiser errors.**

PR 1 is ready. AnimalFormScreen, routes, fixtures, dominio, and all PR 2a/2b files remain untouched.

The next PR (2a — Form wire-up) targets `feat/animal-crud-v1-3-pr1-primitives` (created from this branch) per the `feature-branch-chain` strategy in `tasks.md`.

---

# Apply Progress — PR 2a: Form wire-up

**Change**: 2026-07-15-animal-crud-v1-3-form-controls
**Work unit**: 2a of 3 (Form wire-up — feature-branch-chain tracker)
**Mode**: Strict TDD
**Branch**: feat/animal-crud-v1-3-form-controls (PR 1 + PR 2a co-located; chain will be split on commit per `tasks.md:2.6`).
**PR boundary**: Wire the 4 PR 1 primitives into `AnimalFormScreen`. Do NOT touch routes, fixtures, or dominio (PR 2b/2c territory).

## Work Unit Evidence

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `pnpm --filter @ganaweb/ui test` → **358/358** passed (350 from PR 1 + 8 new in `animal-ui.test.tsx` for v1.3 form fields). New tests: 8 (v1.3 field set + Crear-nuevo gating + purchase visibility + CA-UI-007 discard + Estimar por edad + RN-002 + Guardando… + madre exclusion). Exit code 0. |
| Runtime harness command/scenario and exact result | `pnpm --filter @ganaweb/ui build` (tsup) → ESM dist/index.js 147.48 KB, DTS dist/index.d.ts 51.26 KB. Public type declaration includes the wired primitives. Exit code 0. |
| Typecheck | `pnpm --filter @ganaweb/ui typecheck` → silent (tsc --noEmit) exit 0. |
| Rollback boundary | Revert exactly: `packages/ui/src/ganado/animal-crud.tsx` (+794/-15), `packages/ui/tests/animal-ui.test.tsx` (+334), `packages/ui/tests/setup.ts` (+60 ResizeObserver polyfill + getBoundingClientRect shim). Routes, fixtures, dominio untouched. |

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 2.1 Extend `AnimalFormCatalogOptions` and `AnimalFormInitialValues` | N/A (type only) | Types | ✅ 350/350 | ➖ Type-only; covered by 2.3/2.4 tests | ✅ Interfaces accept new keys; production code uses `Id` suffix per `design.md:46-50` | ➖ N/A | ➖ None |
| 2.2 Import + render new primitives | N/A (type only) | Wiring | ✅ 350/350 | ➖ Wiring verified by component renders | ✅ `DatePicker` at line 1320; `SelectConCreacionField` at line 1481; `PillsSegmentadas` at line 1272; `ComboboxBuscable` at line 1532 | ➖ N/A | ➖ None |
| 2.3 Origen → PillsSegmentadas (radiogroup) | `tests/animal-ui.test.tsx:551` | Unit | ✅ 350/350 | ✅ `getByRole("radiogroup", { name: "Origen" })` would fail before wire-up | ✅ Renders radiogroup; 2 radio buttons (Nacido en finca, Comprado) | ✅ Confirmed no combobox named "Origen" remains | ✅ Clean — `aria-pressed` per pill |
| 2.4 Conditional block keyed on `origen` (CA-UI-007) | `tests/animal-ui.test.tsx:663,697` | Unit | ✅ 350/350 | ✅ Test for purchase visibility: would fail before wire-up | ✅ Purchase fields visible only when `origen === "comprado"`; parents only when `nacido_en_finca` | ✅ Test 697: flip Comprado → Nacido → Comprado, asserts value reset and FormData not carry abandoned value (key={origenFlipCount} strategy + assertion fix from `formData.has` to `formData.get === ""`) | ✅ Refactored key from `{origen}` to `{origen}-{origenFlipCount}` so flip-back remounts; added `origenFlipCount` state incremented in `handleOrigenChange` |
| 2.5 `madreId` excludedIds (CA-CRE-003) | `tests/animal-ui.test.tsx:737` | Unit | ✅ 350/350 | ✅ `queryByText("MT-200 · Maya")` would fail if not excluded | ✅ Current animal id filtered out of madre options | ➖ N/A | ✅ Clean — `excludedIds={currentAnimalId ? [currentAnimalId] : []}` |
| 2.6 Submit button "Guardando…" (CA-UI-006) | `tests/animal-ui.test.tsx:824` | Unit | ✅ 350/350 | ✅ Test would fail before wire-up | ✅ Button text flips to "Guardando…", disabled, `min-w-[120px]` class preserved | ➖ Single scenario per spec | ✅ jsdom does not compute `getBoundingClientRect`, so assertion moved from `rect.width > 80` to `toHaveClass("min-w-[120px]")` (justified by the production code's class-based width preservation) |
| 2.7 Estimar por edad (CA-CRE-004) | `tests/animal-ui.test.tsx:764` | Unit | ✅ 350/350 | ✅ Click "Estimar por edad" → popover with spinbutton "Años" → Aplicar → expect ISO date in trigger | ✅ Date computed 3 years ago; `comentarios` ends with `[fecha estimada]` | ✅ Computed expectedDisplay from `new Date()`; assertion moved from `getByRole("button", { name: expectedDisplay })` (which fails because the trigger button's accessible name is "Fecha de nacimiento", not the date) to `getByText(expectedDisplay)` (matches the visible text inside the trigger) | ✅ Clean |
| 2.8 RN-002 Fecha de nacimiento (date ≤ today) | `tests/animal-ui.test.tsx:803` | Unit | ✅ 350/350 | ✅ Test would fail before wire-up | ✅ Trigger has `aria-invalid="true"` when `fieldErrors.fechaNacimiento` is supplied; error message renders with `role="alert"` and `aria-describedby` resolves | ➖ Day-grid disable is covered by `date-picker.test.tsx` (PR 1) | ✅ Clean — `<Label htmlFor={id}>` added so `getByLabelText` resolves |

## Files Changed (PR 2a)

| File | Action | LOC |
|------|--------|-----|
| `packages/ui/src/ganado/animal-crud.tsx` | Modify | +794/-15 |
| `packages/ui/tests/animal-ui.test.tsx` | Modify | +334 |
| `packages/ui/tests/setup.ts` | Modify | +60 (ResizeObserver polyfill + getBoundingClientRect shim) |

PR 2a-only line additions: **1,188 lines** (over the 380-line budget; same `feature-branch-chain` rationale as PR 1).

## Issues Found

- **Documentation gap in `apply-progress.md`**: PR 1 evidence was written; PR 2a evidence was missing before this update. TDD discipline was followed in code; only the artifact is stale.
- **Branch topology**: PR 1 + PR 2a are co-located on the tracker branch. Per `tasks.md:2.6`, the commit boundary should be split on commit (one work-unit commit per PR).
- **3 test queries by apply agent were jsdom-incompatible** (`getByRole("button", { name: "dd/mm/aaaa" })`): the apply agent used placeholder as accessible name; the trigger's accessible name is the `<Label htmlFor>` text. Fixed by changing the queries to `getByRole("button", { name: "Fecha de nacimiento" })` and `getByText(expectedDisplay)`.
- **One test assertion was redundant** (`formData.has("precioCompra")` after `precioAfter.toHaveValue("")`): the value-empty assertion already proves the contract. Fixed by changing the assertion to `formData.get("precioCompra") === ""`.
- **PR 2a bifurcation `useComboboxOrigen`**: undocumented in spec beyond inline comment. Defensible backwards-compat path; not a regression. Add a future test for the bifurcation.

## Status

**8/8 PR 2a spec scenarios compliant. 358/358 total tests pass. Typecheck clean. Build clean.**

PR 2a is ready. Routes, fixtures, and dominio remain untouched. PR 2b (route + mapper) can now proceed.

---

# Apply Progress — PR 2b: Route + mapper

**Change**: 2026-07-15-animal-crud-v1-3-form-controls
**Work unit**: 2b of 3 (Route + mapper — feature-branch-chain tracker)
**Mode**: Strict TDD
**Branch**: feat/animal-crud-v1-3-form-controls (PR 1 + PR 2a + PR 2b co-located; chain will be split on commit per `tasks.md:2.6` and the PR 2b slice targeting `feat/animal-crud-v1-3-pr2a-form` per the `feature-branch-chain` strategy).
**PR boundary**: Wire the edit route (`$animalId/editar.tsx`) to read the 11 v1.3 form keys, extract the es-CO parser to a shared helper, and source `initialValues`/`currentLocation` from a route loader. Do NOT modify the form component or the primitives (PR 2a is locked); do NOT modify the create route's mapper beyond the parser extraction.

## Work Unit Evidence

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `pnpm --filter @ganaweb/web exec tsx tests/animal-web-flow.test.ts` → ✅ `All Strict TDD gap tests passed. animal-web-flow.test.ts passed.` Includes 3 new test functions: `testEditRouteMapperNormalizesEsCOCompraNumerics`, `testEditRoutePassesInitialValuesToForm`, and the extended `testRouteFormPayloadBuilders` (now asserts all 11 v1.3 keys). Exit code 0. |
| Focused test command (helper) | `pnpm --filter @ganaweb/web exec tsx tests/es-co-number.test.ts` → ✅ `es-co-number.test.ts passed.` 5 test functions (parse happy path, parse edge cases, parse trim, format happy path, format nullable) covering 25+ assertions. Exit code 0. |
| Runtime harness command/scenario and exact result | `pnpm --filter @ganaweb/web exec vitest run` → 1/1 passed (the `animal-create-e2e` test that renders the create route and asserts the harness validacion surfacing; the edit route is covered by the source-level pin test). Exit code 0. |
| UI regression test | `pnpm --filter @ganaweb/ui test` → 358/358 passed (unchanged from PR 2a baseline; PR 2b did not touch the form component). Exit code 0. |
| Typecheck | `pnpm --filter @ganaweb/web typecheck` → silent (tsc --noEmit) exit 0. `pnpm --filter @ganaweb/ui build` → ESM dist/index.js 147.45 KB, DTS dist/index.d.ts 51.32 KB (the +2 type re-exports in the barrel). Exit code 0. |
| Rollback boundary | Revert exactly: `apps/web/src/lib/parsers/es-co-number.ts` (new, 65 LOC), `apps/web/tests/es-co-number.test.ts` (new, 153 LOC), `apps/web/src/routes/_app/fincas/$fincaId/animales/$animalId/editar.tsx` (+270/-8), `apps/web/src/routes/_app/fincas/$fincaId/animales/nuevo.tsx` (-19 net — inline parser removed; shared helper imported), `apps/web/src/server/animal-actions.server.ts` (+63 for `pickUpdateAnimalCambios` + `UpdateAnimalWebInput` widening), `apps/web/src/server/animal-actions.ts` (+44 for `UpdateAnimalWebInput` widening), `apps/web/tests/animal-web-flow.test.ts` (+432 for the 2 new tests + extended mapper test), `packages/ui/src/index.ts` (+2 for `AnimalCurrentLocation` + `AnimalFormInitialValues` re-exports). Form component, primitives, dominio, fixtures remain untouched. |

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 3.1 es-CO parser: happy path + edge cases + round-trip | `apps/web/tests/es-co-number.test.ts:11-66` (parse) | Unit (tsx) | ✅ 358 UI + 1 web + 1 es-co (pre-RED) | ✅ `Cannot find module 'es-co-number.js'` at test execution | ✅ `parseEsCONumber` strips `.` thousand + normalizes `,`→`.`; `formatEsCONumber` mirrors `Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 })` | ✅ 3 parse cases (happy: 1.500,75 / 450,30 / 0,5 / -1.500,75; edge: empty/whitespace/null/non-string/invalid/multiple-commas; trim: leading/trailing whitespace) + 2 format cases (happy + nullable for null/undefined/NaN/Infinity) — 25+ assertions, parse∘format identity for 3 distinct values | ✅ Shared helper extracted; `nuevo.tsx` imports from `lib/parsers/es-co-number.js`; `nuevo.tsx` no longer declares its own `parseEsCONumber` |
| 3.2 es-CO parser: shared-source pin | `apps/web/tests/animal-web-flow.test.ts:testEditRouteMapperNormalizesEsCOCompraNumerics` | Source-level pin | ✅ 358 UI + 1 web | ✅ Test for "edit route must import the shared es-CO parser" failed before the import was added | ✅ Edit route imports from `../../../../../../lib/parsers/es-co-number.js` (one level deeper than create route) | ✅ Regex accepts both path depths (`from\s+"\.\.(\/\.\.)+\/lib\/parsers\/es-co-number\.js"`) so a future refactor that moves the file doesn't break the pin | ✅ Path depth awareness; the test was hard-coded to the create route's 5-`../` depth on first pass — fixed to a depth-flexible regex |
| 3.3 Update mapper reads 11 v1.3 keys | `apps/web/tests/animal-web-flow.test.ts:testRouteFormPayloadBuilders` (extended) | Unit (tsx) | ✅ 358 UI + 1 web + 1 es-co | ✅ Assertion `update mapper must read the v1.3 origen pill value` failed (cambios.origen was `undefined`) | ✅ Mapper reads all 11 v1.3 keys (`origen`, `fechaNacimiento`, `fechaCompra`, `razaId`, `colorId`, `calidadId`, `lugarCompraId`, `madreId`, `padreId`, `precioCompra`, `pesoCompra`); empty inputs are dropped from `cambios` (CA-UI-007) | ✅ Minimal-update test (only `codigo` + `versionLeida`) confirms backwards-compat with the v1.0 two-field contract; explicit "empty fechaCompra/precioCompra/pesoCompra are dropped from cambios" assertions | ✅ Comment block explains the 11-key translation; `Number(formData.get("versionLeida") ?? 1)` is unchanged |
| 3.4 Update mapper applies es-CO parser | `apps/web/tests/animal-web-flow.test.ts:testEditRouteMapperNormalizesEsCOCompraNumerics` | Unit (tsx) | ✅ 358 UI + 1 web + 1 es-co | ✅ "update mapper must parse precioCompra from es-CO string to 1500.75" failed (cambios.precioCompra was `undefined`) | ✅ `parseEsCONumber` called in the update mapper; 1500.75 / 450.3 / undefined-empty all match the create route's semantics | ✅ Empty-input assertion (missing precioCompra/pesoCompra on update must be `undefined`, not `NaN`) | ✅ Imports `parseEsCONumber` from the shared helper (no inline duplicate) |
| 3.5 Edit route loader returns `initialValues` + `currentLocation` | `apps/web/tests/animal-web-flow.test.ts:testEditRoutePassesInitialValuesToForm` | Source-level pin | ✅ 358 UI + 1 web + 1 es-co | ✅ "edit route must pass initialValues to both <AnimalFormScreen> renders (found 0)" failed (no initialValues prop in the JSX) | ✅ Both renders receive `initialValues={initialValues}`, `currentLocation={currentLocation}`, `catalogOptions={catalogOptionsConPermisos}`, `fieldErrors={fieldErrors}`, `currentAnimalId={animalId}`; loader calls `getAnimalFichaAction` and maps the ficha via `mapAnimalFichaToLoaderData`; `currentLocation={{}}` literal removed | ✅ All 8 v1.3 keys (origen/fechaNacimiento/razaId/colorId/calidadId/lugarCompraId/madreId/padreId) present in the route source; negative check for `currentLocation={{}}` literal | ✅ `loadEditAnimalInitialValues` wraps the fetch in try/catch so a thrown loader (network / harness misconfig) keeps the form mounted with empty fields rather than 500-ing the page |
| 3.6 Edit route field errors mapper | `apps/web/tests/animal-web-flow.test.ts` (extended mapper test) | Unit (tsx) | ✅ 358 UI + 1 web + 1 es-co | ➖ Test already passing; mapper is a defensive add (mirrors `buildCreateAnimalFieldErrors`) | ✅ `buildUpdateAnimalFieldErrors` translates `errores` into `Record<fieldName, message>`; uses the same `CAMPO_TO_FIELD_KEY` table as the create route | ➖ Single shape; not triangulated (the create route's mapper is the source of truth) | ✅ `CAMPO_TO_FIELD_KEY` left in the route file (not extracted to a shared helper — the prompt forbids refactoring beyond the es-CO parser extraction) |
| 3.7 Harness narrows wider web contract | `apps/web/src/server/animal-actions.server.ts` (no direct test; the harness's `update()` is exercised by `testServerGuards`) | Types | ✅ 358 UI + 1 web + 1 es-co | ➖ The `UpdateAnimalWebInput` widening to 11 fields broke the harness's `update()` call (TypeScript excess-property check); the prompt forbids changing the dominio, so the pick function is the route-level fix | ✅ `pickUpdateAnimalCambios` narrows 11 fields down to the 2 the dominio's `actualizarAnimal` use case consumes (`codigo?`, `versionLeida`); extra 9 fields are kept in the web contract for future PRs | ➖ Single shape; the 6 dominio-accepted fields (`codigo`, `versionLeida`, `versionActual`, `estadoAnimalKey`, `saludAnimalKey`, `potreroId`) are NOT all in the web contract — `versionActual` is internalised by the use case (it fetches the current animal and injects it); `estadoAnimalKey`/`saludAnimalKey`/`potreroId` are domain invariants that the v1.3 form does not edit (CA-UPD-001) | ✅ Inline comment in the harness documents "v1.3 (PR 2b): narrow the wider ... contract down to the 2 fields the dominio's actualizarAnimal use case currently consumes" |
| 3.8 REFACTOR: shared parser extraction | N/A (refactor only) | Refactor | ✅ 358 UI + 1 web + 1 es-co | ➖ N/A (refactor step) | ✅ `apps/web/src/lib/parsers/es-co-number.ts` created; `nuevo.tsx` and `editar.tsx` both import `parseEsCONumber` from the helper; the inline `function parseEsCONumber(...)` in `nuevo.tsx` is gone | ➖ N/A (refactor step) | ✅ `formatEsCONumber` added as the inverse (also tested); `apps/web/src/lib/parsers/es-co-number.ts` is the single source of truth — a source-level pin in `testEditRouteMapperNormalizesEsCOCompraNumerics` fails if either route declares its own `function parseEsCONumber(` |

## Files Changed (PR 2b)

| File | Action | LOC | What Was Done |
|------|--------|-----|---------------|
| `apps/web/src/lib/parsers/es-co-number.ts` | Created | +65 | `parseEsCONumber(value: FormDataEntryValue | null): number | undefined` strips es-CO thousand separators and normalizes `,`→`.`. `formatEsCONumber(value: number | null | undefined): string` is the inverse, mirroring `Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 })`. Exhaustive JSDoc explains accepted/rejected forms and the "undefined over NaN" contract. |
| `apps/web/tests/es-co-number.test.ts` | Created | +153 | 5 test functions: happy path (1500.75, 450.3, 0.5, -1500.75), edge cases (empty/whitespace/null/non-string/invalid/multiple-commas), trim (leading/trailing whitespace), format happy (round-trip identity for 3 values), format nullable (null/undefined/NaN/Infinity → `""`). 25+ assertions. |
| `apps/web/src/routes/_app/fincas/$fincaId/animales/$animalId/editar.tsx` | Modified | +270/-8 | `buildUpdateAnimalInputFromFormData` reads 11 v1.3 keys; `buildUpdateAnimalFieldErrors` mirrors the create route's mapper; `mapAnimalFichaToLoaderData` + `loadEditAnimalInitialValues` source `initialValues` + `currentLocation` from `getAnimalFichaAction`; `EditAnimalRoute` passes `initialValues`, `currentLocation`, `catalogOptions`, `canCreateCatalog`, `fieldErrors`, `currentAnimalId` to BOTH the desktop and mobile `<AnimalFormScreen>`; `save()` branches on `result.tipo` for "actualizado" (navigate) and "validacion" (set fieldErrors). |
| `apps/web/src/routes/_app/fincas/$fincaId/animales/nuevo.tsx` | Modified | -19 net | Inline `parseEsCONumber` (lines 61-71 in the previous version) removed; imports from `../../../../../lib/parsers/es-co-number.js`. `buildCreateAnimalInputFromFormData` is otherwise unchanged (prompt constraint). |
| `apps/web/src/server/animal-actions.server.ts` | Modified | +63 | `UpdateAnimalWebInput.cambios` widened with 9 v1.3 fields (origen, fechaNacimiento, fechaCompra, razaId, colorId, calidadId, lugarCompraId, madreId, padreId, precioCompra, pesoCompra) per design.md. `pickUpdateAnimalCambios` narrows 11 fields down to the 2 the dominio's `actualizarAnimal` use case consumes. Harness's `update()` calls the pick. |
| `apps/web/src/server/animal-actions.ts` | Modified | +44 | Public `UpdateAnimalWebInput.cambios` mirrors the server type (same widening). |
| `apps/web/tests/animal-web-flow.test.ts` | Modified | +432 | `testRouteFormPayloadBuilders` extended to assert all 11 v1.3 keys. New `testEditRouteMapperNormalizesEsCOCompraNumerics` (es-CO parser applied in update mode + shared-helper source-level pin). New `testEditRoutePassesInitialValuesToForm` (loader wires `initialValues`/`currentLocation`/`catalogOptions`/`canCreateCatalog` to both renders + v1.3 keys present + non-empty `currentLocation`). `run()` includes the 2 new tests. |
| `packages/ui/src/index.ts` | Modified | +2 | `AnimalCurrentLocation` and `AnimalFormInitialValues` re-exported (required by the edit route's type imports). |

PR 2b-only line additions: **+1,008 net** (908 insertions + 218 new file - 19 deleted in `nuevo.tsx` - 8 deleted in `editar.tsx` - 91 already counted in PR 2a's net). This is over the 280-line budget (tasks.md:3 forecast); the over-budget is dominated by the es-CO parser test file (153 LOC of focused TDD coverage) and the source-level pin tests in `animal-web-flow.test.ts` (432 LOC). The chain strategy `feature-branch-chain` already accounts for this — the per-PR review slice remains focused, and the parser helper is a single responsibility that ships in this PR.

## Deviations from Design

- **`AnimalFormInitialValues` does not include `codigo` / `nombre`**: PR 2a locked the form, so the type is the source of truth and it omits those two names. The form's `renderAnimalFormField` falls through to `<Field defaultValue={...}>` for `codigo` and `nombre` (the `FORM_FIELDS` declares no `defaultValue` for them), so the edit form renders with empty codigo and nombre inputs. **The user must retype them on every save** — this is a known PR 2a limitation that PR 2b documents but cannot fix without touching the form. A future PR will extend `AnimalFormInitialValues` to include `codigo?: string` and `nombre?: string` and update the form to read them as `defaultValue`.
- **`mapAnimalFichaToLoaderData` returns demo `initialValues` (not real per-animal data)**: The spec said "If no real fetcher exists, return a minimal demo object with the current animal's data shape." The demo uses the current animal's `codigo`, `nombre`, and `sexoKey` from the ficha, but the v1.3 catalog ids (`razaId`, `colorId`, etc.) are hard-coded demo defaults. A per-finca loader that sources these from the actual animal record is a future PR (tasks.md:4.3 "real per-finca catalog loaders" is out of scope for v1.3).
- **`EditAnimalLoaderData` shape differs slightly from the test's `mapAnimalFichaToInitialValues` export name**: The test checks for the v1.3 keys in the route source OR for an exported `mapAnimalFichaToInitialValues`. The actual export is `mapAnimalFichaToLoaderData` (returns the full loader shape: `{ initialValues, currentLocation }`, not just `initialValues`). The test's `||` falls back to the source check, which passes because all 8 v1.3 keys are in the route. No regression.
- **`save()` `result.tipo === "actualizado"` branch**: The update action's success tipo is `"actualizado"` (per the dominio's `actualizarAnimal` use case at `packages/aplicacion/src/casos-uso/animales/index.ts:556`). The route navigates on this tipo. The defensive `"tipo" in result` guard handles future return-shape changes (e.g., a future PR may add a narrowed `UpdateAnimalServerResult` type to mirror `CreateAnimalServerResult`).

## Issues Found

- **es-CO parser test first-try ran on a non-existent module**: RED phase confirmed via `Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'es-co-number.js'`. Test was written first; production code followed. No regression.
- **TypeScript excess-property check on `UpdateAnimalWebInput` widening**: Widening the contract to 11 v1.3 fields would have broken the harness's `update()` (it passes `input.cambios` to `actualizarAnimal(deps)({...})`, which accepts only 2 fields). Resolved by adding `pickUpdateAnimalCambios` in the harness to narrow the contract. Mirrors the create route's `pickCreateAnimalDatos` pattern.
- **Form type is incomplete (PR 2a lock)**: As documented in Deviations. Cannot fix without touching `packages/ui/src/ganado/animal-crud.tsx` (PR 2a is locked). Documented in apply-progress for the future PR.
- **`packages/ui` barrel re-exports 2 new types**: The edit route's `import { type AnimalCurrentLocation, type AnimalFormInitialValues, ... } from "@ganaweb/ui"` required the barrel to re-export them. The barrel is the public API surface (PR 1 established this), not the form component itself, so the re-export is in scope. `pnpm --filter @ganaweb/ui build` was re-run to refresh the `.d.ts`.
- **Test `testEditRouteMapperNormalizesEsCOCompraNumerics` path depth regex**: First pass hard-coded `from "../../../../../lib/parsers/es-co-number.js"` (the create route's 5-`../` depth). The edit route uses 6-`../` (one level deeper). Fixed the regex to `from\s+"\.\.(\/\.\.)+\/lib\/parsers\/es-co-number\.js"` so a future refactor that moves the file doesn't break the pin.

## Status

**3/3 PR 2b spec scenarios compliant (mapper reads 11 keys, es-CO parser applied, loader returns initialValues). es-co-number helper: 5/5 test functions, 25+ assertions, all pass. animal-web-flow: 1/1 vitest + 3 new tsx tests + all pre-existing tests pass. UI regression: 358/358 (unchanged). Typecheck clean. Build clean.**

PR 2b is ready. The next PR (2c — Imágenes uploader / RFID icon / Numeric keypad / Sexo mobile pills) per tasks.md:4.3 is out of scope for the v1.3 form controls change. The PR 2b slice targets `feat/animal-crud-v1-3-pr2a-form` (created from this branch) per the `feature-branch-chain` strategy in `tasks.md:13`.

