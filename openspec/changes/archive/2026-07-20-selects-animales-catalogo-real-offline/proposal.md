# Proposal: Selects de animales (raza, color, potrero, sexo, sector, lote) — datos reales de la base de datos online (Phase 1) + fix selección raza/color

## Intent

Reemplazar los mocks de `apps/web/src/lib/fixtures/animal-form-catalog.ts` (8 selects: raza, color, calidad, potrero, sector, lote, grupo, lugarCompra — sexo ya está en real DB) con datos reales de PostgreSQL vía el patrón `CatalogoGlobalPort` ya establecido para sexo. Resolver el bug BUG-001 (opciones de raza/color se ven pero el click no registra selección) absorbiendo las tareas 2.1–2.3 del change `bug-2026-07-01-formulario-animales`, con discipline de diagnóstico antes de fix (IA-001). **Offline (SQLite WASM + OPFS + sync) queda explícitamente fuera**: es una iniciativa de meses y un change futuro (Phase 2). Phase 1 es online-only con datos reales.

## Scope

### In Scope (Phase 1)

- **2 ports nuevos** en `packages/aplicacion/src/puertos/`:
  - `catalogo-animal-maestro-port.ts` — global, sin scope de finca. Para `config_razas`, `config_colores`, `config_calidad_animal` (tablas con `activo=1`, sin `finca_id`).
  - `catalogo-finca-port.ts` — scope de finca. Para `potreros`, `sectores`, `lotes`, `grupos`, `lugares_compras` (todas con `finca_id` FK).
- **8 use cases** en `packages/aplicacion/src/casos-uso/` (español): `listarCatalogoRaza`, `listarCatalogoColor`, `listarCatalogoCalidad`, `listarPotrerosPorFinca`, `listarSectoresPorFinca`, `listarLotesPorFinca`, `listarGruposPorFinca`, `listarLugaresCompraPorFinca`. Cada uno: decoder estricto, validación, sort estable, DTO UI tipado.
- **2 Drizzle adapters** en `packages/db/src/`:
  - `catalogo-animal-maestro-infrastructure.ts` — implementa `CatalogoAnimalMaestroPort` (tabla inmutable pasada como parámetro del método).
  - `catalogo-finca-infrastructure.ts` — implementa `CatalogoFincaPort` con `listarPorFinca(fincaId, tabla)`.
- **Reautorización de finca (PE-002, PE-003)**: las server functions validan `session.fincaActivaId === fincaId` (reusar `denyAnimalRouteAccess` ya existente en `animal-actions.server.ts:315`).
- **Reemplazo del fixture mock**: `getAnimalFormCatalogOptions()` se conserva solo como fallback, pero `nuevo.tsx` consume un `loadAnimalCatalogs(fincaId)` server loader que compone los 8 catálogos.
- **BUG-001 absorbed** (tasks 2.1–2.3 de `bug-2026-07-01-formulario-animales`): diagnosis-first con datos reales; fix scoped to `SelectConCreacion` solo si reproduce. Cerrar el change anterior con referencia cruzada.
- **Suite TDD** con `pnpm turbo test` — Vitest ya disponible en `packages/ui`, `packages/aplicacion`, `packages/db`; Playwright disponible en `apps/web/tests/e2e/` (ver `apply-progress.md` Slices A–E2). Cobertura 90% en `packages/dominio` cuando se cree código de dominio (este change no toca dominio — es puro application/DB/UI).

### Out of Scope (Phase 1)

- **Offline (SQLite WASM + OPFS + sync)** — `pnpm no-sqlite` guard prohibe SQLite en source. Phase 2, change futuro.
- **Creación de catálogos desde la UI** (`+ Crear nuevo`) — los `+ Crear nuevo` siguen requiriendo `configuracion:crear` (CA-UI-002) y muestran el affordance, pero la acción de creación queda stub por ahora (mismo comportamiento que hoy con mocks).
- **Cambios al dominio** — `packages/dominio` no se toca. Las validaciones de catálogos referenciados por eventos (RN-050) son del dominio existente; este change no agrega reglas.
- **Cambios al seed** — los datos ya están seeded (ver `exploration.md` § 1–6). Solo se reemplazan las fuentes.
- **Sync de catálogos para offline** (Phase 2).
- **Cross-finca scenarios** — los catálogos de finca se filtran por `fincaActivaId` de la sesión (PE-003). No se exponen opciones de otras fincas.

