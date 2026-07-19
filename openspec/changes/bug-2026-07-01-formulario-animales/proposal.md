# Proposal: Animal Form Bug Remediation

## Intent

Restore reliable catalog and purchase-date input in the animal create/edit flow while preserving labels for users and IDs in submitted data. BUG-001 remains unconfirmed: it must be reproduced and root-caused before any fix; ambiguity stops work under IA-001.

## Scope

### In Scope
- BUG-001: route-level desktop/mobile evidence for raza, color, calidad, and lugar de compra; change only with demonstrated cause.
- BUG-002: make purchase-date selection update display and submitted ISO value; verify today/future and RN-002 boundaries.
- BUG-003: prove the reported viewport/scroll scenario and correct shared popover anchoring only if evidence supports it.
- BUG-004: apply token-only calendar typography, sizing, and navigation configuration in `packages/ui`.
- One focused regression test per bug; BUG-001 requires click, keyboard, visible label, close, and correct-ID payload for all four fields.

### Out of Scope
- New catalogs, business rules, schema/API changes, or unrelated shell/FincaSwitcher work.
- Treating report hypotheses as confirmed, duplicating controls per field, hex colors, or `dark:` variants.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `animal-form-primitives`: calendar selection, positioning, and tokenized presentation contract.
- `animal-crud-ui`: purchase-date submission and catalog-selection regression contract.

## Approach

Use shared primitives in `packages/ui` (IA-003) plus form wiring. Preserve the compulsory sequence: BUG-001 diagnosis → BUG-002 → BUG-003 → BUG-004. Freeze date/viewport conditions in tests; distinguish confirmed evidence from unconfirmed report claims.

## Four-PR Feature Branch Chain

| PR | Boundary and closure |
|---|---|
| 1 `BUG-001` | Reproduce all four fields on desktop/mobile; fix only proven cause; full selection E2E. |
| 2 `BUG-002` | Controlled purchase date, constraints, display and payload regression. |
| 3 `BUG-003` | Minimum reported viewport/scroll visual regression; trigger/label remain unobscured. |
| 4 `BUG-004` | Shared calendar tokens/navigation; visual check across 10 themes. |

Use a draft integrator branch; each child targets its immediate predecessor, contains its tests, conventional `fix(ui): BUG-00N ...` commit/PR identifier, clean focused diff, and ≤400 additions+deletions. No bug closes without its regression evidence.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `packages/ui/src/primitives/date-picker.tsx` | Modified | BUG-002–004 shared behavior. |
| `packages/ui/src/primitives/select-con-creacion.tsx` | Verified/conditional | BUG-001 only if reproduced. |
| `packages/ui/src/ganado/animal-crud.tsx` | Modified | Purchase-date controlled wiring. |
| `tests/e2e/animales.spec.ts` | Modified | Route-level closure evidence. |

## Risks, Rollback, Dependencies

| Risk | Mitigation |
|---|---|
| Timezone or valid Radix upward flip misread as defect | Freeze conditions; assert no trigger obstruction, not forced bottom side. |
| Test runners are currently unavailable | Restore/record Vitest and Playwright capability before closure. |

Revert the individual child PR and its tests without touching later slices. Dependencies: source report, exploration evidence, RN-002, IA-001/IA-003, T-004, and available Vitest/Playwright runners.

## Proposal Question Round

Execution was requested without a pause. Please validate: which user workflow is most harmed by an unresolved BUG-001; whether the 10-theme visual check is release-blocking; and whether an environment without runners may block closure rather than defer evidence.

## Success Criteria

- [ ] Each bug has its specified regression evidence and clean chained PR under budget.
- [ ] Shared controls retain visible labels, correct IDs, RN-002 behavior, and token-only theming.
