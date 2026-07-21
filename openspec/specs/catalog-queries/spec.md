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

## Non-Requirements

- No new validations beyond null/duplicate/empty checks already present.
- No change to the return type contract `{ tipo, options }` or its consumer chain (`mapUcSettled`, UI).
- No adapter, schema, FK, or E2E fixture changes.
- `listarCatalogoSexo` is out of scope (already follows this contract).
