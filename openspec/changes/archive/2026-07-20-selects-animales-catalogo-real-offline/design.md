# Design: Selects de animales — datos reales (Phase 1) + BUG-001

## Technical Approach

Extend the established `CatalogoGlobalPort`/Drizzle pattern (Slice B) to 8 remaining catalog families without touching `sexo`. Two new ports (global + finca-scoped), 8 strict-decoder use cases, 2 parameterized Drizzle adapters, and `loadAnimalCatalogs(fincaId)` composing all 9 in parallel via `Promise.allSettled` (graceful degradation). BUG-001 absorbed diagnosis-first. Offline (SQLite/OPFS) is Phase 2; ports are swappable.

## Architecture Decisions

| ADR | Choice | Rejected | Rationale |
|---|---|---|---|
| **001** Two new ports; do NOT extend `CatalogoGlobalPort`. | Widen `opcion:"sexo"`. | Existing port hard-codes `config_key_values` 3-col shape; `config_razas`/`potreros` violate it. Sexo non-regression preserved. |
| **002** One Drizzle adapter per family, parameterized by `tabla`. | 8 classes; inline Drizzle in UC. | Mirrors `catalogo-global-infrastructure.ts` (parameterized by `opcion`); avoids boilerplate; UC stays Drizzle-free. |
| **003** Standardized DTO with per-family `meta` (`meta.hex` for color). | Per-table DTO classes. | Form already uses `SelectOptionWithCreate` with optional `meta`. Color carries `meta.hex` from `config_colores.codigo` (Phase 2 swatch gate; not rendered Phase 1). |
| **004** BUG-001 diagnosis-first, 3 outcomes. | Pre-emptive primitive fix. | Mock ID mismatch (`col-` vs `color-` prefix) is the leading hypothesis; IA-001 mandates diagnosis before fix. |
| **005** Reuse `denyAnimalRouteAccess(session, fincaId, "ver")`. | Custom per-loader guard. | Existing helper (line 315) already enforces PE-002/PE-003. |
| **006** All UCs return `{tipo, options}` (sexo pattern). | Per-catalog return type. | Mirrors `AnimalSexoCatalog`; form already handles `no_disponible` → EmptyState. |

## Data Flow

```
config_razas | config_colores | config_calidad_animal     (no finca_id)
potreros | sectores | lotes | grupos | lugares_compras     (finca_id FK)
   → DrizzleCatalog{Maestro,Finca}Adapter (activo=1, sort es-CO)
   → 8 strict-decoder UCs
   → loadAnimalCatalogs(fincaId): denyAnimalRouteAccess + Promise.allSettled(9 catalogs)
   → getAnimalCatalogsAction → nuevo.tsx loader → AnimalFormScreen.catalogOptions
```

## Port & DTO Contracts

```ts
// ports/catalogo-animal-maestro-port.ts
interface CatalogoMaestroOption { id: string; nombre: string; activo: boolean }
interface RazaOption extends CatalogoMaestroOption { descripcion?; origen?; tipoProduccion? }
interface ColorOption extends CatalogoMaestroOption { meta: { hex: string } } // Phase 2 swatch
interface CalidadOption extends CatalogoMaestroOption {}
interface CatalogoAnimalMaestroPort<T extends CatalogoMaestroOption> {
  listarActivos(tabla: TTabla): Promise<readonly T[]>
}

// ports/catalogo-finca-port.ts
interface CatalogoFincaOption { id: string; nombre: string; codigo?: string
  fincaId: string; activo: boolean }
interface CatalogoFincaPort<T extends CatalogoFincaOption> {
  listarPorFinca(fincaId: string, tabla: TTabla): Promise<readonly T[]>
}
// Specific: PotreroOption | SectorOption (with codigo), LoteOption | GrupoOption,
// LugarCompraOption (no codigo col — schema:maestros.ts:150).
```

UCs (es-CO): `listarCatalogoRaza` · `listarCatalogoColor` · `listarCatalogoCalidad` · `listarPotrerosPorFinca` · `listarSectoresPorFinca` · `listarLotesPorFinca` · `listarGruposPorFinca` · `listarLugaresCompraPorFinca`.

## File Changes

