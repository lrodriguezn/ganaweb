# Tasks: Animal Form Bug Remediation

## Recovery Execution Plan

Execute the recovery from the clean base as isolated, regression-contained slices. Each slice includes its focused tests and runtime evidence, remains independently reversible, and MUST stay within its stated authored changed-line budget.

| Order | Slice | Boundary | Budget |
|---|---|---|---|
| A | E2E harness/security/startup/hydration | Restore deterministic E2E ownership, fixture safety, startup freshness, and hydration interaction readiness. | ≤230 lines |
| B | Global catalog reader foundation | Add the application port/strict decoder and Drizzle global active-catalog reader with focused tests. | ≤220 lines |
| C | Dynamic Sexo integration | Compose production catalog loading/revalidation through create UI and desktop/mobile runtime closure. | ≤390 lines |
| D | BUG-002 DatePicker full birth+purchase closure | Complete controlled birth and purchase date display, bounds, payload, and responsive evidence. | ≤200 lines |
| E1 | Cross-finca create hardening | Prove and enforce create ownership without broadening catalog or edit scope. | ≤200 lines |
| E2 | Edit honesty/version | Preserve truthful supported edit controls and optimistic version behavior. | ≤300 lines |
| F | Remaining bug slices | Execute BUG-001, then BUG-003, then BUG-004 in document order, each with its own regression and rollback boundary. | ≤400 lines each |

No completion from the escalated source worktree transfers into this recovery plan. A slice becomes complete only after it is independently reapplied and verified in this clean worktree.

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated files / changed lines | Recovery slices A–E2 use the budgets above; each remaining bug slice stays at or below 400 lines. |
| 400-line budget risk | Medium per child; High if combined |
| Chained PRs recommended | Yes (required) |
| Suggested split | A → B → C → D → E1 → E2 → BUG-001 → BUG-003 → BUG-004 |
| Delivery strategy | force-chained |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: Medium

### Suggested Work Units

| Unit | Likely PR / base | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|
| BUG-001 | Dedicated recovery slice | Playwright | Desktop/mobile | Select |
| BUG-002 | Slice D / Slice C | Vitest | Birth and purchase save | Date |
| BUG-003 | After E2 and BUG-001 | Playwright | Scroll receipt | Collision |
| BUG-004 | After BUG-003 | Vitest | Themes | Calendar |
| Reader Foundation | Slice B / Slice A | `vitest catalogo-sexo catalogo-global` | N/A: contracts | Catalog app/db/tests |
| Sexo Integration | Slice C / Slice B | `vitest animal-catalogo-sexo && playwright animales.spec.ts` | Desktop/mobile submit→reload, 6/6 | Web/routes/UI/E2E |

## Phase 1: Evidence and Test Capability

- [ ] 1.1 E2E fixture requires an explicit flag plus test-runtime signal and fails closed in production.
- [ ] 1.2 E2E fixture dependencies and session take precedence over production dependencies.
- [ ] 1.3 Playwright builds UI, starts a fresh flagged server, and uses zero retries.
- [ ] 1.4 Shared animal form defers interaction until hydration completes.

## Phase 2: BUG-001 — Diagnose Before Correcting

- [ ] 2.1 RED: desktop/mobile four-catalog selection contract.
- [ ] 2.2 Diagnose before changing `select-con-creacion.tsx`.
- [ ] 2.3 GREEN and commit BUG-001 regression.

## Phase 3: BUG-002 — Controlled Purchase Date

- [ ] 3.1 RED: date display/payload/bounds RN-002.
- [ ] 3.2 GREEN: `animal-crud.tsx` plus `date-picker.tsx` bounds.
- [ ] 3.3 Verify modes; commit BUG-002 only.

## Phase 4: BUG-003 — Collision Evidence

- [ ] 4.1 RED: viewport/scroll safety receipt.
- [ ] 4.2 GREEN: `date-picker.tsx` collision; commit BUG-003.

## Phase 5: BUG-004 — Shared Calendar Presentation

- [ ] 5.1 RED: token/nav/ARIA/theme regressions.
- [ ] 5.2 GREEN: `date-picker.tsx`; no hex/`dark:`.
- [ ] 5.3 Verify and commit BUG-004 rollback unit.

## Phase 6: Global Catalog Reader — PR5 Reader Foundation (base: PR4)

- [ ] 6.1 RED: `packages/aplicacion/tests/catalogo-sexo.test.ts`: reader and exact `"0"|"1"|"2"`.
- [ ] 6.2 GREEN: port/DTO/use case; export `packages/aplicacion/src/index.ts`.
- [ ] 6.3 RED: `packages/db/tests/catalogo-global-infrastructure.test.ts`: sexo/active, mapping, invalid/duplicate/empty, order.
- [ ] 6.4 GREEN: add/export minimal Drizzle global-active adapter.
- [ ] 6.5 Commit reader foundation; rollback catalog app/db/tests.

## Phase 7: Sexo Integration — PR6 (base: PR5)

- [ ] 7.1 RED: web unavailable/tampered/no-write and explicit injection tests.
- [ ] 7.2 GREEN: `animal-actions.server.ts` compose/revalidate; no fallback.
- [ ] 7.3 GREEN: `animal-actions.ts`, `nuevo.tsx`, `editar.tsx` dynamic/injectable options.
- [ ] 7.4 RED/GREEN: UI/web regressions; `combobox`; submit→reload persistence.
- [ ] 7.5 Desktop/mobile Playwright 6/6, no retry/skip; commit PR6 rollback.

## Completion Criteria

- [ ] Each child is ≤400 changed lines, autonomous, reversible, and regression-contained.
- [ ] Each PR records boundaries, dependency, test/runtime evidence, and `BUG-xxx`; only tracker targets main.
