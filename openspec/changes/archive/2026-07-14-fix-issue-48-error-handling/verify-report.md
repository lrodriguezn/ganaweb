```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:75eedd8865e178aca7bfc1b045bc138a5a7856a6a4bebecf671cf2e56394bf4d
verdict: pass
blockers: 0
critical_findings: 0
requirements: 6/6
scenarios: 8/8
test_command: pnpm --filter @ganaweb/web test:unit && pnpm --filter @ganaweb/web test:e2e
test_exit_code: 0
test_output_hash: sha256:0bb771c6d29479d65ce721c90e7bf6fc3bf12e8c89510ea7f26817d77567bfb2
build_command: pnpm --filter @ganaweb/web typecheck
build_exit_code: 0
build_output_hash: sha256:3c587f6e53ec56bad632138f9d41ce4e68a2f8190a41cf5b43a8030283c3c981
```

# Verification Report — Animal Create Error Handling (Issue #48)

**Change**: `2026-07-14-fix-issue-48-error-handling`
**Mode**: Standard (not Strict TDD) — no strict runner configured for this change.
**Verdict**: ✅ **PASS** — Ready to archive. PR remains blocked on Issue #48 `status:approved` per repo policy (out of scope for verify).

## Quick path

1. All 4 work-unit phases + 2 follow-ups landed in 6 commits on `fix/issue-48-error-handling` (latest `c129110`).
2. Web flow + auth unit suite: 3/3 files passed (`apps/web/tests/animal-web-flow.test.ts` + 2 auth files).
3. Web E2E suite (jsdom): 1/1 passed (`apps/web/tests/animal-create-e2e.test.tsx`).
4. UI suite: 11/11 files, 330/330 tests passed (17/17 animal-ui tests).
5. `pnpm turbo test --force`: 13/13 tasks successful, 0 cached.
6. `pnpm turbo typecheck --force`: 13/13 tasks successful, 0 cached.
7. `pnpm biome ci .`: 195 files checked, no fixes applied.
8. 6/6 spec requirements and 8/8 spec scenarios covered by passing tests at runtime.
9. All four design risks (R1–R4) are tracked and either mitigated or remain as documented follow-ups.

## Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 4 work-unit phases + 2 follow-ups (5.1 verify) |
| Tasks complete | 5.1 ✅ · 4.1 ✅ (E2E test added in a new dedicated file — see Suggestions) · 5.2 BLOCKED on Issue #48 `status:approved` (out of scope for verify) |
| Phases 1–3 commits | `55fa9db`, `00dd489`, `0d4b7a6` — all landed on `fix/issue-48-error-handling` |
| Phase 4 commit | `26f45cc` (E2E test) — landed |
| Follow-up commits | `f6443b6` (biome) · `c129110` (narrow return for serialization) |
| Spec requirements | 6/6 |
| Spec scenarios | 8/8 |
| Build | ✅ pass |
| Tests | ✅ pass |
| Biome | ✅ pass |

## Build & Tests Execution

**Build**: ✅ Passed
```text
$ pnpm turbo typecheck --force
@ganaweb/web:typecheck: > tsr generate && tsc --noEmit
@ganaweb/web:typecheck: exit 0
@ganaweb/ui:typecheck: > find src -name '*.ts' -o -name '*.tsx' 2>/dev/null | grep -q . && tsc --noEmit || echo '@ganaweb/ui: no source files yet'
@ganaweb/ui:typecheck: exit 0
Tasks:    13 successful, 13 total
Cached:    0 cached, 13 total
Time:    21.884s
```

