# Apply Progress: Animal Form CA-UI Remediation

## Mode

Strict TDD — feature-branch-chain slices 1-3.

## Completed Tasks

- [x] 1.1 Add failing CA-UI-001/003 tests in `packages/ui/tests/animal-ui.test.tsx` for labeled catalog selectors, missing-label fallback, and no visible raw `sexoKey=1`.
- [x] 1.2 Add failing CA-UI-005 tests in `packages/ui/tests/animal-ui.test.tsx` for split potrero/sector/lote/grupo controls in create mode and no merged location field.
- [x] 1.3 Add failing edit-mode tests in `packages/ui/tests/animal-ui.test.tsx` for read-only location display and optional `Mover animal` action.
- [x] 1.4 Add failing mapper coverage in `apps/web/tests/animal-web-flow.test.ts` proving create payload preserves `sexoKey` and location ids.
- [x] 2.1 Update `packages/ui/src/ganado/animal-crud.tsx` props with `SelectOption`, `SexoKey`, and create/edit variant-aware catalog options.
- [x] 2.2 Replace affected raw catalog inputs in `packages/ui/src/ganado/animal-crud.tsx` with selectors that display labels and submit existing ids/keys.
- [x] 2.3 Map `sexoKey` labels as `0=Macho`, `1=Hembra`, `2=Pajuela`; render `No disponible` for missing labels without exposing ids/keys.
- [x] 3.1 Render separate potrero, sector, lote, and grupo controls in create mode in `packages/ui/src/ganado/animal-crud.tsx`.
- [x] 3.2 Render edit-mode location as read-only values in `packages/ui/src/ganado/animal-crud.tsx`; exclude direct location mutation fields from edit submission.
- [x] 3.3 Update `apps/web/src/routes/_app/fincas/$fincaId/animales/nuevo.tsx` to pass catalog/location options and preserve ids in `buildCreateAnimalInputFromFormData`. (Bounded correction `review-662d7abf029ed7de`.)
- [x] 3.4 Update `apps/web/src/routes/_app/fincas/$fincaId/animales/$animalId/editar.tsx` to pass current location read-only context and keep update payload location-free. (Bounded correction `review-178f8cd29714bd5e`.)
- [x] 4.1 Run focused UI and web tests, then `pnpm turbo test`; keep test evidence with the matching work-unit commit.
- [x] 4.2 Add PR notes citing CA-UI-001, CA-UI-003, and CA-UI-005, and state FincaSwitcher/header behavior is out of scope. PR body authored at `pr-description.md` with file:line evidence and an out-of-scope paragraph added to `design.md`.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | `packages/ui/tests/animal-ui.test.tsx` | UI integration | ✅ Baseline `pnpm --filter @ganaweb/ui exec vitest run --passWithNoTests --allowOnly=false tests/animal-ui.test.tsx` → 10/10 passed | ✅ Added CA-UI-001/003 selector tests first; command failed with 2 expected failures because selectors did not exist | ✅ Same focused command passed after implementation: 12/12 tests | ✅ Covered labeled sex/origin, sex change payload `0`, preserved origin id, and missing-label fallback | ✅ Added jsdom-safe Radix pointer/scroll polyfills in the test file only |
| 2.1 | `packages/ui/tests/animal-ui.test.tsx` | UI integration | ✅ Covered by 1.1 baseline | ✅ Test referenced new `initialValues`, `catalogOptions`, `SelectOption`, and `SexoKey` surface before production support | ✅ Same focused command passed: 12/12 tests | ✅ Default `sexoKey=1` plus explicit initial values | ✅ Kept props optional to preserve existing route callers |
| 2.2 | `packages/ui/tests/animal-ui.test.tsx` | UI integration | ✅ Covered by 1.1 baseline | ✅ Test required `Sexo` and `Origen` comboboxes instead of textboxes | ✅ Same focused command passed: 12/12 tests | ✅ Opened sex selector and selected `Macho`, preserving form payload values | ✅ Centralized selector rendering via `CatalogSelectField` |
| 2.3 | `packages/ui/tests/animal-ui.test.tsx` | UI integration | ✅ Covered by 1.1 baseline | ✅ Test asserted `Hembra`, `Macho`, `Pajuela`, no visible raw `1`, and safe `No disponible` fallback | ✅ Same focused command passed: 12/12 tests | ✅ Tested valid catalog label and missing catalog label paths | ✅ Extracted `SEXO_OPTIONS` and fallback option composition |
| 1.2 | `packages/ui/tests/animal-ui.test.tsx` | UI integration | ✅ Baseline `pnpm --filter @ganaweb/ui exec vitest run --passWithNoTests --allowOnly=false tests/animal-ui.test.tsx` → 12/12 passed | ✅ Added CA-UI-005 create-mode test first; focused command failed with expected missing split-control behavior | ✅ Same focused command passed after implementation: 14/14 tests | ✅ Covered four independent location ids: potrero, sector, lote, and grupo | ✅ Removed merged `ubicacion` form field from the shared form |
| 1.3 | `packages/ui/tests/animal-ui.test.tsx` | UI integration | ✅ Covered by 1.2 baseline | ✅ Added edit-mode read-only location test before production support; focused command failed because the section did not exist | ✅ Same focused command passed after implementation: 14/14 tests | ✅ Covered displayed values, `Mover animal`, absence of split edit comboboxes, and absence of location ids in submitted FormData | ✅ Added `AnimalCurrentLocation` and `formVariant` props without changing route callers |
| 3.1 | `packages/ui/tests/animal-ui.test.tsx` | UI integration | ✅ Covered by 1.2 baseline | ✅ CA-UI-005 create test required split controls before implementation | ✅ Same focused command passed: 14/14 tests | ✅ Selected and submitted all four split location controls | ✅ Reused `CatalogSelectField` for location controls |
| 3.2 | `packages/ui/tests/animal-ui.test.tsx` | UI integration | ✅ Covered by 1.2 baseline | ✅ Edit-mode test required read-only current location and no direct mutation fields before implementation | ✅ Same focused command passed: 14/14 tests | ✅ Verified displayed current location and no `potreroId`/`sectorId`/`loteId`/`grupoId` in edit submission | ✅ Kept move flow as an explicit action outside form payload mutation |
| correction-review-178f8cd29714bd5e | `apps/web/tests/animal-web-flow.test.ts` | Route mapper/source integration | ✅ `pnpm --filter @ganaweb/web exec tsx tests/animal-web-flow.test.ts` → exit 0 before correction | ✅ Added route mapper assertions for `potreroId`/`sectorId`/`loteId`/`grupoId` preservation and source assertions for create/edit `formVariant` plus edit `currentLocation`; focused command failed on missing location ids before production changes | ✅ Focused command passed after correction: exit 0, `✅ animal-web-flow.test.ts passed` | ✅ Existing `sexoKey=0` case now also proves all four split location ids survive FormData mapping | ✅ Ran `pnpm --filter @ganaweb/web typecheck` → exit 0 |
| correction-review-662d7abf029ed7de | `apps/web/tests/animal-web-flow.test.ts` | Server use-case mapping + route source | ✅ `pnpm --filter @ganaweb/web exec tsx tests/animal-web-flow.test.ts` → exit 0 before correction | ✅ Added `testCreateMapsSplitLocationToUbicacionInicial` proving split `potreroId`/`sectorId`/`loteId` reach the use case as `ubicacionInicial` (with `grupoId` dropped per contract) and triangulation case proving no `ubicacionInicial` is sent when no ids are provided; added `testCreateRouteWiresCatalogOptions` proving the new route passes non-undefined `catalogOptions` covering `origen`/`potrero`/`sector`/`lote`/`grupo`. RED confirmed: `ubicacionesIniciales` was `[]` before the production fix | ✅ Focused command passed after correction: exit 0, `✅ animal-web-flow.test.ts passed` | ✅ Triangulation case proves absent-location path does not call `registrarInicial` and that the absence of the four split fields still returns `tipo: "creado"` | ✅ Rebuilt `@ganaweb/ui` to publish new `AnimalFormCatalogOptions`/`SelectOption` exports; ran `pnpm --filter @ganaweb/web typecheck` → exit 0 |
| slice-3-create-mode-catalog-fallback | `packages/ui/tests/animal-ui.test.tsx` | UI integration | ✅ Baseline `pnpm --filter @ganaweb/ui exec vitest run --passWithNoTests --allowOnly=false tests/animal-ui.test.tsx` → 15/15 passed before this addition | ✅ Added `falls back to 'No disponible' for create-mode location selectors when catalog options are missing (CA-UI-001/003/005)` test first; focused command initially failed because the over-specified assertion `formData.has("potreroId") === false` did not match Radix Select's always-present hidden `name` input | ✅ Same focused command passed after refining the assertion to the meaningful contract: `formData.get("potreroId")` is empty string and `formData.has("ubicacion")` is false: 15/15 tests | ➖ Single — orchestrator scope limited this to one focused test; existing `origen` missing-label test (task 1.1) already covers the unrelated catalog field; the new test focuses on the four LOCATION_FIELDS in create mode | ✅ No production code change was required (the implementation already routes through `CatalogSelectField` with `options={catalogOptions?.[optionsKey] ?? []}`); only the test assertion needed tightening |

