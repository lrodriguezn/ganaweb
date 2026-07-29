# Manual QA — AA Contrast Matrix (Task 3.3, PR 3)

Change: `iniciemos-desarrollo-de-issue-108` (Issue #108 desktop animal list).
Spec: `Requirement: Dense Accessible Token-Themed Layout` — "All ten appearances
MUST meet AA contrast through CSS tokens only; `dark:` variants are prohibited."

**Why manual**: `openspec/config.yaml` declares the visual/coverage runners
`available: false`; no automated contrast runner exists in this repo. This matrix
is the human-executed proof for the ten appearances (5 estilos × claro/oscuro).

## Setup

1. `pnpm dev` (root) → open the app in a Chromium browser.
2. Sign in with a seeded session that has `animales:ver` + `animales:crear`
   (+ `reportes:exportar` to see `Exportar`) on a finca with seeded animals.
3. Navigate to `/fincas/{fincaId}/animales` with a viewport **≥ 768 px** (`md`)
   so the desktop branch (`AnimalListadoDesktop`) renders.
4. Open DevTools → Rendering → "Emulate CSS media feature: prefers-color-scheme"
   OR use the in-app appearance toggle (sun/moon) for claro/oscuro.
5. Switch estilo with the `EstiloSwitcher` (avatar menu → Apariencia):
   `campo`, `moderna`, `indigo`, `cielo`, `grafito`.
6. Measure contrast with DevTools Inspect → color picker contrast ratio, or the
   axe DevTools extension (run "color-contrast" rule on the listed surfaces).
   AA thresholds: normal text **4.5:1**, large text / UI components **3:1**.

## Surfaces to verify (per appearance)

| # | Surface | Elements | Token pair (expect ≥ ratio) |
|---|---------|----------|-----------------------------|
| S1 | Toolbar | `Nuevo animal` label on button | `--primary-foreground` on `--primary` (4.5:1) |
| S2 | Toolbar | `Exportar` label on button | `--secondary-foreground` on `--secondary` (4.5:1) |
| S3 | Table header | 29 column labels, sticky | `--muted-foreground` on `--muted` (4.5:1) |
| S4 | Table body | Cell text incl. `-` / `Sin registrar` | `--support` (text-support) on `--card` (4.5:1) |
| S5 | Frozen cols | `Código`/`Nombre` cells + border | text as S4; border `--border` ≥ 3:1 vs adjacent |
| S6 | Row focus | Tab to a row, focus ring | `--ring` ≥ 3:1 vs `--card` |
| S7 | Row hover | Pointer over a row | text on hover `--muted/50` blend ≥ 4.5:1 |
| S8 | Loading | Skeleton shimmer + headers | headers as S3; skeleton `--muted` vs `--card` ≥ 3:1 (non-text) |
| S9 | Panels | `No tienes acceso…` / `Error al cargar…` / `Aún no hay animales` / `Sin resultados` titles + descriptions + `Volver`/`Reintentar`/`Registrar animal` buttons | title `--foreground`-class on `--card` 4.5:1; description `--muted-foreground` on `--card` 4.5:1; buttons as S1/S2 |
| S10 | LA-040 toast | Correction `<output role="status">` under the table | `--muted-foreground` on page bg 4.5:1 |

Assistive-tech spot check (one appearance is enough): with a screen reader (or
DevTools → Accessibility tree), confirm the `<output>` live region announces the
state text ("N animales", "No tienes acceso a esta finca", "Error al cargar los
animales") in claro and oscuro — availability, not contrast.

## Result matrix

Fill one row per appearance. PASS = every surface S1–S10 meets its threshold.

| Estilo | Mode | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 | S9 | S10 | Verdict | Verified by / date | Notes (failing surface, measured ratio) |
|--------|------|----|----|----|----|----|----|----|----|----|----|---------|--------------------|------------------------------------------|
| campo | claro | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ PASS / ☐ FAIL | | |
| campo | oscuro | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ PASS / ☐ FAIL | | |
| moderna | claro | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ PASS / ☐ FAIL | | |
| moderna | oscuro | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ PASS / ☐ FAIL | | |
| indigo | claro | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ PASS / ☐ FAIL | | |
| indigo | oscuro | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ PASS / ☐ FAIL | | |
| cielo | claro | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ PASS / ☐ FAIL | | |
| cielo | oscuro | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ PASS / ☐ FAIL | | |
| grafito | claro | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ PASS / ☐ FAIL | | |
| grafito | oscuro | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ PASS / ☐ FAIL | | |

## State coverage (per appearance, seeded finca)

Confirm each state renders with the surfaces above:

- ☐ `listo` with rows (S3–S7) — scroll horizontally: `Código`/`Nombre` stay frozen, header stays sticky (S5/S8 geometry).
- ☐ `cargando` (S8) — hard-reload the route; skeletons retain the 29 headers at 40 px.
- ☐ finca-empty (`totalSinFiltro === 0`) — seed an empty finca; `Aún no hay animales` + `Registrar animal` when canCreate (S9).
- ☐ no-results (`total === 0`) — only reachable with #109 filters later; panel copy verified in jsdom (#108 does not own filter controls).
- ☐ `sin-acceso` (S9) — open a finca the session lacks permission for; `No tienes acceso a esta finca` + `Volver`.
- ☐ `error` (S9) — stop the API (`pnpm dev` down or block `/api/fincas/*` in DevTools network); `Error al cargar los animales` + `Reintentar`; click `Reintentar` after restoring → table returns.
- ☐ LA-040 toast (S10) — hand-craft an invalid URL (e.g. `?page=abc`); correction announced, invalid param removed, table retained/reloaded.

## On failure

Contrast failures are fixed at the **theme token layer** (the estilo's token
definitions), never with `dark:` variants or per-component overrides (T-004).
Re-run the failed appearance rows after the token fix. Automated guards that
already protect this surface: `packages/ui/tests/animal-ui.test.tsx` (ten-
appearance render sweep, zero `dark:` utilities) and the T-004 token scanner.
