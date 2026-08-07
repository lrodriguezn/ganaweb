# Tasks: Issue #211 — Sanidad: registro de aplicación (EventDrawer, captura grupal y offline-first)

Insumos: issue #211 + `requisito_sanidad.md` §8/§11/§13/§14 (SAN-040..SAN-047, RN-002/003/040/042/052/060, T-002, KPI-09). Reutiliza de #208: caso de uso `aplicarProductoSanitario` (unión CM-042 completa: `aplicado|validacion|permiso_denegado|conflicto|error`, RN-040/002/003/042/052, advertencia `captura_tardia`) y `DrizzleSanidadAdapter.registrarAplicaciones` (transacción cabecera+hijas). De #210: patrón outbox transaccional T-002 en `registrarEntradaAlmacen` (fila + `sync_outbox` en la MISMA transacción, `dispositivoId: "server"`). De #212: ruta del panel, `FormularioVacuna` con prop aditiva `productoIdInicial` (SAN-003), loader de catálogo con stock y patrón harness `sanidad-*.server.ts` + módulo público bundleable. Fuera de alcance: tabs mobile y CardRefuerzo (#213), motor de refuerzos/notificaciones/Inicio (#214), Eventos v1.1, E2E TS-004(2) (se verifica al cierre de la épica #207) y la réplica SQLite WASM (Phase 2 diferida).

## Mapa de infraestructura offline (base 6c5323d, verificado)

