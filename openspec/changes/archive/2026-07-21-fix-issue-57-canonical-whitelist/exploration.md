# Exploration: Fix Issue #57 — CANONICAL whitelist in 8 catalog use cases

## Executive Summary

Eight catalog use cases in `packages/aplicacion/src/casos-uso/` implement a fail-fast decoder that hardcodes `CANONICAL_*_IDS` whitelists. When the DB contains active records with IDs outside these whitelists (e.g., seed changes, user-created data via UI, E2E fixture IDs), the entire catalog returns `{ tipo: "no_disponible", options: [] }` — ALL rows rejected because ONE row has an "unknown" ID. The issue is real and confirmed: the E2E fixture (`e2e-animals-fixture.server.ts`) uses IDs like `"potrero-norte"` and `"lc-feria"` which are NOT in the canonical sets and would cause catalog failures in E2E mode.

The fix is surgical: **remove the `CANONICAL_*_IDS` whitelist check** from each use case while keeping all structural validations (id not null/undefined, id is string, no duplicates, sort es-CO by nombre). The reference model `listarCatalogoSexo` proves this pattern works — it validates structural content (`value` must be "0", "1", or "2") without any ID whitelist.

---

## Per-File Analysis

### 1. `listar-catalogo-raza.ts` (47 lines)

| Aspect | Detail |
|---|---|
| **Whitelist** | `CANONICAL_RAZA_IDS` — 11 IDs: `raza-brahman`, `raza-holstein`, `raza-angus`, `raza-brangus`, `raza-gyr`, `raza-normando`, `raza-simmental`, `raza-criollo`, `raza-romosinuano`, `raza-bon`, `raza-cruce` |
| **Decoder logic** | Lines 38-44 — for loop with fail-fast. Line 41: `if (!CANONICAL_RAZA_IDS.has(row.id)) return NO_DISPONIBLE` |
| **Validations to KEEP** | Line 40: null/undefined check (`!row.id || typeof row.id !== "string"`). Line 42: duplicate check (`seen.has(row.id)`). Line 36: empty list check. Lines 34/48: try/catch. Line 46: es-CO sort by nombre. |
| **Return type** | `CatalogoRazaResult` — `{ tipo: "disponible" | "no_disponible", options: readonly RazaOption[] }` |

### 2. `listar-catalogo-color.ts` (48 lines)

| Aspect | Detail |
|---|---|
| **Whitelist** | `CANONICAL_COLOR_IDS` — 8 IDs: `col-negro`, `col-blanco`, `col-rojo`, `col-cafe`, `col-canela`, `col-bayo`, `col-overo`, `col-pintado` |
| **Decoder logic** | Lines 35-41 — same fail-fast pattern. Line 38: `if (!CANONICAL_COLOR_IDS.has(row.id)) return NO_DISPONIBLE` |
| **Validations to KEEP** | Same pattern: null/undefined id check, duplicate check, empty check, try/catch, es-CO sort. |
| **Return type** | `CatalogoColorResult` — `{ tipo: "disponible" | "no_disponible", options: readonly ColorOption[] }` |

### 3. `listar-catalogo-calidad.ts` (44 lines)

| Aspect | Detail |
|---|---|
| **Whitelist** | `CANONICAL_CALIDAD_IDS` — 4 IDs: `cal-excelente`, `cal-bueno`, `cal-regular`, `cal-descarte` |
| **Decoder logic** | Lines 31-37 — same pattern. Line 34: `if (!CANONICAL_CALIDAD_IDS.has(row.id)) return NO_DISPONIBLE` |
| **Validations to KEEP** | Same pattern. |
| **Return type** | `CatalogoCalidadResult` — `{ tipo: "disponible" | "no_disponible", options: readonly CalidadOption[] }` |

### 4. `listar-potreros-por-finca.ts` (47 lines)

