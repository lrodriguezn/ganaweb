# Delta for Animal CRUD UI

> Modifies `openspec/specs/animal-crud-ui/spec.md` for Issue #97 — regroups the
> animal form into 4 visible sections + 1 collapsible block per
> `crud_animales.md` §3.5 (v1.5 — NORMATIVA), corrects the offline-only sync
> hint (CA-UI-005), removes the `required` marker from `tipoExplotacion`
> (CA-UI-014), and locks the implementation to design-system tokens
> (CA-UI-016..018).

## ADDED Requirements

### Requirement: Layout en 4 secciones con grillas proporcionales

The animal form MUST render exactly four visible sections in this order:
**IDENTIFICACIÓN**, **CARACTERÍSTICAS**, **ORIGEN**, **UBICACIÓN**, followed
by the "Detalles adicionales" collapsible (§3.5.2). Each section MUST have
an uppercase header (`text-caption font-semibold uppercase tracking-wide
text-muted-foreground`) and MUST use a per-section proportional grid; the
MUST-NOT list forbids a single global `grid-cols-2` for the whole form.
Sections MUST be separated by `space-y-6`. This satisfies CA-UI-009,
CA-UI-012, and CA-UI-015.

Per-section grid:

| Sección | Grilla |
|---|---|
| IDENTIFICACIÓN | `1fr 1.4fr 1fr` (Código, Nombre, Nº de arete) |
| CARACTERÍSTICAS | `1fr 1fr 1.2fr` (Sexo, Raza, Fecha de nacimiento) + `1fr 1fr` (Color, Calidad) |
| ORIGEN | pills `260px` + `1fr 1fr` (condicionales del modo activo) |
| UBICACIÓN | `1fr 1fr 1fr 1fr` (Potrero, Sector, Lote, Grupo en una sola fila) |

Card frame: `max-w-[720px]` centered. Header: title "Nuevo animal" or
"Editar MT-xxx" on the left and the note "* obligatorio" right-aligned.
Only **Código**, **Sexo**, **Origen**, and **Fecha de nacimiento** MUST
carry the visible asterisk; every other field MUST NOT show `*` or a
"obligatorio" marker next to its label (CA-UI-014). The desktop footer
MUST be sticky with "Cancelar" on the left and the primary "Guardar
animal" on the right (CA-UI-015).

#### Scenario: Form shows 4 sections with uppercase headers

- GIVEN the create form is rendered at desktop width
- WHEN the layout mounts
- THEN the DOM contains 4 `<section>` elements in order: IDENTIFICACIÓN, CARACTERÍSTICAS, ORIGEN, UBICACIÓN
- AND each section has a visible header in uppercase
- AND no `grid-cols-2` wraps the whole form

#### Scenario: Desktop uses per-section proportional grids

- GIVEN the form is rendered at desktop width
- WHEN each section mounts
- THEN IDENTIFICACIÓN uses a 3-column grid with the named proportions
- AND CARACTERÍSTICAS uses a 3-column row plus a 2-column row
- AND ORIGEN renders a 260px pills block plus a 2-column conditional grid
- AND UBICACIÓN renders 4 selects in a single row

#### Scenario: Asterisk only on required fields per CA-UI-014

- GIVEN the form renders in create or edit mode
- WHEN every label is inspected
- THEN the asterisk `*` is visible only on Código, Sexo, Origen, and Fecha de nacimiento
- AND Tipo de explotación, RFID, Propietario, Hierro, Nº de pezones, and Comentarios MUST NOT show `*` or "obligatorio"

#### Scenario: Card frame and header composition

- GIVEN the form is rendered
- WHEN the card mounts
- THEN the outermost wrapper is `max-w-[720px]` and centered
- AND the header shows the route title and the right-aligned "* obligatorio" note

#### Scenario: Desktop sticky footer

