# Apply Progress: Recovery Slices A–C

- Recovery base SHA: `16fcfd56e198094a60eebeb7f9591a5c1199ff62`
- Completed recovery slices: `A`, `B`, `C`
- Completed tasks: `1.1`, `1.2`, `1.3`, `1.4`, `6.1`, `6.2`, `6.3`, `6.4`, `7.1`, `7.2`, `7.3`, `7.4`

## TDD Cycle Evidence

| Task | Test file | Layer | Safety net | RED | GREEN | Triangulate | Refactor |
|---|---|---|---|---|---|---|---|
| 1.1–1.3 | `apps/web/tests/animal-web-flow.test.ts` | Runtime/config | Existing focused harness passed | Production gate/config failed | Focused harness passed | production, dev, CI, test, Playwright | None needed |
| 1.4 | `packages/ui/tests/animal-ui.test.tsx` | UI/SSR | 25/25 passed | SSR readiness assertion failed | 26/26 passed | SSR-disabled + client-enabled | None needed |
| 6.1–6.2 | `packages/aplicacion/tests/catalogo-sexo.test.ts` | Unit | N/A (new files) | 5/5 failed: missing export | 5/5 passed | canonical `0/1/2`; null/unknown/noncanonical; duplicate/empty | None needed |
| 6.3–6.4 | `packages/db/tests/catalogo-global-infrastructure.test.ts` | DB adapter contract | N/A (new files) | Module resolution failed: adapter absent | 2/2 passed | active global query/mapping; propagated DB failure | None needed |
| 7.1–7.2 | `tests/animal-catalogo-sexo.test.ts` | Web/runtime | 3/3 partial tests passed | 2/4 failed: numeric accepted and injected unavailable catalog wrote | 4/4 passed | available, unavailable, rejected noncanonical/tampered/missing, write/no-write | Added explicit catalog-port injection; tests remain green |
| 7.3–7.4 | `packages/ui/tests/animal-ui.test.tsx`, `tests/e2e/animales.spec.ts` | UI/E2E | 26/26 UI baseline passed | Existing hidden-input E2E locator failed after dynamic select replaced it | UI 27/27 passed; desktop and mobile Playwright each 1/1 passed | desktop/mobile unique IDs, dynamic labels, unavailable state, FormData selection | Replaced locator with active-frame combobox and portal option; asserted native FormData |

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