### Absorción de BUG-001

Las tareas 2.1, 2.2, 2.3 de `bug-2026-07-01-formulario-animales` (`RED contract → diagnosticar → GREEN+regresión`) se mueven a este change. La diagnosis ahora tiene un ángulo adicional: con datos reales las IDs del DB seed (`"raza-angus"`, `"col-negro"`) pueden no coincidir con las IDs mock (`"raza-angus"`, `"color-negro"`) — notar el prefijo `col-` vs `color-`. Si esa es la causa raíz, el fix es en los mocks, no en el primitive.

## Capabilities

> Contrato con sdd-spec. La capacidad `animal-crud-ui` ya cubre raza/color/calidad/lugarCompra; este change la extiende con 7 catálogos adicionales + el fix de selección.

### New Capabilities

- `catalogo-animal-offline` — **NO**. Se documenta en `Out of Scope` para que la Phase 2 lo cree con nombre y scope claros (cubre port de lectura offline + sync/seed/refresh).

### Modified Capabilities

- `animal-crud-ui` — extiende el contrato existente con:
  - 7 nuevos catálogos cargados desde DB real (port + UC + adapter por cada uno).
  - Loader async `loadAnimalCatalogs(fincaId)` que reemplaza `getAnimalFormCatalogOptions()` en la ruta create.
  - Filtro de finca (PE-003) para potrero/sector/lote/grupo/lugarCompra.
  - Diagnóstico y fix de BUG-001 absorbido (selection contract con datos reales).

## Approach

### Estrategia técnica

1. **Extender el patrón Sexo**: el `CatalogoGlobalPort` actual es demasiado estrecho (literal `opcion: "sexo"`, solo 3 columnas). Crear dos ports nuevos, NO extender el existente (mantener backward compat con `listarCatalogoSexo`).
2. **Decoders estrictos en application layer**: cada UC valida IDs canónicas, ordena por nombre es-CO, y rechaza duplicados / `activo=0` (mismo patrón que `listarCatalogoSexo:17-22`).
3. **Adapter parametrizado por tabla**: el port global toma la tabla como parámetro para evitar una clase por cada tabla (3 tablas → 1 adapter). El port de finca hace lo mismo.
4. **Composición en `loadAnimalCatalogs(fincaId)`**: server function nueva en `animal-actions.server.ts` que llama los 8 UCs en paralelo, envuelve cada resultado en `{tipo: "disponible" | "no_disponible"}` (patrón `AnimalSexoCatalog`), revalida `session.fincaActivaId === fincaId` para los finca-scoped.
5. **Reuso del harness Sexo**: `createAnimalRuntimeHarness` ya inyecta el port; extender para que también inyecte los 7 nuevos ports (mismo fallback E2E en `e2e-animals-fixture.server.ts`).
6. **BUG-001 diagnosis-first**: primero reproducir con datos reales (¿la opción se ve? ¿el click no llega al onChange? ¿el hidden input no se actualiza?). Si reproduce con datos reales → fix en `SelectConCreacion` o `SelectConCreacionField` (en `packages/ui/src/ganado/animal-crud.tsx`). Si NO reproduce con datos reales → el bug era del mock IDs y se cierra sin tocar primitive.

### Fases

| Phase | Cambio | Alcance | Estado |
|---|---|---|---|
| **Phase 1** | **Este change** | 8 catálogos online desde DB real + BUG-001 fix | **Este proposal** |
| Phase 2 | `catalogo-animal-offline` (futuro) | SQLite WASM + OPFS replica + sync/seed/refresh + reader offline + Service Worker | Out of scope, referenciado aquí |