- GIVEN the form is rendered at desktop width
- WHEN the footer mounts
- THEN "Cancelar" is on the left and "Guardar animal" is the primary button on the right
- AND the footer stays at the bottom of the card on scroll

### Requirement: Bloque colapsable "Detalles adicionales"

The form MUST include a `Collapsible` block titled "Detalles adicionales"
placed AFTER the 4 visible sections and BEFORE the footer. The block MUST
contain, in this order: **RFID**, **Tipo de explotación**, **Propietario**,
**Hierro**, **Nº de pezones**, the switches **Tatuado / Herrado /
Descornado / Es de monta** grouped in a single row of switches, and a
full-width **Comentarios** textarea as the last field. The internal grid
MUST be `1fr 1fr` for the paired fields and the switches row, and
`grid-cols-1` for Comentarios. This satisfies CA-UI-009, CA-UI-010, and
CA-UI-012.

State rules:

- **CA-UI-009** — On create, the block MUST be **closed** by default and
  the header MUST read "▸ Detalles adicionales". On edit, the block MUST
  open automatically if any of its inner fields carries a non-empty
  value, and the header MUST show the count of populated fields as
  "Detalles adicionales · N con datos".
- **CA-UI-010** — When a validation error lands on a field inside the
  collapsible, the block MUST open and the offending field MUST receive
  focus via `scrollIntoView({ block: "nearest" })` without animation
  when `prefers-reduced-motion: reduce` is set. Closing the collapsible
  afterwards MUST NOT hide the field-level error indicator.
- **CA-UI-012** — The "Es de monta" switch MUST render only when
  `sexo_key = 0` (Macho); on any other sex the switch MUST NOT mount and
  its stored value MUST be discarded (CA-UI-008).

#### Scenario: Collapsible closed on create

- GIVEN the create form is rendered
- WHEN the collapsible mounts
- THEN it is closed
- AND the header reads "▸ Detalles adicionales" with no count suffix

#### Scenario: Collapsible opens on edit with populated details

- GIVEN the edit form is rendered for an animal with 4 inner fields filled
- WHEN the collapsible mounts
- THEN it is open
- AND the header reads "Detalles adicionales · 4 con datos"

#### Scenario: Collapsible contents and order

- GIVEN the collapsible is open
- WHEN the inner body renders
- THEN RFID, Tipo de explotación, Propietario, Hierro, and Nº de pezones appear first in that order on a 2-column grid
- AND a single row holds the switches Tatuado, Herrado, Descornado, and Es de monta
- AND Comentarios is a full-width textarea appearing as the last field

#### Scenario: Es de monta hidden when sexo is not Macho

- GIVEN the form is rendered with `sexo_key = 1` (Hembra) or `sexo_key = 2` (Pajuela)
- WHEN the collapsible body mounts
- THEN the "Es de monta" switch MUST NOT be in the DOM
- AND if the persisted value was 1, it MUST be discarded (not submitted)

#### Scenario: Validation error opens the block and focuses the field

- GIVEN a field inside the collapsible fails validation while the block is closed
- WHEN the form reports the error
- THEN the collapsible opens
- AND the offending input receives focus
- AND `scrollIntoView` is called with no smooth animation when `prefers-reduced-motion: reduce` matches

#### Scenario: Closing the block keeps the field error visible

- GIVEN a field inside the collapsible has a visible error and the user collapses the block
- WHEN the block re-renders closed
- THEN the field-level error indicator (`aria-invalid="true"` and helper text) remains attached to that field
- AND the error is not hidden by the collapse animation

### Requirement: Sección ORIGEN con condicionales y composición de grilla

The ORIGEN section MUST render the `PillsSegmentadas` (Nacido en finca /
Comprado) as a 260px block, and the conditional block to its right in a
`1fr 1fr` grid. The conditional block MUST contain ONLY the controls of
the active origin mode and MUST unmount the abandoned block when the pill
flips (CA-UI-011, CA-UI-007, §3.5.4):

