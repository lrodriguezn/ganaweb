## Exploration: Animal Form State Loss on Viewport Change

### Current State

The animal create route (`nuevo.tsx`) and edit route (`editar.tsx`) each mount **two independent instances** of `AnimalFormScreen` — one with `mode="desktop"`, one with `mode="mobile"` — and toggle visibility via Tailwind responsive classes:

```tsx
<div className="hidden md:block">
  <AnimalFormScreen mode="desktop" ... />   {/* Instance A */}
</div>
<div className="md:hidden">
  <AnimalFormScreen mode="mobile" ... />    {/* Instance B */}
</div>
```

Each `AnimalFormScreen` maintains its own internal `useState`:
- `origen` (OrigenKey)
- `origenFlipCount` (counter for conditional block remount)
- `fechaNacimiento` (string)
- `fechaCompra` (string)
- `comentarios` (string)
- `isHydrated` (boolean)

When the user resizes from desktop to mobile (or vice versa), the newly visible instance has never received the typed values from the other — it initializes from `initialValues` (edit mode) or defaults (create mode). All partially-filled form data is lost.

This same dual-mount pattern also exists in:
- `animales.tsx` (list) — but uses **different components** (`AnimalDesktopScreen` vs `AnimalListMobile`)
- `$animalId.tsx` (detail view) — also **different components** (`AnimalFichaDesktopScreen` vs `AnimalFichaMobileScreen`)

For the list and detail views, separate components are justified (completely different layouts, no shared state). For the **form**, the same component is rendered twice with just a `mode` prop — the fix is to render ONE instance.

### Affected Areas

| File | Lines | Role |
|------|-------|------|
| `packages/ui/src/ganado/animal-crud.tsx` | 641–861 | `AnimalFormScreen` — the form component itself; handles both desktop AND mobile layouts internally |
| `apps/web/src/routes/_app/fincas/$fincaId/animales/nuevo.tsx` | 238–261 | `NewAnimalRouteView` — dual-mounts `AnimalFormScreen` |
| `apps/web/src/routes/_app/fincas/$fincaId/animales/$animalId/editar.tsx` | 309–337 | `EditAnimalRouteView` — dual-mounts `AnimalFormScreen` |
| `packages/ui/tests/animal-ui.test.tsx` | — | Existing test for `AnimalFormScreen` (may need update if `mode` prop changes) |
| `apps/web/tests/animal-create-e2e` | — | E2E test for create flow |

### How AnimalFormScreen Handles Desktop vs Mobile

The component already handles ALL differences internally via a single `const mobile = mode === "mobile"` boolean:

| Aspect | Desktop | Mobile |
|--------|---------|--------|
| Fields shown | All `FORM_FIELDS` + `LOCATION_FIELDS` | Filtered (excludes "Color", "Calidad", "Nº de arete") |
| ParentsBlock | Shows madre + padre (`showPadre={true}`) | Only madre (`showPadre={false}`) |
| Grid layout | `max-w-3xl mx-auto grid-cols-2` | Single column, `max-w-[390px]` |
| Footer | Inline at bottom of grid | `fixed inset-x-0 bottom-0` sticky bar |
| Info banner | Hidden | Shows "¿No encuentras la raza?" tip |
| Container | `p-8`, `min-h-[900px]` | No padding, `min-h-[844px]` |
| testid / aria-label | `op-f-400191` / "20 Nuevo Animal · Desktop" | `op-f-400233` / "21 Nuevo Animal · Mobile" |

The **only** thing keeping this from working with a single instance is that `mode` is passed as a static string prop instead of being derived from a real-time media query.

### Approaches

**1. Single instance with `useMediaQuery` inside `AnimalFormScreen`** (RECOMMENDED)

- Remove `mode` prop (or make it optional, overridden by responsive detection)
- Add a `useMediaQuery("(min-width: 768px)")` hook inside `AnimalFormScreen`
- Derive `mobile` from the hook's value instead of `mode`
- Default to desktop during SSR (use `isHydrated` guard already in place)

