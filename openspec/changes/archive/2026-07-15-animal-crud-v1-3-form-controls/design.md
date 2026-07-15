# Design: Animal CRUD v1.3 — DatePicker + SelectConCreacion + Pills Origen + Combobox Madre/Padre

## Technical Approach

Four vendored primitives in `packages/ui/src/primitives/`, then `AnimalFormScreen` rewired and the create-route mapper extended with 11 new fields. Three chained PRs (force-chained, ≤400 LOC): PR1 primitives, PR2a form wire-up, PR2b route+mapper. Strict TDD — every primitive ships RED before GREEN. References: proposal.md; main specs `openspec/specs/animal-crud-ui/spec.md` and `openspec/specs/animal-create-validation-feedback/spec.md` (delta specs for this change not yet in the worktree — Open Q1).

## Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Primitive location | `packages/ui/src/primitives/` | Existing split is "vendored shadcn-style" — must not be dominio-coupled. |
| `SelectConCreacion` + `ComboboxBuscable` engine | `cmdk` | One search engine, two faces: keyboard nav, type-ahead, empty state, "create new" last-item built-in. |
| `DatePicker` engine | `react-day-picker` v9 | Locale-aware, WCAG day grid, `aria-label` per day, `disabled` matcher built-in. Hand-rolling keyboard nav costs >150 LOC and risks a11y regressions. |
| Date math | `date-fns` | Both `cmdk` and `react-day-picker` accept `date-fns` as peer. Underlying `<input type="date">` already serialises ISO. |
| Popover engine | `@radix-ui/react-popover` | Portal + collision positioning needed (form card `rounded-b-card` + mobile sticky `fixed` footer clip naive menus). |
| CA-UI-007 (origen toggle discards other-mode state) | `<div key={origenValue}>` wrapping the conditional block | `key` change forces unmount; refs/Radix popovers of the abandoned mode are GC'd. |
| `origen` wire | hidden `<input name="origen">` + two `<button type="button" role="radio">` pills | Form posts `FormData`; radio group already serialises. Wrapper `role="radiogroup"`, pills `aria-checked`. |
| Controlled vs uncontrolled | CONTROLLED via `useState<FormState>` in `AnimalFormScreen` | `origen` must drive remount; value must be in React state, not the DOM. |
| es-CO formatting | `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' })` for `precio_compra`; plain `Intl.NumberFormat('es-CO')` for `peso_compra`; `date-fns/format(d, 'dd/MM/yyyy', { locale: es })` for dates | Display formats on blur, parses on change. Form submits raw string/number. |

## Data Flow

```
AnimalFormScreen (useState<FormState>)
  ├─ PillsSegmentadas(origen) ─► setFormState({origen})
  │   <div key={origen}>   ← remount on toggle (CA-UI-007)
  │     {origen==="comprado"?
  │        <DatePicker name="fechaCompra"/> <Input name="precioCompra"/>
  │        <Input name="pesoCompra"/>      <SelectConCreacion lugarCompra/> :
  │        <ComboboxBuscable madreId/>     <ComboboxBuscable padreId/>}
  ├─ DatePicker(fechaNacimiento) ─► hidden <input type="date" name="…">
  ├─ SelectConCreacion(raza/color/calidad/lugarCompra) ─► <SelectTrigger name=…>
  └─ submit ─► onSave(new FormData(form)) ─► buildCreateAnimalInputFromFormData()
                                                       └► createAnimalAction → dominio
```

## File Changes

