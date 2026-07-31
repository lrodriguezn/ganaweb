# Proposal: Desktop Animal List (Issue #108)

## Intent

Deliver the frontend slice of epic #106: an online-only, accessible desktop table that lets authorized users inspect animals using the delivered #107 server contract. Replace the legacy four-column CRUD presentation without redefining server ownership, authorization, or the canonical DTO.

## Scope

### In Scope
- Integrate `/fincas/$fincaId/animales` with the #107 endpoint and its 36-field DTO through a typed route adapter.
- Render the canonical 29 default columns, recognize all 36, freeze `Código`/`Nombre`, and provide sticky header, horizontal overflow, row-to-ficha navigation, and null-safe Spanish presentation.
- Provide loading, finca-empty, no-results, 400-preserved-table/URL-sanitization, 403, and 500/timeout retry states (LA-040–043, LA-060–063).
- Visually gate `Nuevo animal` and `Exportar` by permissions; preserve server enforcement (LA-RBAC-02/03; PE-001–003).
- Add focused route/component coverage for table semantics, keyboard/focus, states, permissions, and token-only behavior across the ten runtime themes (LA-080–091; T-004; IA-003).

### Out of Scope
- #109: filters/search/order controls and URL mutation beyond 400 sanitization.
- #110: pagination controls and column selector/preference persistence.
- #111: export execution, format dialog, and download handling; only its visual gate is included.
- Backend, database, DTO, authorization, offline behavior, and `Lugar compra` changes.

## Capabilities

### New Capabilities
- `animal-listado-desktop-ui`: Online desktop table consuming the animal-list server contract, with states, visual RBAC, navigation, layout, and accessibility.

### Modified Capabilities
- None. `animal-listado-server-contract`, `web`, and `ui` remain governing constraints; their requirements do not change.

## Approach

Introduce a dedicated desktop list feature component and thin route adapter; retain `AnimalDesktopScreen` as a legacy compatibility surface. Read canonical identifiers and DTO semantics from `animal-list-contract.ts`; never derive fields from labels or duplicate endpoint authorization.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `apps/web/src/routes/_app/fincas/$fincaId/animales.tsx` | Modified | #107-backed route adapter |
| `packages/ui/src/ganado/` | New/Modified | Dedicated desktop table feature |
| `packages/ui/tests/animal-ui.test.tsx` | Modified | Focused behavior/accessibility tests |

## Dependencies and Gates

- #107 remains the required delivered server-contract dependency.
- #106 and #108 are `status:needs-review`; do not open an implementation PR until epic #106 is approved.
- Source: RF-ANIM-LIST v2.1; direct coverage LA-RBAC-02/03, LA-040–043, LA-060–063, LA-080–091; acceptance 1–3, 6, 9, 12.

## Risks

| Risk | Mitigation |
|---|---|
| Contract/label drift from legacy DTO | Typed adapter using canonical IDs/keys |
| Wide sticky table harms focus/contrast | Semantic and keyboard tests; validate ten themes |
| Test tooling is marked unavailable | Explicit manual verification limits before acceptance |

## Rollback Plan

Revert the route to the legacy list surface and remove the dedicated feature; #107 endpoint and its contract remain untouched.

## Success Criteria

- [ ] Authorized users see the canonical 29-column online table; 36-column contract awareness is preserved.
- [ ] States, visual RBAC, navigation, semantics, and accessibility meet the cited requirements without implementing #109–#111.
- [ ] Approval/dependency gates are satisfied before implementation begins.
