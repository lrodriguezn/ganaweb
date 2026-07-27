# Exploration: Server-Side Animal List Reliability (Issue #113)

## 1. Risk 1: Impossible Calendar Date Bypasses `isIsoDate` Validation

### Confirmation

**CONFIRMED.** `Date.parse()` in Node.js wraps impossible dates to the next valid date instead of returning `NaN`.

```javascript
Date.parse("2026-02-31T00:00:00Z")  // → 1772496000000 (2026-03-03T00:00:00.000Z)
Date.parse("2026-04-31T00:00:00Z")  // → 1777593600000 (2026-05-01T00:00:00.000Z)
Date.parse("2026-02-29T00:00:00Z")  // → 1772323200000 (2026-03-01T00:00:00.000Z) — not a leap year
Date.parse("2024-02-30T00:00:00Z")  // → 1709251200000 (2024-03-01T00:00:00.000Z)
```

`isIsoDate("2026-02-31")` returns **`true`** despite `2026-02-31` not being a valid calendar date.

The regex check `\d{4}-\d{2}-\d{2}` accepts the format, and `Date.parse` silently wraps rather than failing.

### Validation Chain Trace

```
URL query: f.fechaNacimiento=drange:2026-02-31,2026-03-15
  ↓
parseAnimalListadoQuery
  ↓  isValidFilterValue("drange", "2026-02-31,2026-03-15")
  ↓    → split by "," → ["2026-02-31", "2026-03-15"]
  ↓    → every(isIsoDate) → isIsoDate("2026-02-31") → true ← BYPASS
  ↓
filter: { key: "fechaNacimiento", grammar: "drange", value: "2026-02-31,2026-03-15" }
  ↓  → buildAnimalListadoPredicates
  ↓    → sql`a.fecha_nacimiento BETWEEN ${"2026-02-31"} AND ${"2026-03-15"}`
```

The 400 rejection SHOULD happen at `isValidFilterValue` → `isIsoDate`, but it DOESN'T for impossible dates.

### Downstream Impact

The `fecha_nacimiento` column is `integer("fecha_nacimiento")` — it stores **epoch seconds** (see seed comment), NOT ISO date strings. The BETWEEN clause compares integer epoch seconds against ISO date strings. PostgreSQL cannot implicitly cast `'2026-02-31'::text` to `integer`, so the query **would crash at the SQL layer** with a 500 error, not a 400 validation response.

This means: the `isIsoDate` bypass doesn't cause silently wrong data, but it **converts a 400 into a 500**, which is a reliability regression.

**Validation gap**: Even valid ISO dates wouldn't work correctly as `drange` filters against epoch-second integer columns — the filter grammar is fundamentally mismatched with the data type.

---

## 2. Risk 2: Boolean Filter `esDeMonta` vs Integer Column `es_de_monta`

### Confirmation

**CONFIRMED type mismatch.** Three distinct type layers with conflicting expectations:

| Layer | Type | Source |
|-------|------|--------|
| DTO (`AnimalListadoRowDto`) | `boolean` | Contract line 41 |
| PostgreSQL column (`es_de_monta`) | `integer` (0/1) | Schema `animales.ts` line 47 |
| Filter grammar validation | "bool" → `"true"` / `"false"` | Contract line 317 |

### Filter Flow Trace

```
URL query: f.esDeMonta=bool:true
  ↓
parseAnimalListadoQuery
  ↓  isValidFilterValue("bool", "true") → true  ← OK at contract layer
  ↓
filter: { key: "esDeMonta", grammar: "bool", value: "true" }
  ↓
buildAnimalListadoPredicates (line 796-797):
    sql`${sql`a.es_de_monta`} = ${true}`     ← JavaScript boolean
  ↓
PostgreSQL: a.es_de_monta = $1  with $1 = true (PG boolean)
  ↓
CRASH: "operator does not exist: integer = boolean"
```

`a.es_de_monta` is an `integer` column. The `postgres` driver serializes JavaScript `true` as PG `boolean`. PostgreSQL has no implicit cast between `integer` and `boolean` — the comparison **fails at the SQL layer**.

### Contrast with Other Bool Columns

`tatuado`, `herrado`, `descornado` are actual `boolean` PG columns (from Drizzle schema), so `= true` works correctly for them. Only `esDeMonta` is affected because it's `integer`.

### Write Path (unaffected)

The write path handles the integer correctly:
```typescript
// buildUpdateSet line 597:
if (cambios.esDeMonta !== undefined) set.esDeMonta = cambios.esDeMonta ? 1 : 0
```

And the read path in `mapAnimalListadoDbRow`:
```typescript
esDeMonta: Number(row.es_de_monta ?? 0) === 1
```

Only the **filter predicate** path is broken.

---