## Work Unit Evidence

| Evidence | Required value |
|---|---|
| Focused test command and exact result | Slice 1: `pnpm --filter @ganaweb/ui exec vitest run --passWithNoTests --allowOnly=false tests/animal-ui.test.tsx` → exit 0, 1 file passed, 12/12 tests passed. Slice 2: same command → exit 0, 1 file passed, 14/14 tests passed. Slice 3: same command → exit 0, 1 file passed, 15/15 tests passed |
| Runtime harness command/scenario and exact result | Slice 1 exercised sex/origin labels and preserved ids. Slice 2 exercised create/edit form runtime paths in jsdom: create mode renders separate potrero/sector/lote/grupo comboboxes and submits `potreroId`, `sectorId`, `loteId`, `grupoId`; edit mode renders read-only `Ubicación actual`, exposes `Mover animal`, and submits no direct location mutation ids. Slice 3 exercised the create-mode graceful fallback: with `catalogOptions={{}}` all four location comboboxes render with `No disponible` placeholder, the form submits successfully, and `formData.get("potreroId"|"sectorId"|"loteId"|"grupoId")` are empty strings while `formData.has("ubicacion")` is false |
| Rollback boundary | Slice 1 rollback: revert selector changes in `packages/ui/src/ganado/animal-crud.tsx` and selector tests. Slice 2 rollback: revert the location-specific props/rendering/tests in `packages/ui/src/ganado/animal-crud.tsx`, `packages/ui/tests/animal-ui.test.tsx`, and this OpenSpec task/progress update without touching route mapper work. Slice 3 rollback: revert only the new `falls back to 'No disponible' for create-mode location selectors when catalog options are missing (CA-UI-001/003/005)` test case in `packages/ui/tests/animal-ui.test.tsx` and the corresponding TDD evidence row above; no production code change is associated with this slice |