- `origen = "nacido_en_finca"` → `Madre` (Combobox buscable) and `Padre`
  (Combobox buscable with Monta/IA toggle).
- `origen = "comprado"` → `Fecha de compra`, `Precio` (NumericField
  es-CO), `Peso de compra` (NumericField es-CO), `Lugar de compra`
  (`SelectConCreacion`).

The pills component MUST mount the inner block with `key={origen}` so
React tears it down on flip; the typed values of the abandoned block
MUST NOT be included in the submitted `FormData`.

#### Scenario: Nacido en finca shows only parents

- GIVEN `origen = "nacido_en_finca"`
- WHEN the ORIGEN section mounts
- THEN the pills are visible at 260px
- AND `Madre` (Combobox) and `Padre` (Combobox with Monta/IA toggle) are mounted
- AND no purchase field is in the DOM

#### Scenario: Comprado shows only purchase fields

- GIVEN `origen = "comprado"`
- WHEN the ORIGEN section mounts
- THEN the pills are visible at 260px
- AND `Fecha de compra`, `Precio`, `Peso de compra`, and `Lugar de compra` are mounted
- AND no `Madre` or `Padre` control is in the DOM

#### Scenario: Pill flip unmounts the abandoned block

- GIVEN the user typed a value into a field of the active mode
- WHEN the user clicks the opposite pill
- THEN the previous conditional block is unmounted
- AND the new conditional block mounts
- AND the submitted `FormData` does NOT carry the abandoned field

### Requirement: Footer sync hint is offline-only

The form footer MUST show the "Se sincronizará al recuperar señal" hint
ONLY when `navigator.onLine === false` (or when a `offline` event is
detected). The hint MUST NOT render while the sync status reads
"Sincronizado". The hint MUST be a single info row in the footer,
mutually exclusive with the sync-status indicator. This satisfies
CA-UI-005.

#### Scenario: No hint while online

- GIVEN `navigator.onLine === true`
- WHEN the form footer renders
- THEN the hint is NOT visible
- AND no element with the text "Se sincronizará al recuperar señal" is in the DOM

#### Scenario: Hint appears when offline

- GIVEN `navigator.onLine === false` OR a `offline` event has fired
- WHEN the form footer renders
- THEN the hint "Se sincronizará al recuperar señal" is visible as an info row

#### Scenario: Hint and Sincronizado are mutually exclusive

- GIVEN the sync status reads "Sincronizado"
- WHEN the footer renders
- THEN the offline hint MUST NOT be visible at the same time
- AND the two indicators MUST NOT overlap in the DOM

### Requirement: Mobile paridad total con desktop

