## Exploration: Convert `tipoExplotacionId` from text input to catalog dropdown

### Current State

The `tipoExplotacionId` field in the animal create/edit form currently renders as a plain `<Input>` text field. This happens because it falls through to the `Field` generic fallback in `FIELD_RENDERERS` — there's no specific renderer for `tipoExplotacionId`, and it's not included in `AnimalFormCatalogOptions`.

The data model is already fully wired:
- **DB**: `configTiposExplotacion` table exists with `id`, `nombre`, `descripcion`, `activo`
- **Schema FK**: `animales.tipoExplotacionId` references `configTiposExplotacion.id`
- **Domain**: `tipoExplotacionId?: string | null` is in `AnimalResumen`, `DatosCreacionAnimal`, `AnimalValidado`, `DatosActualizacionAnimal`
- **Form initial values**: `AnimalFormInitialValues.tipoExplotacionId` already declared
- **Web contract**: `CreateAnimalWebInput.datos.tipoExplotacionId` and `UpdateAnimalWebInput.cambios.tipoExplotacionId` already declared
- **Update route**: `buildUpdateAnimalInputFromFormData` does NOT extract `tipoExplotacionId` from FormData
- **Create route**: `buildCreateAnimalInputFromFormData` does NOT extract `tipoExplotacionId` from FormData

### What's Missing

The catalog infrastructure does not exist yet:
- No port/interface for querying `configTiposExplotacion`
- No database adapter
- No use case (`listarCatalogoTipoExplotacion`)
- Not included in `AnimalCatalogs` type
- Not included in `AnimalFormCatalogOptions` type
- Not included in `loadAnimalCatalogs()` composite loader
- Not included in `catalogsToFormOptions()` in either route
- No renderer in `FIELD_RENDERERS`
- Not extracted from FormData in either route's `buildXxxAnimalInputFromFormData`

### Affected Areas

```
packages/aplicacion/src/puertos/catalogo-animal-maestro-port.ts  — Add TipoExplotacionOption type
packages/aplicacion/src/casos-uso/listar-catalogo-tipo-explotacion.ts  — NEW: use case
packages/aplicacion/src/index.ts  — Export new use case
packages/db/src/catalogo-animal-maestro-infrastructure.ts  — Add handler for "tipoExplotacion" in listarActivos
apps/web/src/server/animal-actions.server.ts  — Add to AnimalCatalogs, loadAnimalCatalogs, AnimalCatalogPorts
apps/web/src/server/animal-actions.ts  — Re-export is automatic via wildcard
packages/ui/src/ganado/animal-crud.tsx  — Add tipoExplotacion to AnimalFormCatalogOptions, FIELD_RENDERERS
apps/web/src/routes/_app/fincas/$fincaId/animales/nuevo.tsx  — Add to catalogsToFormOptions, buildCreateAnimalInputFromFormData
apps/web/src/routes/_app/fincas/$fincaId/animales/$animalId/editar.tsx  — Add to catalogsToFormOptions, buildUpdateAnimalInputFromFormData
apps/web/src/server/e2e-animals-fixture.server.ts  — Add tipoExplotacion to E2E mock maestro port
tests/animal-catalogos.test.ts  — Add assertions for tipoExplotacion in composite loader tests
```

### Approaches

1. **Extend `CatalogoAnimalMaestroPort` — parameterized by tabla (recommended)**
   Add `"tipoExplotacion"` to `TablaMaestro`, create `TipoExplotacionOption`, add handler in the existing adapter, create a use case following the `listarCatalogoCalidad` pattern.
   - Pros: Follows ADR-002 (one adapter per family), minimal new infrastructure, reuses existing composite loader pattern
   - Cons: Requires updating `TablaMaestro` type and adapter switch cases
   - Effort: Medium (8-10 files touched, low complexity per file)

2. **Dedicated port + adapter**
   Create `CatalogoTiposExplotacionPort`, `DrizzleCatalogoTiposExplotacionAdapter`, new use case, add as a fifth port in `AnimalCatalogPorts`.
   - Pros: Zero touch to existing port interfaces, completely isolated
   - Cons: More code, adds a new port family for what is structurally identical to calidad/raza/color, violates DRY with existing maestro pattern
   - Effort: Medium (10-12 files)

3. **Use `CatalogoGlobalPort` extended**
   Widen `CatalogoGlobalPort.listarActivos` to accept `"tipoExplotacion"` alongside `"sexo"`.
   - Pros: Single port, least new code
   - Cons: `CatalogoGlobalPort` is typed for `configKeyValues` (key/value structure), not for `configTiposExplotacion` (id/nombre). Would require changing the return type to a union, breaking existing consumers. Architecture mismatch.
   - Effort: Low (few files) but architecturally incorrect

### Dependency Chain (End-to-End)

