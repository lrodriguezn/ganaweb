# Design: Animal Create Error Handling (Issue #48)

## Context

The create flow drops server-side errors twice. The route (`nuevo.tsx:60-68`) wraps `createAnimalAction` in `try { ... } finally { window.location.assign(...) }`, so thrown errors and `validacion` still navigate. The handler (`animal-actions.ts:77-78`) discards the structured `errores` and returns `{ tipo: result.tipo }`. The fix forwards the full result, branches on `result.tipo`, and renders per-field messages under the named inputs.

## Architecture

```
AnimalFormScreen ──▶ NewAnimalRoute.save ──▶ createAnimalAction ──▶ harness ──▶ crearAnimal
       ▲                  │   result.tipo        │
       │ fieldErrors      │ "creado" → assign   │
       └──────────────────┘ "validacion" → map → fieldErrors
                            thrown → keep mounted
```

The route is the boundary that translates the domain's `ErrorValidacionAnimal[]` into the UI's `Record<string, string>`. No domain type leaks into `packages/ui`.

## Type contract (verbatim)

Domain — unchanged (`packages/dominio/src/animal.ts:61-65`): each item is `{ campo: string; regla: ReglaAnimal; detalle: string }`. Harness return — the `validacion` arm at `packages/aplicacion/src/casos-uso/animales/index.ts:359` types `errores: unknown`; runtime value is `ErrorValidacionAnimal[]` (set at 373, 377). UI prop — additive on `AnimalFormScreenProps` (`packages/ui/src/ganado/animal-crud.tsx:493-501`): `fieldErrors?: Record<string, string>`.

## Component changes

**`apps/web/src/server/animal-actions.ts`** — replace `return { tipo: result.tipo }` (78) with `return result`. E2e fast-path (67-75) untouched. Tests pin both.

**`apps/web/src/routes/_app/fincas/$fincaId/animales/nuevo.tsx`** — drop `try/finally/assign`. `save` awaits the action, navigates only on `result.tipo === "creado"`, and on `"validacion"` builds `fieldErrors` via the mapper below (held in `useState`, passed to both `<AnimalFormScreen>` renders). Unmapped `campo` values are dropped per spec line 32. `fieldErrors` resets on each `onSave`. Thrown errors and the other `tipo` arms keep the form mounted, no field error (banner out of scope).

**`packages/ui/src/ganado/animal-crud.tsx`** — add optional `fieldErrors` to props. `Field` and `CatalogSelectField` derive `errorId = \`${id}-error\``; when `fieldErrors?.[name]` exists, render `<p id={errorId} role="alert" className="text-caption text-danger-600">` and pass `aria-invalid="true"` + `aria-describedby={errorId}` to the input/select. When omitted, no error markup renders. The label-derived `id` keeps `getByLabelText("Código *")` working.

## Mapping table

`campo` → `fieldErrors` key → form field → action:
- `codigo` → `codigo` → yes (`:549`) → render under `Código *`
- `nombre` → `nombre` → yes (`:550`) → render under `Nombre`
- `sexo_key` → `sexoKey` → yes (`:552`) → render under `Sexo`
- `fecha_nacimiento` → `fechaNacimiento` → yes (`:554`) → render under `Fecha de nacimiento`
- `fecha_compra` → `fechaCompra` → **NO** (only `fechaNacimiento` exists) → discarded per spec line 32, see R1
- `madre_id` → `madre` → yes (`:558`) → render under `Madre`
- `padre_id` → `padre` → yes (`:559`) → render under `Padre`

The mapper lives in `nuevo.tsx` (or a sibling util). The UI package never imports the domain type.

## Test plan

All scenarios in the two existing test files; no new files.

| Scenario | File | Strategy |
|---|---|---|
| Action forwards `validacion` | `animal-web-flow.test.ts` ~:354 | mock harness → `validacion`; assert shape. |
| E2e fast-path shape | same ~:380 | stub `isAnimalE2eEnabled`; assert `{ tipo: "creado" }`. |
| `creado` navigates | same ~:410 | stub `assign`; assert called. |
| `validacion` keeps form | same ~:440 | type, mock `validacion`; no assign + inputs intact. |
| Mapper drops `fecha_compra` | same ~:470 | unit test mapper. |
| Form renders ARIA wiring | `animal-ui.test.tsx` ~:210 | render with `fieldErrors = { codigo: "…" }`. |
| Form omits markup by default | same, augment `:164` | one assertion: no `role="alert"`. |
| Edit mode unchanged | same, existing `:336` | no new assertions. |

## Rollback

Revert the three source files and the two test files. No schema, harness, or `crearAnimal` changes — the wider return shape restores exactly to the prior `{ tipo }`-only shape. Form revert drops the ARIA wiring and the `fieldErrors` prop.

## Out of scope

Harness, `crearAnimal`, validation-logic changes, the edit route, generic banners for `no_autenticado` / `permiso_denegado` / `finca_no_autorizada` / `transaccion_fallida`, CA-UI follow-ups, FincaSwitcher/header defects, and the missing `fechaCompra` form field (flagged as a follow-up).

## Risks

| ID | Sev | Summary |
|---|---|---|
| R1 | med | `fecha_compra → fechaCompra` has no target field (only `fechaNacimiento` at `:554`). Errors for `fecha_compra` (CA-CRE-002) are discarded silently per spec line 32. Keep the spec, drop the unmapped entry, file a follow-up for a `fechaCompra` input + `tipoIngreso` selector that drives CA-CRE-002. |
| R2 | low | Use case types `errores: unknown` (`casos-uso/animales/index.ts:359`) though runtime is `ErrorValidacionAnimal[]`. Route uses a local `Array.isArray` guard and accesses `campo`/`detalle` without importing the domain type. |
| R3 | low | A separate `createAnimalAction` lives at `animal-actions.server.ts:502` for server-side callers — the design touches ONLY the web handler at `animal-actions.ts:63-79`. The web test asserts the string `createAnimalAction` (line 509), so the export name must stay. |
| R4 | low | The harness's `creado` arm may carry `imagenes?` (use case 353-357). After `return result` the e2e fast-path test must assert `{ tipo: "creado" }` exactly with no `errores` key, ignoring any optional `imagenes`. |