| File | Action | Description |
|---|---|---|
| `packages/ui/src/primitives/{date-picker,select-con-creacion,pills-segmentadas,combobox-buscable}.tsx` | Create | Four primitives. Shared props: `name, value, onChange, aria-invalid?, aria-describedby?`. Per-primitive additions: DatePicker `max?/min?/locale?`; SelectConCreacion `canCreate? (CA-UI-002), createLabel?, onCreate?, options` (with `swatch` hex); PillsSegmentadas `options`; ComboboxBuscable `emptyLabel? (CA-UI-004), placeholder?`. |
| `packages/ui/tests/{date-picker,select-con-creacion,pills-segmentadas,combobox-buscable}.test.tsx` | Create | One RED-then-GREEN file per primitive; `// @vitest-environment jsdom`. |
| `packages/ui/src/index.ts`, `package.json`, `tsup.config.ts` | Modify | Re-export primitives; add deps `@radix-ui/react-popover`, `react-day-picker` v9, `date-fns` v4, `cmdk` v1; append to `tsup.external[]`. |
| `packages/ui/src/ganado/animal-crud.tsx` | Modify | Extend `AnimalFormCatalogOptions` (add `raza?, color?, calidad?, lugarCompra?, madre?, padre?, configuracionCrear?`) and `AnimalFormInitialValues` (add 11 new keys: `origen?, fechaNacimiento?, fechaCompra?, razaId?, colorId?, calidadId?, lugarCompraId?, madreId?, padreId?, precioCompra?, pesoCompra?`). Add `useState<FormState>`; `origen` setter drives `key={origen}` (CA-UI-007). Rewrite `renderAnimalFormField` per proposal matrix. Edit-mode read-only location block (CA-UPD-001) unchanged. |
| `packages/ui/tests/animal-ui.test.tsx` | Modify | Add: origen toggle discards other-mode state (CA-UI-007); DatePicker ISO↔display; SelectConCreacion `+ Crear` last + onCreate; ComboboxBuscable keyboard-nav. Existing labels list (line 168) grows: `Fecha de compra`, `Precio`, `Peso compra`, `Lugar de compra`. |
| `apps/web/src/lib/fixtures/animal-form-catalog.ts` | Modify | Extend fixture: `raza`, `color` (with `swatch`), `calidad`, `lugarCompra`, `madre` (3 demo hembras), `padre` (2 demo machos + 1 pajuela), `configuracionCrear = { raza: true, color: true, calidad: false, lugarCompra: true }`. Shrink `origen` to 2 items (Nacimiento/Comprado — pills). |
| `apps/web/src/routes/_app/fincas/$fincaId/animales/nuevo.tsx` | Modify | `buildCreateAnimalInputFromFormData`: read 11 new FormData keys; `origen` → `tipoIngreso` in `datos`. `CAMPO_TO_FIELD_KEY`: ADD `fecha_compra → fechaCompra` (REMOVE the `// fecha_compra intentionally absent` comment at line 61), plus `precio_compra`, `peso_compra`, `raza`, `color`, `calidad`, `lugar_compra`, `padre_id`. |
| `apps/web/src/routes/_app/fincas/$fincaId/animales/$animalId/editar.tsx` | Modify | Pass `initialValues` from a loader (chained PR: demo fixture). Extend `buildUpdateAnimalInputFromFormData` with the 11 new keys. |
| `apps/web/src/server/animal-actions.ts` | Modify | `CreateAnimalWebInput.datos` grows by 11 keys (matches dominio `DatosCreacionAnimal`). |
| `apps/web/tests/animal-web-flow.test.ts` | Modify | INVERT `testMapperBuildsFieldErrorsAndDropsFechaCompra` (line 720) → `…AndPreservesFechaCompra`; add cases for `precio_compra`, `peso_compra`. `testRouteFormPayloadBuilders` (line 447) extended with the 11 new keys. |

## Interfaces / Contracts

