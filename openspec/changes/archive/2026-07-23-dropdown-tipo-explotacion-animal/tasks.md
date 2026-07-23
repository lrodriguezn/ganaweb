# Tasks: Dropdown for `tipoExplotacionId` + obligatory validation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~250 (13 files) |
| 400-line budget risk | Low |
| 800-line budget risk | Low |
| Chained PRs recommended | No |
| Chain strategy | size-exception |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low
800-line budget risk: Low

### Suggested Work Units

Single PR. ~250 lines / 13 files inside the 400-line reviewer budget.
Focused test command: `pnpm turbo test --filter=animal-catalogos && pnpm turbo test --filter=@ganaweb/dominio`.
Runtime harness: `getAnimalCatalogsAction` real loader; E2E via `e2e-animals-fixture`.
Rollback: revert the PR; column stays nullable; validators revert to optional.

## Phase 1: Port + use case (aplicacion)

- [x] 1.1 Add `TipoExplotacionOption = CatalogoMaestroOption`; extend `TablaMaestro` with `"tipoExplotacion"` in `packages/aplicacion/src/puertos/catalogo-animal-maestro-port.ts`.
- [x] 1.2 Create `packages/aplicacion/src/casos-uso/listar-catalogo-tipo-explotacion.ts` mirroring `listar-catalogo-calidad.ts` (es-CO sort, empty → `no_disponible`, no canonical-id whitelist).
- [x] 1.3 Re-export from `packages/aplicacion/src/index.ts`. V: `pnpm --filter @ganaweb/aplicacion typecheck`.

## Phase 2: Adapter (db)

- [x] 2.1 Add `case "tipoExplotacion": return this.listarTiposExplotacion()` overload in `packages/db/src/catalogo-animal-maestro-infrastructure.ts` `listarActivos` switch.
- [x] 2.2 Implement `listarTiposExplotacion()` selecting from `configTiposExplotacion` ordered by `nombre` es-CO — **no** `.where(eq(activo, 1))` filter.

## Phase 3: Domain validation (obligatory)

- [x] 3.1 In `packages/dominio/src/animal.ts` `validarCamposMinimos`, push `error("tipo_explotacion_id", "CA-CRE-001", "El tipo de explotación es obligatorio.")` when `datos.tipoExplotacionId` is empty/null/undefined.
- [x] 3.2 In `validarActualizacionAnimal`, add parallel empty check on `cambios.tipoExplotacionId` returning the same `CA-CRE-001` error.

## Phase 4: Server loader integration

- [x] 4.1 Extend `AnimalCatalogs` with `tipoExplotacion: AnimalCatalogResult` in `apps/web/src/server/animal-actions.server.ts`.
- [x] 4.2 Add `tipoExplotacionSettled` to `Promise.allSettled`; `mapUcSettled` it into the return object.
- [x] 4.3 Add `tipoExplotacion: NO_DISPONIBLE_CATALOG` to the cross-finca denied fallback.

## Phase 5: UI catalog options + renderer

- [x] 5.1 Add `tipoExplotacion?: readonly SelectOption[]` to `AnimalFormCatalogOptions` in `packages/ui/src/ganado/animal-crud.tsx`.
- [x] 5.2 Extend `CatalogSelectField` with `required?: boolean` → `aria-required="true"` on `SelectTrigger`.
- [x] 5.3 Add `renderTipoExplotacionField` (mirror `renderHierroField`) reading `catalogOptions?.tipoExplotacion` and `initialValues?.tipoExplotacionId`.
- [x] 5.4 Add `tipoExplotacionId: renderTipoExplotacionField` to `FIELD_RENDERERS`.

## Phase 6: Route integration (nuevo + editar)

- [x] 6.1 In `apps/web/src/routes/_app/fincas/$fincaId/animales/nuevo.tsx`: `catalogsToFormOptions` → add `tipoExplotacion`; extract `tipoExplotacionId = optionalText(formData, "tipoExplotacion")` in `buildCreateAnimalInputFromFormData`; extend `CAMPO_TO_FIELD_KEY` with `tipo_explotacion_id → tipoExplotacionId`.
- [x] 6.2 In `.../$animalId/editar.tsx`: mirror 6.1 — `catalogsToFormOptions`, `buildUpdateAnimalInputFromFormData`, `CAMPO_TO_FIELD_KEY` entry.

## Phase 7: E2E fixture

- [x] 7.1 Add `tipoExplotacion` case + seeded array to `createAnimalE2eCatalogoMaestroPort` in `apps/web/src/server/e2e-animals-fixture.server.ts` (mirror calidad/raza/color shape).

## Phase 8: Tests

- [x] 8.1 RED `packages/dominio/tests/animal.test.ts`: create + update reject empty `tipoExplotacionId` with `campo="tipo_explotacion_id"`, `regla="CA-CRE-001"`; non-empty passes.
- [x] 8.2 RED `packages/aplicacion/tests/listar-catalogo-tipo-explotacion.test.ts`: es-CO sort, no canonical-id whitelist, null/dup/empty → `no_disponible`.
- [x] 8.3 RED `packages/db/tests/catalogo-animal-maestro-infrastructure.test.ts`: `listarTiposExplotacion` returns all rows regardless of `activo`.
- [x] 8.4 Extend `tests/animal-catalogos.test.ts`: 13 catalogs composed including `tipoExplotacion`; denied session → `no_disponible` for all.
- [x] 8.5 Extend `apps/web/tests/animal-web-flow.test.ts`: `fieldErrors.tipoExplotacionId` renders under "Tipo de explotación" with `aria-invalid="true"`.
- [x] 8.6 E2E `tests/e2e/animales.spec.ts`: valid selection persists with canonical id.
- [x] 8.7 Gate: `pnpm turbo typecheck && pnpm turbo test && pnpm turbo build && biome ci .` verde.
