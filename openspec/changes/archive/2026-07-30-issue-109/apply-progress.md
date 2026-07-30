# Apply Progress: Issue #109 — Units 1–3

**Mode**: Strict TDD
**Delivery strategy**: auto-chain
**Chain strategy**: feature-branch-chain
**PR boundary**: Unit 3 — Desktop controls and proof; its eventual child PR targets the immediate previous Unit 2 branch in the feature-branch chain.

## Completed Tasks

- [x] 1.1 Canonical query ordering, stable-ID/grammar serialization, finalized query, and mutation tests.
- [x] 1.2 Table-driven 400 recovery tests for 36 filter fields plus `page`, `pageSize`, `sort`, `cols`, unknown, and null.
- [x] 1.3 Metadata-backed adapter models, canonical helpers, read-only finalized-query seam, and exact recovery map.
- [x] 3.1 UI RED coverage for stable-ID callbacks, labels/chips, clear-all, keyboard sorting, and response-driven `aria-sort`.
- [x] 3.2 Presentational desktop controls wired to route-supplied query models/callbacks without URL, request, export, pagination, or column ownership.
- [x] 3.3 Corrected the candidate-causal E2E fixture DTO date mapping and completed focused UI/integration, workspace typecheck, and shared-URL/Back-Forward browser proof.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | `apps/web/tests/animal-listado-route.test.tsx` | Unit | Blocked initially: task command could not start because this isolated worktree lacked `node_modules`; dependencies were installed before RED. | ✅ Written first; helper exports absent (3 failures). | ✅ `pnpm -F @ganaweb/web exec vitest run tests/animal-listado-route.test.tsx`: 77/77 passed. | ✅ Stable-ID serialization, metadata labels/chips, and mutation/sort transitions. | ➖ None needed; extracted pure helpers have focused names and no side effects. |
| 1.2 | `apps/web/tests/animal-listado-route.test.tsx` | Unit | Same infrastructure-blocked initial safety-net attempt. | ✅ Written first; unknown `f.*` correction failed. | ✅ Same focused command: 77/77 passed. | ✅ 36 data-shaping `f.*` cases plus page/pageSize/sort/cols/unknown/null branches. | ✅ Recovery eligibility is an explicit metadata-derived set; focused tests remain green. |
| 1.3 | `apps/web/tests/animal-listado-route.test.tsx` | Unit | Same infrastructure-blocked initial safety-net attempt. | ✅ Tasks 1.1–1.2 supplied the contract before adapter production code. | ✅ Same focused command: 77/77 passed. | ✅ Multiple filter grammars, labels, sort states, and recovery branches exercised. | ➖ None needed after the recovery eligibility extraction. |

## Test Summary

