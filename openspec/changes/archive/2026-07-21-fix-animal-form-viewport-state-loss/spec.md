# Delta for `animal-crud-ui`

## ADDED Requirements

### Requirement: Single-instance form rendering per route

The animal create route (`animales/nuevo`) and edit route (`animales/$animalId/editar`) MUST mount exactly one `AnimalFormScreen` instance per page. The component MUST NOT be rendered twice with different `mode` values inside responsive wrapper divs (`hidden md:block` paired with `md:hidden`). This satisfies issue #59.

#### Scenario: One DOM tree per route

- GIVEN the user navigates to `animales/nuevo` or `animales/$animalId/editar`
- WHEN the route view mounts
- THEN the DOM contains exactly one `<form>` rendered by `AnimalFormScreen`
- AND no second `AnimalFormScreen` is mounted under a `hidden md:block` / `md:hidden` pair

### Requirement: Viewport-responsive mode derived from `matchMedia`

`AnimalFormScreen` MUST determine the responsive `mode` ("desktop" | "mobile") reactively from a `matchMedia("(min-width: 768px)")` listener. The internal `mobile` boolean MUST update when the viewport crosses the 768px breakpoint. The SSR / pre-hydration default MUST be desktop, and the existing `isHydrated` gate MUST suppress mismatches during the first render.

#### Scenario: Desktop viewport reports desktop

- GIVEN `window.matchMedia("(min-width: 768px)")` matches
- WHEN `AnimalFormScreen` renders
- THEN the desktop layout, field set, and footer position are used
- AND the desktop `data-testid` / `aria-label` are applied

#### Scenario: Cross below 768px switches to mobile

- GIVEN the form is rendered at desktop width
- WHEN the viewport becomes narrower than 768px (matchMedia `change` fires)
- THEN the form re-renders with the mobile layout, filtered field set, and sticky footer
- AND the mobile `data-testid` / `aria-label` are applied

#### Scenario: SSR renders desktop before hydration

- GIVEN the route is server-rendered
- WHEN the HTML is sent to the client
- THEN the rendered markup matches the desktop variant
- AND the client agrees on the first paint because of the `isHydrated` gate

### Requirement: Form state persists across viewport changes

`AnimalFormScreen` MUST keep every typed value in its internal state across viewport transitions. When the viewport crosses 768px while the user has data in any field (including but not limited to `comentarios`, `fechaNacimiento`, `fechaCompra`, `origen`, `origenFlipCount`), the values MUST remain in the form after the re-render. This satisfies issue #59.

#### Scenario: Typed text survives resize

- GIVEN the user has typed `animal enfermo` into `comentarios` at desktop width
- WHEN the viewport crosses 768px and the form re-renders as mobile
- THEN the `comentarios` input still shows `animal enfermo`
- AND `fecha_nacimiento` (if set) and `origen` (if set) are preserved

#### Scenario: Mobile-to-desktop preserves state

- GIVEN the user has typed values at mobile width
- WHEN the viewport grows past 768px and the form re-renders as desktop
- THEN every typed value is still present
- AND the submit payload reflects the user-entered values

### Requirement: `mode` prop is optional and overrides the media query

The `mode` prop of `AnimalFormScreen` MUST be optional. When `mode` is provided (`"desktop"` or `"mobile"`), the component MUST use it as an override and skip the `matchMedia` listener. When `mode` is `undefined`, the component MUST derive the responsive variant from the media query. The `mode` prop exists for SSR defaults and for tests that need a stable variant; production routes MUST NOT pass `mode`.

#### Scenario: No `mode` prop uses the media query

- GIVEN the route renders `<AnimalFormScreen />` without a `mode` prop
- WHEN the viewport changes
- THEN the layout tracks the media query

#### Scenario: Explicit `mode` overrides the media query

- GIVEN a test renders `<AnimalFormScreen mode="mobile" />`
- WHEN a `matchMedia` `change` event fires
- THEN the component still renders the mobile variant
- AND the media-query listener is not consulted while `mode` is set

#### Scenario: Form `id` is stable across variants

- GIVEN the form is rendered
- WHEN the viewport changes or `mode` toggles
- THEN the rendered form `id` is `animal-form-${currentAnimalId ?? "new"}` (no `mode` segment)
- AND the same form element is reused (no remount caused by `id` change)
