# Delta for Animal Create Validation Feedback

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Create route maps errores to fieldErrors

The route SHALL map each `result.errores[i]` to `Record<string, string>` and pass it to `AnimalFormScreen` as `fieldErrors`. Entries with no matching form field SHALL be discarded (no generic banner — out of scope).

Mapping: `codigo`→`codigo`; `nombre`→`nombre`; `sexo_key`→`sexoKey`; `fecha_nacimiento`→`fechaNacimiento`; `fecha_compra`→`fechaCompra`; `madre_id`→`madre`; `padre_id`→`padre`; `tipo_explotacion_id`→`tipoExplotacionId`.

(Previously: the mapping did not include `tipo_explotacion_id`; the `Tipo de explotación` control rendered no error feedback when the domain rejected an empty value.)

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
