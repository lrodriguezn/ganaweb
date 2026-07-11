# Tasks: Selector de Estilo y Apariencia (Campo / Moderna)

> OpenSpec · feature-branch-chain · 800-line review budget · 6 PRs
> Tracker branch: `feature/selector-estilo-apariencia` (no-merge until all 6 children land)

## Review Workload Forecast (aggregate)

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: Low (every PR slice stays under 800 lines; the 400-line guard is comfortably met for human review slices of ~50-450 lines)

| PR | Capability | Base branch | ~Lines | 400-line risk | 800-line risk |
|----|-----------|-------------|--------|---------------|---------------|
| 1 | theming-runtime (CSS tokens + anti-flash) | `feature/selector-estilo-apariencia` | ~300 | Low | Low |
| 2 | estilo-switcher | `pr/01-theming-runtime` | ~180 | Low | Low |
| 3 | style-b-visuals (a) — glass, badges, FAB gradient | `pr/02-estilo-switcher` | ~140 | Low | Low |
| 4 | appearance-controls (AvatarMenu + AparienciaCard) | `pr/03-style-b-visuals-a` | ~430 | Medium | Low |
| 5 | style-b-visuals (b) — bento dashboard | `pr/04-appearance-controls` | ~70 | Low | Low |
| 6 | web/more-menu (integration + wiring) | `pr/05-style-b-visuals-b` | ~280 | Low | Low |

### Resolved Open Questions (from design)

- **Hero metric** = first entry of `MOCK_METRICS` ("Activos") — confirmed in PR5 (REQ-BVA-004 bento layout). Swap to "Leche hoy" later if lechería fixtures land.
- **Logout handler** = stub `() => console.warn("[auth] logout no implementado")` — confirmed in PR4 (mirrors `onSync` demo pattern). Real server function lands in a future change.

### Gate Review Suggestions (addressed in tasks)

- **S2** — `activoId` derivation in `_app.tsx`: PR6 T-006.2 uses TanStack Router `useRouterState({ select: (s) => s.location.pathname })` to derive the active BottomNav item.
- **S3** — `--brand-panel` in `.theme-b`/`.theme-b.dark`: PR1 T-001.1 explicitly lists `--brand-panel` among overridden semantic tokens; PR1 T-001.4 verification step reads back the cascade with `getComputedStyle` to confirm B dark wins.
- **S1/S4** — convention/awareness only, no task action.

---

## Phase 1 — PR #1 (theming-runtime foundation)

D1, D2, D3, D13; REQ-CSB-001..007, REQ-AFS-001..005.

- [x] T-001.1 — Add `.theme-b` and `.theme-b.dark` blocks to `packages/ui/src/styles/globals.css` after `.dark`, overriding the full semantic palette (incl. `--brand-panel`) plus the 4 domain colors. Re-mirror in `@theme inline`.
- [x] T-001.2 — Declare B-only vars (`--card-shadow`, `--hero-shadow`, `--float-shadow`, `--primary-gradient`, `--glass-bg`, `--glass-border`, `--radius*`) in `:root`/`.dark` (default `none`/`transparent`/A values) and `.theme-b`/`.theme-b.dark` (real B values per exploration §Token Mapping).
- [x] T-001.3 — Add `.bg-primary-gradient`, `.glass-shell` (with `@supports` fallback), `.dashboard-metric-hero`, and `.estado-badge`/`.estado-dot` display rules. Register B-only vars in `@theme inline`.
- [x] T-001.4 — **Verify (RED→GREEN→REFACTOR)**: extend `packages/ui/tests/tokens.test.ts` with cascade-precedence test (parse CSS, assert `.theme-b.dark --color-background = #09090B`), `--brand-panel` override test, and T-004 guard extended to also flag `theme-b:` in `packages/ui/src/ganado/**`.
- [x] T-001.5 — Insert anti-flash IIFE `<script>` in `apps/web/src/routes/__root.tsx` `<head>` **before** `<HeadContent />`; reads both keys in `try/catch`, adds `theme-b` if `ganaweb-estilo==="moderna"`, adds `dark` if `ganaweb-theme==="dark"`.
- [x] T-001.6 — **Verify**: Vitest with jsdom mounts a `<html>` element, runs the script body, asserts class additions for B-dark, A-light, first-visit, and `localStorage` throwing scenarios (REQ-AFS-002..004).