- **Focused command**: `pnpm -F @ganaweb/web test -- animal-listado-route.test.tsx`
- **Exact result**: exit 0; `animal-list-server-contract.test.ts` passed; Vitest `1 passed` file, `77 passed` tests.
- **Direct cycle command**: `pnpm -F @ganaweb/web exec vitest run tests/animal-listado-route.test.tsx` — exit 0; `1 passed` file, `77 passed` tests.
- **Total tests written**: 45 parameterized/unit cases for Unit 1.
- **Layers used**: Unit (45 new cases).
- **Approval tests**: None — additive behavior only.
- **Pure functions created**: 7 public query helpers plus private query/recovery predicates.

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm -F @ganaweb/web test -- animal-listado-route.test.tsx` → exit 0; `animal-list-server-contract.test.ts` passed; Vitest 1 file, 77 tests passed. |
| Runtime harness command/scenario and exact result | N/A — Unit 1 is pure query-adapter helpers only. URL/history/request ownership and its browser harness belong exclusively to Unit 2. |
| Rollback boundary | Revert `apps/web/src/features/animal-listado/animal-listado-route-adapter.ts` query exports/recovery eligibility and their tests in `apps/web/tests/animal-listado-route.test.tsx`; no route, UI, API, or export behavior changes. |

## Verification Notes

- **Native evidence trace**: evidence revision `sha256:aad066c9179eb2dcea00283a6bfde6a60665b281e04160b89092fc37cf2b379d`; native runtime finish revision `sha256:73370ce124cd7e190ce6ea8286abe244190850c32090db29a3c458bd517d9acf`; outcome **passed**.
- `pnpm -F @ganaweb/web typecheck` was attempted and exits 2 on pre-existing workspace build resolution: `@ganaweb/ui` cannot be resolved across existing route/fixture imports. The focused test suite passes.
- No formatter was run after the final candidate.

## Unit 2 Complete — Runtime Gate Passed

Tasks 2.1–2.4 are checked in `tasks.md`. The focused integration contract and the exact shared-URL/Back-Forward browser harness both pass after correcting the E2E-only API fixture path and its assertion scope.

### Unit 2 Changes

- Added the route-owned `crearControladorConsultaListado` mutation controller. It derives each intent from committed URL state, debounces global search for 300 ms with replacement semantics, and emits push intents for filters, chips, clear-all, and sort.
- Added integration coverage for debounced search retaining an AND filter, committed mutation history intents including no-sort, and stale 400 correction suppression.
- Added a Playwright browser harness for a shared list URL followed by Back/Forward replay; it now passes against the real E2E fixture-backed API.
- Preserved the finalized `FinalizedAnimalListadoQuery.searchParams` seam without adding export UI, export fetches, or export navigation. #111 rebase remains a downstream branch operation outside this Unit 2 worktree.

### TDD Cycle Evidence — Unit 2

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 2.1 | `apps/web/tests/animal-listado-route-integration.test.tsx` | Integration | ✅ Baseline: focused command exit 0, 9/9 tests. | ✅ Written first; missing `crearControladorConsultaListado` produced 2 failures. | ✅ Focused command exit 0, 12/12 tests. | ✅ 300-ms replace with AND filter; push mutations; descending sort → absent `sort`. | ✅ Biome format/check passes; browser replay passes. |
| 2.2 | `apps/web/tests/animal-listado-route-integration.test.tsx` | Integration | ✅ Same baseline. | ✅ Deferred stale-400 test written before its synchronization fix; initial run failed (timeout) with the controller RED. | ✅ Focused command exit 0, 12/12 tests; stale response leaves current data and URL-correction spy untouched. | ✅ Existing 400 retention test plus deferred stale 400 branch. | ✅ Biome format/check passes; browser replay passes. |
| 2.3 | `apps/web/src/routes/_app/fincas/$fincaId/animales.tsx` | Integration | ✅ Same baseline. | ✅ Tasks 2.1–2.2 exercised the absent route-query controller before production code. | ✅ Focused command exit 0, 12/12 tests. | ✅ Search, chip/filter/clear/sort, default/no-sort, and stale-result paths. | ✅ Controller has a single navigation-intent boundary; no fetch/navigation side effects. |
| 2.4 | `apps/web/tests/animal-list-server-contract.test.ts`, `tests/e2e/animales.spec.ts` | Integration + E2E | ✅ Unit 1 finalized-query seam remained green. | ✅ Added the E2E fixture read-port contract before its export existed; focused server contract failed with the missing export. | ✅ Fixture returns the authorized finca's `MT-122` query result; no export UI/fetch/navigation added. | ✅ API preflight uses the actual shared URL; browser asserts the accessible table cell before Back/Forward. | ✅ `searchParams` remains read-only; no #111 implementation was changed. |

### Work Unit Evidence — Unit 2

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm -F @ganaweb/web test -- animal-listado-route-integration.test.tsx` → exit 0; prerequisite `animal-list-server-contract.test.ts` passed; Vitest `1 passed` file, `12 passed` tests. |
| Source-mutating normalization | `pnpm -F @ganaweb/web exec biome format --write ../../playwright.config.ts 'src/features/animal-listado/animal-listado-route-adapter.ts' 'src/routes/_app/fincas/$fincaId/animales.tsx' 'src/routes/api/fincas/$fincaId/animales.ts' src/server/e2e-animals-fixture.server.ts tests/animal-listado-route-integration.test.tsx tests/animal-list-server-contract.test.ts ../../tests/e2e/animales.spec.ts` → exit 0; subsequent Biome check of all eight files → exit 0. |
| Runtime harness command/scenario and exact result | `pnpm exec playwright test tests/e2e/animales.spec.ts --project=animales-desktop --grep "replays a shared list URL"` → exit 0; `1 passed (31.9s)`. It loaded the valid shared URL, rendered accessible `MT-122`, then replayed the first URL with Back and the descending URL with Forward. |
| Rollback boundary | Revert only the Unit 2 controller/integration/browser tests plus `apps/web/src/routes/api/fincas/$fincaId/animales.ts`, `apps/web/src/server/e2e-animals-fixture.server.ts`, and Playwright's E2E preflight. This removes query replay support from the test fixture without changing Unit 1 adapter/seam work, #108 behavior, or #111 export behavior. |

### Corrective Rerun Diagnosis and Evidence

