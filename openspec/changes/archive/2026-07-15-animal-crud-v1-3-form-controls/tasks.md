# Tasks: Animal CRUD v1.3 — Form Controls

## Review Workload Forecast

| PR | LOC (est) | 400-risk | Base branch | Focused test command |
|---|---|---|---|---|
| 1 Primitives | 350–400 | High | `feat/animal-crud-v1-3-form-controls` (tracker) | `pnpm --filter @ganaweb/ui test` |
| 2a Form | 280–360 | Med | `feat/animal-crud-v1-3-pr1-primitives` | `pnpm --filter @ganaweb/ui test -- animal-ui` |
| 2b Route | 180–260 | Low | `feat/animal-crud-v1-3-pr2a-form` | `pnpm --filter @ganaweb/web test -- animal-web-flow` |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Work Units

| Unit | PR | Goal | Runtime | Rollback |
|---|---|---|---|---|
| 1 | 1 | 4 primitives | `pnpm --filter @ganaweb/ui build` | Revert 4 files+barrel; dominio/route untouched |
| 2 | 2a | Rewire form | N/A (no Playwright) | Revert `animal-crud.tsx`; 3-option Origen remains |
| 3 | 2b | Mapper+fixture | N/A (unit) | Revert `nuevo/editar.tsx`+fixture; 3 fields still flow |

Threat matrix: N/A per design — no routing/shell/subprocess/VCS/exec boundary.

## Phase 1 — PR 1: Primitives (≤400 LOC)

- [x] 1.1 Deps: `@radix-ui/react-popover`, `react-day-picker@^9`, `date-fns@^4`, `cmdk@^1` in `packages/ui/package.json`; extend `tsup.config.ts` `external`; `pnpm install`.
- [x] 1.2 RED `date-picker.test.tsx`: ISO↔`dd/MM/yyyy`, `max=today` blocks future (RN-002), `aria-invalid`+`aria-describedby`, `Estimar por edad` emits ISO+tag.
- [x] 1.3 GREEN `date-picker.tsx`: react-day-picker+Radix popover, `date-fns/format` `es` locale, ISO↔display helpers, Estimar callback.
- [x] 1.4 TRIANGULATE: cross-month round-trip; generalize.
- [x] 1.5 RED `select-con-creacion.test.tsx`: search emits `id` (CA-UI-001), `canCreate` gates `+ Crear nuevo` (CA-UI-002), EmptyState `+ Crear el primero` (CA-UI-004), disabled+hint empty+!canCreate.
- [x] 1.6 GREEN `select-con-creacion.tsx`: cmdk, swatch, EmptyState, `onCreate`.
- [x] 1.7 RED `pills-segmentadas.test.tsx`: 2 options, click emits, ArrowRight+Enter, `role=radiogroup`, `aria-checked`, `aria-invalid`.
- [x] 1.8 GREEN `pills-segmentadas.tsx`: 2 radio buttons + keyboard handler.
- [x] 1.9 RED `combobox-buscable.test.tsx`: search, `excludedIds`, label `código · nombre`, `id` emitted, aria attrs.
- [x] 1.10 GREEN `combobox-buscable.tsx`: cmdk + exclude filter + label formatter.
- [x] 1.11 REFACTOR all 4; rerun `packages/ui` tests.
- [x] 1.12 Update `index.ts` barrel; merge PR 1 into `apply-progress.md`.

## Phase 2 — PR 2a: Form wire-up (≤380 LOC)