**Work-unit commits**: (a) CSS tokens + @theme inline; (b) utility classes (.bg-primary-gradient, .glass-shell, dashboard-metric-hero, estado-dot); (c) anti-flash script in __root; (d) tests. Each commit leaves the repo buildable. **Rollback**: revert CSS additions; components keep working (tokens fall back to A). Verification: `pnpm turbo build` green, `pnpm turbo test` green.

---

## Phase 2 — PR #2 (EstiloSwitcher)

D4; REQ-ES-001..006, REQ-TTC-001, REQ-TTC-002 (TTC partly — ThemeToggle already in sync).

- [x] T-002.1 — Create `packages/ui/src/ganado/estilo-switcher.tsx` with `EstiloSwitcherProps { size?: "md" | "sm"; className?: string }`. `useState` initialized from `document.documentElement.classList.contains("theme-b")`; `useEffect` toggles class + writes `ganaweb-estilo` in `try/catch`. Two pills `role="radio"` inside `role="radiogroup" aria-label="Estilo visual"`.
- [x] T-002.2 — Roving arrow-key navigation (Left/Right move + select; Home/End jumps). Visible focus ring via `focus-visible:ring-2 focus-visible:ring-ring`. Labels "Campo" / "Moderna" (T-003).
- [x] T-002.3 — Add export in `packages/ui/src/index.ts` (`EstiloSwitcher`).
- [x] T-002.4 — **Verify (TDD)**: RED — write Vitest asserting (i) default Campo, no `theme-b`; (ii) click Moderna adds class + persists `ganaweb-estilo=moderna`; (iii) `dark` class untouched across toggle (PD-6, REQ-ES-004); (iv) arrow keys rove. GREEN — make pass.

**Work-unit commit**: single `feat(ui): add EstiloSwitcher with radiogroup + arrow keys`. **Rollback**: delete file + remove barrel export.

---

## Phase 3 — PR #3 (style-b-visuals a: glass, badges, FAB gradient)

D3 (glass rule, @supports), D11 (badges withDot), D12 (gradient FAB); REQ-BVA-001, REQ-BVA-002, REQ-BVA-004, REQ-BVA-005.

- [x] T-003.1 — Modify `packages/ui/src/ganado/estado-badge.tsx`: always render `<span class="estado-dot" />`; add `.estado-badge` root class; set `data-with-dot={withDot ? "true" : "false"}`. Convenience wrappers unchanged (they pass no `withDot`).
- [x] T-003.2 — Modify `packages/ui/src/ganado/bottom-nav.tsx`: add literal `glass-shell` className to `<nav>` root and `bg-primary-gradient` to the FAB internal button.
- [x] T-003.3 — Modify `packages/ui/src/ganado/fab.tsx`: append `bg-primary-gradient` to className.
- [x] T-003.4 — **Verify (TDD)**: RED — Vitest asserts (i) `EstadoBadge` always emits `.estado-dot` element; (ii) `withDot=false` keeps dot hidden in A (`display:none`), shown in B (`.theme-b` override); (iii) convenience wrappers (`CategoriaBadge` etc.) carry no `withDot` prop. GREEN — pass.

**Work-unit commit**: `feat(ui): add glass shell markers, FAB gradient, badge withDot CSS override`. **Rollback**: revert file changes; CSS still cascades to A defaults.

---

## Phase 4 — PR #4 (appearance-controls: AvatarMenu + AparienciaCard)

D5, D6, D8, D14; REQ-AM-001..007, REQ-MM-002 (parity), REQ-TTC-003, REQ-TTC-004.

