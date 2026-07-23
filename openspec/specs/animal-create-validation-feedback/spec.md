# Animal Create Validation Feedback Specification

## Purpose

End-to-end contract for surfacing structured validation errors from the animal create use case through the create route into the form. Harness, `crearAnimal`, and validation logic are out of scope.

## Requirements

### Requirement: createAnimalAction returns the full harness result

`createAnimalAction` (`apps/web/src/server/animal-actions.ts`) SHALL return the full harness result on the non-e2e path: `return result` instead of `return { tipo: result.tipo }`. The e2e fast-path early return MUST stay untouched.

#### Scenario: Action forwards the union on validacion [apps/web/tests/animal-web-flow.test.ts:354]

- GIVEN the action is invoked with input that triggers validation
- WHEN the harness returns `{ tipo: "validacion", errores: [...] }`
- THEN the handler resolves with that object — `errores` is the verbatim `ErrorValidacionAnimal[]`
- AND the e2e fast-path still returns `{ tipo: "creado" as const }` (no `errores` key)

### Requirement: Create route only navigates when result.tipo is creado

The create route (`apps/web/src/routes/_app/fincas/$fincaId/animales/nuevo.tsx`) SHALL `await` the action and branch on `result.tipo`, calling `window.location.assign('/fincas/{fincaId}/animales')` only when `result.tipo === "creado"`. The `try/finally/assign` MUST be removed.

#### Scenario: creado result navigates to the list [apps/web/tests/animal-web-flow.test.ts:479]

- GIVEN the user submits the create form
- WHEN the action resolves with `{ tipo: "creado", animalId, imagenes? }`
- THEN the route calls `window.location.assign('/fincas/{fincaId}/animales')`

### Requirement: Create route maps errores to fieldErrors

The route SHALL map each `result.errores[i]` to `Record<string, string>` and pass it to `AnimalFormScreen` as `fieldErrors`. Entries with no matching form field SHALL be discarded (no generic banner — out of scope).

Mapping: `codigo`→`codigo`; `nombre`→`nombre`; `sexo_key`→`sexoKey`; `fecha_nacimiento`→`fechaNacimiento`; `fecha_compra`→`fechaCompra`; `madre_id`→`madre`; `padre_id`→`padre`; `tipo_explotacion_id`→`tipoExplotacionId`.

#### Scenario: Validation result renders per-field errors [apps/web/tests/animal-web-flow.test.ts:447]

- GIVEN the harness returns validacion with `errores = [{ campo: "codigo", detalle: "..." }, { campo: "sexo_key", detalle: "..." }]`
- WHEN the route resolves the action
- THEN it builds `fieldErrors = { codigo: "...", sexoKey: "..." }` and passes it to `AnimalFormScreen`

#### Scenario: tipoExplotacionId error renders under "Tipo de explotación"

- GIVEN the harness returns validacion with `errores = [{ campo: "tipo_explotacion_id", regla: "CA-CRE-001", detalle: "..." }]`
- WHEN the route resolves the action
- THEN `fieldErrors.tipoExplotacionId` is set to the `detalle` message
- AND the `Tipo de explotación` control carries `aria-invalid="true"` and `aria-describedby` pointing to the error node
- AND the error message is associated with the control via `aria-describedby` (reuses the per-field error binding already shipped)

### Requirement: AnimalFormScreen renders per-field errors

`AnimalFormScreenProps` (`packages/ui/src/ganado/animal-crud.tsx`) SHALL expose an optional `fieldErrors?: Record<string, string>`. Each entry MUST render under the named input as an inline error linked via `aria-describedby`. When omitted, no error markup is rendered.

#### Scenario: Form displays error under the named field [packages/ui/tests/animal-ui.test.tsx:210]

- GIVEN `AnimalFormScreen` renders with `fieldErrors = { codigo: "El código es obligatorio." }`
- WHEN the form is shown
- THEN the message is associated with the `codigo` input via `aria-describedby` and the input has `aria-invalid="true"`

#### Scenario: Form omits error markup when fieldErrors is omitted [packages/ui/tests/animal-ui.test.tsx:164]

