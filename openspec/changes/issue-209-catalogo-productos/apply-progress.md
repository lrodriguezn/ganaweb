# Apply Progress: Issue #209 — Catálogo de productos sanitarios

**Change**: `issue-209-catalogo-productos` · **Rama**: `feat/issue-209-sanidad-catalogo`
**Modo**: Strict TDD (RED→GREEN por work unit) · **Artefactos**: openspec
**Delivery**: single-pr con **size:exception aprobado por el mantenedor**
(forecast 1700–2200 líneas; review_budget 800 con excepción vigente).

## Estado por work unit

| Unit | Alcance | Estado | Commit |
|------|---------|--------|--------|
| U1a | Dominio: validación SAN-020/023 + fallback T-001 | ✅ Completo | `fb51869` |
| U1b | Aplicación: puerto + 4 casos de uso (CM-042) | ✅ Completo | `0d67825` |
| U2 | Adaptador Drizzle (RN-041, T-001, SAN-023) | ✅ Completo | `0a47483` |
| U3 | Server functions RBAC (PE-002, SAN-061/063) | ✅ Completo | `0264ee6` |
| U4 | UI reutilizable desktop/mobile + formulario | ✅ Completo | `d88e381` |
| Verificación | turbo test + typecheck + biome ci | ✅ Verde | (este commit) |

## TDD Cycle Evidence

| Tarea | Archivo de test | Capa | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|-------|-----------------|------|------------|-----|-------|-------------|----------|
| 1.1/1.2 | `packages/dominio/tests/producto-sanitario.test.ts` | Unit | ✅ 151/151 | ✅ 17 failing (imports inexistentes) | ✅ 17/17 | ✅ 17 casos (feliz + borde por regla) | ✅ helpers extraídos |
| 1.3–1.5 | `packages/aplicacion/tests/catalogo-producto-sanitario-use-cases.test.ts` | Unit | ✅ 127/127 | ✅ 14 failing | ✅ 14/14 | ✅ scope/duplicado/umbral 15 vs default | ✅ proyección `datosProductoSanitarioDesdeRecord` |
| 2.1/2.2 | `packages/db/tests/catalogo-producto-sanitario-infrastructure.test.ts` | Unit (db fake) | ✅ 163/163 | ✅ collect fail (módulo inexistente) | ✅ 15/15 | ✅ conflicto/stock/umbral/soloActivos | ➖ ya limpio |
| 3.1/3.2 | `apps/web/src/server/sanidad-catalogo-actions.test.ts` | Unit (harness + getSession stub) | ✅ 401/401 | ✅ collect fail | ✅ 14/14 | ✅ 4 acciones × denegación/permiso | ➖ ya limpio |
| 4.1/4.2 | `packages/ui/tests/catalogo-productos-sanitarios.test.tsx` | Component (jsdom) | ✅ 573/573 | ✅ collect fail | ✅ 11/11 | ✅ desktop+mobile, dialogo, errores, precarga | ✅ CampoTexto extraído (complejidad 18→ok) |

## Work Unit Evidence

| Unit | Focused test (comando → resultado) | Runtime harness | Rollback boundary |
|------|------------------------------------|-----------------|-------------------|
| U1 | `pnpm --filter @ganaweb/dominio exec vitest run tests/producto-sanitario.test.ts` → 17/17 pass; `pnpm --filter @ganaweb/aplicacion exec vitest run tests/catalogo-producto-sanitario-use-cases.test.ts` → 14/14 pass | N/A — capas puras (dominio/aplicación sin I/O) | Borrar `producto-sanitario.ts` + test y revertir exports de `index.ts`; #208 intacto |
| U2 | `pnpm --filter @ganaweb/db exec vitest run tests/catalogo-producto-sanitario-infrastructure.test.ts` → 15/15 pass | N/A — runners Postgres indisponibles en el entorno (DB_SMOKE); el path runtime real lo cubre el harness de U3 y el smoke de #208 para la vista 0007 | Borrar `catalogo-producto-sanitario-infrastructure.ts` + test y la entrada de `package.json#exports` |
| U3 | `pnpm --filter @ganaweb/web exec vitest run src/server/sanidad-catalogo-actions.test.ts` → 14/14 pass | Harness + `getSession` stub (denegaciones y delegación); runtime real cableado vía `createSanidadCatalogoRuntimeHarness` + `getAuthorizedSession` (patrón configuracion) | Borrar `sanidad-catalogo-actions.server.ts` + test y la entrada aditiva en `vitest.config.ts` |
| U4 | `pnpm --filter @ganaweb/ui exec vitest run tests/catalogo-productos-sanitarios.test.tsx` → 11/11 pass | N/A — sin ruta aún (el shell `/fincas/$fincaId/sanidad` es de #212/#213) | Borrar los 2 componentes + test y el export del barrel |

## Verificación final (Phase 5)

- `pnpm turbo test` → **13/13 tasks**: dominio 168 pass · aplicacion 141 pass ·
  db 178 pass + 36 skipped (smoke DB_SMOKE) · ui 590 pass · web 415 pass.
- `pnpm turbo typecheck` → **13/13 tasks** sin errores.
- `pnpm exec biome ci .` → **limpio** (398 archivos, 0 errores, 0 warnings).
- `pnpm depcruise` → 0 errores; los warnings de los archivos nuevos son del
  mismo perfil que `configuracion-actions.server.ts` (imports dinámicos de
  sesión/E2E), patrón establecido.
- Criterios §13: item 5 (umbral por puerto, T-001) cubierto en U1b/U2;
  item 6 (inactivar sin borrado, RN-050/SAN-021) en U1b/U2/U4; item 10
  (RBAC server + gating por permiso) en U3/U4; item 13 (enum inválido
  `{campo, detalle}`) en U1a.

## Decisiones registradas

1. **Permiso del cambio de estado**: SAN-060 lista `sanidad:ver/crear/editar/anular`
   y "no se solicitan acciones nuevas"; el esquema no define `sanidad:inactivar`.
   El cambio de estado del catálogo (única baja, RN-050) se protege con
   `sanidad:anular` (documentado en el header de `sanidad-catalogo-actions.server.ts`).
2. **T-001**: el umbral se lee de `config_parametros_finca` vía
   `obtenerStockMinimoDosis`; el adaptador devuelve `null` si la finca no
   tiene el parámetro y el caso de uso aplica `STOCK_MINIMO_DOSIS_DEFAULT=20`
   (fallback documentado, valor del seed). Nunca hardcodeado en consultas.
3. **IA-002**: `productos_sanitarios` sin `usuario_creado_por` — el insert
   del adaptador lo verifica explícitamente en tests; PE-006 queda para eventos.
4. **Desviaciones menores del plan** (sin cambio de alcance):
   - Tests en `tests/` (no `src/`): el include de vitest de dominio/aplicacion/db
     es `tests/**/*.test.ts`; allí viven todos los tests existentes.
   - El formulario vive en su propio archivo `formulario-producto-sanitario.tsx`
     (el plan lo nombra); el catálogo en `catalogo-productos-sanitarios.tsx`.
   - `datosProductoSanitarioDesdeRecord` (dominio): proyección pura
     `Record<string, unknown>` → entrada tipada, necesaria porque TS no asigna
     registros genéricos a tipos con propiedades requeridas.
5. **Carril #210 respetado**: sin cambios en `sanidad-infrastructure.ts` ni
   `almacen_entradas`; exports compartidos sólo aditivos (barrels, `package.json`
   del db, include de vitest).

## Bloqueos

Ninguno.
