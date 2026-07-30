# Tasks: Typed Animal List Query State (Issue #109)

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 850–1,100 |
| 1000-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | Query adapter → route/controller → desktop UI/integration |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High
1000-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Canonical query adapter | Child PR 1 → feature/tracker branch; tracker PR → `main` | `pnpm -F @ganaweb/web test -- animal-listado-route.test.tsx` | N/A: pure helper tests | adapter models/serializer only |
| 2 | Route URL, request, recovery controller | Child PR 2 → Unit 1 child-PR branch | `pnpm -F @ganaweb/web test -- animal-listado-route-integration.test.tsx` | `pnpm dev`; replay a shared URL and Back/Forward | route controller only |
| 3 | Presentational controls and proof | Child PR 3 → Unit 2 child-PR branch | `pnpm -F @ganaweb/ui test -- animal-ui.test.tsx` | Playwright only if available; otherwise record manual browser evidence | UI controls/tests only |

## Phase 1: Query Contract and Adapter (Unit 1)

- [x] 1.1 RED — In `apps/web/tests/animal-listado-route.test.tsx`, lock canonical `URLSearchParams` ordering plus stable-ID/grammar serialization, finalized complete query, chip/clear/sort transitions. [Canonical Route Query State; D §§2,4]
- [x] 1.2 RED — Add table-driven cases for all 36 `f.*` reported-`campo` keys plus `page`, `pageSize`, `sort`, `cols`, and unknown/null; assert exact deletion and page-reset rules. [Invalid Query Recovery; D §Data Flow]
- [x] 1.3 GREEN/REFACTOR — Extend `apps/web/src/features/animal-listado/animal-listado-route-adapter.ts` from `ANIMAL_LIST_COLUMNS` with typed models, canonical serializer/mutations, complete read-only `FinalizedAnimalListadoQuery`, and the table-driven recovery map.

## Phase 2: Route-Owned State and Recovery (Unit 2)

- [x] 2.1 RED — In `apps/web/tests/animal-listado-route-integration.test.tsx`, test 300-ms replacement search, push history for committed mutations, Back/Forward replay, AND filters/OR search, and no-sort effective `codigo:asc`. [Query Mutations and History]
- [x] 2.2 RED — Add deferred-fetch tests proving last-valid-table retention, one-field-per-400 sequential correction, and stale responses cannot change data, toast, or URL. [Invalid Query Recovery and Request Currency]
- [x] 2.3 GREEN/REFACTOR — Update `apps/web/src/routes/_app/fincas/$fincaId/animales.tsx` to derive URL state, debounce/navigation, request-token gate, recovery reload, and pass adapter models/callbacks; preserve #108 RBAC/failure states.
- [x] 2.4 Rebase/verify the #111 boundary: expose only finalized `searchParams`; confirm no export UI/fetch/navigation is added and rebase #111 after this seam lands. [D §Architecture Decisions]

## Phase 3: Desktop Controls and Evidence (Unit 3)

- [x] 3.1 RED — In `packages/ui/tests/animal-ui.test.tsx`, assert stable-ID callback delegation, labels/chips, one clear-all callback without URL/fetch ownership, keyboard sort, and response-driven `aria-sort`. [Presentational Query Controls]
- [x] 3.2 GREEN/REFACTOR — Update `packages/ui/src/ganado/animal-listado-desktop.tsx` with supplied search/filter/chip/clear/sort models and callbacks; retain #108 loading, data, failure, and RBAC behavior.
- [x] 3.3 Run focused unit/integration/UI commands and `pnpm turbo typecheck`; run shared-URL/Back-Forward Playwright E2E only when Playwright is available, otherwise record manual browser evidence and the unavailable reason.
