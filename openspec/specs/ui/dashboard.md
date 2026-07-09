# Dashboard Specification

## Purpose

Define the Dashboard / Inicio page with metric cards, action-required card, 7-day production chart, and recent activity list.

## Requirements

### Requirement: MetricCards grid

The dashboard MUST render four `MetricCard` widgets in a responsive grid: four columns on desktop and two columns on mobile.

Token usage: surface #FFFFFF/#211E1A, label `text-secondary` #6B6155/#A89F92, value `text` #2B2620/#EDE9E1, critical value `danger` #B3352C/#E5695F, positive context `success` #17693F/#4CC08A.

Desktop reference: frame-0080; mobile reference: frame-0133.

#### Scenario: Metrics render

- GIVEN fixture metrics for Activos, Preñadas, Leche hoy, Enfermos
- WHEN the dashboard renders
- THEN all four cards are visible with the correct labels and values.

#### Scenario: Critical metric styling

- GIVEN the "Enfermos" value is 7
- WHEN the card renders
- THEN the value is colored with the danger token.

### Requirement: CardAccion

`CardAccion` MUST display the title "Requiere acción", a count badge using `danger-bg` and `danger` text, and alert rows. Each row MUST show a colored dot (`danger` or `warning`), a message, and a chevron, separated by dividers.

Token usage: title `text` #2B2620/#EDE9E1, danger dot #B3352C/#E5695F, warning dot #9A6B0C/#E0A83C, divider `border` #E3DED5/#3A362F, badge bg `danger-bg` #FBE5E3/#3B211F.

Desktop/mobile reference: frame-0080 / frame-0133.

#### Scenario: Alerts render

- GIVEN five alerts with mixed severities
- WHEN `CardAccion` renders
- THEN the badge shows "5" and each row has the correct dot color and a chevron.

#### Scenario: Empty alerts

- GIVEN an empty alerts array
- WHEN `CardAccion` renders
- THEN the badge shows "0" and the card displays an empty state.

### Requirement: CardProduccion

`CardProduccion` MUST display the title "Producción 7 días", a delta indicator in `success` color (e.g. +4,2%), and a CSS-only bar chart with seven bars in the production domain color.

Token usage: bars `production` #1D8F74/#3FBF9E, delta `success` #17693F/#4CC08A, labels `text-muted` #7D7466/#8C8375.

Desktop/mobile reference: frame-0080 / frame-0133.

#### Scenario: Seven bars render

- GIVEN seven daily production values
- WHEN `CardProduccion` renders
- THEN exactly seven bars are visible and the tallest bar reaches the chart area top.

#### Scenario: Negative delta

- GIVEN a negative delta value
- WHEN the delta renders
- THEN it uses the `danger` token instead of `success`.

### Requirement: CardActividad

`CardActividad` MUST display the title "Actividad reciente" and a list of activity rows. Each row MUST show a description and a timestamp, separated by dividers.

Token usage: title `text` #2B2620/#EDE9E1, description `text` #2B2620/#EDE9E1, timestamp `text-muted` #7D7466/#8C8375, divider `border` #E3DED5/#3A362F.

Desktop/mobile reference: frame-0080 / frame-0133.

#### Scenario: Recent activity renders

- GIVEN three recent activities
- WHEN `CardActividad` renders
- THEN each description and timestamp are visible and dividers separate rows.

#### Scenario: Long descriptions truncated

- GIVEN an activity description longer than the available width
- WHEN the row renders
- THEN the text is truncated with ellipsis without breaking the layout.

### Requirement: Route integration with fixture data

`index.tsx` MUST render the dashboard content using typed fixture data from `apps/web/src/lib/fixtures/dashboard.ts`, and `_app.tsx` MUST apply the app-shell layout.

#### Scenario: Dashboard route loads

- GIVEN the app shell layout is applied
- WHEN `/` is requested
- THEN the dashboard renders with fixture metrics, CardAccion, CardProduccion, and CardActividad.

#### Scenario: Fixture typing

- GIVEN the fixture file exports typed dashboard data
- WHEN TypeScript checks the project
- THEN no type errors are reported.

## Component API

| Component | Props |
|---|---|
| `CardAccion` | `count: number; alerts: { id: string; message: string; severity: 'danger' \| 'warning'; href?: string }[]; className?: string` |
| `CardProduccion` | `delta: string; data: { day: string; value: number }[]; className?: string` |
| `CardActividad` | `activities: { id: string; description: string; time: string }[]; className?: string` |

## Token Usage

| Element | Light | Dark |
|---|---|---|
| Card surface | #FFFFFF | #211E1A |
| Card title | #2B2620 | #EDE9E1 |
| Danger dot/badge | #B3352C / #FBE5E3 | #E5695F / #3B211F |
| Warning dot | #9A6B0C | #E0A83C |
| Production bars | #1D8F74 | #3FBF9E |
| Success delta | #17693F | #4CC08A |
| Dividers | #E3DED5 | #3A362F |
| Timestamp/labels | #7D7466 | #8C8375 |

## Rule Citations

- T-003 — Spanish domain labels.
- T-004 — Token-only theming; no `dark:` variants.
- IA-003 — Reuse existing `MetricCard`.
