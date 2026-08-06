```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:11c04c505433f619f21d40e7b086df35a42e9a798c88451f161f7469948b258e
verdict: pass
blockers: 0
critical_findings: 0
requirements: 8/8
scenarios: 4/4
test_command: pnpm turbo test --force
test_exit_code: 0
test_output_hash: sha256:1396172796149fb1baf752903bb9253e212769c1cdd2616a31c8f925c70e6049
build_command: pnpm turbo typecheck --force
build_exit_code: 0
build_output_hash: sha256:6e6a36425ccbe6d1267cedc69fce81edbd7ec22ba35babb98fc30e6c382dc166
```

## Verification Report

**Change**: `issue-209-catalogo-productos` (issue #209 — Sanidad: catálogo de productos sanitarios, CRUD server + UI)
**Version**: RF-SANIDAD v0.2 (`requisito_sanidad.md` §2/§6/§11/§13)
**Mode**: Standard (sin config/runner de Strict TDD; la evidencia RED→GREEN de `apply-progress.md` se revisó como insumo suplementario)
**Worktree**: `/home/lrodriguezn/ganaweb-worktrees/issue-209-sanidad-catalogo` · rama `feat/issue-209-sanidad-catalogo`
**Verificación independiente**: ejecución fresca (`--force`, 0 caché) + lectura integral de implementación y tests.

### Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 12 |
| Tasks complete | 12 |
| Tasks incomplete | 0 |

Tareas 1.1–1.5, 2.1–2.2, 3.1–3.2, 4.1–4.2, 5.1 de `tasks.md`: todas marcadas y respaldadas por commits `fb51869`, `0d67825`, `0a47483`, `0264ee6`, `d88e381`, `3408494`.

### Build & Tests Execution

**Build (typecheck)**: ✅ Passed
```text
pnpm turbo typecheck --force → Tasks: 13 successful, 13 total · Cached: 0 cached · exit 0
```

**Tests**: ✅ 1492 passed / 0 failed / ⚠️ 36 skipped (smoke Postgres `DB_SMOKE`, runners indisponibles en el entorno)
```text
pnpm turbo test --force → Tasks: 13 successful, 13 total · Cached: 0 cached · exit 0
  @ganaweb/dominio:     168 passed (7 archivos)
  @ganaweb/aplicacion:  141 passed (18 archivos)
  @ganaweb/db:          178 passed | 36 skipped (21 archivos + 5 skipped)
  @ganaweb/ui:          590 passed (22 archivos)
  @ganaweb/web:         415 passed (22 archivos), incluye sanidad-catalogo-actions.test.ts 14/14
```

**Lint**: ✅ `pnpm exec biome ci .` → 398 archivos, 0 errores, 0 warnings, exit 0.

**Dependencias**: ✅ `pnpm exec dependency-cruiser .` → 0 errores, 252 warnings, exit 0. Los 5 warnings de archivos nuevos (`sanidad-catalogo-actions.server.ts` → sesión/fixtures E2E; test → server) replican el perfil ya establecido de `configuracion-actions.server.ts` (verificado contra la salida de depcruise).

**Coverage**: ➖ No disponible (el repo no tiene comando de cobertura configurado).

### Spec Compliance Matrix

Requisitos del alcance (issue #209 + `requisito_sanidad.md`):

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| SAN-020 (validación CM-026, campos, `{campo, detalle}`) | trim, requeridos, sin HTML, errores múltiples | `packages/dominio/tests/producto-sanitario.test.ts > SAN-020:*` (5 tests) · `packages/ui/tests/catalogo-productos-sanitarios.test.tsx > FormularioProductoSanitario` (4 tests) · `apps/web/src/server/sanidad-catalogo-actions.test.ts > la validación de dominio atraviesa el harness 1:1` | ✅ COMPLIANT |
| SAN-021 (inactivar/reactivar; inactivo fuera de selects, visible en históricos) | única baja, filtro soloActivos, confirmación | `packages/aplicacion/tests/catalogo-producto-sanitario-use-cases.test.ts > SAN-021:*` (3 tests) · `packages/db/tests/...test.ts > SAN-021: soloActivos agrega el filtro activo=1` · `packages/ui/tests/...test.tsx > SAN-021:*` (2 tests) | ✅ COMPLIANT |
| SAN-022 (fila con stock RN-041 + semáforo KPI-10) | stock calculado + semáforo en desktop y mobile | `packages/ui/tests/...test.tsx > cada fila muestra el stock calculado y el semáforo KPI-10` · `... > la card mobile muestra stock + semáforo` · `packages/aplicacion/tests/...test.ts > listarCatalogoProductoSanitario` (4 tests) | ✅ COMPLIANT |
| SAN-023 (duplicado codigo activo+finca, case-insensitive) | validación de dominio + backstop UNIQUE | `packages/dominio/tests/producto-sanitario.test.ts > SAN-023: duplicado entre activos...` · `packages/aplicacion/tests/...test.ts > SAN-023:*` (2 tests) · `packages/db/tests/...test.ts > SAN-023:*` (2 tests) | ✅ COMPLIANT |
| SAN-024 (módulo propio, no maestro feature-004; reuso IA-003) | componentes en packages/ui reutilizando primitivas | Inspección: `catalogo-productos-sanitarios.tsx` y `formulario-producto-sanitario.tsx` usan `Button`, `Input`, `Label`, `Select`, `AlertDialog`, `EstadoBadge`, `tienePermiso` existentes; exports aditivos; sin maestro CM nuevo | ✅ COMPLIANT |
| SAN-060 (permisos del módulo, sin acciones nuevas) | ver/crear/editar/anular; estado vía anular | `apps/web/src/server/sanidad-catalogo-actions.test.ts > SAN-060: cambiarEstado exige sanidad:anular` · `denySanidadAccess` (5 tests) | ✅ COMPLIANT |
| SAN-061 / PE-001 (decisión por permiso, no rol) | gating UI y server por permiso | `apps/web/src/server/sanidad-catalogo-actions.test.ts > PE-001/SAN-061: decide por permiso, no por rol` · `packages/ui/tests/...test.tsx > PE-001:*` (2 tests) | ✅ COMPLIANT |
| SAN-063 / PE-002 (revalidar sesión+finca en servidor; fincaId no confiable) | finca del input ≠ finca activa → denegación | `apps/web/src/server/sanidad-catalogo-actions.test.ts > SAN-063: finca del input distinta...` + denegaciones por acción sin tocar el puerto | ✅ COMPLIANT |

**Compliance summary**: 8/8 requisitos cumplidos.

Criterios de aceptación del issue (§13 items 5, 6, 10, 13):

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| §13.5 (stock por cálculo; umbral de config_parametros_finca, nunca hardcodeado) | umbral 15 por puerto cambia el semáforo; sin parámetro → fallback 20; adaptador lee la tabla en runtime | `packages/aplicacion/tests/...test.ts > T-001: el semáforo usa el umbral del puerto (15)` · `> T-001: finca sin parámetro → fallback` · `packages/db/tests/...test.ts > T-001: lee stock_minimo_dosis de config_parametros_finca` (+ null y valor corrupto) | ✅ COMPLIANT |
| §13.6 (referenciado no se elimina; inactivo fuera de selects, sigue en históricos) | cambiarEstado única baja; puerto sin eliminar; UI sin botón eliminar; copy de históricos | `packages/aplicacion/tests/...test.ts > CM-024/RN-050 ("eliminar" in port === false)` · `packages/db/tests/...test.ts > SAN-021/RN-050: cambiarEstado sólo escribe activo + updated_at` · `packages/ui/tests/...test.tsx > RN-050:*` (desktop y mobile) | ✅ COMPLIANT |
| §13.10 (server functions rechazan sin permiso aun invocadas directamente; revalidan finca; UI gatea por permiso) | 4 acciones × {sin sesión, finca ajena, sin permiso} → denegación como valor, sin tocar puerto | `apps/web/src/server/sanidad-catalogo-actions.test.ts` (14/14) — denegaciones de `denySanidadAccess` y del harness con `getSession` stub | ✅ COMPLIANT |
| §13.13 (enum inválido rechazado con `{campo, detalle}`) | `tipo_tratamiento: "antiparasitario"` → error exacto | `packages/dominio/tests/producto-sanitario.test.ts > §13.13: enum inválido rechazado con error { campo, detalle } vía validarTipoTratamiento` | ✅ COMPLIANT |

**Compliance summary**: 4/4 escenarios cumplidos.

### Correctness (Static Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| SAN-020 validación dominio | ✅ Implemented | `packages/dominio/src/producto-sanitario.ts` — trim, HTML, rangos por precisión del esquema v3 (NUMERIC 10,2 / 14,2), default `no_reproductivo` del esquema |
| SAN-021 ciclo de vida | ✅ Implemented | Puerto sin operación de borrado; `cambiarEstado` única baja; `soloActivos` para selects de captura |
| SAN-022 stock + semáforo | ✅ Implemented | `listar-catalogo-producto-sanitario.ts` lee umbral por puerto (`Promise.all`), aplica `estadoStockSanidad` (KPI-10: agotado ≤ 0, bajo < umbral, ok — verificado en `dominio/src/sanidad.ts:269`) |
| SAN-023 unicidad | ✅ Implemented | Dominio case-insensitive sobre activos + traducción del UNIQUE `uq_productos_sanitarios_finca_codigo` a `conflicto` |
| RN-041 stock calculado | ✅ Implemented | Adaptador une `inventario_sanitario` (migración 0007, `pgView(...).existing()`); null → 0; sin campo mutable |
| T-001 umbral runtime | ✅ Implemented | `obtenerStockMinimoDosis` lee `config_parametros_finca` (finca_id + codigo `stock_minimo_dosis` + activo=1); null/valor corrupto → null; fallback 20 sólo en el caso de uso (valor respaldado por seed `packages/db/src/seed/seed.ts:273`) |
| PE-002 RBAC server | ✅ Implemented | `denySanidadAccess`: sesión → finca activa === fincaId → permiso; denegaciones como valores serializables; harness único surface invocable (sin referencias fuera de su test) |
| IA-002 esquema manda | ✅ Implemented | Insert sin `usuario_creado_por` (asertado explícitamente en el test del adaptador) |

### Coherence (Design)

No existe artefacto de diseño formal en el change; la coherencia se evaluó contra `tasks.md`, `apply-progress.md` y los patrones citados del requisito.

| Decision | Followed? | Notes |
|----------|-----------|-------|
| Capas §11 (dominio puro, aplicación revalida scope, db adaptador, web orquesta) | ✅ Yes | Casos de uso sin permisos; RBAC en server functions; adaptador type-only respecto de aplicación |
| Uniones serializables CM-042 | ✅ Yes | Todas las salidas discriminadas por `tipo`, sin excepciones |
| Scope primero CM-024 | ✅ Yes | `obtenerPorId` sin filtro finca; casos de uso comparan `fincaId` → `no_encontrado` |
| Reuso UI IA-003 / tokens SAN-080/081 | ✅ Yes | Primitivas existentes; `EstadoBadge` con variantes `exito/alerta/peligro`; 0 ocurrencias de `dark:` en los archivos nuevos |
| Carril #210 | ✅ Yes | `git diff origin/master...HEAD`: sin cambios en `sanidad-infrastructure.ts`, schema o `almacen_entradas`; compartidos sólo aditivos |

### Guardas de scope

| Guarda | Evidencia | Resultado |
|--------|-----------|-----------|
| Sin ruta `/sanidad` creada | `find apps/web/src/routes -iname "*sanidad*"` → sin resultados; el diff no toca `apps/web/src/routes` | ✅ |
| Sin archivos de #210 | `git diff --name-status origin/master...HEAD` → 24 archivos, ninguno de `almacen_entradas` ni `sanidad-infrastructure.ts` | ✅ |
| T-001 en runtime (no sólo default) | Use case `listar-catalogo-producto-sanitario.ts:37-42` invoca `port.obtenerStockMinimoDosis`; adaptador `catalogo-producto-sanitario-infrastructure.ts:215-231` consulta `config_parametros_finca`; tests U2/U1b ejercitan ambos caminos | ✅ |
| Server functions deniegan invocación directa | Harness `createSanidadCatalogoActionHarness` aplica `denySanidadAccess` antes de delegar en las 4 acciones; test con `getSession` stub cubre denegación sin tocar puerto | ✅ |
| Inactivación sin borrado físico | Puerto sin `eliminar` (asertado), adaptador sólo UPDATE de `activo`, UI sin botón eliminar (desktop y mobile) | ✅ |
| Duplicado codigo case-insensitive | Dominio: `trim().toLowerCase()` sobre activos; test `SAN-023` con `"vac-aftosa"` vs `"VAC-AFTOSA"` | ✅ |

### Desviaciones documentadas en apply-progress.md (evaluación)

| # | Desviación / decisión | Veredicto |
|---|----------------------|-----------|
| 1 | Estado del catálogo protegido con `sanidad:anular` (SAN-060 no define `sanidad:inactivar`) | ✅ Aceptable — SAN-060 prohíbe acciones nuevas; documentado en header y testeado |
| 2 | Fallback `STOCK_MINIMO_DOSIS_DEFAULT=20` sólo cuando la finca no tiene el parámetro | ✅ Aceptable — valor igual al seed; runtime siempre lee `config_parametros_finca` |
| 3 | Insert sin `usuario_creado_por` (PE-006 para eventos) | ✅ Aceptable — el esquema v3 manda (IA-002); testeado |
| 4a | Tests en `tests/` (include de vitest) | ✅ Aceptable — convención existente de los paquetes |
| 4b | Formulario en archivo propio | ✅ Aceptable — `tasks.md` 4.2 ya lo nombra |
| 4c | Proyección pura `datosProductoSanitarioDesdeRecord` | ✅ Aceptable — función pura, necesaria por tipado TS |

### Issues Found

**CRITICAL**: None

**WARNING**:
1. **TS-001 — CM-045 sin citar literalmente en tests**: `tasks.md` cita el patrón CM-045 (inactivación), pero ningún test lo nombra; el comportamiento está cubierto y ejercido bajo RN-050/SAN-021 (verificado por lectura). Brecha de trazabilidad de id, no de comportamiento.
2. **Backstop de carrera case-sensitive**: el UNIQUE `uq_productos_sanitarios_finca_codigo` es btree exacto (`0000_initial.sql:832`), así la unicidad case-insensitive (SAN-023) depende del check de dominio sobre `listarCodigosActivos`; entre el check y el insert existe una ventana de carrera donde `"VAC-01"`/`"vac-01"` podrían coexistir. Residual y consistente con el esquema v3 (no modificable sin propuesta), pero no cubierto por test.

**SUGGESTION**:
1. Añadir smoke `DB_SMOKE` del adaptador contra Postgres real cuando haya runners (los 36 skipped actuales dejan el path real de la vista/UNIQUE sin ejecución en este entorno).
2. Considerar un índice único funcional `lower(codigo)` por finca en una futura propuesta de esquema para cerrar la ventana de carrera de SAN-023 en la BD.

### Verdict

**PASS WITH WARNINGS**
Las 4 suites corren verdes sin caché (1492 tests, 0 fallos), los 8 requisitos del alcance y los 4 criterios de aceptación (§13.5/6/10/13) están cubiertos por tests que ejercitan realmente cada regla, y las guardas de scope se cumplen; quedan 2 warnings de trazabilidad/carrera sin impacto funcional.