| Aspect | Detail |
|---|---|
| **Whitelist** | `CANONICAL_POTRERO_IDS` — 6 IDs: `pot-esp-1`, `pot-esp-3`, `pot-esp-5`, `pot-rob-1`, `pot-rob-2`, `pot-rob-3` |
| **Decoder logic** | Lines 34-40 — same pattern. Line 37: `if (!CANONICAL_POTRERO_IDS.has(row.id)) return NO_DISPONIBLE` |
| **Extra validations** | Line 29: fincaId not null/string check |
| **Validations to KEEP** | Same pattern + fincaId check. |
| **Return type** | `CatalogoPotreroResult` — `{ tipo: "disponible" | "no_disponible", options: readonly PotreroOption[] }` |

### 5. `listar-sectores-por-finca.ts` (46 lines)

| Aspect | Detail |
|---|---|
| **Whitelist** | `CANONICAL_SECTOR_IDS` — 5 IDs: `sec-esp-a`, `sec-esp-b`, `sec-esp-c`, `sec-rob-a`, `sec-rob-b` |
| **Decoder logic** | Lines 33-39 — same pattern. Line 36: `if (!CANONICAL_SECTOR_IDS.has(row.id)) return NO_DISPONIBLE` |
| **Extra validations** | Line 29: fincaId check |
| **Return type** | `CatalogoSectorResult` |

### 6. `listar-lotes-por-finca.ts` (47 lines)

| Aspect | Detail |
|---|---|
| **Whitelist** | `CANONICAL_LOTE_IDS` — 4 IDs: `lote-esp-2`, `lote-esp-4`, `lote-rob-1`, `lote-rob-2` |
| **Decoder logic** | Lines 34-40 — same pattern. Line 37: `if (!CANONICAL_LOTE_IDS.has(row.id)) return NO_DISPONIBLE` |
| **Return type** | `CatalogoLoteResult` |

### 7. `listar-grupos-por-finca.ts` (42 lines)

| Aspect | Detail |
|---|---|
| **Whitelist** | `CANONICAL_GRUPO_IDS` — 2 IDs: `grupo-esp-ordeno`, `grupo-rob-vientres` |
| **Decoder logic** | Lines 29-35 — same pattern. Line 32: `if (!CANONICAL_GRUPO_IDS.has(row.id)) return NO_DISPONIBLE` |
| **Return type** | `CatalogoGrupoResult` |

### 8. `listar-lugares-compra-por-finca.ts` (43 lines)

| Aspect | Detail |
|---|---|
| **Whitelist** | `CANONICAL_LUGAR_COMPRA_IDS` — 2 IDs: `lc-esp-feria`, `lc-esp-directa` |
| **Decoder logic** | Lines 30-36 — same pattern. Line 33: `if (!CANONICAL_LUGAR_COMPRA_IDS.has(row.id)) return NO_DISPONIBLE` |
| **Return type** | `CatalogoLugarCompraResult` |

---

## Reference Model Analysis: `listarCatalogoSexo`

**File**: `packages/aplicacion/src/casos-uso/listar-catalogo-sexo.ts` (41 lines)

### What it validates:
- Line 28: Empty list check — `if (rows.length === 0) throw new CatalogoSexoInvalidoError()`
- Line 17-22: `decodeSexo()` — validates `value` is literally `"0"`, `"1"`, or `"2"` (structural constraint of the sexo domain)
- Line 32-34: Duplicate decoded values check
- **No ID whitelist whatsoever** — any DB row with a valid `value` is accepted regardless of its `id`

### What it does NOT validate:
- Does NOT check `row.id` against any hardcoded set
- Does NOT return `{ tipo: "no_disponible" }` — it throws `CatalogoSexoInvalidoError` (caller handles via try/catch)
- Does NOT return a union type — returns `readonly SexoCatalogoOption[]` directly (different interface pattern)

### Key difference:
The sexo catalog trusts the DB as the source of truth for which IDs exist. It only validates the structural correctness of the `value` field (which has semantic meaning: 0=macho, 1=hembra, 2=pajuela). The 8 buggy use cases validate `id` against a hardcoded deployment-specific list — a fundamentally wrong approach since IDs are opaque identifiers, not semantic domain values.

---

## Test Coverage Assessment

### Unit tests per use case (in `packages/aplicacion/tests/`):

