# Review Policy: 2026-07-14-feature-crud-animales-deficiencies

## Selection

Full 4R bounded review is required for this change because the bounded scope is the animal create/edit form UI contract (catalog selectors, sex labels, split location semantics, and CA-UI remediation acceptance). The bounded correction lineage is part of the same lineage `review-6097b9f08e4fa31e`.

## Frozen Review Ledger

The review transaction records the already-completed manual 4R post-apply review. Do not run new review lenses for this receipt.

Findings across risk, reliability, resilience, and readability review passes, with bounded correction lineage preserved:

- RISK findings: none raised (all 0 findings).
- R4-001 (resilience, WARNING): `attachImage` optional-chain mitigation preserved in `apps/web/src/server/animal-actions.server.ts`; bounded correction lineage confirms production port surface is unchanged for this change.
- R2-001 (readability, WARNING): edit route `currentLocation={{}}` placeholder preserved — out-of-scope for this slice (per-finca loader is a separate follow-up).
- R2-002 (readability, SUGGESTION): `testCreateRouteWiresCatalogOptions` substring assertion; not blocking.
- R3-001/R3-002 (reliability, CRITICAL): pre-existing issues in create route's save() and `createAnimalAction`; classification `deterministic` and `causal_disposition: pre-existing`. Bounded correction lineage `review-178f8cd29714bd5e` and `review-662d7abf029ed7de` confirmed the changes stayed within the animal form scope and did not touch the broken save/error flow.
- R3-003 (reliability, WARNING): edit route save error surface is pre-existing; not blocking.

## Gate Decision

All severe findings (R3-001, R3-002) are pre-existing and explicitly out of scope for this change per the bounded correction lineage. The final outcomes classify all findings as `info` after triangulation. The approved terminal is `review-6097b9f08e4fa31e` with `terminal_state: approved`.

## Evidence

Evidence is recorded in `openspec/changes/2026-07-14-feature-crud-animales-deficiencies/apply-progress.md`, including UI tests (15/15 passed), web flow tests, typechecks (UI and web), and bounded correction lineage TDD cycles for `review-178f8cd29714bd5e` and `review-662d7abf029ed7de`. Spec compliance is 5/5 requirements and 9/9 scenarios per `verify-report.md`.