## Bounded Correction Evidence — review-178f8cd29714bd5e

| Evidence | Required value |
|---|---|
| Focused test command and exact result | RED: `pnpm --filter @ganaweb/web exec tsx tests/animal-web-flow.test.ts` → exit 1 after adding tests first; failed because create payload omitted `potreroId`, `sectorId`, `loteId`, and `grupoId`. GREEN: same command → exit 0, `✅ animal-web-flow.test.ts passed` |
| Runtime harness command/scenario and exact result | `pnpm --filter @ganaweb/web typecheck` → exit 0 after route wiring and contract expansion. Route source test verifies create route explicitly uses `formVariant="create"`; edit route explicitly uses `formVariant="edit"` and passes `currentLocation`, so edit mode renders read-only location semantics instead of create-mode mutation controls |
| Rollback boundary | Revert only `apps/web/src/routes/_app/fincas/$fincaId/animales/nuevo.tsx`, `apps/web/src/routes/_app/fincas/$fincaId/animales/$animalId/editar.tsx`, `apps/web/src/server/animal-actions.ts`, `apps/web/src/server/animal-actions.server.ts`, `apps/web/tests/animal-web-flow.test.ts`, and this OpenSpec progress/task update |

## Bounded Correction Evidence — review-662d7abf029ed7de

