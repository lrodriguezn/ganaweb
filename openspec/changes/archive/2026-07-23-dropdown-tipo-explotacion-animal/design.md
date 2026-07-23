# Design: Dropdown for `tipoExplotacionId` + obligatory validation

## Technical Approach

Extend `CatalogoAnimalMaestroPort` with a fourth `TablaMaestro` discriminant (`"tipoExplotacion"`) backed by `CatalogoMaestroOption`, mirroring calidad/raza/color in adapter, use case, composite loader, E2E fixture, and form renderer. Only deviation: `DrizzleCatalogoAnimalMaestroAdapter.listarTiposExplotacion` omits the `eq(configTiposExplotacion.activo, 1)` filter so users can still select an inactive category for an existing animal. Validation becomes obligatory in `validarCamposMinimos` and `validarActualizacionAnimal`, both reusing `CA-CRE-001`. The route `CAMPO_TO_FIELD_KEY` gains one entry.

## Architecture Decisions

| Decision | Choice | Alternatives rejected | Rationale |
|---|---|---|---|
| Port surface | Extend `TablaMaestro` with `"tipoExplotacion"` | Dedicated port / widen `CatalogoGlobalPort` | Table is structurally identical to calidad; dedicated port violates ADR-002; `CatalogoGlobalPort` returns key/value, not maestro DTOs. |
| `activo=1` filter | Adapter case omits `.where(eq(activo, 1))` | Move to port / always filter / second method | Port contract stays a clean `listarActivos` discriminator; deviation is localized. |
| Obligatory field | `validarCamposMinimos` (create) + parallel check in `validarActualizacionAnimal` (update) | DB NOT NULL / domain mapper | `CA-CRE-001` already covers "obligatory" rejections; column stays nullable so legacy null rows remain editable. |
| Renderer | `CatalogSelectField` with new `required` prop → `aria-required="true"` on `SelectTrigger` | `SelectConCreacion` | Catalog is read-only (CA-UI-002). `CatalogSelectField` already wires `aria-invalid` / `aria-describedby`. |
| Loader slot | `tipoExplotacionSettled` in `Promise.allSettled`, mapped via `mapUcSettled` | Fire-and-forget / separate query | Mirrors the 3 existing maestro entries; one failure does not crash the loader. |

## Data Flow

```
                       CREATE / EDIT form
                              │
                     FormData (key "tipoExplotacion")
                              ▼
   nuevo.tsx / editar.tsx — buildCreate/UpdateAnimalInputFromFormData
        │ • optionalText(formData, "tipoExplotacion")  ← NEW
        ▼
   CreateAnimalWebInput.datos.tipoExplotacionId? / UpdateAnimalWebInput.cambios.tipoExplotacionId?
        │ createAnimalAction / updateAnimalAction  (createServerFn POST)
        ▼
   createAnimalRuntimeHarness.create() / update()
        │ validarCreacionAnimal / validarActualizacionAnimal
        │ • NEW: error("tipo_explotacion_id","CA-CRE-001","El tipo de explotación es obligatorio.")
        ▼
   DrizzleAnimalRepository → animales table → ResultadoAnimal<validacion>
        │ buildCreateAnimalFieldErrors / buildUpdateAnimalFieldErrors
        │ CAMPO_TO_FIELD_KEY: "tipo_explotacion_id" → "tipoExplotacionId"  ← NEW
        ▼
   fieldErrors.tipoExplotacionId → CatalogSelectField → aria-invalid="true"

   PARALLEL — catalog composition (loader, on form mount):
   ─────────────────────────────────────────────────────────────────
   loadAnimalCatalogs(fincaId, ports)
        ├── listarCatalogoRaza            → .where(eq(activo, 1))  [FILTER ON]
        ├── listarCatalogoColor           → .where(eq(activo, 1))  [FILTER ON]
        ├── listarCatalogoCalidad         → .where(eq(activo, 1))  [FILTER ON]
        └── listarCatalogoTipoExplotacion → .from(...)              [FILTER OFF] ← NEW
        ▼ mapUcSettled(...)
   AnimalCatalogs.tipoExplotacion → AnimalFormCatalogOptions.tipoExplotacion
        ▼ FIELD_RENDERERS["tipoExplotacionId"] = renderTipoExplotacionField
   CatalogSelectField (label="Tipo de explotación", required → aria-required="true")
```

The `activo=1` skip lives in `packages/db/src/catalogo-animal-maestro-infrastructure.ts:listarTiposExplotacion` (no `.where()` clause; calidad/raza/color all carry one). The use case is shape-identical to `listarCatalogoCalidad`.

## File Changes