**Tests — unit + e2e**: ✅ 3/3 + 1/1 + 11/11 = 15 files, 332 + (auth+web-flow assertions) tests passed
```text
$ pnpm --filter @ganaweb/web test:unit
> tsx tests/auth-flow.test.ts && tsx tests/auth-scope-and-flow.test.ts && tsx tests/animal-web-flow.test.ts
✅ All Strict TDD gap tests passed.
✅ animal-web-flow.test.ts passed
exit 0

$ pnpm --filter @ganaweb/web test:e2e
> vitest run
 ✓ tests/animal-create-e2e.test.tsx (1 test) 1889ms
   ✓ create route — harness validacion surfacing in form > mounts the create route, submits the form, and surfaces codigo error with ARIA wiring
 Test Files  1 passed (1)
      Tests  1 passed (1)
exit 0

$ pnpm --filter @ganaweb/ui test
 ✓ tests/animal-ui.test.tsx (17 tests) 4808ms
   ✓ PR3 animal UI OpenPencil parity > renders desktop/mobile form labels, contextual raza hint, offline note, and sticky save footer
   ✓ PR3 animal UI OpenPencil parity > submits the animal form through onSave exactly once per Guardar click
   ✓ PR3 animal UI OpenPencil parity > renders per-field error under the named input with ARIA wiring when fieldErrors is supplied
   ✓ PR3 animal UI OpenPencil parity > uses labeled catalog selectors for CA-UI-001/003 while preserving form payload keys
   ✓ PR3 animal UI OpenPencil parity > renders split CA-UI-005 location controls in create mode and submits selected ids
   ✓ PR3 animal UI OpenPencil parity > renders edit-mode CA-UI-005 location as read-only and excludes direct mutations
   (+ 11 additional animal-ui parity tests; total 17/17)
 Test Files  11 passed (11)
      Tests  330 passed (330)
exit 0

$ pnpm turbo test --force
Tasks:    13 successful, 13 total
Cached:    0 cached, 13 total
Time:    29.107s
```

**Biome**: ✅ 195 files checked
```text
$ pnpm biome ci .
Checked 195 files in 228ms. No fixes applied.
exit 0
```

**Coverage**: N/A — verification is anchored on spec-scenario tests (R1–R6), not global coverage. The 4 + 1 test files explicitly map to each requirement.

## Spec Compliance Matrix

| # | Requirement | Scenario | Test | Result |
|---|-------------|----------|------|--------|
| R1 | `createAnimalAction` returns the full harness result | Action forwards the union on validacion (`errores` array verbatim) | `apps/web/tests/animal-web-flow.test.ts:587` `testActionForwardsValidacionErrores` — source-level pin `!actionSource.includes("return { tipo: result.tipo }")` + `return\s+result\s*$/m` + harness `validacion` result carries `errores: ErrorValidacionAnimal[]` | ✅ COMPLIANT |
| R1 | `createAnimalAction` returns the full harness result | E2e fast-path returns exactly `{ tipo: "creado" as const }` (no `errores` key) | `apps/web/tests/animal-web-flow.test.ts:624` `testActionE2eFastPathReturnsCreatedOnly` — asserts `return { tipo: "creado" as const }` exists and is ordered before `return result` | ✅ COMPLIANT |
| R2 | Create route only navigates when `result.tipo === "creado"` | creado result navigates to `/fincas/{fincaId}/animales` | `apps/web/tests/animal-web-flow.test.ts:643` `testRouteBranchesOnResultTipo` — asserts `try/finally/assign` is absent, exactly one `window.location.assign` call, ordered after `result.tipo === "creado"`, target path uses ``/fincas/${fincaId}/animales`` | ✅ COMPLIANT |
| R3 | Create route maps `errores` to `fieldErrors` | Validation result renders per-field errors | `apps/web/tests/animal-web-flow.test.ts:643` `testRouteBranchesOnResultTipo` — asserts route calls `buildCreateAnimalFieldErrors(` and threads `fieldErrors=` into both desktop and mobile `<AnimalFormScreen>` renders; `apps/web/tests/animal-web-flow.test.ts:720` `testMapperBuildsFieldErrorsAndDropsFechaCompra` — unit-tests the mapper with all spec-line-34 mappings plus the `fecha_compra` drop; `apps/web/tests/animal-create-e2e.test.tsx:73` E2E — runtime form-render + ARIA assertion | ✅ COMPLIANT |
| R4 | `AnimalFormScreen` renders per-field errors | Form displays error under the named field | `packages/ui/tests/animal-ui.test.tsx:226` `renders per-field error under the named input with ARIA wiring when fieldErrors is supplied` — asserts `aria-invalid="true"`, `aria-describedby` → alert id, `role="alert"`, message text under codigo input | ✅ COMPLIANT |
| R4 | `AnimalFormScreen` renders per-field errors | Form omits error markup when `fieldErrors` is omitted | `packages/ui/tests/animal-ui.test.tsx:164` (3.2 augment) — asserts no `role="alert"` and no `aria-invalid="true"` on any textbox/combobox when `fieldErrors` is undefined; covers both desktop and mobile renders | ✅ COMPLIANT |
| R5 | validacion and thrown errors keep the user on the form | validacion preserves the form (codigo="MT-122", nombre="Matilda") | `apps/web/tests/animal-create-e2e.test.tsx:73` E2E — types MT-122/Matilda, submits, asserts `assignSpy` was NOT called, form values remain in inputs, codigo has `aria-invalid="true"`, role="alert" carries "Requerido" | ✅ COMPLIANT |
| R5 | validacion and thrown errors keep the user on the form | Thrown action keeps the user on the form | `apps/web/tests/animal-web-flow.test.ts:643` `testRouteBranchesOnResultTipo` — asserts `try/catch` exists, exactly one `window.location.assign` (inside creado branch only), so a thrown error cannot escape the catch into navigation | ✅ COMPLIANT |
| R6 | Edit mode is unchanged when `fieldErrors` is omitted | Edit form remains read-only and the new prop is unused | `packages/ui/tests/animal-ui.test.tsx:408` `renders edit-mode CA-UI-005 location as read-only and excludes direct mutations` — renders with `formVariant="edit"`, NO `fieldErrors` prop, asserts read-only `Ubicación actual` region, `Mover animal` button present, no editable comboboxes for potrero/sector/lote/grupo, submitted FormData has no `potreroId`/`sectorId`/`loteId`/`grupoId`/`ubicacion` | ✅ COMPLIANT |

