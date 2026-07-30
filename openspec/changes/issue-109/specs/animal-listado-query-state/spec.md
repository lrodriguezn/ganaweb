# Animal Listado Query State Specification

## Purpose

Define Issue #109's typed, route-owned, replayable query state for the online animal list. The server contract remains authoritative.

## Requirements

### Requirement: Canonical Route Query State

The route MUST derive each request and rendered control model from valid `page`, `pageSize`, `sort`, `q`, `f.*`, and `cols` URL values. It MUST serialize filter grammar through #107 metadata; catalog/enumeration controls MUST send stable IDs/keys and display labels. #109 MUST preserve valid `pageSize` and `cols` for replay but MUST NOT own their mutation, selector, or persistence.

#### Scenario: Shared URL is reproducible

- GIVEN a URL with valid `q`, `f.razaId=in:raza-uuid`, `sort=razaLabel:desc`, `pageSize`, and `cols`
- WHEN it opens in a new tab
- THEN the route requests and renders that effective query using the stable ID
- AND controls and chips display their labels.

#### Scenario: Filter grammar is not label-derived

- GIVEN a user selects the label `Brahman` for a raza with ID `raza-uuid`
- WHEN the filter is committed
- THEN the URL contains `f.razaId=in:raza-uuid`
- AND it MUST NOT contain the display label as the filter value.

### Requirement: Query Mutations and History

The route MUST combine column filters with AND and global search with OR as defined by #107. A committed filter, chip removal, clear-all, or sort change MUST reset `page` to `1` and create a navigable history entry. Search MUST debounce for 300 ms and replace the current entry. Sortable columns MUST cycle ASC, DESC, then no-sort; no-sort MUST remove `sort`, request the canonical `codigo:asc`, and expose that effective order to `aria-sort`.

#### Scenario: Search replaces after debounce

- GIVEN the list is on page `3`
- WHEN the user stops typing a global search for 300 ms
- THEN `q` is committed with `page=1` by replacement
- AND the resulting request combines the search with active filters.

#### Scenario: Sort reaches no-sort

- GIVEN a column is currently sorted descending
- WHEN the user activates its sort control
- THEN `sort` is removed from the URL and the request uses `codigo:asc`
- AND the table reports `codigo:asc` as its effective accessible sort.

#### Scenario: Browser navigation replays state

- GIVEN two committed query states exist in browser history
- WHEN the user navigates Back or Forward
- THEN the route reloads the URL-derived state without retaining superseded control state.

### Requirement: Invalid Query Recovery and Request Currency

The route MUST retain the last valid table during a 400, remove the reported `campo`, reset `page` to `1` when that correction changes the dataset, replace the URL, and reload. It MUST correct one reported field per response so sequential invalid fields are recovered without discarding valid parameters. Only the latest request identity MAY update data, toast, or correction state; stale results MUST NOT overwrite or side-effect the current query.

#### Scenario: Sequential invalid fields are corrected

- GIVEN a valid table and a URL with two invalid filter fields
- WHEN the first 400 reports one `campo`
- THEN only that field is removed, the valid table remains, and the URL is replaced
- AND a later 400 corrects its reported remaining field on its own reload.

#### Scenario: Stale response is ignored

- GIVEN a request is pending when a newer query is committed
- WHEN the older request resolves after the newer request
- THEN it MUST NOT replace table data, show a toast, or alter the URL.

## Non-Goals

#110 owns pagination UI, column selection, `pageSize`/`cols` mutation, and preferences. #111 owns export UI, execution, downloads, and API use; it MAY consume the finalized serialized query read-only. Multi-sort, offline behavior, #107 changes, and `Lugar compra` are excluded.

## Rule Citations

- LA-001, LA-010–012, LA-020–021, LA-040–043, LA-090; PE-001–003.
