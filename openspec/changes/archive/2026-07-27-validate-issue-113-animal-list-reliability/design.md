# Design: Animal List Reliability (Issue #113)

## Technical Approach

Three independent defects in the server-side animal list flow get localized fixes in two layers: the HTTP contract (parser validation) and the DB read model (row mapping + predicate builder). Test-first TDD per `rules.apply.tdd: true`. All three ship in one PR because the `drange` integration test requires the epoch→ISO mapping fix to be in place first.

## Architecture Decisions

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Placement of `epochToIsoDate` | `animal-infrastructure.ts` next to `nullableString` (file-private) | Used only in `mapAnimalListadoDbRow`; co-located keeps the read-row contract self-contained. Out of scope per proposal. |
| 2 | `isIsoDate` strictness | Parse `YYYY-MM-DD`, build UTC `Date`, verify round-trip equality | Zero new deps; UTC round-trip catches Feb 31, non-leap Feb 29, month 13. |
| 3 | `bool` filter coercion | `filter.value === "true" ? 1 : 0` for all `bool` filters | PostgreSQL accepts `boolean_col = 1` natively, so a single coercion works for `es_de_monta` (int) AND `tatuado`/`herrado`/`descornado` (bool). |
| 4 | `drange` epoch conversion | New `isoToEpochStart(iso)` helper; used for `fechaNacimiento` and `fecha_compra` columns | Mirrors the read mapping's epoch semantics; reverses `epochToIsoDate` exactly. |
| 5 | Test fixture scope | Add epoch values to existing animals; add one `animal-bool` | Minimum new state to assert `bool` filter; existing 8-animal harness covers pagination/tie-breaking. |

## Data Flow

```
URL f.fechaNacimiento=drange:2021-03-12,2021-03-20
  ▼ parseAnimalListadoQuery
  │   isIsoDate (strict) on each half → both valid → pass
  │   filter: { key: "fechaNacimiento", grammar: "drange", value: "..." }
  ▼ buildAnimalListadoPredicates
  │   isoToEpochStart("2021-03-12") = 1615507200
  │   sql`a.fecha_nacimiento BETWEEN 1615507200 AND 1616198400`
  ▼ mapAnimalListadoDbRow
      epochToIsoDate(1615507200) → "2021-03-12"
      edadAnios computed from "2021-03-12" via inline age math
  ▼ DTO: { fechaNacimiento: "2021-03-12", edadAnios: <years>, ... }
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/web/src/server/animal-list-contract.ts` | Modify | Replace `isIsoDate` regex+`Date.parse` with strict round-trip check. No new exports. |
| `packages/db/src/animal-infrastructure.ts` | Modify | Add `epochToIsoDate` and `isoToEpochStart` (file-private). Wire `epochToIsoDate` into `mapAnimalListadoDbRow`. In `buildAnimalListadoPredicates`: coerce `bool`→`1`/`0`; convert `drange` bounds for `fechaNacimiento`/`fechaCompra` via `isoToEpochStart`. |
| `apps/web/tests/animal-list-server-contract.test.ts` | Modify | Add `testIsIsoDateStrictness` (Feb 31, non-leap Feb 29, leap Feb 29, month 13). Add parser tests for `drange` valid/impossible and `bool` invalid values. |
| `packages/db/tests/animal-listado-postgres.test.ts` | Modify | Seed `fecha_nacimiento`/`fecha_compra` epoch values; insert `animal-bool` (`es_de_monta=1`). Add three `it` cases: epoch→ISO mapping, `bool` filter on `esDeMonta`, `drange` filter on `fechaNacimiento`. |

## Interfaces / Contracts

```typescript
// animal-infrastructure.ts (file-private)
function epochToIsoDate(epoch: number | null | undefined): string | null {
  if (epoch === null || epoch === undefined) return null
  return new Date(epoch * 1000).toISOString().slice(0, 10)
}

function isoToEpochStart(iso: string): number {
  return Math.floor(Date.parse(`${iso}T00:00:00Z`) / 1000)
}
```

Predicate builder changes:
```typescript
} else if (filter.grammar === "bool")
  predicates.push(sql`${column} = ${filter.value === "true" ? 1 : 0}`)
else {
  const [min, max] = filter.value.split(",")
  const bounds = isEpochDateColumn(filter.key)
    ? [isoToEpochStart(min ?? ""), isoToEpochStart(max ?? "")]
    : [min ?? "", max ?? ""]
  predicates.push(sql`${column} BETWEEN ${bounds[0]} AND ${bounds[1]}`)
}
```

`isEpochDateColumn` is a small `filter.key === "fechaNacimiento" || filter.key === "fechaCompra"` check; both columns are `integer` epoch seconds per `animales.ts`.

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit (contract) | `isIsoDate` impossible dates rejected; leap Feb 29 accepted; parser rejects `drange` impossible; parser accepts `drange` valid; parser rejects `bool` non-`true`/`false` | New test functions in `animal-list-server-contract.test.ts`. |
| Integration (postgres) | Epoch values map to ISO `fechaNacimiento`/`fechaCompra`/`edadAnios`; `bool` filter on `esDeMonta` returns matching rows (no 500); `drange` filter on `fechaNacimiento` returns matching rows; existing statement count (3) preserved | Extend `animal-listado-postgres.test.ts`. Seed values: `animal-1`→`1577836800` (2020-01-01), `animal-2`→`1615507200` (2021-03-12), `animal-3`→`1735689600` (2025-01-01). New `animal-bool` row with `es_de_monta=1`. |

## TDD Sequence

| # | RED test | Fix |
|---|----------|-----|
| 1 | `testIsIsoDateStrictness` (Feb 31, non-leap Feb 29); parser test: `drange:2026-02-31,...` → `{ok:false}` | Strict round-trip `isIsoDate` |
| 2 | Integration: response row has `fechaNacimiento: "2020-01-01"` from epoch `1577836800` | Add `epochToIsoDate`; wire into `mapAnimalListadoDbRow` |
| 3 | Integration: `bool` filter `esDeMonta=true` returns `animal-bool` (currently 500) | Coerce `bool`→`1`/`0` in predicate builder |
| 4 | Integration: `drange:2021-03-12,2021-03-20` returns matching rows (currently 500) | Add `isoToEpochStart`; apply in `drange` branch for date columns |
| 5 | `pnpm turbo test` — no regressions in existing 400/403/500/authorization/pagination tests | — |

Cycle 4 depends on cycle 2 because the integration test must assert ISO strings in the response. Cycles 3 and 4 are independent of each other but both come after the row-mapping fix.

## Migration / Rollout

No migration. No schema or DTO changes. Single revertible PR.

## Threat Matrix

N/A — pure data transformation; no routing, shell, subprocess, VCS, or process-integration boundary.

## Open Questions

None. The proposal, exploration, and spec are aligned.