- [x] 2.1 RED `animal-ui.test.tsx`: v1.3 labels (`Fecha de compra`, `Precio`, `Peso compra`, `Lugar de compra`, `Madre`, `Padre`); Origen toggle discards other-mode state (CA-UI-007); DatePicker/Combobox/SelectConCreacion wiring.
- [x] 2.2 GREEN `ganado/animal-crud.tsx`: extend `AnimalFormCatalogOptions` (`raza, color, calidad, lugarCompra, madre, padre, configuracionCrear`) + `AnimalFormInitialValues` (11 keys); `useState<FormState>`; `<div key={origen}>` (CA-UI-007); rewrite `renderAnimalFormField`; edit-mode read-only location intact.
- [x] 2.3 TRIANGULATE: `Estimar por edad` appends `[fecha estimada]` to `comentarios` (CA-CRE-004); generalize.
- [x] 2.4 RED: `+ Crear` last item + `onCreate`; Calidad hides `+ Crear`; future-date submit rejected w/ `aria-invalid="true"` (RN-002).
- [x] 2.5 GREEN: wire `onCreate`, validate `≤today`, gate `+ Crear` by `configuracion:crear`.
- [x] 2.6 REFACTOR `renderAnimalFormField`; merge PR 2a into `apply-progress.md`.

## Phase 3 — PR 2b: Route + mapper (≤280 LOC)

- [x] 3.1 RED+GREEN `fixtures/animal-form-catalog.ts`: add `raza/color/calidad/lugarCompra/madre (3)/padre (2+1 pajuela)/configuracionCrear`; shrink `origen` to 2. (Triangulation skipped: data.)
- [x] 3.2 RED `animal-web-flow.test.ts`: DELETE `…DropsFechaCompra` (line 720), REPLACE with `…AndPreservesFechaCompra`; add `precio_compra, peso_compra, raza, color, calidad, lugar_compra, padre_id` cases.
- [x] 3.3 GREEN `nuevo.tsx`: `buildCreateAnimalInputFromFormData` reads 11 keys; `origen`→`tipoIngreso`; `CAMPO_TO_FIELD_KEY` adds `fecha_compra→fechaCompra` (REMOVE `// fecha_compra intentionally absent` literal at line 61) + 7 more.
- [x] 3.4 RED `$animalId/editar.tsx`: loader returns `initialValues`; `buildUpdateAnimalInputFromFormData` reads 11 keys.
- [x] 3.5 GREEN: wire loader, extend update mapper.
- [x] 3.6 RED: es-CO normalize `1.500,75`→`1500.75` for `precio_compra`/`peso_compra`.
- [x] 3.7 GREEN: `Intl.NumberFormat('es-CO')` parser.
- [x] 3.8 REFACTOR: consolidate mappers; add regression-guard test grepping `// fecha_compra intentionally absent` (FAIL if found); merge PR 2b into `apply-progress.md`.

## Phase 4 — Cleanup & verification

- [x] 4.1 `pnpm turbo test` passes; per-PR diff ≤ budget (400/380/280).
- [x] 4.2 `pnpm turbo build` + `pnpm turbo typecheck` clean.
- [x] 4.3 Out-of-scope untouched: Imágenes uploader, RFID icon, Comentarios textarea, Numeric keypad, Sexo mobile pills, real per-finca catalog loaders, delete/inactivate, #48, `packages/dominio`.
- [x] 4.4 Branch strategy: tracker `feat/animal-crud-v1-3-form-controls` (draft, no-merge); PR 1→tracker, PR 2a base=PR 1, PR 2b base=PR 2a.

> **Archive-time stale-checkbox reconciliation** (sdd-archive exceptional-repair provision): all 30 checkboxes were `- [ ]` in the persisted `tasks.md` even though `apply-progress.md` proves every task is complete (PR 1: 13/13 spec scenarios + 1 triangulation; PR 2a: 8/8 spec scenarios; PR 2b: 3/3 spec scenarios; es-co helper: 5/5 test functions, 25+ assertions; UI regression 358/358). The orchestrator explicitly directed the archive to proceed; `sdd-archive` therefore performed the mechanical reconciliation and recorded the reason here so the audit trail is honest. See `archive-report.md` for full evidence.

## Out-of-scope

Pills for origen ARE in scope. NOT in scope: Imágenes uploader, RFID icon, Comentarios textarea, Numeric keypad, Sexo mobile pills, real per-finca catalog loaders, delete/inactivate, #48, `packages/dominio` (use case already accepts 11 fields).
