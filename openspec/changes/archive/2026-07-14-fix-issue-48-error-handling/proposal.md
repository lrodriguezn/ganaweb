# Proposal: Animal Create Error Handling (Issue #48)

## Intent

Two defects in the animal create flow silently drop server-side errors. The create route (`nuevo.tsx:60-68`) wraps `createAnimalAction` in `try { ... } finally { window.location.assign(...) }`, so thrown errors and validation failures trigger a successful-looking redirect and the user loses form values. The server action handler (`animal-actions.ts:77-78`) returns `return { tipo: result.tipo }`, discarding the structured `errores` array the runtime harness already produces.

## Scope

### In Scope

- Forward the full harness result from `createAnimalAction` and render field-level `errores` against the named fields in the create route.
- Add a minimal `fieldErrors` prop to `AnimalFormScreen` and tests pinning the new contract.

### Out of Scope

- Harness, `crearAnimal`, or validation-logic changes.
- Catalog selectors (`animal-crud-ui`), FincaSwitcher/header defects, edit route, refactors, formatting, CA-UI follow-ups.

## Capabilities

### New Capabilities

- `animal-create-validation-feedback`: server-action error contract plus field-level error display. Action returns the full harness result; route maps `errores` to `Record<fieldName, message>`; form renders each message under the named field.

### Modified Capabilities

- None. The new prop is additive and does not change any existing requirement.

## Approach

- `apps/web/src/server/animal-actions.ts`: change `return { tipo: result.tipo }` to `return result` (e2e fast path stays untouched).
- `apps/web/src/routes/_app/fincas/$fincaId/animales/nuevo.tsx`: replace the `try/finally/assign` with `await createAnimalAction({ data })` branched on `result.tipo`. `"creado"` navigates; `"validacion"` and thrown errors keep the user on the form, the former mapping `errores[]` into `fieldErrors`.
- `packages/ui/src/ganado/animal-crud.tsx`: add optional `fieldErrors?: Record<string, string>` to `AnimalFormScreenProps`; render under the named field. Read only when supplied.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/web/src/server/animal-actions.ts` | Modified | Forward full harness result from `createAnimalAction` handler. |
| `apps/web/src/routes/_app/fincas/$fincaId/animales/nuevo.tsx` | Modified | Capture result, render field errors, navigate only on `"creado"`. |
| `packages/ui/src/ganado/animal-crud.tsx` | Modified | Add `fieldErrors` prop; render per-field messages. |
| `apps/web/tests/`, `packages/ui/tests/` | Modified | Pin the new return shape and `fieldErrors` rendering; assert no navigation on `validacion`. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Domain `ErrorValidacionAnimal[]` couples domain to UI. | Med | Route maps to `Record<fieldName, message>` at the boundary; UI prop stays string-typed. |

## Rollback Plan

Revert the three source files and the two test files; no schema, harness, or use-case changes, so rollback restores the prior behavior with no data migration.

## Dependencies

None.

## Success Criteria

- [ ] `createAnimalAction` returns the full harness result; tests pin the new shape.
- [ ] Route renders `errores[].detalle` under the field, keeps the user on the form on `validacion`/thrown errors, and navigates only on `"creado"`.
- [ ] `AnimalFormScreen` exposes the optional `fieldErrors` prop; existing flows unchanged when omitted.
