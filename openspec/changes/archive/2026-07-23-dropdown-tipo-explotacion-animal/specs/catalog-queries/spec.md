# Delta for catalog-queries

## ADDED Requirements

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