- [x] T-004.1 — Add `UsuarioResumen` interface to `packages/ui/src/ganado/types.ts` (`{ nombre, email, iniciales, esAdmin }`).
- [x] T-004.2 — Create `packages/ui/src/ganado/avatar-menu.tsx` with `AvatarMenuProps { usuario: UsuarioResumen; onCerrarSesion: () => void; className? }`. Composes `DropdownMenu` (Radix): trigger = avatar circle (`User` icon fallback if `iniciales` empty) with `aria-haspopup="menu"` + `aria-expanded`; content 288px — user info header + `DropdownMenuSeparator` + APARIENCIA section (`EstiloSwitcher` row + sun/moon icon-row from `ThemeToggle`) + separator + "Mi cuenta" + "Preferencias de notificación" (`data-disabled` + "Próximamente" badge) + separator + "Cerrar sesión" (`text-peligro-600`).
- [x] T-004.3 — Sun/moon buttons: `aria-pressed` + `aria-label="Cambiar a modo claro"` / `"Cambiar a modo oscuro"` per REQ-TTC-004. Use `ThemeToggle` if it exposes a `variant="icons"` prop, otherwise inline the two icon buttons (decide in this task; default to inline to avoid coupling).
- [x] T-004.4 — Create `packages/ui/src/ganado/apariencia-card.tsx` with `AparienciaCardProps { className? }`: `<Card>`-like block (Tailwind `rounded-card bg-card border p-4 space-y-4`) — "APARIENCIA" header (10px/600/muted), Estilo row with `EstiloSwitcher size="sm"`, Modo row with sun/moon icon-buttons, two hint lines ("Campo: contraste máximo para trabajar al sol", "Moderna: estilo actualizado").
- [x] T-004.5 — Modify `packages/ui/src/ganado/app-header.tsx`: add optional props `nombreUsuario?`, `emailUsuario?`, `inicialesUsuario?`, `onCerrarSesion?` (backward compatible — absent = no avatar rendered). Replace standalone `<ThemeToggle>` in the desktop right-side container with `<AvatarMenu>` when user props present. Add literal `glass-shell` to `<header>` className.
- [x] T-004.6 — Update `packages/ui/src/index.ts`: export `AvatarMenu`, `AparienciaCard`, type `UsuarioResumen`.
- [x] T-004.7 — **Verify (TDD)**: RED — Vitest + RTL asserts (i) AvatarMenu placeholder items not clickable (PD-3); (ii) Cerrar sesión calls `onCerrarSesion`; (iii) sun/moon buttons have correct `aria-pressed` + `aria-label`; (iv) AparienciaCard renders both hint lines and APARIENCIA header; (v) AppHeader renders avatar only when user props supplied. GREEN — pass.

**Work-unit commit**: `feat(ui): add AvatarMenu + AparienciaCard with shared appearance primitives` (split into (a) types + AparienciaCard, (b) AvatarMenu, (c) AppHeader integration if the diff exceeds 250 lines). **Rollback**: delete new files; revert AppHeader.

---

## Phase 5 — PR #5 (style-b-visuals b: bento dashboard)

D10, D12 (gradient discipline on dashboard); REQ-BVA-004 (bento hero), MetricCards grid MODIFIED requirement.

- [x] T-005.1 — Modify `apps/web/src/routes/_app/index.tsx`: add `dashboard-metric-hero` className to the FIRST `MetricCard` rendered from `MOCK_METRICS` (currently "Activos"). Remove `bg-primary-gradient` from the "Registrar evento" `Button` (gradient discipline — hero already owns the gradient).
- [x] T-005.2 — **Verify (visual + unit)**: Vitest with jsdom asserts the first MetricCard has `dashboard-metric-hero`; Playwright smoke confirms `.theme-b` shows hero with `bg-primary-gradient` + `hero-shadow` and that the primary CTA renders solid `bg-primary`.

**Work-unit commit**: `feat(web): reorganize dashboard as bento under .theme-b`. **Rollback**: revert route file; CSS rules in PR1 still apply harmlessly.

---

## Phase 6 — PR #6 (integration: /mas route, _app wiring, E2E)

D7, D9, D14; REQ-MM-001, REQ-MM-003, REQ-MM-004, REQ-MM-005, REQ-BVA-001 (BottomNav glass).

