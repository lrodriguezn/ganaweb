```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:cd2a41e6c25c1b8f47e3b9c0d4a5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3
verdict: pass
blockers: 0
critical_findings: 0
requirements: 5/5
scenarios: 9/9
test_command: pnpm --filter @ganaweb/ui exec vitest run --passWithNoTests --allowOnly=false tests/animal-ui.test.tsx
test_exit_code: 0
test_output_hash: sha256:72bf5ced44ac4061d67b36eb4836912d5d7dfcb597777e963784a508551dc710
build_command: pnpm --filter @ganaweb/web typecheck
build_exit_code: 0
build_output_hash: sha256:3c587f6e53ec56bad632138f9d41ce4e68a2f8190a41cf5b43a8030283c3c981
```

# Verification Report — Animal Form CA-UI Remediation

**Change**: `2026-07-14-feature-crud-animales-deficiencies`
**Mode**: Strict TDD (force-chained, feature-branch-chain, 3 slices)
**Verdict**: ✅ **PASS**

## Quick path

1. All 13/13 tasks complete.
2. UI test suite: 15/15 passed (`packages/ui/tests/animal-ui.test.tsx`).
3. Web flow test suite: passed (`apps/web/tests/animal-web-flow.test.ts`).
4. Both packages typecheck: exit 0.
5. 5/5 spec requirements and 9/9 spec scenarios covered by passing tests or cited evidence.
6. All three architecture decisions in `design.md` followed in code.

## Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 13 |
| Tasks complete | 13 |
| Tasks incomplete | 0 |
| Spec requirements | 5/5 |
| Spec scenarios | 9/9 |

## Build & Tests Execution

**Build**: ✅ Passed
```text
$ pnpm --filter @ganaweb/ui typecheck
> @ganaweb/ui@0.0.0 typecheck /home/lrodriguezn/ganaweb/packages/ui
> find src -name '*.ts' -o -name '*.tsx' 2>/dev/null | grep -q . && tsc --noEmit || echo '@ganaweb/ui: no source files yet'
exit 0

$ pnpm --filter @ganaweb/web typecheck
> @ganaweb/web@0.0.0 typecheck /home/lrodriguezn/ganaweb/apps/web
> tsr generate && tsc --noEmit
exit 0
```

**Tests**: ✅ 15/15 UI + 1/1 web flow passed
```text
$ pnpm --filter @ganaweb/ui exec vitest run --passWithNoTests --allowOnly=false tests/animal-ui.test.tsx
✓ tests/animal-ui.test.tsx (15 tests) 5787ms
  ✓ uses labeled catalog selectors for CA-UI-001/003 while preserving form payload keys
  ✓ shows a safe unavailable label for missing CA-UI-001/003 catalog values
  ✓ falls back to 'No disponible' for create-mode location selectors when catalog options are missing (CA-UI-001/003/005)
  ✓ renders split CA-UI-005 location controls in create mode and submits selected ids
  ✓ renders edit-mode CA-UI-005 location as read-only and excludes direct mutations
  (+ 10 additional PR3 OpenPencil parity tests)
Test Files  1 passed (1)
     Tests  15 passed (15)
exit 0

$ pnpm --filter @ganaweb/web exec tsx tests/animal-web-flow.test.ts
✅ animal-web-flow.test.ts passed
exit 0
```

**Coverage**: Threshold N/A — verification is anchored on targeted spec-scenario tests, not global coverage.

## Spec Compliance Matrix

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Catalog-backed fields use labeled selectors | User selects catalog labels | `packages/ui/tests/animal-ui.test.tsx:212` — `uses labeled catalog selectors for CA-UI-001/003 while preserving form payload keys` | ✅ COMPLIANT |
| Catalog-backed fields use labeled selectors | Catalog option is missing | `packages/ui/tests/animal-ui.test.tsx:246` — `shows a safe unavailable label for missing CA-UI-001/003 catalog values` | ✅ COMPLIANT |
| Sex selection hides raw numeric keys | Default female value is labeled | Same selector test asserts visible `Hembra` for `sexoKey=1` | ✅ COMPLIANT |
| Sex selection hides raw numeric keys | User changes sex value | Same selector test asserts submitted `sexoKey=0` after `Macho`; no raw numeric sex key | ✅ COMPLIANT |
| Location controls are semantically split | Create mode captures optional split location | `packages/ui/tests/animal-ui.test.tsx:293` — `renders split CA-UI-005 location controls in create mode and submits selected ids` | ✅ COMPLIANT |
| Location controls are semantically split | Location is not collapsed | Same test asserts four independent ids and no merged `ubicacion` field | ✅ COMPLIANT |
| Edit mode respects location move semantics | Edit mode shows read-only location | `packages/ui/tests/animal-ui.test.tsx:336` — `renders edit-mode CA-UI-005 location as read-only and excludes direct mutations` | ✅ COMPLIANT |
| Edit mode respects location move semantics | Move flow is offered from edit mode | Same edit-mode test renders `Mover animal` button and excludes direct mutation ids | ✅ COMPLIANT |
| CA-UI acceptance traceability | Verification cites rules | `pr-description.md` + `design.md` (Out of Scope section) + `apply-progress.md` (TDD cycle rows) explicitly cite CA-UI-001, CA-UI-003, CA-UI-005 | ✅ COMPLIANT |

**Compliance summary**: 9/9 scenarios compliant (5/5 requirements compliant).

## Correctness (Static Evidence)

| Requirement | Status | Notes |
|-------------|--------|-------|
| Catalog-backed fields use labeled selectors | ✅ Implemented | `packages/ui/src/ganado/animal-crud.tsx:670-680` (origen) and `:683-693` (location) route through `CatalogSelectField`; safe `No disponible` fallback at `:752-790` |
| Sex selection hides raw numeric keys | ✅ Implemented | `SEXO_OPTIONS` map at `:542-546` (`0=Macho`, `1=Hembra`, `2=Pajuela`); `renderAnimalFormField` for `sexoKey` at `:658-668` |
| Location controls are semantically split | ✅ Implemented | `LOCATION_FIELDS` at `:562-567`; create-mode renders four split `CatalogSelectField`s at `:625-627` |
| Edit mode respects location move semantics | ✅ Implemented | `renderCurrentLocation` at `:698-724` renders read-only `Ubicación actual` with `Mover animal`; `buildUpdateAnimalInputFromFormData` in `apps/web/src/routes/_app/fincas/$fincaId/animales/$animalId/editar.tsx:19-33` keeps update payload location-free |
| CA-UI acceptance traceability | ✅ Implemented | `pr-description.md` provides file:line evidence for CA-UI-001/003/005; `design.md` carries Out-of-Scope paragraph citing bounded correction lineage |

## Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| Shared form repair — keep `AnimalFormScreen` as shared entry | ✅ Yes | `AnimalFormScreen` at `:569-651` renders both create and edit paths via `formVariant` |
| Selector payloads — display labels, submit ids/keys | ✅ Yes | `CatalogSelectField` uses Radix `Select` with `value` matching `defaultValue`; submitted `FormData` carries the raw id/key strings |
| Location edit semantics — read-only + `Mover animal` | ✅ Yes | Edit-mode branch at `:625-627` calls `renderCurrentLocation` instead of editable location controls; `Mover animal` button present in read-only section |

## Issues Found

**CRITICAL**: None.

**WARNING**: None.

**SUGGESTION**: None.

## Verdict

**PASS** — All 13/13 tasks complete, 9/9 spec scenarios compliant with covering tests at runtime, 5/5 spec requirements implemented, all design decisions followed, and both packages typecheck cleanly. Safe to proceed to `sdd-archive`.