## 3. Risk 3: `fechaNacimiento` / `fechaCompra` Integer-to-Null Mapping

### Confirmation

**CONFIRMED.** Both `fechaNacimiento` and `fechaCompra` are **always `null`** in the listado response. This also makes `edadAnios` always `null`.

### Root Cause

The DB stores dates as **epoch seconds (integer)**:
```typescript
// Schema: packages/db/src/schema/animales.ts
fechaNacimiento: integer("fecha_nacimiento"),
fechaCompra: integer("fecha_compra"),

// Seed: "epoch en segundos, UTC"
// Example: 1615507200 = 2021-03-12T00:00:00Z
```

The listado read model (`mapAnimalListadoDbRow`) uses `nullableString` to convert the raw DB value:

```typescript
// Line 722-723
const fechaNacimiento = nullableString(row.fecha_nacimiento)
const birth = fechaNacimiento ? new Date(`${fechaNacimiento}T00:00:00Z`) : null
```

But `nullableString` checks `typeof value === "string"`:

```typescript
function nullableString(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null
}
```

The `postgres` (postgres-js) driver returns integer columns as JavaScript **numbers** (not strings). So `nullableString(1615507200)` → **always `null`**.

### Propagation

| Field | Status |
|-------|--------|
| `fechaNacimiento: string \| null` | Always `null` |
| `fechaCompra: string \| null` | Always `null` |
| `edadAnios: number \| null` | Always `null` (birth computed from null) |

### Existing Tests Don't Catch This

The PostgreSQL integration tests (`animal-listado-postgres.test.ts`) insert animals **without** setting `fecha_nacimiento` or `fecha_compra`:
```sql
-- No fecha_nacimiento column in test INSERT
INSERT INTO animales (id, finca_id, codigo, nombre, sexo_key, tipo_ingreso_id, activo)
```

These columns are `NULL` in the test DB, so `null` output is correct for the test scenario. The tests never assert on `fechaNacimiento`, `fechaCompra`, or `edadAnios`.

The unit tests (`animal-list-server-contract.test.ts`) test `calculateAnimalAge` function directly, but `calculateAnimalAge` is NOT the function used in the listado read model — `mapAnimalListadoDbRow` has its own inline age calculation.

### Correct Mapping

The fix needs an epoch-to-ISO conversion:
```typescript
function epochToIsoDate(epoch: number | null | undefined): string | null {
  if (epoch === null || epoch === undefined) return null
  return new Date(epoch * 1000).toISOString().slice(0, 10)
}
```

- `epochToIsoDate(1615507200)` → `"2021-03-12"`
- `epochToIsoDate(null)` → `null`

---

## 4. Existing Test Coverage

### `apps/web/tests/animal-list-server-contract.test.ts` (unit)

**Covers:**
- Registry shape (36 columns)
- Nullable row mapping (`mapAnimalListadoRow`)
- Parse defaults and column normalization
- Invalid grammar/pageSize/cols rejection
- Error envelope format
- `calculateAnimalAge` function directly
- `selectLatestAnimalWeight` function
- `resolveAnimalOrigen` function
- HTTP handler: 400, 403, 500, successful 200

**Gaps:**
- ❌ No test for `isIsoDate` with impossible dates (Feb 31, Apr 31, non-leap Feb 29)
- ❌ No test for `isValidFilterValue` with `drange` grammar and edge-case dates
- ❌ No test for `isValidFilterValue` with `bool` grammar
- ❌ No integration test for `esDeMonta` filter through the full pipeline
- ❌ No test for `edadAnios` computation via `mapAnimalListadoDbRow`

### `packages/db/tests/animal-listado-postgres.test.ts` (integration)

**Covers:**
- Authorization (missing permission, cross-farm)
- Finca-scoped filtering
- Pagination stability and tie-breaking
- Accent-insensitive `q` and `contains` matching
- SQL-injection resistance (literal %, _, !, OR 1=1)
- Fixed statement count (3 per request)

**Gaps:**
- ❌ No animal with `fecha_nacimiento` or `fecha_compra` values inserted
- ❌ No filter test for `drange` grammar
- ❌ No filter test for `bool` grammar
- ❌ No filter test for `esDeMonta` key
- ❌ No assertion on `fechaNacimiento`, `fechaCompra`, or `edadAnios` fields
- ❌ No assertion on `esDeMonta` value in response

### `packages/aplicacion/tests/animal-listado-port.test.ts` (port contract)

**Covers:** Port interface shape only. Minimal structural validation.

### Overall Coverage Gap

The `drange` filter, `bool` filter for `esDeMonta`, and epoch-to-ISO conversion in `mapAnimalListadoDbRow` have **zero test coverage**. The three risks are entirely uncovered.

---

## 5. Recommendations

### Required Tests