- [x] T-006.1 — Create `apps/web/src/routes/_app/mas.tsx`: TanStack file route at `/_app/mas`. Renders header `"Más"` (`<h1>`), `<AparienciaCard>`, user-info card (nombre + email from `USUARIO_DEMO`), `Configuración` item gated by `tienePermiso(permisosDemo, "configuracion", "ver")` → only for `esAdmin`, placeholders for "Mi cuenta" / "Preferencias de notificación" (non-clickable, "Próximamente"), `Cerrar sesión` danger link.
- [x] T-006.2 — Modify `apps/web/src/routes/_app.tsx`: define `USUARIO_DEMO` constant (`{ nombre: "Yuli Administradora", email: "admin@ganaweb.demo", iniciales: "YA", esAdmin: true }`). Pass `nombreUsuario`/`emailUsuario`/`inicialesUsuario`/`onCerrarSesion` (stub `() => console.warn("[auth] logout no implementado")`) to `AppHeader`. Derive `activoId` from route via `useRouterState({ select: (s) => s.location.pathname })` — match `/mas` → `"mas"`, `/` → `"inicio"`, etc.; pass to both `Sidebar` and `BottomNav` (S2).
- [x] T-006.3 — Define `PERMISOS_DEMO: PermisosUsuario` with `configuracion:ver` (gates `Configuración` in /mas per REQ-MM-004). Pass to `/mas` via a co-located constant (or read from `USUARIO_DEMO.esAdmin` for the demo).
- [x] T-006.4 — **Verify (E2E + integration)**: Playwright E2E on production build (`pnpm turbo build && pnpm turbo test:e2e`): (i) hard reload with `ganaweb-estilo=moderna`+`ganaweb-theme=dark` → no flash, B-dark renders; (ii) toggle Campo↔Moderna persists across reload; (iii) toggle dark independent of estilo (PD-6); (iv) `/mas` shows Configuración for admin, hides for non-admin; (v) BottomNav "Más" highlights on `/mas`; (vi) Cerrar sesión fires stub `console.warn`.

**Work-unit commit**: split into (a) `/mas` route file; (b) `_app.tsx` user wiring + activoId; (c) Playwright spec file. **Rollback**: delete `mas.tsx`; revert `_app.tsx`. BottomNav "Más" returns to pre-existing 404 (not a regression).

---

## TDD Discipline (per `openspec/config.yaml` `apply.tdd: true`)

| Phase | RED task | GREEN task | REFACTOR task |
|-------|----------|------------|---------------|
| PR1 | T-001.4 (CSS precedence + T-004 extended) + T-001.6 (anti-flash jsdom) | T-001.1..T-001.3, T-001.5 | consolidate test helpers in `packages/ui/tests/` |
| PR2 | T-002.4 (radiogroup + arrow + persistence) | T-002.1..T-002.3 | extract `lib/localStorage.ts` helper if reused in PR4 |
| PR3 | T-003.4 (badge dot matrix) | T-003.1..T-003.3 | — |
| PR4 | T-004.7 (AvatarMenu a11y + placeholders + AparienciaCard) | T-004.1..T-004.6 | extract shared `ModoIconButtons` helper used by both surfaces |
| PR5 | T-005.2 (dashboard marker + visual) | T-005.1 | — |
| PR6 | T-006.4 (E2E + integration) | T-006.1..T-006.3 | — |

## Verification Gates (apply to every PR)

- [ ] `pnpm turbo typecheck` — green
- [ ] `pnpm turbo test` — green (Vitest unit + integration)
- [ ] `pnpm turbo build` — green
- [ ] `pnpm turbo test:e2e` — green (PR6 only; lower-fidelity for PR1-PR5)
- [ ] `pnpm exec biome ci .` — green (no `dark:` / `theme-b:` violations in `packages/ui/src/ganado/**`)

## Cross-cutting Risks (from design)

- Cascade order: if `globals.css` is reordered, themes break. PR1 adds a top-of-file comment block documenting `:root → .dark → .theme-b → .theme-b.dark`; the precedence test in T-001.4 catches regressions.
- Anti-flash after hydration: synchronous raw IIFE in `<head>` BEFORE `<HeadContent />` (T-001.5) — verified by T-001.6.
- AppHeader crowding: avatar replaces (not adds to) standalone ThemeToggle on desktop; ThemeToggle lives inside `AvatarMenu` APARIENCIA section (PR4 T-004.5).
- Component variant creep: T-004 guard extended in T-001.4 to flag `theme-b:` in components.
