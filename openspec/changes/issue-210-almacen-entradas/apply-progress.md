# Apply Progress — issue-210-almacen-entradas (Issue #210)

- **Modo**: Strict TDD (RED→GREEN por work unit; `strict_tdd: true` en `openspec/config.yaml`).
- **Delivery**: single PR con `size:exception` aprobado por el mantenedor (forecast 1.000–1.300 líneas; review_budget 800 con excepción vigente). Se entrega en un único PR según la decisión del orquestador.
- **Worktree**: `/home/lrodriguezn/ganaweb-worktrees/issue-210-sanidad-almacen` (rama `feat/issue-210-sanidad-almacen`).
- **BD de pruebas**: contenedor `ganaweb-postgres` (postgres:17-alpine) en 127.0.0.1:5432, DB `ganaweb` migrada (incluye vista `inventario_sanitario`, migración 0007). Tests DB con `DB_SMOKE=true DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ganaweb`.

## Estado por unit

| Unit | Estado | Commit |
|---|---|---|
| U1 dominio `validarEntradaAlmacen` | ✅ completo | `c341a13` |
| U2 caso de uso `registrarEntradaAlmacen` | ✅ completo | `88ce8dc` |
| U3 adaptador DB + outbox transaccional | ✅ completo | `945411d` |
| U4 server functions | ✅ completo | `f62b496` |
| U5 componentes UI | ✅ completo | `e77fa16` |
| Higiene (biome + refactor complejidad) | ✅ completo | `22c0ed0` |
| Verificación final (6.1) | ✅ completo | — |

## Evidencia TDD (RED→GREEN→TRIANGULATE→REFACTOR)

| Unit | Archivo de test | Capa | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|
| U1 | `packages/dominio/tests/sanidad.test.ts` | Unit | ✅ 9 casos fallando | ✅ 51/51 | ✅ 9 casos (fecha hoy/pasada/futura/inválida, 4 dosis, 3 productos ausentes, opcionales, acumulación) | ✅ limpio |
| U2 | `packages/aplicacion/tests/sanidad-use-cases.test.ts` | Unit | ✅ 9 casos fallando | ✅ 29/29 (suite 136/136) | ✅ permiso/scope/validación/registrada/alerta/conflicto/error | ✅ helper `revalidarProductoAlmacen` (complejidad) |
| U3 | `packages/db/tests/sanidad-postgres.test.ts` | Integration (Postgres real) | ✅ 4 casos fallando | ✅ 12/12 | ✅ outbox misma transacción, FK→conflicto sin escribir, stock vista, listado por finca | ✅ limpio |
| U4 | `apps/web/tests/sanidad-almacen-contract.test.ts` | Contract (tsx + node:assert) | ✅ ERR_MODULE_NOT_FOUND | ✅ OK | ✅ sin sesión/finca/permiso/validación/unión 1:1/listado | ✅ limpio |
| U5 | `packages/ui/tests/{formulario,listado}-entrada-almacen.test.tsx` | Unit (jsdom) | ✅ 2 suites fallando | ✅ 13/13 (suite 592/592) | ✅ nota D-008, errores RN-002/SAN-030, envío parseado, opcionales null, stock±/vacío | ✅ limpio |

## Evidencia por Work Unit

| Unit | Focused test (comando → resultado) | Runtime harness | Rollback boundary |
|---|---|---|---|
| U1–U3 | `pnpm turbo test --filter @ganaweb/aplicacion` → 136/136; `DB_SMOKE=true … vitest run tests/sanidad-postgres.test.ts` → 12/12 | N/A: la ruta `/fincas/$fincaId/sanidad` pertenece a #212/#213 | `packages/dominio/src/sanidad.ts`, `packages/aplicacion/src/{puertos/sanidad-port.ts,casos-uso/sanidad/registrar-entrada-almacen.ts}`, `packages/db/src/sanidad-infrastructure.ts` |
| U4 | `pnpm exec tsx tests/sanidad-almacen-contract.test.ts` (apps/web) → `sanidad-almacen-contract: OK` | N/A: ídem | `apps/web/src/server/sanidad-almacen.server.ts` |
| U5 | `pnpm turbo test --filter @ganaweb/ui` → 592/592 | N/A: ídem | `packages/ui/src/ganado/{formulario,listado}-entrada-almacen.tsx` |

## Verificación final (6.1) — exacta

- `pnpm turbo test --force` → **Tasks: 13 successful, 13 total** · exit 0. (Por paquete: dominio sanidad 51, aplicacion 136, db 163 pass + 40 skipped sin smoke / 202 pass + 1 skipped con `DB_SMOKE=true`, ui 592, web 401.)
- `pnpm turbo typecheck --force` → **Tasks: 13 successful, 13 total** · exit 0.
- `pnpm exec biome ci .` → **Checked 389 files** · 0 errors · 0 warnings · exit 0.
- §13 criterio 14 cubierto: append-only + outbox misma transacción (T-002) y rechazo de fecha futura / dosis ≤ 0 (SAN-030, RN-002) por tests que nombran explícitamente esas reglas en dominio, aplicacion y db.

## Decisiones registradas

1. **UI sin dependencia nueva**: `packages/ui` no depende de `@ganaweb/aplicacion` ni de `dominio` (dependency-cruiser). Los componentes reciben los errores `{campo: detalle}` ya resueltos por la capa de aplicación vía props (`errores?: Record<string, string>`), igual que `animal-crud.tsx` (`fieldErrors`). El rechazo real lo garantiza dominio + caso de uso + server function (U1/U2/U4).
2. **Payload del outbox en camelCase** (`{ id, productoId, fecha, dosis, precioPorDosis, comentario, usuarioCreadoPor }`), siguiendo la convención de `outboxBase` en `casos-uso/animales/index.ts`.
3. **Orden del listado**: `fecha DESC, created_at DESC` (lo más reciente primero); el requisito no fija orden.
4. **Permiso del listado (`sanidad:ver`)** se revalida en el harness web (no hay caso de uso de lectura), misma lógica de módulo que `tienePermisoSanidad` del #208 (sin wildcard `*:*`, consistente con el seed por módulo).
5. El harness web sigue el patrón de `animal-actions.server.ts`: `createServerFn` + validator + harness inyectable (`deps`, `getSession`) para tests de contrato.
6. **Scope por finca (SAN-063)**: `almacen_entradas` no tiene `finca_id`; `listarEntradasAlmacen` acota por inner join con `productos_sanitarios`, y el `fincaId` de la fila `sync_outbox` lo aporta el caso de uso tras revalidar el producto (nunca de la URL).
7. **Carril #209 respetado**: no se tocó el CRUD de `productos_sanitarios`; los exports compartidos (`index.ts` de dominio/aplicacion/ui y `sanidad-port.ts`) recibieron solo adiciones.

## Bloqueos

Ninguno. Todas las units completas y verificación final en verde.
