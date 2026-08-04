# Animal Timeline Specification

## Purpose

Define the animal timeline repository: UNION ALL over the 11 event source tables, per-source `dominio`/`tipo` mapping, chronological ordering (newest first), keyset cursor-based pagination, and composition with domain filtering (ficha tabs).

## Requirements

### Requirement: Event-Table Union Coverage

The timeline repository MUST return an animal's events by unioning all event sources: pesos, servicios, palpaciones, partos, producciones lácteas, aplicaciones sanitarias, revisiones veterinarias, condición corporal, ventas, muertes and ubicación histórica. The current synthetic creation-event stub MUST be removed.

#### Scenario: Events from multiple tables

- GIVEN an animal with a weighing, a servicio, a vaccination and a relocation
- WHEN the timeline is queried
- THEN items from all four source tables are returned

#### Scenario: Animal without events

- GIVEN an animal with no registered events
- WHEN the timeline is queried
- THEN an empty list is returned, with no synthetic event

### Requirement: Domain and Tipo Mapping

Each timeline item MUST carry `dominio` and `tipo` derived from its source table. The mapping MUST NOT be hardcoded to a single domain. Canonical mapping:

| Source | dominio | tipo (examples) |
|--------|---------|-----------------|
| pesos | produccion | pesaje |
| servicios / palpaciones / partos | reproduccion | servicio, palpacion, parto |
| producciones lacteas | produccion | produccion |
| aplicaciones sanitarias / revisiones veterinarias | sanidad | vacunacion, revision |
| condicion corporal | produccion | condicion |
| ventas / muertes / ubicacion historica | manejo | venta, muerte, reubicacion |

#### Scenario: Weighing maps to producción

- GIVEN a registered peso event
- WHEN the timeline is queried
- THEN the item carries dominio `produccion` and tipo `pesaje`

#### Scenario: Distinct domains preserved

- GIVEN events from reproducción, producción, sanidad and manejo sources
- WHEN the timeline is queried
- THEN each item carries the dominio of its own source table

### Requirement: Chronological Ordering

Timeline items MUST be ordered by event date, newest first. Registration already guarantees non-future event dates (RN-002), so the timeline MUST NOT apply date filtering beyond this ordering.

#### Scenario: Descending order

- GIVEN events dated 2026-03-20, 2026-04-02 and 2026-06-28
- WHEN the timeline is queried
- THEN items are returned in the order 28 jun, 2 abr, 20 mar

### Requirement: Cursor-Based Pagination

The timeline query MUST return a page of items plus an optional `nextCursor`, consistent with the existing pagination contract. Requesting the next page with that cursor MUST resume without repeating or skipping items. Domain filtering (ficha tabs) MUST compose with pagination.

#### Scenario: First page with more events

- GIVEN more events than the page size
- WHEN the first page is requested
- THEN the page of items and a nextCursor are returned

#### Scenario: Cursor resumes without duplicates

- GIVEN a first page and its nextCursor
- WHEN the next page is requested with that cursor
- THEN the following items are returned with no repeats or gaps

#### Scenario: Last page omits cursor

- GIVEN no further events beyond the current page
- WHEN the page is requested
- THEN nextCursor is absent

#### Scenario: Pagination within a domain filter

- GIVEN the Reproducción filter applied and more reproducción events than the page size
- WHEN the next page is requested
- THEN only reproducción items continue from the cursor
