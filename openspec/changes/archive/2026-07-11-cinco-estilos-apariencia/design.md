# Design: Five-Style Appearance Rollout

## Technical Approach

Replace the binary `theme-b` model with a catalog-driven style axis: `campo`, `moderna`, `indigo`, `cielo`, `grafito`. CSS remains the only visual branching layer: components set/read `ganaweb-estilo`, apply one style class to `<html>`, and consume existing Tailwind v4 `@theme inline` semantic tokens. Claro/oscuro stays a separate `dark` class and `ganaweb-theme` key.

## Architecture Decisions

| Option | Tradeoff | Decision |
|---|---|---|
| Central `ESTILOS` catalog in `packages/ui/src/ganado/estilo-switcher.tsx` | Keeps selector self-contained; future reuse may justify extracting later | Use catalog now with id, label, description, className, preview colors |
| Style classes: Campo = no class, others = `theme-{id}` plus legacy `theme-b` cleanup | Supports rollback/backward compatibility without carrying binary semantics | Use `theme-moderna`, `theme-indigo`, `theme-cielo`, `theme-grafito`; remove stale style classes before applying one |
| CSS token cascade only | Larger `globals.css`, but no component variants or `dark:`/`theme-*:` JSX leaks | Add per-style light/dark token blocks in cascade order after Campo baseline |
| Shared selector component in UI package | Avoids divergent mobile/desktop behavior | Replace pill `EstiloSwitcher` with visual radio cards and reuse in `AparienciaCard` and `AvatarMenu` |

## Data Flow

```
localStorage(ganaweb-estilo) ──→ anti-flash IIFE ──→ <html class="theme-* dark?">
          │                              │
          └──── EstiloSwitcher hydrate/read/apply/persist ──→ CSS tokens
localStorage(ganaweb-theme)  ──→ Theme/Modo buttons ─────────→ dark class only
```

Invalid/missing `ganaweb-estilo`, legacy `theme-b`, or binary-era values fall back to Campo unless value is `moderna`; `moderna` maps to `theme-moderna`. Style writes never touch `ganaweb-theme`; mode writes never touch `ganaweb-estilo`.

## File Changes

| File | Action | Description |
|---|---|---|
| `packages/ui/src/styles/globals.css` | Modify | Add five-style token blocks and replace `.theme-b` selectors with scalable `.theme-moderna` family selectors while preserving token names. |
| `packages/ui/src/ganado/estilo-switcher.tsx` | Modify | Convert segmented two-pill control into five visual radio cards with preview dots, roving keyboard, Home/End, visible focus, and 44px targets. |
| `packages/ui/src/ganado/apariencia-card.tsx` | Modify | Render selector as full card grid and update Spanish style hints. |
| `packages/ui/src/ganado/avatar-menu.tsx` | Modify | Expand dropdown width/section layout to host the same card selector. |
| `apps/web/src/routes/__root.tsx` | Modify | Update raw anti-flash script to validate style ids and apply selected style class plus `dark` before first paint. |
| `packages/ui/tests/*.test.*` | Modify | Update token, anti-flash, selector, and appearance surface tests for 5 styles/10 combinations. |

## Interfaces / Contracts

```ts
type EstiloId = "campo" | "moderna" | "indigo" | "cielo" | "grafito"
const ESTILO_STORAGE_KEY = "ganaweb-estilo"
const THEME_STORAGE_KEY = "ganaweb-theme"
```

`EstiloSwitcher` keeps `size?: "md" | "sm"`, `className?: string`, exposes `role="radiogroup"`/`role="radio"`, Spanish labels Campo, Moderna, Índigo, Cielo, Grafito, and `aria-checked` selected state.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Catalog fallback, class cleanup, localStorage independence, keyboard selection | Vitest/jsdom updates in `estilo-switcher.test.tsx` and `anti-flash.test.ts` |
| Structural | Tokens for all 10 combinations; no `dark:` or `theme-*:` variants | Extend `tokens.test.ts` regex/cascade assertions |
| Integration | `/mas`, `AvatarMenu`, `AparienciaCard` render five cards | React Testing Library surface tests |
| Visual/manual | OpenPencil screens 16/17 parity | Compare mobile Apariencia and desktop Avatar menu across five styles in claro/oscuro |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary changes. `/mas` already exists; this only changes rendered appearance content.

## Migration / Rollout

No data migration required. On read: `moderna` and legacy `theme-b` map to Moderna; unknown values become Campo. Rollback is safe: reverting the chain leaves `ganaweb-estilo` local-only; old binary code will ignore non-`moderna` values and render Campo.

## PR Slicing Recommendation

Force chained PRs under the 800-line review budget: (1) token/class compatibility + tests, (2) selector catalog/card component + tests, (3) mobile/desktop surfaces + anti-flash + tests, (4) visual verification/docs polish if needed.

## Open Questions

- [ ] None.
