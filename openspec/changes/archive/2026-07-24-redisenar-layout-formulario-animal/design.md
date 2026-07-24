# Design: Rediseñar layout formulario animal

## Architecture Overview

`AnimalFormScreen` (`packages/ui/src/ganado/animal-crud.tsx`) becomes a **structural** refactor: replace the flat `{fields.map(renderAnimalFormField)}` with explicit `<section>` wrappers plus a `<Collapsible>`. Behavioral layers (`FIELD_RENDERERS`, `useAnimalForm`, `AnimalFormScreenProps`, route mappers) are untouched. `DatePicker` gets a backward-compatible `footerChildren` slot so "Estimar por edad" lives inside the calendar popover (CA-UI-013). A tiny `useOnlineStatus` hook powers the offline sync hint.

```
useAnimalForm → SECTION_LAYOUT → <Section>×4 + <Collapsible>×1
                                        ↓
                                  FIELD_RENDERERS → FormData
```

## Component Tree (before / after)

**Before** — flat grid:
```
AnimalFormScreen
└── <form grid-cols-2>
    ├── fields.map(renderAnimalFormField)   // 22 fields, flat
    ├── <div data-conditional={origen}>      // padres OR compra
    ├── Comentarios (col-span-full)
    ├── LOCATION_FIELDS.map(...)             // 4 selects
    └── <footer sticky>
```

**After** — 4 sections + 1 collapsible:
```
AnimalFormScreen
└── <form>
    ├── <Section "IDENTIFICACIÓN"  grid=1fr 1.4fr 1fr>     // codigo, nombre, arete
    ├── <Section "CARACTERÍSTICAS" 1fr 1fr 1.2fr + 1fr 1fr> // sexo/raza/fecha + color/calidad
    ├── <Section "ORIGEN"          pills 260px + 1fr 1fr>  // origen + condicional
    ├── <Section "UBICACIÓN"       grid=1fr 1fr 1fr 1fr>   // potrero/sector/lote/grupo
    ├── <Collapsible "Detalles adicionales · N con datos">  // RFID, tipoExpl, prop, hierro, pezones, switches, comentarios
    └── <footer sticky | inline>                            // cancelar + guardar + sync-hint
```

## Section Layout System

`SECTION_LAYOUT` is a `const` array of 5 entries (`id`, `title`, `gridClasses`). Each section renders its own `<section>` with an `h2` header (`text-caption font-semibold uppercase tracking-wide text-muted-foreground`) and a per-section grid containing only the field renderers assigned to that section. The card width is `max-w-[720px]` (was `max-w-3xl`); the route wrapper keeps `max-w-4xl` and centers it.

```ts
const SECTION_LAYOUT: readonly SectionDef[] = [
  { id: "identificacion", title: "Identificación",       gridClasses: "grid-cols-[1fr_1.4fr_1fr]" },
  { id: "caracteristicas", title: "Características",     gridClasses: "grid-cols-[1fr_1fr_1.2fr]" },
  { id: "origen",          title: "Origen",              gridClasses: "grid-cols-[260px_1fr_1fr]" },
  { id: "ubicacion",       title: "Ubicación",           gridClasses: "grid-cols-[1fr_1fr_1fr_1fr]" },
  { id: "detalles",        title: "Detalles adicionales", kind: "collapsible" },
]
```

A small `sectionFor(fieldName)` resolver maps the existing `FORM_FIELDS` (kept as the field-definition source) to its section. The `caracteristicas` section has two rows: row 1 is sexo/raza/fechaNacimiento, row 2 is color/calidad wrapped in a `col-span-full` inner row. Mobile parity: each section applies `mobile && "grid-cols-1"` to its grid, so UBICACIÓN stacks 4 selects on mobile.

## Collapsible State Machine

Controlled `Collapsible` (Radix) drives the "Detalles adicionales" block.

1. **defaultOpen on mount** — `formVariant === "create"` → `false`. `formVariant === "edit"` → `true` if any detail field has data in `initialValues`. We compute via `useMemo` over `["codigoRfid", "tipoExplotacionId", "propietarioId", "hierroId", "numeroPezones", "tatuado", "herrado", "descornado", "esDeMonta", "comentarios"]`. `esDeMonta` is excluded from the count when `sexo !== 0` (Macho) so the count matches the visible UI.
2. **Force-open on validation error (CA-UI-010)** — when `fieldErrors` intersects `DETAIL_FIELD_NAMES`, set `collapsibleOpen = true` via `useEffect` keyed on `JSON.stringify(detailFieldErrors)`.
3. **Focus the errored field** — `document.getElementsByName(name)[0]?.scrollIntoView({ block: "nearest" })`. No `behavior: "smooth"` so `prefers-reduced-motion` is respected implicitly.

`onOpenChange` from Radix updates `collapsibleOpen`. The user can collapse manually; we only force-open, never force-close.

## DatePicker Extension

Add one optional prop to `DatePickerProps`: `footerChildren?: React.ReactNode`. Render it inside `PopoverPrimitive.Content` *after* the `<DayPicker>` so the popover reads "calendar → footer" with the same `bg-popover` background. Existing consumers (formulario-vacuna) keep working because the prop defaults to `undefined`.

```tsx
<PopoverPrimitive.Content ...>
  <DayPicker ... />
  {footerChildren ? <div className="border-t p-3">{footerChildren}</div> : null}
</PopoverPrimitive.Content>
```

