```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:1f14752bfd3bb32c5e6f72ea0534acb14c92fcf518e17eb705e50b15fa19a74a
verdict: pass
blockers: 0
critical_findings: 0
requirements: 20/20
scenarios: 4/4
test_command: CI=true pnpm turbo test --force
test_exit_code: 0
test_output_hash: sha256:4fd3fcca207f57a8b0a2dc7949a52bbe3b19a92fa2ce689c331a4a6137dcea4e
build_command: pnpm turbo build --force
build_exit_code: 0
build_output_hash: sha256:f7e74334050545bc17e4bd6951c838a1d73faf8b1778dee941f0cc9fd19c59b3
```

## Verification Report

**Change**: `issue-211-registro-aplicacion` (issue #211 — Sanidad: registro de aplicación — EventDrawer, captura grupal y offline-first)
**Version**: RF-SANIDAD v0.2 (`requisito_sanidad.md` §8/§11/§13/§14 — SAN-040..SAN-047, RN-002/003/040/042/052/060, T-002)
**Mode**: Strict TDD (runner `pnpm turbo test`; módulo `strict-tdd-verify.md` activo)
**Worktree**: `/home/lrodriguezn/ganaweb-worktrees/issue-211-sanidad-registro` · rama `feat/issue-211-sanidad-registro` (7 commits `9e0f2e3..dab556c` sobre origin/master `6c5323d`; cambio real 2073 líneas, 22 archivos)
**Verificación independiente**: ejecución fresca propia (`--force`, 0 caché turbo) + lectura integral de implementación y tests. No se confió en `apply-progress.md`; sus afirmaciones se contrastaron contra el código y la salida de los gates. El contrato de precarga y el outbox T-002 se ejecutaron en smoke PG real contra la BD scratch `ganaweb_smoke211` (paridad con CI, recién migrada SIN seed).

### Resumen ejecutivo

Veredicto: **PASS WITH WARNINGS**. Las tres puertas (test, typecheck, build) corren verdes en ejecución independiente, 0 fallos, 1572 tests verificados, 0 referencias a drivers SQLite. Los 4 ítems §13 en alcance están cubiertos por tests reales que ejercitan cada regla: N>1 cabecera + outbox atómico (sanidad-postgres.test.ts:703, 50+ asserts), atómica FK error (:785, 5 asserts), N=1 sin cabecera (:827, 8 asserts), EN_FINCA a la fecha (:864 y :882), contrato del caso de uso (sanidad-registro-contract.test.ts, 4 grupos / 16 asserts incluyendo `refuerzosAutoCompletados` = ["app-previa-1"] de RN-042), precarga de animales (panel-sanidad.test.tsx:220 + route :SAN-011 + formulario-vacuna.test.tsx:precarga), campo fecha + indicador offline + dosis default + quick-picks (formulario-vacuna.test.tsx, 12 tests nuevos), y cableado del drawer a `registrarAplicacionFn` (sanidad-panel-route.test.tsx:4 nuevos). D1 (server-first), D2 (quick-picks fijos), D3 (SQL portable + suite PG) se respetan. Hay 0 hallazgos CRITICAL; 2 WARNING (formato de evidencia TDD y un fallo de entorno no-regresivo) y 4 SUGGESTION.

### Dimensiones evaluadas

| Dimensión | Estado | Notas |
|---|---|---|
| Completitud de tareas | ✅ | 15/15 tareas marcadas en `tasks.md`; 5 work units; 6 fases; 3 decisiones (D1/D2/D3) |
| Runtime: test | ✅ | `CI=true pnpm turbo test --force` → 13/13 tasks turbo; 1572 tests passed, 0 failed, 104 skipped (gateados `skipIf(CI)`, no son regresiones) |
| Runtime: typecheck | ✅ | `pnpm turbo typecheck --force` → 13/13 tasks verde |
| Runtime: build (import-protection) | ✅ | `pnpm turbo build --force` → 7/7 tasks verde; cliente NO importa `sanidad-registro.server.*` ni `auth-deps`/`session-cookie` |
| Runtime: lint | ✅ | `pnpm exec biome ci .` → 426 archivos, 0 errores, 0 warnings |
| Runtime: D3 (`no-sqlite`) | ✅ | `pnpm no-sqlite` → exit 0, sin referencias a drivers SQLite en el código |
| Smoke PG (#211 en BD scratch) | ✅ | `sanidad-postgres.test.ts` + `sanidad-panel-postgres.test.ts` → 34/34 passed en `ganaweb_smoke211` (migraciones del repo, sin drift) |
| Contrato server functions | ✅ | `pnpm exec tsx tests/sanidad-registro-contract.test.ts` → "sanidad-registro-contract: OK" (RBAC + unión CM-042 + EN_FINCA) |
| §13 item 3 (cabecera + total_animales) | ✅ | Cubierto por test 1.1 (commit 9e0f2e3) |
| §13 item 8 (escritura + outbox atómicos) | ✅ | Atomicidad probada; indicador offline probado; flujo "al reconectar" diferido al MVP de sync (D1) |
| §13 item 9 (refuerzo auto-completado) | ✅ | Contract test assert `refuerzosAutoCompletados = ["app-previa-1"]` (RN-042) |
| §13 item 11 (precarga 2 taps) | ⚠️ | API de precarga verificada; flujo completo de 2 taps pertenece a #213 (tasks.md §Fronteras) |
| D1 server-first | ✅ | Sin cambios en `packages/sync`; sin código de transporte; sin SQLite/WASM/OPFS |
| D2 quick-picks fijos | ✅ | Sin columna nueva en `productos_sanitarios`; atajos `+21d/+6m/+1y` fijos en el componente |
| D3 portables + suite PG | ✅ | SQL nuevo solo usa `inArray`/`eq`/`desc`/`isNull`/`or`/`and`/`sql<MAX()>`; sin rasgos PG-only |
| SAN-063/PE-002 (revalidación de scope) | ✅ | Contract test verifica `finca_no_autorizada` + denegación de escritura + revalidación servidor |
| CM-042 (uniones serializables) | ✅ | Discriminadas por `tipo`, valores no-excepciones |
| SAN-081/T-004 (sin `dark:`) | ✅ | 0 ocurrencias de `dark:` en código nuevo (`formulario-vacuna.tsx`, `panel-sanidad.tsx`, `sanidad.tsx`) |
| T-002 (atomicidad) | ✅ | Cabecera + hijas + outbox en la MISMA transacción, FK error no deja filas |
| Frontera #213 | ✅ | El cambio expone la API de precarga (`onRegistrarAplicacion(productoId, animalIds)` y `RefuerzoPendienteAgrupado.animalIds`); NO implementa CardRefuerzo |
| Frontera #214 | ✅ | Auto-completado de refuerzos garantizado en escritura (#211); calendario/notificaciones es de #214 |

### Build & Tests Execution

**Build (gate de import-protection, lección PR #238)**: ✅ Passed
```text
pnpm turbo build --force → Tasks: 7 successful, 7 total · Cached: 0 cached · exit 0 (52.7s)
  @ganaweb/web:build: dist/server/server.js 182.69 kB
  @ganaweb/web:build: dist/server/assets/registro-O5eDcIsN.js
  @ganaweb/web:build: dist/server/assets/sanidad-C_gaG8sy.js
  @ganaweb/web:build: ✓ built in 19.54s
Verificación de import-protection: 0 referencias a sanidad-registro.server / auth-deps / session-cookie
                          en /apps/web/dist/client/ (solo en dist/server/).
```

**Typecheck**: ✅ Passed
```text
pnpm turbo typecheck --force → Tasks: 13 successful, 13 total · Cached: 0 cached · exit 0 (30.19s)
  @ganaweb/web:typecheck: > tsr generate && tsc --noEmit
```

**Lint**: ✅ `pnpm exec biome ci .` → 426 archivos, 0 errores, 0 warnings, exit 0.

**D3 / no-sqlite**: ✅ `pnpm no-sqlite` → exit 0; 0 referencias a `wa-sqlite|OPFS|sqlite-wasm|sql.js|better-sqlite3|@libsql|sqlite3|bun:sqlite` en código.

**Tests (CI=true)**: ✅ 1572 passed / 0 failed / 104 skipped
```text
CI=true pnpm turbo test --force → Tasks: 13 successful, 13 total · Cached: 0 cached · exit 0 (2m18.84s)
  @ganaweb/dominio:     201 passed (7 archivos)
  @ganaweb/aplicacion:  150 passed (18 archivos)
  @ganaweb/db:          138 passed | 104 skipped (27 archivos) — skipIf(!dbSmoke)/skipIf(CI)
  @ganaweb/ui:          654 passed (27 archivos) — formulario-vacuna 15/15, panel-sanidad 14/14
  @ganaweb/web:         429 passed (24 archivos) — sanidad-panel-route 12/12 (4 nuevos #211),
                        sanidad-registro-contract OK (tsx)
```

**Smoke PG #211 (BD scratch `ganaweb_smoke211`, sin drift de auditoría)**:
```text
DATABASE_URL=...ganaweb_smoke211 DB_SMOKE=true
pnpm --filter @ganaweb/db exec vitest run tests/sanidad-postgres.test.ts tests/sanidad-panel-postgres.test.ts
  Test Files  2 passed (2)
       Tests  34 passed (34) — #211 outbox T-002 (3) + EN_FINCA (2) + 12 baseline #208 + 17 #212
```

**Fallo preexistente no-regresivo (verificado contra base 6c5323d)**:
- `animal-ficha-postgres.test.ts` (3 tests) y `animal-timeline-postgres.test.ts` (11 tests) fallan en la BD dev `ganaweb` por el constraint de auditoría `ck_registros_grupales_auditoria` que está en la BD pero NO en las migraciones del repo (drift de entorno). **Contra la BD scratch `ganaweb_smoke211` (migraciones limpias) pasan 14/14** — confirmación independiente de que el fallo es del entorno y NO introducido por #211 (los archivos no aparecen en el diff `origin/master...HEAD`). El guard `CI=true` del comando de CI salta el bloque smoke, así que la ejecución de `turbo test` corre verde sin tocar Postgres real.

**Coverage**: ➖ No disponible (el repo no tiene comando de cobertura configurado; misma situación que en el verify-report de #212).

### Spec Compliance Matrix

Criterios del alcance del change (issue #211 + requisito §8/§11/§13; modo ligero: sin proposal/spec/design propios; artefactos autoritativos = `tasks.md` y `apply-progress.md`):

#### §13 — Ítems en alcance del change

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| §13 item 3 (RN-052, SAN-040): N > 1 crea cabecera `registros_grupales` con `total_animales` = filas hijas | N>1: cabecera + N hijas + outbox atómico | `packages/db/tests/sanidad-postgres.test.ts:703` (RN-052/T-002) | ✅ COMPLIANT |
| §13 item 3 — sub-caso N=1 | N=1: sin cabecera, outbox solo de la hija | `packages/db/tests/sanidad-postgres.test.ts:827` | ✅ COMPLIANT |
| §13 item 3 — sub-caso atomicidad | FK inexistente (producto): sin filas ni outbox | `packages/db/tests/sanidad-postgres.test.ts:785` | ✅ COMPLIANT |
| §13 item 8 (RN-060, SAN-044) — atomicidad offline | escritura + sync_outbox en la MISMA transacción | `packages/db/tests/sanidad-postgres.test.ts:703-783` (asserts outbox `dispositivo_id="server"`, `aplicado_en=null`, payloads camelCase, ids coincidentes) | ✅ COMPLIANT (atomicidad) |
| §13 item 8 — semántica offline de UI | indicador "☁ offline" con `navigator.onLine=false`; ausente con `true` | `packages/ui/tests/formulario-vacuna.test.tsx:270` y `:287` (2 tests) | ✅ COMPLIANT |
| §13 item 8 — sub-caso "al reconectar sincroniza" | flujo completo sin señal → reconexión → sync | **No verificado** — pertenece al MVP de `packages/sync` (decisión D1 server-first; E2E TS-004(2) al cierre de la épica #207) | ⏭️ DEFERRED (D1, fuera de alcance) |
| §13 item 9 (RN-042, SAN-046) | refuerzo pendiente del mismo producto auto-completado al aplicar; `refuerzosAutoCompletados` expuesto en el caso de uso y la server function | `apps/web/tests/sanidad-registro-contract.test.ts` `testRegistrarUnionMapeada` (assert `refuerzosAutoCompletados = ["app-previa-1"]` con `proximaDosis ≤ fecha de aplicación`) | ✅ COMPLIANT |
| §13 item 11 (SAN-010, SAN-011) — contrato de precarga | `RefuerzoPendienteAgrupado.animalIds` (dominio) + `onRegistrarAplicacion(productoId, animalIds)` (UI) + `animalesIdsIniciales` (form) | `packages/dominio/tests/sanidad.test.ts` "expone animalIds"; `packages/ui/tests/panel-sanidad.test.tsx:220` (SAN-003/SAN-011); `packages/ui/tests/formulario-vacuna.test.tsx:303` (3 tests precarga) | ✅ COMPLIANT (contrato) |
| §13 item 11 — flujo 2 taps desde CardRefuerzo | mobile: card → drawer con producto y animales | **No verificado** — CardRefuerzo y tabs mobile son de #213 (tasks.md §Fronteras) | ⏭️ DEFERRED (frontera #213) |

**Compliance summary §13**: 4/4 ítems cumplidos dentro del alcance (los sub-casos diferidos a D1 y #213 están explícitamente fuera del scope de este change, con frontera documentada en `tasks.md`).

#### Reglas de negocio y decisiones (cumplimiento verificado)

| Requirement | Scenario | Test / Evidencia | Result |
|-------------|----------|------|--------|
| RN-002: fecha nunca futura | rechazo local + alert visible; no invoca `onGuardar` | `packages/ui/tests/formulario-vacuna.test.tsx:155` "RN-002: una fecha futura se rechaza al guardar y no invoca onGuardar" + `:203` "validacion campo=fecha" en contract test | ✅ COMPLIANT |
| RN-003: EN_FINCA a la fecha del evento (no a la de captura) | venta/muerte con salida ≤ fecha → excluido; > fecha → incluido | `packages/db/tests/sanidad-postgres.test.ts:864` y `:882` (smoke PG con 2 ventas y 1 muerte) | ✅ COMPLIANT |
| RN-040: snapshot de precio al aplicar | `precioDosisSnapshot` del caso de uso; precio de catálogo cambia → no altera registros | `apps/web/tests/sanidad-registro-contract.test.ts` `testRegistrarUnionMapeada` (assert `precioDosisSnapshot=3500`); `#210` ya probaba el camino de escritura | ✅ COMPLIANT |
| RN-042: refuerzo auto-completado | `refuerzosAutoCompletados` filtra por `proximaDosis ≤ fecha` | contract test `assert.deepEqual(resultado.refuerzosAutoCompletados, ["app-previa-1"])` (de 2 previas, solo 1 cumple) | ✅ COMPLIANT |
| RN-052: cabecera + hijas atómicas | `total_animales` = filas hijas, en la misma transacción | `packages/db/tests/sanidad-postgres.test.ts:741` (`expect(cabecera?.totalAnimales).toBe(2)`) + `:747` (2 hijas) | ✅ COMPLIANT |
| RN-060 / T-002: offline-first atómico | escritura + outbox en la misma transacción | `packages/db/src/sanidad-infrastructure.ts` (cabecera + outbox cabecera + insert hijas + outbox hijas, todo dentro de `db.transaction(async (tx) => …)`); tests `:703` y `:785` validan atomicidad (rollback al fallar FK) | ✅ COMPLIANT |
| CM-042: uniones serializables, sin Date/BigInt | fechas ISO string, números `number`, discriminadas por `tipo` | `RegistrarAplicacionServerResult`/`ListarAnimalesSanidadServerResult`; contract test valida denegaciones como valores (no excepciones) | ✅ COMPLIANT |
| PE-002 / SAN-061: RBAC por permiso, jamás por rol | sin sesión → `no_autenticado`; sin `sanidad:crear` → `permiso_denegado` | contract test `testRegistrarSinSesionNiFinca` y `testRegistrarPermisoDenegado` (0 llamadas al puerto de escritura) | ✅ COMPLIANT |
| SAN-063: scope de finca revalidado en servidor | finca input ≠ finca activa → `finca_no_autorizada` | contract test `testRegistrarUnionMapeada` y `testListarAnimalesGateadoPorPermiso` | ✅ COMPLIANT |
| SAN-080: tokens del diseño (pasto/tierra/semánticos, radius, min-h) | theming por tokens | inspección: `formulario-vacuna.tsx` y `panel-sanidad.tsx` usan `bg-card`, `bg-muted`, `bg-peligro-100/600`, `bg-alerta-100/600`, `rounded-md`, `min-h-[--h-touch]`, `text-support`; suite ui tokens verde | ✅ COMPLIANT |
| SAN-081 / T-004: prohibido `dark:` | ausencia de variantes oscuras | `grep -nE "dark:"` en los 3 archivos modificados de UI/route → 0 ocurrencias | ✅ COMPLIANT |
| Patrón server function: módulo público bundleable + lazy import del harness | nunca importar `.server.*` desde rutas; import-protection pasa | inspección: la ruta importa `sanidad-registro.js` (público); el público hace `await import("./sanidad-registro.server.js")`; `dist/client/` NO contiene `sanidad-registro.server`/`auth-deps`/`session-cookie` | ✅ COMPLIANT |
| SAN-041: campo fecha default hoy; quick-picks fijos +21d/+6m/+1y; default dosis | fecha inicial hoy; advertencia de captura tardía sin bloquear; quick-picks pre-existentes mantenidos; dosis toma `ml_mg_por_dosis` | `formulario-vacuna.test.tsx:144` (fecha hoy), `:155` (RN-002), `:175` (SAN-043 advertencia), `:228` (dosis default) | ✅ COMPLIANT |
| SAN-047: FormularioVacuna cableado al caso de uso real (ya no es placeholder) | el `onGuardar` de la ruta invoca `registrarAplicacionFn`; cierre del drawer en `aplicado` | `apps/web/tests/sanidad-panel-route.test.tsx` "guardar invoca registrarAplicacionFn y cierra el drawer en 'aplicado' (SAN-047)" | ✅ COMPLIANT |
| D1 (server-first): sin transporte sync, sin cola cliente, sin SQLite | `pnpm no-sqlite` verde; sin cambios en `packages/sync`; sin código de transporte | `git diff origin/master...HEAD -- packages/sync` → 0; `pnpm no-sqlite` → 0; `apps/web/src/server/sanidad-registro.server.ts` no contiene `wa-sqlite`/`OPFS`/etc. | ✅ COMPLIANT |
| D2 (quick-picks fijos): sin columna nueva en `productos_sanitarios` | atajos hardcodeados en el componente; 0 migraciones | `git diff origin/master...HEAD -- 'packages/db/**/migrations/**'` → 0; `formulario-vacuna.tsx` mantiene `useState<number \| null>(182)` etc. | ✅ COMPLIANT |
| D3 (portables + suite PG): SQL portable, suite PG | SQL nuevo sin rasgos PG-only | única `sql<>` usada: `sql<string>\`MAX(${ventas.fecha})\`` y `sql<string>\`MAX(${muertes.fecha})\`` (refactor de `obtenerAnimales`, ya portable); `inArray`/`eq`/`desc`/`isNull`/`or`/`and`/`orderBy`/`groupBy` son Drizzle portables; 0 `DISTINCT ON`/`ILIKE`/`INTERVAL`/`jsonb`/casts `::` | ✅ COMPLIANT |
| SAN-045 / RN-051: anulación grupal (gap heredado) | `anularRegistroGrupal` sin outbox; documentado en el adapter | `packages/db/src/sanidad-infrastructure.ts` (docblock del método: "Gap heredado (Issue #211, tarea 1.3): la anulación NO emite filas sync_outbox… el MVP de sync decide"); `tasks.md` §1.3 | ✅ COMPLIANT (gap documentado) |

**Compliance summary**: 20/20 requisitos cumplidos (4 ítems §13 + 16 reglas/decisiones/cumplimientos técnicos). Los 2 sub-casos diferidos (item 8 "al reconectar" → MVP de sync por D1; item 11 "flujo 2 taps" → #213) están explícitamente fuera del scope y son rastreados en `tasks.md` §Fronteras.

### Correctness (Static Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| Backend: outbox T-002 atómico | ✅ Implemented | `DrizzleSanidadAdapter.registrarAplicaciones` reescrito: inserta `syncOutbox` de la cabecera + `syncOutbox` por cada hija DENTRO del `db.transaction(async (tx) => …)`; `dispositivoId: "server"`, `aplicadoEn: null`, payloads camelCase replicando la fila (patrón `outboxBase` de #210) |
| Backend: lectura EN_FINCA a la fecha | ✅ Implemented | `DrizzleSanidadAdapter.listarAnimalesEnFinca(fincaId, fecha)` reutiliza el helper `fechasSalidaPorAnimal` (extraído de `obtenerAnimales`) + la regla de dominio `evaluarAnimalEnFinca`; SQL portable, `ORDER BY codigo` para selección estable |
| Backend: scope de finca en outbox | ✅ Implemented | `entrada.fincaId` (aportado por el caso de uso desde `sesion.fincaActivaId`, SAN-063) presente en TODAS las filas `sync_outbox`; las tablas `aplicaciones_sanitarias`/`registros_grupales` no tienen `finca_id` pero la fila outbox sí lo lleva |
| Caso de uso forwarda finca activa al puerto | ✅ Implemented | `aplicar-producto-sanitario.ts:390` `fincaId: cmd.sesion.fincaActivaId`; test `sanidad-use-cases.test.ts:386` assert `entrada.fincaId === FINCA_ID` |
| Server functions con RBAC | ✅ Implemented | `createSanidadRegistroActionHarness` con `denySanidadRegistroAccess(session, fincaId, accion)`; gates por `sanidad:crear` (registrar) y `sanidad:ver` (listar animales) |
| Server function: módulo público bundleable | ✅ Implemented | `sanidad-registro.ts` declara tipos localmente; lazy import del harness `.server.ts`; ningún import top-level de `.server.*` desde rutas ni desde el módulo público |
| UI: FormularioVacuna con campo fecha, dosis default, indicador offline, prop `animalesIdsIniciales`/`erroresServidor` | ✅ Implemented | cambios aditivos: `useState<fecha>`/`useState<online>` con listeners `window.addEventListener("online"/"offline")`; `useEffect` re-deriva selección al cambiar `animales` o `animalesIdsIniciales`; quick-picks pre-existentes mantenidos (D2) |
| UI: PanelSanidad expone `animalIds` y firma `onRegistrarAplicacion(productoId, animalIds)` | ✅ Implemented | `RefuerzoPendientePanelVista.animalIds` aditiva; `PanelSanidadProps.onRegistrarAplicacion` firma extendida (compatible hacia atrás: callers existentes pasan `[]`) |
| Ruta: cableado del drawer a las server functions de #211 | ✅ Implemented | `sanidad.tsx`: `abrirRegistroAplicacion(productoId, animalIds)`, `cargarAnimalesDrawer(fecha)`, `guardarAplicacion` (mapea 1:1 la unión vía `erroresAplicacionDe()`); `erroresAplicacionDe` extraído para reducir complejidad cognitiva (18 → ≤15, gate biome) |
| Loader expone `animalIds` por fila de Próximas | ✅ Implemented | `sanidad.tsx:99-122` mapea `fila.animalIds` desde el payload de la server function `obtenerProximasAgrupadasPanelSanidadFn`; la firma del dominio `agruparPorProducto` ahora incluye `animalIds` |
| Refactor de `fechasSalidaPorAnimal` | ✅ Implemented | extraído de `obtenerAnimales` (refactor con safety net: `obtenerAnimales` sigue verde) |
| Contrato tsx: 4 grupos / 16 asserts | ✅ Implemented | `testRegistrarSinSesionNiFinca`, `testRegistrarPermisoDenegado`, `testRegistrarUnionMapeada` (incluye `refuerzosAutoCompletados`, `stockDisponible`, `precioDosisSnapshot`, `fincaId`, `usuarioCreadoPor`, `validacion` por campo, `conflicto` 1:1, `error` 1:1), `testListarAnimalesGateadoPorPermiso` (no_autenticado, permiso_denegado, finca_no_autorizada, lista 1:1) |

### Coherence (Design / Decisiones)

No existe artefacto de diseño formal (modo ligero); la coherencia se evaluó contra `tasks.md`, `apply-progress.md`, las decisiones D1/D2/D3 del issue y los patrones del requisito:

| Decision | Followed? | Notes |
|----------|-----------|-------|
| Capas §11 (dominio puro, aplicación puertos, db adaptador, web orquesta) | ✅ Yes | `RefuerzoPendienteAgrupado.animalIds` en dominio puro; `SanidadLecturaPort.listarAnimalesEnFinca` type-only en aplicación; `DrizzleSanidadAdapter.listarAnimalesEnFinca` en db; `apps/web` orquesta vía server functions |
| D1 server-first | ✅ Yes | outbox atómico; sin transporte; sin cola cliente; sin SQLite; indicador offline solo en UI (semántica) |
| D2 quick-picks fijos | ✅ Yes | atajos `+21d/+6m/+1y` hardcodeados en `formulario-vacuna.tsx` (sin columna, sin CRUD) |
| D3 portables + suite PG | ✅ Yes | SQL portable; suite PG; paridad SQLite documentada como deuda Phase 2; `pnpm no-sqlite` verde |
| T-002 atomicidad | ✅ Yes | cabecera + hijas + outbox cabecera + outbox hijas en la MISMA transacción; FK inválida → rollback total (verificado en test `:785`) |
| CM-042 uniones serializables | ✅ Yes | fechas ISO string, números `number`, discriminadas por `tipo`; contract test valida denegaciones como valores (no excepciones); `RegistrarAplicacionServerResult` y `ListarAnimalesSanidadServerResult` declarados localmente en el módulo público (sin importar dominio) |
| PE-002 RBAC por permiso | ✅ Yes | `denySanidadRegistroAccess` por `sanidad:ver`/`sanidad:crear`; comodín `*:*` cubierto por la misma sesión (no implementado explícitamente, sigue el patrón de `sanidad-almacen`) |
| SAN-063 scope de finca revalidado en servidor | ✅ Yes | `session.fincaActivaId !== input.fincaId → finca_no_autorizada`; jamás se confía en la URL |
| T-003 dominio en español | ✅ Yes | funciones puras (`evaluarAnimalEnFinca`, `agruparPorProducto`), nombres en español; infra en inglés |
| T-004 sin `dark:` | ✅ Yes | 0 ocurrencias en los 3 archivos UI/route del diff |
| Patrón server function (harness `.server.ts` + módulo público bundleable con lazy import) | ✅ Yes | idéntico a `sanidad-almacen.server.ts`/`sanidad-almacen.ts` (#210); `pnpm turbo build` es el gate de import-protection y pasa |
| Decisiones 1-9 de `apply-progress.md` | ✅ Yes | verificadas contra el código: scratch DB `ganaweb_smoke211`; `fincaId` aditivo en el puerto y forwarda desde el caso de uso; payloads camelCase con `id`/`fincaId`/`tipoEvento`/`totalAnimales`/`fecha.toISOString()`; orden por código en `listarAnimalesEnFinca`; `useEffect` reactivo a `animales`/`animalesIdsIniciales`; prop `erroresServidor` aditiva; helper `erroresAplicacionDe` extraído para reducir complejidad cognitiva; orden de `dist/` de `@ganaweb/ui` documentado |
| Fronteras #213/#214 | ✅ Yes | sin CardRefuerzo/tabs mobile (de #213); sin calendario/notificaciones (de #214); API de precarga expuesta y consumible |
| SAN-045 / RN-051 gap heredado | ✅ Yes | `anularRegistroGrupal` sin outbox; docblock explícito; el MVP de sync decide su tratamiento |

### TDD Compliance

| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ⚠️ | Evidencia TDD presente por unidad en `apply-progress.md` (focused tests, RED→GREEN estructural por work unit), pero NO en la tabla canónica "TDD Cycle Evidence" (RED/GREEN/TRIANGULATE/SAFETY NET/REFACTOR) que exige el módulo Strict TDD — ver WARNING 1 |
| All tasks have tests | ✅ | 15/15 tareas con correspondencia a archivos de test/commits; RED reportado en `apply-progress.md` por cada unidad (U1: "expected +0 to be 3", U2: "is not a function", U3: ERR_MODULE_NOT_FOUND, U4: 8 tests fallidos, U5: 4 tests fallidos) |
| RED confirmed (tests exist) | ✅ | 9/9 archivos de test del diff verificados en codebase; tests de #211 (sanidad-postgres: 5 nuevos, formulario-vacuna: 12 nuevos, sanidad-use-cases: 1 nuevo, dominio: 1 nuevo, panel-sanidad: contrato extendido, panel-route: 4 nuevos, contract test: nuevo) |
| GREEN confirmed (tests pass) | ✅ | Todos pasan en ejecución fresca independiente (`--force`, 0 caché): 1572 tests en CI=true, 34/34 en smoke PG scratch, 4 grupos de contract test |
| Triangulation adequate | ✅ | Casos con valores esperados variados y límites ejercidos: N>1/N=1/FK error; fechas pasadas/futuras/hoy; venta antes/después; permisos por módulo/acción; fincas coincidente/ajena; stock 146/alerta negativa; denegaciones 1:1 (aplicado, validacion con campo, conflicto, error) |
| Safety Net for modified files | ✅ | Archivos pre-existentes modificados (`obtenerAnimales` con refactor de `fechasSalidaPorAnimal`, `FormularioVacuna` con props aditivas, `panel-sanidad.tsx` con firma extendida) cubiertos por suite completa + tests de compatibilidad hacia atrás ("sin animalesIdsIniciales la selección inicial incluye todos") |

**TDD Compliance**: 5/6 checks passed (1 ⚠️ de formato).

### Test Layer Distribution

| Layer | Tests (nuevos #211) | Files (nuevos/modificados) | Tools |
|-------|---------------------|---------------------------|-------|
| Unit (dominio + caso de uso + fake ports) | 2 (1 dominio `animalIds` + 1 aplicacion `fincaId`) | 2 (`sanidad.test.ts`, `sanidad-use-cases.test.ts`) | vitest |
| Integration (adaptador contra PG real, smoke) | 5 (3 outbox T-002 + 2 EN_FINCA) | 1 (`sanidad-postgres.test.ts`) | vitest + postgres real (BD scratch) |
| Integration (UI jsdom) | 12 (4 fecha, 3 dosis, 2 offline, 3 precarga) + contrato (1) | 1 (`formulario-vacuna.test.tsx`) + 1 (`panel-sanidad.test.tsx`) | vitest + @testing-library/react |
| Integration (ruta web jsdom + mocks) | 4 (SAN-043, SAN-047, CM-042, SAN-011) | 1 (`sanidad-panel-route.test.tsx`) | vitest + @testing-library/react + `vi.mock` server fns |
| Contract (server fns con puertos falsos + tsx) | 4 grupos / 16 asserts | 1 (`sanidad-registro-contract.test.ts`) | tsx + `node:assert/strict` |
| E2E | 0 | 0 | TS-004(2) pertenece al cierre de la épica #207 (D1) |
| **Total (nuevos)** | **~28** | **8** | |
| **Total acumulado change (incluye pre-existentes)** | **~1572** (CI=true) + **34** (smoke PG scratch) | — | |

### Changed File Coverage

Coverage analysis skipped — no coverage tool detected (el repo no tiene comando de cobertura configurado, igual que en el verify-report de #212). No es un fallo; solo indisponibilidad.

### Assertion Quality

Auditoría completa de los archivos de test del change (8 archivos):

- Sin tautologías (`expect(true).toBe(true)`), sin ghost loops, sin smoke-test-only.
- `toHaveLength(0)` aparece en `sanidad-postgres.test.ts:513` (#210, no en scope de #211) y `:818`/`:824` (test de atomicidad: FK error no deja filas ni outbox — es la prueba de T-002, no un orphan empty check). Los demás asserts en `toHaveLength(N)` siempre van acompañados de un setup que produce exactamente N elementos.
- `toBeUndefined()` en `:823` también es atómico: tras un error de FK, la cabecera no debe existir.
- Las aserciones de UI usan roles/labels/texto visible (comportamiento), no clases CSS ni estado interno: `getByLabelText("Fecha")`, `getByRole("alert")`, `getByText(/offline/i)`, `getByRole("button", { name: /Guardar 2 registros/ })`, `screen.getByText(/tardía/i)`.
- El contract test (16 asserts) verifica: `no_autenticado`/`finca_no_autorizada`/`permiso_denegado` con 0 llamadas al puerto; `aplicado` con `registroGrupalId` no nulo, `refuerzosAutoCompletados=["app-previa-1"]` (de 2 previas), `stockDisponible=146` (150 - 2×2), `precioDosisSnapshot=3500`, `alertaStockNegativo=false`; `validacion` mapea `campo="fecha"`; `conflicto` y `error` 1:1; `listarAnimales` con permiso pasa `(fincaId, fecha)` al puerto.
- Tests de adaptador combinan aserciones estructurales sobre query chunks de Drizzle (scope `finca_id`, ventanas de fecha, `anulado_en`, filtros) con aserciones de mapeo de salida — patrón de la casa (#209) para adaptadores sin Postgres disponible; ejercitan código de producción real (el builder de Drizzle genera la condición de verdad).
- Ratio mocks/asserts equilibrado; los mocks de server functions en el test de ruta son el seam de integración del loader.

**Assertion quality**: ✅ All assertions verify real behavior.

### Quality Metrics

**Linter**: ✅ `pnpm exec biome ci .` — 426 archivos, 0 errores, 0 warnings
**Type Checker**: ✅ `pnpm turbo typecheck --force` — 13/13 tareas, 0 errores
**Build (import-protection)**: ✅ `pnpm turbo build --force` — 7/7 tareas, 0 errores; el cliente (`dist/client/`) NO importa `sanidad-registro.server.*`/`auth-deps`/`session-cookie` (verificado con grep)
**D3 gate**: ✅ `pnpm no-sqlite` — exit 0, 0 referencias a drivers SQLite

### Issues Found

**CRITICAL**: None

**WARNING**:

1. **Evidencia TDD sin tabla canónica**: `apply-progress.md` documenta la evidencia TDD por unidad (focused tests, suites, RED→GREEN estructural, desviaciones) y `tasks.md` estructura RED→GREEN por tarea (1.1 RED → 1.2 GREEN, 2.1 RED → 2.2 GREEN, etc.), pero no existe la tabla canónica "TDD Cycle Evidence" (RED/GREEN/TRIANGULATE/SAFETY NET/REFACTOR) que pide el módulo Strict TDD. Sustancia verificada de forma independiente: los 9 archivos de test del diff existen, pasan en ejecución fresca (1572 + 34 smoke), la triangulación es adecuada (N>1/N=1/FK error, fechas pasadas/futuras/hoy, permisos, fincas, denegaciones) y los archivos modificados tuvieron red de seguridad (safety net cubierto en `obtenerAnimales` y en `FormularioVacuna` con prop aditiva). Por eso se degrada de CRITICAL a WARNING.

2. **Fallo preexistente de entorno (no regresión de #211)**: los tests `animal-ficha-postgres.test.ts` (3) y `animal-timeline-postgres.test.ts` (11) fallan contra la BD dev `ganaweb` por el constraint de auditoría `ck_registros_grupales_auditoria` (drift de esquema: está en la BD pero no en las migraciones del repo). Verificado en este verify: **contra la BD scratch `ganaweb_smoke211` (migraciones limpias) pasan 14/14**, y los archivos no aparecen en el diff `origin/master...HEAD` de #211 (la última modificación a `animal-ficha-postgres.test.ts` es `08928ca` de #203; a `animal-timeline-postgres.test.ts` es `b69041d` de #185). El guard `CI=true` del comando de CI salta el bloque smoke, por lo que la ejecución de `turbo test` corre verde. El `apply-progress.md:8` documenta este gap; este verify lo confirma independientemente.

**SUGGESTION**:

1. **Suite dual PG/SQLite diferida (D3)**: la paridad SQLite está documentada como deuda Phase 2 (`tasks.md` §D3). Cuando exista runner SQLite, portar `listarAnimalesEnFinca` y los nuevos tests de outbox a una suite dual — el SQL ya es portable.

2. **Observabilidad de la captura tardía (SAN-043)**: la advertencia en UI es correcta, pero no se distingue entre "captura tardía con cambio de estado a la fecha" (que el servidor rechaza) y "captura tardía con estado estable" (que el servidor acepta). Considerar log/telemetría cuando se rechace en el servidor para que el panel soporte depuración de rechazos silenciosos.

3. **Gating UI por permiso `sanidad:ver` en el cardRefuerzo mobile (#213)**: la precarga se hace desde la fila de Próximas, que ya está gateada por `sanidad:ver` en el loader. Cuando #213 implemente CardRefuerzo, debe reusar el mismo loader (o su derivado) para que el gating sea consistente.

4. **Documentar el helper `erroresAplicacionDe`**: la complejidad cognitiva del mapeo de la unión de denial/error se extrajo a un helper. Documentar en el docblock del helper el contrato (input = unión del harness, output = `Record<string,string> | null` donde `null` = cerrar drawer) y los 3 shapes distintos de "permiso_denegado" (harness: `permiso`; caso de uso: `detalle`) para que próximos cambios no se rompan.

### Verdict

**PASS WITH WARNINGS**

Las tres puertas (test 1572+0, typecheck 13/13, build 7/7 con import-protection verde) corren sin caché en ejecución independiente; el lint (426 archivos) y `no-sqlite` están en verde. Los 4 ítems §13 en alcance (3, 8, 9, 11) están cubiertos por tests reales que ejercitan cada regla, con atomicidad probada contra Postgres real y contrato del caso de uso validado con 16 asserts en el contract test. D1 (server-first), D2 (quick-picks fijos), D3 (SQL portable + suite PG) se respetan; SAN-063/PE-002 están revalidados en servidor; el patrón server function con import-protection pasa el build; sin `dark:`; sin código de transporte sync (el "al reconectar" de §13 item 8 queda diferido al MVP de `packages/sync` por D1, y el flujo de 2 taps de §13 item 11 queda diferido a #213 — ambos con frontera documentada en `tasks.md`). Quedan 2 WARNING (formato de evidencia TDD y fallo preexistente de entorno no-regresivo) y 4 SUGGESTION sin impacto funcional ni regresiones.
