# Exploration: Animal form selects — mock vs real DB + offline availability

## Executive Summary

**6 catalogs** power the animal create/edit form selects (raza, color, potrero, sexo, sector, lote). Only **sexo** is wired to real DB data (established in Slices B–C of the existing `bug-2026-07-01-formulario-animales` change). The other 5 remain hardcoded mock arrays in `apps/web/src/lib/fixtures/animal-form-catalog.ts`. Real DB tables exist for all 6 with seeded data, but no port/use-case/adapter chain connects them.

**Offline (SQLite WASM + OPFS) is NOT yet implemented**. A `pnpm no-sqlite` grep guard prohibits any SQLite reference in source code. The offline-first architecture is designed but not built — there is no local replica, no catalog sync/seed for offline, and no sync_outbox reader for catalogs.

**BUG-001** (raza/color non-selection) is **still open** — tasks 2.1–2.3 remain unchecked in the existing change. The `SelectConCreacion` primitive works correctly in tests, but the mock data + uncontrolled pattern may mask the actual production root cause.

---

## Findings per Catalog

### 1. Sexo — ✅ REAL (already done)

| Property | Value |
|---|---|
| Current source | **Real DB** — `config_key_values` with `opcion='sexo', activo=1` |
| File:line (fixture) | N/A — sexo is overridden in routes |
| File:line (route wiring) | `nuevo.tsx:175` — `sexo: sexoCatalog?.tipo === "disponible" ? sexoCatalog.options : []` |
| DB table | `config_key_values` — lines 168-172 of seed.ts seed `kv-sexo-0/1/2` |
| Architecture | `CatalogoGlobalPort` → `listarCatalogoSexo` use case → `DrizzleCatalogoGlobalAdapter` → `loadAnimalSexoCatalog` |
| Offline | Not yet implemented |
| Gap | None — this is the reference pattern |

### 2. Raza — ❌ MOCK

| Property | Value |
|---|---|
| Current source | **Mock** — `RAZA_OPTIONS` in `animal-form-catalog.ts:67-72` (4 hardcoded breeds) |
| File:line (fixture) | `apps/web/src/lib/fixtures/animal-form-catalog.ts:67` |
| Route wiring | `nuevo.tsx:166` — `catalogOptions = getAnimalFormCatalogOptions()` returns mock |
| DB table | `config_razas` — `packages/db/src/schema/config.ts:59` — 11 breeds seeded in `seed.ts:193-205` |
| Offline | Not yet implemented |
| Gap | Needs new port/use-case/adapter. **Not in `config_key_values`** — it's a separate table with different columns (nombre, descripcion, origen, tipo_produccion). New DTO needed. |

### 3. Color — ❌ MOCK

| Property | Value |
|---|---|
| Current source | **Mock** — `COLOR_OPTIONS` in `animal-form-catalog.ts:74-79` (4 hardcoded colors with hex) |
| File:line (fixture) | `apps/web/src/lib/fixtures/animal-form-catalog.ts:74` |
| Route wiring | Same as raza — via `getAnimalFormCatalogOptions()` |
| DB table | `config_colores` — `packages/db/src/schema/config.ts:12` — 8 colors seeded in `seed.ts:247-258` |
| Offline | Not yet implemented |
| Gap | Needs new port/use-case/adapter. Separate table (nombre, codigo/hex). The UI supports `meta.hex` for swatch — DB has `codigo` column. |

### 4. Potrero — ❌ MOCK

| Property | Value |
|---|---|
| Current source | **Mock** — `POTRERO_OPTIONS` in `animal-form-catalog.ts:31-35` (3 hardcoded potreros) |
| File:line (fixture) | `apps/web/src/lib/fixtures/animal-form-catalog.ts:31` |
| Route wiring | Via `getAnimalFormCatalogOptions()` → `LOCATION_FIELDS` rendering in `animal-crud.tsx:986-998` |
| DB table | `potreros` — `packages/db/src/schema/maestros.ts:4` — **finca-scoped** (`finca_id` FK) |
| Offline | Not yet implemented |
| Gap | Needs **finca-scoped** port (different from global `CatalogoGlobalPort`). Seed data is per-finca (3 potreros for Esperanza + 3 for Roble). |

### 5. Sector — ❌ MOCK

| Property | Value |
|---|---|
| Current source | **Mock** — `SECTOR_OPTIONS` in `animal-form-catalog.ts:37-41` (3 hardcoded sectores) |
| File:line (fixture) | `apps/web/src/lib/fixtures/animal-form-catalog.ts:37` |
| Route wiring | Same as potrero — `LOCATION_FIELDS` rendering |
| DB table | `sectores` — `packages/db/src/schema/maestros.ts:24` — **finca-scoped** |
| Offline | Not yet implemented |
| Gap | Same as potrero — needs finca-scoped port. 5 sectors seeded across both fincas. |