**Existe hoy:**
- `packages/sync` es interfaces-only (D6): `SyncPushPort`/`EntradaOutbox` (`push-port.ts`), `SyncPullPort`/`CursorPull` (`pull-port.ts`), `ConflictResolverPort` RN-061 (`conflict-resolver-port.ts`), helpers puros en `animal-sync.ts`. Sin transporte ni cliente de sync.
- Esquema PG `sync_outbox`/`sync_tombstones`/`sync_cola_binaria` (`packages/db/src/schema/sync.ts`, migración 0000).
- T-002 ya materializado en `DrizzleSanidadAdapter.registrarEntradaAlmacen` (#210) — patrón a reutilizar.
- `registrarAplicaciones` escribe cabecera + hijas en UNA transacción, pero AÚN sin `sync_outbox` (comentario del puerto: "el outbox se cablea en #209–#211") ← gap backend de #211.
- `FormularioVacuna` (`packages/ui/src/ganado/event-drawer/formulario-vacuna.tsx`): chip de stock, dosis, quick-picks de próxima, "Guardar N registros" y nota de sync ya existen. Faltan: campo fecha, default de dosis por producto, indicador offline y `onGuardar` real (hoy placeholder SAN-047).
- Patrón server function: `sanidad-almacen.server.ts` (harness/deps/getSession/deny) + `sanidad-almacen.ts` (módulo público bundleable con lazy import del harness).

**Falta para RN-060:**
- No hay driver SQLite en el repo (sin dependencias; guard `pnpm no-sqlite`; `openspec/specs/db/spec.md` Req 1 prohíbe SQLite en `packages/db`). El change archivado 2026-07-20 difirió offline (SQLite WASM+OPFS+sync) como "Phase 2, iniciativa de meses".
- Sin transporte push/pull ni réplica cliente: catálogo y animales llegan vía server functions (loader).
- Sin runner SQLite de tests (sdd-init: planned) — la suite dual PG/SQLite no es ejecutable hoy.
- Sin lectura que liste animales EN_FINCA a una fecha para el drawer (`SanidadLecturaPort.obtenerAnimales` exige ids; la ruta hoy pasa `animales={[]}`).

## Review Workload Forecast

Estimated changed lines: 1400–1900
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
| 1 | Outbox T-002 en `registrarAplicaciones` (RN-060/T-002) | 1 | `DB_SMOKE=true pnpm --filter @ganaweb/db exec vitest run tests/sanidad-postgres.test.ts` | Smoke PG real con fixtures autocontenidos (patrón #208) | Revertir bloque outbox de `sanidad-infrastructure.ts`; #208 intacto |
| 2 | Lectura EN_FINCA a la fecha para el drawer (SAN-043) | 1 | Idem U1 + `pnpm vitest run packages/aplicacion -t sanidad` | Smoke PG real (misma suite) | Borrar método aditivo del puerto/adaptador |
| 3 | Server functions RBAC registrar + animales (PE-002/SAN-063) | 2 | `pnpm vitest run apps/web -t sanidad-registro` | Harness + stub `getSession` (patrón `sanidad-almacen-contract.test.ts`) | Borrar `sanidad-registro.server.ts`/`sanidad-registro.ts` |
| 4 | FormularioVacuna: fecha, defaults, indicador offline, precarga animales | 3 | `pnpm vitest run packages/ui -t formulario-vacuna` | N/A — componente jsdom | Revertir props aditivas de `formulario-vacuna.tsx` |
| 5 | Cableado de ruta + precarga producto/animales (SAN-003/011) | 3 | `pnpm vitest run apps/web -t sanidad-panel-route` | N/A — runners indisponibles; SSR cubierto por test de integración de ruta | Revertir `sanidad.tsx` al placeholder SAN-047 |

Dependencias: U3→U1+U2; U4→U3 (contrato); U5→U3+U4.

## Restricciones transversales

- TDD estricto RED→GREEN; cada test nombra su regla (TS-001); dominio en español (T-003), infra en inglés; sin `any`; sin `dark:` (SAN-081/T-004); RBAC por permiso, nunca por rol (PE-001); scope de finca revalidado en servidor, jamás de la URL (SAN-063); uniones serializables (CM-042); atomicidad T-002.
- Server functions nuevas: patrón módulo público bundleable + harness `.server.ts` (lazy import); nunca importar `.server.*` desde rutas; `pnpm turbo build` es el gate de import-protection (lección del fix de CI de #212, PR #238).
- Frontera #213: #211 entrega la API de precarga (producto Y animales) y el drawer que la acepta; CardRefuerzo lo implementa #213. Eventos v1.1: mantener estable el payload de `onGuardar`, sin acoplar el cableado más allá de SAN-047.

## Phase 1 — Unit 1: Outbox transaccional (backend)

- [x] 1.1 RED: extender `packages/db/tests/sanidad-postgres.test.ts` — N>1: `registrarAplicaciones` escribe cabecera `registros_grupales` (`total_animales` = hijas) + N hijas + filas `sync_outbox` (INSERT por cabecera e hijas, payload camelCase) en la MISMA transacción (§13.3, RN-052/T-002); fallo FK (producto inexistente) → ni filas ni outbox (atomicidad); N=1 → sin cabecera, outbox solo de la hija.
- [x] 1.2 GREEN: `packages/db/src/sanidad-infrastructure.ts` — insertar filas `syncOutbox` dentro de la transacción de `registrarAplicaciones`, reutilizando el patrón de `registrarEntradaAlmacen` (#210).
- [x] 1.3 Documentar gap: `anularRegistroGrupal` (#208) no emite outbox; señalarlo en riesgos para que el MVP de sync decida. No ampliar alcance aquí.

## Phase 2 — Unit 2: Lectura EN_FINCA a la fecha (backend)

- [x] 2.1 RED: smoke PG + test de aplicación — método aditivo `listarAnimalesEnFinca(fincaId, fecha)` en `SanidadLecturaPort`: solo animales EN_FINCA a `fecha` (RN-003: venta/muerte con salida ≤ fecha excluye; salida posterior incluye), fila serializable `{id, codigo, nombre}` (CM-042); SQL portable a SQLite (sin rasgos PG-only).
- [x] 2.2 GREEN: implementación en `DrizzleSanidadAdapter` (reutiliza el mapeo de estado/fechas de `obtenerAnimales`); export aditivo en `packages/aplicacion/src/index.ts`.

## Phase 3 — Unit 3: Server functions (web)

- [x] 3.1 RED: `apps/web/tests/sanidad-registro-contract.test.ts` — §13.10: invocación directa sin `sanidad:crear` → `permiso_denegado`; finca del input ≠ finca activa → `finca_no_autorizada` (SAN-063/PE-002); happy path devuelve `aplicado` con `registroGrupalId`, `refuerzosAutoCompletados` y `stockDisponible` (CM-042); `listarAnimalesSanidadFn` exige `sanidad:ver`.
- [x] 3.2 GREEN: `apps/web/src/server/sanidad-registro.server.ts` — `createSanidadRegistroActionHarness`/`RuntimeHarness` + `denySanidadRegistroAccess` (patrón `sanidad-almacen.server.ts`); cablea `aplicarProductoSanitario` con `DrizzleSanidadAdapter` + reloj.
- [x] 3.3 GREEN: `apps/web/src/server/sanidad-registro.ts` — módulo público bundleable (lazy import del harness): `registrarAplicacionFn` (POST) y `listarAnimalesSanidadFn` (GET, SAN-043).

## Phase 4 — Unit 4: FormularioVacuna (ui)

- [x] 4.1 RED: extender `packages/ui/tests/formulario-vacuna.test.tsx` — campo fecha default hoy y fecha futura rechazada al guardar (RN-002); fecha pasada → advertencia de captura tardía sin bloquear el guardado (SAN-043); la dosis toma por default `ml_mg_por_dosis` al elegir producto (SAN-041); indicador "☁ offline" visible con `navigator.onLine=false` (SAN-044); prop aditiva `animalesIdsIniciales` acota la selección inicial (precarga SAN-011); el payload de `onGuardar` incluye `fecha`.
- [x] 4.2 GREEN: cambios aditivos en `packages/ui/src/ganado/event-drawer/formulario-vacuna.tsx`; quick-picks: mantener los actuales (+21 días/+6 meses/+1 año, cubren el ejemplo de SAN-041) — "configurables por producto" no tiene columna en el esquema → decisión D2.

## Phase 5 — Unit 5: Cableado de ruta y precarga (web)

- [ ] 5.1 RED: extender `apps/web/tests/sanidad-panel-route.test.tsx` — "Registrar aplicación" abre el drawer con animales EN_FINCA cargados vía `listarAnimalesSanidadFn` (SAN-043); guardar invoca `registrarAplicacionFn` y con `aplicado` cierra el drawer (SAN-047 resuelto); fila de Próximas abre con producto Y animales precargados (contrato de precarga §13.11; CardRefuerzo es de #213); `validacion` → errores por campo.
- [ ] 5.2 GREEN: `apps/web/src/routes/_app/fincas/$fincaId/sanidad.tsx` — reemplazar el placeholder `onGuardar` por `registrarAplicacionFn` y cargar animales para el drawer.
- [ ] 5.3 GREEN: precarga aditiva — `RefuerzoPendienteAgrupado` expone `animalIds` (dominio, `agruparPorProducto` en `packages/dominio/src/sanidad.ts`) y `onRegistrarAplicacion(productoId, animalIds)` en `panel-sanidad.tsx`; sin precarga el comportamiento actual no cambia.

## Phase 6 — Verificación

- [ ] 6.1 `pnpm turbo test` + `pnpm turbo typecheck` + `biome ci .` + `pnpm turbo build` (gate de import-protection, lección PR #238) en verde; `pnpm no-sqlite` sigue verde.
- [ ] 6.2 Mapa §13: item 3 → test 1.1 (cabecera + `total_animales` = hijas); item 8 → tests 1.1 (escritura + outbox atómicos) y 4.1 (indicador offline) — el flujo completo sin señal→reconexión queda diferido al MVP de sync (decisión D1); item 9 → test 3.1 sobre el caso de uso #208 (`refuerzosAutoCompletados`); item 11 → test 5.1 (contrato de precarga; el flujo de 2 taps se verifica en #213).

## Decisiones resueltas (mantenedor, 2026-08-06)

- **D1 — Transporte/MVP de sync (§14 riesgo 2): elegida (A) server-first.** Este change entrega solo outbox atómico T-002 + semántica offline de UI; el cliente push llega con el MVP de sync (TS-004(2) al cierre de la épica). Descartadas: (B) cola cliente mínima, (C) réplica SQLite WASM+OPFS (Phase 2).
- **D2 — Quick-picks (SAN-041): elegida (A) mantener atajos fijos** (+21 días / +6 meses / +1 año), cubren el ejemplo del requisito. Descartada: columna + CRUD (alcance separado).
- **D3 — Simetría PG/SQLite: elegida (A) consultas portables + suite PG**, paridad SQLite documentada como deuda Phase 2; guard `no-sqlite` intacto. Descartada: runner SQLite ahora.

## Dependencias y riesgos

- **MVP de packages/sync (§14 riesgo 2):** alto — RN-060 "al reconectar sincroniza" solo cierra con el cliente push de D1; este change deja la unidad de sync (outbox) escrita atómicamente. E2E TS-004(2) al cierre de la épica #207, no aquí.
- **#213:** CardRefuerzo y tabs mobile consumen la API de precarga de 5.3; §13 item 11 se verifica completo solo en #213.
- **#214:** el auto-completado de refuerzos (RN-042) desaparece del calendario/notificaciones — #214 lo verifica en su read model; #211 garantiza la escritura.
- **Gap heredado:** `anularRegistroGrupal` sin outbox (tarea 1.3); el MVP de sync decide su tratamiento.
- **Eventos v1.1:** reutilizará el drawer; no acoplar el cableado más allá del contrato estable de `FormularioVacuna`.
