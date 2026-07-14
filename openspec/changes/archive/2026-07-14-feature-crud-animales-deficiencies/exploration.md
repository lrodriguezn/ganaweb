## Exploration: La sesion 001 - feature crud animales quedo con definciencias. Te comparto archivo @features/001-feature_crud_animales/crud_animales.md con las nuevas mejoras features 001-feature_crud_animales. La implementación actual viola CA-UI-001, CA-UI-003 y CA-UI-005; corrígelas citando cada regla en el PR. El diseño quedó diferente, la primera implementación renderizó inputs de texto libre para campos de catálogo (Sexo mostraba el key numérico "1") y fusionó la ubicación en un solo control. Y el detalle del header ("Finca Finca finca-esperanza") es del shell, no del formulario: está renderizando el slug del id en lugar de fincas.nombre — repórtalo aparte como bug del FincaSwitcher.

### Current State
`AnimalFormScreen` in `packages/ui/src/ganado/animal-crud.tsx` renders a fixed `FORM_FIELDS` array through a generic `Field` helper, so catalog-backed values are plain `<Input>` controls instead of selectors. That includes `sexoKey` with a hardcoded default of `"1"`, plus a merged `Potrero/Sector/Lote/Grupo` free-text field and other business fields (`origen`, `madre`, `padre`) that are not modeled as typed pickers.

The shared UI contracts already show the intended shape is more structured: the domain uses `sexo_key`/`SexoKey` and the DB schema stores `sexo_key`, `tipo_ingreso_id`, `potrero_id`, `sector_id`, `lote_id`, and `grupo_id` as separate columns. The current form is therefore mismatched both semantically and mechanically with the data model. Existing tests (`packages/ui/tests/animal-ui.test.tsx`) exercise the screen, but they do not enforce catalog semantics or split-location behavior yet.

The header issue is separate. `AppHeader` renders `FincaSwitcher`, and `FincaSwitcher` labels the trigger as `Finca ${activa.nombre}`. The visible `Finca Finca finca-esperanza` symptom is therefore a shell/finca-display bug, not part of the animal form. If the current output shows a slug, the bad value is being fed into `FincaResumen.nombre` upstream (likely the shell session/finca loader), while the UI component itself only concatenates the prefix.

### Affected Areas
- `packages/ui/src/ganado/animal-crud.tsx` — shared create/edit screen; currently uses free-text inputs for catalog fields and merged location.
- `packages/ui/tests/animal-ui.test.tsx` — current tests cover the screen but not the CA-UI expectations; needs assertions for selectors, labels, and split controls.
- `apps/web/src/routes/_app/fincas/$fincaId/animales/nuevo.tsx` — create route consumes `AnimalFormScreen`; any payload shape change must align here.
- `apps/web/src/routes/_app/fincas/$fincaId/animales/$animalId/editar.tsx` — edit route shares the same screen, so update-mode constraints must be preserved.
- `packages/ui/src/ganado/app-header.tsx` — shell header composes the desktop/mobile top bar and mounts `FincaSwitcher`.
- `packages/ui/src/ganado/finca-switcher.tsx` — visible finca label and dialog copy; separate bug candidate for wrong finca display.
- `packages/ui/tests/avatar-menu.test.tsx` — AppHeader coverage exists here, but it does not currently pin finca label correctness.

### Approaches
1. **Targeted shared-form repair** — keep `AnimalFormScreen` as the shared entry point, but replace catalog fields with typed selector controls and split location into explicit sub-controls.
   - Pros: smallest surface area; fixes both create/edit routes at once; easiest to verify with focused UI tests.
   - Cons: still leaves the form as a monolith; may require careful field-by-field mapping to form payload names.
   - Effort: Medium

2. **Form-schema refactor** — introduce a typed field configuration layer (catalog/text/compound/read-only) and render each kind with the right control.
   - Pros: prevents future free-text regressions; clearer mapping between domain columns and UI controls; easier to enforce CA-UI rules.
   - Cons: more code churn; more test updates; higher risk for an isolated UI bugfix.
   - Effort: High

### Recommendation
Start with the targeted shared-form repair, then backfill the field-schema abstraction only if more animal forms are expected soon. In parallel, treat the header label as a separate shell bug: verify the upstream `FincaResumen.nombre` mapping and do not mix it into the animal-form fix.

### Risks
- Catalog/value mismatch: `sexoKey` is currently submitted as a raw numeric string, so selectors must preserve the real payload shape expected by the route/use case.
- Location semantics: the spec intent appears to separate location parts, but edit mode may need read-only or event-driven handling depending on CA-UPD/CA-CRE rules.
- Shell data bug: fixing `FincaSwitcher` text alone may not solve the wrong label if the loader already passes a slug into `FincaResumen.nombre`.

### Ready for Proposal
Yes — the evidence is enough to draft the proposal. Tell the user the animal form needs catalog/select and split-location fixes, and the finca label must be tracked as a separate shell/FincaSwitcher defect.
