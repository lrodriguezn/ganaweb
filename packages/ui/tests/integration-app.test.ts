import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

/**
 * PR6.T-006.4 — integration wiring guard for the shell + /mas route.
 *
 * Spec: `openspec/changes/selector-estilo-apariencia/specs/mas-mobile.md`
 *       §REQ-MM-001..005 + `specs/anti-flash-script.md` §REQ-AFS-005.
 * Design: design.md §D7 (route composition), §D9 (activoId derivation),
 *         §D14 (USUARIO_DEMO + permission gating).
 *
 * **Why a source-read test, not a render test or Playwright E2E?**
 *
 * The two files under test live in `apps/web/src/routes/_app/` — the
 * web app does NOT have a vitest harness (it uses a health-check
 * integration script) and does NOT have Playwright installed. The
 * existing structural-test pattern in `tests/dashboard-bento.test.ts`
 * (PR5) and `tests/tokens.test.ts` (PR4) is the canonical approach
 * for cross-file invariants in this repo: read the source from disk
 * and assert specific markers. It catches the exact regression the
 * spec warns about, deterministically, at lower cost than spinning up
 * a real browser or a jsdom + react-test-renderer harness.
 *
 * The anti-flash behavior (REQ-AFS-002..004) is already covered by
 * `tests/anti-flash.test.ts` (PR1). This file covers ONLY the new
 * integration invariants introduced in PR6:
 *
 *   (1) /mas route exists at the correct TanStack file path and
 *       composes the right blocks (AparienciaCard, user info,
 *       Configuración gated by `tienePermiso`, placeholders, logout).
 *   (2) `_app.tsx` derives user props from the authorized session and
 *       wires them into `AppHeader` so the desktop avatar shows up.
 *   (3) `_app.tsx` derives `activoId` from the current pathname via
 *       `useRouterState` and threads it into both `Sidebar` and
 *       `BottomNav` (D9, S2 gate review).
 *   (4) The BottomNav "Más" item already points to `/mas` (the
 *       destination this PR finally creates; closes the 404 gap
 *       that existed since PR3).
 *   (5) `_app.tsx` defines a functional `onCerrarSesion` handler that
 *       calls the real logout server function and returns to `/login`.
 *   (6) No `dark:` / `theme-b:` Tailwind variants leaked into the
 *       new files (T-004 guard — same rule tokens.test.ts enforces
 *       for the rest of `packages/ui/src/ganado/**`).
 *
 * If a future PR drops the activoId derivation, removes the user
 * props, or accidentally hard-codes `activoId="inicio"` again, every
 * relevant assertion in this file fails — which is exactly the
 * regression the spec is asking for a guard against.
 */

const APP_DIR = join(
  fileURLToPath(new URL("..", import.meta.url)),
  "..",
  "..",
  "apps",
  "web",
  "src",
  "routes",
  "_app",
)
const APP_SHELL = join(APP_DIR, "..", "_app.tsx")
const MAS_ROUTE = join(APP_DIR, "mas.tsx")

