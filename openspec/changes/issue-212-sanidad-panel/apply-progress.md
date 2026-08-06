# Apply Progress — Issue #212: Sanidad panel desktop (read model y UI)

- **Worktree**: `/home/lrodriguezn/ganaweb-worktrees/issue-212-sanidad-panel`
- **Rama**: `feat/issue-212-sanidad-panel` (base origin/master 0870829)
- **Modo**: Strict TDD (RED → GREEN → TRIANGULATE → REFACTOR por tarea)
- **Delivery**: single-pr, `size:exception` aprobado (presupuesto 4000 líneas; forecast 1600–2100). Sin push ni PR: solo commits locales.

## Decisiones tomadas durante apply

1. **Semana natural = lunes..domingo (ISO)** para SAN-052. "Esta semana" incluye refuerzos vencidos dentro de la semana; "Este mes" es el resto de la ventana KPI-09 (hoy+30) después de la próxima semana. El tercer cubo se define por la ventana pendiente, no por el mes calendario, para que la agrupación sea determinista y consistente desktop/mobile (SAN-052 manda consistencia).
2. **Agregación por producto dentro de cada período** (SAN-003): un producto con animales en períodos distintos produce una fila por período; `venceFecha` es la más próxima del grupo; `cantidadAnimales` cuenta animales distintos.
3. **El adaptador devuelve filas planas de refuerzo por animal/producto**; la agrupación SAN-052 la aplica el dominio (`agruparRefuerzosPorSemana`) invocada por la server function — la regla de negocio nunca vive en el adaptador ni en la ruta.
4. **Umbral de stock (T-001)**: el adaptador del panel reutiliza `obtenerStockMinimoDosis` del adaptador de catálogo (#209) y aplica el fallback del dominio `STOCK_MINIMO_DOSIS_DEFAULT` (el panel no tiene caso de uso; el patrón #209 aplica el fallback en la capa de uso, aquí el consumidor directo es el adaptador — el valor sigue sin hardcodearse en la lógica: viene de `config_parametros_finca` o de la constante de dominio documentada).
5. **Objetivo de aplicación (SAN-004)**: `animal` (registro individual) | `lote` (registro grupal RN-052). "toda la finca" no es derivable del esquema v3 y queda fuera (tasks 2.3 ya lo acota a animal|lote).
6. **Degradación por card**: cada server function del panel atrapa el fallo de su consulta y devuelve `{ tipo: "error" }` serializable; el loader de la ruta además aplica `.catch` fail-closed por card. El fallo de una card nunca tumba las demás.
7. **apps/web no importa dominio** (regla dependency-cruiser `web-to-dominio-direct`): `agruparRefuerzosPorSemana` y el tipo `PeriodosRefuerzosSanidad` se re-exportan desde `@ganaweb/aplicacion` (capa permitida), igual que `STOCK_MINIMO_DOSIS_DEFAULT` en #209.
8. **Server function de catálogo aditiva** (`listarCatalogoSanidadFn` en `sanidad-catalogo-actions.server.ts`): #209 dejó el harness sin `createServerFn`; el panel es el primer consumidor ruteado y necesita el catálogo activo para los selects de los drawers (SAN-003/SAN-014).
9. **Historial con carga reactiva a la URL en la vista** (patrón `animales.tsx`): el loader de TanStack de esta versión no expone `search` tipado en el contexto, así que `sanidad/historial.tsx` lee `Route.useSearch()` y re-ejecuta la server function en un effect por cambio de filtro/página. Los filtros y la página viven en la URL (D-005).

## Tamaño del change (trabajo autoral)

`git diff --stat origin/master...HEAD` → **27 archivos, 4587 inserciones / 7 borrados (≈4594 líneas)**.

| Categoría | Archivos | Inserciones |
|-----------|----------|-------------|
| Producción (`*/src/*`) | 14 | 2187 |
| Tests (`*/tests/*`) | 8 | 2218 |
| Docs/config (openspec, package.json, vitest.config) | 5 | 182 |

- El **código de producción (2187)** está dentro del forecast de la fase tasks (1600–2100).
- El **exceso sobre el presupuesto de excepción (4000)** proviene de la cobertura de tests exigida por el modo Strict TDD activo (RED + triangulación por tarea), que añade ~2218 líneas.
- **Superávit**: ≈594 líneas por encima del presupuesto de excepción aprobado (4000). Se señala para decisión del mantenedor (aceptar el single-pr con size:exception, o pedir dividir en PRs encadenados U1+U2 / U3 / U4+U5 según el split sugerido en tasks.md).

## Work units

### U1 — Dominio y puerto read-model (tasks 1.1–1.3)

- **Estado**: completa
- **Tests**: `packages/dominio/tests/sanidad.test.ts` — 23 tests nuevos (SAN-052 límites de período y agregación; KPI-09/SAN-050 predicado con ventana y límite hoy+30; D-002 últimos 30 días con límite y vacunas excluidas; aritmética ISO).
- **Producción**: `packages/dominio/src/sanidad.ts` (`sumarDiasAFechaIso`, `inicioSemanaIso`, `finSemanaIso`, `esRefuerzoPendienteSanidad`, `propositoProductoSanitario`, `agruparRefuerzosPorSemana`, `contarAnimalesEnTratamiento`, tipos `RefuerzoPendienteFila`/`RefuerzoPendienteAgrupado`/`PeriodosRefuerzosSanidad`/`AplicacionTratamientoSanidad`); puerto `packages/aplicacion/src/puertos/sanidad-panel-port.ts` (`SanidadPanelLecturaPort` + filas serializables CM-042).
- **Evidencia**:
  - Focused test: `pnpm vitest run tests/sanidad.test.ts` (packages/dominio) → 74/74 pass (51 previos + 23 nuevos).
  - Suite dominio: `pnpm vitest run` → 200/200 pass.
  - Typecheck: `tsc --noEmit` dominio y aplicacion → limpios.
  - Runtime harness: N/A — capas puras sin frontera de runtime.
  - Rollback: borrar helpers/tipos nuevos de `sanidad.ts` + `index.ts` y el puerto nuevo; #208/#209/#210 intactos.

### U2 — Adaptador Drizzle read model (tasks 2.1–2.4)

- **Estado**: completa
- **Tests**: `packages/db/tests/sanidad-panel-postgres.test.ts` — 17 tests con db FALSA (patrón #209, sin Postgres): scope de queries (SAN-063), ventanas de fecha, RN-051, umbral T-001 + fallback, mapeo serializable CM-042, paginación D-005. El comportamiento real contra Postgres vive en smoke tests DB_SMOKE.
- **Producción**: `packages/db/src/sanidad-panel-infrastructure.ts` (`DrizzlePanelSanidadAdapter` implementa `SanidadPanelLecturaPort`); export aditivo en `package.json`.
- **Desviación**: `getTableName` de drizzle no resuelve vistas `.existing()`; el helper de test `nombreTabla` cae al símbolo `drizzle:ViewBaseConfig`. El adaptador delega la cuenta D-002 en el dominio (`contarAnimalesEnTratamiento`) — el SQL empuja el filtro y el dominio re-verifica (defensa en profundidad; la regla queda reutilizable para #214).
- **Evidencia**:
  - Focused test: `pnpm vitest run tests/sanidad-panel-postgres.test.ts` (packages/db) → 17/17 pass.
  - Suite db: `pnpm vitest run` → 197 pass, 40 skipped (DB_SMOKE sin BD).
  - Typecheck db (incluye tests): limpio.
  - Runtime harness: N/A — adaptador de lectura; el harness real corre en la server function (U3).
  - Rollback: borrar `sanidad-panel-infrastructure.ts` y su export en `package.json`.

### U3 — Server functions RBAC + degradación por card (tasks 3.1–3.2)

- **Estado**: completa
- **Tests**: `apps/web/tests/sanidad-panel-contract.test.ts` (tsx + node:assert, patrón #210) — RBAC por permiso (§13.10/PE-001), revalidación de finca (SAN-063/PE-002), degradación por card, agrupación SAN-052 vía dominio, `hoy` del reloj inyectado. Cableado en `test`/`test:unit` de `apps/web/package.json`.
- **Producción**: `apps/web/src/server/sanidad-panel.server.ts` — harness inyectable `deps`/`getSession`, `denySanidadPanelAccess`, `conDegradacion`, runtime harness + 5 `createServerFn` (GET) por card; re-export aditivo de `agruparRefuerzosPorSemana`/`PeriodosRefuerzosSanidad` en `@ganaweb/aplicacion`.
- **Evidencia**:
  - Focused test: `pnpm exec tsx tests/sanidad-panel-contract.test.ts` (apps/web) → `sanidad-panel-contract: OK`.
  - Typecheck apps/web (`tsr generate && tsc --noEmit`): limpio (tras build de `@ganaweb/ui`).
  - dependency-cruiser: 0 errores (warnings idénticos al patrón existente `sanidad-almacen.server.ts`).
  - Runtime harness: contract test con `getSession`/`deps` falsos inyectados (el runtime real usa `auth-deps.server.ts` + `DrizzlePanelSanidadAdapter`).
  - Rollback: borrar `sanidad-panel.server.ts`, su línea en los scripts de test y los re-exports de aplicacion.

### U4 — Componentes UI panel + historial (tasks 4.1–4.3)

- **Estado**: completa
- **Tests**: `packages/ui/tests/panel-sanidad.test.tsx` (13), `historial-aplicaciones-sanidad.test.tsx` (9), `formulario-vacuna.test.tsx` (3). Cubren SAN-001..SAN-006, D-005/D-007, PE-001, degradación por card y precarga SAN-003.
- **Producción**: `packages/ui/src/ganado/panel-sanidad.tsx`, `historial-aplicaciones-sanidad.tsx`; prop aditiva `productoIdInicial` en `event-drawer/formulario-vacuna.tsx`; exports aditivos en `index.ts`. Reutiliza `MetricCard`, `PageHeader`, `Button`, `Select`, `Input` (IA-003).
- **Desviación**: el badge de stock del panel se renderiza desde el `estado` ya calculado por el servidor (umbral real T-001); NO se reutiliza `StockBadge` de `estado-badge.tsx` porque hardcodea umbral 20 (violación T-001). El gateo de tokens detectó el literal `dark:` en un comentario — se reescribió el texto.
- **Evidencia**:
  - Focused test: `pnpm vitest run tests/panel-sanidad.test.tsx tests/historial-aplicaciones-sanidad.test.tsx tests/formulario-vacuna.test.tsx` (packages/ui) → 26/26 pass.
  - Suite ui: `pnpm vitest run` → 642/642 pass (incluye `tokens.test.ts` SAN-081/T-004).
  - Typecheck ui + build (tsup dist): limpios.
  - Runtime harness: N/A — componentes presentacionales sin ruta aún (la integración vive en U5).
  - Rollback: borrar `panel-sanidad.tsx`, `historial-aplicaciones-sanidad.tsx`, `formulario-vacuna.test.tsx` y los exports; revertir la prop `productoIdInicial`.

### U5 — Ruta y wiring shell (tasks 5.1–5.3)

- **Estado**: completa
- **Tests**: `apps/web/tests/sanidad-panel-route.test.tsx` (8: loader fail-closed por card, denial RBAC degradado, encabezado SAN-001, drawers SAN-003/SAN-014) + `apps/web/tests/sanidad-shell-wiring.test.tsx` (2: `deriveActivoId`). Ambas en el `include` de `apps/web/vitest.config.ts`.
- **Producción**: `apps/web/src/routes/_app/fincas/$fincaId/sanidad.tsx` (loader fail-closed + guarda de `Outlet` + drawers), `sanidad/historial.tsx` (carga reactiva a la URL), wiring del sidebar en `_app.tsx` (`deriveActivoId` exportado + href remapeado), `listarCatalogoSanidadFn` aditiva en `sanidad-catalogo-actions.server.ts`, `routeTree.gen.ts` regenerado.
- **Evidencia**:
  - Focused test: `pnpm vitest run tests/sanidad-panel-route.test.tsx tests/sanidad-shell-wiring.test.tsx` (apps/web) → 10/10 pass.
  - Suite apps/web: `pnpm test` → 425 pass (tsx contract tests + vitest).
  - Typecheck apps/web (`tsr generate && tsc --noEmit`): limpio.
  - dependency-cruiser: 0 errores (warnings idénticos a patrones existentes).
  - Runtime harness: loader SSR con server functions reales (fail-closed por card); contract tests cubren el harness con fakes.
  - Rollback: borrar `sanidad.tsx`, `sanidad/historial.tsx`, los dos tests y sus líneas en `vitest.config.ts`; revertir `_app.tsx` y `listarCatalogoSanidadFn`; regenerar `routeTree.gen.ts`.

### Verificación (tasks 6.1–6.2)

- **Estado**: completa
- **6.1 — Gates**:
  - `CI=true pnpm turbo test` → 13/13 tasks pass. **Nota ambiental**: este worktree no tiene Postgres local ni `CI` definido; los tests de db que exigen BD real están gateados `skipIf(process.env.CI === "true")` (se saltan en CI, igual que en GitHub Actions). Con `CI=true` (reproducción fiel de CI) la suite es verde. Sin `CI`, esos 41 tests pre-existentes (p. ej. `animal-mobile-list-postgres`) fallan por falta de BD — NO son regresiones de este change (archivos no tocados).
  - `pnpm turbo typecheck` → 13/13 tasks pass.
  - `biome ci .` → 420 archivos, 0 errores / 0 warnings.
  - dependency-cruiser → 0 errores (warnings idénticos a patrones existentes).
- **6.2 — Mapa §13**:
  - **Item 1** (panel renderiza 4 MetricCards + cards Próximas/Registradas/Stock/Accesos con fuentes correctas): tests 2.1–2.4 (adaptador), 3.1–3.2 (server functions), 4.1 (PanelSanidad), 5.1 (loader/ruta). ✔
  - **Item 2** (Próximas agrupa KPI-09 en Esta semana/Próxima semana/Este mes): tests 1.1 (`agruparRefuerzosPorSemana`), 2.2 (refuerzos EN_FINCA/RN-051), 3.2 (server function agrupa vía dominio), 4.1 (UI períodos). ✔
  - **Item 12** (alertas "Requiere acción" del Inicio navegan al módulo — SAN-070): dependencia de #214; este change deja la consulta KPI-09/SAN-050 y la agrupación SAN-052 como insumo reutilizable. No verificable aquí. ⏳
  - Items 3/4/8/9 (guardado/grupal/offline/auto-completado) son de #211/#208 — frontera respetada: `onGuardar` queda placeholder (SAN-047).
