# PR: Animal Form CA-UI Remediation

## Summary

Repair the animal create/edit form so it matches the feature UI contract.
Catalog-backed fields render as labeled selectors, the sex selector hides
raw numeric keys, and location is split into potrero/sector/lote/grupo
controls in create mode with read-only semantics in edit mode.

This change closes the UI contract gaps flagged by the architecture review
under rules **CA-UI-001**, **CA-UI-003**, and **CA-UI-005**. The
FincaSwitcher/header label defect remains out of scope and is tracked
separately (see "Out of scope" below).

## CA-UI-001: Catalog-backed fields use labeled selectors

Catalog inputs (`origen`, plus the four location fields) render through
`CatalogSelectField` instead of free text. The displayed label is human,
and the submitted value is the existing id/key.

- `packages/ui/src/ganado/animal-crud.tsx:670-680` — `origen` routes
  through `CatalogSelectField` with `options={catalogOptions?.origen ?? []}`.
- `packages/ui/src/ganado/animal-crud.tsx:683-693` — same path for each
  `LOCATION_FIELDS` entry, using `catalogOptions?.[locationField.optionsKey] ?? []`.
- `packages/ui/src/ganado/animal-crud.tsx:752-790` — `CatalogSelectField`
  falls back to a `No disponible` option whenever the persisted id has no
  matching label, and never exposes the raw id/key in the visible select.
- `packages/ui/tests/animal-ui.test.tsx:212-244` — selector labels, preserved
  payload keys, and no raw `1` exposed.
- `packages/ui/tests/animal-ui.test.tsx:246-259` — safe `No disponible`
  fallback for an `origen` value that has no matching catalog label.

## CA-UI-003: Sex selection hides raw numeric keys

`sexoKey` is a `Select` over `SEXO_OPTIONS`; the user sees
`Macho` / `Hembra` / `Pajuela`, while the form submits `0` / `1` / `2`
unchanged.

- `packages/ui/src/ganado/animal-crud.tsx:542-546` — `SEXO_OPTIONS` maps
  `0=Macho`, `1=Hembra`, `2=Pajuela`.
- `packages/ui/src/ganado/animal-crud.tsx:658-668` — `renderAnimalFormField`
  for `sexoKey` uses `SEXO_OPTIONS` and submits `String(initialValues?.sexoKey ?? 1)`.
- `packages/ui/src/ganado/animal-crud.tsx:664` — the default `sexoKey=1`
  surfaces as `Hembra` because the value is matched against `SEXO_OPTIONS`
  before render.
- `packages/ui/tests/animal-ui.test.tsx:212-244` — asserts visible `Hembra`
  and submitted `sexoKey=0` after switching to `Macho`; no raw `1` is
  reachable as the visible selection.

## CA-UI-005: Location controls are semantically split

`LOCATION_FIELDS` defines potrero, sector, lote, and grupo as four
independent `CatalogSelectField` controls. Create mode renders them as
editable selectors; edit mode renders the same labels as read-only values
plus a `Mover animal` action, and never includes direct location mutations
in the update payload.

- `packages/ui/src/ganado/animal-crud.tsx:562-567` — `LOCATION_FIELDS`
  declares the four split controls with their `optionsKey` mappings.
- `packages/ui/src/ganado/animal-crud.tsx:625-627` — create mode maps
  `LOCATION_FIELDS`; edit mode calls `renderCurrentLocation` instead.
- `packages/ui/src/ganado/animal-crud.tsx:698-724` — `renderCurrentLocation`
  displays the four labels read-only and exposes a `Mover animal` action.
- `apps/web/src/routes/_app/fincas/$fincaId/animales/nuevo.tsx:31-52` —
  `buildCreateAnimalInputFromFormData` forwards `potreroId` / `sectorId` /
  `loteId` / `grupoId` independently.
- `apps/web/src/routes/_app/fincas/$fincaId/animales/$animalId/editar.tsx:19-33` —
  `buildUpdateAnimalInputFromFormData` keeps the update payload
  location-free; only `versionLeida` and optional `codigo` reach the
  server.
- `packages/ui/tests/animal-ui.test.tsx:261-302` — split controls in create
  mode, four ids submitted, no merged `ubicacion` field.
- `packages/ui/tests/animal-ui.test.tsx:304-342` — edit mode shows
  read-only location with `Mover animal` and submits no direct mutation.
- `packages/ui/tests/animal-ui.test.tsx:261-302 (new sub-case, line ~262)` —
  graceful `No disponible` fallback when create-mode catalog options are
  absent.
- `apps/web/tests/animal-web-flow.test.ts:375-441` — server harness proves
  split location ids survive the route mapper, and the absent-location path
  skips `ubicaciones.registrarInicial`.
- `apps/web/tests/animal-web-flow.test.ts:443-473` —
  `buildCreateAnimalInputFromFormData` / `buildUpdateAnimalInputFromFormData`
  preserve keys and keep edit payload location-free.
- `apps/web/tests/animal-web-flow.test.ts:475-549` — route source
  assertions: create route uses `formVariant="create"`; edit route uses
  `formVariant="edit"` and forwards `currentLocation`.
- `apps/web/tests/animal-web-flow.test.ts:551-568` — create route wires
  `catalogOptions` covering `origen` / `potrero` / `sector` / `lote` / `grupo`.

## Out of scope

The FincaSwitcher/header label bug (`Finca Finca finca-esperanza`) is
**not** touched in this change. It is tracked as an independent shell
issue in a follow-up OpenSpec change, per the bounded correction
lineage for this work (`review-178f8cd29714bd5e`,
`review-662d7abf029ed7de`).

## Verification

- `pnpm --filter @ganaweb/ui exec vitest run --passWithNoTests --allowOnly=false tests/animal-ui.test.tsx` → 15/15 passed.
- `pnpm --filter @ganaweb/web exec tsx tests/animal-web-flow.test.ts` → ✅ passed.
- `pnpm --filter @ganaweb/ui typecheck` → exit 0.
- `pnpm --filter @ganaweb/web typecheck` → exit 0.

## Rollback boundary

Revert only the shared form and its UI tests in
`packages/ui/src/ganado/animal-crud.tsx`,
`packages/ui/tests/animal-ui.test.tsx`, the create/edit route files, the
demo catalog fixture, and the new test cases in
`apps/web/tests/animal-web-flow.test.ts`. Do not touch the `db/` or
`scripts/` areas; no schema or migration is in this slice.
