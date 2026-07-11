# Delta for Web

## ADDED Requirements

### Requirement: Appearance surfaces render five style cards

`apps/web` MUST render the five-style selector on mobile `/mas` and in the desktop Avatar menu, aligned to screens 16 and 17. The surfaces MUST preserve Spanish labels and MUST NOT alter account, finca, role, or domain workflow behavior.

#### Scenario: Mobile appearance selection

- GIVEN a mobile user opens `/mas`
- WHEN Apariencia is shown
- THEN cards for Campo, Moderna, Índigo, Cielo, and Grafito are available.

#### Scenario: Desktop avatar selection

- GIVEN a desktop user opens the Avatar menu
- WHEN the appearance section renders
- THEN the same five cards and selected state are shown.

### Requirement: Independent style and claro/oscuro state

`apps/web` MUST combine five styles with claro/oscuro for 10 runtime appearances. Style MUST persist locally in `ganaweb-estilo`; claro/oscuro MUST remain in `ganaweb-theme`; changing either MUST NOT overwrite the other.

#### Scenario: Ten combinations are reachable

- GIVEN each style is available
- WHEN the user toggles claro/oscuro for each style
- THEN all 10 combinations render without changing stored style id.

#### Scenario: No server preference sync

- GIVEN a user changes appearance
- WHEN network requests are observed
- THEN no account, finca, or role preference sync is sent.

### Requirement: Anti-flash first paint

`apps/web` MUST apply the selected style class and `dark` class, when applicable, before first paint. Missing or invalid local style MUST fall back to Campo.

#### Scenario: Stored Grafito oscuro loads

- GIVEN `ganaweb-estilo=grafito` and `ganaweb-theme=dark`
- WHEN the document first paints
- THEN `<html>` already reflects Grafito and dark mode.

#### Scenario: Missing local values load

- GIVEN no appearance values are stored
- WHEN the document first paints
- THEN Campo claro is applied without visible style flash.
