# Archive Report: 2026-07-14-fix-issue-48-error-handling

## Mode

OpenSpec archive path. Manual archive of a fully-verified change. No native review/provenance gate was active for this change (single PR, no chained slices); the verify report's `verdict: pass` and the spec-scenario test evidence are the source of truth for archive readiness.

## Summary

The change `2026-07-14-fix-issue-48-error-handling` (Animal Create Error Handling, Issue #48) has been archived. The two pre-existing defects flagged in the `2026-07-14-feature-crud-animales-deficiencies` bounded correction lineage — `try/finally/assign` swallowing `validacion`/thrown errors with a successful-looking redirect, and `createAnimalAction` discarding the harness's `errores` array — are now fixed.

All 4 work-unit phases plus 2 follow-ups landed in 6 commits on `fix/issue-48-error-handling`. Verification passed: 6/6 spec requirements, 8/8 spec scenarios, 0 CRITICAL, 0 WARNING, 3 SUGGESTION. The implementation is green (`pnpm turbo test --force`, `pnpm turbo typecheck --force`, `pnpm biome ci .` all pass) and the branch is pushed.

**External gate**: PR opening is BLOCKED on Issue #48 receiving the `status:approved` label (repo policy, not an SDD-cycle gate). The branch `fix/issue-48-error-handling` is pushed and ready; the orchestrator will re-launch `branch-pr` to open the PR after the label is granted.

The delta spec was promoted from `openspec/changes/2026-07-14-fix-issue-48-error-handling/specs/animal-create-validation-feedback/spec.md` to the main spec source of truth at `openspec/specs/animal-create-validation-feedback/spec.md` (new domain). The change folder is now under `openspec/changes/archive/2026-07-14-fix-issue-48-error-handling/` per the OpenSpec convention.

## Verified Status

| Metric | Value |
|--------|-------|
| Tasks total | 4 work-unit phases + 2 follow-ups (5.1 verify) |
| Tasks complete | 5.1 ✅ · 4.1 ✅ (E2E test landed in `apps/web/tests/animal-create-e2e.test.tsx`) |
| Tasks open | 5.2 (PR) — BLOCKED on Issue #48 `status:approved` label (out of scope for SDD cycle) |
| Spec requirements | 6/6 compliant |
| Spec scenarios | 8/8 compliant |
| Verify verdict | PASS |
| CRITICAL findings | 0 |
| WARNING findings | 0 |
| SUGGESTION findings | 3 (S1 test file layout split, S2 biome mixed scope, S3 PR still blocked) |
| Implementation | Green — `pnpm turbo test --force` 13/13, `pnpm turbo typecheck --force` 13/13, `pnpm biome ci .` 195 files clean |

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| `animal-create-validation-feedback` | Created (full spec, not delta) | 6 requirements, 8 scenarios, `Rule Citations` already present in the source spec (CA-CRE-001/002/003/004, IA-003, T-003, T-004) |

The delta spec is a complete spec (not a delta with `ADDED`/`MODIFIED`/`REMOVED` sections), so it was copied directly to the main specs source of truth at `openspec/specs/animal-create-validation-feedback/spec.md`. The `Rule Citations` section was already authored in the source spec to match the convention of the other main specs in this project (`openspec/specs/web/spec.md`, `openspec/specs/animal-crud-ui/spec.md`).

## Source of Truth Updated

The following main spec now reflects the new behavior:

- `openspec/specs/animal-create-validation-feedback/spec.md` — Animal create action error contract: full harness result, branch on `result.tipo`, `errores` → `fieldErrors` mapper (drops `fecha_compra` per R1), per-field ARIA wiring on the form, `fieldErrors` is optional (edit mode unchanged).

## Archive Contents

| Artifact | Status | Notes |
|----------|--------|-------|
| `proposal.md` | ✅ | Intent, scope, capabilities, affected areas, risks, rollback, success criteria. |
| `design.md` | ✅ | Architecture, type contract (verbatim), component changes, mapping table (`campo` → `fieldErrors` key → form field), test plan, Out-of-Scope paragraph, 4 design risks (R1–R4). |
| `specs/animal-create-validation-feedback/spec.md` (delta) | ✅ | Moved to canonical `openspec/specs/animal-create-validation-feedback/spec.md`; the change-local `specs/` directory is empty after the promotion. |
| `tasks.md` | ✅ | 4 work-unit phases + 2 follow-up tasks. Phase 5.2 (PR open) is BLOCKED on the `status:approved` label, with explicit `BLOCKED on Issue #48 status:approved label — repo policy` annotation. |
| `verify-report.md` | ✅ | PASS verdict, 6/6 requirements, 8/8 scenarios, build/test/biome evidence, design risk status, 3 SUGGESTION findings, typecheck fix narrative for follow-up commit `c129110`. |
| `archive-report.md` | ✅ | This file. |

## Commits (6 total on `fix/issue-48-error-handling`)

All commits are in chronological order, with the most recent at the bottom. Base is `e999f42` (`unificacion seed`).

| # | Hash | Subject |
|---|------|---------|
| 1 | `55fa9db` | `fix(animal-create): forward full harness result from createAnimalAction` — Phase 1 (Action Widen). Source-level pin rejects the narrowing `return { tipo: result.tipo }` form and asserts the harness path returns the full result. E2e fast-path early return preserved. |
| 2 | `00dd489` | `fix(animal-create): branch create route on result.tipo and map errores to fieldErrors` — Phase 2 (Route). Drops the `try/finally/assign`. `save()` branches on `result.tipo`: `creado` → `window.location.assign`, `validacion` → `buildCreateAnimalFieldErrors` mapper, thrown/other → form stays mounted, `fieldErrors` cleared. |
| 3 | `0d4b7a6` | `feat(animal-form): add optional fieldErrors prop with ARIA wiring` — Phase 3 (Form). `AnimalFormScreenProps` adds optional `fieldErrors?: Record<string, string>`. `Field` and `CatalogSelectField` derive `errorId = ${id}-error` from the label-derived `id`; render `<p role="alert">` and pass `aria-invalid="true"` + `aria-describedby` on the input/select when `fieldErrors?.[name]` exists. |
| 4 | `26f45cc` | `test(animal-create): add e2e test for harness validacion surfacing in form` — Phase 4 (E2E). Pins the three integration-level outcomes from spec scenarios (no `assign` on `validacion`, `aria-invalid="true"` on `codigo`, `role="alert"` with the error text). Route exercised through the exported `NewAnimalRouteView`. |
| 5 | `f6443b5` | `chore: biome fixes` — Follow-up. Bundle of biome formatting on the in-scope web test plus one pre-existing out-of-scope file (`packages/db/src/seed/seed.ts` from base `e999f42`). Harmless and idempotent. Already noted in memory #280 (S2). |
| 6 | `c129110` | `fix(animal-create): narrow createAnimalAction return for serialization` — Follow-up / typecheck fix. Commit `55fa9db`'s `return result` introduced a typecheck regression: the harness's `errores: unknown` (typed at `packages/aplicacion/src/casos-uso/animales/index.ts:359`) cannot be serialized through TanStack Start's `createServerFn` boundary. Fix: declare a local `CreateAnimalServerResult` discriminated union in `apps/web/src/server/animal-actions.ts` and cast at the boundary. The harness type is intentionally untouched (out of scope). |

The branch is pushed to `origin/fix/issue-48-error-handling`; the working tree on the branch matches `c129110`.

## Spec Compliance Matrix

| # | Requirement | Scenarios | Result |
|---|-------------|-----------|--------|
| R1 | `createAnimalAction` returns the full harness result | Action forwards `validacion` (with `errores` array verbatim); e2e fast-path returns exactly `{ tipo: "creado" as const }` (no `errores` key) | ✅ 2/2 |
| R2 | Create route only navigates when `result.tipo === "creado"` | `creado` calls `window.location.assign('/fincas/{fincaId}/animales')` | ✅ 1/1 |
| R3 | Create route maps `errores` to `fieldErrors` | Validation result renders per-field errors | ✅ 1/1 |
| R4 | `AnimalFormScreen` renders per-field errors | Form displays error under the named field; form omits error markup when `fieldErrors` is omitted | ✅ 2/2 |
| R5 | `validacion` and thrown errors keep the user on the form | `validacion` preserves the form values; thrown action keeps the form mounted | ✅ 2/2 |
| R6 | Edit mode is unchanged when `fieldErrors` is omitted | Edit form remains read-only, new prop unused, payload contract intact | ✅ 1/1 (no semantic test, edit-mode test still passes with the new prop omitted) |

**Compliance summary**: 6/6 requirements compliant, 8/8 scenarios compliant. The R4/R5/R6 expectations are pinned by runtime tests (jsdom + vitest), not just source-level inspection. The R1/R2/R3 expectations are pinned by `tsx`-based assertions on the source string plus the new `apps/web/tests/animal-create-e2e.test.tsx` E2E.

## Design risks status

| ID | Sev | Status | Notes |
|----|-----|--------|-------|
| R1 (med) — `fecha_compra → fechaCompra` has no form field | 🟡 **STILL OPEN — DOCUMENTED** | The mapper at `nuevo.tsx:56-64` intentionally omits `fecha_compra` (line 61: `// fecha_compra intentionally absent — R1: no fechaCompra form field, drop per spec line 32.`). Test `testMapperBuildsFieldErrorsAndDropsFechaCompra` pins this drop. Follow-up for a `fechaCompra` input + `tipoIngreso` selector that drives CA-CRE-002 remains a separate change. No change in status vs. design. |
| R2 (low) — `errores: unknown` at use-case boundary | 🟢 **MITIGATED** | The web handler casts at the boundary via the local `CreateAnimalServerResult` discriminated union (`animal-actions.ts:58-88`, :119). The mapper at `nuevo.tsx:74-80` uses `Array.isArray` and field-typed guards. No `unknown` leaks to the UI package. Typecheck passes. |
| R3 (low) — `createAnimalAction` export name must stay | 🟢 **MITIGATED** | `animal-actions.ts:103` still exports `createAnimalAction`; `nuevo.tsx:11` still imports it by name; `testActionForwardsValidacionErrores` source pin (`:619-621`) asserts the literal string is present. Web test passes. |
| R4 (low) — Harness `creado` arm may carry optional `imagenes?` | 🟢 **MITIGATED** | `CreateAnimalServerResult` typed shape includes `imagenes?: readonly {...}[]` in the creado arm (`animal-actions.ts:71-79`). The e2e fast-path returns `{ tipo: "creado" as const }` with no `imagenes` key (line 116), and the test source-pin verifies this exact literal. |

## Issues Found

**CRITICAL**: None.

**WARNING**: None.

**SUGGESTION** (inherited verbatim from verify-report.md):

- **S1 (test file layout)**: The spec scenarios for R3/R5 cite `apps/web/tests/animal-web-flow.test.ts:447/:479`, and the task plan put the E2E test in that file at ~:480. The apply split it into a dedicated `apps/web/tests/animal-create-e2e.test.tsx` (committed `26f45cc`) because that test requires `vitest+jsdom` while `animal-web-flow.test.ts` is `tsx`-based. The split is the right architectural call (E2E test is more readable in its own file, and `vitest.config.ts` exists specifically to scope vitest to this single file). The spec line numbers were re-pinned during archive to cite the new file.
- **S2 (biome mixed scope)**: The follow-up commit `f6443b5` (chore: biome fixes) bundled one in-scope formatting fix with one pre-existing out-of-scope file (`packages/db/src/seed/seed.ts` from base `e999f42`). Already noted in memory #280; harmless and idempotent.
- **S3 (PR still blocked)**: Task 5.2 (open the PR) is BLOCKED on Issue #48 receiving `status:approved`. The SDD cycle is closed regardless; this archive does not touch the PR workflow.

## External Gate (out of scope for SDD cycle)

- **PR opening BLOCKED on Issue #48 `status:approved` label.** Repo policy requires the `status:approved` label on the issue before a PR is opened. The branch `fix/issue-48-error-handling` is pushed and ready; the orchestrator will re-launch `branch-pr` to open the PR after the label is granted. The implementation is green and the SDD cycle is fully archived.

## SDD Cycle Status

- Phase: **archive** ✅
- Next phase: **none (SDD cycle complete for this change)**
- Next recommended action: open PR (outside archive scope, blocked on `status:approved` label) or start a new change for the `fechaCompra` + `tipoIngreso` follow-up (design R1).

## Files Touched in This Archive Pass

- **Created**: `openspec/specs/animal-create-validation-feedback/spec.md` (new domain main spec, promoted from the change-local delta)
- **Moved**: `openspec/changes/2026-07-14-fix-issue-48-error-handling/` → `openspec/changes/archive/2026-07-14-fix-issue-48-error-handling/` (change folder archived; active `openspec/changes/` is now empty for this change)
- **Created**: `openspec/changes/archive/2026-07-14-fix-issue-48-error-handling/archive-report.md` (this file)
- **Removed (empty dir)**: `openspec/changes/2026-07-14-fix-issue-48-error-handling/specs/animal-create-validation-feedback/` (delta spec promoted; the now-empty `specs/` subdirectory was removed with `rmdir`)

No production code, no `packages/`, no `apps/`, no `db/`, no `scripts/`, and no `openspec/config.yaml` were modified. The `openspec/changes/archive/2026-07-14-feature-crud-animales-deficiencies/` and other prior archives were NOT touched.

## PR Description Draft

The orchestrator should copy-paste the following block into the PR body when `branch-pr` is re-launched after the `status:approved` label lands on Issue #48:

```markdown
## Summary

Fix the two pre-existing error-handling defects in the animal create flow
flagged by the `2026-07-14-feature-crud-animales-deficiencies` review and
tracked in Issue #48. The create route now branches on `result.tipo` and
maps the harness's structured `errores` to per-field messages on the form;
the server action returns the full harness result instead of dropping the
`errores` array.

Closes #48.

## Defects fixed

1. `apps/web/src/routes/_app/fincas/$fincaId/animales/nuevo.tsx:60-68` wrapped
   `createAnimalAction` in `try { ... } finally { window.location.assign(...) }`,
   so `validacion` and thrown errors triggered a successful-looking redirect
   and the user lost form values. The new route awaits the action and only
   navigates when `result.tipo === "creado"`.

2. `apps/web/src/server/animal-actions.ts:77-78` returned
   `return { tipo: result.tipo }`, discarding the structured `errores` array
   the runtime harness already produces. The handler now returns the full
   result (with a local `CreateAnimalServerResult` discriminated union so the
   harness's `errores: unknown` type does not leak across the
   `createServerFn` boundary).

## Work-unit commits (4) + follow-ups (2)

1. `55fa9db` `fix(animal-create): forward full harness result from createAnimalAction` — Phase 1 (Action Widen)
2. `00dd489` `fix(animal-create): branch create route on result.tipo and map errores to fieldErrors` — Phase 2 (Route)
3. `0d4b7a6` `feat(animal-form): add optional fieldErrors prop with ARIA wiring` — Phase 3 (Form)
4. `26f45cc` `test(animal-create): add e2e test for harness validacion surfacing in form` — Phase 4 (E2E)
5. `f6443b5` `chore: biome fixes` (follow-up)
6. `c129110` `fix(animal-create): narrow createAnimalAction return for serialization` (follow-up typecheck fix; see "Typecheck follow-up" below)

## Typecheck follow-up

Commit `55fa9db`'s `return result` introduced a TS2345 regression: the
harness's `errores: unknown` (typed at
`packages/aplicacion/src/casos-uso/animales/index.ts:359`) cannot cross
TanStack Start's `createServerFn` boundary. Commit `c129110` resolves this
mechanically with a local `CreateAnimalServerResult` discriminated union
and a cast at the boundary (`apps/web/src/server/animal-actions.ts:58-88`,
:119). The harness type is intentionally untouched (out of scope; the
harness returns `unknown` and the route's mapper uses an `Array.isArray`
guard). `pnpm turbo typecheck --force` is now clean (13/13).

## Documented follow-up

Design R1 is still open: `fecha_compra → fechaCompra` has no form field
(the form only has `fechaNacimiento`), so `errores` for `fecha_compra`
(CA-CRE-002) are intentionally dropped by the mapper. The mapper at
`nuevo.tsx:56-64` carries the comment `// fecha_compra intentionally
absent — R1: no fechaCompra form field, drop per spec line 32.`. Test
`testMapperBuildsFieldErrorsAndDropsFechaCompra` pins this drop. A
follow-up OpenSpec change should add a `fechaCompra` input + a
`tipoIngreso` selector that drives CA-CRE-002.

## Verification

- `pnpm --filter @ganaweb/web test:unit` → 3/3 files passed (auth-flow, auth-scope-and-flow, animal-web-flow).
- `pnpm --filter @ganaweb/web test:e2e` → 1/1 file passed (`animal-create-e2e.test.tsx`, 1 test).
- `pnpm --filter @ganaweb/ui test` → 11/11 files, 330/330 tests passed (17/17 `animal-ui` tests).
- `pnpm turbo test --force` → 13/13 tasks successful, 0 cached.
- `pnpm turbo typecheck --force` → 13/13 tasks successful, 0 cached.
- `pnpm biome ci .` → 195 files checked, no fixes applied.

## Out of scope

- Harness, `crearAnimal`, validation-logic changes.
- Catalog selectors (`animal-crud-ui`); FincaSwitcher/header defects.
- Edit route, generic banners for `no_autenticado` / `permiso_denegado` /
  `finca_no_autorizada` / `transaccion_fallida`.
- `fechaCompra` + `tipoIngreso` (design R1, follow-up only).

## Rollback boundary

Revert the three source files
(`apps/web/src/server/animal-actions.ts`,
`apps/web/src/routes/_app/fincas/$fincaId/animales/nuevo.tsx`,
`packages/ui/src/ganado/animal-crud.tsx`)
and the two test files
(`apps/web/tests/animal-web-flow.test.ts`,
`apps/web/tests/animal-create-e2e.test.tsx`,
`packages/ui/tests/animal-ui.test.tsx`).
No schema, harness, or `crearAnimal` changes — the wider return shape
restores exactly to the prior `{ tipo }`-only shape.
```
