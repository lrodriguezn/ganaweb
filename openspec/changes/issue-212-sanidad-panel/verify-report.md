```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:27772da45956b60832d88db5373ef77e8bb61e34288bb123d4845e3183bc99a1
verdict: pass
blockers: 0
critical_findings: 0
requirements: 21/21
scenarios: 2/2
test_command: CI=true pnpm turbo test --force
test_exit_code: 0
test_output_hash: sha256:2ad172ea92ebbbba17cd6384916235eb57d5eb149ae264da14bbd3ae7cbac703
build_command: pnpm turbo typecheck --force
build_exit_code: 0
build_output_hash: sha256:dc9138fcc93842d72b23fe81b2f2193651636071f2c6a1a818657af99a0e8e2f
```

## Verification Report

**Change**: `issue-212-sanidad-panel` (issue #212 — Sanidad: panel desktop — read model y UI)
**Version**: RF-SANIDAD v0.2 (`requisito_sanidad.md` §4/§11/§13 + decisiones D-002/D-005/D-006/D-007)
**Mode**: Strict TDD (runner `pnpm turbo test`; módulo `strict-tdd-verify.md` activo)
**Worktree**: `/home/lrodriguezn/ganaweb-worktrees/issue-212-sanidad-panel` · rama `feat/issue-212-sanidad-panel` (8 commits `191c3f3..0c44169` sobre origin/master `0870829`)
**Verificación independiente**: ejecución fresca propia (`--force`, 0 caché turbo) + lectura integral de implementación y tests. No se confió en `apply-progress.md`; sus afirmaciones se contrastaron contra el código y la ejecución.

### Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 17 |
| Tasks complete | 17 |
| Tasks incomplete | 0 |

Las 17 tareas (1.1–1.3, 2.1–2.4, 3.1–3.2, 4.1–4.3, 5.1–5.3, 6.1–6.2) están marcadas en `tasks.md` y tienen correspondencia real con commits y archivos:

| Commit | Unidad | Contenido verificado |
|--------|--------|----------------------|
| `191c3f3` | U1 | Dominio SAN-052/KPI-09/D-002 (`packages/dominio/src/sanidad.ts` +214) + puerto (`sanidad-panel-port.ts`) + 23 tests |
| `fe3cf2d` | U2 | Adaptador Drizzle (`sanidad-panel-infrastructure.ts`, 400 líneas) + 17 tests |
| `ac1dc90` | U3 | Server functions RBAC + degradación (`sanidad-panel.server.ts`) + contract test |
| `f4be7bf` | U4 | `panel-sanidad.tsx`, `historial-aplicaciones-sanidad.tsx`, prop `productoIdInicial` + 25 tests |
| `1eab1f9` | U5 | Rutas `sanidad.tsx`/`historial.tsx`, wiring `_app.tsx` + 10 tests |
| `69a3e3c` | — | Formato Biome + enlace de historial accesible |
| `b79e8e5` | fase 6 | Verificación de apply + mapa §13 |
| `0c44169` | — | Desglose de tamaño del change |

### Build & Tests Execution

**Build (typecheck)**: ✅ Passed
```text
pnpm turbo typecheck --force → Tasks: 13 successful, 13 total · Cached: 0 cached · exit 0
```

**Tests**: ✅ 1555 passed / 0 failed / ⚠️ 99 skipped (tests db pre-existentes ligados a Postgres real, gateados `skipIf(CI)` — igual que en GitHub Actions; no son regresiones ni gaps de este change)
```text
CI=true pnpm turbo test --force → Tasks: 13 successful, 13 total · Cached: 0 cached · exit 0 (2m47s)
  @ganaweb/dominio:     200 passed (7 archivos) — sanidad.test.ts 74/74 (23 nuevos de #212)
  @ganaweb/aplicacion:  150 passed (18 archivos)
  @ganaweb/db:          138 passed | 99 skipped (27 archivos) — sanidad-panel-postgres.test.ts 17/17
  @ganaweb/ui:          642 passed (27 archivos) — panel-sanidad 13, historial 9, formulario-vacuna 3
  @ganaweb/web:         425 passed (24 archivos) — sanidad-panel-contract OK (tsx),
                        sanidad-panel-route 8/8, sanidad-shell-wiring 2/2
```

**Lint**: ✅ `pnpm exec biome ci .` → 420 archivos, 0 errores, 0 warnings, exit 0.

**Dependencias**: ✅ `pnpm exec dependency-cruiser .` → 0 errores, 271 warnings, exit 0. Los warnings de los archivos nuevos (`sanidad-panel.server.ts` → sesión/auth-deps; tests → server; `sanidad-panel-infrastructure.ts` → dominio) replican el perfil ya establecido de `sanidad-almacen.server.ts` y `animal-infrastructure.ts` (verificado contra la salida de depcruise).

**Coverage**: ➖ No disponible (el repo no tiene comando de cobertura configurado).

### Spec Compliance Matrix

Requisitos del alcance (issue #212 + `requisito_sanidad.md` §4/§11; modo ligero: sin spec delta propia):

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| SAN-001 (ruta + título "Sanidad" + subtítulo "Panel de control · {finca}") | encabezado del panel | `packages/ui/tests/panel-sanidad.test.tsx > SAN-001: encabezado` · `apps/web/tests/sanidad-panel-route.test.tsx > SAN-001: encabezado` | ✅ COMPLIANT |
| SAN-002 (4 MetricCards con fuentes correctas) | métricas de la semana, tratamiento, stock crítico, agotados | `packages/db/tests/sanidad-panel-postgres.test.ts > SAN-002:*` (3 tests) · `packages/ui/tests/panel-sanidad.test.tsx > SAN-002:*` (2 tests) · contract `testCardsResponden` | ✅ COMPLIANT |
| SAN-003 (Próximas: fila = producto + propósito + N animales + vence; clic precarga producto) | precarga desde fila y desde botón | `packages/ui/tests/panel-sanidad.test.tsx > clic en una fila abre el registro…` · `apps/web/tests/sanidad-panel-route.test.tsx > SAN-003:*` (2 tests) · `packages/ui/tests/formulario-vacuna.test.tsx` (3 tests) | ✅ COMPLIANT |
| SAN-004 (últimas 4 + objetivo animal\|lote + N animales + responsable + "Ver historial") | mapeo y enlace | `packages/db/tests/sanidad-panel-postgres.test.ts > SAN-004:*` (2 tests) · `packages/ui/tests/panel-sanidad.test.tsx > SAN-004:*` (2 tests) · `historial-aplicaciones-sanidad.test.tsx > columnas` | ✅ COMPLIANT |
| SAN-005 (hasta 4 productos con estado Agotado/"N dosis"/OK) | orden por criticidad + badge | `packages/db/tests/sanidad-panel-postgres.test.ts > SAN-005/KPI-10:*` (2 tests) · `packages/ui/tests/panel-sanidad.test.tsx > SAN-005:*` | ✅ COMPLIANT |
| SAN-006 (card Accesos: Catálogo, Historial, Almacén, Diagnósticos) | copy y navegación | `packages/ui/tests/panel-sanidad.test.tsx > SAN-006/D-007:*` (2 tests) | ✅ COMPLIANT |
| D-007 (copy "Entradas y stock") | texto del acceso Almacén | `packages/ui/tests/panel-sanidad.test.tsx > muestra los cuatro accesos con el copy confirmado` (assert literal "Entradas y stock") | ✅ COMPLIANT |
| SAN-014/#210 ("+ Entrada almacén" cableado a `registrarEntradaAlmacenFn`) | guardado real de la entrada | `apps/web/tests/sanidad-panel-route.test.tsx > + Entrada almacén abre el formulario y guarda vía registrarEntradaAlmacenFn` (verifica fincaId/productoId/dosis enviados) | ✅ COMPLIANT |
| SAN-047 (frontera #211: `onGuardar` placeholder, sin guardar/grupal/offline) | placeholder preservado | Inspección: `sanidad.tsx:203-205` onGuardar solo cierra el drawer; diff de `formulario-vacuna.tsx` = solo prop aditiva `productoIdInicial`; ningún caso de uso de aplicación creado | ✅ COMPLIANT |
| SAN-050/KPI-09 (refuerzo pendiente: `proxima_dosis` ≤ hoy+30, sin aplicación posterior del mismo producto, solo EN_FINCA) | ventana, límite y exclusiones | `packages/dominio/tests/sanidad.test.ts > KPI-09/SAN-050:*` (7 tests incl. límite hoy+30 y vencido) · `packages/db/tests/sanidad-panel-postgres.test.ts > KPI-09/SAN-050:*` (4 tests incl. última-por-pareja y EN_FINCA/RN-051 en query) | ✅ COMPLIANT |
| SAN-052 (agrupación por semana natural: Esta semana / Próxima semana / Este mes) | límites de período y agregación | `packages/dominio/tests/sanidad.test.ts > SAN-052:*` (8 tests incl. domingo/lunes límite, vencido intra-semana, defensa KPI-09) · contract `testProximasAgrupadasPorSemana` · `panel-sanidad.test.tsx > agrupa en los tres períodos` | ✅ COMPLIANT |
| D-002 (animales en tratamiento = `tipo_tratamiento` ≠ 'vacuna' últimos 30 días, distintos) | ventana y deduplicación | `packages/dominio/tests/sanidad.test.ts > D-002:*` (4 tests incl. límite hoy-30 vs hoy-31) · `packages/db/tests/sanidad-panel-postgres.test.ts > D-002:*` | ✅ COMPLIANT |
| KPI-10/T-001 (estados agotado ≤ 0 / bajo < umbral / ok; umbral de `config_parametros_finca`, nunca hardcodeado) | umbral runtime + fallback dominio | `packages/db/tests/sanidad-panel-postgres.test.ts > KPI-10/T-001:*` y `T-001: sin parámetro…` y `el estado usa el umbral configurado…` · dominio `estadoStockSanidad` (umbral es parámetro) | ✅ COMPLIANT |
| SAN-063/PE-002 (finca del input revalidada en servidor; jamás confiada) | finca ajena → `finca_no_autorizada` sin tocar puerto | contract `testRbacPorPermiso` (assert `finca_no_autorizada` + puerto intacto) · queries del adaptador acotadas por `finca_id` (asertado en 5 tests db) | ✅ COMPLIANT |
| PE-001/SAN-061 (RBAC por permiso, nunca por rol; server y UI) | denegación directa + gateo UI | contract `testRbacPorPermiso` (`permiso_denegado` sin `sanidad:ver`; comodín `*:*`) · `panel-sanidad.test.tsx > PE-001:*` (2 tests: con/sin `sanidad:crear`) | ✅ COMPLIANT |
| Degradación por card (fallo parcial no tumba el panel) | server fn, loader y vista | contract `testDegradacionPorCard` (fallo de una card no afecta las demás; detalle interno no filtrado) · `sanidad-panel-route.test.tsx > loader fail-closed:*` (4 tests incl. denial RBAC degradado) · `panel-sanidad.test.tsx > degradación por card` | ✅ COMPLIANT |
| D-005 (historial paginado con filtros producto/fecha/animal-lote) | filtros en query + paginación + URL | `packages/db/tests/sanidad-panel-postgres.test.ts > D-005:*` (5 tests) · `historial-aplicaciones-sanidad.test.tsx > filtros/paginación` (6 tests) · `historial.tsx` con `validateSearch` (filtros y página en URL) | ✅ COMPLIANT |
| D-006 (sidebar estándar del shell; ítem Sanidad activo) | highlight e href | `apps/web/tests/sanidad-shell-wiring.test.tsx` (2 tests: `deriveActivoId` sanidad/historial + casos conservados) · `_app.tsx` href remapeado a `/fincas/${fincaActivaId}/sanidad` | ✅ COMPLIANT |
| SAN-080 (tokens del diseño: pasto/tierra/semánticos, radius) | theming por tokens | Inspección: `panel-sanidad.tsx` usa `bg-card`, `pasto-600/100`, `tierra-200/400`, `peligro/alerta/exito-100/600`, `rounded-card`, `min-h-[--h-touch]`; suite ui `tokens.test.ts` 182 tests verde | ✅ COMPLIANT |
| SAN-081/T-004 (theming por tokens; prohibido `dark:`) | ausencia de variantes oscuras | `git diff origin/master...HEAD` → 0 ocurrencias de `dark:` en código (solo en docs que citan la regla) | ✅ COMPLIANT |
| CM-042 (uniones serializables; filas del read model sin Date/BigInt) | contrato del puerto | `sanidad-panel-port.ts`: fechas ISO string, números `number`, uniones discriminadas por `tipo` (`ok`/denials/`error`); contract test valida serialización de denegaciones y errores como valores | ✅ COMPLIANT |

**Compliance summary**: 21/21 requisitos cumplidos.

Criterios de aceptación del issue (§13, alcance de este change):

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| §13 item 1 (el panel renderiza las 4 MetricCards y las cards Próximas/Registradas/Stock/Accesos con las fuentes de datos correctas) | panel completo con fuentes por card | Adaptador (tests 2.1–2.4: métricas/refuerzos/últimas/stock desde `aplicaciones_sanitarias`, `inventario_sanitario`, umbral de `config_parametros_finca`) + server functions (contract: una fn por card) + `panel-sanidad.test.tsx` (render de las 4 MetricCards y las 4 cards con valores) + `sanidad-panel-route.test.tsx` (loader cablea cada fuente a su card) | ✅ COMPLIANT |
| §13 item 2 ("Próximas aplicaciones" agrupa refuerzos KPI-09 en Esta semana / Próxima semana / Este mes) | agrupación determinista | `dominio/tests/sanidad.test.ts > SAN-052` (límites lunes..domingo, hoy+30) + `db` (filas EN_FINCA/RN-051) + contract (`proximas` agrupa vía dominio con `hoy` del reloj) + UI (3 períodos renderizados) | ✅ COMPLIANT |

**Compliance summary**: 2/2 escenarios cumplidos. §13 item 12 (SAN-070, alertas del Inicio) es dependencia de #214 y está fuera de este change (frontera documentada en tasks.md); §13 items 3/4/8/9 pertenecen a #211/#208.

### Correctness (Static Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| Dominio puro (T-003, §11) | ✅ Implemented | `sanidad.ts` +214 líneas: 0 imports, funciones puras con reloj explícito (`hoy` ISO); nombres en español; ventanas `VENTANA_REFUERZOS_DIAS`/`VENTANA_TRATAMIENTO_DIAS` como constantes de dominio |
| Puerto read model (CM-042) | ✅ Implemented | `SanidadPanelLecturaPort` type-only en `packages/aplicacion`; filas serializables; `hoy` lo aporta el harness (determinismo) |
| Adaptador Drizzle | ✅ Implemented | `DrizzlePanelSanidadAdapter` implementa el puerto; reutiliza vista `inventarioSanitario` (migración 0007, excluye grupos anulados RN-051 — verificado en SQL de la migración) y `obtenerStockMinimoDosis` del adaptador #209; RN-051 en todas las lecturas vía `sinGruposAnulados()` |
| Server functions | ✅ Implemented | 5 `createServerFn` GET (una por card) + historial; harness inyectable idéntico al patrón `sanidad-almacen.server.ts`; `hoy` del reloj inyectado; agrupación SAN-052 delegada al dominio (la regla nunca vive en web) |
| RBAC server | ✅ Implemented | `denySanidadPanelAccess`: sesión → finca activa === input → permiso `sanidad:ver` (o comodín `*:*`); denegaciones como valores serializables, nunca excepciones |
| UI presentacional | ✅ Implemented | `PanelSanidad`/`HistorialAplicacionesSanidad` reutilizan `MetricCard`, `PageHeader`, `Button`, `Select`, `Input` (IA-003); badge de stock renderizado desde el `estado` calculado en servidor (no reutiliza `StockBadge` porque hardcodea umbral 20 — decisión 4 de apply, correcta bajo T-001) |
| Ruta y shell | ✅ Implemented | Loader con `Promise.all` + `.catch(() => null)` por fuente; guarda de `Outlet` según patrón `animales.tsx`; `routeTree.gen.ts` regenerado con ambas rutas; historial con filtros/página en URL (`validateSearch`) y carga reactiva |
| Frontera #211 | ✅ Implemented | `onGuardar` del registro de aplicación solo cierra el drawer (placeholder SAN-047); sin caso de uso de guardado, sin offline-first; selección de animales existente del componente pre-existe a este change; diff de `FormularioVacuna` = prop aditiva |

### Coherence (Design)

No existe artefacto de diseño formal (modo ligero); la coherencia se evaluó contra `tasks.md`, `apply-progress.md`, las decisiones del issue y los patrones del requisito.

| Decision | Followed? | Notes |
|----------|-----------|-------|
| Capas §11 (dominio puro, aplicación puertos, db adaptador, web orquesta) | ✅ Yes | Dominio sin imports; puerto type-only; apps/web importa dominio vía re-export de `@ganaweb/aplicacion` (regla dependency-cruiser `web-to-dominio-direct` respetada); agrupación SAN-052 invocada por la server function, no por el adaptador ni la ruta |
| D-002 (tratamiento ≠ vacuna, 30 días) | ✅ Yes | SQL empuja el filtro `ne(tipo_tratamiento, 'vacuna')` y el dominio re-verifica con `contarAnimalesEnTratamiento` (defensa en profundidad) |
| D-005 (historial filtrable reutilizando patrón de tablas) | ✅ Yes | Filtros y página en URL; componente presentacional; tabla con columnas SAN-004 |
| D-006 (sidebar estándar) | ✅ Yes | El shell ya renderiza el ítem "Sanidad"; el change solo cablea `deriveActivoId` y el href (aditivo) |
| D-007 (copy "Entradas y stock") | ✅ Yes | Literal asertado en test |
| Decisiones 1–9 de apply-progress | ✅ Yes | Verificadas contra el código: semana ISO lunes..domingo; agregación por producto/período; umbral con fallback de dominio; objetivo animal\|lote; degradación serializable; re-exports en aplicacion; `listarCatalogoSanidadFn` aditiva; historial reactivo a la URL |
| Fronteras #211/#213/#214 | ✅ Yes | Sin guardar/grupal/offline; destinos Catálogo/Almacén como puntos documentados; item 12 sin tocar |

### TDD Compliance

| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ⚠️ | Evidencia presente por unidad en `apply-progress.md` (focused tests + suites) y RED→GREEN estructural en `tasks.md`, pero NO en la tabla canónica "TDD Cycle Evidence" (RED/GREEN/TRIANGULATE/SAFETY NET/REFACTOR) — ver WARNING 1 |
| All tasks have tests | ✅ | 17/17 tareas con correspondencia a archivos de test/commits |
| RED confirmed (tests exist) | ✅ | 8/8 archivos de test verificados en el codebase (7 nuevos + `sanidad.test.ts` extendido) |
| GREEN confirmed (tests pass) | ✅ | Todos pasan en la ejecución fresca independiente (`--force`, 0 caché): 79 casos nuevos de #212 en verde |
| Triangulation adequate | ✅ | Casos con valores esperados variados y límites ejercidos (hoy±30/31, domingo/lunes, umbral configurable, página fuera de rango, denegaciones con puerto intacto) |
| Safety Net for modified files | ✅ | Archivos pre-existentes modificados (`_app.tsx`, `formulario-vacuna.tsx`, `sanidad-catalogo-actions.server.ts`) cubiertos por suite completa + tests de compatibilidad hacia atrás (`sin productoIdInicial el select inicia vacío`; `los demás casos se conservan`) |

**TDD Compliance**: 5/6 checks passed (1 ⚠️ de formato).

### Test Layer Distribution

| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | 46 (23 dominio, 17 db con fake-db, 2 shell wiring) | 3 | vitest / tsx |
| Integration | 33 (13 panel UI, 9 historial UI, 3 formulario-vacuna, 8 ruta/loader, 4 contract harness… en funciones con 27 asserts) | 5 | vitest jsdom + testing-library / tsx + node:assert |
| E2E | 0 | 0 | no instalado para este change |
| **Total** | **79** | **8** | |

### Changed File Coverage

Coverage analysis skipped — no coverage tool detected (el repo no tiene comando de cobertura configurado). No es un fallo; solo indisponibilidad.

### Assertion Quality

Auditoría completa de los 8 archivos de test del change:

- Sin tautologías (`expect(true).toBe(true)`), sin ghost loops, sin smoke-test-only.
- Las aserciones de UI usan roles/labels/texto visible (comportamiento), no clases CSS ni estado interno.
- Los tests de adaptador combinan aserciones estructurales sobre los query chunks de Drizzle (scope `finca_id`, ventanas de fecha, `anulado_en`, filtros) con aserciones de mapeo de salida — es el patrón casa de #209 para adaptadores sin Postgres disponible; ejercitan código de producción real (el builder de Drizzle genera la condición de verdad).
- Contrato tsx: 4 funciones con 27 asserts; cada denegación verifica además que el puerto NO fue tocado (0 llamadas).
- Ratio mocks/asserts equilibrado en todos los archivos; los mocks de server functions en el test de ruta son el seam de integración del loader.

**Assertion quality**: ✅ All assertions verify real behavior

### Quality Metrics

**Linter**: ✅ `biome ci .` — 420 archivos, 0 errores, 0 warnings
**Type Checker**: ✅ `turbo typecheck --force` — 13/13 tareas, 0 errores
**dependency-cruiser**: ✅ 0 errores (warnings con el mismo perfil que patrones existentes)

### Issues Found

**CRITICAL**: None

**WARNING**:
1. **Evidencia TDD sin tabla canónica**: `apply-progress.md` reporta la evidencia TDD por unidad (focused tests, suites, desviaciones) y `tasks.md` estructura RED→GREEN por tarea, pero no existe la tabla canónica "TDD Cycle Evidence" (RED/GREEN/TRIANGULATE/SAFETY NET/REFACTOR) que exige el módulo Strict TDD. Sustancia verificada de forma independiente: los tests existen, pasan en ejecución fresca, la triangulación es adecuada y los archivos modificados tuvieron red de seguridad — por eso se degrada de CRITICAL (evidencia ausente) a WARNING (desviación de formato).

**SUGGESTION**:
1. **Sin smoke `DB_SMOKE` del adaptador del panel**: el comportamiento contra Postgres real de `DrizzlePanelSanidadAdapter` no tiene smoke test propio (los 17 tests usan db falsa); el header del archivo remite al patrón DB_SMOKE general. Mismo gap señalado en la verificación de #209 — añadir cuando haya runners con BD.
2. **Navegación de métricas de stock (SAN-002 "cuando aplique")**: el mecanismo existe y está testeado (`onVerStock` en `PanelSanidad`), pero la ruta no lo cablea porque el listado destino (Catálogo/Almacén) corresponde a #213. Completar el wiring cuando #213 entregue los destinos.
3. **Refuerzos vencidos de semanas anteriores**: en `agruparRefuerzosPorSemana`, una fila con `proxima_dosis` anterior al lunes de la semana actual cae en el cubo "Próxima semana" (por el orden de las condiciones). SAN-052 no define esta ubicación y la decisión 1 de apply solo cubre vencidos intra-semana; conviene documentar la ubicación de vencidos antiguos (o darles cubo propio) para mantener la semántica desktop/mobile consistente que exige SAN-052.
4. **Escala v1 en memoria**: `listarRefuerzosPendientes` trae todas las aplicaciones de la finca sin cota de fecha en SQL y `listarHistorial` pagina sobre la colección materializada. Documentado como escala v1; mover a SQL (ventana `proxima_dosis` y `LIMIT/OFFSET`) cuando el volumen lo exija.

### Verdict

**PASS WITH WARNINGS**
Las tres puertas corren verdes sin caché en ejecución independiente (1555 tests, 0 fallos; typecheck 13/13; biome 420 archivos limpios), los 21 requisitos del alcance y los 2 criterios de aceptación (§13 items 1 y 2) están cubiertos por tests reales que ejercitan cada regla, las fronteras #211/#213/#214 se respetan, y queda 1 warning de formato de evidencia TDD más 4 sugerencias sin impacto funcional.
