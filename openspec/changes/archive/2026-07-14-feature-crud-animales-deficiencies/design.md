# Design: Animal Form CA-UI Remediation

## Technical Approach

Repair only the shared animal create/edit form path. `AnimalFormScreen` remains the UI entry point, but catalog-backed free-text fields become labeled selectors that submit the current backend-compatible ids/keys. Create and edit routes continue using `FormData`, with route mapping functions extended only where the backend web contract already accepts or must accept separate values. This maps directly to CA-UI-001, CA-UI-003, and CA-UI-005; the FincaSwitcher/header label defect is explicitly out of scope.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|----------|--------|--------------------------|-----------|
| Shared form repair | Keep `AnimalFormScreen` as the shared screen and add typed field renderers/options there. | Full form-schema refactor. | Smallest safe change; fixes both routes while preserving current UI package conventions. |
| Selector payloads | Selectors display labels but keep submitted values as existing form field keys (`sexoKey`, catalog/location ids). | Convert to user-facing labels in payloads. | Preserves `buildCreateAnimalInputFromFormData`, server action semantics, and DB columns such as `sexo_key`, `tipo_ingreso_id`, `potrero_id`. |
| Location edit semantics | Create mode shows editable split controls; edit mode renders current location read-only plus optional `Mover animal`. | Keep one merged `ubicacion` input or allow direct edit updates. | Satisfies CA-UI-005 and CA-UPD-001: location changes after creation belong to the move flow/history, not the data edit submission. |

## Data Flow

    Route loader/options ──→ AnimalFormScreen props ──→ labeled selectors
             │                         │
             │                         └── FormData ids/keys ──→ route mapper ──→ server action
             └── existing animal/current location ──→ read-only edit section

Missing catalog labels must render a safe unavailable state such as `No disponible`, never the raw id/key.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `packages/ui/src/ganado/animal-crud.tsx` | Modify | Add typed selector/read-only field rendering, `sexoKey` label mapping (`0=Macho`, `1=Hembra`, `2=Pajuela`), split location controls, create/edit mode props. |
| `packages/ui/tests/animal-ui.test.tsx` | Modify | Add CA-UI-001/003/005 assertions for labels, no raw numeric sex display, split location, and edit read-only location. |
| `apps/web/src/routes/_app/fincas/$fincaId/animales/nuevo.tsx` | Modify | Pass create mode, catalog/location options, and preserve submitted ids/keys in `buildCreateAnimalInputFromFormData`. |
| `apps/web/src/routes/_app/fincas/$fincaId/animales/$animalId/editar.tsx` | Modify | Load/pass existing animal location as read-only context; ensure update mapper excludes direct location mutations. |
| `apps/web/tests/animal-web-flow.test.ts` | Modify | Cover route mapper payload preservation for `sexoKey` and location ids when included in create flow. |

## Interfaces / Contracts

`AnimalFormScreenProps` should grow from mode-only to domain-aware props:

```ts
type AnimalFormVariant = "create" | "edit"
type SelectOption = { value: string; label: string }
type SexoKey = 0 | 1 | 2
type LocationSelection = { potreroId?: string; sectorId?: string; loteId?: string; grupoId?: string }
```

Create mode may submit `potreroId`, `sectorId`, `loteId`, `grupoId`. Edit mode displays those labels read-only and must not include direct location changes in the update payload.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit/UI | CA-UI-001 and CA-UI-003 selector labels, fallback labels, no visible raw `sexoKey=1`. | Vitest/RTL in `packages/ui/tests/animal-ui.test.tsx`. |
| Unit/UI | CA-UI-005 split location and edit read-only/move action. | Render create/edit variants and assert separate labels plus no merged free-text field. |
| Route mapper | Payload ids/keys preserved. | Extend `apps/web/tests/animal-web-flow.test.ts` around `buildCreateAnimalInputFromFormData`. |
| E2E | Not required for this remediation slice. | Existing route coverage is enough unless implementation adds loader behavior not covered by unit tests. |

## Threat Matrix

N/A — no shell commands, subprocesses, VCS/PR automation, executable-file classification, process integration, or route-path/security boundary changes. Existing route modules are only data-loading/prop boundaries for the form.

## Migration / Rollout

No data migration required. Deliver as chained PR-friendly UI/route test slices under the 400-line review budget. PR notes must cite CA-UI-001, CA-UI-003, and CA-UI-005 and state that the FincaSwitcher/header defect is out of scope.

## Open Questions

- [ ] Confirm actual catalog option source for ingreso/origen and location masters before implementation.

## Out of Scope

The FincaSwitcher / app-header label defect (the `Finca Finca finca-esperanza` header bug) is explicitly out of scope for this change. It is owned by the shell layer rather than the animal form contract, it does not block CA-UI-001/003/005 acceptance, and fixing it would broaden the diff past the 400-line review budget. It is tracked as a separate follow-up OpenSpec change, and the bounded correction lineage `review-178f8cd29714bd5e` (route mapper / `formVariant` wiring) and `review-662d7abf029ed7de` (catalog options + `ubicacionInicial` mapping) confirms that those corrections stayed within the animal form scope and never touched `packages/ui/src/ganado/finca-switcher.tsx`, the `_app` layout, or any header / shell chrome.