| File | Action |
|---|---|
| `packages/aplicacion/src/puertos/catalogo-{animal-maestro,finca}-port.ts` | New |
| `packages/aplicacion/src/casos-uso/listar-catalogo-{raza,color,calidad}.ts` | New ×3 |
| `packages/aplicacion/src/casos-uso/listar-{potreros,sectores,lotes,grupos,lugares-compra}-por-finca.ts` | New ×5 |
| `packages/aplicacion/src/index.ts` | Modify (re-export 10 symbols) |
| `packages/aplicacion/tests/catalogo-{raza,color,calidad,finca}-*.test.ts` | New (5 cases/UC) |
| `packages/db/src/catalogo-{animal-maestro,finca}-infrastructure.ts` | New (generic + activo=1) |
| `packages/db/package.json` | Modify (2 export entries) |
| `packages/db/tests/catalogo-{animal-maestro,finca}-infrastructure.test.ts` | New (2 cases/adapter) |
| `apps/web/src/server/animal-actions.server.ts` | Modify (loadAnimalCatalogs, harness + 8 ports, action) |
| `apps/web/src/server/animal-actions.ts` | Modify (export getAnimalCatalogsAction + AnimalCatalogs) |
| `apps/web/src/server/e2e-animals-fixture.server.ts` | Modify (8 fallback ports) |
| `apps/web/src/routes/_app/fincas/$fincaId/animales/nuevo.tsx` | Modify (loader calls getAnimalCatalogsAction) |
| `apps/web/src/lib/fixtures/animal-form-catalog.ts` | Modify (retain types; stub throws in prod for rollback) |
| `packages/ui/src/{ganado/animal-crud,primitives/select-con-creacion}.tsx` | **Potential** mod (BUG-001 contingent) |
| `openspec/.../diagnosis-bug-001.md` | New (PR-5 evidence) |
| `openspec/changes/bug-2026-07-01-formulario-animales/tasks.md` | Reference (mark 2.1–2.3 absorbed-by) |

## Server Loader

`loadAnimalCatalogs(fincaId, ports)`: 1) `getAuthorizedSession()`; 2) `denyAnimalRouteAccess(session, fincaId, "ver")`; 3) `Promise.allSettled([sexo, raza, color, calidad, potrero, sector, lote, grupo, lugarCompra])`; 4) per-settlement → `{tipo, options}` or `{tipo:"no_disponible"}`; 5) reject → `console.warn` + that catalog `no_disponible`, others survive. Wrapped in `getAnimalCatalogsAction = createServerFn({ method: "GET" })`.

## BUG-001 Decision Tree (PR-5)

1. Vitest + Playwright with real DB seed.
2. Click `raza` combobox → `Angus` → trigger shows `Angus` AND `formData.get("raza") === "raza-angus"`.
   - **Click registers → BUG CLOSED by absorption** (root cause = mock ID prefix mismatch). Previous change tasks 2.1–2.3 close by reference.
   - **Click does NOT register**:
     - Mount `SelectConCreacionField` with `meta.hex` Color DTO in `packages/ui/tests/animal-ui.test.tsx`. If `value` doesn't update on `onSelect` → fix `SelectConCreacionField` in `animal-crud.tsx`.
     - If value updates but hidden `<input name="color">` doesn't change in FormData → fix `select-con-creacion.tsx`.
3. `diagnosis-bug-001.md` records both paths' evidence + exact diff.

## Testing Strategy

| Layer | Scope | Approach |
|---|---|---|
| Unit (Vitest, `packages/aplicacion`) | Each UC: canonical, null, unknown, duplicate, empty. | 5 × 8 = 40. `port()` factory mirrors `catalogo-sexo.test.ts:8`. |
| Integration (Vitest, `packages/db`) | Adapter: active filter + per-table mapping + DB failure. | 2 × 2 = 4. `fakeDb` + `conditionContains` mirror `catalogo-global-infrastructure.test.ts:19-38`. |
| Loader (Vitest, `apps/web`) | `loadAnimalCatalogs`: all 9 composed; cross-finca denied; all-`no_disponible` on DB failure; partial-failure isolation. | 4 cases; `session()` + `deps()` from `animal-web-flow.test.ts`. |
| E2E (Playwright, `tests/e2e/`) | Real DB: click + keyboard + FormData carries canonical id for 8 selects; mobile + desktop. | ≥6 cases. |
| Non-regression | Sexo flow intact; `catalogo-sexo.test.ts` passes. | Vitest in `packages/aplicacion`. |

Gate: `pnpm turbo test && pnpm turbo typecheck && pnpm turbo build && biome ci .`.

## Threat Matrix

`N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.`

## Migration / Rollout

No data migration. Rollback per slice (5 PRs, ≤400 lines each, reverse order). Mock fixture retained as throwing stub for emergency rollback.

## Chained PR ↔ Design Boundary

| PR | Boundary | TDD evidence |
|---|---|---|
| **PR-1** | Maestro port + `listarCatalogoRaza` + adapter | 5/5 + 2/2 |
| **PR-2** | `listarCatalogoColor` (+ `meta.hex`) + `listarCatalogoCalidad` | 10/10 + 3/3 |
| **PR-3** | Finca port + `listarPotrerosPorFinca` + `listarSectoresPorFinca` | 10/10 + 3/3 |
| **PR-4** | `listarLotesPorFinca` + `listarGruposPorFinca` + `listarLugaresCompraPorFinca` | 16/16 + 6/6 |
| **PR-5** | `loadAnimalCatalogs` + route + BUG-001 fix | ≥4/4 + ≥28/28 + ≥6/6 |

## Phase 2 Readiness (offline symmetry)

Ports are interfaces; the Drizzle adapters are one implementation. A Phase 2 `SqliteWasmAnimalMaestroAdapter` reading from OPFS satisfies the same port; the 8 use cases are unchanged. `meta.hex` is already in the Color DTO so Phase 2 swatch needs no re-shaping. `pnpm no-sqlite` guard is preserved — Phase 1 stays online-only.