describe("PR6.T-006.4 — /mas route (REQ-MM-001..005)", () => {
  const source = readFileSync(MAS_ROUTE, "utf8")

  it("REQ-MM-001 — renders the 'Más' header and registers the file route at /_app/mas", () => {
    // The TanStack file-route declaration MUST target the `/_app/mas`
    // path so it nests under the existing _app layout (and inherits
    // AppHeader / Sidebar / BottomNav).
    expect(source).toMatch(/createFileRoute\(\s*"\/_app\/mas"\s*\)/)
    // The page MUST have an <h1> with the literal text "Más".
    expect(source).toMatch(/<h1[^>]*>\s*Más\s*<\/h1>/)
  })

  it("REQ-MM-002 — composes AparienciaCard (Estilo + Modo + APARIENCIA hints live in the card)", () => {
    // AparienciaCard is a thin wrapper: the component itself is
    // covered by tests/avatar-menu.test.tsx (PR4). At the route
    // level we just assert the card is rendered and is the @ganaweb/ui
    // public-surface component.
    expect(source).toMatch(/<AparienciaCard\s*\/>/)
    expect(source).toMatch(
      /import\s*\{[^}]*\bAparienciaCard\b[^}]*\}\s*from\s*["']@ganaweb\/ui["']/,
    )
  })

  it("REQ-MM-003 — shows the current user info (nombre + email) from the authorized session", () => {
    // The user-info card MUST read from the authorized route session and
    // surface both `nombre` and `email`. The legacy `USUARIO_DEMO` source
    // was removed when the app shell moved to real session data.
    expect(source).toMatch(/const\s+\{\s*sesion\s*\}\s*=\s*AppRoute\.useRouteContext\(\)/)
    expect(source).toMatch(/sesion\.nombre/)
    expect(source).toMatch(/sesion\.email/)
    // The two field references MUST live in JSX expressions (not be
    // shadowed by a local re-declaration).
    expect(source).toMatch(/\{sesion\.nombre\}/)
    expect(source).toMatch(/\{sesion\.email\}/)
  })

  it("REQ-MM-004 — Configuración is gated by `tienePermiso(..., 'configuracion', 'ver')`", () => {
    // The route MUST import `tienePermiso` and use it with the
    // canonical modulo/accion pair from D14 / REQ-MM-004.
    expect(source).toMatch(/import\s*\{[^}]*\btienePermiso\b[^}]*\}\s*from\s*["']@ganaweb\/ui["']/)
    expect(source).toMatch(/tienePermiso\([^)]*["']configuracion["']\s*,\s*["']ver["']\)/)
    // The conditional render MUST be a real `&&` gate, not a CSS-only
    // hide — gating happens at the JSX level so non-admins don't
    // even see the button in the DOM.
    expect(source).toMatch(/puedeConfigurar\s*&&\s*\(/)
  })

  it("REQ-MM-005 — placeholders are non-clickable and logout is functional (stub console.warn)", () => {
    // The two placeholders MUST be present, marked as placeholders
    // (Próximamente badge), and rendered as non-clickable rows.
    expect(source).toMatch(/Mi cuenta/)
    expect(source).toMatch(/Preferencias de notificación/)
    expect(source).toMatch(/Próximamente/)
    // A dedicated `PlaceholderItem` helper is the canonical way to
    // keep the non-clickable row logic DRY across the two placeholders.
    expect(source).toMatch(/function\s+PlaceholderItem\b/)
    // The placeholder must NOT expose an `onClick` handler (would
    // be clickable). We assert no onClick inside the helper.
    const placeholderBody = source.match(/function\s+PlaceholderItem[\s\S]*?\n\}/)?.[0] ?? ""
    expect(placeholderBody).not.toMatch(/onClick/)
    // Cerrar sesión: must be a `<button onClick={...}>` calling the
    // shared `onCerrarSesion` stub that lives in _app.tsx and writes
    // a `console.warn` with the documented message.
    expect(source).toMatch(/<button[^>]*onClick=\{onCerrarSesion\}/)
    // The text "Cerrar sesión" must be present in the JSX (es-CO, T-003).
    expect(source).toMatch(/Cerrar sesión/)
  })

  it("T-004 — no `dark:` or `theme-b:` Tailwind variants in /mas (matches packages/ui guard)", () => {
    // T-004: components consume var(--*) + literal marker classNames;
    // zero `dark:` or `theme-b:` utilities. Same rule tokens.test.ts
    // enforces for `packages/ui/src/ganado/**`. The new /mas route
    // is also a render target — guard it the same way.
    // Strip block comments and line comments to avoid false positives
    // (e.g. JSDoc that mentions "no dark: variants").
    const stripped = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
    expect(stripped).not.toMatch(/\bdark:/)
    expect(stripped).not.toMatch(/\btheme-b:/)
  })
})

describe("PR6.T-006.4 — _app.tsx shell wiring (D7, D9, D14)", () => {
  const source = readFileSync(APP_SHELL, "utf8")

  it("D14 — obtains the canonical user identity from the authorized session", () => {
    // The shell MUST use the real auth session as the identity source.
    // Stale demo constants must not come back because they diverge from
    // server authorization and break app-shell/user-info coherence.
    expect(source).toMatch(/getCurrentSession\(\)/)
    expect(source).toMatch(/return\s+\{\s*sesion:\s*decision\.sesion\s*\}/)
    expect(source).not.toMatch(/export\s+const\s+USUARIO_DEMO\b/)
  })

  it("D8 — passes user props (nombre/email/iniciales + onCerrarSesion) to AppHeader", () => {
    // The AppHeader MUST receive all four user props so the desktop
    // avatar menu renders (AppHeader switches to AvatarMenu when
    // `nombreUsuario && onCerrarSesion` are both present, per PR4
    // design §D8).
    expect(source).toMatch(/<AppHeader[\s\S]*?\/>/)
    const appHeaderBlock = source.match(/<AppHeader[\s\S]*?\/>/)?.[0] ?? ""
    expect(appHeaderBlock).toMatch(/nombreUsuario=\{sesion\.nombre\}/)
    expect(appHeaderBlock).toMatch(/emailUsuario=\{sesion\.email\}/)
    expect(appHeaderBlock).toMatch(/inicialesUsuario=\{initials\(sesion\.nombre\)\}/)
    expect(appHeaderBlock).toMatch(/onCerrarSesion=\{onCerrarSesion\}/)
  })

  it("D14 + PD-8 — `onCerrarSesion` calls the real logout action and returns to login", () => {
    // Logout is no longer a demo stub. The handler must call the server
    // function and then send the browser back to /login.
    expect(source).toMatch(
      /const\s+onCerrarSesion\s*=\s*async\s*\(\s*\)\s*=>\s*\{[\s\S]*?await\s+logoutAction\(\)/,
    )
    expect(source).toMatch(/window\.location\.assign\(\s*["']\/login["']\s*\)/)
    expect(source).not.toMatch(/\[auth\] logout no implementado/)
  })

  it("D9 + S2 — `activoId` is derived from the current route via `useRouterState`", () => {
    // The shell MUST subscribe to the router state and project the
    // pathname (`select: (s) => s.location.pathname`). This is the
    // canonical TanStack Router pattern; S2 explicitly flagged the
    // need to derive instead of hard-coding.
    expect(source).toMatch(
      /useRouterState\(\s*\{\s*select:\s*\(s\)\s*=>\s*s\.location\.pathname\s*\}\s*\)/,
    )
    // The derived value MUST be passed to BOTH `Sidebar` and
    // `BottomNav` (S2: same active id in desktop and mobile).
    expect(source).toMatch(/<Sidebar[\s\S]*?activoId=\{activoId\}/)
    expect(source).toMatch(/<BottomNav[\s\S]*?activoId=\{activoId\}/)
    // Defensive: the previous `activoId="inicio"` hard-coded value
    // MUST NOT be present in the shell anymore (any of the two
    // consumers). A refactor that reverts the derivation would
    // show up here.
    expect(source).not.toMatch(/activoId="inicio"/)
  })

  it("D9 — the activoId derivation handles the documented pathname → id mappings", () => {
    // The shell MUST contain a `deriveActivoId` helper (or inline
    // equivalent) that maps:
    //   "/"           → "inicio"
    //   "/<segment>"  → "<segment>"
    // The exact branch on "/" is the load-bearing case (it maps the
    // root URL to the "inicio" item id, NOT the empty string).
    expect(source).toMatch(/function\s+deriveActivoId\b/)
    // The "/" branch is required — if the if-statement is removed
    // and replaced with `pathname.split("/")[1] ?? "inicio"`, the
    // first segment of "/" is "" which would fall through to the
    // `|| "inicio"` fallback. We allow either pattern (early-return
    // OR split-fallback), but at least ONE of the two MUST exist:
    //   - explicit `pathname === "/"` check, OR
    //   - the segment-OR-fallback that yields "inicio" for "/".
    const hasExplicitRootBranch = source.match(/if\s*\(\s*pathname\s*===\s*["']\/["']/)
    const hasSplitFallback = source.match(
      /pathname\.split\(["']\/["']\)\s*\[\s*1\s*\]\s*\?\?\s*["'][\s\S]*?inicio["']/,
    )
    expect(hasExplicitRootBranch ?? hasSplitFallback).not.toBeNull()
  })

  it("D7 — BottomNav 'Más' item points to /mas (the destination this PR creates)", () => {
    // The BottomNav item list MUST include a "Más" item whose href
    // is "/mas". This is what closes the 404 gap that existed
    // since PR3 (when the BottomNav was first wired with a "Más"
    // slot but the route file didn't exist yet).
    expect(source).toMatch(
      /\{\s*id:\s*["']mas["']\s*,\s*label:\s*["']Más["']\s*,\s*icon:\s*\w+\s*,\s*href:\s*["']\/mas["']\s*\}/,
    )
  })

  it("T-004 — no `dark:` or `theme-b:` Tailwind variants in _app.tsx", () => {
    // Same rule as for /mas. The shell uses Tailwind utilities
    // for layout (grid, flex, padding) but MUST NOT switch theme
    // per-component — that lives on <html>.
    const stripped = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
    expect(stripped).not.toMatch(/\bdark:/)
    expect(stripped).not.toMatch(/\btheme-b:/)
  })
})
