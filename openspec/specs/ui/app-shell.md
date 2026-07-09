# App Shell Specification

## Purpose

Define the responsive application shell for GanaWeb: fixed `Sidebar` on desktop, `BottomNav` + central `Fab` on mobile, and a top `AppHeader`.

## Requirements

### Requirement: Sidebar desktop navigation

On viewports ≥ 768px, the system MUST render `Sidebar` with a fixed width of 240px and full viewport height.

The `Sidebar` MUST display the GanaWeb logo at the top, primary navigation items in order (Inicio, Animales, Eventos, Sanidad, Reportes, Tareas), and `Configuración` at the bottom. The active item MUST use `primary-soft` background and primary-text color; inactive items MUST use `text-secondary`.

Desktop reference: frame-0080.

#### Scenario: Active route highlighted

- GIVEN the user is on `/`
- WHEN the `Sidebar` renders
- THEN `Inicio` has `primary-soft` background (#E4F0E7 light / #24352A dark) and primary text (#245231 light / #A5D8B2 dark).

#### Scenario: Inactive routes

- GIVEN the user is on `/animales`
- WHEN the `Sidebar` renders
- THEN `Animales` is highlighted and all other primary items are not.

### Requirement: BottomNav mobile navigation

On viewports < 768px, the system MUST render `BottomNav` with height 64px fixed to the bottom. It MUST expose five positions: Inicio, Animales, a central `Fab` [+], Tareas, Más.

The active label MUST use the primary token; inactive labels MUST use `text-muted`.

Mobile reference: frame-0133.

#### Scenario: Mobile navigation visible

- GIVEN the viewport is 390px wide
- WHEN the dashboard renders
- THEN `BottomNav` is visible, `Sidebar` is hidden, and the central `Fab` is a 48px circle.

#### Scenario: Active mobile tab

- GIVEN the user is on `/tareas`
- WHEN `BottomNav` renders
- THEN the `Tareas` label uses the primary color.

### Requirement: AppHeader

`AppHeader` MUST be 56px tall, use the surface background, and align `FincaSwitcher` on the left, a `SearchTrigger` placeholder in the center, and `SyncPill` on the right.

Token usage: surface #FFFFFF/#211E1A, text #2B2620/#EDE9E1, search field `muted-bg` #F1EDE6/#2C2823.

Desktop reference: frame-0080; mobile reference: frame-0133.

#### Scenario: Header elements present

- GIVEN the dashboard is loaded
- WHEN `AppHeader` renders
- THEN the finca name, search placeholder, and sync status are visible.

### Requirement: Floating action button

`Fab` MUST be a 48px diameter circle with primary background and a white plus icon. On mobile it MUST be centered on the `BottomNav`; it MAY also be rendered independently.

Token usage: primary #2F6B3F/#4C9D62, on-primary #FFFFFF/#171512.

#### Scenario: FAB triggers action

- GIVEN the user taps the central `Fab`
- WHEN the click handler fires
- THEN the registered `onClick` callback is invoked.

### Requirement: Responsive layout integration

The `_app.tsx` layout MUST compose `Sidebar` + `AppHeader` for desktop and `BottomNav` for mobile, reserving the correct content safe areas.

#### Scenario: Layout switches at breakpoint

- GIVEN a viewport of 1440px
- WHEN the dashboard renders
- THEN the content area is offset by the 240px sidebar and 56px header.

#### Scenario: Mobile safe area

- GIVEN a viewport of 390px
- WHEN the dashboard renders
- THEN the main content has bottom padding equal to the 64px bottom nav height.

## Component API

| Component | Props |
|---|---|
| `Sidebar` | `activeRoute: string; onNavigate?: (route: string) => void; className?: string` |
| `BottomNav` | `activeRoute: string; onNavigate?: (route: string) => void; onFabClick?: () => void; className?: string` |
| `AppHeader` | `fincaNombre: string; onFincaClick?: () => void; syncStatus: 'synced' \| 'pending' \| 'offline'; pendingCount?: number; className?: string` |
| `Fab` | `onClick?: () => void; ariaLabel: string; className?: string` |

## Token Usage

| Element | Light | Dark |
|---|---|---|
| Sidebar/BottomNav/Header surface | #FFFFFF | #211E1A |
| Active nav bg | #E4F0E7 | #24352A |
| Active nav text | #245231 | #A5D8B2 |
| Inactive nav text | #6B6155 | #A89F92 |
| FAB bg | #2F6B3F | #4C9D62 |
| FAB icon | #FFFFFF | #171512 |
| Search field bg | #F1EDE6 | #2C2823 |

## Rule Citations

- T-003 — Domain UI labels in Spanish.
- T-004 — No `dark:` variants; token-only theming.
- IA-003 — Reuse existing `FincaSwitcher` and `SyncPill`.
