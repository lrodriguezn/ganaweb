# Tasks: Issue #214 — Sanidad: motor de refuerzos, notificaciones y alertas en Inicio

## Insumos

Issue #214 + `requisito_sanidad.md` §9 (SAN-050..SAN-052), §10 (SAN-070..SAN-072), §13 ítems 2/9/12, §14 riesgo 2 (D1 sync MVP), §15; KPIs/RN/D referenciados: KPI-09, RN-042, RN-061, D-003, D-004, T-001, T-002, T-004, SAN-061, SAN-063.

**Reutilización de #208/#211/#212 (base b52a303):**

- `packages/dominio/src/sanidad.ts` ya implementa SAN-050 (`esRefuerzoPendienteSanidad`), SAN-052 (`agruparRefuerzosPorSemana`, `inicioSemanaIso`, `finSemanaIso`, `sumarDiasAFechaIso`), `RefuerzoPendienteAgrupado.animalIds`, `VENTANA_REFUERZOS_DIAS = 30`. No se duplica.
- `packages/db/src/sanidad-panel-infrastructure.ts::DrizzlePanelSanidadAdapter.listarRefuerzosPendientes` ya filtra `estadoAnimalKey=0` (EN_FINCA) y `sinGruposAnulados()` (RN-051) → el efecto RN-042 sobre lecturas ya existe.
- `aplicarProductoSanitario` (#211) emite `refuerzosAutoCompletados: string[]`; la query del panel refleja la auto-completación porque solo la última aplicación por (animal, producto) puede estar pendiente.
- Patrón server function: módulo público bundleable `*.ts` (lazy import) + `*.server.ts` con `createXxxActionHarness`/`createXxxRuntimeHarness`/`denyXxxAccess`/`RuntimeDepsFactory`; gate crítico `pnpm turbo build` (import-protection, lección PR #238).
- Token `--dom-sanidad: #c7643b` ya mapeado en `packages/ui/src/styles/globals.css:71`; Ficha Animal (`animal-crud.tsx`/`timeline.tsx`) ya usa `bg-dom-sanidad-bg text-dom-sanidad`. SAN-071 = verificación pura.

**Fuera de alcance:** #213 (UI mobile), E2E TS-004(2) (cierre de la épica), tabla `tareas` (D-004 — v1 usa `notificaciones` + vista Refuerzos como calendario), Eventos v1.1 UI (consume el contrato canónico de #244 sin acoplamiento), definición de transición sana/enferma (D-003).

## Mapa de infraestructura de notificaciones (base b52a303)

**Existe hoy:**

- Tablas Drizzle declaradas en `packages/db/src/schema/notificaciones.ts` y materializadas en migración 0000: `notificaciones` (id, finca_id, usuario_id, tipo, titulo, mensaje, entidad_tipo, entidad_id, leida, fecha_evento, created_at, activo), `notificaciones_preferencias` (usuario_id, tipo, canal_inapp, canal_email, canal_push, dias_anticipacion default 7, activo), `notificaciones_push_tokens` (push tokens — no usados en v1).
- Índices ya creados: `idx_notificaciones_finca_activo`, `idx_notificaciones_finca_leida`, `uq_notificaciones_preferencias (usuario_id, tipo)`.

**Falta para SAN-051 (RN-042):**

- Puerto en `packages/aplicacion/src/puertos/notificaciones-port.ts` (lectura + escritura, `TipoNotificacion = "refuerzo_vacuna" | ...`).
- Dominio en `packages/dominio/src/notificaciones.ts` (validador de `TipoNotificacion`, constante `DIAS_ANTICIPACION_DEFAULT = 7`, regla `calcularFechaNotificacionRefuerzo(proximaDosis, diasAnticipacion)`).
- Adaptador Drizzle en `packages/db/src/notificaciones-infrastructure.ts` (insertar atómico en la misma transacción de la aplicación — D1 server-first).
- Server function con módulo público bundleable + harness (RBAC `sanidad:ver` para lectura; escritura solo server-side).
- Cableado en `DrizzleSanidadAdapter.registrarAplicaciones` (#211) que cree las notificaciones `refuerzo_vacuna` para cada aplicación con `proximaDosis` futura, dentro de la MISMA transacción que las filas y el `sync_outbox` (T-002/RN-060).
- Migración aditiva 0010 (opcional) solo si hace falta un índice adicional sobre `(finca_id, tipo, leida, activo)` para la consulta del feed de Inicio; si el índice `(finca_id, activo)` cubre, no se crea.

## Review Workload Forecast

Estimated changed lines: 1800–2500 (dominio + 1 puerto + 1 adaptador + server fn + tests + UI Inicio + verificación SAN-071).
Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High
4000-line budget risk: Low

Split justificado por work units (single PR con `size:exception`; el orquestador preeligió `delivery_strategy: single-pr` con presupuesto de sesión 4000 líneas; el tamaño sigue dentro del presupuesto pero excede el default 400/PR).

### Work units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| U1 | Dominio notificaciones + constantes SAN-051 | 1 (size-exception) | `pnpm vitest run packages/dominio -t notificacion` | N/A — puro | Borrar `packages/dominio/src/notificaciones.ts`; revertir export en `index.ts` |
| U2 | Puerto de notificaciones (lectura + escritura) | 1 | `pnpm vitest run packages/aplicacion -t notificacion-port` | N/A — type-only | Borrar `packages/aplicacion/src/puertos/notificaciones-port.ts`; revertir export |
| U3 | Adaptador Drizzle notificaciones | 1 | `DB_SMOKE=true pnpm --filter @ganaweb/db exec vitest run tests/notificaciones-postgres.test.ts` | Smoke PG con fixtures autocontenidos (patrón #208) | Borrar `packages/db/src/notificaciones-infrastructure.ts`; sin migración nueva |
| U4 | Cableado atómico de notificación en `aplicarProductoSanitario` (RN-042, T-002) | 1 | Idem U3 + `pnpm vitest run packages/aplicacion -t sanidad-registro` | Smoke PG con la misma suite (atomicidad) | Revertir inserciones de `notificaciones` dentro de `DrizzleSanidadAdapter.registrarAplicaciones`; #208/#211 intactos |
| U5 | Dominio + puerto del dashboard Inicio (SAN-070, D-003, SAN-072 placeholder) | 1 | `pnpm vitest run packages/dominio packages/aplicacion -t dashboard-inicio` | N/A — puro + type-only | Borrar `packages/dominio/src/dashboard-inicio.ts` y `packages/aplicacion/src/puertos/dashboard-inicio-port.ts` |
| U6 | Adaptador Drizzle dashboard Inicio (reusa `DrizzlePanelSanidadAdapter` + filtro RN-042) | 1 | `DB_SMOKE=true pnpm --filter @ganaweb/db exec vitest run tests/dashboard-inicio-postgres.test.ts` | Smoke PG | Borrar `packages/db/src/dashboard-inicio-infrastructure.ts` |
| U7 | Server functions Inicio (RBAC + degradación, SAN-070) | 1 | `pnpm exec tsx apps/web/tests/dashboard-inicio-contract.test.ts` | Harness + stub `getSession` (patrón `sanidad-panel-contract.test.ts`) | Borrar `dashboard-inicio.server.ts`/`dashboard-inicio.ts` |
| U8 | UI: route Inicio cableada + verificación SAN-071 (color #C7643B) + SAN-072 placeholder | 1 | `pnpm vitest run apps/web -t dashboard-inicio` + `pnpm vitest run packages/ui -t sanidad-color` | N/A — jsdom | Revertir `index.tsx` a `MOCK_ALERTAS`/`MOCK_METRICS`; sin tocar tokens |

Dependencias: U3→U1+U2; U4→U1+U2+U3; U5→U1 (reutiliza `RefuerzoPendienteAgrupado`); U6→U5; U7→U5+U6; U8→U7.

## Restricciones transversales

- TDD estricto RED→GREEN; cada test nombra su regla (TS-001); dominio en español (T-003), infra en inglés; sin `any`; sin umbrales hardcodeados (T-001 — `dias_anticipacion` siempre desde `notificaciones_preferencias` o default 7 del dominio); sin `dark:` (SAN-081/T-004); RBAC por permiso, nunca por rol (PE-001); scope de finca revalidado en servidor, jamás de la URL (SAN-063); uniones serializables (CM-042); atomicidad T-002/RN-060.
- Decisiones D1/D2/D3 ya tomadas en #211: D1 server-first (notificaciones en la MISMA transacción que la aplicación — `dispositivoId: "server"`); D2 quick-picks fijos (no aplica a #214); D3 portables + suite PG, sin SQLite, guard `pnpm no-sqlite` intacto.
- Server functions nuevas: patrón módulo público bundleable + `*.server.ts` con harness (`deps`, `getSession`, `deny*`); nunca importar `.server.*` desde rutas; `pnpm turbo build` valida import-protection.
- Frontera #213: #213 consume `RefuerzoPendienteAgrupado.animalIds` que ya existe; este change no añade campos al dominio — si #213 requiere nuevos campos, los pide en su propio worktree.
- Frontera E2E TS-004(2): NO se implementa en este change (cierre de épica #207). El test de integración del cableado atómico cubre el efecto server-side.
- Frontera Eventos v1.1: el contrato canónico (#244) emite outbox para `aplicaciones_sanitarias`; las notificaciones de refuerzo se insertan en la misma transacción que las filas + el outbox (T-002). Sin acoplar al consumidor de Eventos.

## Phase 1 — Unit 1: Dominio de notificaciones

- [x] 1.1 RED: `packages/dominio/tests/notificaciones.test.ts` — `TipoNotificacion = "refuerzo_vacuna"` es el único tipo válido en v1; tipo vacío/no enumerado rechazado con `{ campo, detalle }`; `calcularFechaNotificacionRefuerzo(proximaDosis, diasAnticipacion)` devuelve `proximaDosis - diasAnticipacion` (regla SAN-051/RN-042); `DIAS_ANTICIPACION_DEFAULT = 7` constante; `validarPreferenciasNotificacion({ usuarioId, tipo, diasAnticipacion })` rechaza `diasAnticipacion <= 0` o no entero con error `{ campo, detalle }`.
- [x] 1.2 GREEN: `packages/dominio/src/notificaciones.ts` con `TipoNotificacion`, `TIPOS_NOTIFICACION`, `DIAS_ANTICIPACION_DEFAULT`, `calcularFechaNotificacionRefuerzo`, `validarPreferenciasNotificacion`; export aditivo en `packages/dominio/src/index.ts`.

## Phase 2 — Unit 2: Puerto de notificaciones

- [x] 2.1 RED: `packages/aplicacion/tests/notificaciones-port.test.ts` — el contrato type-only exige: `listarPendientes(fincaId, usuarioId, hoy): Promise<readonly NotificacionSanidad[]>` (filtra `activo=1` y `leida=0`, ventana ≥ hoy), `listarPreferencias(usuarioId): Promise<readonly PreferenciaNotificacion[]>` (left-join con defaults), `obtenerPreferencia(usuarioId, tipo)`, `marcarLeida(notificacionId)`, `insertarNotificacionesEnTx(tx, notificaciones): Promise<void>` (dentro de la transacción externa — D1 server-first).
- [x] 2.2 GREEN: `packages/aplicacion/src/puertos/notificaciones-port.ts` con tipos serializables (CM-042) y `NotificacionesLecturaPort` + `NotificacionesEscrituraPort`; export aditivo en `packages/aplicacion/src/index.ts`.

## Phase 3 — Unit 3: Adaptador Drizzle de notificaciones

- [x] 3.1 RED: `packages/db/tests/notificaciones-postgres.test.ts` — smoke PG (patrón #208): inserta preferencia `(usuario, "refuerzo_vacuna", diasAnticipacion=7)` y verifica que `obtenerPreferencia` la lee; `listarPendientes` filtra `activo=1 AND leida=0 AND fecha_evento >= hoy` y ordena por `fecha_evento asc`; `marcarLeida` actualiza `leida=1` solo para la fila de la finca del input; `insertarNotificacionesEnTx` falla-closed si la fila referencia una finca inexistente (FK).
- [x] 3.2 GREEN: `packages/db/src/notificaciones-infrastructure.ts::DrizzleNotificacionesAdapter` implementa el puerto; usa el `tx` externo para `insertarNotificacionesEnTx` (atomicidad con la aplicación y el outbox T-002/RN-060).

## Phase 4 — Unit 4: Cableado atómico en `aplicarProductoSanitario`

- [x] 4.1 RED: extender `packages/db/tests/sanidad-postgres.test.ts` (smoke PG, mismo patrón) — al aplicar un producto con `proximaDosis` futura a N animales, se insertan N filas en `aplicaciones_sanitarias` + (si N>1) 1 fila en `registros_grupales` + filas `sync_outbox` (cabecera e hijas) + filas `notificaciones` tipo `refuerzo_vacuna` con `fecha_evento = calcularFechaNotificacionRefuerzo(proximaDosis, 7)` y `entidad_tipo="aplicacion_sanitaria"`, `entidad_id=aplicacionId` — TODO en la MISMA transacción. Si el animal no tiene preferencia, se usa `DIAS_ANTICIPACION_DEFAULT`. Si la aplicación NO tiene `proximaDosis`, no se crea notificación.
- [x] 4.2 RED: extender `packages/aplicacion/tests/sanidad-registro.test.ts` (o el existente) — el caso de uso `aplicarProductoSanitario` declara la nueva dependencia `notificaciones: NotificacionesEscrituraPort`; el harness de prueba verifica que `insertarNotificacionesEnTx` se invoca con el `tx` y no con `this.db` (misma transacción).
- [x] 4.3 GREEN: `packages/db/src/sanidad-infrastructure.ts` — `DrizzleSanidadAdapter.registrarAplicaciones` recibe la dependencia `notificaciones` y llama `notificaciones.insertarNotificacionesEnTx(tx, ...)` dentro de la misma `db.transaction(...)` ya existente, justo después de insertar las filas de aplicación y el outbox (T-002). Si la inserción de notificaciones lanza, se hace rollback de TODO (atomicidad).
- [x] 4.4 GREEN: `packages/aplicacion/src/casos-uso/sanidad/aplicar-producto-sanitario.ts` — extender `AplicarProductoSanitarioDeps` con `notificaciones: NotificacionesEscrituraPort`; construir la lista de notificaciones a partir de las aplicaciones con `proximaDosis` futura y delegar al adaptador dentro de la misma `tx` (pasada por el adaptador ya existente). El resultado `aplicado` incluye `notificacionesCreadas: number` (cuenta server-side, sin filtrar el detalle).

## Phase 5 — Unit 5: Dominio + puerto del dashboard Inicio

- [x] 5.1 RED: `packages/dominio/tests/dashboard-inicio.test.ts` — predicado `esAlertaRequiereAccion(item)` para SAN-070; `seleccionarAlertasInicio({ refuerzosPorVencer, stockBajo, maximo=5 })` prioriza peligro sobre alerta, dentro de peligro: refuerzos vencidos antes que stock agotado, dentro de cada categoría por fecha ascendente; `placeholderMetricaEnfermos()` (D-003) devuelve `{ id: "enfermos", label: "Enfermos", labelMobile: "Enfermos", value: "0", href: null }`.
- [x] 5.2 RED: `packages/aplicacion/tests/dashboard-inicio-port.test.ts` — `DashboardInicioLecturaPort` con `listarAlertasRequiereAccion(fincaId, hoy): Promise<readonly AlertaAccionInicio[]>` (reusa `listarRefuerzosPendientes` + `listarAlertasStock`; filtra por severidad: refuerzos vencidos = peligro, refuerzos por vencer ≤ 7 días = alerta, stock agotado = peligro, stock bajo = alerta) y `obtenerMetricasEnfermosPlaceholder(): Promise<MetricaEnfermos>` (D-003: valor 0 fijo hasta que se defina la transición).
- [x] 5.3 GREEN: `packages/dominio/src/dashboard-inicio.ts` y `packages/aplicacion/src/puertos/dashboard-inicio-port.ts`; exports aditivos.

## Phase 6 — Unit 6: Adaptador Drizzle del dashboard Inicio

- [x] 6.1 RED: `packages/db/tests/dashboard-inicio-postgres.test.ts` — smoke PG: `listarAlertasRequiereAccion` combina `listarRefuerzosPendientes` (con la lógica de #212) + `listarAlertasStock`, aplica el predicado de severidad y trunca a 5. Verifica: un animal con refuerzo ya auto-completado por #211 (mismo producto con fecha posterior) NO aparece (RN-042/§13.9). Verifica: productos en stock bajo/agotado se traducen a `severidad="peligro" | "alerta"` con `href=/fincas/$fincaId/sanidad?alerta=stock&producto=...`.
- [x] 6.2 GREEN: `packages/db/src/dashboard-inicio-infrastructure.ts::DrizzleDashboardInicioAdapter` que internamente compone `DrizzlePanelSanidadAdapter` y `DrizzleNotificacionesAdapter` (inyección por constructor — sin acoplar a un singleton).

## Phase 7 — Unit 7: Server functions del dashboard Inicio

- [x] 7.1 RED: `apps/web/tests/dashboard-inicio-contract.test.ts` — §13.10 + SAN-063: invocación directa sin `sanidad:ver` → `permiso_denegado`; finca del input ≠ finca activa → `finca_no_autorizada`; happy path devuelve `alertas` (≤ 5 con severidad y `href`) y `metricaEnfermos` (placeholder). Degradación por fuente: si la consulta de refuerzos falla, se devuelven las alertas de stock con `error` por fuente (consistente con #212).
- [x] 7.2 GREEN: `apps/web/src/server/dashboard-inicio.server.ts` — `createDashboardInicioActionHarness`/`RuntimeHarness` + `denyDashboardInicioAccess` (patrón `sanidad-panel.server.ts`); cablea `DrizzleDashboardInicioAdapter`.
- [x] 7.3 GREEN: `apps/web/src/server/dashboard-inicio.ts` — módulo público bundleable (lazy import del harness): `listarAlertasInicioFn` (GET) y `obtenerMetricaEnfermosFn` (GET, D-003 placeholder).

## Phase 8 — Unit 8: UI del Inicio + verificación SAN-071/SAN-072

- [x] 8.1 RED: `apps/web/tests/dashboard-inicio-route.test.tsx` — la ruta `/` carga `alertas` vía `listarAlertasInicioFn` y `metricas` (sólo "Enfermos" por ahora, valor 0 + sin href — D-003); `MOCK_ALERTAS` ya no se usa; la card `Requiere acción` muestra hasta 5 alertas con `severidad`/`href` y navega a `/fincas/$fincaId/sanidad?...` cuando aplica (SAN-070).
- [x] 8.2 RED: `packages/ui/tests/sanidad-color.test.ts` — verifica que el token `--dom-sanidad` resuelve a `#c7643b` en el tema A (`packages/ui/src/styles/globals.css:71`); el tab/timeline Sanidad de la Ficha Animal (`packages/ui/src/ganado/animal-crud.tsx` y `timeline.tsx`) usa `bg-dom-sanidad-bg text-dom-sanidad` (sin reimplementación — SAN-071 verificación).
- [x] 8.3 GREEN: `apps/web/src/routes/_app/index.tsx` — reemplazar `MOCK_ALERTAS` por `listarAlertasInicioFn({ fincaId })`; reemplazar `MOCK_METRICS[3]` (enfermos) por `obtenerMetricaEnfermosFn({ fincaId })`; mantener `MOCK_METRICS[0..2]` (fuera de alcance de #214) hasta que otros sub-issues los cableen. El card `CardAccion` ya existe y consume `AlertaAccion` — sin tocar la UI primitiva.
- [x] 8.4 GREEN: `apps/web/src/lib/fixtures/dashboard.ts` — eliminar `MOCK_ALERTAS` (ya no se usa) o moverlas a un fixture de `dashboard-demo` no importado por la ruta. Mantener `MOCK_METRICS[0..2]` hasta el sub-issue correspondiente.

## Phase 9 — Verificación final

- [x] 9.1 `pnpm turbo test` + `pnpm turbo typecheck` + `biome ci .` en verde.
- [x] 9.2 `pnpm turbo build` en verde (gate crítico de import-protection, lección PR #238 — `*.server.ts` no se importa desde rutas).
- [x] 9.3 `pnpm no-sqlite` en verde (D3 — guard del proyecto).
- [x] 9.4 Mapa §13: ítem 2 → U1 (constante) + #212 dominio ya entregado (verificación cruzada entre desktop y mobile la hace #213); ítem 9 → tests 4.1 + 4.2 + 6.1 (auto-completado fuera del panel y de las notificaciones); ítem 12 → tests 7.1 + 8.1 (card Requiere acción con contexto precargado y ≤ 5).

## Decisiones requeridas

**Ninguna bloqueante.** Decisiones del mantenedor ya tomadas (D1/D2/D3) se aplican; D-003 y D-004 son preguntas futuras fuera del alcance de v1.

- **D-003 (transición sana/enferma):** la métrica "Enfermos" del Inicio queda como placeholder (valor 0, sin navegación). Documentado en Phase 5 (5.1/5.2) y Phase 8 (8.3).
- **D-004 (tabla `tareas`):** no se crea. v1 usa `notificaciones` + vista Refuerzos como calendario, documentado en el header y en `requisito_sanidad.md` §15.
- **`delivery_strategy: single-pr` con `size-exexception`:** el orquestador preeligió esta estrategia; el forecast marca `Decision needed before apply: Yes` para registrar la excepción al budget 400/PR, pero la decisión ya está tomada por la sesión.

## Dependencias y riesgos

- **#211 (registro) — base estable:** `aplicarProductoSanitario` ya implementa la escritura y devuelve `refuerzosAutoCompletados`. La integración de notificaciones (U4) extiende el adaptador Drizzle sin romper contrato del caso de uso; `notificacionesCreadas` se añade al resultado `aplicado` (es aditivo).
- **#213 (mobile) — frontera:** #213 consume `RefuerzoPendienteAgrupado.animalIds` (ya existe) y la misma `agruparRefuerzosPorSemana`; este change no le añade campos. Si #213 requiere nuevos campos del dominio, los pide en su propio worktree.
- **MVP de `packages/sync` (§14 riesgo 2):** sin impacto — D1 server-first entrega la fila `notificaciones` server-side; el cliente push del MVP de sync no es requerido para que la notificación exista en el feed.
- **E2E TS-004(2) (vacuna grupal offline):** NO se verifica en este change; queda para el cierre de la épica #207. La cobertura de integración server-side del cableado atómico se valida con el smoke PG de U4.
- **Eventos v1.1 (#244):** el contrato canónico ya emite outbox para `aplicaciones_sanitarias`; las notificaciones se insertan dentro de la misma transacción. Si más adelante el contrato de Eventos necesita una fila de notificación propia, se coordina en su worktree.
- **Seed de `aplicaciones_sanitarias` (#208):** ya entregado; los fixtures cubren los smoke tests PG de U3/U4/U6.
- **Outbox de notificaciones (futuro):** v1 NO emite outbox para `notificaciones` (es server-side, no requiere sync cliente). Si en v1.1 la app móvil debe ver las notificaciones, se coordina con el MVP de sync.
