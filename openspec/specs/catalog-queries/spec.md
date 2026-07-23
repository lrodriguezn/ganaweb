# Spec: catalog-queries

## Purpose

Contract for the eight catalog use cases in `packages/aplicacion/src/casos-uso/`. The DB is the source of truth for which IDs exist; the decoder validates structure only and MUST NOT filter rows by a hardcoded ID whitelist.

## ADDED Requirements

### Requirement: Catalog Decoder Source Of Truth

A non-sexo catalog decoder MUST accept every row that passes structural validation. The DB port (already filtered by `activo = 1` and, where applicable, `fincaId = X`) is authoritative for membership; the use case MUST NOT maintain or consult a hardcoded ID whitelist.

The decoder MUST reject a row only when its `id` is null, undefined, not a string, or duplicates a previously seen `id` in the same response. For finca-scoped catalogs, the decoder MUST also reject when the `fincaId` argument is null or not a string.

| Scenario | GIVEN | WHEN | THEN |
|---|---|---|---|
| Unknown ID accepted | DB returns rows with IDs outside any prior set (e.g., `potrero-norte`, `lc-feria`) | decoder runs | every row in `options`; `tipo` = `"disponible"` |
| Empty result | DB returns `[]` | decoder runs | `{ tipo: "no_disponible", options: [] }` |
| Null id rejected | a row has null/undefined `id` | decoder runs | `{ tipo: "no_disponible", options: [] }` |
| Duplicates deduped | two rows share an `id` | decoder runs | one option emitted; `tipo` = `"disponible"` |
| Missing fincaId | finca-scoped use case called with null `fincaId` | decoder runs | `{ tipo: "no_disponible", options: [] }` |
| Sort order | rows with mixed `nombre` | decoder runs | `options` sorted ascending by `nombre` using `es-CO` locale |

## MODIFIED Requirements

For each of the eight use cases below, the decoder MUST NOT consult the prior `CANONICAL_*_IDS` set. Any row with a non-null string `id` that does not duplicate a prior row in the same response is emitted as an option. All other structural checks (null/duplicate/empty, `fincaId` where applicable, es-CO sort) are preserved.

| Use case (file) | Prior whitelist | Replacement rule |
|---|---|---|
| `listarCatalogoRaza` (`listar-catalogo-raza.ts`) | `CANONICAL_RAZA_IDS` (11 IDs) | accept any structurally valid row |
| `listarCatalogoColor` (`listar-catalogo-color.ts`) | `CANONICAL_COLOR_IDS` (8 IDs) | accept any structurally valid row |
| `listarCatalogoCalidad` (`listar-catalogo-calidad.ts`) | `CANONICAL_CALIDAD_IDS` (4 IDs) | accept any structurally valid row |
| `listarPotrerosPorFinca` (`listar-potreros-por-finca.ts`) | `CANONICAL_POTRERO_IDS` (6 IDs) | accept any structurally valid row + `fincaId` check |
| `listarSectoresPorFinca` (`listar-sectores-por-finca.ts`) | `CANONICAL_SECTOR_IDS` (5 IDs) | accept any structurally valid row + `fincaId` check |
| `listarLotesPorFinca` (`listar-lotes-por-finca.ts`) | `CANONICAL_LOTE_IDS` (4 IDs) | accept any structurally valid row + `fincaId` check |
| `listarGruposPorFinca` (`listar-grupos-por-finca.ts`) | `CANONICAL_GRUPO_IDS` (2 IDs) | accept any structurally valid row + `fincaId` check |
| `listarLugaresCompraPorFinca` (`listar-lugares-compra-por-finca.ts`) | `CANONICAL_LUGAR_COMPRA_IDS` (2 IDs) | accept any structurally valid row + `fincaId` check |

#### Scenario: E2E fixture ids no longer collapse the catalog

- GIVEN any catalog use case receives rows whose `id` is NOT in the prior canonical set (e.g., `potrero-norte`, `lc-feria`)
- WHEN the decoder runs
- THEN those rows appear in `options` and `tipo` is `"disponible"`

### Requirement: listarCatalogoTipoExplotacion use case (9th catalog use case)

The system MUST provide a `listarCatalogoTipoExplotacion` use case that consumes `CatalogoAnimalMaestroPort` and returns a strict, typed DTO of every row in `config_tipos_explotacion`. The adapter MUST NOT apply the `activo = 1` filter for this table — inactive rows MUST be returned alongside active rows so users can still select an inactive category for an existing animal. The decoder MUST accept every structurally valid row (no `CANONICAL_*_IDS` whitelist), MUST sort es-CO by `nombre` (T-003), and MUST reject only null-id, unknown, and duplicate rows. On empty result, the use case MUST return `{ tipo: "no_disponible", options: [] }`. The `tipoExplotacion` slot in `loadAnimalCatalogs` MUST wrap this use case through `mapUcSettled` the same way it wraps `listarCatalogoRaza`, `listarCatalogoColor`, and `listarCatalogoCalidad`. This deviates from the rest of the maestro family (which filters by `activo=1`) and the deviation is intentional and documented here.

#### Scenario: All rows are returned, actives and inactives

- GIVEN `config_tipos_explotacion` has rows with `activo = true` AND `activo = false`
- WHEN `listarCatalogoTipoExplotacion` runs
- THEN it returns one option per row (no `activo = 1` filter applied)
- AND options are sorted by `nombre` with es-CO locale

#### Scenario: Empty catalog returns no_disponible

- GIVEN `config_tipos_explotacion` has no rows
- WHEN the use case runs
- THEN it returns `{ tipo: "no_disponible", options: [] }`
- AND the UI renders EmptyState without a `+ Crear el primero` affordance (read-only catalog)

#### Scenario: Null and duplicate rows are rejected

- GIVEN the source table contains null-id or duplicate-id rows
- WHEN the decoder validates
- THEN those rows are excluded or the catalog is rejected with a diagnosable failure
- AND no partial option set is emitted

#### Scenario: Decoder does not consult a canonical id whitelist

- GIVEN any catalog use case receives rows whose `id` is NOT in any prior canonical set (e.g., a freshly seeded `te-cria`, `te-leche`)
- WHEN the decoder runs
- THEN those rows appear in `options` and `tipo` is `"disponible"`

#### Scenario: Graceful degradation when table is empty

- GIVEN the database is reachable but `config_tipos_explotacion` is empty
- WHEN `loadAnimalCatalogs` composes the catalog
- THEN the `tipoExplotacion` slot resolves to `{ tipo: "no_disponible", options: [] }`
- AND no mock or demo options are substituted

## Non-Requirements

- No new validations beyond null/duplicate/empty checks already present.
- No change to the return type contract `{ tipo, options }` or its consumer chain (`mapUcSettled`, UI).
- No adapter, schema, FK, or E2E fixture changes.
- `listarCatalogoSexo` is out of scope (already follows this contract).