### 6. Lote — ❌ MOCK

| Property | Value |
|---|---|
| Current source | **Mock** — `LOTE_OPTIONS` in `animal-form-catalog.ts:43-47` (3 hardcoded lotes) |
| File:line (fixture) | `apps/web/src/lib/fixtures/animal-form-catalog.ts:43` |
| Route wiring | Same as potrero — `LOCATION_FIELDS` rendering |
| DB table | `lotes` — `packages/db/src/schema/maestros.ts:44` — **finca-scoped** |
| Offline | Not yet implemented |
| Gap | Same as potrero — needs finca-scoped port. 4 lotes seeded across both fincas. |

### Additional Mock Catalogs (in-scope by proximity)

| Catalog | Source | DB Table | Gap |
|---|---|---|---|
| Calidad | Mock — `CALIDAD_OPTIONS:81-85` | `config_calidad_animal` (4 seeded) | Separate table, no port |
| Lugar de compra | Mock — `LUGAR_COMPRA_OPTIONS:87-92` | `lugares_compras` (finca-scoped) | Finca-scoped port needed |
| Grupo | Mock — `GRUPO_OPTIONS:49-53` | `grupos` (finca-scoped) | Finca-scoped port needed |

---

## Architecture Mapping

### The Sexo Pattern (Established Reference)

```
PostgreSQL 17
  └─ config_key_values (opcion='sexo', activo=1)
       │
       ▼
packages/db/src/catalogo-global-infrastructure.ts
  └─ DrizzleCatalogoGlobalAdapter implements CatalogoGlobalPort
       │  listarActivos(opcion: "sexo"): Promise<CatalogoRaw[]>
       │  Returns: { id, key, value } — fixed width, 3 columns
       ▼
packages/aplicacion/src/puertos/catalogo-global-port.ts
  └─ CatalogoGlobalPort (interface)
  └─ CatalogoRaw { id: string, key: string, value: string | null }
       │
       ▼
packages/aplicacion/src/casos-uso/listar-catalogo-sexo.ts
  └─ listarCatalogoSexo(port) → SexoCatalogoOption[]
  └─ Strict decoder: only "0"|"1"|"2" accepted, rejects null/unknown/duplicates
       │
       ▼
apps/web/src/server/animal-actions.server.ts
  └─ loadAnimalSexoCatalog(port) → AnimalSexoCatalog (disponible | no_disponible)
  └─ createAnimalRuntimeHarness({ catalogoSexo: DrizzleAdapter })
       │
       ▼
apps/web/src/server/animal-actions.ts
  └─ getAnimalSexoCatalogAction() — createServerFn({ method: "GET" })
       │
       ▼
apps/web/src/routes/_app/fincas/$fincaId/animales/nuevo.tsx
  └─ Route.loader: getAnimalSexoCatalogAction()
  └─ NewAnimalRouteView: sexoCatalog → catalogOptions.sexo
       │
       ▼
packages/ui/src/ganado/animal-crud.tsx
  └─ AnimalFormScreen receives catalogOptions.sexo
  └─ renderAnimalFormField → CatalogSelectField → SelectConCreacion
```

### Key Architectural Insight

The current `CatalogoGlobalPort` is **too narrow** for the remaining catalogs in two ways:

1. **It only accepts `opcion: "sexo"`** (literal type, line 8 of the port). For raza/color/calidad (separate tables, not `config_key_values`), the query pattern is completely different — no `opcion` column exists.

2. **It has no finca scope**. Potrero/sector/lote/grupo/lugarCompra are per-finca tables (`finca_id` FK). A global port cannot serve them — you need `listarPorFinca(fincaId)`.

3. **The DTO shape differs** per table. `CatalogoRaw` has `{ id, key, value }` but raza has `{ id, nombre, descripcion, origen, tipo_produccion, activo }`, potrero has `{ id, finca_id, codigo, nombre, area_hectareas, ... }`.

### Required New Architecture

For **raza / color / calidad** (global catalogs in separate tables):
```
New port(s): e.g., CatalogoMaestroPort<TCatalogoOption> with listarActivos()
New use cases: listarCatalogoRaza(), listarCatalogoColor(), listarCatalogoCalidad()
New adapters: Drizzle query per table filtering activo=1
```

For **potrero / sector / lote / grupo / lugarCompra** (finca-scoped):
```
New port(s): e.g., CatalogoFincaPort with listarPorFinca(fincaId)
New use cases per table
New adapters with fincaId filter
```

