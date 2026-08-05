# Tasks: Issue #209 — Catálogo de productos sanitarios (CRUD server + UI)

Insumos: issue #209 + `requisito_sanidad.md` §2/§6/§11/§13; reutiliza dominio #208 (`validarTipoTratamiento`, `estadoStockSanidad`, vista `inventario_sanitario`). Fuera de alcance: ruta/shell sanidad (#212/#213), `almacen_entradas` (#210). Esquema v3: `productos_sanitarios` sin `usuario_creado_por`; no inventarla (IA-002).

## Review Workload Forecast

Estimated changed lines: 1700–2200
Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High
800-line budget risk: High

Split sugerido: PR 1 (U1+U2) → PR 2 (U3) → PR 3 (U4); delivery: single-pr.

### Work units

| Unit | Goal | PR | Focused test | Runtime harness | Rollback |
|------|------|----|--------------|-----------------|----------|
| 1 | Dominio + casos de uso (uniones CM-042) | 1 | `pnpm vitest run packages/dominio packages/aplicacion -t sanitario` | N/A — capas puras | Borrar archivos nuevos; #208 intacto |
| 2 | Adaptador Drizzle (CRUD + stock RN-041 + umbral T-001) | 1 | `pnpm vitest run packages/db -t catalogo` | N/A — runners indisponibles | Borrar adaptador nuevo |
| 3 | Server functions RBAC (PE-002) | 2 | `pnpm vitest run apps/web/src/server/sanidad-catalogo` | Harness + `getSession` stub | Borrar `sanidad-catalogo-actions.server.ts` |
| 4 | Componentes UI reutilizables | 3 | `pnpm vitest run packages/ui -t sanitario` | N/A — sin ruta aún | Borrar componentes nuevos |

Dependencias: U2→U1; U3→U1+U2; U4→U1,U3. Carril #210: solo exports aditivos en `index.ts`; no tocar `sanidad-infrastructure.ts` ni `almacen_entradas`.

## Phase 1 — Unit 1: Dominio y aplicación

- [x] 1.1 RED: `packages/dominio/src/producto-sanitario.test.ts` — validación CM-026 (trim, longitudes, sin HTML, `codigo`/`descripcion` requeridos); enum inválido vía `validarTipoTratamiento` (§13.13); duplicado activo+finca case-insensitive (SAN-023/CM-041).
- [x] 1.2 GREEN: `packages/dominio/src/producto-sanitario.ts` (`validarDatosProductoSanitario`, `validarCodigoUnicoProductoSanitario`, `STOCK_MINIMO_DOSIS_DEFAULT=20`, KPI-10/T-001); export aditivo en `index.ts`.
- [ ] 1.3 RED: tests de casos de uso — scope primero CM-024 (otra finca → `no_encontrado`); inactivar/reactivar sin borrado (RN-050/SAN-021); semáforo con umbral por puerto, nunca hardcodeado (SAN-022/T-001).
- [ ] 1.4 GREEN: `packages/aplicacion/src/puertos/catalogo-producto-sanitario-port.ts` (crear/editar/cambiarEstado, listar con stock, códigos activos, `obtenerStockMinimoDosis`).
- [ ] 1.5 GREEN: `casos-uso/sanidad/`: `resultados-producto-sanitario.ts` (CM-042), `crear-producto-sanitario.ts`, `editar-producto-sanitario.ts`, `cambiar-estado-producto-sanitario.ts`, `listar-catalogo-producto-sanitario.ts` (stock RN-041 + KPI-10, `soloActivos` SAN-021); exports aditivos.

## Phase 2 — Unit 2: Adaptador Drizzle

- [ ] 2.1 RED: `packages/db/src/catalogo-producto-sanitario-infrastructure.test.ts` — conflicto de código (SAN-023), stock desde `inventario_sanitario` (RN-041), umbral desde `config_parametros_finca` (T-001), filtro `soloActivos` (SAN-021).
- [ ] 2.2 GREEN: `packages/db/src/catalogo-producto-sanitario-infrastructure.ts` (puerto 1.4; unique → `conflicto` campo `codigo`; sin borrado físico, RN-050).

## Phase 3 — Unit 3: Server functions

- [ ] 3.1 RED: `apps/web/src/server/sanidad-catalogo-actions.test.ts` — §13.10: sin `sanidad:crear`/`sanidad:editar` → `permiso_denegado`; finca del recurso ≠ finca activa → `finca_no_autorizada` (PE-001/PE-002, SAN-061/063); uniones serializables (CM-042).
- [ ] 3.2 GREEN: `apps/web/src/server/sanidad-catalogo-actions.server.ts` (`denySanidadAccess` + deps + runtime harness, patrón `configuracion-actions.server.ts`).

## Phase 4 — Unit 4: UI reutilizable

- [ ] 4.1 RED: tests de componente — fila con stock + semáforo KPI-10 (SAN-022); acciones gateadas por `tienePermiso`, no rol (PE-001); sin botón eliminar (RN-050); errores `{ campo, detalle }` (SAN-020).
- [ ] 4.2 GREEN: `packages/ui/src/ganado/catalogo-productos-sanitarios.tsx` (desktop/mobile, confirmar con `alert-dialog`, SAN-021) y `formulario-producto-sanitario.tsx` (campos SAN-020); primitivas existentes (IA-003), tokens sin `dark:` (SAN-080/081, T-004); export aditivo.

## Phase 5 — Verificación

- [ ] 5.1 `pnpm turbo test` + `pnpm turbo typecheck`; criterios §13.5/6/10/13 cubiertos por tests U1–U3.
