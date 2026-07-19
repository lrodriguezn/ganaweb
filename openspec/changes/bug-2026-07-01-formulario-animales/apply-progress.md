# Apply Progress: Recovery Slice A

- Recovery base SHA: `16fcfd56e198094a60eebeb7f9591a5c1199ff62`
- Completed recovery slices: `A`
- Completed tasks: `1.1`, `1.2`, `1.3`, `1.4`

## TDD Cycle Evidence

| Task | Test file | Layer | Safety net | RED | GREEN | Triangulate | Refactor |
|---|---|---|---|---|---|---|---|
| 1.1–1.3 | `apps/web/tests/animal-web-flow.test.ts` | Runtime/config | Existing focused harness passed | Production gate/config failed | Focused harness passed | production, dev, CI, test, Playwright | None needed |
| 1.4 | `packages/ui/tests/animal-ui.test.tsx` | UI/SSR | 25/25 passed | SSR readiness assertion failed | 26/26 passed | SSR-disabled + client-enabled | None needed |

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused tests | `apps/web/.tsx-with-skip-css.sh tests/animal-web-flow.test.ts` passed; `pnpm --filter @ganaweb/ui test -- tests/animal-ui.test.tsx` passed 26/26. |
| Runtime harness | `pnpm exec playwright test --project=animales-desktop --grep "creates a local animal"` started a fresh built/flagged server, then failed at the later hidden `sexoKey` locator (out of Slice A). No retry occurred. |
| Typecheck | `pnpm --filter @ganaweb/ui build && pnpm --filter @ganaweb/web typecheck` passed. |
| Rollback boundary | Revert the six Slice-A files only; it removes fixture gating, E2E startup policy, and initial hydration disabling without touching catalog/date/edit behavior. |
