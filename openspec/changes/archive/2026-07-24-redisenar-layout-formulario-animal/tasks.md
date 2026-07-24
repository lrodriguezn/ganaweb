# Tasks: Rediseñar layout formulario animal (Issue #97)

> Order: Phase 1 (DatePicker base) → Phase 2 (infra) → Phase 3 (sections) → Phase 4 (collapsible) → Phase 5 (fixes) → Phase 6 (E2E).
> TDD: every GREEN task follows a RED task. Commit per work unit = test + implementation + verification.
> Format: `T-XXX [RED|GREEN|VERIFY | files] — task. Deps: … Verify: … AC: … LOC: …`

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~285 (animal-crud.tsx ~150, date-picker.tsx ~15, tests ~120) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | single-pr-default |
| Chain strategy | none |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: none
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| WU-1 | DatePicker.footerChildren | PR 1 | `pnpm turbo test --filter @ganaweb/ui -- date-picker` | N/A (primitive, JSX-only) | revert date-picker.tsx; existing consumers unchanged |
| WU-2 | useOnlineStatus + SECTION_LAYOUT | PR 1 | `pnpm turbo test --filter @ganaweb/ui -- animal-ui` | N/A (pure infra) | revert hook + consts; form still renders via fields.map |
| WU-3 | 4-section restructure | PR 1 | `pnpm turbo test --filter @ganaweb/ui -- animal-ui` | manual at 1280px | revert animal-crud.tsx body; FORM_FIELDS untouched |
| WU-4 | Collapsible block | PR 1 | `pnpm turbo test --filter @ganaweb/ui -- animal-ui` | manual edit-mode w/ populated details | revert Collapsible JSX; section grid stays |
| WU-5 | Mobile parity (cn() + ✕ + sexo) | PR 1 | `pnpm turbo test --filter @ganaweb/ui -- animal-ui` | manual at 375px | revert cn() branches; desktop unchanged |
| WU-6 | Fixes (sync hint, required, estimar) | PR 1 | `pnpm turbo test --filter @ganaweb/ui` | N/A | revert each fix is a 1-line revert |
| WU-7 | Verify (lint, themes, E2E) | PR 1 | `pnpm turbo test && pnpm turbo build` | Playwright @ 375/1280, 10 themes | verify-only commit; nothing to revert |

## Phase 1 — DatePicker extension (base dependency for Phase 4)

- [x] T-001 [RED | date-picker.test.tsx] assert default DatePicker popover has NO footer block; when `footerChildren` is provided, renders inside `Popover.Content` with `border-t p-3` wrapper below DayPicker. Deps: —. Verify: `pnpm turbo test --filter @ganaweb/ui -- date-picker`. AC: CA-UI-013 + backward compat. LOC: +20
- [x] T-002 [GREEN | date-picker.tsx] add `footerChildren?: React.ReactNode` to DatePickerProps; render after DayPicker inside PopoverPrimitive.Content; default `undefined` keeps existing consumers green. AC: CA-UI-013. LOC: +15
- [x] T-003 [VERIFY] existing date-picker tests + T-001 green. Commit WU-1.

## Phase 2 — Support infrastructure (no DOM change yet)

- [x] T-101 [RED | animal-ui.test.tsx] assert `useOnlineStatus` returns `true` initially; flips to `false` on `offline` event; back to `true` on `online`; SSR-safe (`navigator` undefined → true). AC: CA-UI-005. LOC: +25
- [x] T-102 [GREEN | animal-crud.tsx] add `useOnlineStatus` hook above `useAnimalForm`; default true; subscribe `online`/`offline` on `window`; cleanup returns. AC: CA-UI-005. LOC: +15
- [x] T-103 [RED | animal-ui.test.tsx] assert `SECTION_LAYOUT` has 5 entries with expected `id`/`title`/`gridClasses`; `sectionFor(name)` returns expected id per `FORM_FIELDS`; `DETAIL_FIELD_NAMES` exported as a Set. AC: §3.5.2. LOC: +15
- [x] T-104 [GREEN | animal-crud.tsx] declare `SectionDef` type, `SECTION_LAYOUT` const, `sectionFor` resolver, `DETAIL_FIELD_NAMES` Set covering RFID/TipoExplot/Prop/Hierro/NumPezones + switches + Comentarios. LOC: +25
- [x] T-105 [VERIFY] animal-ui tests green. Commit WU-2.

## Phase 3 — Section restructuring (replace `fields.map`)

- [x] T-201 [RED | animal-ui.test.tsx] assert exactly 4 `<section>` with `aria-labelledby` in order: identificacion, caracteristicas, origen, ubicacion; each header is uppercase (`text-caption font-semibold uppercase tracking-wide text-muted-foreground`); form root has NO `grid-cols-2`. AC: CA-UI-009/012. LOC: +25
- [x] T-202 [RED | animal-ui.test.tsx] per-section grids: IDENTIFICACIÓN `1fr 1.4fr 1fr`, CARACTERÍSTICAS `1fr 1fr 1.2fr` + `1fr 1fr` row, ORIGEN `260px 1fr 1fr`, UBICACIÓN `1fr 1fr 1fr 1fr`; card `max-w-[720px]`. AC: §3.5.2. LOC: +30
- [x] T-203 [GREEN | animal-crud.tsx] replace `fields.map` + Comentarios + LOCATION_FIELDS with 4 `<Section>` wrappers; route fields via `sectionFor`; UBICACIÓN uses `LOCATION_FIELDS`; ORIGEN keeps the existing conditional key block. LOC: +60/-40
- [x] T-204 [VERIFY] animal-ui test green; visual at 1280px shows 4 headers. Commit WU-3.

## Phase 4 — Collapsible "Detalles adicionales"

