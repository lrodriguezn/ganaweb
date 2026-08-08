# Tasks: Issue #213 — Sanidad: tabs mobile (Catálogo · Almacén · Refuerzos)

Insumos: issue #213 + `requisito_sanidad.md` §5/§12/§13 (SAN-010..SAN-014, SAN-050/052/060/080/081, KPI-10, RN-041/042, T-001/004). Reutiliza de #209: `CatalogoProductosSanitariosMobile` + `FormularioProductoSanitario` (catálogo mobile SAN-013), `listarCatalogoSanidadFn` + CRUD. De #210: `ListadoEntradasAlmacen` + `FormularioEntradaAlmacen` (SAN-014), `listarEntradasAlmacenFn`/`registrarEntradaAlmacenFn`. De #211: `FormularioVacuna` con `productoIdInicial`/`animalesIdsIniciales` (precarga SAN-011), `registrarAplicacionFn`/`listarAnimalesSanidadFn`. De #212: `agruparRefuerzosPorSemana` + `RefuerzoPendienteAgrupado.animalIds` (SAN-052, dominio `packages/dominio/src/sanidad.ts`), `listarProximasPanelSanidadFn`/`listarStockPanelSanidadFn` (misma forma, reutilizables), `DrizzlePanelSanidadAdapter.listarProximasAgrupadasPorProducto`/`.listarStockPanel`, ruta `sanidad.tsx` (SAN-001), shell `_app.tsx` con BottomNav estándar (SAN-080, sin `dark:`). Patrón responsive: `useMatchMedia` ya existe en `animal-crud.tsx` (exportar a `packages/ui/src/lib/`) y los tests mockean `window.matchMedia` (ver `metric-hero-mobile-only.test.ts`). Fuera de alcance: motor notificaciones + card Inicio (SAN-070 → #214); Eventos v1.1 del drawer; E2E TS-004(2) (cierre épica #207); cambios de dominio `packages/dominio`.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 900–1300 |
| 400-line budget risk | High |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

Sesión con presupuesto 4000 líneas (preflight `delivery_strategy=single-pr`); este change es 100% UI + wiring (sin schema, sin migraciones, sin T-002 nuevo) — encaja en una sola PR con excepción de tamaño justificada, alineada con la cadencia #209/#210/#211/#212 ya cerradas como PRs individuales de 1400–2100 líneas.

### Work units

| Unit | Goal | PR | Focused test | Runtime harness | Rollback |
|------|------|----|--------------|-----------------|----------|
| 1 | `RefuerzoCard` + secciones "ESTA SEMANA" / "PRÓXIMA SEMANA" / "STOCK CRÍTICO" (SAN-011/012) | 1 | `pnpm vitest run packages/ui -t refuerzo-card` | N/A — componente jsdom | Borrar `refuerzo-card.tsx` + `seccion-refuerzos.tsx` |
| 2 | `TabsSanidad` (3 pills ariadb) + `SanidadMobileView` orquestador (SAN-010) | 1 | `pnpm vitest run packages/ui -t sanidad-mobile` | N/A — componente jsdom | Borrar `tabs-sanidad.tsx` + `sanidad-mobile-view.tsx` |
| 3 | `useMatchMedia` exportable + switch responsive en `sanidad.tsx` (mobile < 768px) + Drawer precargado (SAN-011, §13.11 2-tap) | 1 | `pnpm vitest run apps/web -t sanidad-mobile-route` | N/A — runners indisponibles; SSR cubierto por test de integración de ruta con `matchMedia` mock | Revertir `sanidad.tsx` al panel desktop; UI mobile queda en `packages/ui` sin ruta |
| 4 | Tab Catálogo (wrapper CRUD SAN-060) + Tab Almacén (lista + FAB) cableados a server functions existentes | 1 | `pnpm vitest run apps/web -t sanidad-mobile-route` | Idem U3 | Revertir los wrappers en `sanidad-mobile-view.tsx` |

Dependencias: U1 → (dominio listo, sin cambios); U2 → U1; U3 → U2; U4 en paralelo a U3.

## Restricciones transversales

