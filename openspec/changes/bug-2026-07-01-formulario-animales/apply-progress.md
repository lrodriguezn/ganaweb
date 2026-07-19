# Apply Progress: Recovery Slices A–B

- Recovery base SHA: `16fcfd56e198094a60eebeb7f9591a5c1199ff62`
- Completed recovery slices: `A`, `B`
- Completed tasks: `1.1`, `1.2`, `1.3`, `1.4`, `6.1`, `6.2`, `6.3`, `6.4`

## TDD Cycle Evidence

| Task | Test file | Layer | Safety net | RED | GREEN | Triangulate | Refactor |
|---|---|---|---|---|---|---|---|
| 1.1–1.3 | `apps/web/tests/animal-web-flow.test.ts` | Runtime/config | Existing focused harness passed | Production gate/config failed | Focused harness passed | production, dev, CI, test, Playwright | None needed |
| 1.4 | `packages/ui/tests/animal-ui.test.tsx` | UI/SSR | 25/25 passed | SSR readiness assertion failed | 26/26 passed | SSR-disabled + client-enabled | None needed |
| 6.1–6.2 | `packages/aplicacion/tests/catalogo-sexo.test.ts` | Unit | N/A (new files) | 5/5 failed: missing export | 5/5 passed | canonical `0/1/2`; null/unknown/noncanonical; duplicate/empty | None needed |
| 6.3–6.4 | `packages/db/tests/catalogo-global-infrastructure.test.ts` | DB adapter contract | N/A (new files) | Module resolution failed: adapter absent | 2/2 passed | active global query/mapping; propagated DB failure | None needed |

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