- GIVEN `AnimalFormScreen` renders without `fieldErrors`
- WHEN the form is shown
- THEN no `role="alert"` or `aria-invalid="true"` is rendered on any input

### Requirement: validacion and thrown errors keep the user on the form

When `result.tipo === "validacion"` or the action throws, the route SHALL NOT navigate and the form SHALL remain mounted with submitted values intact. Thrown errors SHALL NOT produce a field error.

#### Scenario: validacion preserves the form [apps/web/tests/animal-web-flow.test.ts:479]

- GIVEN the user typed `codigo = "MT-122"` and `nombre = "Matilda"`
- WHEN the action returns `{ tipo: "validacion", errores: [...] }`
- THEN the route does not navigate and form values stay `"MT-122"` and `"Matilda"`

#### Scenario: Thrown action keeps the user on the form [apps/web/tests/animal-web-flow.test.ts:479]

- GIVEN the user typed valid form values
- WHEN the action rejects
- THEN the route does not navigate and the form stays mounted

### Requirement: Edit mode is unchanged when fieldErrors is omitted

When `AnimalFormScreen` renders with `formVariant="edit"` and no `fieldErrors`, the read-only location section, the `Mover animal` button, and the payload contract (no `potreroId`/`sectorId`/`loteId`/`grupoId`/`ubicacion` in `FormData`) MUST remain unchanged. The edit route MUST NOT be migrated.

#### Scenario: Edit form remains read-only and the new prop is unused [packages/ui/tests/animal-ui.test.tsx:336]

- GIVEN the edit form renders with `formVariant="edit"` and `currentLocation` only
- WHEN the existing edit-mode test runs
- THEN it still passes; `fieldErrors` is undefined in the default edit-mode render

### Requirement: tipoExplotacionId is obligatory on create and edit

The `validarCreacionAnimal` and `validarActualizacionAnimal` domain functions MUST reject an empty or missing `tipoExplotacionId` with the rule code `CA-CRE-001`. Both validators MUST surface the rejection as an `ErrorValidacionAnimal` whose `campo` is `"tipo_explotacion_id"`, whose `regla` is `"CA-CRE-001"`, and whose `detalle` is a Spanish human-readable message naming the field. The rejection applies to create AND to edit — pre-existing animals with a null `tipoExplotacionId` stay editable forward-looking only; null migration of legacy rows is out of scope. This satisfies CA-CRE-001 for the `tipoExplotacionId` field.

(Previously: neither validator checked `tipoExplotacionId`; the field was optional end-to-end and the harness accepted empty values without complaint.)

#### Scenario: Create rejects empty tipoExplotacionId with CA-CRE-001

- GIVEN a create payload with `tipoExplotacionId = null`, `""`, or undefined
- WHEN `validarCreacionAnimal` runs
- THEN the result is `{ tipo: "validacion", errores: [{ campo: "tipo_explotacion_id", regla: "CA-CRE-001", detalle: "..." }] }`
- AND no `AnimalValidado` is emitted

#### Scenario: Update rejects empty tipoExplotacionId with CA-CRE-001

- GIVEN an update payload with `cambios.tipoExplotacionId = null`, `""`, or undefined
- WHEN `validarActualizacionAnimal` runs
- THEN the result is `{ tipo: "validacion", errores: [{ campo: "tipo_explotacion_id", regla: "CA-CRE-001", detalle: "..." }] }`
- AND no updated `AnimalValidado` is emitted

#### Scenario: Non-empty tipoExplotacionId is accepted by both validators

- GIVEN a payload with `tipoExplotacionId` set to a structurally valid catalog id
- WHEN either `validarCreacionAnimal` or `validarActualizacionAnimal` runs
- THEN no `CA-CRE-001` rejection is produced for this field
- AND the validation moves on to the remaining field-level checks

## Rule Citations

- CA-CRE-001/002/003/004 — `errores[].regla` enumerates the per-field validation rules.
- IA-003 — Reuse `packages/ui` components for any UI surfaced in this change.
- T-003 — Domain names and UI text in Spanish.
- T-004 — No `dark:` variants; token-only theming.