- [x] T-301 [RED | animal-ui.test.tsx] create mode: Collapsible exists after sections, closed by default; trigger reads "▸ Detalles adicionales" with NO count suffix. AC: CA-UI-009. LOC: +15
- [x] T-302 [RED | animal-ui.test.tsx] edit mode w/ N populated detail fields: Collapsible auto-opens; trigger reads "Detalles adicionales · N con datos"; `esDeMonta` excluded from count when `sexoKey !== 0`. AC: CA-UI-009 + CA-UI-012. LOC: +20
- [x] T-303 [RED | animal-ui.test.tsx] when `fieldErrors` intersects `DETAIL_FIELD_NAMES`, Collapsible auto-opens and `document.getElementsByName(name)[0].scrollIntoView` is called with NO `behavior: "smooth"` (assert call args). AC: CA-UI-010. LOC: +15
- [x] T-304 [RED | animal-ui.test.tsx] collapsing the block does NOT remove the field's `aria-invalid="true"` + error text; re-opening shows error again. AC: CA-UI-010. LOC: +10
- [x] T-305 [RED | animal-ui.test.tsx] `esDeMonta` switch is NOT in DOM when `sexoKey ∈ {1,2}`; its value is NOT in `FormData` keys. AC: CA-UI-008/012. LOC: +10
- [x] T-306 [GREEN | animal-crud.tsx] add `useState` for `collapsibleOpen`; `useMemo` for `defaultOpen` over `DETAIL_FIELD_NAMES` + esDeMonta gate; `useEffect` keyed on `JSON.stringify(detailErrors)` for force-open; focus via `scrollIntoView({ block: "nearest" })` no smooth. LOC: +40
- [x] T-307 [GREEN | animal-crud.tsx] render inside `<Collapsible>`: RFID/TipoExplot/Prop/Hierro/NumPezones in `1fr 1fr` grid; switches row (Tatuado/Herrado/Descornado/EsDeMonta); Comentarios full-width last; pass `mobile` to `RenderFieldContext`. LOC: +30
- [x] T-308 [VERIFY] animal-ui test green; manual edit-mode w/ populated details. Commit WU-4.

## Phase 5 — Fixes & polish (sync hint, required, mobile, estimar)

- [x] T-401 [RED | animal-ui.test.tsx] footer hides "Se sincronizará al recuperar señal" when `navigator.onLine === true`; shows it when `navigator.onLine === false`. AC: CA-UI-005. LOC: +15
- [x] T-402 [GREEN | animal-crud.tsx] call `useOnlineStatus()` in AnimalFormScreen; render `<p>` only when `!online`. LOC: +5
- [x] T-403 [RED | animal-ui.test.tsx] `Tipo de explotación` trigger has NO `*` in label, NO `aria-required`; visible only when `catalogOptions.tipoExplotacion` is provided. AC: CA-UI-014. LOC: +10
- [x] T-404 [GREEN | animal-crud.tsx] remove `required` prop from `<CatalogSelectField>` inside `renderTipoExplotacionField`. LOC: -1
- [x] T-405 [RED | animal-ui.test.tsx] mobile Sexo renders `PillsSegmentadas` (full-width); desktop Sexo renders `Select` (combo). AC: §3.5.6. LOC: +15
- [x] T-406 [RED | animal-ui.test.tsx] mobile UBICACIÓN: 4 selects stacked (`grid-cols-1`); mobile header has ✕ icon calling `onCancel`; sticky footer `fixed inset-x-0 bottom-0 min-h-20` with "Guardar animal" full-width. AC: §3.5.6 + CA-UI-015. LOC: +20
- [x] T-407 [GREEN | animal-crud.tsx] `renderSexoField` branches on `ctx.mobile` (Pills vs Select); per-section grid uses `cn(mobile && "grid-cols-1")`; mobile header `<Button variant="ghost" size="icon" aria-label="Cerrar">` with `<X />` icon calling `onCancel`; remove mobile field-filter from `useAnimalForm.fields`. LOC: +25/-15
- [x] T-408 [RED | animal-ui.test.tsx] open `FechaNacimientoField` DatePicker popover → "Estimar por edad" link present in footer; NO sibling button beside the date trigger. AC: CA-UI-013. LOC: +15
- [x] T-409 [GREEN | animal-crud.tsx] `FechaNacimientoField` passes `<EstimarPorEdad onApply={onEstimar} />` as `DatePicker footerChildren`; remove the sibling `flex flex-wrap` button wrapper. LOC: -8/+5
- [x] T-410 [VERIFY] `biome ci .` green; `grep -E '#[0-9a-fA-F]{3,8}|dark:|style=.*color' packages/ui/src/ganado/animal-crud.tsx` returns NO matches. Commit WU-5 + WU-6.

## Phase 6 — E2E verification

- [ ] T-501 Playwright @ 375px: 4 sections in order, UBICACIÓN stacked, sticky footer full-width, ✕ in header. AC: §3.5.6.
- [ ] T-502 Playwright @ 1280px: 4 sections + per-section grids + desktop sticky footer w/ Cancelar left + Guardar animal right. AC: CA-UI-015.
- [ ] T-503 Manual: 10 themes (5 styles × light/dark) — no contrast/focus regressions; `localStorage.theme` flipped in dev tools. AC: CA-UI-018.
- [x] T-504 Final: `pnpm turbo test` + `pnpm turbo typecheck` + `pnpm turbo build` all green; no snapshots regress. Commit WU-7 (verify-only).

## Skills to load before work

- `/home/lrodriguezn/.config/opencode/skills/work-unit-commits/SKILL.md` — commit per work unit (test + impl + verify)
- `/home/lrodriguezn/.config/opencode/skills/sdd-apply/SKILL.md` — execute the checklist, mark items `[x]`
