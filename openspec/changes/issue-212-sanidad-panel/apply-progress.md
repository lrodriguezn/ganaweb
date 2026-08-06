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

- **Estado**: pendiente

### U4 — Componentes UI panel + historial (tasks 4.1–4.3)

- **Estado**: pendiente

### U5 — Ruta y wiring shell (tasks 5.1–5.3)

- **Estado**: pendiente

### Verificación (tasks 6.1–6.2)

- **Estado**: pendiente