| Evidence | Required value |
|---|---|
| Focused test command and exact result | RED: `pnpm --filter @ganaweb/web exec tsx tests/animal-web-flow.test.ts` → exit 1 after adding `testCreateMapsSplitLocationToUbicacionInicial`; failed because `ubicacionesIniciales` was `[]` (harness forwarded the raw `datos` object to the use case, so the location fields never reached `ubicacionInicial`). GREEN: same command → exit 0, `✅ animal-web-flow.test.ts passed` |
| Runtime harness command/scenario and exact result | Real server harness path: `createAnimalActionHarness.create` is now called with `datos: { codigo, nombre, sexoKey }` plus a top-level `ubicacionInicial: { potreroId, sectorId, loteId }` whenever at least one split id is present; the `ubicaciones.registrarInicial` spy captured the expected payload. Empty-location case proves no `ubicacionInicial` is sent and the response is still `tipo: "creado"`. New create route passes a non-undefined `catalogOptions` covering `origen`, `potrero`, `sector`, `lote`, `grupo` from the demo fixture |
| Rollback boundary | Revert only `apps/web/src/server/animal-actions.server.ts` (use-case mapping), `apps/web/src/routes/_app/fincas/$fincaId/animales/nuevo.tsx` (catalogOptions wiring), `apps/web/src/lib/fixtures/animal-form-catalog.ts` (new demo catalog fixture), `apps/web/tests/animal-web-flow.test.ts` (new tests + run() entries), `packages/ui/src/index.ts` (re-export `AnimalFormCatalogOptions`/`SelectOption`/`AnimalFormScreenProps`), and this OpenSpec progress/task update. Do NOT touch `apps/web/src/server/animal-actions.ts`, `apps/web/src/routes/_app/fincas/$fincaId/animales/$animalId/editar.tsx`, or any db/script work |

## Slice 3 — PR Description + Out-of-Scope Documentation

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `pnpm --filter @ganaweb/ui exec vitest run --passWithNoTests --allowOnly=false tests/animal-ui.test.tsx` → exit 0, 1 file passed, 15/15 tests passed |
| Runtime harness command/scenario and exact result | New UI test renders `AnimalFormScreen` with `formVariant="create"` and `catalogOptions={{}}` in jsdom; all four location comboboxes (`Potrero`, `Sector`, `Lote`, `Grupo`) display `No disponible`, the form submits without errors, `formData.get("potreroId"\|"sectorId"\|"loteId"\|"grupoId")` are empty strings, `formData.has("ubicacion")` is false, and the non-location fields (`codigo`, `nombre`) still submit normally. PR description authored at `openspec/changes/2026-07-14-feature-crud-animales-deficiencies/pr-description.md` with file:line evidence for CA-UI-001/003/005 and an Out-of-Scope section |
| Rollback boundary | Revert only the new test case in `packages/ui/tests/animal-ui.test.tsx`, the `pr-description.md` artifact, the new "Out of Scope" paragraph in `design.md`, and this OpenSpec progress/task update. No production code change is associated with this slice |

## Additional Verification

- `pnpm --filter @ganaweb/ui exec vitest run --passWithNoTests --allowOnly=false tests/animal-ui.test.tsx` → exit 0, 15/15 tests passed.
- `pnpm --filter @ganaweb/web exec tsx tests/animal-web-flow.test.ts` → exit 0, `✅ animal-web-flow.test.ts passed`.
- `pnpm --filter @ganaweb/ui typecheck` → exit 0.
- `pnpm --filter @ganaweb/web typecheck` → exit 0.

## Remaining Tasks

None. All 13/13 tasks complete; `sdd-verify` is unblocked.

## Notes

- FincaSwitcher/header behavior was not touched.
- Route mapper preservation for split location ids was corrected in bounded review lineage `review-178f8cd29714bd5e`; broader route catalog/current-location data loading was finished in bounded review `review-662d7abf029ed7de`.
- `pr-description.md` is reusable as a PR body once `sdd-archive` produces the final change.
- The new "Out of Scope" paragraph in `design.md` references the bounded correction lineage explicitly so the FincaSwitcher follow-up can be tracked as its own OpenSpec change.