Límite Phase 1 ↔ Phase 2: Phase 1 entrega selects online con DB real. Phase 2 agrega un read-through cache (online → local; offline → local) sin tocar los contracts de Phase 1 (los UCs reciben un port, el port es swappable).

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `packages/aplicacion/src/puertos/catalogo-animal-maestro-port.ts` | New | Port global para raza/color/calidad. |
| `packages/aplicacion/src/puertos/catalogo-finca-port.ts` | New | Port finca-scoped para potrero/sector/lote/grupo/lugarCompra. |
| `packages/aplicacion/src/casos-uso/listar-catalogo-{raza,color,calidad}.ts` | New | 3 UCs globales con decoder estricto. |
| `packages/aplicacion/src/casos-uso/listar-{potreros,sectores,lotes,grupos,lugares-compra}-por-finca.ts` | New | 5 UCs finca-scoped. |
| `packages/aplicacion/src/index.ts` | Modified | Re-export los 8 nuevos símbolos. |
| `packages/aplicacion/tests/catalogo-{raza,color,calidad,finca}-*.test.ts` | New | Tests TDD por UC. |
| `packages/db/src/catalogo-animal-maestro-infrastructure.ts` | New | Drizzle adapter global. |
| `packages/db/src/catalogo-finca-infrastructure.ts` | New | Drizzle adapter finca-scoped. |
| `packages/db/src/index.ts` | Modified | Re-export los 2 adapters. |
| `packages/db/tests/catalogo-{animal-maestro,finca}-infrastructure.test.ts` | New | Tests de adapter contra DB seeded. |
| `apps/web/src/server/animal-actions.server.ts` | Modified | `loadAnimalCatalogs(fincaId)` server fn; extender harness. |
| `apps/web/src/server/animal-actions.ts` | Modified | `getAnimalCatalogsAction` createServerFn. |
| `apps/web/src/server/e2e-animals-fixture.server.ts` | Modified | Fallbacks E2E para los 8 ports. |
| `apps/web/src/routes/_app/fincas/$fincaId/animales/nuevo.tsx` | Modified | Loader llama `getAnimalCatalogsAction`; pasa `catalogOptions` real. |
| `apps/web/src/routes/_app/fincas/$fincaId/animales/$animalId/editar.tsx` | Modified | Mismo loader si aplica (out-of-scope para Phase 1 si no comparte ruta). |
| `apps/web/src/lib/fixtures/animal-form-catalog.ts` | Modified | Conservar tipos; eliminar valores mock; documentar como fallback. |
| `apps/web/tests/animal-catalogos.test.ts` | New | Loader/action revalidation; finca scope; unavailable state. |
| `tests/e2e/animales.spec.ts` | Modified | Casos E2E con DB real para los 8 selects + BUG-001 fix. |
| `packages/ui/src/ganado/animal-crud.tsx` | Modified | Solo si BUG-001 reproduce: fix de `SelectConCreacionField`. |
| `packages/ui/src/primitives/select-con-creacion.tsx` | Modified | Solo si BUG-001 reproduce en el primitive. |
| `packages/ui/tests/animal-ui.test.tsx` | Modified | BUG-001 regression tests. |
| `openspec/changes/bug-2026-07-01-formulario-animales/tasks.md` | Reference | Tareas 2.1–2.3 marcadas como absorbed-by este change. |

## Risks, Rollback, Dependencies