```
DB: config_tipos_explotacion table (packages/db/src/schema/config.ts)
  ↓ drizzle query
Adapter: DrizzleCatalogoAnimalMaestroAdapter — add "tipoExplotacion" case (packages/db/src/catalogo-animal-maestro-infrastructure.ts)
  ↓ implements
Port: CatalogoAnimalMaestroPort<"tipoExplotacion", TipoExplotacionOption> (packages/aplicacion/src/puertos/catalogo-animal-maestro-port.ts)
  ↓ use case
Use Case: listarCatalogoTipoExplotacion(port) → CatalogoTipoExplotacionResult (packages/aplicacion/src/casos-uso/listar-catalogo-tipo-explotacion.ts)
  ↓ consumed by
Composite Loader: loadAnimalCatalogs() — add tipoExplotacion to Promise.allSettled (apps/web/src/server/animal-actions.server.ts)
  ↓ returns
Type: AnimalCatalogs.tipoExplotacion (apps/web/src/server/animal-actions.server.ts)
  ↓ mapped by route
catalogsToFormOptions() → AnimalFormCatalogOptions.tipoExplotacion (nuevo.tsx / editar.tsx)
  ↓ passed to
AnimalFormScreen catalogOptions prop (packages/ui/src/ganado/animal-crud.tsx)
  ↓ rendered by
FIELD_RENDERERS["tipoExplotacionId"] → CatalogSelectField (packages/ui/src/ganado/animal-crud.tsx)
  ↓ submitted as
FormData → buildXxxAnimalInputFromFormData extracts tipoExplotacionId (nuevo.tsx / editar.tsx)
  ↓ forwarded to
CreateAnimalWebInput.datos.tipoExplotacionId / UpdateAnimalWebInput.cambios.tipoExplotacionId
  ↓ persisted by
Existing dominio → animal-actions.server.ts → DB
```

### Existing Tests

- `tests/animal-catalogos.test.ts` — Tests `loadAnimalCatalogs` composition. Will need new assertions for `tipoExplotacion` in each test case.
- No form-level tests currently exist for the `tipoExplotacionId` field specifically.

### Recommendation

**Approach 1: Extend `CatalogoAnimalMaestroPort`**. This is the most consistent with the existing architecture. The `configTiposExplotacion` table has the exact same shape as `configCalidadAnimal` (id, nombre, descripcion, activo), so it naturally fits as another `TablaMaestro` variant. The adapter already uses a switch on `tabla` and adding a new case is straightforward. The use case follows the exact same pattern as `listarCatalogoCalidad`.

The full changes are:

1. **`packages/aplicacion/src/puertos/catalogo-animal-maestro-port.ts`**: Add `TipoExplotacionOption = CatalogoMaestroOption`, add `"tipoExplotacion"` to `TablaMaestro`.

2. **`packages/aplicacion/src/casos-uso/listar-catalogo-tipo-explotacion.ts`** (NEW): Same pattern as `listar-catalogo-calidad.ts` — calls `port.listarActivos("tipoExplotacion")`.

3. **`packages/aplicacion/src/index.ts`**: Export `*` from the new use case and the new types from the port.

4. **`packages/db/src/catalogo-animal-maestro-infrastructure.ts`**: Add `"tipoExplotacion"` case to `listarActivos` switch, query `configTiposExplotacion` where `activo=1`, order by `nombre`, map to `{ id, nombre, activo }`.

5. **`apps/web/src/server/animal-actions.server.ts`**: 
   - Add `tipoExplotacion: AnimalCatalogResult` to `AnimalCatalogs`
   - Import `listarCatalogoTipoExplotacion`
   - Add `tipoExplotacionSettled` to `Promise.allSettled` array
   - Add `tipoExplotacion: mapUcSettled(tipoExplotacionSettled)` to return object
   - Add `tipoExplotacion: NO_DISPONIBLE_CATALOG` to denied response

6. **`packages/ui/src/ganado/animal-crud.tsx`**:
   - Add `tipoExplotacion?: readonly SelectOption[]` to `AnimalFormCatalogOptions`
   - Add `renderTipoExplotacionField` function (same pattern as `renderHierroField`)
   - Add `tipoExplotacionId: renderTipoExplotacionField` to `FIELD_RENDERERS`

7. **`apps/web/src/routes/_app/fincas/$fincaId/animales/nuevo.tsx`**:
   - Add `tipoExplotacion: extract(catalogs.tipoExplotacion)` to `catalogsToFormOptions`
   - Add `tipoExplotacionId` extraction in `buildCreateAnimalInputFromFormData`

8. **`apps/web/src/routes/_app/fincas/$fincaId/animales/$animalId/editar.tsx`**:
   - Add `tipoExplotacion: extract(catalogs.tipoExplotacion)` to `catalogsToFormOptions`
   - Add `tipoExplotacionId` extraction in `buildUpdateAnimalInputFromFormData`

9. **`apps/web/src/server/e2e-animals-fixture.server.ts`**: Add `tipoExplotacion` case to `createAnimalE2eCatalogoMaestroPort`.

10. **`tests/animal-catalogos.test.ts`**: Add `tipoExplotacion` assertions to all test cases.

### Risks

- **Low**: `configTiposExplotacion` might be empty in some deployments — the `NO_DISPONIBLE_CATALOG` fallback handles this gracefully (same as all other catalogs).
- **None**: The FK is already declared at schema level, and all domain/web contracts already carry the field. No migration needed.
- **None**: The form already renders the field as a fallback `<Field>`, so removing that fallback is purely additive.

### Ready for Proposal

Yes. All infrastructure is known, the pattern is well-established (4 existing catalogs follow it), and no schema/domain changes are needed.