| Test File | Exists | Covers whitelist rejection | Would fail after fix? |
|---|---|---|---|
| `catalogo-raza.test.ts` | ✅ | ✅ Line 35-39: "non-canonical id" test | **YES** — this test asserts `no_disponible` for unknown IDs |
| `catalogo-color.test.ts` | ✅ | ✅ Line 36-40: "non-canonical id" test | **YES** — same |
| `catalogo-calidad.test.ts` | ✅ | ✅ Line 34-38: "non-canonical id" test | **YES** — same |
| `catalogo-finca-potrero.test.ts` | ✅ | ✅ Line 40-47: "non-canonical id" test | **YES** — same |
| `catalogo-finca-sector.test.ts` | ✅ | ✅ Line 38-44: "non-canonical id" test | **YES** — same |
| `catalogo-finca-lote.test.ts` | ✅ | ✅ Line 36-42: "non-canonical id" test | **YES** — same |
| `catalogo-finca-grupo.test.ts` | ✅ | ✅ Line 36-42: "non-canonical id" test | **YES** — same |
| `catalogo-finca-lugar-compra.test.ts` | ✅ | ✅ Line 46-52: "non-canonical id" test | **YES** — same |
| `catalogo-sexo.test.ts` | ✅ | N/A (no whitelist) | Unaffected |
| `animal-catalogos.test.ts` (integration) | ✅ | Uses canonical IDs in test data | Unaffected |

### Test migration needed:
All 8 test files have a test case titled `"returns {tipo: no_disponible} when a row has an unknown/noncanonical id"` that MUST be removed or rewritten. After the fix, an unknown ID should NOT trigger `no_disponible` — it should be accepted. These tests were testing the BUG behavior.

---

## Issue Claims Verification

### 1. Drizzle adapters already filter `WHERE activo = 1`

**CONFIRMED**. All Drizzle adapter methods in `packages/db/src/` use `and(eq(table.activo, 1), eq(table.fincaId, fincaId))` WHERE clauses:

- `catalogo-finca-infrastructure.ts` — Lines 67, 90, 111, 131, 152 all include `eq(<table>.activo, 1)`
- `catalogo-animal-maestro-infrastructure.ts` (confirmed via codegraph, same pattern)

The adapter tests (`catalogo-finca-infrastructure.test.ts` line 148-149) explicitly verify `expect(conditionContains(condition, "activo", 1)).toBe(true)`.

### 2. No downstream code depends on whitelist IDs being present

**CONFIRMED**. The downstream consumer chain is:
```
use case (returns {tipo, options}) 
  → mapUcSettled (checks tipo, maps {id, nombre} → {value, label}) 
    → AnimalCatalogResult (consumed by UI as value/label pairs)
```

The UI never inspects the raw IDs. The `mapUcSettled` function (lines 378-395 in `animal-actions.server.ts`) only reads `options[].id` and `options[].nombre` to produce `{ value: option.id, label: option.nombre }`. There is no reference to specific canonical ID strings anywhere in `apps/web/src/` outside of test/fixture data.

### 3. UI code references to whitelist values

**Partially confirmed — only in fixture/demo code**:
- `apps/web/src/lib/fixtures/animal-form-catalog.ts` contains hardcoded demo option lists with `value: "raza-angus"` etc., but this fixture is deprecated (it throws in production per lines 125-129). The production path uses `getAnimalCatalogsAction()` → `loadAnimalCatalogs` which loads from DB via the use cases.
- `apps/web/src/server/e2e-animals-fixture.server.ts` uses its OWN set of IDs (e.g., `"raza-angus"`, `"potrero-norte"`, `"lc-feria"`). Critically, some E2E fixture IDs like `"potrero-norte"` and `"lc-feria"` are **NOT in the canonical whitelists** — meaning E2E mode is already broken by this bug.

---

## Risk Assessment