| Risk | Likelihood | Mitigation |
|---|---|---|
| **Mock-to-real ID mismatch** — DB seed usa `col-negro`, mock usa `color-negro`. Si el form hace `value ===` matching, el hidden input se queda vacío silenciosamente. | **High** | Slice 5 (BUG-001) reproduce primero. Si es la causa, fix es 1 línea en el mock fixture o agregar `id` aliasing en el UC. |
| **BUG-001 duplication** con `bug-2026-07-01-formulario-animales` | **Med** | Absorción explícita de tareas 2.1–2.3 en este change (ver § Scope). Reference cruzada en tasks.md del change anterior. |
| **CatalogoGlobalPort redesign** — el port actual es hardcoded a `"sexo"` y `config_key_values`. | **Med** | NO extender el existente; crear 2 ports nuevos. Mantener `CatalogoGlobalPort` y `DrizzleCatalogoGlobalAdapter` intactos para no romper Slice B anterior. |
| **Finca authorization** (PE-002, PE-003) | **Med** | Reusar `denyAnimalRouteAccess` (ya valida `session.fincaActivaId === fincaId`). Reusar `getAuthorizedSession`. Tests con sesión ajena. |
| **Vitest/Playwright `available: false`** en `config.yaml` | **Low** | El `apply-progress.md` Slices A–E2 demuestra que los runners SÍ están operativos (`pnpm --filter @ganaweb/ui test`, `pnpm exec playwright test`). Tratar el `available: false` como aspiracional; documentar evidencia real. |
| **Cobertura 90% en `packages/dominio`** | **N/A** | Este change NO toca dominio. Cuando se cree código de dominio, se cumple. |
| **Chained PR rebases** (5 PRs) | **Med** | `feature-branch-chain` con PR tracker. Cada child ≤400 líneas. Rebases atómicos. |
| **RN-050 — catálogos referenciados no se eliminan** | **Low** | Solo lectura (Phase 1). La mutation surface sigue siendo la misma que con mocks. |
| **Fixture file removido rompe imports no descubiertos** | **Low** | Mantener `getAnimalFormCatalogOptions` como stub que lanza en runtime; permite rollback. |

### Rollback Plan

Por cada slice (ver § Chained PR Strategy):

- **Slice 1–4**: revert del slice completo. Re-activar `getAnimalFormCatalogOptions()` desde el fixture mock (conservado como stub). Las rutas siguen funcionando con mocks. `CatalogoGlobalPort`/sexo intactos.
- **Slice 5 (BUG-001 fix)**: revert del fix. La diagnosis artifact queda en `openspec/changes/selects-animales-catalogo-real-offline/diagnosis-bug-001.md` como evidencia para futuro. El change `bug-2026-07-01-formulario-animales` reabre tareas 2.1–2.3.
- **Orden de revert**: inverso al apply (5 → 4 → 3 → 2 → 1). Cada revert es atómico.
- **Runbook**: `git revert <merge-sha>` por slice. Validar con `pnpm turbo test && pnpm turbo build`.

### Dependencies

- **Internas**:
  - `packages/aplicacion/src/puertos/catalogo-global-port.ts` (no se modifica; referencia).
  - `packages/aplicacion/src/casos-uso/listar-catalogo-sexo.ts` (no se modifica; patrón).
  - `packages/db/src/catalogo-global-infrastructure.ts` (no se modifica; patrón).
  - `apps/web/src/server/animal-actions.server.ts:199-209` (`loadAnimalSexoCatalog` como referencia).
  - `apps/web/src/server/animal-actions.server.ts:315-326` (`denyAnimalRouteAccess` para reusar).
  - `apps/web/src/server/e2e-animals-fixture.server.ts` (extender con 8 fallback ports).
- **Externas**: ninguna.
- **Schema**: `config_razas`, `config_colores`, `config_calidad_animal`, `potreros`, `sectores`, `lotes`, `grupos`, `lugares_compras` ya existen con seed. Sin migraciones nuevas.

## Chained PR Strategy (feature-branch-chain, force-chained)

5 PRs child, cada uno ≤400 líneas, total ≤800 (budget informado por el usuario). Tracker branch `draft/selects-animales-catalogo-real-offline` (no-merge hasta cierre de todos). PRs secuenciales con base incremental; cada PR incluye sus tests TDD.

