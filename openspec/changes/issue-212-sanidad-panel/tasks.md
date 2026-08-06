# Tasks: Issue #212 — Sanidad: panel desktop — read model y UI

Insumos: issue #212 + `requisito_sanidad.md` §2/§4/§11/§13 (SAN-014/050/052/063/080/081, KPI-09/10, T-001/004, D-002/005/006/007). Reutiliza de #208/#209/#210: dominio (`estadoStockSanidad`, `calcularStockDisponible`), vista `inventario_sanitario` (migración 0007, excluye anuladas RN-051), umbral `stock_minimo_dosis` de `config_parametros_finca` (T-001), patrón harness de `sanidad-almacen.server.ts`, componentes `FormularioEntradaAlmacen` y `FormularioVacuna` (aún sin ruta), shell `_app.tsx` que ya renderiza el sidebar estándar con ítem "Sanidad" (D-006). Fuera de alcance: drawer funcional de aplicación (#211: guardar/grupal/offline), tabs mobile (#213), notificaciones y alertas del Inicio (#214).

## Review Workload Forecast

Estimated changed lines: 1600–2100
Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High
800-line budget risk: High
4000-line budget risk: Low

Split sugerido: PR 1 (U1+U2) → PR 2 (U3) → PR 3 (U4+U5); delivery: single-pr (presupuesto de sesión 4000 líneas).

### Work units

| Unit | Goal | PR | Focused test | Runtime harness | Rollback |
|------|------|----|--------------|-----------------|----------|
| 1 | Dominio (SAN-052/KPI-09/D-002) + puerto read-model | 1 | `pnpm vitest run packages/dominio -t sanidad` | N/A — capas puras | Borrar helpers/puerto nuevos; #208 intacto |
| 2 | Adaptador Drizzle read model (SAN-002/003/004/005, D-005) | 1 | `pnpm vitest run packages/db -t panel` | N/A — runners indisponibles | Borrar `sanidad-panel-infrastructure.ts` |
| 3 | Server functions RBAC + degradación por card | 2 | `pnpm exec tsx tests/sanidad-panel-contract.test.ts` (apps/web) | Harness + `getSession` stub | Borrar `sanidad-panel.server.ts` |
| 4 | Componentes UI panel + historial | 3 | `pnpm vitest run packages/ui -t sanidad` | N/A — sin ruta aún | Borrar componentes nuevos |
| 5 | Ruta `/fincas/$fincaId/sanidad` + wiring shell | 3 | `pnpm vitest run apps/web -t sanidad` | N/A — runners indisponibles; SSR cubierto por test de integración de ruta | Borrar rutas nuevas y revertir `_app.tsx` |

Dependencias: U2→U1; U3→U1+U2; U4→U1; U5→U3+U4.

## Restricciones transversales

- TDD RED→GREEN; cada test nombra su regla (TS-001); dominio en español (T-003); sin `any`; umbral de stock nunca hardcodeado (T-001); sin `dark:` (SAN-081/T-004); RBAC por permiso, nunca por rol (PE-001).
- Frontera #211: #212 entrega botón "Registrar aplicación", estado de producto precargado y apertura del `FormularioVacuna` existente vía prop aditiva `productoIdInicial` (SAN-003). Guardado (caso de uso), selección grupal y offline-first son de #211; `onGuardar` permanece placeholder (SAN-047). No implementar alcance de #211.

## Phase 1 — Unit 1: Dominio y puerto read-model

- [x] 1.1 RED: `packages/dominio/tests/sanidad.test.ts` — agrupación por semana natural Esta semana / Próxima semana / Este mes con límites (SAN-052); predicado de refuerzo pendiente: `proxima_dosis` ≤ hoy+30 sin aplicación posterior del mismo producto (KPI-09/SAN-050); animales en tratamiento = `tipo_tratamiento` ≠ 'vacuna' últimos 30 días (D-002).
- [x] 1.2 GREEN: helpers puros en `packages/dominio/src/sanidad.ts` (`agruparRefuerzosPorSemana` y afines); export aditivo en `index.ts`.
- [x] 1.3 GREEN: `packages/aplicacion/src/puertos/sanidad-panel-port.ts` — filas serializables (CM-042): métricas, refuerzos pendientes, últimas aplicaciones, alertas stock, historial (filtros producto/fecha/animal-lote + paginación); export aditivo.

## Phase 2 — Unit 2: Adaptador Drizzle

