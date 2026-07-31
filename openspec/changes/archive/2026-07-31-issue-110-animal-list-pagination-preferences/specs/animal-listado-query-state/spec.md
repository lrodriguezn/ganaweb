# Delta for Animal Listado Query State

## MODIFIED Requirements

### Requirement: Canonical Route Query State

The route MUST derive each request and rendered control model from valid `page`, `pageSize`, `sort`, `q`, `f.*`, and `cols` URL values. It MUST serialize filter grammar through #107 metadata; catalog/enumeration controls MUST send stable IDs/keys and display labels. It MUST load normalized finca preferences for absent `pageSize` and `cols`, but valid URL values MUST override them. It MUST own mutations for `page`, `pageSize`, and `cols`; the current page MUST remain URL-owned and preferences MUST NOT persist it. On first visit, reset, or failed preference load, it MUST use 29 base columns and page size 25.
(Previously: `pageSize` and `cols` were replay-only and not mutated or initialized from preferences.)

#### Scenario: Shared URL is reproducible
- GIVEN a URL with valid `q`, `f.razaId=in:raza-uuid`, `sort=razaLabel:desc`, `pageSize`, and `cols`
- WHEN it opens in a new tab
- THEN the route requests and renders that effective query using the stable ID
- AND controls and chips display their labels.

#### Scenario: Filter grammar is not label-derived
- GIVEN a user selects `Brahman` for ID `raza-uuid`
- WHEN the filter is committed
- THEN the URL contains `f.razaId=in:raza-uuid`
- AND it MUST NOT contain the display label as the filter value.

#### Scenario: URL overrides preferences
- GIVEN saved preferences and valid `pageSize` or `cols` in a shared URL
- WHEN the route initializes
- THEN it uses the valid URL values without changing their ownership.

#### Scenario: Failed preference load uses defaults
- GIVEN preferences cannot be loaded and URL values are absent
- WHEN the route initializes
- THEN it renders 29 base columns and page size 25 with a retryable warning.

### Requirement: Query Mutations and History

The route MUST combine column filters with AND and global search with OR as defined by #107. A committed filter, chip removal, clear-all, sort, page-size, or column mutation MUST reset `page` to `1` and create a navigable history entry. A page mutation MUST update only `page`. It MUST request preference storage after a page-size or column mutation, retain the session selection on failure, and expose retryable failure state. Search MUST debounce for 300 ms and replace the current entry. Sortable columns MUST cycle ASC, DESC, then no-sort; no-sort MUST remove `sort`, request canonical `codigo:asc`, and expose that effective order to `aria-sort`.
(Previously: Only filters and sort mutated query state; page, page size, and columns were excluded.)

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

#### Scenario: Page mutation preserves other query state
- GIVEN page `2` with valid filters, sort, size, and columns
- WHEN the viewer selects page `3`
- THEN only `page=3` changes in the URL.

#### Scenario: Failed preference save preserves session state
- GIVEN a page-size or column mutation and a save failure
- WHEN the route handles the failure
- THEN the URL and effective selection remain and retry is available.

## Rule Citations

- LA-001, LA-010–012, LA-020–021, LA-040–043, LA-090; PE-001–003.