| PR | Branch base | Scope | TDD evidence (focused tests) | Rollback boundary |
|---|---|---|---|---|
| **PR-1 — Vitest scaffold + `CatalogoAnimalMaestroPort` + raza** | `draft/selects-animales-catalogo-real-offline` | Puerto + UC `listarCatalogoRaza` + adapter Drizzle + tests. Scaffold explícito de Vitest en `packages/aplicacion/tests/` y `packages/db/tests/` si no existe. | `pnpm --filter @ganaweb/aplicacion test -- catalogo-raza`: 5/5 (canonical ID, null, unknown, dup, empty). `pnpm --filter @ganaweb/db test -- catalogo-animal-maestro-infrastructure`: 2/2 (active query, mapping). | Revert PR-1: 3 archivos nuevos + tests. Sin cambio a `catalogo-global-port.ts` ni a `nuevo.tsx`. Sexo intacto. |
| **PR-2 — `CatalogoAnimalMaestroPort` + color + calidad** | `PR-1` | UC `listarCatalogoColor` (carga `meta.hex` desde `codigo` en el DTO para Phase 2, **sin renderizar swatch** en Phase 1) + UC `listarCalidad` + 2 tests TDD. | `pnpm --filter @ganaweb/aplicacion test -- catalogo-color catalogo-calidad`: 10/10. `pnpm --filter @ganaweb/db test -- catalogo-animal-maestro-infrastructure`: 3/3 (nuevo caso: hex propagation). | Revert PR-2: 4 archivos nuevos + tests. Raza intacta. |
| **PR-3 — `CatalogoFincaPort` + potrero + sector** | `PR-2` | Port finca-scoped + UCs + adapter + tests. Introduce el parámetro `fincaId` y la validación de scope en el port. | `pnpm --filter @ganaweb/aplicacion test -- catalogo-finca`: 10/10 (filter por finca, finca ajena, empty, dup). `pnpm --filter @ganaweb/db test -- catalogo-finca-infrastructure`: 3/3 (join, scope, mapping). | Revert PR-3: 5 archivos nuevos + tests. Maestro port intacto. |
| **PR-4 — `CatalogoFincaPort` + lote + grupo + lugarCompra** | `PR-3` | 3 UCs adicionales. Tests siguen el patrón PR-3. | `pnpm --filter @ganaweb/aplicacion test -- catalogo-finca`: 16/16 (suma). `pnpm --filter @ganaweb/db test -- catalogo-finca-infrastructure`: 6/6. | Revert PR-4: 6 archivos nuevos + tests. Potrero/sector intactos. |
| **PR-5 — `loadAnimalCatalogs(fincaId)` server loader + BUG-001 fix + E2E** | `PR-4` | Compone los 8 UCs en `animal-actions.server.ts`. Crea `getAnimalCatalogsAction`. Reemplaza `getAnimalFormCatalogOptions()` en `nuevo.tsx`. **BUG-001 diagnosis-first**: reproduce con datos reales → fix scoped a `SelectConCreacion`/`SelectConCreacionField` si reproduce. Cierra tareas 2.1–2.3 de `bug-2026-07-01-formulario-animales`. | `pnpm exec vitest run tests/animal-catalogos.test.ts`: ≥4/4. `pnpm --filter @ganaweb/ui test -- animal-ui`: ≥28/28 (incluye BUG-001 regression). `pnpm exec playwright test tests/e2e/animales.spec.ts`: ≥6/6 desktop+mobile con DB real. `pnpm turbo typecheck && pnpm turbo build && biome ci .`. | Revert PR-5: 5 archivos modificados (loader, route, harness, E2E, BUG-001 fix). Re-activar fixture mock como fallback. Los 4 PRs anteriores siguen funcionales (ports + UCs + adapters sin consumidor). |

### Dependency diagram

```
main ─────────────●─────────────────●───────── (merge final al cerrar tracker)
                  │                 │
draft/tracker ────●─PR-1───●─PR-2───●─PR-3───●─PR-4───●─PR-5
                  │         │       │        │        │
                  📍PR-1    📍PR-2  📍PR-3   📍PR-4   📍PR-5
```

`📍` marca el PR actual. Cada child target la base inmediata. El tracker queda `draft` hasta el merge final.

## Proposal Question Round

### Confirmado por el usuario (claryfing rounds)