- [x] 2.1 RED: `packages/db/tests/sanidad-panel-postgres.test.ts` — métricas (SAN-002): aplicaciones de la semana actual; animales distintos en tratamiento (D-002); stock crítico < umbral y agotados ≤ 0 desde `inventario_sanitario`, umbral leído de `config_parametros_finca` (KPI-10/T-001).
- [x] 2.2 RED: próximas (KPI-09/SAN-050) agrupadas por producto (N animales, vence más próximo), solo animales EN_FINCA, excluidas filas de grupos anulados (RN-051).
- [x] 2.3 RED: últimas 4 (SAN-004: producto, objetivo animal|lote + N animales, fecha, responsable); alertas de stock hasta 4 productos con estado agotado/bajo/ok (SAN-005); historial paginado con filtros producto/fecha/animal-lote (D-005).
- [x] 2.4 GREEN: `packages/db/src/sanidad-panel-infrastructure.ts` (`DrizzlePanelSanidadAdapter` implementa el puerto 1.3); reutiliza vista `inventarioSanitario` y la lectura de umbral del adaptador de catálogo (#209).

## Phase 3 — Unit 3: Server functions

- [x] 3.1 RED: `apps/web/tests/sanidad-panel-contract.test.ts` — §13.10: invocación directa sin `sanidad:ver` → `permiso_denegado`; finca del input ≠ finca activa → `finca_no_autorizada` (SAN-063/PE-002); fallo parcial de una consulta → las demás cards responden (degradación por card).
- [x] 3.2 GREEN: `apps/web/src/server/sanidad-panel.server.ts` — patrón `sanidad-almacen.server.ts` (harness inyectable `deps`/`getSession`, `denySanidadPanelAccess`, runtime harness); una función por fuente de card: métricas, próximas, últimas, stock, historial.

## Phase 4 — Unit 4: Componentes UI

- [x] 4.1 RED: `packages/ui/tests/` — 4 MetricCards con valores y navegación a listado filtrado cuando aplique (SAN-002); Próximas con los 3 períodos y fila clicable → `onRegistrarAplicacion(productoId)` (SAN-003/SAN-052); Registradas últimas 4 + enlace "Ver historial →" (SAN-004); Stock hasta 4 con badge (SAN-005); Accesos con copy "Entradas y stock" (SAN-006/D-007); gateo por `tienePermiso` (PE-001); tokens (SAN-080), sin `dark:` (SAN-081/T-004).
- [x] 4.2 RED: tabla de historial filtrable (D-005) — filtros producto/fecha/animal-lote + paginación, reutilizando el patrón de tablas existente.
- [x] 4.3 GREEN: `packages/ui/src/ganado/panel-sanidad.tsx` e `historial-aplicaciones-sanidad.tsx`; prop aditiva `productoIdInicial` en `event-drawer/formulario-vacuna.tsx` (precarga SAN-003); reutiliza `MetricCard`/`PageHeader`/primitivas (IA-003); export aditivo.

## Phase 5 — Unit 5: Ruta y shell

- [x] 5.1 RED: `apps/web/tests/sanidad-panel-route.test.tsx` — loader fail-closed por card (el fallo de una fuente no tumba el panel); título "Sanidad" + subtítulo "Panel de control · {finca}" (SAN-001); "Registrar aplicación" abre `FormularioVacuna` con producto precargado desde fila de Próximas (SAN-003); "+ Entrada almacén" abre `FormularioEntradaAlmacen` cableado a `registrarEntradaAlmacenFn` (SAN-014/#210).
- [x] 5.2 GREEN: `apps/web/src/routes/_app/fincas/$fincaId/sanidad.tsx` (guarda de `Outlet` según patrón de `animales.tsx`) y `sanidad/historial.tsx`.
- [x] 5.3 GREEN: wiring en `apps/web/src/routes/_app.tsx` — caso `/sanidad` en `deriveActivoId` y href del ítem → `/fincas/${fincaActivaId}/sanidad` (SAN-001/D-006). Destinos de Accesos: Historial → ruta propia; Diagnósticos → `configuracion/diagnosticos` (feature-004); Catálogo/Almacén → punto de navegación documentado para #213.

## Phase 6 — Verificación

- [x] 6.1 `pnpm turbo test` + `pnpm turbo typecheck` + `biome ci .` en verde.
- [x] 6.2 Mapa §13: item 1 → tests 2.1–2.4, 3.1–3.2, 4.1, 5.1 (panel y cards con fuentes correctas); item 2 → tests 1.1, 2.2, 4.1 (agrupación KPI-09 en 3 períodos); item 12 → dependencia de #214, no verificable en este change.

## Dependencias y riesgos

- **#211 (drawer):** guardar/grupal/offline del registro de aplicación NO se implementa aquí; el panel deja el punto de integración (`productoIdInicial`, `onGuardar` placeholder, SAN-047). §13 items 3/4/8/9 corresponden a #211/#208.
- **#214 (SAN-070):** §13 item 12 se verifica en conjunto con #214. La consulta KPI-09/SAN-050 y la agrupación SAN-052 creadas aquí son el insumo reutilizable de #214 (notificaciones e Inicio).
- **#213:** los destinos Catálogo/Almacén de la card Accesos y los tabs mobile corresponden a #213; este change solo deja los puntos de navegación.