- TDD RED→GREEN; cada test nombra su regla (TS-001); dominio en español (T-003); sin `any`; sin `dark:` (SAN-081/T-004); RBAC por permiso, nunca por rol (PE-001); target táctil ≥44px en filas/botones (SAN-080, assert explícito en test).
- Reutilizar componentes y server functions existentes; no reescribir lógica; no tocar `packages/dominio` salvo bug.
- Frontera #211: `RefuerzoCard.onRegistrarAplicacion(productoId, animalIds)` conecta con el `FormularioVacuna` precargado que ya acepta `productoIdInicial` + `animalesIdsIniciales`; no tocar el drawer.
- Server functions reutilizadas: `listarProximasPanelSanidadFn` + `listarStockPanelSanidadFn` (de #212) atienden Refuerzos y STOCK CRÍTICO; misma autorización PE-002/SAN-063; degradación por card igual al panel (CM-042).
- `pnpm turbo build` es el gate crítico (lección PR #238/#247): ningún `import` desde cliente a `*.server.*`; los wrappers `sanidad-mobile.ts` (módulo público bundleable) hacen lazy import del harness `.server.ts`.

## Phase 1 — Unit 1: RefuerzoCard + secciones

- [x] 1.1 RED: `packages/ui/tests/refuerzo-card.test.tsx` — periodos SAN-052 con contadores ("ESTA SEMANA (N)" / "PRÓXIMA SEMANA (N)"); cada `RefuerzoCard` muestra producto+propósito, "N animales · vence {fecha}"; botón "Registrar aplicación" tap → `onRegistrarAplicacion(productoId, animalIds)`; tap en card → mismo callback (precarga SAN-011). Target táctil ≥44px en botón y card (SAN-080, assert `getBoundingClientRect`).
- [x] 1.2 RED: `packages/ui/tests/seccion-refuerzos.test.tsx` — sección "STOCK CRÍTICO" muestra hasta 4 productos con badge Agotado / "N dosis" (SAN-012/KPI-10); sin stock → empty state "Sin productos críticos."; gating por permiso `sanidad:ver` (PE-001).
- [x] 1.3 GREEN: `packages/ui/src/ganado/refuerzo-card.tsx` y `seccion-refuerzos.tsx`; tokens semánticos (`exito`/`alerta`/`peligro`), sin `dark:`; export aditivo en `index.ts`.

## Phase 2 — Unit 2: TabsSanidad + SanidadMobileView

- [x] 2.1 RED: `packages/ui/tests/sanidad-mobile-view.test.tsx` — 3 tabs Catálogo|Almacén|Refuerzos; tab Refuerzos default (SAN-010); selección cambia contenido (no URL); cada tab respeta su prop de permisos (SAN-060); header "Sanidad" siempre visible; `TabsSanidad` con `role="tablist"` + `aria-selected` correcto.
- [x] 2.2 GREEN: `packages/ui/src/ganado/tabs-sanidad.tsx` (pills ariadb, 3 opciones, mismo lenguaje visual que `PillsSegmentadas` pero extendido) y `sanidad-mobile-view.tsx` orquestador que renderiza el tab activo; export aditivo.

## Phase 3 — Unit 3: useMatchMedia + switch responsive + Drawer precargado

- [x] 3.1 RED: `packages/ui/tests/use-match-media.test.ts` — SSR-safe (default `true`); suscripción a cambios; cleanup del listener. Exportar `useMatchMedia` desde `packages/ui/src/lib/use-match-media.ts` (refactor del helper local en `animal-crud.tsx` línea 1427) sin cambio de comportamiento.
- [x] 3.2 RED: extender `apps/web/tests/sanidad-panel-route.test.tsx` — viewport < 768px (matchMedia mock `(max-width: 767px)` matches) renderiza `SanidadMobileView` con `Refuerzos` tab y NO el panel desktop; viewport ≥ 768 sigue mostrando `PanelSanidad` (no regresión #212). Drawer de aplicación cableado a `FormularioVacuna` con `productoIdInicial` + `animalesIdsIniciales` desde `RefuerzoCard.onRegistrarAplicacion`.
- [x] 3.3 RED: §13 item 11 — "Registrar aplicación" en `RefuerzoCard` → drawer abierto en 2 taps (Refuerzos tab visible → tap card/drawer inmediato); `aplicado` cierra drawer, `validacion` muestra errores por campo.
- [x] 3.4 GREEN: `apps/web/src/routes/_app/fincas/$fincaId/sanidad.tsx` — switch `useMatchMedia("(max-width: 767px)")`; reutilizar state `abrirRegistroAplicacion`/`abrirEntradaAlmacen`/etc. para mobile y desktop (un solo loader, una sola pareja de drawers).

## Phase 4 — Unit 4: Tab Catálogo + Tab Almacén wiring

- [ ] 4.1 RED: `apps/web/tests/sanidad-mobile-route.test.tsx` — Tab Catálogo: `listarCatalogoSanidadFn` carga filas; `onEditar` abre `FormularioProductoSanitario` en drawer; `onInactivar` con `AlertDialog`; CRUD gateado por `sanidad:crear`/`sanidad:editar` (SAN-060). Sin regresión desktop.
- [ ] 4.2 RED: Tab Almacén: `listarEntradasAlmacenFn` carga; FAB abre `FormularioEntradaAlmacen` en drawer; `registrarEntradaAlmacenFn` cableado (SAN-014); `registrada` cierra drawer, `validacion` muestra errores. Gating `sanidad:crear` (SAN-060).
- [ ] 4.3 GREEN: `apps/web/src/server/sanidad-mobile.ts` (módulo público bundleable) — re-export de los server functions ya existentes que el loader consume (sin lógica nueva); sin `.server.ts` propio.

## Phase 5 — Verificación

- [ ] 5.1 `pnpm turbo test` + `pnpm turbo typecheck` + `biome ci .` + **`pnpm turbo build`** (gate de import-protection, lección PR #238/#247) + `pnpm no-sqlite` (D3) en verde.
- [ ] 5.2 Mapa §13: item 2 → tests 1.1, 3.2 (agrupación SAN-052 consistente desktop/mobile); item 11 → tests 3.2, 3.3 (2-tap precargado SAN-010/011); SAN-012 → test 1.2; SAN-013/014 → tests 3.2 + 4.1/4.2; SAN-060 → tests 2.1, 4.1, 4.2 (gating por permiso); SAN-080 → test 1.1 (assert altura 44px).
- [ ] 5.3 Sin cambios en desktop: snapshot visual del panel + suite `sanidad-panel-route.test.tsx` + `sanidad-shell-wiring.test.tsx` siguen verdes.

## Decisiones resueltas (mantenedor, 2026-08-06)

- **D9 — Routing mobile: elegido (A) switch responsive** en `/fincas/$fincaId/sanidad` con `useMatchMedia("(max-width: 767px)")`. Un solo loader, una sola pareja de drawers. Descartada: sub-ruta `/sanidad/mobile`.
- **D10 — Periodos mobile: elegidos 2 periodos** ("ESTA SEMANA" / "PRÓXIMA SEMANA"). "ESTE MES" queda solo en desktop. Sin cambio de dominio. Descartada: 3 periodos.
- **D11 — Hook responsive: elegido (A) refactor a lib compartido** en `packages/ui/src/lib/use-match-media.ts`. El modelo de implementación es `useEsMovil()` que ya existe en `apps/web/src/configuracion/maestro-form.tsx:128` (no en `animal-crud.tsx` como decía el análisis inicial — corrección del gatekeeper). Export aditivo, sin cambio de comportamiento, SSR-safe default `true`. Descartada: duplicar en la ruta.

## Dependencias y riesgos

- **#214 (SAN-070):** motor notificaciones + card "Requiere acción" del Inicio NO se implementan aquí; este change expone `listarProximasPanelSanidadFn`/`listarStockPanelSanidadFn` como la fuente que #214 consume para el read model. Coherencia de copy "Refuerzos" en ambos ya validada por SAN-052.
- **BottomNav estándar del shell mobile:** ya existe en `packages/ui/src/ganado/bottom-nav.tsx` (5-slot con FAB); este change no lo toca. SAN-080 se aplica a filas/botones dentro de los tabs.
- **E2E TS-004(2) — flujo offline:** fuera de este change (cierre épica #207); el guardado de la aplicación usa `registrarAplicacionFn` (#211) con el contrato ya verificado en `sanidad-registro-contract.test.ts`.
- **Tamaño 900–1300 líneas:** encaja dentro del presupuesto de sesión 4000 (`delivery_strategy=single-pr` pre-aprobado); si el equipo prefiere PRs <400, partir entre U1+U2 y U3+U4 sin cambio de dependencias. Sin migraciones ni cambios de schema, rollback de la PR es reversible sin efectos colaterales.
- **Card "STOCK CRÍTICO" comparte datos con la sección "Stock" del panel desktop:** mismo `listarStockPanelSanidadFn`; sin divergencia de datos; si #214 redefine el formato, ajustar acá en una segunda iteración.