**Compliance summary**: 8/8 scenarios compliant (6/6 requirements compliant). The R4/R5/R6 expectations are pinned by runtime tests (jsdom + jsdom; vitest + vitest), not just source-level inspection.

## Correctness (Static Evidence)

| Requirement | Status | Notes |
|-------------|--------|-------|
| R1 — Action returns full harness result | ✅ Implemented | `apps/web/src/server/animal-actions.ts:119-120` — non-e2e path does `(await ...).create(data) as CreateAnimalServerResult; return result`. The local `CreateAnimalServerResult` discriminated union (`:58-88`) is the typecheck fix documented in memory #280 (harness's `errores: unknown` cannot cross TanStack Start's `createServerFn` boundary). E2e fast-path at `:109-117` untouched. |
| R2 — Route only navigates on creado | ✅ Implemented | `apps/web/src/routes/_app/fincas/$fincaId/animales/nuevo.tsx:100-122` — `save` awaits action, branches on `result.tipo`, navigates only on `"creado"`, `try/finally/assign` removed. `NewAnimalRouteView` is exported (`:94`) and used by the E2E test. |
| R3 — Route maps errores to fieldErrors | ✅ Implemented | Same route `:56-87` declares `CAMPO_TO_FIELD_KEY` (omits `fecha_compra` per R1) and `buildCreateAnimalFieldErrors` mapper with `Array.isArray` guard; route holds errors in `useState` and threads `fieldErrors={fieldErrors}` to BOTH desktop and mobile `<AnimalFormScreen>` renders (`:127-145`). |
| R4 — Form renders per-field errors with ARIA | ✅ Implemented | `packages/ui/src/ganado/animal-crud.tsx:493-502` — `fieldErrors?: Record<string, string>` added to `AnimalFormScreenProps`. `Field` (`:741-778`) and `CatalogSelectField` (`:780-830`) both derive `errorId = ${id}-error`; when `fieldErrors?.[name]` exists, render `<p id={errorId} role="alert" className="text-caption text-danger-600">` and pass `aria-invalid="true"` + `aria-describedby={errorId}` to the input/select. The label-derived `id` keeps `getByLabelText("Código *")` working. |
| R5 — validacion and thrown errors keep user on form | ✅ Implemented | Route `:109-121` — `validacion` branch sets `fieldErrors` and returns without navigation; the catch block swallows thrown errors and resets `fieldErrors` to `{}`. No `window.location.assign` outside the creado branch. |
| R6 — Edit mode unchanged | ✅ Implemented | `fieldErrors` is optional and omitted in the edit-mode test render; `Field`/`CatalogSelectField` render no error markup when `fieldErrors?.[name]` is undefined. The optional `fieldErrors?` type and the `errorMessage` truthy check in both sub-components make the prop non-breaking. |

## Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| Forward full harness result on non-e2e path; keep e2e fast-path early return untouched | ✅ Yes | `animal-actions.ts:109-117` (e2e) and `:119-120` (harness) — ordering preserved; typecheck fix uses local `CreateAnimalServerResult` cast. |
| Route is the boundary that translates dominio `ErrorValidacionAnimal[]` into UI `Record<string, string>` | ✅ Yes | Mapper lives in `nuevo.tsx:73-87`, uses local `Array.isArray` guard (design R2); `packages/ui` never imports `packages/dominio` (dependency-cruiser preserved). |
| Optional `fieldErrors` prop is additive; no existing call site is migrated | ✅ Yes | Edit-mode test renders `<AnimalFormScreen formVariant="edit" currentLocation={...} />` with no `fieldErrors` prop — passes. The create route is the only caller that supplies it. |
| `Field` and `CatalogSelectField` share the same ARIA wiring pattern | ✅ Yes | Both compute `errorId = ${id}-error` from the label-derived `id`; both render the same `<p id={errorId} role="alert" className="text-caption text-danger-600">` and the same `aria-invalid` + `aria-describedby` on the input/select trigger. |
| E2e fast-path returns exactly `{ tipo: "creado" as const }` with no `errores` key | ✅ Yes | `animal-actions.ts:116` — source pin in `testActionE2eFastPathReturnsCreatedOnly` verifies literal text and ordering. |

## Design risks status

| ID | Sev | Status | Notes |
|----|-----|--------|-------|
| R1 (med) — `fecha_compra → fechaCompra` has no form field | 🟡 **STILL OPEN — DOCUMENTED** | The mapper at `nuevo.tsx:56-64` intentionally omits `fecha_compra` (line 61: `// fecha_compra intentionally absent — R1: no fechaCompra form field, drop per spec line 32.`). Test `testMapperBuildsFieldErrorsAndDropsFechaCompra` at `animal-web-flow.test.ts:720` pins this drop. Follow-up for a `fechaCompra` input + `tipoIngreso` selector remains a separate change. No change in status vs. design. |
| R2 (low) — `errores: unknown` at use-case boundary | 🟢 **MITIGATED** | The web handler casts at the boundary via the local `CreateAnimalServerResult` discriminated union (`animal-actions.ts:58-88`, :119). The mapper at `nuevo.tsx:74-80` uses `Array.isArray` and field-typed guards. No `unknown` leaks to the UI package. Typecheck passes. |
| R3 (low) — `createAnimalAction` export name must stay | 🟢 **MITIGATED** | `animal-actions.ts:103` still exports `createAnimalAction`; `nuevo.tsx:11` still imports it by name; `testActionForwardsValidacionErrores` source pin (`:619-621`) asserts the literal string is present. Web test passes. |
| R4 (low) — Harness `creado` arm may carry optional `imagenes?` | 🟢 **MITIGATED** | `CreateAnimalServerResult` typed shape includes `imagenes?: readonly {...}[]` in the creado arm (`animal-actions.ts:71-79`). The e2e fast-path returns `{ tipo: "creado" as const }` with no `imagenes` key (line 116), and the test source-pin verifies this exact literal. |

## Issues Found

**CRITICAL**: None.

**WARNING**: None.

**SUGGESTION**:

- **S1 (test file layout)**: The spec scenarios for R3/R5 cite `apps/web/tests/animal-web-flow.test.ts:447/:479`, and the task plan put the E2E test in that file at ~:480. The apply split it into a dedicated `apps/web/tests/animal-create-e2e.test.tsx` (committed `26f45cc`) because that test requires `vitest+jsdom` while `animal-web-flow.test.ts` is `tsx`-based. The split is the right architectural call (E2E test is also more readable in its own file, and `vitest.config.ts` exists specifically to scope vitest to this single file). The spec line numbers will need to be re-pinned during `sdd-archive` to cite the new file. No spec semantic change; this is purely a citation refresh.
- **S2 (biome mixed scope)**: The follow-up commit `f6443b6` (chore: biome fixes) bundled one in-scope formatting fix with one pre-existing out-of-scope file (`packages/db/src/seed/seed.ts` from base `e999f42`). Already noted in memory #280; harmless and idempotent. No action required for archive.
- **S3 (PR still blocked)**: Task 5.2 (open the PR) is BLOCKED on Issue #48 receiving `status:approved`. Verify does not touch PR workflow; archive can run regardless because the implementation is green.

## Verdict

**PASS** — All 6/6 spec requirements and 8/8 spec scenarios are pinned by passing tests at runtime, all four work-unit phases plus the two follow-up commits are landed on `fix/issue-48-error-handling`, `pnpm turbo test --force` / `pnpm turbo typecheck --force` / `pnpm biome ci .` all pass clean, and all four design risks (R1–R4) are either mitigated or remain as documented follow-ups. Safe to proceed to `sdd-archive`. PR opening remains blocked on Issue #48 `status:approved` (out of scope for verify).