The `EstimarPorEdad` component (currently a sibling button inside `FechaNacimientoField`) becomes the `footerChildren` of the date picker. `FechaNacimientoField` shrinks to `<DatePicker ... footerChildren={<EstimarPorEdad onApply={onEstimar} />} />` — no more sibling button. The popover's `Estimar` keeps its own internal state and writes via the existing `onEstimar` → `setFechaNacimiento` + `setComentarios` flow.

## Mobile Parity Strategy

Single JSX, `cn()` toggles on `mobile`:

- **Card width**: `mobile ? "w-full" : "max-w-[720px]"`.
- **Section grids**: `mobile && "grid-cols-1"` per section.
- **Sexo**: `renderSexoField` branches on `ctx.mobile` — Select on desktop, `PillsSegmentadas` on mobile. `mobile` is added to `RenderFieldContext`.
- **Origen**: already pills when `!useComboboxOrigen`; ensure they are full-width on mobile.
- **Footer**: `mobile ? "fixed inset-x-0 bottom-0 min-h-20" : "col-span-full ..."`. Cancel button is replaced by a ✕ in the header on mobile (`Button variant="ghost" size="icon"` → `onCancel`).
- **Mobile-only hint** "No encuentras la raza? Créala…" — already present, kept.

## Sync Hint Reactivity (CA-UI-005)

New tiny hook in `animal-crud.tsx` (not a primitive — single consumer):

```ts
function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true)
  useEffect(() => {
    if (typeof navigator === "undefined") return
    const update = () => setOnline(navigator.onLine)
    update()
    window.addEventListener("online", update)
    window.addEventListener("offline", update)
    return () => {
      window.removeEventListener("online", update)
      window.removeEventListener("offline", update)
    }
  }, [])
  return online
}
```

The footer's "Se sincronizará al recuperar señal" `<p>` renders only when `!useOnlineStatus()`. SSR default = `true` (online) matches existing first paint.

## Required Fields Correction (CA-UI-014)

Drop the `required` prop from `renderTipoExplotacionField`. The visual asterisk is gone. No label change, no other field changes. Verify `FIELD_RENDERERS.tipoExplotacionId` no longer passes `required`.

## File Changes

| File | Action | Description |
|---|---|---|
| `packages/ui/src/ganado/animal-crud.tsx` | Modify | Add `SECTION_LAYOUT` + `sectionFor`. Add `useOnlineStatus`. Refactor `AnimalFormScreen` body into 4 sections + 1 Collapsible. Pass `mobile` into `RenderFieldContext`. Replace `FechaNacimientoField`'s sibling Estimar with `DatePicker footerChildren`. `renderSexoField` branches on mobile for pills. Add ✕ in mobile header. Drop `required` from `renderTipoExplotacionField`. |
| `packages/ui/src/primitives/date-picker.tsx` | Modify | Add `footerChildren?: React.ReactNode` to `DatePickerProps`; render inside popover with `border-t p-3` below the calendar. |
| `apps/web/.../animales/nuevo.tsx` | Verified | Wrapper keeps form centered; no logic change. |
| `apps/web/.../animales/$animalId/editar.tsx` | Verified | Same wrapper, no logic change. |
| `openspec/specs/animal-crud-ui/spec.md` | Delta (in spec phase) | New `### Requirement: Form is laid out in 4 sections plus a collapsible` citing §3.5. |
| `packages/ui/tests/animal-ui.test.tsx` | Modify | Add tests: 5 section headers, 10 initial fields, Collapsible open/close on edit, error-forces-open, `useOnlineStatus` integration, mobile grid, `tipoExplotacionId` no asterisk, `Estimar` lives in popover. |

## Risks & Mitigations

| Risk | L | Mitigation |
|---|---|---|
| Collapsible state machine races with `origen` toggle | M | `origen` lives outside the collapsible; no state overlap. Force-open effect keys on `JSON.stringify(detailFieldErrors)`. |
| `DatePicker.footerChildren` breaks existing consumers | L | Optional prop, default `undefined`; existing `date-picker.test.tsx` keeps passing. Add 1 test asserting default behavior is unchanged. |
| FormData payload regresses | M | Existing submit assertions stay green; one snapshot test compares `new FormData(form)` keys. No `name` attribute changes. |
| Mobile parity drift | M | Single JSX, `cn()`-driven; one Playwright test at 375px asserts the 4 headers + 4 location selects stacked. |
| Theme regression (hex/`dark:` slipping in) | L | Biome lint stays green; no new colors added (only structural `border`/`bg-card`/`space-y-6`). E2E visual check across 10 themes (CA-UI-018) is part of the verify phase. |
| `prefers-reduced-motion` ignored on focus scroll | L | `scrollIntoView({ block: "nearest" })` with no `behavior: "smooth"` — no animation triggered. |
| Section header `id` collisions | L | Header `id` is `${section.id}-heading`; `aria-labelledby` on each `<section>`. |

## Migration / Rollout

No data migration. No route mappers touched. Rollback = `git revert`; the form reverts to the flat grid because `FORM_FIELDS` and `FIELD_RENDERERS` are unchanged. The `DatePicker` extension is additive and backward-compatible. Estimated effort: animal-crud.tsx ~150 LOC refactor, date-picker.tsx +15 LOC, tests ~120 LOC additions, 1 spec delta — under the 400-line PR budget, no chain required.

## Open Questions

- None blocking. The spec (v1.5) is unambiguous about section contents + grids. The single judgment call — moving `Comentarios` inside the collapsible per §3.5.3 — is the only deviation from the current code's location, and matches the spec literally.
