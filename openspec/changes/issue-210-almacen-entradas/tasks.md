# Tasks: Sanidad — Almacén, entradas append-only (Issue #210)

## Review Workload Forecast

| Campo | Valor |
|---|---|
| Estimated changed lines | 1.000–1.300 |
| 800-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (U1–U3) → PR 2 (U4) → PR 3 (U5) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High
800-line budget risk: High

| Unit | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|
| U1–U3 | `pnpm turbo test --filter @ganaweb/aplicacion` | N/A: la ruta es de #212/#213 | dominio/aplicacion/db |
| U4 | `pnpm exec tsx tests/sanidad-almacen-contract.test.ts` (apps/web) | N/A: idem | `sanidad-almacen.server.ts` |
| U5 | `pnpm turbo test --filter @ganaweb/ui` | N/A: idem | componentes nuevos packages/ui |

## Restricciones transversales

- Sin ruta `/fincas/$fincaId/sanidad` ni shell de página (#212/#213). Append-only (D-008, SAN-032): corrección = nueva entrada.
- TDD RED→GREEN; el test nombra la regla (TS-001); dominio en español (T-003); sin `any`.
- Carril #209: no tocar CRUD de `productos_sanitarios`; exports compartidos aditivos.

## Unit 1 — Dominio: `validarEntradaAlmacen` (SAN-030, RN-002)

`packages/dominio/src/sanidad.ts`, `tests/sanidad.test.ts`, export aditivo en `src/index.ts`. Deps: —.

- [x] 1.1 RED: fecha futura rechazada (RN-002); dosis ≤ 0 o no entera rechazada (SAN-030); producto ausente rechazado; precio/comentario opcionales.
- [x] 1.2 GREEN: `validarEntradaAlmacen()` reutilizando `esFechaIso`/`validarFechaEventoSanidad`.

## Unit 2 — Aplicación: `registrarEntradaAlmacen` (PE-002, SAN-061/063)

`packages/aplicacion/src/puertos/sanidad-port.ts`, `src/casos-uso/sanidad/registrar-entrada-almacen.ts` + `index.ts`, `tests/sanidad-use-cases.test.ts`. Deps: U1.

- [x] 2.1 RED: sin `sanidad:crear` → `permiso_denegado` sin tocar puertos (PE-002, SAN-061).
- [x] 2.2 RED: producto de otra finca → `permiso_denegado` (SAN-063); entrada lleva `usuario_creado_por` (PE-006).
- [x] 2.3 RED: fecha futura / dosis ≤ 0 → `validacion` (RN-002, SAN-030); caso feliz → `registrada` con stock de la vista (RN-041), alerta si negativo (SAN-031).
- [x] 2.4 GREEN: unión serializable estilo CM-042; extiende `SanidadLecturaPort.listarEntradasAlmacen` y `SanidadEscrituraPort.registrarEntradaAlmacen` (entrada + outbox atómicos).

## Unit 3 — DB: outbox transaccional (T-002, SAN-030)

`packages/db/src/sanidad-infrastructure.ts` + `tests/sanidad-postgres.test.ts`. Deps: U2. Outbox ya existe (`syncOutbox`, shape `EventoOutbox`): reutilizar; `packages/sync` = solo puertos, no inventar infraestructura.

- [x] 3.1 RED: entrada + fila `sync_outbox` en la MISMA transacción; FK inexistente → `conflicto` sin escribir.
- [x] 3.2 GREEN: `registrarEntradaAlmacen` con `db.transaction` (insert `almacenEntradas` + `syncOutbox`); `listarEntradasAlmacen` por finca ordenada por fecha.
- [x] 3.3 RED/GREEN: tras una entrada, stock de `inventario_sanitario` coincide (RN-041, SAN-031).

## Unit 4 — Web: server functions (PE-002, SAN-061)

`apps/web/src/server/sanidad-almacen.server.ts` + `apps/web/tests/sanidad-almacen-contract.test.ts`. Deps: U3.

- [x] 4.1 RED: invocación directa sin permiso rechazada; finca revalidada; unión mapeada 1:1.
- [x] 4.2 GREEN: `registrarEntradaAlmacenFn`/`listarEntradasAlmacenFn` (`createServerFn`, sesión de `auth.ts`, `SesionSanidad`).

## Unit 5 — UI reutilizable (SAN-014, SAN-031, SAN-032)

`packages/ui/src/ganado/formulario-entrada-almacen.tsx`, `listado-entradas-almacen.tsx`, export aditivo en `src/index.ts`, `packages/ui/tests/`. Deps: U4.

- [x] 5.1 RED: `FormularioEntradaAlmacen` — errores fecha futura / dosis ≤ 0 (RN-002, SAN-030) + nota append-only (D-008).
- [x] 5.2 RED: `ListadoEntradasAlmacen` — fecha/producto/dosis/precio/comentario (SAN-014); stock negativo = alerta de reconciliación, no error (SAN-031).
- [x] 5.3 GREEN: implementar componentes y exports.

## Verificación final

- [ ] 6.1 `pnpm turbo test` + `typecheck` en verde; §13 criterio 14 cubierto por tests que nombran SAN-030/RN-002/T-002.