- **Candidate causal issue: (a) E2E fixture/auth setup plus fixture assertion scope; not (b) query navigation and not an authorization-policy regression.** Unit 2 correctly adds a browser request to `/api/fincas/finca-1/animales`. The explicit E2E fixture was available to server actions but not that API route, which continued to use production session/Drizzle dependencies. The new fixture-only API dependencies use `isAnimalE2eEnabled()` and still require `session.fincaActivaId === fincaId`; production authorization remains unchanged and fail-closed.
- The first post-fixture browser run showed `1 animal` and the `MT-122` table cell in Playwright's accessibility snapshot. Its old locator incorrectly scoped the cell beneath a non-owning visual frame label. The test now asserts the actual accessible table cell; no UI state, route guard, or authorization rule was bypassed.
- Playwright's web-server preflight requests the exact seeded shared URL. This warms the real fixture-backed API route and fails startup if that endpoint cannot return 200; it does not stub browser data or weaken access control. The `trap` terminates the spawned dev server. The manual diagnostic server was SIGTERM-cleaned; `pgrep` found no remaining Vite/dev process.
- **Native attempt**: active ordinal 3, generation 2; historical begin revision `sha256:4bfaee28e8e6352a5e61625acba95bbd35bad2ea139af0273282a3aa7256db35`; passed native evidence revision `sha256:2a7f8448ae2f4149d211130f527fb501b9ad6b5fdd1816c0272863824bcef746`; native runtime finish revision `sha256:9bb7b0a8312e65a397552668c701a3a3a7ccd6d384f8fd2b8e319da1092b99e4`; outcome **passed**.
- Current authored source/test/config diff is **522 additions + 5 deletions = 527 changed lines** across Units 1–2 in this uncommitted worktree; Unit 2's child-PR boundary remains route URL/request/recovery plus its E2E fixture support. Unit 3 was not modified.
- #111 boundary verified: `FinalizedAnimalListadoQuery.searchParams` remains the only finalized-query seam; this rerun adds no export UI, export fetch, or export navigation. #111 rebase is a downstream branch operation, not performed in this Unit 2 worktree.

## Unit 3 — Desktop Controls (Complete)

### TDD Cycle Evidence — Unit 3

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 3.1 | `packages/ui/tests/animal-ui.test.tsx` | UI integration | ✅ Baseline: `pnpm -F @ganaweb/ui test -- animal-ui.test.tsx` exit 0, 89/89. | ✅ Written first; the two new behavioral tests failed because the search, chip, clear-all, and sort controls were absent. | ✅ Final focused UI command exit 0, 91/91. | ✅ Stable `raza-uuid` callback versus human label `Brahman`; chip removal and separate clear-all plus keyboard sort/default response `aria-sort`. | ✅ Source-mutating Biome format and checks pass; exact-optional callback typings corrected after the first typecheck. |
| 3.2 | `packages/ui/src/ganado/animal-listado-desktop.tsx`, `apps/web/src/routes/_app/fincas/$fincaId/animales.tsx` | UI + route integration | ✅ Same UI baseline; existing route integration baseline was 12/12. | ✅ Task 3.1 tests failed before controls were implemented. | ✅ UI 91/91 and route integration 12/12. | ✅ Controls only act through supplied callbacks; route validates supplied filter/chip/sort models before delegating to the URL controller. | ✅ No local URL/request state; no #110 pagination/column control or #111 export behavior. |
| 3.3 | `apps/web/tests/animal-list-server-contract.test.ts`, focused UI/integration, and Playwright commands | Contract + UI + integration + E2E | ✅ `pnpm -F @ganaweb/web exec tsx tests/animal-list-server-contract.test.ts` exit 0 before the corrective test. | ✅ Added date-DTO assertions first; focused contract command failed because the fixture returned `null`, not `2020-01-02`. | ✅ The fixture serializes epoch-seconds to the required `YYYY-MM-DD` strings; focused UI/integration, workspace typecheck, and browser replay all pass. | ✅ Birth and purchase epoch values serialize independently; the existing nullable server-row contract remains covered. | ➖ None needed; `toIsoDate` is the minimal named conversion at the fixture DTO boundary. |

### Test Summary — Unit 3

