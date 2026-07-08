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

`packages/ui` MUST include the migrated `globals.css` with Tailwind v4 `@theme inline` tokens matching the color, typography, radius, and spacing definitions in `ganaweb-design.md`.

#### Scenario: Tokens are present

- GIVEN the built package is consumed by `apps/web`
- WHEN the page renders
- THEN `--color-primary`, `--color-background`, and all semantic tokens are available.

### Requirement 3: No dark: variants

NO component or page in `packages/ui` MAY use `dark:` Tailwind variants. Theming MUST be achieved through CSS tokens only.

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

## Rule Citations

- T-003 — Domain names and UI text in Spanish.
- T-004 — No `dark:` variants; token-only theming.
- IA-003 — Reuse migrated components before creating new ones.
