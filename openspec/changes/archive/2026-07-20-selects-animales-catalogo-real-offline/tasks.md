# Tasks: Selects animales — datos reales (Phase 1) + BUG-001

## Review Workload Forecast

Total: ~800. 400-line risk/PR: P1/3/5 Med · P2/4 Low. Tracker: `draft/selects-animales-catalogo-real-offline`.

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: Medium

PR-x base=PR-(x-1) branch. 1.1 skip if Vitest present. PR5 runtime: `playwright animales.spec.ts` d+m.

## P1: Maestro port + raza

- [x] **1.1** Skip-if-present: `packages/{aplic,db}/vitest.config.ts` exist.
- [x] **1.2** Port `catalogo-animal-maestro-port.ts`: `CatalogoMaestroOption`, `RazaOption`, `Port<T>.listarActivos(tabla)`. V: aplic typecheck.
- [x] **1.3** RED `catalogo-raza.test.ts` 5 cases (canon/null/unknown/dup/empty) per `catalogo-sexo.test.ts:port()`.
- [x] **1.4** GREEN `listar-catalogo-raza.ts` strict decoder, es-CO sort, `{tipo,options}`.
- [x] **1.5** REFACTOR: extract shared decoder.
- [x] **1.6** RED `catalogo-animal-maestro-infrastructure.test.ts` 2 cases (active+sort, DB fail) per `fakeDb`.
- [x] **1.7** GREEN `catalogo-animal-maestro-infrastructure.ts`: `DrizzleAdapter.listarActivos("config_razas")` SELECT WHERE activo=1 ORDER BY nombre.
- [x] **1.8** Export `aplic/src/index.ts` + `db/package.json` entry. V: `pnpm turbo typecheck`.
- [x] **1.9** Gate: 5/5+2/2+typecheck+`biome check packages/{aplic,db}`.

## P2: color + calidad

- [x] **2.1** RED `catalogo-color.test.ts` 5 (incl hex) + `catalogo-calidad.test.ts` 5.
- [x] **2.2** GREEN `listar-catalogo-color.ts` (ColorOption `meta.hex` from `codigo`, **NOT rendered**) + `listar-catalogo-calidad.ts` + index.
- [x] **2.3** Extend adapter: `"config_colores" | "config_calidad_animal"` (color adds `codigo`).
- [x] **2.4** RED db: +hex propagation (3/3).
- [x] **2.5** Gate: 10/10+3/3+typecheck+lint.

## P3: Finca port + potrero + sector

- [x] **3.1** Port `catalogo-finca-port.ts`: `CatalogoFincaOption`, `PotreroOption`, `SectorOption`(w/`codigo`), `Port<T>.listarPorFinca(fincaId,tabla)`.
- [x] **3.2** RED `catalogo-finca.test.ts` 10 cases (5/UC: active/empty/cross-denied/null/dup).
- [x] **3.3** GREEN `listar-potreros-por-finca.ts` + `listar-sectores-por-finca.ts` (PE-003, es-CO, `{tipo,options}`).
- [x] **3.4** RED `catalogo-finca-infrastructure.test.ts` 3 cases (active+fincaId, cross-empty, DB fail).
- [x] **3.5** GREEN `catalogo-finca-infrastructure.ts`: `DrizzleFincaAdapter.listarPorFinca(fincaId,tabla)` ORDER BY nombre + `db/package.json`.
- [x] **3.6** Re-export 4. Gate: 10/10+3/3+typecheck+lint.

## P4: lote + grupo + lugarCompra

- [x] **4.1** RED extend `catalogo-finca.test.ts` +15 (5×3).
- [x] **4.2** GREEN `listar-lotes-por-finca.ts` + `listar-grupos-por-finca.ts` + `listar-lugares-compra-por-finca.ts` (no `codigo`).
- [x] **4.3** RED db: extend 6/6 (3 new).
- [x] **4.4** Extend adapter: `"lotes"|"grupos"|"lugares_compras"`.
- [x] **4.5** Re-export 3. Gate: 16/16+6/6+typecheck+lint.

## P5: loader + BUG-001 + E2E

- [x] **5.1** `loadAnimalCatalogs(fincaId,ports)` in `animal-actions.server.ts`: session→`denyAnimalRouteAccess(...,"ver")` (PE-002/3)→`Promise.allSettled([sexo,raza,color,calidad,potrero,sector,lote,grupo,lugarCompra])`→`{tipo,options}|{tipo:"no_disponible"}` w/`console.warn`.
- [x] **5.2** `getAnimalCatalogsAction = createServerFn({method:"GET"}).validator(fincaId).handler(...)` in `animal-actions.ts`; export `AnimalCatalogs`.
- [x] **5.3** RED `animal-catalogos.test.ts` 4 (composed/cross-denied/all-no_disp/partial-isolation).
- [x] **5.4** `nuevo.tsx` loader: `getAnimalSexoCatalogAction`→`getAnimalCatalogsAction({data:{fincaId}})`; pass composite.
- [x] **5.5** `animal-form-catalog.ts`: retain types; `getAnimalFormCatalogOptions()` throws in prod.
- [x] **5.6** `e2e-animals-fixture.server.ts`: +8 fallback ports.
- [x] **5.7** RED BUG-001 `ui/tests/animal-ui.test.tsx`: real-data `raza` click→selected, kbd Down+Enter→canonical id, hidden `<input name="raza">` carries id, FormData.
- [x] **5.8** GREEN BUG-001: fix `animal-crud.tsx` `SelectConCreacionField` (controlled state via useState + onChange). Root cause: no-op onChange in uncontrolled pattern.
- [x] **5.9** Extend `tests/e2e/animales.spec.ts` +3 (raza, color, potrero with canonical IDs).
- [x] **5.10** Mark `bug-2026-07-01-formulario-animales/tasks.md` 2.1–2.3 absorbed-by.
- [x] **5.11** Write `diagnosis-bug-001.md` (evidence/outputs/diff).
- [x] **5.12** Gate: `pnpm turbo test && pnpm turbo typecheck && pnpm turbo build && biome ci .`.
