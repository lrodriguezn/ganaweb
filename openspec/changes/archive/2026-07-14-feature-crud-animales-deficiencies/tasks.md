# Tasks: Animal Form CA-UI Remediation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 280-380 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes, required by `force-chained` |
| Suggested split | PR 1 selectors → PR 2 location semantics → PR 3 review notes/final verification |
| Delivery strategy | force-chained |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Labeled catalog/sex selectors; base = feature/tracker branch | PR 1 | `pnpm vitest run packages/ui/tests/animal-ui.test.tsx` | Open create form; verify sex/origin labels and no raw `1` | `packages/ui/src/ganado/animal-crud.tsx`, selector tests |
| 2 | Split create/edit location semantics; base = PR 1 branch | PR 2 | `pnpm vitest run packages/ui/tests/animal-ui.test.tsx` | Open create/edit forms; verify split controls/read-only location | location props/rendering and UI tests |
| 3 | Route payload preservation and PR notes; base = PR 2 branch | PR 3 | `pnpm vitest run apps/web/tests/animal-web-flow.test.ts` | Submit create form; verify ids/keys reach route mapper | route mapper tests plus PR note text |

## Phase 1: RED Tests

- [x] 1.1 Add failing CA-UI-001/003 tests in `packages/ui/tests/animal-ui.test.tsx` for labeled catalog selectors, missing-label fallback, and no visible raw `sexoKey=1`.
- [x] 1.2 Add failing CA-UI-005 tests in `packages/ui/tests/animal-ui.test.tsx` for split potrero/sector/lote/grupo controls in create mode and no merged location field.
- [x] 1.3 Add failing edit-mode tests in `packages/ui/tests/animal-ui.test.tsx` for read-only location display and optional `Mover animal` action.
- [x] 1.4 Add failing mapper coverage in `apps/web/tests/animal-web-flow.test.ts` proving create payload preserves `sexoKey` and location ids.

## Phase 2: Selector Implementation

- [x] 2.1 Update `packages/ui/src/ganado/animal-crud.tsx` props with `SelectOption`, `SexoKey`, and create/edit variant-aware catalog options.
- [x] 2.2 Replace affected raw catalog inputs in `packages/ui/src/ganado/animal-crud.tsx` with selectors that display labels and submit existing ids/keys.
- [x] 2.3 Map `sexoKey` labels as `0=Macho`, `1=Hembra`, `2=Pajuela`; render `No disponible` for missing labels without exposing ids/keys.

## Phase 3: Location and Routes

- [x] 3.1 Render separate potrero, sector, lote, and grupo controls in create mode in `packages/ui/src/ganado/animal-crud.tsx`.
- [x] 3.2 Render edit-mode location as read-only values in `packages/ui/src/ganado/animal-crud.tsx`; exclude direct location mutation fields from edit submission.
- [x] 3.3 Update `apps/web/src/routes/_app/fincas/$fincaId/animales/nuevo.tsx` to pass catalog/location options and preserve ids in `buildCreateAnimalInputFromFormData`.
- [x] 3.4 Update `apps/web/src/routes/_app/fincas/$fincaId/animales/$animalId/editar.tsx` to pass current location read-only context and keep update payload location-free.

## Phase 4: Verification and Review Notes

- [x] 4.1 Run focused UI and web tests, then `pnpm turbo test`; keep test evidence with the matching work-unit commit.
- [x] 4.2 Add PR notes citing CA-UI-001, CA-UI-003, and CA-UI-005, and state FincaSwitcher/header behavior is out of scope.