| Layer | Files | What |
|---|---|---|
| Port + use case | `catalogo-animal-maestro-port.ts`, `listar-catalogo-tipo-explotacion.ts` (new), `index.ts` | Add `TipoExplotacionOption`; extend `TablaMaestro`; new use case (mirror calidad); re-export. |
| Adapter | `packages/db/src/catalogo-animal-maestro-infrastructure.ts` | Add `case "tipoExplotacion"` + new `listarTiposExplotacion` with NO `.where(eq(activo, 1))`. |
| Dominio | `packages/dominio/src/animal.ts` | `validarCamposMinimos` adds empty check; `validarActualizacionAnimal` adds parallel check on `cambios.tipoExplotacionId`. |
| Server loader | `apps/web/src/server/animal-actions.server.ts` | `AnimalCatalogs.tipoExplotacion`; `AnimalCatalogPorts.catalogoAnimalMaestro` widens; `Promise.allSettled` gets `tipoExplotacionSettled`; `mapUcSettled`; denied fallback adds the key. |
| UI | `packages/ui/src/ganado/animal-crud.tsx` | `AnimalFormCatalogOptions.tipoExplotacion`; `renderTipoExplotacionField` (mirror `renderHierroField`); `FIELD_RENDERERS["tipoExplotacionId"]`; extend `CatalogSelectField` with `required?: boolean` → `aria-required="true"`. |
| Routes | `apps/web/src/routes/.../animales/nuevo.tsx`, `.../editar.tsx` | `catalogsToFormOptions` maps `tipoExplotacion`; extract `optionalText(formData, "tipoExplotacion")`; `CAMPO_TO_FIELD_KEY` gains `tipo_explotacion_id: "tipoExplotacionId"`. |
| E2E fixture | `apps/web/src/server/e2e-animals-fixture.server.ts` | `createAnimalE2eCatalogoMaestroPort` adds `tipoExplotacion` array + case. |
| Tests | `tests/animal-catalogos.test.ts`, `packages/dominio/tests/animal.test.ts` | Composition assertions; create + update reject empty with `CA-CRE-001`. |

## Interfaces / Contracts

```ts
// packages/aplicacion/src/puertos/catalogo-animal-maestro-port.ts
export type TipoExplotacionOption = CatalogoMaestroOption
export type TablaMaestro = "raza" | "color" | "calidad" | "tipoExplotacion"

// packages/aplicacion/src/casos-uso/listar-catalogo-tipo-explotacion.ts
export interface CatalogoTipoExplotacionResult {
  readonly tipo: "disponible" | "no_disponible"
  readonly options: readonly TipoExplotacionOption[]
}
export async function listarCatalogoTipoExplotacion(
  port: CatalogoAnimalMaestroPort<"tipoExplotacion", TipoExplotacionOption>,
): Promise<CatalogoTipoExplotacionResult>

// packages/dominio/src/animal.ts — validarCamposMinimos (and parallel check in validarActualizacionAnimal on datos.cambios.tipoExplotacionId):
if (!datos.tipoExplotacionId || datos.tipoExplotacionId.length === 0) {
  errores.push(error("tipo_explotacion_id", "CA-CRE-001", "El tipo de explotación es obligatorio."))
}
```

## Testing Strategy

| Layer | What | How |
|---|---|---|
| Unit — dominio | Create + update reject empty with `CA-CRE-001`; non-empty passes. | `packages/dominio/tests/animal.test.ts` — assert `campo` and `regla`. |
| Unit — use case | es-CO sort; null-id / duplicate → `no_disponible`; no canonical-id whitelist. | New `packages/aplicacion/tests/listar-catalogo-tipo-explotacion.test.ts` (fake port). |
| Unit — adapter | `listarTiposExplotacion` returns all rows regardless of `activo`. | Extend `packages/db/tests/catalogo-animal-maestro-infrastructure.test.ts`. |
| Integration | Loader slot → `disponible`; denied session → `no_disponible`. | `tests/animal-catalogos.test.ts`. |
| Web | `fieldErrors.tipoExplotacionId` renders under "Tipo de explotación" with `aria-invalid="true"`. | Extend `apps/web/tests/animal-web-flow.test.ts`. |
| E2E | Empty submit shows error; valid selection persists. | `tests/e2e/animales.spec.ts` (Playwright). |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. Bounded to a form field, a Drizzle query, and a domain validator.

## Migration / Rollout

No migration. Column stays nullable; FK exists. Rollback reverts; both validators treat the field as optional. Legacy null rows remain editable forward-looking.

## Open Questions

None. Port choice, obligatory constraint, filter placement, and E2E seed values decided.
