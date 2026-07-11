# UI Component Library Specification

## Purpose

Creates a buildable `packages/ui` package that migrates the existing reference component library (`docs/ganaweb-componentes/ganaweb/src/`) while preserving Spanish domain vocabulary and the token-based theming contract (T-004).

## Requirements

### Requirement 1: Buildable package

`packages/ui` MUST compile with `tsup` or `tsc` and export all migrated components so consumers can import them by name.

#### Scenario: CI builds the package

- GIVEN the CI pipeline runs
- WHEN `pnpm turbo build --filter ui` executes
- THEN the package emits valid JS + declaration files with zero errors.

### Requirement 2: Token migration

`packages/ui` MUST include the migrated `globals.css` with Tailwind v4 `@theme inline` tokens matching the shared Campo baseline and five-style runtime catalog in `ganaweb-estilos.md`: Campo, Moderna, Índigo, Cielo, and Grafito. Non-Campo styles MUST apply through style-level tokens only; components MUST NOT require per-style variants.

#### Scenario: Tokens are present

- GIVEN the built package is consumed by `apps/web`
- WHEN each style renders in claro and oscuro
- THEN `--color-primary`, `--color-background`, and semantic tokens resolve for all 10 combinations.

### Requirement 3: No dark: variants

NO component or page in `packages/ui` MAY use `dark:` Tailwind variants. Theming MUST be achieved through CSS tokens only, including the five style ids and independent claro/oscuro mode.

#### Scenario: Variant audit passes

- GIVEN a text search for `dark:` across `packages/ui/src`
- WHEN the search completes
- THEN zero occurrences are found.

### Requirement 4: All 13 ganado components migrated

The following 13 components MUST be migrated from `docs/ganaweb-componentes/ganaweb/src/components/ganado/` to `packages/ui` preserving prop contracts and Spanish domain labels:

- `animal-card.tsx`
- `empty-state.tsx`
- `estado-badge.tsx`
- `event-drawer/index.tsx`
- `event-drawer/formulario-vacuna.tsx`
- `finca-switcher.tsx`
- `maestro-card.tsx`
- `metric-card.tsx`
- `sync-pill.tsx`
- `theme-toggle.tsx`
- `timeline.tsx`
- `types.ts`
- `lib/utils.ts` (utility helper)

#### Scenario: Components are importable

- GIVEN `packages/ui` is built
- WHEN `apps/web` imports `{ AnimalCard, SyncPill, MetricCard }`
- THEN the imports resolve and TypeScript types are available.

### Requirement 5: shadcn base support

`packages/ui` MAY include shadcn/ui base dependencies (`class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`) and a `cn` utility, and SHOULD re-export primitives used by the migrated components.

#### Scenario: cn utility available

- GIVEN a migrated component needs conditional classes
- WHEN it imports `cn` from `packages/ui`
- THEN class merging works without adding new utilities.

### Requirement 6: Five-style visual selector

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

### Requirement 7: Accessible selector cards

The selector MUST expose one radio-style option per style with visible focus, selected state, Spanish labels, palette preview, and at least 44px touch targets.

#### Scenario: Keyboard selection

- GIVEN focus is inside the selector
- WHEN the user navigates and activates Índigo by keyboard
- THEN focus remains visible and Índigo becomes selected.

## Rule Citations

- T-003 — Domain names and UI text in Spanish.
- T-004 — No `dark:` variants; token-only theming.
- IA-003 — Reuse migrated components before creating new ones.
