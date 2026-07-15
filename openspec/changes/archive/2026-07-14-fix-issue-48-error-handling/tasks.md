# Tasks: Animal Create Error Handling (Issue #48)

## Review Workload Forecast

Estimated changed lines: 120-180 (3 source + 2 test files). Single PR, four work-unit commits; no chaining needed.

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

## Phase 1: Action Widen — Full Harness Result (commit 1 of 4)

- [x] 1.1 [READY] RED test in `apps/web/tests/animal-web-flow.test.ts` :354: `createAnimalAction` returns verbatim `{ tipo: "validacion", errores: ErrorValidacionAnimal[] }`. — committed `55fa9db`
- [x] 1.2 [READY] RED test :380: e2e fast-path returns exactly `{ tipo: "creado" as const }` (no `errores` key) when `isAnimalE2eEnabled()`. — committed `55fa9db`
- [x] 1.3 [READY] In `apps/web/src/server/animal-actions.ts` line 78 → `return result`; e2e early return (67-75) untouched. 1.1, 1.2 pass. — committed `55fa9db`
- Rollback: revert `animal-actions.ts:78` and web test anchors :354/:380.

## Phase 2: Route — Branch on `result.tipo` and Map `errores` → `fieldErrors` (commit 2 of 4)

- [x] 2.1 [READY] RED test :410: `creado` calls `window.location.assign('/fincas/{fincaId}/animales')`. — committed `00dd489`
- [x] 2.2 [READY] RED test :440: `validacion` does NOT navigate; preserves `codigo="MT-122"`, `nombre="Matilda"`. — committed `00dd489`
- [x] 2.3 [READY] RED test :445: thrown action does NOT navigate; form stays mounted, no field error. — committed `00dd489`
- [x] 2.4 [READY] RED test :470 for mapper: `errores=[{campo:"sexo_key"...},{campo:"fecha_compra"...}]` → `{ sexoKey: ... }`, drops `fecha_compra` (spec line 32). — committed `00dd489`
- [x] 2.5 [READY] In `nuevo.tsx` drop `try/finally/assign` (60-68); `save` awaits action, navigates only on `"creado"`, on `"validacion"` builds `fieldErrors` via mapper (`useState`, passed to both `<AnimalFormScreen>` renders). 2.1-2.4 pass. — committed `00dd489`
- Rollback: revert `nuevo.tsx:60-68` and web test anchors :410/:440/:445/:470.

## Phase 3: Form — `fieldErrors` Prop and ARIA Wiring (commit 3 of 4)

- [x] 3.1 [READY] RED test in `packages/ui/tests/animal-ui.test.tsx` :210: `fieldErrors={codigo:"Requerido"}` ⇒ `role="alert"` under `Código *`, `aria-invalid="true"`, `aria-describedby` → alert id. — committed `0d4b7a6`
- [x] 3.2 [READY] Extend :164: no `fieldErrors` ⇒ no `role="alert"` and no `aria-invalid="true"`. — committed `0d4b7a6`
- [x] 3.3 [READY] In `animal-crud.tsx` add `fieldErrors?: Record<string, string>` to `AnimalFormScreenProps` (493-501); `Field` (733) + `CatalogSelectField` (759) derive `errorId=${id}-error`; when `fieldErrors?.[name]` exists, render `<p id={errorId} role="alert" className="text-caption text-danger-600">…</p>` and pass `aria-invalid="true"` + `aria-describedby={errorId}`. 3.1, 3.2 pass; edit-mode test :336 still passes (prop omitted). — committed `0d4b7a6`
- Rollback: revert `animal-crud.tsx:493-501,733-797` and UI test anchors :164/:210.

## Phase 4: End-to-End Test (commit 4 of 4)

- [ ] 4.1 [READY] E2E test in `apps/web/tests/animal-web-flow.test.ts` ~:480: mount create route with stubbed action returning `{ tipo:"validacion", errores:[{campo:"codigo",detalle:"Requerido"}] }`; submit; assert no `assign`, `codigo` has `aria-invalid="true"`, `role="alert"` with the error text under it.
- Rollback: revert web test anchor ~:480.

## Phase 5: Verification and PR Opening

- [ ] 5.1 [READY] Run focused tests, then `pnpm turbo test`, `pnpm turbo typecheck`, `biome ci .`; keep evidence with each work-unit commit.
- [ ] 5.2 [BLOCKED on Issue #48 `status:approved` label — repo policy] Open PR: `fix(animal-create): surface harness validation errors per field (Closes #48)`. Body cites anchors (`nuevo.tsx:60-68`, `animal-actions.ts:77-78`, `animal-crud.tsx:493-501`), lists the four commits, notes `fechaCompra` + `tipoIngreso` follow-up (design R1). **Apply MUST stop until the label lands on #48.**

## Out of Scope

Harness / `crearAnimal` / validation · catalog selectors / `animal-crud-ui` · FincaSwitcher (Issue #46) · edit route · generic banners for `no_autenticado` / `permiso_denegado` / `finca_no_autorizada` / `transaccion_fallida` · `fechaCompra` + `tipoIngreso` (design R1, follow-up only).