### What could break if we remove whitelists?

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Invalid DB data surfaces to UI** | Low-Medium | Low — DB has FK constraints (`raza_id` references `config_razas.id`, etc.), so IDs must exist in the table. The adapter already filters `activo=1`. | FK constraints ensure referential integrity. |
| **Deleted/archived records with same ID** | Very Low | Medium — an inactive record re-activated could have unexpected data | Already mitigated by adapter's `activo=1` filter |
| **Duplicate ID from DB corruption** | Very Low | Low — duplicate check is kept in the fix | We keep the `seen` Set/Map duplicate check |
| **Sort fails on undefined nombre** | Low | Low — `nombre` could theoretically be null | The adapter maps from non-null column; `sort` would throw but it's caught by `try/catch` |
| **E2E tests start passing (regression)** | Intended | **Positive outcome** — E2E mode currently broken because fixture IDs differ from canonical | E2E test IDs will start working as expected |
| **Unit tests fail** | CERTAIN | **Positive** — need to update them to NOT reject unknown IDs | Requires test updates (remove the "non-canonical id → no_disponible" test cases) |

### Safe-to-remove analysis

The `CANONICAL_*_IDS` constants are ONLY referenced:
1. In their own use case file (definition + check)
2. In the corresponding test file (test data + assertion)

No other file in the codebase imports or references them. The grep for `CANONICAL_` across the entire codebase only returned matches in these 8 use case files.

---

## Recommended Approach

**Surgical fix — remove the whitelist check and constant, nothing more.**

For each of the 8 files, the change set is:

```
DELETE:
  - CANONICAL_*_IDS constant (entire ReadonlySet declaration)
  - The `if (!CANONICAL_*_IDS.has(row.id)) return NO_DISPONIBLE` line
  - The JSDoc comment describing the canonical set (lines like lines 11-14 in raza.ts)

KEEP:
  - null/undefined id type check (`if (!row.id || typeof row.id !== "string")`)
  - duplicate ID check (`if (seen.has(row.id))`)
  - empty list guard (`if (rows.length === 0)`)
  - fincaId validation (for finca-scoped: `if (!fincaId || typeof fincaId !== "string")`)
  - try/catch error handler
  - es-CO sort by nombre
  - All imports, interfaces, and export signatures (contract unchanged)
```

The resulting state matches the `listarCatalogoSexo` philosophy: **the DB is the source of truth** for which IDs exist, and the use case only validates structural integrity (non-null, correct type, no duplicates).

### Changed files (8 use cases + 8 test files = 16 files)

| File | Lines to remove | Lines to keep |
|---|---|---|
| `listar-catalogo-raza.ts` | 11-27 (CANONICAL block + check line 41) | All others |
| `listar-catalogo-color.ts` | 11-24 (CANONICAL block + check line 38) | All others |
| `listar-catalogo-calidad.ts` | 11-20 (CANONICAL block + check line 34) | All others |
| `listar-potreros-por-finca.ts` | 8-20 (CANONICAL block + check line 37) | All others |
| `listar-sectores-por-finca.ts` | 8-19 (CANONICAL block + check line 36) | All others |
| `listar-lotes-por-finca.ts` | 8-20 (CANONICAL block + check line 37) | All others |
| `listar-grupos-por-finca.ts` | 8-15 (CANONICAL block + check line 32) | All others |
| `listar-lugares-compra-por-finca.ts` | 8-16 (CANONICAL block + check line 33) | All others |

### Tests to update (8 files)

Each test file has an `"unknown/noncanonical id"` test case that must be changed:
- **BEFORE**: `it("returns {tipo: no_disponible} when a row has an unknown/noncanonical id", ...)` — asserts rejection
- **AFTER**: delete this test OR rewrite it to verify the unknown ID is accepted (the fix behavior)

All other tests (duplicate IDs, empty list, null id, sort order, fincaId validation) remain valid and should pass as-is.

### Contract stability

The return type signature (`CatalogoRazaResult`, etc.) and the `{ tipo, options }` shape do NOT change. The downstream `mapUcSettled` consumer continues to work unchanged. Zero changes needed in `apps/web/src/` or `packages/db/`.

---

## Decision

**Ready for Proposal**: Yes.

The next step is Produce (proposal), then Spec → Design → Tasks → Apply → Verify.
