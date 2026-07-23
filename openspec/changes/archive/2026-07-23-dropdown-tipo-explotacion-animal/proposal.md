# Proposal: Convert `tipoExplotacionId` to a catalog dropdown (and make it obligatory)

## Intent

`tipoExplotacionId` on the animal create/edit form falls through to a plain text input — no catalog options, no specific renderer. The data wiring exists end-to-end (DB table `config_tipos_explotacion`, FK, domain types, web contracts), but the catalog lookup is missing and the form does not extract the value from `FormData` in either route. This change completes the catalog chain following the established maestro pattern (raza/color/calidad) and elevates the field from optional to **obligatory** on create and edit — a new product requirement reflected in the domain validation.

## Scope

### In Scope

- New `listarCatalogoTipoExplotacion` use case, `"tipoExplotacion"` variant on `TablaMaestro`, adapter case in `DrizzleCatalogoAnimalMaestroAdapter` (same shape as `listarCatalogoCalidad`).
- New entry in `AnimalFormCatalogOptions`, `AnimalCatalogs`, `AnimalCatalogPorts`, `loadAnimalCatalogs`; mapper in both `nuevo.tsx` and `editar.tsx`.
- New `renderTipoExplotacionField` in `FIELD_RENDERERS` (mirror of `renderHierroField`) using `CatalogSelectField`.
- Extract `tipoExplotacionId` from `FormData` in both create and update routes.
- **NEW**: `validarCreacionAnimal` and `validarActualizacionAnimal` reject empty `tipoExplotacionId` (`CA-CRE-001`); route maps `tipo_explotacion_id` → `tipoExplotacionId` in `fieldErrors`.
- E2E fixture mock + `tests/animal-catalogos.test.ts` + `packages/dominio/tests/animal.test.ts` assertions.

### Out of Scope

- Inline `+ Crear nuevo` (only-select; no `SelectConCreacion`).
- Renaming `listarActivos` or refactoring the maestro port.
- Schema/FK/seed changes; filtering by `activo=1` (this catalog returns all rows); Phase 2 offline.

## Capabilities

### New Capabilities
None.

### Modified Capabilities

- `animal-crud-ui` — 9th catalog-backed field. `CatalogSelectField` (no `+ Crear nuevo`), label `Tipo de explotación`, payload carries the canonical `id`. Form MUST mark required and reject empty submit.
- `catalog-queries` — `listarCatalogoTipoExplotacion` as 9th use case in the maestro family. Decoder accepts every structurally valid row (no `CANONICAL_*_IDS` whitelist). Adapter does **not** filter by `activo=1`; UC returns the full ordered list.
- `animal-create-validation-feedback` — Extend `errores`→`fieldErrors` mapping with `tipo_explotacion_id` → `tipoExplotacionId`. Error renders under `Tipo de explotación`.

## Approach

Extend `CatalogoAnimalMaestroPort` with a `"tipoExplotacion"` discriminator, mirroring the calidad/raza/color additions. Two product decisions are isolated: (1) the adapter omits the `activo=1` filter for this one case (no port signature change); (2) the obligatory constraint is a domain-layer change in `validarCamposMinimos` + parallel check in `validarActualizacionAnimal`, both using the existing `CA-CRE-001` rule code, plus a route-level `fieldErrors` mapping and an `aria-required="true"` pass-through in `CatalogSelectField`.

## Affected Areas

- `packages/aplicacion/src/puertos/catalogo-animal-maestro-port.ts` — add `TipoExplotacionOption` and `"tipoExplotacion"` to `TablaMaestro`.
- `packages/aplicacion/src/casos-uso/listar-catalogo-tipo-explotacion.ts` (new) — use case mirroring `listarCatalogoCalidad`.
- `packages/aplicacion/src/index.ts` — re-export.
- `packages/db/src/catalogo-animal-maestro-infrastructure.ts` — add `"tipoExplotacion"` case; no `activo=1` filter; order by `nombre` es-CO.
- `packages/dominio/src/animal.ts` — both validators reject empty `tipoExplotacionId` with `CA-CRE-001`.
- `apps/web/src/server/animal-actions.server.ts` — `AnimalCatalogs.tipoExplotacion`, loader slot, denied fallback.
- `packages/ui/src/ganado/animal-crud.tsx` — `AnimalFormCatalogOptions.tipoExplotacion`, `renderTipoExplotacionField`, `FIELD_RENDERERS["tipoExplotacionId"]`.
- `apps/web/src/routes/.../animales/nuevo.tsx` and `.../editar.tsx` — `catalogsToFormOptions`, FormData extraction, fieldErrors mapping.
- `apps/web/src/server/e2e-animals-fixture.server.ts` — add `tipoExplotacion` to the mock maestro port.
- `tests/animal-catalogos.test.ts` + `packages/dominio/tests/animal.test.ts` — composition + obligatory assertions.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Deviation from "filter `activo=1`" pattern for other maestro catalogs | Med | Documented; one adapter case, no port signature change. Inactive rows surface but selection is still by `id`. |
| Existing data with `tipoExplotacionId = NULL` cannot be edited going forward | Med | Edit validates obligatory forward-looking; pre-existing rows stay editable as-is. Null migration is out of scope. |
| Mock fixture drift | Low | `createAnimalE2eCatalogoMaestroPort` mirrors the other 3 cases. |

## Rollback Plan

Revert the commit. Both validators revert to treating `tipoExplotacionId` as optional; routes revert to the `Field` fallback and stop extracting the field; `AnimalFormCatalogOptions.tipoExplotacion` is removed. No DB migration, no data loss — the column stays nullable. The form falls back to the current text-input behavior.

## Dependencies

- Internal: `CatalogoAnimalMaestroPort`, `DrizzleCatalogoAnimalMaestroAdapter`, `loadAnimalCatalogs`, `AnimalFormScreen`, both validators, route mapping.
- Schema: `config_tipos_explotacion` exists; FK declared. No new npm dependencies.

## Success Criteria

- [ ] `tipoExplotacionId` renders as `CatalogSelectField` on both forms.
- [ ] Dropdown lists all rows from `config_tipos_explotacion` (actives + inactives), ordered by `nombre` es-CO; no `+ Crear nuevo` affordance.
- [ ] Empty value rejected by both validators (`CA-CRE-001`); route maps the error to `fieldErrors.tipoExplotacionId`; input renders `aria-invalid="true"`.
- [ ] `loadAnimalCatalogs` includes `tipoExplotacion`; E2E mock mirrors it.
- [ ] `tests/animal-catalogos.test.ts` + `packages/dominio/tests/animal.test.ts` pass.
- [ ] `pnpm turbo typecheck && pnpm turbo test` verde.