---

## BUG-001 Overlap Analysis

### What the existing change already did

| Slice | What was done | Status |
|---|---|---|
| B (6.1–6.4) | `CatalogoGlobalPort`, `listarCatalogoSexo` use case, `DrizzleCatalogoGlobalAdapter` | ✅ Done |
| C (7.1–7.4) | Dynamic sexo integration in routes, sexo revalidation, tests | ✅ Done |
| Task 2.1 (BUG-001) | RED: desktop/mobile four-catalog selection contract | ❌ Not started |
| Task 2.2 (BUG-001) | Diagnose before changing select-con-creacion.tsx | ❌ Not started |
| Task 2.3 (BUG-001) | GREEN and commit BUG-001 regression | ❌ Not started |

### What remains for raza/color selection

The original BUG-001 scope covered **raza, color, calidad, lugar de compra** — it was about diagnosing why options show but can't be selected. The existing exploration (the change's `exploration.md`) found:

> "BUG-001 — not reproduced / reported root cause not confirmed. No evidence supports the report's CommandItem onClick, lowercase-id, premature-unmount, or missing-form-state hypotheses in this checkout."

The original BUG-001 was scoped as **diagnosis only** — reproduce the bug to decide whether `select-con-creacion.tsx` needs a fix. The `SelectConCreacion` primitive has regression tests proving click, keyboard, and selection work correctly. The form's `SelectConCreacionField` uses the primitive with `canCreate` gated on permissions.

**Key insight**: The selection issue the user reports may be caused by the mock data options working but pointing to non-existent IDs — or it may be a real bug in how the form handles the controlled/uncontrolled pattern. The `SelectConCreacionField` has a `defaultValue` from `initialValues` (which for create is undefined) and an empty `onChange` handler — this is the uncontrolled pattern that relies on the hidden `<input>` for FormData. If the component's `value` prop uses `defaultValue ?? null` and the mock options have different `value` strings than expected, the matching may fail silently.

### What the user's report adds vs BUG-001

The user's report adds:
1. **Potrero, sector, lote** — not in original BUG-001 scope (which focused on raza/color/calidad/lugarCompra)
2. **Real DB data requirement** — BUG-001 was pure diagnosis; the user wants actual DB wiring
3. **Offline availability requirement** — entirely new, not in any existing scope

### New change vs extension decision

**Recommendation: New change.** Reasons:
- The existing `bug-2026-07-01-formulario-animales` is a bug-fix change with narrow scope (diagnose/remediate selection bugs + date/calendar fixes). Adding real-DB data sources + offline would massively expand its scope.
- The remaining BUG-001 tasks (2.1–2.3) are about diagnosing the selection bug in the primitive, not about wiring real data.
- Potrero/sector/lote are not in the existing change's scope at all.
- Offline is an entirely new architectural feature.
- The existing change can be closed when BUG-001 diagnosis is done, and this new change can reference its findings.

**However**: If BUG-001's root cause turns out to be that mock data IDs don't match the form's expectations, then fixing data sources would inherently fix BUG-001. In that case, a **merge** of BUG-001 into this new change makes sense.

---

## Offline Availability — Current State

### What exists
- `sync_outbox` table (`packages/db/src/schema/sync.ts:4`): queue for mutations destined for server sync
- Architecture designed for SQLite WASM + OPFS local replica per finca
- Archival exploration (`openspec/changes/archive/_archive/exploration-exploracion-inicial/exploration.md`) documents the offline strategy

### What does NOT exist
- **No SQLite WASM implementation** — the `pnpm no-sqlite` CI guard enforces ZERO references
- **No local DB** — no wa-sqlite, no OPFS, no SyncManager
- **No catalog sync/seed** — no mechanism to replicate `config_razas`, `config_colores`, `config_key_values` to a local store
- **No offline catalog reader** — no port/adapter that reads from a local cache
- **No PWA service worker** for offline intercept
- The project is currently **online-only** with PostgreSQL 17

### What it would take

For **static catalogs** (raza, color, calidad, sexo — change rarely):
1. Seed on first load: fetch all catalog rows and cache in local storage / SQLite
2. Read from local store when offline
3. Refresh from server when online (version-based? full-refetch on reconnect?)

For **finca-scoped catalogs** (potrero, sector, lote, grupo — change more frequently):
1. Same seed+refresh pattern, but scoped per finca
2. Mutations (create potrero, rename sector) go through `sync_outbox`
3. Conflict resolution if both online and offline create the same code

**This is a LARGE feature (months of work)**, not a quick fix. A reasonable first step would be:
- Wire catalogs from real PostgreSQL first (no offline)
- Add offline catalog cache as a separate phase
- Seed catalogs eagerly into local storage / IndexedDB
- Serve from cache when navigator.onLine === false

