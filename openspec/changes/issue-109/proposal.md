# Proposal: Typed Animal List Query State (Issue #109)

## Intent

Deliver Issue #109 under epic #106: a reproducible typed desktop list with stable filter transport and navigation state. It builds on closed #107/#108 and preserves PE-001–003 authorization boundaries.

## Scope

### In Scope
- Route-owned URL state for valid `page`, `pageSize`, `sort`, `q`, `f.*`, and `cols`; controls send stable IDs/keys and display labels.
- Typed filters, AND filters/OR global search, 300 ms debounce, chips, clear-all, sort cycle, page reset, invalid-query recovery, and latest-request-wins loading.

### Out of Scope
- #110 pagination UI, column selector, preference persistence, or mutation of `cols`/`pageSize` ownership; valid values are preserved for replay.
- #111 export execution, dialog, download, and export API; it only consumes the finalized serialized query read-only.
- Changes to #107 validation/API, offline behavior, multi-sort, or `Lugar compra`.

## Capabilities

### New Capabilities
- `animal-listado-query-state`: Typed, replayable frontend query state for filters, search, sorting, URL/history, and correction.

### Modified Capabilities
- `animal-listado-desktop-ui`: Add #109-owned presentational controls and callbacks while retaining #108 data/failure/RBAC behavior.

## Approach

The route solely owns URL/history and requests; focused UI controls receive models and callbacks. `URLSearchParams` is serialized once through #107 metadata. Committed mutations are navigable; debounced search and 400 correction replace the entry. Browser history replays URL state.

No-sort removes `sort`; #107 applies canonical `codigo:asc`. Response and `aria-sort` reflect that effective order, not an unsupported unsorted response. Each 400 removes reported `campo`, resets page for dataset-shaping correction, replaces the URL, and reloads while retaining the last valid table. Request identity ignores stale results, toasts, and corrections.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `apps/web/src/routes/_app/fincas/$fincaId/animales.tsx` | Modified | Query, history, request, and recovery owner. |
| `apps/web/src/features/animal-listado/animal-listado-route-adapter.ts` | Modified | Query request seam. |
| `packages/ui/src/ganado/animal-listado-desktop.tsx` | Modified | Presentational controls and callbacks. |
| `apps/web/tests/animal-listado-route*.test.tsx` | Modified | Replay and recovery coverage. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| #111 route/toolbar collision | High | #109 owns query seams; merge/rebase #111 afterward. |
| Sequential 400 fields | Medium | Correct each field per reload; retain valid parameters/table. |

## Rollback Plan

Revert the #109 route/controller and UI callback changes; #107 defaults and #108 table continue serving `codigo:asc` without filter controls.

## Dependencies

- #107 and #108 closed contracts; #111 frontend rebases on this serialization seam.

## Success Criteria

- [ ] A valid shared URL reproduces filters, search, effective sort, and valid preserved query values.
- [ ] Controls serialize stable IDs/keys and grammar values; search debounces 300 ms.
- [ ] Invalid URLs self-correct without replacing the last valid table; stale responses cannot overwrite current state.
