# Archive Report: Rediseñar layout formulario animal

- **Change**: redisenar-layout-formulario-animal
- **Issue**: [#97](https://github.com/lrodriguezn/ganaweb/issues/97)
- **Archived**: 2026-07-24
- **Status**: ✅ Complete

## Summary

Rediseño estructural del formulario Crear/Editar animal — de un muro plano de 22 campos en `grid-cols-2` a 4 secciones visibles con grillas proporcionales + 1 bloque colapsable "Detalles adicionales", reduciendo la vista inicial a 10 campos. Se corrigieron violaciones CA-UI-005 (sync hint solo offline) y CA-UI-014 (solo 4 campos llevan asterisco). Se añadió `footerChildren` al DatePicker para reubicar "Estimar por edad" dentro del popover.

## Cycle

| Phase | Status | Artifacts |
|---|---|---|
| explore | ✅ | Engram #475 |
| propose | ✅ | `proposal.md` (82 líneas) |
| spec | ✅ | `specs/animal-crud-ui/spec.md` (492 líneas, 10 reqs, 33 scenarios) |
| design | ✅ | `design.md` (145 líneas) |
| tasks | ✅ | `tasks.md` (31/34 tasks) |
| apply | ✅ | 8 commits, 9 archivos modificados |
| verify | ✅ (re-verified) | `verify-report.md` — CRITICAL fix confirmado |
| archive | ✅ | Spec sincronizada a `openspec/specs/animal-crud-ui/spec.md` (943 líneas) |

## Delivery

- **Strategy**: single-pr-default
- **PR budget**: ~1282 LOC (1073 insertions, 209 deletions)
- **Commits**: 9 (7 WU + 1 artifact + 1 CRITICAL fix)

## Test Results

- `pnpm turbo test`: 410/410 ✅
- `pnpm turbo typecheck`: 13/13 ✅
- `pnpm turbo build`: 7/7 ✅

## Files Changed

| File | Change |
|---|---|
| `packages/ui/src/ganado/animal-crud.tsx` | Reestructurado: 4 secciones + Collapsible + fixes |
| `packages/ui/src/ganado/animal-crud-infra.ts` | Nuevo: `useOnlineStatus`, `SECTION_LAYOUT`, `sectionFor` |
| `packages/ui/src/primitives/date-picker.tsx` | Extendido: `footerChildren` slot |
| `packages/ui/tests/animal-ui.test.tsx` | +26 tests (secciones, Collapsible, mobile, fixes) |
| `packages/ui/tests/date-picker.test.tsx` | +2 tests (footerChildren) |
| `openspec/specs/animal-crud-ui/spec.md` | Delta merged (452→943 líneas) |

## Spec Coverage

| Rule | Status |
|---|---|
| CA-UI-005 (sync hint offline) | ✅ |
| CA-UI-009 (collapsible closed on create) | ✅ |
| CA-UI-010 (error opens collapsible) | ✅ |
| CA-UI-011 (ORIGEN conditionals) | ✅ |
| CA-UI-012 (esDeMonta in collapsible) | ✅ |
| CA-UI-013 (Estimar inside popover) | ✅ |
| CA-UI-014 (4 asterisks only) | ✅ |
| CA-UI-015 (footer sticky) | ✅ |
| CA-UI-016..018 (design tokens) | ✅ (no hex/`dark:`/inline style) |

## Deferred

- T-501: Playwright E2E @ 375px mobile
- T-502: Playwright E2E @ 1280px desktop
- T-503: 10-theme visual sweep
- T-303: scrollIntoView call args assertion in test

## Warnings (non-blocking)

- `noExcessiveCognitiveComplexity` on `AnimalFormScreen` (37 > 15) — post-archive refactor candidate
- `useExhaustiveDependencies` in `JSON.stringify(detailFieldErrors)` effect (intentional pattern)