- **New tests written**: 2 behavioral UI tests plus 2 E2E-fixture date-DTO assertions (UI suite total 91).
- **Corrective RED / contract proof**: `pnpm -F @ganaweb/web exec tsx tests/animal-list-server-contract.test.ts` → exit 1 before the mapping change: `fechaNacimiento` was `null`, expected `2020-01-02`. After the mapping change it exits 0.
- **Focused UI**: `pnpm -F @ganaweb/ui test -- animal-ui.test.tsx` → exit 0; Vitest `1 passed` file, `91 passed` tests.
- **Focused integration**: `pnpm -F @ganaweb/web test -- animal-listado-route-integration.test.tsx` → exit 0; prerequisite `animal-list-server-contract.test.ts` passed; Vitest `1 passed` file, `12 passed` tests.
- **Typecheck**: `pnpm turbo typecheck` → exit 0; `13 successful, 13 total` tasks.
- **Browser**: `pnpm exec playwright test tests/e2e/animales.spec.ts --project=animales-desktop --grep "replays a shared list URL"` → exit 0; `1 passed (30.2s)`.
- **Source-mutating normalization**: `pnpm -F @ganaweb/web exec biome format --write src/server/e2e-animals-fixture.server.ts tests/animal-list-server-contract.test.ts` → exit 0; `Formatted 2 files in 11ms. No fixes applied.`

### Work Unit Evidence — Unit 3

| Evidence | Result |
|---|---|
| Focused test command and exact result | Corrective contract: `pnpm -F @ganaweb/web exec tsx tests/animal-list-server-contract.test.ts` → exit 0. UI: `pnpm -F @ganaweb/ui test -- animal-ui.test.tsx` → exit 0; Vitest `1 passed` file, `91 passed` tests. Route integration: `pnpm -F @ganaweb/web test -- animal-listado-route-integration.test.tsx` → exit 0; prerequisite server contract passed; Vitest `1 passed` file, `12 passed` tests. Workspace typecheck: `pnpm turbo typecheck` → exit 0; `13 successful, 13 total`. |
| Runtime harness command/scenario and exact result | `pnpm exec playwright test tests/e2e/animales.spec.ts --project=animales-desktop --grep "replays a shared list URL"` → exit 0; `1 passed (30.2s)`. It loaded the shared `q=MT-122&sort=codigo:asc` list, showed `MT-122`, then replayed Back/Forward. |
| Rollback boundary | Revert only the corrective fixture DTO conversion/data and its contract assertions in `apps/web/src/server/e2e-animals-fixture.server.ts` and `apps/web/tests/animal-list-server-contract.test.ts`; this restores the prior fixture-only failure but does not remove Units 1–3 controls, query/recovery behavior, #108 states/RBAC, or #110/#111 boundaries. |

### Corrective Rerun — Candidate-Causal Typecheck Fix

- **Diagnosis**: `AnimalRegistro.fechaNacimiento` and `fechaCompra` are epoch seconds (`number | null`), while `AnimalListadoRow` requires nullable `YYYY-MM-DD` strings. Unit 2's fixture DTO mapper forwarded the numeric values directly at the two failing assignments.
- **Correction**: Added the fixture-boundary `toIsoDate(epochSeconds)` conversion and deterministic fixture dates. No cast, type suppression, or contract weakening was used.
- **Cleanup**: Ran Biome normalization on only the fixture and its focused server-contract test before the required verification sequence; it reported no additional fixes. No process cleanup was needed because Playwright managed its own web server.
- **Remaining tasks**: None — tasks 1.1–3.3 are checked. #111 remains an explicitly downstream rebase/consumer of the read-only `searchParams` seam.

### Native Runtime Attempt — Terminal

- **Ordinal / generation**: 5 / 3
- **Historical begin revision**: `sha256:113c5197817fc4d8ec837d73e406c2d3160e2f0e706dd16d4f6dcbbb5b32f4b3`
- **Evidence revision**: `sha256:a1e452506bc23adb297a9184f730ef825200b6f782d4adf00c85379442835942`
- **Native finish revision**: `sha256:c622780ad7435d5b72cbe67af3f764fbe7a096c4a506103f221d837c47e6deb8`
- **Outcome**: **passed**

### Boundaries and Resolution

- #108 loading, ready, empty, denied, error, row navigation, and RBAC behavior remain delegated to the existing state machine.
- #110 pagination, `pageSize`, `cols`, and column ownership remain untouched. #111 export remains inert; no export fetch, navigation, dialog, or download was added.
- Task 3.3 is checked: all required focused commands, `pnpm turbo typecheck`, and the exact Playwright shared-URL/Back-Forward scenario are green.
- The corrective rerun changes only the Unit 2 E2E fixture and its server-contract test; it does not broaden the Unit 3 PR boundary or alter #109 product behavior.
