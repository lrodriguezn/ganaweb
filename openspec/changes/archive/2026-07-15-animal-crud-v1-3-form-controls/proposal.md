# Proposal: Animal CRUD v1.3 — Form Controls Remediation

## Intent

Repair the animal create/edit form so its §3.4 control table matches the v1.3 spec. Today Fecha, Raza, Color, Calidad render as text inputs; Origen is a 4-option Select; the conditional FechaCompra block does not exist. Build the missing primitives first, then wire them.

## Scope

### In Scope

1. New primitives in `packages/ui/src/primitives/`: `DatePicker`, `SelectConCreacion`, `PillsSegmentadas`, `ComboboxBuscable` + RED-then-GREEN tests.
2. `AnimalFormScreen`: replace Fecha/Raza/Color/Calidad inputs; Origen → pills; conditional FechaCompra/Precio/PesoCompra/Lugar block; Madre/Padre comboboxes. Extend `AnimalFormCatalogOptions` with `raza`, `color`, `calidad`, `lugarCompra`, `madre`, `padre`, `configuracionCrear`.
3. Demo fixture, `nuevo.tsx` mapper (11 new fields, error map grows, "drops fecha_compra" removed), `editar.tsx` initial values.

### Out of Scope

Imágenes uploader, RFID icon, Comentarios textarea, Sexo mobile pills, real per-finca catalog loader, delete/inactivate, #48 reliability, `packages/dominio` (use case already accepts the new fields).

## Capabilities

### New Capabilities

- `animal-form-primitives`: Vendored primitives (DatePicker, SelectConCreacion, PillsSegmentadas, ComboboxBuscable) with typed contract, empty state, a11y binding, per-primitive test.

### Modified Capabilities

- `animal-crud-ui`: Delta adds v1.3 field scenarios (Fecha DatePicker + max=today + "Estimar por edad"; Raza/Color SelectConCreacion with `+ Crear nuevo`; Calidad Select; Origen pills 2; conditional FechaCompra block; Madre/Padre combobox). Cites CA-UI-001/002/006/007, CA-CRE-002/004, RN-002.

## Approach

Three chained PRs (force-chained), strict TDD, ≤400 lines each.

| PR | Scope | Lines |
|----|-------|-------|
| 1 — Primitives | 4 primitives + 4 test files + `package.json` + `tsup.config.ts` | 350-400 |
| 2a — Form fields | `animal-crud.tsx` + `animal-ui.test.tsx` updates | 280-360 |
| 2b — Route + mapper | `nuevo.tsx`, `editar.tsx`, `animal-form-catalog.ts`, `animal-web-flow.test.ts` | 180-260 |

New deps: `@radix-ui/react-popover`, `react-day-picker`, `date-fns`, `cmdk`. `tsup` `external` grows. `.dependency-cruiser.js` already allows `packages/ui/src` → `node_modules` (line 145), no rule change.

## Affected Areas

`packages/ui/src/primitives/{date-picker,calendar,select-con-creacion,pills-segmentadas,combobox-buscable}.tsx` (new) · `index.ts` barrel · `package.json` + `tsup.config.ts` · `ganado/animal-crud.tsx` · `tests/{date-picker,select-con-creacion,pills-segmentadas,combobox-buscable}.test.tsx` (new) · `tests/animal-ui.test.tsx` · `apps/web/.../animales/nuevo.tsx` · `apps/web/.../animales/$animalId/editar.tsx` · `apps/web/src/lib/fixtures/animal-form-catalog.ts` · `apps/web/tests/animal-web-flow.test.ts`.

## Risks

`react-day-picker` + Tailwind v4 collision → pin version. Date vs `dd/mm/aaaa` ambiguity → form value typed `string`; one helper converts to `Date`. `configuracion:crear` lookup bleeds into UI → form takes boolean prop. CA-UI-007 discard surprises on Origen toggle → test + inline help. PR 1 slips over 400 lines → `force-chained` already approved; 2a/2b isolates wire-up. Madre/Padre source needs server-side filter → demo fixture hard-codes 3-5 demo parents; real loader separate.

## Rollback Plan

Per-PR revert. PR 1: primitives removed, no domain or route impact. PR 2a: form reverts to text inputs; existing flow still works. PR 2b: mapper loses new keys; 3 already-supported fields still flow. No DB migration, no data loss.

## Dependencies

`@radix-ui/react-popover`, `react-day-picker`, `date-fns`, `cmdk`. Schema: `config_razas`, `config_colores`, `config_calidad_animal`, `lugares_compras`, `animales`. `configuracion:crear` seeded at `packages/db/src/seed/seed.ts:92`. `packages/dominio/src/animal.ts:78-91` already accepts the new fields.

## Success Criteria

- [ ] All 4 primitives have RED-then-GREEN tests.
- [ ] `AnimalFormScreen` renders the v1.3 field set with the spec's exact controls.
- [ ] `buildCreateAnimalInputFromFormData` carries the 11 new field keys when present.
- [ ] `buildCreateAnimalFieldErrors` maps every dominio `campo` in spec §3.2 to its form field name.
- [ ] CA-UI-007 + CA-CRE-004 verified by tests.
- [ ] `pnpm turbo test` passes; per-PR budget honored (PR 1 ≤ 400, PR 2a ≤ 380, PR 2b ≤ 280).
