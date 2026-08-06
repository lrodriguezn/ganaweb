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

- Phase 3 (U3): server functions RBAC registrar + animales.
- Phase 4 (U4): FormularioVacuna — fecha, defaults, indicador offline, precarga animales.
- Phase 5 (U5): cableado de ruta + precarga producto/animales.
- Phase 6: verificación final.
