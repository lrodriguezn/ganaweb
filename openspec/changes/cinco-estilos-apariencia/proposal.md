# Proposal: Five-Style Appearance Rollout

## Intent

Expand GanaWeb from binary Campo/Moderna to five user-selectable styles while preserving workflows, Spanish vocabulary, accessibility, and token-only theming. This closes the gap between `docs/ganaweb-estilos.md`, screens 16/17, and runtime.

## Scope

### In Scope
- Five styles for all users: Campo, Moderna, Índigo, Cielo, Grafito.
- Local persistence via `ganaweb-estilo`; Campo remains default.
- Claro/oscuro stays independent via `ganaweb-theme` (10 combinations).
- Replace two-pill switcher with visual cards on mobile `/mas` and desktop `AvatarMenu`, matching screens 16/17.
- PRD acceptance: preview, active check/focus, Spanish labels, accessibility, no-flash application.

### Out of Scope
- Account/server-synced appearance preferences.
- Per-finca or per-role style restrictions.
- New flows or domain logic.
- Implementing specs/design/tasks in this phase.

## Capabilities

### New Capabilities
- `ui/estilo-selector`: visual-card style selector contract for five styles.

### Modified Capabilities
- `ui/estilo-switcher`: supersede binary Campo/Moderna behavior with five-option selection semantics.
- `ui/css-tokens-b`: generalize from `.theme-b` to a five-style token cascade without component variants.
- `ui/theme-toggle-compat`: preserve independent claro/oscuro behavior across all styles.
- `ui/avatar-menu`: desktop appearance section must render five visual cards.
- `web/mas-mobile`: mobile appearance surface must render five visual cards.
- `web/anti-flash-script`: apply selected style class plus `dark` before first paint.

## Approach

Define a style catalog (`campo`, `moderna`, `indigo`, `cielo`, `grafito`) and map non-Campo styles to `theme-{id}` classes on `<html>`. Keep components token-driven only (T-004), preserve Spanish labels (T-003), and leave PE-002/PE-003 account/configuration gating unchanged.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/ui/src/styles/globals.css` | Modified | Five-style tokens. |
| `packages/ui/src/ganado/estilo-switcher.tsx` | Replaced | Card selector. |
| `packages/ui/src/ganado/avatar-menu.tsx` | Modified | Desktop cards. |
| `packages/ui/src/ganado/apariencia-card.tsx` | Modified | Mobile cards. |
| `apps/web/src/routes/__root.tsx` | Modified | Anti-flash classes. |
| `apps/web/src/routes/_app/mas.tsx` | Modified | Mobile integration. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| CSS cascade regressions | High | Spec token matrix; no variants. |
| Oversized PR | High | Chain: tokens → selector → surfaces → verification. |
| Screen mismatch | Med | Use `.op` screens as references. |

## Rollback Plan

Revert the PR chain. Local-only invalid/removed style values fall back to Campo; no data migration.

## Dependencies

- `docs/ganaweb-estilos.md` and `docs/ganaweb-diseno.op` screens 16/17.
- Existing localStorage keys: `ganaweb-estilo`, `ganaweb-theme`.

## Success Criteria

- [ ] All five styles are selectable for every user on mobile and desktop.
- [ ] Campo is default and invalid stored values fall back to Campo.
- [ ] Each style combines with claro/oscuro without changing the other key.
- [ ] Selector cards visually match screens 16/17 at PRD level.
- [ ] GitHub issue exists before implementation; PRs use forced chaining under the 800-line budget.