At viewport widths below 768px the form MUST present the same four
sections in the same order, the same collapsible block, and the same
field set as desktop — no second component, no field filter (§3.5.6,
issue #59). Differences are layout-only:

- One column; every field renders full-width.
- UBICACIÓN stacks its 4 selects vertically (no row of 4).
- Sexo and Origen render as full-width `PillsSegmentadas` (not Select).
- Field height: minimum 48px; touch targets respect 44px minimum.
- Footer is sticky at the bottom with "Guardar animal" full-width as the
  primary action; "Cancelar" is a `✕` icon button in the card header.
- Section headers remain visible to anchor scroll position.

This satisfies CA-UI-015 and §3.5.6.

#### Scenario: Same sections in the same order on mobile

- GIVEN the viewport is narrower than 768px
- WHEN the form renders
- THEN 4 sections (IDENTIFICACIÓN, CARACTERÍSTICAS, ORIGEN, UBICACIÓN) and the "Detalles adicionales" collapsible are present
- AND their order matches the desktop order

#### Scenario: One column and 48px fields on mobile

- GIVEN the viewport is narrower than 768px
- WHEN each section renders
- THEN fields are stacked in a single column
- AND every input is at least 48px tall
- AND UBICACIÓN shows Potrero, Sector, Lote, and Grupo as 4 stacked selects

#### Scenario: Sexo and Origen render as full-width pills on mobile

- GIVEN the viewport is narrower than 768px
- WHEN the CARACTERÍSTICAS and ORIGEN sections render
- THEN Sexo is a `PillsSegmentadas` block at full width (not a Select)
- AND Origen is a `PillsSegmentadas` block at full width (not a Select)

#### Scenario: Mobile sticky footer and header cancel

- GIVEN the viewport is narrower than 768px
- WHEN the form renders
- THEN the footer is sticky with "Guardar animal" full-width as the primary
- AND the card header shows a `✕` icon as the cancel affordance

### Requirement: Solo tokens del sistema (sin hex, sin dark, sin style con color)

The form's JSX MUST NOT contain hex color literals, `dark:` Tailwind
variants, or `style={{...}}` objects carrying color values. Every
color, radius, shadow, typography, and spacing value MUST come from
existing design tokens (`ganaweb-design.md` + `ganaweb-estilos.md`):

- Colors: `bg-card`, `text-foreground`, `text-muted-foreground`,
  `border`, `bg-primary`, `text-primary-foreground`. Hex literals,
  `style` objects with color, and `dark:` variants are forbidden (T-004).
- Radii / shadows: `rounded-card`, `rounded-lg`, `--shadow-card`. No
  hand-written pixel radii.
- Typography: `text-title` (card title), `text-caption font-semibold
  uppercase tracking-wide` (section header), `text-support` (labels and
  values), `.num` on numeric fields.
- Spacing: multiples of 4 (`gap-2`/`gap-3` in grids, `space-y-6`
  between sections, `p-4`/`p-5` on the card).
- Control height: 38–40px on desktop, 48px on mobile (CA-UI-016).

All form controls MUST come from `packages/ui` (Input, Select, Combobox
`SelectConCreacion`, DatePicker, Switch, Textarea, Collapsible) — local
form variants are forbidden. The form MUST render correctly in all 10
themes (5 styles × light/dark) without theme-specific adjustments; if a
theme requires a patch, the fix belongs in the tokens, not in this form.
This satisfies CA-UI-016, CA-UI-017, and CA-UI-018.

#### Scenario: No hex, dark:, or style with color in form JSX

- GIVEN the form source under `packages/ui/src/ganado/animal-crud.tsx`
- WHEN a static check (lint rule or grep) scans the form JSX
- THEN zero matches for hex color literals (`#` followed by 3, 4, 6, or 8 hex digits)
- AND zero matches for `dark:` Tailwind variants
- AND zero matches for `style={{...}}` objects that include `color`, `backgroundColor`, `borderColor`, or any CSS color property

#### Scenario: Controls come from packages/ui only

- GIVEN the form source under `packages/ui/src/ganado/animal-crud.tsx`
- WHEN the JSX is reviewed
- THEN every rendered form control is one of `Input`, `Select`, `SelectConCreacion`, `Combobox`, `DatePicker`, `Switch`, `Textarea`, or `Collapsible` from `packages/ui`
- AND no local wrapper component redefines a form control primitive

#### Scenario: Form renders correctly across all 10 themes

- GIVEN the 5 visual styles (default, alt-A, alt-B, alt-C, alt-D) crossed with light and dark
- WHEN the form is rendered in each of the 10 theme combinations
- THEN contrast, borders, focus rings, and switch state colors remain readable
- AND no theme-specific override class or inline style is applied to the form

## MODIFIED Requirements

### Requirement: Location controls are semantically split

The animal form MUST represent location as separate controls for potrero,
sector, lote, and grupo. It MUST NOT merge location into one ambiguous
free-text control. This satisfies CA-UI-003 (not CA-UI-005, which is the
footer sync hint covered separately).

(Previously: cited CA-UI-005. CA-UI-003 is the normative rule for split
location; CA-UI-005 is the offline-only sync hint.)

#### Scenario: Create mode captures optional split location

- GIVEN the user is creating an animal
- WHEN the location section is displayed
- THEN potrero, sector, lote, and grupo are separate optional controls
- AND selected values are submitted as their respective ids

#### Scenario: Location is not collapsed

- GIVEN location controls are available
- WHEN the user reviews the form
- THEN there is no single free-text field labeled as a combined potrero/sector/lote/grupo value

### Requirement: DatePicker "Estimar por edad" shortcut lives inside the popover

The `Fecha de nacimiento` `DatePicker` MUST expose the "Estimar por edad"
action as a link inside the calendar popover footer
("¿No sabes la fecha? Estimar por edad"). The popover MUST render an
age input (years only, e.g. "≈ 3 años"); confirming it sets
`fecha_nacimiento` to January 1 of `(current_year - age)` in es-CO format
and appends `[fecha estimada]` to `comentarios`. There MUST NOT be a
permanent "Estimar" button beside the date field — that competes
visually with the field that accompanies the picker. This satisfies
CA-UI-013 and CA-CRE-004.

(Previously: the spec described the action's existence but did not
constrain its placement; a permanent button beside the date field is
now explicitly forbidden.)

#### Scenario: Estimar link lives in the popover footer

- GIVEN the user opens the `Fecha de nacimiento` `DatePicker` popover
- WHEN the popover body renders
- THEN a link "¿No sabes la fecha? Estimar por edad" is present in the popover footer
- AND no permanent "Estimar" button is rendered beside the date field itself

#### Scenario: Estimar emits date and tags comentarios

- GIVEN the user opens "Estimar por edad" and types `3`
- WHEN they confirm
- THEN `fecha_nacimiento` is set to `01/01/{current_year - 3}` in es-CO format
- AND `comentarios` ends with `[fecha estimada]`

### Requirement: Origen toggle mounts/unmounts conditional fields and discards stale values

The form MUST render the ORIGEN section (§3.5.2) as a 260px
`PillsSegmentadas` block on the left and a `1fr 1fr` conditional block
on the right. The conditional block MUST contain ONLY the controls of
the active mode:

- `origen = "nacido_en_finca"` → `Madre` (Combobox buscable) and `Padre`
  (Combobox buscable with Monta/IA toggle).
- `origen = "comprado"` → `Fecha de compra` (DatePicker), `Precio`
  (NumericField es-CO), `Peso de compra` (NumericField es-CO),
  `Lugar de compra` (`SelectConCreacion`).

When `origen` flips, the abandoned conditional block MUST unmount (use
`key={origen}` so React tears it down) and its typed values MUST NOT be
submitted in `FormData`. This satisfies CA-UI-007, CA-UI-011, and
CA-CRE-002.

(Previously: the requirement covered the toggle semantics but did not
constrain the section composition or the specific control types per
mode.)

#### Scenario: Mode-driven block visibility

- GIVEN `origen` is `nacido_en_finca` or `comprado`
- WHEN the form renders
- THEN `Madre` and `Padre` are visible AND no purchase block (nacido)
- AND the four purchase inputs are visible AND parents are not (comprado)

#### Scenario: Flip discards abandoned values

- GIVEN a value was typed in the abandoned mode's field
- WHEN the user flips `origen`
- THEN that field is not rendered
- AND the payload does NOT include the abandoned field

### Requirement: Tipo de explotación renders as catalog selector (not required)

The animal form MUST render `tipoExplotacionId` as a `CatalogSelectField`
(not `SelectConCreacion`) with the visible label "Tipo de explotación",
sourced from `CatalogoAnimalMaestroPort.listarActivos("tipoExplotacion")`.
The control MUST display the Spanish `nombre` for each option, MUST NOT
carry the visible asterisk or "obligatorio" marker (CA-UI-014 — only
Código, Sexo, Origen, and Fecha de nacimiento are required), and the
submitted payload MUST carry the canonical catalog `id`. The control
MUST NOT expose a `+ Crear nuevo` affordance and MUST NOT expose a
`+ Crear el primero` empty-state action — the catalog is read-only for
the user. This satisfies CA-UI-001, CA-UI-002, and CA-UI-014.

(Previously: the requirement marked the field as required
(`aria-required="true"` plus a visible "obligatorio" marker). This
contradicts §3.1 and CA-UI-014: Tipo de explotación is an optional
maestro; only Código/Sexo/Origen/Fecha llevan asterisco.)

#### Scenario: Tipo de explotación shows labels and submits ids

- GIVEN catalog options for `tipoExplotacion` are loaded from the real DB
- WHEN the user opens the `Tipo de explotación` dropdown
- THEN each option shows its Spanish `nombre`
- AND the submitted payload carries the canonical catalog `id`

#### Scenario: No creation affordance on tipo de explotación

- GIVEN the user opens the `Tipo de explotación` dropdown (populated or empty)
- WHEN the dropdown body is rendered
- THEN no `+ Crear nuevo` option is present
- AND no `+ Crear el primero` empty-state action is rendered

#### Scenario: No required marker on tipo de explotación

- GIVEN the form renders in create or edit mode
- WHEN the `Tipo de explotación` control mounts
- THEN no `*` or "obligatorio" marker is rendered next to the label
- AND the underlying input does NOT carry `aria-required="true"`

## Future / Out of Scope

- The mobile subset field filter is REMOVED — mobile renders the same
  10-field initial view + collapsible as desktop (§3.5.6).
- The mock fixture `getAnimalFormCatalogOptions()` is untouched; the
  layout change is structural, not data-driven.

## Rule Citations

- **CA-UI-003** — Potrero, Sector, Lote and Grupo are four separate
  controls. (Citation corrected in the location-split requirement.)
- **CA-UI-005** — Sync hint renders ONLY when offline; never while
  "Sincronizado" is active.
- **CA-UI-007** — Origen flip remounts the abandoned conditional block
  and discards its values from the submit.
- **CA-UI-008** — "Es de monta" is visible only when `sexo_key = 0`
  (Macho); on Hembra/Pajuela the value is discarded.
- **CA-UI-009** — Collapsible "Detalles adicionales" is closed by
  default on create; opens automatically on edit when populated, with
  the "N con datos" count in the header.
- **CA-UI-010** — A validation error inside the collapsible forces the
  block open, focuses the offending field, and respects
  `prefers-reduced-motion`. Closing the block does not hide the error.
- **CA-UI-011** — The ORIGEN section shows ONLY the conditional block of
  the active mode; the inactive block is unmounted.
- **CA-UI-012** — "Es de monta" lives in the "Detalles adicionales"
  collapsible and renders only with sexo=Macho.
- **CA-UI-013** — "Estimar por edad" is a link inside the DatePicker
  popover footer; no permanent button beside the date field.
- **CA-UI-014** — Required visible markers appear ONLY on Código,
  Sexo, Origen, and Fecha de nacimiento.
- **CA-UI-015** — Footer sticky with "Cancelar" (desktop) / `✕` in the
  header (mobile); primary "Guardar animal" full-width on mobile.
- **CA-UI-016** — No hex literals, no `dark:`, no `style={{}}` with
  color; only design tokens.
- **CA-UI-017** — All form controls come from `packages/ui`; no local
  variants.
- **CA-UI-018** — Form must render correctly in all 10 themes
  (5 styles × light/dark) without per-theme overrides.
- **CA-CRE-002** — Origen mode dictates the conditional block.
- **CA-CRE-004** — "Estimar por edad" produces a date and appends
  `[fecha estimada]` to `comentarios`.
- **RN-002** — `Fecha de nacimiento` rejects future dates.
- **T-003** — Spanish UI text; es-CO `localeCompare` for catalog
  options.
- **T-004** — No `dark:` variants; token-only theming.
- **IA-003** — Reuse `packages/ui` components; extend the package
  instead of forking.
