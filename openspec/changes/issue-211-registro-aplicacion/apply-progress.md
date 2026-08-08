# Apply Progress: Issue #211 — Sanidad: registro de aplicación

Change: `issue-211-registro-aplicacion` · Rama: `feat/issue-211-sanidad-registro` · Base: origin/master 6c5323d
Modo: **Strict TDD** (RED→GREEN→REFACTOR por tarea) · Delivery: single-pr (presupuesto sesión 4000 líneas)

## Decisiones durante apply

1. **BD smoke local**: la BD local `ganaweb` tiene drift de esquema (constraints de auditoría `ck_registros_grupales_auditoria`/`ck_aplicaciones_auditoria` + columnas `anulado_por`/`motivo_anulacion`/`origen_seleccion` que NO están en las migraciones del repo). Con esa BD, 3 tests del bloque #208 (anulación RN-051 + cascada de stock) fallan en la base 6c5323d — fallo pre-existente de entorno, no del código. Se creó la BD scratch `ganaweb_smoke211` con las migraciones del repo (paridad con CI, "recién migrada SIN seed"); ahí el baseline completo pasa 12/12 y toda la evidencia smoke de U1/U2 corre contra ella. `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ganaweb_smoke211`.
2. **`fincaId` en `registrarAplicaciones`**: el input del puerto gana `fincaId` (solo para las filas `sync_outbox`; `aplicaciones_sanitarias` no tiene `finca_id`). Lo aporta el caso de uso desde `sesion.fincaActivaId` revalidada (SAN-063), mismo patrón que `EntradaAlmacenNueva` (#210).
3. **Payloads del outbox**: camelCase replicando la fila (convención `outboxBase` de #210). Cabecera: `fecha` como ISO string (`Date.toISOString()`); hija: `dosis`/`precioDosis` con sus valores numéricos originales (la columna guarda `String(...)` pero el payload preserva el número, como `registrarEntradaAlmacen`).
4. **Capa del test de aplicación de U2**: `listarAnimalesEnFinca` es una lectura sin caso de uso (el harness web llamará al puerto, patrón `listarEntradasAlmacen`). La evidencia de aplicación es: (a) el contrato del puerto se cumple en los fakes de `sanidad-use-cases.test.ts` y `sanidad-almacen-contract.test.ts` (typecheck), (b) el caso de uso forwarda `fincaId` a escritura (aserción nueva en `sanidad-use-cases.test.ts`), (c) el comportamiento EN_FINCA a la fecha vive en el SQL real (smoke PG con venta/muerte antes/después de la fecha). El filtro reutiliza la regla de dominio `evaluarAnimalEnFinca` (ya testeada), no lógica nueva.
5. **Orden de animales en `listarAnimalesEnFinca`**: `ORDER BY codigo` para selección estable en el drawer (portable a SQLite, D3).

## Evidencia por work unit

### Unit 1 — Outbox T-002 en `registrarAplicaciones` (RN-060/T-002)

| Evidencia | Valor |
|---|---|
| Test enfocado | `DATABASE_URL=...ganaweb_smoke211 DB_SMOKE=true pnpm --filter @ganaweb/db exec vitest run tests/sanidad-postgres.test.ts` → **17/17 passed** (baseline 12 + 3 nuevos #211 + 2 de U2) |
| RED | N>1: `expected +0 to be 3` (sin filas outbox); N=1: `expected [] to have a length of 1 but got +0` |
| Runtime harness | Smoke PG real (BD recién migrada): cabecera `total_animales=2` + 2 hijas + 3 filas outbox (INSERT, `dispositivo_id="server"`, `aplicado_en` null, payloads camelCase con ids coincidentes); FK inexistente → conflicto sin filas ni outbox |
| Rollback | Revertir el bloque outbox de `registrarAplicaciones` en `sanidad-infrastructure.ts` + el campo `fincaId` del puerto/caso de uso; #208/#210 intactos |

TDD: 1.1 RED (3 tests nuevos) → 1.2 GREEN (adapter + puerto + caso de uso + fakes) → REFACTOR (payload construido desde `filasNuevas` sin index-access; typecheck limpio). 1.3: gap de `anularRegistroGrupal` documentado en el docblock del método (sin outbox; el MVP de sync decide).

### Unit 2 — Lectura EN_FINCA a la fecha (SAN-043)

| Evidencia | Valor |
|---|---|
| Test enfocado | Idem U1 (misma suite) → 17/17; `pnpm --filter @ganaweb/aplicacion exec vitest run` → **150/150 passed** |
| RED | `adaptador.listarAnimalesEnFinca is not a function` |
| Runtime harness | Smoke PG real: a 2026-08-01 excluye vendido 2026-07-01 y muerto 2026-07-15, incluye vendido 2026-08-20; a 2026-06-15 lista los 5; fila `{id, codigo, nombre}` exacta; animal de otra finca nunca aparece |
| Rollback | Borrar `listarAnimalesEnFinca` del puerto/adaptador y el export de `AnimalSanidadListado` |

TDD: 2.1 RED (2 tests) → 2.2 GREEN (helper compartido `fechasSalidaPorAnimal` extraído de `obtenerAnimales`; filtro vía `evaluarAnimalEnFinca` del dominio) → REFACTOR limpio (safety net `obtenerAnimales` sigue verde).

### Unit 3 — Server functions RBAC registrar + animales (PE-002/SAN-063)

| Evidencia | Valor |
|---|---|
| Test enfocado | `pnpm exec tsx tests/sanidad-registro-contract.test.ts` (apps/web) → **sanidad-registro-contract: OK** (4 grupos: sin sesión/finca, permiso denegado, unión mapeada, listado gateado) |
| RED | `ERR_MODULE_NOT_FOUND` — `sanidad-registro.server.js` no existía al escribir el contract test |
| Runtime harness | Harness con puertos falsos y sesión inyectada (patrón `sanidad-almacen-contract.test.ts`): `no_autenticado`/`finca_no_autorizada`/`permiso_denegado` sin tocar escritura; happy path N=2 → `aplicado` con `registroGrupalId` no nulo, `refuerzosAutoCompletados=["app-previa-1"]` (RN-042), `stockDisponible=146` (150 − 2×2), `precioDosisSnapshot=3500`; escritura recibe `fincaId`/`usuarioCreadoPor` de la sesión; `validacion` (fecha futura RN-002), `conflicto` y `error` 1:1; `listarAnimales` gatea por `sanidad:ver` y pasa `(fincaId, fecha)` al puerto |
| Rollback | Borrar `sanidad-registro.server.ts`/`sanidad-registro.ts` + la entrada del script `test` de apps/web |

TDD: 3.1 RED (contract tsx) → 3.2/3.3 GREEN (harness + módulo público bundleable con lazy import) → REFACTOR: formato biome; typecheck web vía turbo (7/7 tasks) porque `@ganaweb/ui` requiere `dist` construido.

## Desviaciones

- Ninguna frente a tasks.md hasta aquí. Nota: el focused test de U3 en tasks.md dice `pnpm vitest run apps/web -t sanidad-registro`, pero el patrón establecido de contract tests del proyecto es tsx + `node:assert/strict` (como `sanidad-almacen-contract.test.ts`); se seguirá el patrón tsx y se registrará en el script `test` de apps/web.

## Tareas pendientes

- ~~Phase 3 (U3)~~: server functions RBAC registrar + animales — **completada en commit 64ce670**.
- ~~Phase 4 (U4)~~: FormularioVacuna — fecha, defaults, indicador offline, precarga animales — **completada en commit 84c7600**.
- ~~Phase 5 (U5)~~: cableado de ruta + precarga producto/animales — **completada en commit 11f0e20** + 4ff7841 (contract test) + 26f1df1 (biome format).
- Phase 6: verificación final.

## Continuación (post-interrupción)

Sesión reanudada tras corte de conexión con 2 commits previos (9e0f2e3 outbox+EN_FINCA, 64ce670 server functions). El orquestador confirmó HEAD = 64ce670 y working tree limpio; 8/17 checkboxes marcados en tasks.md (Phase 1–3 hechas). Esta continuación ejecuta las fases 4, 5 y 6.

### Decisiones durante U4–U5

6. **`useEffect` en `seleccion` (paquete UI)**: el state lazy initializer de `seleccion` sólo corre en el mount; al actualizar `animales` (drawer SAN-043) la selección quedaba en `Set([])`. Se añadió un `useEffect([animales, animalesIdsIniciales])` que re-deriva la selección: con precarga filtra contra los animales cargados (ignora ids fantasma); sin precarga auto-selecciona todos. Cubre el patrón UX de "abrir sin precarga = todos los animales EN_FINCA a la fecha".
7. **`erroresServidor` prop aditivo en `FormularioVacuna`**: la spec del CM-042 (registro de aplicación) requiere que `validacion` mapee errores por campo. El handler no los recibía porque el `onGuardar: Promise<void>` no retornaba errores. Se añadió la prop `erroresServidor?: Record<string, string>` y un `role="alert"` sobre el footer con la concatenación de los detalles. La ruta hace el `Object.fromEntries(errores.map((e) => [e.campo, e.detalle]))`; el caso de uso ya devuelve `{ campo, detalle }[]` (RN-002).
8. **Mapeo del union `RegistrarAplicacionServerResult`** (`apps/web/src/routes/.../sanidad.tsx`): la unión del harness RBAC y del caso de uso divergen en el shape de `permiso_denegado` (uno trae `permiso`, otro trae `detalle`). Se extrajo un helper `erroresAplicacionDe(resultado)` para reducir la complejidad cognitiva de 18 → ≤15 (límite biome) y para hacer el mapeo testeable.
9. **Sincronía de `dist/` (`@ganaweb/ui`)**: el import del consumer (`apps/web`) lee el `dist/index.d.ts`. Cualquier cambio en `panel-sanidad.tsx` o `formulario-vacuna.tsx` requiere `pnpm --filter @ganaweb/ui build` antes del `tsc --noEmit` del consumer (la lección del PR #238). Documentado en este apply-progress para próximas sesiones.

### Evidencia por work unit (U4 + U5)

#### Unit 4 — FormularioVacuna: campo fecha, dosis, offline, precarga (84c7600)

| Evidencia | Valor |
|---|---|
| Test enfocado | `pnpm --filter @ganaweb/ui exec vitest run tests/formulario-vacuna.test.tsx` → **15/15 passed** (3 existentes SAN-003 + 12 nuevos #211: 4 fecha, 3 dosis, 2 offline, 3 precarga) |
| RED inicial | 8 tests fallidos: falta de `getByLabelText("Fecha")`, falta de `getByRole("alert")`, falta de `getByText(/offline/)`, falta de `getByRole("button", { name: /Guardar 1 registro/ })` para `animalesIdsIniciales` |
| Runtime harness | N/A — componente jsdom; cobertura por el contrato del Form (fecha local hoy, validación RN-002, SAN-043 advertencia, SAN-041 default dosis, SAN-044 `navigator.onLine=false`, SAN-011 prop aditiva) |
| Rollback | Revertir props aditivas (`animalesIdsIniciales`, `erroresServidor`) + estado de fecha/offline/selección de `formulario-vacuna.tsx`; tests quedan en RED |

TDD: 4.1 RED (8 nuevos) → 4.2 GREEN (cambios aditivos: `useState`/`useEffect`/`useMemo` para fecha + dosis + online + auto-selección) → REFACTOR: biome format, typecheck limpio, sin cambios funcionales.

#### Unit 5 — Cableado de ruta y precarga producto/animales (11f0e20 + 4ff7841)

| Evidencia | Valor |
|---|---|
| Test enfocado | `pnpm --filter @ganaweb/web exec vitest run tests/sanidad-panel-route.test.tsx` → **12/12 passed** (8 previos + 4 nuevos #211: SAN-043, SAN-047, CM-042/RN-002, SAN-011) |
| Test contrato | `pnpm exec tsx tests/sanidad-registro-contract.test.ts` → **sanidad-registro-contract: OK** (4ff7841 actualizó `sanidad-panel-contract.test.ts` para incluir `animalIds: ['animal-1']` en la salida de `agruparRefuerzosPorSemana`) |
| RED inicial | 4 tests fallidos: spy `listarAnimalesSanidadFn` no llamado (drawer sin `onOpenChange` que dispare), `Guardar 2 registros` ausente (animales no se propagan al state `seleccion`), `permiso_denegado` tipo no encontrado (unión divergente con `detalle` vs `permiso`) |
| Runtime harness | N/A — ruta jsdom + mocks `vi.mock("../src/server/sanidad-registro.js")`; el contrato de la server function ya está cubierto por `sanidad-registro-contract.test.ts` (harness + fakes + sesión inyectada) |
| Rollback | Revertir `sanidad.tsx` (route) al placeholder SAN-047 + revertir `panel-sanidad.tsx` al callback `(productoId) => void` + revertir `sanidad.ts:RefuerzoPendienteAgrupado` quitando `animalIds`; #208/#210 intactos |

TDD: 5.1 RED (4 tests) → 5.2 GREEN (route: `abrirRegistroAplicacion(productoId, animalIds)`, `cargarAnimalesDrawer(fecha)`, `guardarAplicacion` con `erroresAplicacionDe()`) + 5.3 GREEN (dominio `RefuerzoPendienteAgrupado.animalIds` + UI `onRegistrarAplicacion(productoId, animalIds)`) → REFACTOR: biome `noExcessiveCognitiveComplexity` con helper, biome format, typecheck limpio.

### Resultados de los gates (Phase 6.1)

- `pnpm turbo test --force` con `DATABASE_URL=...ganaweb_smoke211 DB_SMOKE=true`: 11/13 tasks turbo. **Fallos preexistentes no relacionados con #211** en `@ganaweb/db`: `animal-ficha-postgres.test.ts` y `animal-timeline-postgres.test.ts` fallan con `ck_registros_grupales_auditoria` (constraint de auditoría no migrada en la BD scratch `ganaweb_smoke211` — confirmado en `6c5323d` HEAD). Los tests de #211 en `sanidad-postgres.test.ts` y `sanidad-panel-postgres.test.ts` pasan **34/34** en la BD scratch. Aplicación (`@ganaweb/aplicacion`): 150/150. UI (`@ganaweb/ui`): 654/654. Web (`@ganaweb/web`): 429/429.
- `pnpm turbo typecheck --force`: **13/13 tasks** verde.
- `pnpm exec biome ci .`: 426 files, 0 errores (formato aplicado en commit 26f1df1).
- `pnpm turbo build --force`: **7/7 tasks** verde. El gate de import-protection (lección del PR #238) no detectó `.server.*` en el bundle del cliente.
- `pnpm no-sqlite`: verde, sin referencias a drivers SQLite en el código.

### Mapa §13 (Phase 6.2)

- Item 3 (cabecera + `total_animales` = hijas): cubierto por test 1.1 (commit 9e0f2e3).
- Item 8 (escritura + outbox atómicos): cubierto por test 1.1 (commit 9e0f2e3).
- Item 8 (indicador offline — semántica UI): cubierto por test 4.1 (commit 84c7600, SAN-044). El flujo completo sin señal→reconexión queda diferido al MVP de sync (decisión D1).
- Item 9 (`refuerzosAutoCompletados` del caso de uso #208): cubierto por test 3.1 (commit 64ce670).
- Item 11 (contrato de precarga): cubierto por test 5.1 (commit 11f0e20, SAN-011 + 4ff7841 contract test). El flujo completo de 2 taps desde la card de Refuerzo se verifica en #213.
