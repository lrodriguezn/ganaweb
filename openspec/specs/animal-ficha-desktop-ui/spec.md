# Animal Ficha Desktop UI Specification

## Purpose

Define the desktop visual shell for the animal ficha: header composition, summary cards (DATOS / REPRODUCCIÓN / PESO Y CONDICIÓN), tabbed timeline card with domain filtering, pagination control, EventDrawer wiring, edit-return navigation, and theme fidelity.

## Requirements

### Requirement: Ficha Header Composition

The desktop ficha header MUST render: breadcrumb to the animal list, title `{codigo} · {nombre}`, reproductive-state and health-state badges, meta line (raza · sexo · edad · potrero · lote · grupo), and actions "Editar" (secondary) and "+ Registrar evento" (primary).

#### Scenario: Header renders identity context

- GIVEN animal "MT-102 · Lucero", reproductive state "Preñada", health "Sana", potrero POT-3
- WHEN the operator opens the ficha
- THEN title, both state badges and the full meta line render with those values

#### Scenario: Breadcrumb returns to the list

- GIVEN the ficha is open
- WHEN the operator selects the "Animales" breadcrumb
- THEN the animal list screen is shown

### Requirement: Summary Cards With Real Data

The screen MUST render three left-column cards — DATOS, REPRODUCCIÓN, PESO Y CONDICIÓN — populated from the enriched ficha read model.

#### Scenario: Cards render real values

- GIVEN the read model provides DATOS, REPRODUCCIÓN and PESO Y CONDICIÓN values
- WHEN the ficha renders
- THEN the three cards display those values with their labels and units

#### Scenario: Missing data renders structured empty states

- GIVEN the read model has no value for one or more fields
- WHEN the ficha renders
- THEN each missing field keeps label and unit with a placeholder value, without breaking layout

### Requirement: Tabbed Timeline Card

The screen MUST render a timeline card with tabs Resumen, Eventos, Reproducción, Producción and Sanidad. Resumen MUST be active by default showing all events; domain tabs MUST filter by domain. Each event row MUST show a domain-colored icon, title, meta and date.

#### Scenario: Default tab shows all events

- GIVEN timeline events from multiple domains
- WHEN the ficha renders
- THEN Resumen is active and lists all events newest-first

#### Scenario: Domain tab filters events

- GIVEN reproducción, producción and sanidad events
- WHEN the operator selects Reproducción
- THEN only reproducción-domain events are listed

#### Scenario: Tab without events shows empty state

- GIVEN no sanidad events exist
- WHEN the operator selects Sanidad
- THEN an empty state replaces the event rows

### Requirement: Timeline Pagination Control

The timeline MUST paginate via a footer control "Ver N eventos más" that appends the next page, where N is the pending count reported by the timeline contract under the ACTIVE tab filter (design decision D2: tabs are server-side filtered, so an unfiltered total would show wrong numbers inside filtered tabs). When the pending count is unavailable, the control MUST fall back to the count-less wording "Ver más eventos". The control MUST NOT render when no further events exist.

#### Scenario: More events available

- GIVEN more events than the current page holds
- WHEN the operator selects "Ver N eventos más"
- THEN the next page of events is appended

#### Scenario: Control shows the pending count of the active filter

- GIVEN a filtered tab with more events than the current page holds
- WHEN the timeline renders the pagination control
- THEN the control shows the pending count for that filter, and the count decreases as pages are appended

#### Scenario: Count unavailable falls back

- GIVEN a page with nextCursor but no pending count
- WHEN the timeline renders the pagination control
- THEN the control reads "Ver más eventos"

#### Scenario: No further events

- GIVEN all events are already loaded
- WHEN the timeline renders
- THEN the pagination control is not shown

### Requirement: Event Registration Drawer Wiring

"+ Registrar evento" MUST open the existing EventDrawer; closing it MUST return to the ficha without navigation. Event form submission is out of scope for this capability.

#### Scenario: Open and close drawer

- GIVEN the ficha is open
- WHEN the operator selects "+ Registrar evento"
- THEN the EventDrawer opens, and closing it returns to the ficha without navigation

### Requirement: Edit Save Returns to Ficha

After a successful edit save, navigation MUST return to the animal's ficha, not to the animal list.

#### Scenario: Save returns to ficha

- GIVEN the operator opened the edit form from the ficha
- WHEN the edit form is saved successfully
- THEN the app navigates back to that animal's ficha

### Requirement: Theme Fidelity

The screen MUST render across all five themes, light and dark, using existing design tokens only; it MUST NOT introduce new colors or `dark:` variants.

#### Scenario: Renders across themes

- GIVEN any of the five themes in light or dark variant
- WHEN the ficha renders
- THEN surfaces, badges, timeline icons and typography resolve from existing design tokens
