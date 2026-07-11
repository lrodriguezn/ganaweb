# Issue-ready feature request: Five-style appearance rollout

## Title

feat(ui): add five visual appearance styles

## Problem Description

GanaWeb currently exposes a binary Campo/Moderna appearance model, but the product design now defines five selectable styles: Campo, Moderna, Índigo, Cielo, and Grafito. The runtime must match the style catalog and screens 16/17 so users can choose the visual tone that best fits their context without changing workflows.

## Proposed Solution

Add a visual-card style selector for mobile and desktop appearance surfaces. All users can select any of the five styles. The selected style is stored only on the local device in `ganaweb-estilo`; Campo is the default. Claro/oscuro remains independent in `ganaweb-theme`, so every style combines with light and dark mode.

## Affected Area

UI / Web appearance settings

## Acceptance Criteria

- [ ] Mobile `/mas` and desktop avatar menu show five visual style cards matching screens 16/17 at PRD level.
- [ ] Campo, Moderna, Índigo, Cielo, and Grafito are available to all users.
- [ ] Style selection persists locally only and defaults/falls back to Campo.
- [ ] Light/dark mode combines independently with every style.
- [ ] Implementation uses token-only theming; no component-level `dark:` or style-specific variants.

## GitHub Flow Recommendation

Create this as a feature request issue before implementation. Use forced chained PRs because the rollout likely spans tokens, selector UI, desktop/mobile surfaces, anti-flash bootstrapping, and tests.
