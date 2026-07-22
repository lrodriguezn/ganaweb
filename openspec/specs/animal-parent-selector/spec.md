# Animal Parent Selector Specification

## Purpose

Contract for `CatalogoPadresPort` + `DrizzleCatalogoPadresAdapter` supplying `madre`/`padre` combobox options for the animal create/edit form. Separate from the eight config catalogs because parents query the `animales` table, not a master table.

## Requirements

### Requirement: Madre and Padre lists

The port MUST expose `listarMadres(fincaId, excludedIds)` and `listarPadres(fincaId, excludedIds)` returning `ComboboxOption[]`. Madre MUST include `sexoKey = 1`; padre MUST include `sexoKey ∈ {0, 2}` (Macho ∪ Pajuela). Both MUST include all estados, order by `codigo` (es-CO, T-003), and exclude any id in `excludedIds`. Each option MUST carry `id` and `label` formatted `código · nombre` (CA-CRE-003); `nombre = null` MUST degrade to `código` only.

#### Scenario: Madre list returns hembras only

- GIVEN finca-A has 3 hembras and 2 machos
- WHEN `listarMadres("finca-A", [])` runs
- THEN the result contains exactly the 3 hembras

#### Scenario: Padre list includes macho and pajuela

- GIVEN finca-A has 2 machos, 1 pajuela, 3 hembras
- WHEN `listarPadres("finca-A", [])` runs
- THEN the result contains 3 options (2 + 1)

#### Scenario: Current animal excluded

- GIVEN animal `a-123` is in either list
- WHEN the port is called with `excludedIds = ["a-123"]`
- THEN the result does NOT include `a-123`

#### Scenario: Null nombre degrades to código

- GIVEN a row with `nombre = null`
- WHEN the option is built
- THEN the label equals `código` with no `·` separator

### Requirement: Cross-finca denial and graceful degradation

The loader MUST revalidate `session.fincaActivaId === fincaId` (PE-002, PE-003). On a cross-finca request, the slot MUST return `{ tipo: "no_disponible" }` and the port MUST NOT be invoked. If the adapter throws on one list, that slot MUST return `{ tipo: "no_disponible" }` and the other MUST remain `disponible`. The loader MUST NOT substitute mock data (IA-001) and SHOULD log a `console.warn`.

#### Scenario: Cross-finca madre denied

- GIVEN `session.fincaActivaId = finca-A` and a request for `finca-B`
- WHEN the loader composes madre
- THEN madre state is `{ tipo: "no_disponible" }`
- AND no Drizzle query is issued for finca-B

#### Scenario: Adapter throw does not poison the other slot

- GIVEN the madre query throws and the padre query succeeds
- WHEN the loader composes both lists in parallel
- THEN madre is `no_disponible` AND padre is `disponible`
