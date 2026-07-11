# Tasks: Five-Style Appearance Rollout

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 650-780 authored lines |
| 800-line budget risk | Medium |
| 400-line budget risk | High |
| Chained PRs recommended | Yes, forced |
| Suggested split | PR 1 tokens → PR 2 selector → PR 3 surfaces/anti-flash → PR 4 visual/docs |
| Delivery strategy | force-chained |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High
800-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Issue approval, tracker branch, CSS tokens/class migration | PR 1 base=`feature/cinco-estilos-apariencia` | `pnpm --filter @ganaweb/ui test -- tokens` | Open `/mas`, inspect html class/token colors | `packages/ui/src/styles/globals.css` |
| 2 | Five-card `EstiloSwitcher` catalog and persistence | PR 2 base=PR1 branch | `pnpm --filter @ganaweb/ui test -- estilo-switcher` | Keyboard-select Índigo/Grafito in selector story/surface | `packages/ui/src/ganado/estilo-switcher.tsx` |
| 3 | Mobile/desktop surfaces and anti-flash compatibility | PR 3 base=PR2 branch | `pnpm --filter @ganaweb/ui test -- apariencia avatar anti-flash` | `/mas` mobile and AvatarMenu desktop with stored Grafito oscuro | `apariencia-card.tsx`, `avatar-menu.tsx`, `apps/web/src/routes/__root.tsx` |
| 4 | OpenPencil parity and acceptance audit | PR 4 base=PR3 branch | `pnpm turbo test && rg "dark:" packages/ui/src` | Compare `docs/ganaweb-diseno.op` screens 16/17 for 5 styles | docs/verification notes only |

Threat matrix: all rows are `N/A`; no RED threat tests required.

## Phase 1: GitHub Flow + Token Foundation

- [ ] 1.1 Create/approve GitHub issue for `cinco-estilos-apariencia`; create draft tracker PR on `feature/cinco-estilos-apariencia` and branch `feat/cinco-estilos-tokens`. Issue #27 is created/approved and local branches are prepared; draft tracker PR is pending push/PR commands.
- [x] 1.2 RED: extend `packages/ui/tests/tokens.test.*` for 10 style×claro/oscuro combinations, `.theme-b`/`moderna` fallback, and zero component variants.
- [x] 1.3 GREEN: update `packages/ui/src/styles/globals.css` with Campo baseline plus `theme-moderna`, `theme-indigo`, `theme-cielo`, `theme-grafito` token blocks.

## Phase 2: Selector Component

- [x] 2.1 RED: update `packages/ui/tests/estilo-switcher.test.*` for five radios, Spanish labels, 44px targets, Home/End, focus, storage independence, invalid→Campo.
- [x] 2.2 GREEN: modify `packages/ui/src/ganado/estilo-switcher.tsx` with `EstiloId`, `ESTILOS`, cleanup of legacy `theme-b`/style classes, and visual cards.

## Phase 3: Surfaces + First Paint

- [x] 3.1 RED: add/adjust `packages/ui/tests/apariencia-card.test.*` and `avatar-menu.test.*` for five cards on `/mas` and desktop AvatarMenu.
- [x] 3.2 RED: update `packages/ui/tests/anti-flash.test.*` for Grafito oscuro, missing values→Campo claro, and legacy `theme-b`/`moderna` mapping.
- [x] 3.3 GREEN: modify `packages/ui/src/ganado/apariencia-card.tsx`, `avatar-menu.tsx`, and `apps/web/src/routes/__root.tsx` without account/finca/role sync.

## Phase 4: Acceptance + Review Evidence

- [x] 4.1 Verify no `dark:` variants: `rg "dark:" packages/ui/src` returns zero matches.
- [x] 4.2 Verify OpenPencil `docs/ganaweb-diseno.op` screens 16 and 17 against Campo, Moderna, Índigo, Cielo, Grafito in claro/oscuro.
- [x] 4.3 Record PR chain boundaries, dependency diagram, test results, runtime harness evidence, and rollback scope in each PR body.