**Contract layer (unit tests — `animal-list-server-contract.test.ts`):**
1. `isIsoDate` — test impossible dates return `false`: Feb 31, Apr 31, non-leap Feb 29, month 13
2. `isIsoDate` — test valid dates return `true`: leap-year Feb 29, normal dates
3. `isValidFilterValue` — test `bool` grammar with `"true"`/`"false"`/invalid values
4. `parseAnimalListadoQuery` — test `drange` filter with impossible dates returns `{ ok: false }`
5. `parseAnimalListadoQuery` — test `bool` filter for `esDeMonta` returns valid filter
6. Integration test for `mapAnimalListadoDbRow` with epoch date values (if extractable)

**Integration layer (postgres tests — `animal-listado-postgres.test.ts`):**
7. Insert animals with known `fecha_nacimiento` and `fecha_compra` epoch values
8. Assert `fechaNacimiento`, `fechaCompra`, and `edadAnios` in response are correct ISO strings / number
9. Filter by `drange` on `fechaNacimiento` with valid ISO dates
10. Filter by `bool` on `esDeMonta` with `"true"` and `"false"`

### Required Code Fixes

| Risk | Fix | Priority |
|------|-----|----------|
| 1 (isIsoDate) | Add strict date validation in `isIsoDate`: parse components or validate against calendar days per month | HIGH |
| 1 (drange mismatch) | Convert ISO date filter values to epoch seconds in `buildAnimalListadoPredicates` OR convert column to text in SQL | MEDIUM |
| 2 (bool vs int) | In `buildAnimalListadoPredicates`, use `filter.value === "true" ? 1 : 0` instead of JS boolean for integer columns | HIGH |
| 3 (epoch→ISO) | Add `epochToIsoDate` conversion function; replace `nullableString(row.fecha_nacimiento)` with it | HIGH |

### Fix Detail: `isIsoDate`

```typescript
function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(`${value}T00:00:00Z`)
  // Validate that the parsed date matches the input (catches impossible dates)
  return (
    !Number.isNaN(date.getTime()) &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  )
}
```

### Fix Detail: `buildAnimalListadoPredicates` for bool grammar on integer columns

```typescript
// Current (broken for esDeMonta):
predicates.push(sql`${column} = ${filter.value === "true"}`)

// Fix — use 0/1 for integer columns:
predicates.push(sql`${column} = ${filter.value === "true" ? 1 : 0}`)
```

This works for both integer and boolean PG columns because `boolean_column = 1` is also valid in PostgreSQL (1→true, 0→false).

### Fix Detail: epochToIsoDate in `mapAnimalListadoDbRow`

Replace:
```typescript
const fechaNacimiento = nullableString(row.fecha_nacimiento)
```

With:
```typescript
const fechaNacimiento = epochToIsoDate(row.fecha_nacimiento)
```

Where:
```typescript
function epochToIsoDate(epoch: number | null | undefined): string | null {
  if (epoch === null || epoch === undefined) return null
  return new Date(epoch * 1000).toISOString().slice(0, 10)
}
```

---

## 6. Estimated Scope

### Files Likely to Change

| File | Change |
|------|--------|
| `apps/web/src/server/animal-list-contract.ts` | Fix `isIsoDate` validation; add `epochToIsoDate` (or extract to a date utility) |
| `packages/db/src/animal-infrastructure.ts` | Fix `buildAnimalListadoPredicates` bool filter; fix `mapAnimalListadoDbRow` date conversion |
| `apps/web/tests/animal-list-server-contract.test.ts` | Add `isIsoDate`, `isValidFilterValue`, date edge-case tests |
| `packages/db/tests/animal-listado-postgres.test.ts` | Add animals with dates, test drange/bool filters, assert date fields |
| `packages/aplicacion/tests/animal-listado-port.test.ts` | (optional) Expand port contract test |

### Test File Status

- Existing files to modify: `animal-list-server-contract.test.ts`, `animal-listado-postgres.test.ts`
- No new test files needed — all tests fit into existing fixtures

### Review Budget

- ~100-150 lines of production code changes (mostly contract + infrastructure)
- ~150-200 lines of test additions
- Well under the 400-line guard; single PR should suffice

---

## Summary

All three risks are **confirmed real defects**. The existing test suites have zero coverage for date validation edge cases, the `bool` filter path for `esDeMonta`, and the epoch-to-ISO conversion in `mapAnimalListadoDbRow`. Fixes are straightforward and localized. Integration tests require adding date-bearing animals to the test fixture.

**Delivery strategy**: Single PR. All changes are tightly related (date/bool filter reliability in the listado flow). The fix for Risk 3 (epoch→ISO) is required before Risk 1's drange filter can work correctly, since valid ISO dates must pass through the system properly before we can test that impossible dates are rejected.