1. **Scope = Phase 1 ONLY (online real DB data)**. Offline explícitamente fuera. Phase 2 referenciada como change futuro.
2. **Catálogos en scope** (8 nuevos, sexo ya hecho): raza, color, calidad, potrero, sector, lote, grupo, lugarCompra.
3. **Finca scope**: potrero/sector/lote/grupo/lugarCompra filtrados por `fincaActivaId` de la sesión (PE-003). Sin cross-finca.
4. **Raza/color selection bug**: confirmado por el usuario como "click no registra selección". BUG-001 absorbed con diagnosis-first discipline.
5. **Color swatch — NO en Phase 1**: el select de Color muestra solo el nombre (texto plano). La columna `config_colores.codigo` (hex) se carga en el DTO (disponible para Phase 2) pero el primitive `SelectConCreacion` NO renderiza swatch en Phase 1. El swatch queda explícitamente para Phase 2.
6. **Mutabilidad offline — Read-only en campo**: en Phase 2 los catálogos son read-only offline (solo admins crean online). Phase 2 necesita solo un reader + sync/refresh de catálogos, NO un `sync_outbox` writer para creación de catálogos.
7. **Empty catalog UX — hint deshabilitado**: si la finca activa no tiene potreros/sectores/lotes/grupos/lugaresCompra seed, el EmptyState muestra `+ Crear el primero` **deshabilitado** (CA-UI-004). La creación de catálogos desde la UI queda fuera de Phase 1 (no se abre el formulario de creación).

### Reglas referenciadas (RN/TR/PE/CA/T/IA)

- **PE-002** — server function revalida permiso. Aplicado en `loadAnimalCatalogs(fincaId)`.
- **PE-003** — permisos efectivos por finca activa. Aplicado en el port de finca.
- **RN-050** — maestros referenciados no se eliminan. No afectado (Phase 1 es read-only).
- **RN-001** — código único por finca. No afectado (este change no toca códigos).
- **CA-UI-001** — selects muestran label, no id. Aplicado en los 8 UCs.
- **CA-UI-002** — `+ Crear nuevo` gated on `configuracion:crear`. Mantenido; la creación queda stub.
- **CA-UI-004** — EmptyState con `+ Crear el primero`. Mantenido.
- **CA-UI-005** — location split en potrero/sector/lote/grupo. Reforzado con datos reales.
- **T-003** — labels en español. Aplicado en UCs (es-CO localeCompare).
- **T-004** — no `dark:` variants. Token-only theming. Sin cambios a tokens.
- **IA-001** — ambiguity stops work. Aplicado en BUG-001 diagnosis-first.
- **IA-003** — reusar `packages/ui`. Aplicado (no se duplica el primitive).
- **TBD — regla específica de catálogos**: el spec `arquitectura_funcional.md` no define un `RN-xxx` para "catálogo debe estar disponible antes de aceptar FK". Si se necesita, se agregará al design phase.

## Success Criteria

- [ ] 8 catálogos (raza, color, calidad, potrero, sector, lote, grupo, lugarCompra) cargados desde DB real en la ruta `nuevo.tsx` vía `getAnimalCatalogsAction()`.
- [ ] Sexo sigue funcionando (no regresión; `listarCatalogoSexo` y `DrizzleCatalogoGlobalAdapter` intactos).
- [ ] Server functions revalidan `session.fincaActivaId === fincaId` (PE-002, PE-003) — tests con sesión ajena fallan el acceso a catálogos de finca.
- [ ] BUG-001 diagnosis documentado en `diagnosis-bug-001.md` con evidencia (con datos reales, con mocks, ambos). Fix scoped to primitive o field según causa raíz.
- [ ] Tests TDD: ≥30 application tests + ≥10 db adapter tests + ≥4 web/runtime tests + ≥6 Playwright E2E. Todos verdes.
- [ ] `pnpm turbo test && pnpm turbo typecheck && pnpm turbo build && biome ci .` verde.
- [ ] 5 chained PRs mergeados, cada uno ≤400 líneas (budget 800), con `feature-branch-chain` y tracker `draft`.
- [ ] Tareas 2.1–2.3 de `bug-2026-07-01-formulario-animales` marcadas como absorbed-by este change con referencia cruzada.
- [ ] `getAnimalFormCatalogOptions()` mock fixture conservado como stub de fallback (rollback safety).
- [ ] Select de Color muestra solo texto (sin swatch); `meta.hex` cargado en DTO pero NO renderizado en Phase 1.
- [ ] EmptyState de catálogos de finca vacíos muestra `+ Crear el primero` **deshabilitado** (CA-UI-004); la creación de catálogos desde la UI queda fuera de Phase 1.
- [ ] Phase 2 (offline) documentado en el proposal con boundary claro, read-only en campo (sin `sync_outbox` writer para catálogos) y nombre de capability futuro (`catalogo-animal-offline`).