---

## Open Questions for the User

### Product/Business Questions

1. **Offline priority**: Do ALL 6 selects need offline availability right now, or can we wire real DB data first (online-only) and add offline as a separate phase? The offline sync infrastructure isn't built yet — this is months of work.

2. **Catalog mutability**: Can these catalogs be edited while offline? For example, if a user creates a new potrero or raza while offline, should that sync to the server later? Or are catalogs read-only in the field (only admins create them)?

3. **Finca scope for location catalogs**: Potrero, sector, lote are per-finca. When the user selects a potrero, should the list be limited to the current finca's potreros? Are there cross-finca scenarios where one finca's potreros should be visible from another?

4. **Which catalogs specifically need offline**: Raza, color, sexo, calidad are mostly static (change rarely). Potrero, sector, lote change more often as the farm re-organizes. Should ALL be available offline, or is a subset (raza/color/sexo) acceptable initially?

5. **Raza/Color selection bug**: You mentioned raza and color show options but don't allow selection. Can you confirm this happens in the current app (online, with mock data)? Is it that clicking an option does nothing, or that the selected value doesn't get submitted?

### Technical Questions

6. **Seed data alignment**: The mock data uses IDs like `"raza-angus"`, `"color-negro"` — the DB seed also uses `"raza-angus"`, `"col-negro"` (note: `"raza-"` vs `"col-"` prefix — mismatch in color prefix!). Is there a canonical ID scheme we should enforce?

7. **Color hex codes**: The fixture has `meta.hex` swatches. The DB `config_colores` has a `codigo` column that stores hex values. Should the UI show color swatches in the select dropdown?

---

## Decision Inputs

### Recommendation: New change `selects-animales-catalogo-real-offline`

| Aspect | Assessment |
|---|---|
| **Should this extend the existing change?** | **No** — different scope (data layer vs bug diagnosis) |
| **Can BUG-001 be absorbed into this change?** | **Maybe** — if BUG-001 root cause IS the mock data, but we need to confirm first |
| **Offline readiness** | **Not ready** — requires foundational SQLite WASM work first |
| **Immediate actionable scope** | Wire raza, color, potrero, sector, lote from real DB (online-only); fix any selection bugs discovered |
| **Risk** | Medium: 5 new ports/use-cases/adapters; finca-scoped queries add auth complexity; the CatalogoGlobalPort needs extension or replacement |
| **Effort estimate** | **High** for full scope (real data + offline); **Medium** for real-data-only |

### Recommended Approach

**Phase 1** (this change): Wire all 6 catalogs from real PostgreSQL:
1. Extend `CatalogoGlobalPort` to support multiple catalog types (raza, color, calidad) — or create separate ports per table shape
2. Create finca-scoped port for potrero/sector/lote/grupo/lugarCompra
3. Create use cases per catalog
4. Create Drizzle adapters
5. Replace `getAnimalFormCatalogOptions()` with real loader composition
6. Fix any selection bugs found during integration
7. Testing: new use case tests + updated E2E

**Phase 2** (separate change, future): Offline catalog cache:
1. Implement SQLite WASM + OPFS foundation
2. Seed catalogs into local store
3. Add offline reader port/adapter
4. Wire into route loaders with online/offline switching

### Risks

| Risk | Mitigation |
|---|---|
| **Scope creep**: Offline is a massive feature, could drown the real-data wiring | Explicitly split into phases; Phase 1 is online-only |
| **BUG-001 duplication**: This change might overlap with remaining BUG-001 tasks in the existing change | Coordinate: finish BUG-001 diagnosis first, then decide if fixing data sources closes it |
| **CatalogoGlobalPort redesign**: The current port is hardcoded to `"sexo"` and `config_key_values` | Design a general `CatalogoGlobalReader<TOption>` pattern that can work with any table |
| **Finca authorization**: Finca-scoped catalogs need to verify the user has access to the finca | Reuse existing session/finca validation from `animal-actions.server.ts` |
| **Mock-to-real swap**: Routes currently call `getAnimalFormCatalogOptions()` synchronously in the component; real data needs async server functions | Follow established pattern: create a `loadAnimalCatalogs(fincaId)` server function similar to `getAnimalSexoCatalogAction()` |

### Ready for Proposal

**Yes**, with the following constraints:
- The user must confirm Phase 1 only (online real data) vs including offline
- The user must answer the open questions about which catalogs need what
- The existing change's BUG-001 diagnosis should complete first, or this change absorbs it
- The proposal should explicitly exclude offline from Phase 1 scope
