# Delta for UI

## ADDED Requirements

### Requirement: Five-style visual selector

`packages/ui` MUST provide a token-driven visual-card selector for Campo, Moderna, Índigo, Cielo, and Grafito. It MUST supersede binary Campo/Moderna switcher semantics, persist only the selected style id in `ganaweb-estilo`, default invalid or missing values to Campo, and MUST NOT add account sync, role gating, finca gating, or domain workflow changes.

#### Scenario: User selects a style

- GIVEN the selector renders in any appearance surface
- WHEN the user selects Grafito
- THEN Grafito is marked selected and `ganaweb-estilo` stores `grafito`
- AND claro/oscuro state is unchanged.

#### Scenario: Invalid stored style

- GIVEN `ganaweb-estilo` contains an unknown value
- WHEN the selector initializes
- THEN Campo is selected without server calls.

### Requirement: Accessible selector cards

The selector MUST expose one radio-style option per style with visible focus, selected state, Spanish labels, palette preview, and at least 44px touch targets.

#### Scenario: Keyboard selection

- GIVEN focus is inside the selector
- WHEN the user navigates and activates Índigo by keyboard
- THEN focus remains visible and Índigo becomes selected.

## MODIFIED Requirements

### Requirement 2: Token migration

`packages/ui` MUST include the migrated `globals.css` with Tailwind v4 `@theme inline` tokens matching the shared Campo baseline and five-style runtime catalog in `ganaweb-estilos.md`: Campo, Moderna, Índigo, Cielo, and Grafito. Non-Campo styles MUST apply through style-level tokens only; components MUST NOT require per-style variants.
(Previously: tokens only had to match `ganaweb-design.md`.)

#### Scenario: Tokens are present

- GIVEN the built package is consumed by `apps/web`
- WHEN each style renders in claro and oscuro
- THEN `--color-primary`, `--color-background`, and semantic tokens resolve for all 10 combinations.

### Requirement 3: No dark: variants

NO component or page in `packages/ui` MAY use `dark:` Tailwind variants. Theming MUST be achieved through CSS tokens only, including the five style ids and independent claro/oscuro mode.
(Previously: the rule covered dark mode only, not five independent styles.)

#### Scenario: Variant audit passes

- GIVEN a text search for `dark:` across `packages/ui/src`
- WHEN the search completes
- THEN zero occurrences are found.

## REMOVED Requirements

### Requirement: Binary Campo/Moderna switcher semantics

(Reason: Two-option pill behavior does not scale to the five-style product catalog.)
(Migration: Replace with the five-style visual-card selector and keep `ganaweb-estilo` values local.)
