# Proposal: Issue #110 — Animal List Pagination and Preferences

## Intent

Let authorized animal-list viewers control pagination and visible columns, with preferences retained per user and finca across devices. Preserve shareable URL query state while removing the need to repeatedly configure the table.

## Scope

### In Scope
- Pagination controls and page-size selection (25, 50, 100); page stays URL-owned.
- Column selector for 36 registered columns; `codigo` and `nombre` stay visible and immutable.
- Online per-user/per-finca persistence of columns and page size, including reset to 29 base columns and 25 rows.
- Loading/saving failures: safe base fallback, warning, and retry; last-write-wins concurrent saves.

### Out of Scope
- Offline preference synchronization, multi-sort, or `Lugar compra`.
- Persisting the current page or changing the animal-list read contract.

## Capabilities

### New Capabilities
- `animal-listado-preferences`: Authorized, validated per-user/per-finca retrieval and last-write-wins storage of animal-list columns and page size.

### Modified Capabilities
- `animal-listado-desktop-ui`: Add presentational pagination, column selection, reset, and preference-warning/retry states.
- `animal-listado-query-state`: Allow route mutations for `page`, `pageSize`, and `cols`, while retaining URL replay and request-currency rules.

## Approach

Add a dedicated preference table keyed by user and finca, plus an application port and authenticated GET/PUT boundary. Normalize saved columns against the canonical registry, enforce mandatory columns, and initialize the route from preferences unless valid URL state overrides it. Debounce/serialize saves; later writes win. Enforce PE-001–003 in UI and server.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `packages/db/src/schema/` | New | Preference schema and migration. |
| `packages/aplicacion/src/puertos/` | New | Preference port/use case. |
| `apps/web/src/server/animal-list-*` | Modified | Preference API, validation, authorization. |
| `apps/web/src/routes/_app/fincas/$fincaId/animales.tsx` | Modified | URL state and preference lifecycle. |
| `apps/web/src/features/animal-listado/` | Modified | Pagination and column controls. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Cross-finca/user leakage | Low | Composite key and server-side PE-001–003 checks. |
| Async load/save races | Medium | Request identity and last-write-wins serialization. |

## Rollback Plan

Revert the preference endpoints/UI and migration per project migration policy; the list continues with its canonical 29 columns and 25-row default.

## Dependencies

- Existing #107–#109 list query and authorization contracts.

## Success Criteria

- [ ] Authorized users retain columns and page size across devices for the same finca; other users/fincas do not.
- [ ] First visit, reset, and failed reads use 29 base columns and 25 rows; `codigo` and `nombre` remain visible.
- [ ] Failed saves preserve the session selection, show a retryable warning, and later writes win.