```ts
export type OrigenKey = "nacido_en_finca" | "comprado"
export interface SelectOptionWithCreate extends SelectOption { readonly swatch?: string }
export interface AnimalFormCatalogOptions {
  origen?: readonly SelectOption[]; raza?: readonly SelectOptionWithCreate[]
  color?: readonly SelectOptionWithCreate[]; calidad?: readonly SelectOption[]
  lugarCompra?: readonly SelectOptionWithCreate[]
  madre?: readonly SelectOption[]; padre?: readonly SelectOption[]
  potrero?: readonly SelectOption[]; sector?: readonly SelectOption[]   // existing
  lote?: readonly SelectOption[]; grupo?: readonly SelectOption[]        // existing
  configuracionCrear?: { readonly raza?: boolean; readonly color?: boolean; readonly lugarCompra?: boolean }
}
export interface AnimalFormInitialValues {
  origen?: OrigenKey; fechaNacimiento?: string; fechaCompra?: string
  razaId?: string; colorId?: string; calidadId?: string; lugarCompraId?: string
  madreId?: string; padreId?: string; precioCompra?: string; pesoCompra?: string
  sexoKey?: 0 | 1 | 2
  potreroId?: string; sectorId?: string; loteId?: string; grupoId?: string
}
```

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit (primitives) | DatePicker ISO↔`dd/MM/yyyy` + `max=today` (RN-002); SelectConCreacion `+ Crear` last + `canCreate=false` hides; PillsSegmentadas `role="radiogroup"` + `aria-checked`; ComboboxBuscable WAI-ARIA + keyboard + empty state. | One Vitest file per primitive, `// @vitest-environment jsdom`. RED fails before implementation. |
| Integration (form) | v1.3 field set; `origen` toggle discards other-mode state (CA-UI-007); DatePicker for FechaNacimiento/Compra; SelectConCreacion for Raza/Color/LugarCompra; ComboboxBuscable for Madre/Padre; existing edit-mode read-only location intact. | Extend `packages/ui/tests/animal-ui.test.tsx`; existing label list (line 168) + edit-mode test (line 408) keep passing. |
| Integration (route + mapper) | `buildCreateAnimalInputFromFormData` reads the 11 new keys; `buildCreateAnimalFieldErrors` maps `fecha_compra → fechaCompra` (INVERSION of the old "drops" test), `precio_compra`, `peso_compra`, `raza`, `color`, `calidad`, `lugar_compra`, `padre_id`; e2e fast-path still `{ tipo: "creado" as const }`. | Extend `apps/web/tests/animal-web-flow.test.ts`. `testMapperBuildsFieldErrorsAndDropsFechaCompra` (line 720) is DELETED (not just renamed) and replaced with `…AndPreservesFechaCompra`. |
| Regression guard | `// fecha_compra intentionally absent` literal must not return to `nuevo.tsx`. | Source-level pin: greps for the literal and fails if found. |

## Threat Matrix

`N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. New deps are pure UI libs already vetted by the dependency-cruiser allow rule on line 145.`

## Migration / Rollout

`No migration required. Dominio use case already accepts the 11 new fields (`packages/dominio/src/animal.ts:78-91`); this is UI-only. Per-PR rollback: PR1 (primitives) reverts without touching the form; PR2a reverts to text inputs + 4-option origen select; PR2b reverts the mapper and drops the 11 keys. No DB migration, no data loss, no flag.`

## Open Questions

- [ ] Change folder has `proposal.md` but no `specs/animal-form-primitives/spec.md` or `specs/animal-crud-ui/spec.md` yet. Design references the proposal + canonical main specs. Confirm sdd-spec ordering.
- [ ] `origen` value: proposal says `tipo_ingreso 0/1` (numeric) but dominio types it as `"nacido_en_finca" | "comprado"`. Design uses the dominio string form; the mapper translates to `tipoIngreso` once. Confirm §3.1 is the label convention, not the form value.
- [ ] `configuracion:crear` permission lookup (CA-UI-002) lives in `packages/db/src/seed/seed.ts:92`; the form takes a `boolean` from `catalogOptions.configuracionCrear`. Confirm the route loader resolves the permission — UI never imports dominio.
- [ ] Madre/Padre richer rows: if the per-finca loader returns `sexo`/`fechaNacimiento` for "madre <24 meses al parto" (CA-CRE-003), a richer prop type is needed. Defer to the loader.
- [ ] "Estimar por edad" shortcut (CA-CRE-004) is NOT a primitive — `useState`/button on top of DatePicker, implemented in PR 2a.
- [ ] `precio_compra` / `peso_compra`: form value typed as `string` (raw). Confirm dominio accepts the formatted string and parses server-side, or whether the form strips formatting before submit.
