# Proposal: Animal Form CA-UI Remediation

## Intent

Repair the animal create/edit form so it matches the feature UI contract instead of exposing catalog ids as free text. The current screen violates CA-UI-001, CA-UI-003, and CA-UI-005 by rendering catalog-backed values as raw inputs, showing `sexo_key` as `1`, and merging location semantics into one control.

## Scope

### In Scope
- Replace catalog-backed free-text fields with selectors that display human labels while preserving ids/keys in submitted payloads.
- Fix `sexo_key` UX so users never see raw numeric keys; preserve `0/1/2` internally.
- Restore separate location controls for potrero, sector, lote, and grupo according to create/edit semantics.
- Add/update UI tests and PR notes that explicitly cite CA-UI-001, CA-UI-003, and CA-UI-005.

### Out of Scope
- FincaSwitcher/header label bug (`Finca Finca finca-esperanza`); track separately as an independent shell issue.
- Broader animal CRUD domain/use-case implementation, image flows, delete/reactivate behavior, or timeline work.

## Capabilities

### New Capabilities
- `animal-crud-ui`: Animal create/edit form UI contract for catalog selectors, labeled sex selection, split location controls, and CA-UI rule citation.

### Modified Capabilities
- None

## Approach

Use the targeted shared-form repair from exploration: keep `AnimalFormScreen` as the shared create/edit entry point, replace only the affected field renderers with typed selector controls, and map selected labels back to existing form payload keys/ids. Preserve Spanish domain UI labels where the project already uses them.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/ui/src/ganado/animal-crud.tsx` | Modified | Replace raw inputs for catalog fields; split location controls. |
| `packages/ui/tests/animal-ui.test.tsx` | Modified | Assert selectors, human labels, no raw `sexo_key`, and CA-UI citations. |
| `apps/web/src/routes/_app/fincas/$fincaId/animales/nuevo.tsx` | Modified | Ensure create route accepts preserved keys/ids. |
| `apps/web/src/routes/_app/fincas/$fincaId/animales/$animalId/editar.tsx` | Modified | Preserve edit-mode behavior and read-only location semantics when applicable. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Selector labels drift from stored keys | Med | Test label display separately from submitted ids/keys. |
| Location edit semantics are ambiguous | Med | Follow CA-UPD-001: creation may capture location; edit should not mutate it through the form. |

## Rollback Plan

Revert the shared form and test changes for this OpenSpec change. Because the fix is UI-layer only, rollback should restore the prior raw-input form without schema or data migration.

## Dependencies

- Catalog option sources for sex, ingreso/origen, and location entities must be available to the form or route layer.

## Success Criteria

- [ ] Animal form displays labels, not raw ids/keys, for catalog-backed fields.
- [ ] `sexo_key` never appears as numeric `1` to users while preserving payload keys.
- [ ] Location is represented as separate semantic controls.
- [ ] PR notes cite CA-UI-001, CA-UI-003, and CA-UI-005.
