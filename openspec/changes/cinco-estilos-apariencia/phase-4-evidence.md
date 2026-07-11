# Phase 4 Evidence: Five-Style Appearance Rollout

## Outcome

Phase 4 acceptance passed after a focused no-variant audit fix: source comments no longer contain the literal `dark:` token, the full test runner passes, and the design file includes screens 16 and 17 for all five styles in claro/oscuro with the expected selected card.

## PR Chain Boundaries

| PR | Branch | Base | Scope | Rollback boundary |
|---|---|---|---|---|
| Tracker | `feature/cinco-estilos-apariencia` | `main` | Draft/no-merge integration branch for Issue #27 | Close tracker branch/PR only; no product code rollback |
| PR 1 | `feat/cinco-estilos-tokens` | `feature/cinco-estilos-apariencia` | Token/class compatibility for Campo, Moderna, Índigo, Cielo, Grafito | `packages/ui/src/styles/globals.css`, token tests |
| PR 2 | selector work-unit branch | PR 1 branch | Five-card `EstiloSwitcher` catalog, persistence, accessibility | `packages/ui/src/ganado/estilo-switcher.tsx`, selector tests |
| PR 3 | surfaces/anti-flash work-unit branch | PR 2 branch | Mobile `/mas`, desktop AvatarMenu, first-paint anti-flash compatibility | `apariencia-card.tsx`, `avatar-menu.tsx`, `apps/web/src/routes/__root.tsx`, related tests |
| PR 4 | visual/docs work-unit branch | PR 3 branch | Acceptance audit, OpenPencil parity, review evidence | `openspec/changes/cinco-estilos-apariencia/phase-4-evidence.md`, task checkboxes, comment-only source audit cleanup |

## Dependency Diagram

```text
main
└─ feature/cinco-estilos-apariencia  (tracker, draft/no-merge)
   └─ PR 1 tokens/class compatibility
      └─ PR 2 selector catalog/cards
         └─ PR 3 surfaces + anti-flash
            └─ 📍 PR 4 visual/docs acceptance audit
```

## Test Results

| Command | Result |
|---|---|
| `rg "dark:" packages/ui/src` | Initial RED: 3 matches in source comments only (`fab.tsx`, `globals.css`). |
| `rg "dark:" packages/ui/src; status=$?; printf 'exit=%s\n' "$status"` | GREEN: no matches, `exit=1` from ripgrep no-match semantics. |
| `pnpm --filter @ganaweb/ui test -- tokens` | Passed: 1 file, 137 tests. Warning: Node engine wants 22, current `v24.18.0`. |
| `pnpm turbo test` | Final GREEN: 13 successful / 13 total, `@ganaweb/ui` 8 files / 200 tests. Warning: Node engine wants 22, current `v24.18.0`; Turbo warned no output files for `@ganaweb/ui#test` and `@ganaweb/web#test`. |

## Runtime Harness Evidence

| Harness | Evidence |
|---|---|
| OpenPencil MCP live canvas | Attempted `open_document(live://canvas)` and `batch_get(live://canvas)`; both timed out in this executor session. Orchestrator-provided live evidence remains: pages `page-1`, `page-dark`, `page-b`, `page-b-dark`, `page-ind`, `page-ind-dark`, `page-cie`, `page-cie-dark`, `page-gra`, `page-gra-dark` are open and screens 16/17 contain five cards. |
| Local `.op` structural audit | Parsed `docs/ganaweb-diseno.op` directly. Verified 10 pages × 2 screens = 20 screen frames, each with `EstiloCard-campo`, `EstiloCard-moderna`, `EstiloCard-indigo`, `EstiloCard-cielo`, `EstiloCard-grafito`, and exactly one `✓` on the page's active style. Failures: 0. |

## OpenPencil Screen Matrix

| Page | Mode | Screens | Expected selected style | Result |
|---|---|---|---|---|
| `page-1` | claro | 16, 17 | Campo | Pass |
| `page-dark` | oscuro | 16, 17 | Campo | Pass |
| `page-b` | claro | 16, 17 | Moderna | Pass |
| `page-b-dark` | oscuro | 16, 17 | Moderna | Pass |
| `page-ind` | claro | 16, 17 | Índigo | Pass |
| `page-ind-dark` | oscuro | 16, 17 | Índigo | Pass |
| `page-cie` | claro | 16, 17 | Cielo | Pass |
| `page-cie-dark` | oscuro | 16, 17 | Cielo | Pass |
| `page-gra` | claro | 16, 17 | Grafito | Pass |
| `page-gra-dark` | oscuro | 16, 17 | Grafito | Pass |

## TDD Cycle Evidence

| Task | Test File / Harness | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 4.1 | `rg "dark:" packages/ui/src`, `packages/ui/tests/tokens.test.ts` | Structural audit | `pnpm turbo test` passed 13/13 before fix | `rg "dark:" packages/ui/src` found 3 source-comment matches | `rg` no matches (`exit=1`); `pnpm --filter @ganaweb/ui test -- tokens` passed 137/137; final `pnpm turbo test` passed 13/13 | Source comments and CSS comments both covered by the exact audit command | Comment text changed only; no behavior changed |
| 4.2 | `docs/ganaweb-diseno.op` parser audit | Visual/manual structural harness | Orchestrator already opened live canvas and inspected light variants | N/A: acceptance verification task, no production change required | Local parser verified 20/20 screen frames with five cards and active style checks | Covered five styles × claro/oscuro × mobile/desktop | N/A |
| 4.3 | `phase-4-evidence.md` | Review documentation | Previous apply-progress retained Phase 1-3 evidence | Missing Phase 4 review evidence artifact before this task | This document records boundaries, dependency diagram, tests, runtime evidence, and rollback | Covers tracker plus PR 1-4 chain slices | Structured for reviewer scanning |

## Rollback Scope

Rollback PR 4 by reverting only:

- `openspec/changes/cinco-estilos-apariencia/phase-4-evidence.md`
- Phase 4 checkbox updates in `openspec/changes/cinco-estilos-apariencia/tasks.md`
- Comment-only audit cleanup in `packages/ui/src/ganado/fab.tsx` and `packages/ui/src/styles/globals.css`

This does not remove Phase 1-3 behavior; it only removes acceptance evidence and the literal-comment cleanup needed by the exact `rg "dark:" packages/ui/src` audit.