| Pros | Cons | Effort |
|------|------|--------|
| Fixes the root cause (one React instance = one state) | SSR mismatch — need hydration guard | **Low** (~50 lines) |
| Component already has all the responsive logic | Need to add `useMediaQuery` or `matchMedia` listener | |
| Minimal test changes | | |
| Follows React best practices | | |

**2. Lift state to parent with lifted controlled fields** (ALTERNATIVE)

- Lift all 5 `useState` calls from `AnimalFormScreen` to the route level
- Pass them back in as controlled props
- Keep dual-mount but share state

| Pros | Cons | Effort |
|------|------|--------|
| Doesn't change responsive mechanism | More invasive — requires changing `AnimalFormScreenProps` | **Medium** (~100+ lines) |
| | The component uses `key={origen}` remount pattern that conflicts with lifted state | |
| | Still has dual-render overhead (two trees in DOM) | |

**3. CSS-only responsive within the single component** (VARIANT OF #1)

- Keep `mode` prop but render only one instance in the route
- Use Tailwind responsive classes (`hidden md:block`, `md:hidden`) inside `AnimalFormScreen` for layout differences instead of `mobile` boolean
- Remove `mode` prop entirely

| Pros | Cons | Effort |
|------|------|--------|
| Clean separation of concerns | Would require rewriting the component internals significantly | **High** (~200 lines) |
| Truly declarative responsive design | The field filtering (which fields to render) can't be done with CSS alone | |
| | The sticky footer positioning requires conditional JSX | |

### Recommendation

**Approach 1 — single instance + `useMediaQuery` inside `AnimalFormScreen`.**

Rationale:
- The component already handles every desktop/mobile difference through a single `mobile` boolean
- The `isHydrated` pattern already exists for SSR hydration safety — just extend it to cover responsive detection
- No prop changes needed for consumers (`nuevo.tsx` / `editar.tsx`) — the fix is invisible to them
- Changes are contained to ONE file (`animal-crud.tsx`) plus removing the wrapper divs in the two route files
- The `mode` prop can be kept as a SSR default / test override

Estimated changes:
- `animal-crud.tsx`: +30 lines (add `useMediaQuery` hook, derive `mobile` from it, keep `mode` prop as fallback for tests)
- `nuevo.tsx`: -6 lines (collapse to single `<AnimalFormScreen>`)
- `editar.tsx`: -6 lines (collapse to single `<AnimalFormScreen>`)
- Total: ~40–50 lines changed, net negative (removing redundant markup)

### Risks

1. **SSR/Hydration mismatch**: The server doesn't know the viewport. Mitigation: default to desktop (or mobile) during SSR via the existing `isHydrated` pattern — the form is disabled until hydration completes.

2. **Test compatibility**: `packages/ui/tests/animal-ui.test.tsx` may pass `mode` explicitly. Mitigation: keep the `mode` prop as an optional override; if provided, use it (for tests); if absent, derive from media query.

3. **`formId` uniqueness**: Currently `formId = `animal-form-${mode}`` — with one instance, this can just be `"animal-form"` (no regression since there's only one form on the page).

4. **Test IDs**: The `data-testid` and `aria-label` currently vary by mode. Mitigation: keep the conditional so they change based on the responsive hook's value.

5. **The other dual-mount patterns** (`animales.tsx`, `$animalId.tsx`) use genuinely different components — they are NOT affected by this bug and should NOT be changed.

### Ready for Proposal

**Yes.** The root cause is clear, the fix is well-understood and contained, and the component already has all the responsive logic built in. The only missing piece is a `useMediaQuery` utility to make the `mobile` boolean reactive instead of static.

A proposal should:
- Confirm the approach (single instance + reactive responsive detection)
- Decide whether to build a `useMediaQuery` hook in `packages/ui/src/lib/` or use an inline `matchMedia` listener
- Decide whether to keep `mode` as an optional test-only prop or remove it
- Plan the test updates
