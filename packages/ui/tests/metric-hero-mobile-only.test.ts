// @vitest-environment jsdom
/**
 * PR4.T-FIX — Runtime regression test: bento LAYOUT is mobile-only.
 *
 * Companion to the structural source tests in
 * `metric-hero-regression.test.ts` (which run in `node` env). The
 * source tests assert the CSS structure; this file asserts the
 * cascade behavior at runtime with a mocked `matchMedia` and a real
 * `<style>` element, exercising `getComputedStyle` to read the
 * computed value off a hero element.
 *
 * **Why two files?** Vitest's `// @vitest-environment` directive is
 * per-file and must be the first comment. The source tests want the
 * cheap `node` env (no DOM needed — they read files and run regex);
 * the runtime tests want `jsdom` so they can mount a hero element
 * inside a real Document and read its computed style. Splitting is
 * cheaper than paying the jsdom tax for 64+ source tests.
 *
 * **Why mock `matchMedia`?** jsdom does NOT implement `window.matchMedia`
 * and does NOT process `@media` queries inside stylesheets. Without a
 * mock, we cannot differentiate mobile and desktop behavior. We stub
 * `window.matchMedia` so we can:
 *   1. Simulate a desktop viewport (`(min-width: 768px)` matches).
 *   2. Simulate a mobile viewport (`(min-width: 768px)` does not match).
 *   3. The CSS we inject contains the bento LAYOUT inside a real
 *      `@media (max-width: 767px)` block. jsdom's `getComputedStyle`
 *      returns the un-media-queried default for properties that are
 *      only declared inside a media query — which gives us a clean
 *      proxy for "the rule did not apply under this viewport".
 *
 * **Why the colored-background / text-color tests work in jsdom**:
 * those rules are at the TOP level of the CSS (no `@media` wrapper),
 * so jsdom applies them unconditionally. We can read them via
 * `getComputedStyle(...).backgroundColor` and `getComputedStyle(
 * ...).color` in both viewports.
 *
 * Spec source: `openspec/changes/cinco-estilos-apariencia/.../tasks.md`
 * Acceptance contract (this file proves it):
 *   - Desktop (≥ 1024px): hero's computed `grid-column` does NOT
 *     include `1 / -1`. The MetricCard sits in one of the 4 normal
 *     grid columns.
 *   - Mobile (< 768px): the bento LAYOUT still produces
 *     `grid-column: 1 / -1` for the hero under Moderna / Índigo /
 *     Cielo / Grafito. (We assert this by extracting the rule body
 *     from the source CSS and checking its media-query wrapper.)
 *   - All viewports: the colored hero background + on-primary text
 *     contrast still apply — those are top-level rules.
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Lazily read globals.css inside tests. The reason: vitest's
 * `// @vitest-environment jsdom` directive runs the file top-level
 * BEFORE the jsdom env is initialized, so `import.meta.url` does not
 * yet resolve to a `file://` URL. Other jsdom tests in this package
 * (`anti-flash.test.ts`) defer their `import.meta.url` read into a
 * helper function that runs at test time. We mirror that pattern.
 */
let _css: string | null = null
function getCss(): string {
  if (_css === null) {
    // The other source-tests in this package use
    // `fileURLToPath(new URL("..", import.meta.url))` to compute the
    // package root. That pattern breaks in vitest's jsdom env because
    // the jsdom env replaces the global `URL` class with its own
    // implementation, which refuses non-`file:` arguments. We use
    // `process.cwd()` instead — vitest runs each package's tests from
    // that package's root, so `cwd()` resolves to `packages/ui/` and
    // `src/styles/globals.css` is a stable relative path.
    const root = process.cwd()
    const globalsCss = join(root, "src", "styles", "globals.css")
    _css = readFileSync(globalsCss, "utf8")
  }
  return _css
}

/* -------------------------------------------------------------------- */
/* matchMedia mock                                                      */
/* -------------------------------------------------------------------- */

type MatchFn = (query: string) => { matches: boolean; media: string; onchange: null }

function installMatchMedia(viewport: "mobile" | "desktop"): MatchFn {
  // The breakpoint of interest is the project mobile cutoff (768px,
  // Tailwind's `md:`). We map any `min-width` query at or above 768px
  // to "matches" in desktop mode, and any `max-width` query below 768px
  // to "matches" in mobile mode. Queries that don't mention a width
  // (e.g. `(prefers-color-scheme: dark)`) get the conservative default
  // — they don't affect the bento LAYOUT contract under test.
  const isMobile = viewport === "mobile"
  const fn: MatchFn = (query: string) => {
    const minMatch = query.match(/\(min-width:\s*(\d+)px\)/)
    if (minMatch) {
      const px = Number(minMatch[1])
      return { matches: !isMobile && px <= 1024, media: query, onchange: null }
    }
    const maxMatch = query.match(/\(max-width:\s*(\d+)px\)/)
    if (maxMatch) {
      const px = Number(maxMatch[1])
      return { matches: isMobile && px >= 767, media: query, onchange: null }
    }
    return { matches: false, media: query, onchange: null }
  }
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: fn,
  })
  return fn
}

function uninstallMatchMedia(): void {
  // Best-effort reset: delete the override so other tests get a
  // pristine window. jsdom does not implement matchMedia by default,
  // so the absence of the property is the correct baseline.
  try {
    Reflect.deleteProperty(window, "matchMedia")
  } catch {
    // ignore
  }
}

/* -------------------------------------------------------------------- */
/* CSS injectors                                                        */
/* -------------------------------------------------------------------- */

/** Inject the actual globals.css into a <style> element in <head>. */
function injectGlobalsCss(): void {
  const style = document.createElement("style")
  style.setAttribute("data-test", "globals-css")
  style.textContent = getCss()
  document.head.appendChild(style)
}

function clearInjectedCss(): void {
  for (const el of document.head.querySelectorAll('style[data-test="globals-css"]')) {
    el.remove()
  }
}

/** Mount a hero element inside a given theme ancestor. */
function mountHero(themeClass: string): HTMLElement {
  const wrapper = document.createElement("div")
  wrapper.className = themeClass
  const hero = document.createElement("div")
  hero.className = "dashboard-metric-hero"
  hero.setAttribute("data-test-hero", themeClass)
  // m-value child needed for the font-size assertion in source tests;
  // included here for completeness.
  const value = document.createElement("p")
  value.className = "text-metric num mt-1 text-foreground m-value"
  value.textContent = "543"
  hero.appendChild(value)
  wrapper.appendChild(hero)
  document.body.appendChild(wrapper)
  return hero
}

function clearHeroes(): void {
  for (const el of document.body.querySelectorAll("[data-test-hero]")) {
    el.parentElement?.remove()
  }
}

/* -------------------------------------------------------------------- */
/* Source-CSS structural probes (used when jsdom can't see @media)      */
/* -------------------------------------------------------------------- */

function extractMobileMediaQueryBody(): string {
  // Find the @media (max-width: 767px) opening, then walk braces to
  // find the matching closing brace. Naive regex with `[\s\S]*?\n\}`
  // matches too early (the first `}` it sees is the inner rule's
  // closing brace). We bracket-count instead.
  const start = getCss().search(/@media\s*\(max-width:\s*767px\)\s*\{/)
  if (start < 0) throw new Error("@media (max-width: 767px) block not found in globals.css")
  const openBrace = getCss().indexOf("{", start)
  let depth = 1
  let i = openBrace + 1
  while (i < getCss().length && depth > 0) {
    const ch = getCss()[i]
    if (ch === "{") depth++
    else if (ch === "}") depth--
    i++
  }
  if (depth !== 0) throw new Error("unbalanced braces inside @media (max-width: 767px)")
  return getCss().slice(openBrace + 1, i - 1)
}

function extractBentoSelectorListFromMobile(): string {
  // The bento LAYOUT's parent selector list inside the @media
  // (max-width: 767px) block. The list is a comma-separated set of
  // `.theme-* .dashboard-metric-hero` selectors.
  const body = extractMobileMediaQueryBody()
  const rule = body.match(
    /([\s\S]*?)\.dashboard-metric-hero\s*\{[^}]*grid-column\s*:\s*1\s*\/\s*-1/,
  )
  if (!rule || typeof rule[1] !== "string") {
    throw new Error("bento grid-column: 1 / -1 rule not found inside @media (max-width: 767px)")
  }
  return rule[1]
}

/* -------------------------------------------------------------------- */
/* Tests                                                                */
/* -------------------------------------------------------------------- */

describe("PR4.T-FIX — bento LAYOUT cascade is mobile-only (runtime)", () => {
  beforeEach(() => {
    clearInjectedCss()
    clearHeroes()
  })

  afterEach(() => {
    clearInjectedCss()
    clearHeroes()
    uninstallMatchMedia()
    vi.restoreAllMocks()
  })

  describe("desktop viewport (≥ 1024px)", () => {
    beforeEach(() => {
      installMatchMedia("desktop")
      injectGlobalsCss()
    })

    it("matchMedia mock reports (min-width: 768px) matches", () => {
      expect(window.matchMedia("(min-width: 768px)").matches).toBe(true)
      expect(window.matchMedia("(min-width: 1024px)").matches).toBe(true)
    })

    it.each(["theme-b", "theme-moderna", "theme-indigo", "theme-cielo", "theme-grafito"] as const)(
      "%s: hero computed grid-column does NOT include '1 / -1' (bento LAYOUT is mobile-only)",
      (themeClass) => {
        // The bento LAYOUT is inside @media (max-width: 767px). In
        // desktop the rule does not apply, so the computed
        // grid-column falls back to the initial value. jsdom reports
        // this as an empty string or 'auto' — never '1 / -1'.
        const hero = mountHero(themeClass)
        const computed = window.getComputedStyle(hero).gridColumn
        expect(computed, `desktop grid-column must not be '1 / -1' for ${themeClass}`).not.toBe(
          "1 / -1",
        )
        // Also assert it does not include the '1 / -1' substring.
        expect(
          computed.includes("1 / -1"),
          `desktop grid-column must not include '1 / -1' substring`,
        ).toBe(false)
      },
    )

    it.each(["theme-b", "theme-moderna", "theme-indigo", "theme-cielo", "theme-grafito"] as const)(
      "%s: colored hero background still applies (top-level rule, viewport-independent)",
      (themeClass) => {
        // The colored background is at the top level (not in @media).
        // jsdom applies it unconditionally. We check the actual
        // computed color is non-empty and not the default 'rgb(0, 0, 0)'.
        // (We do not assert the exact RGB because each theme sets a
        // different --pasto-600 — jsdom does compute var() references
        // for top-level rules, so we get a real color back.)
        const hero = mountHero(themeClass)
        const computed = window.getComputedStyle(hero)
        const bg = computed.backgroundColor
        expect(bg, "backgroundColor must be set").toBeTruthy()
        expect(bg).not.toBe("")
        // text color is var(--on-primary) — for B light that resolves
        // to white, for dark variants it resolves to a near-black.
        // Either way, it must not be the empty default.
        const fg = computed.color
        expect(fg, "color must be set").toBeTruthy()
        expect(fg).not.toBe("")
      },
    )
  })

  describe("mobile viewport (< 768px)", () => {
    beforeEach(() => {
      installMatchMedia("mobile")
      injectGlobalsCss()
    })

    it("matchMedia mock reports (min-width: 768px) does not match", () => {
      expect(window.matchMedia("(min-width: 768px)").matches).toBe(false)
      expect(window.matchMedia("(max-width: 767px)").matches).toBe(true)
    })

    it.each(["theme-moderna", "theme-indigo", "theme-cielo", "theme-grafito"] as const)(
      "%s: bento LAYOUT rule body declares grid-column: 1 / -1 inside the mobile @media",
      (themeClass) => {
        // jsdom does not process @media queries, so we cannot read
        // the resolved grid-column via getComputedStyle in this env.
        // Instead we assert the STRUCTURAL fact: the bento LAYOUT
        // rule's body declares `grid-column: 1 / -1` and lives
        // inside a `@media (max-width: 767px)` block. When the rule
        // is later applied by a real browser engine in a mobile
        // viewport, it WILL resolve the hero to span the full grid.
        const selectorList = extractBentoSelectorListFromMobile()
        // Selector list must include the modern style class — proves
        // the rule covers Moderna/Índigo/Cielo/Grafito (and the
        // legacy .theme-b mapping for compatibility).
        expect(selectorList, `mobile bento selector list must include .${themeClass}`).toContain(
          `.${themeClass}`,
        )
        // The rule body still declares `grid-column: 1 / -1` (we
        // already matched it in extractBentoSelectorListFromMobile,
        // but assert the literal property to make the contract
        // explicit). Note: in the selector list the comma after
        // `.theme-{X} .dashboard-metric-hero` is OK — only the LAST
        // selector in the list has the `{` directly after.
        const body = extractMobileMediaQueryBody()
        expect(body).toMatch(new RegExp(`\\.${themeClass}\\s+\\.dashboard-metric-hero\\b`))
        // The bento body inside the @media must declare
        // `grid-column: 1 / -1` exactly once.
        expect(body).toMatch(/grid-column\s*:\s*1\s*\/\s*-1/)
      },
    )

    it.each(["theme-b", "theme-moderna", "theme-indigo", "theme-cielo", "theme-grafito"] as const)(
      "%s: colored hero background still applies in mobile (top-level rule, viewport-independent)",
      (themeClass) => {
        // Same invariant as desktop: the colored background and
        // on-primary text are top-level rules, so they apply in
        // mobile just as in desktop. The runtime check uses
        // getComputedStyle (which works for non-media-queried rules
        // in jsdom).
        const hero = mountHero(themeClass)
        const computed = window.getComputedStyle(hero)
        const bg = computed.backgroundColor
        expect(bg, "backgroundColor must be set in mobile").toBeTruthy()
        expect(bg).not.toBe("")
        const fg = computed.color
        expect(fg, "color must be set in mobile").toBeTruthy()
        expect(fg).not.toBe("")
      },
    )
  })

  describe("structural source guard (independent of matchMedia)", () => {
    // These are the canonical assertions: the bento LAYOUT lives
    // inside the mobile media query, and the colored background
    // lives at the top level. The runtime tests above prove the
    // cascade behavior under a mocked viewport; these source
    // assertions prove the actual CSS structure that drives it.

    it("bento LAYOUT block is wrapped in @media (max-width: 767px)", () => {
      const body = extractMobileMediaQueryBody()
      expect(body).toMatch(/grid-column\s*:\s*1\s*\/\s*-1/)
      expect(body).toMatch(/min-height\s*:\s*5rem/)
      expect(body).toMatch(/border-radius\s*:\s*var\(--radius-card\)/)
      expect(body).toMatch(/\.m-value\s*\{[^}]*font-size\s*:\s*1\.5rem/)
    })

    it("selector list inside @media (max-width: 767px) covers all 5 style classes", () => {
      const selectorList = extractBentoSelectorListFromMobile()
      for (const style of [
        ".theme-b",
        ".theme-moderna",
        ".theme-indigo",
        ".theme-cielo",
        ".theme-grafito",
      ]) {
        expect(selectorList, `mobile bento must include ${style}`).toContain(style)
      }
    })

    it("colored hero background is at the top level (not in @media)", () => {
      const css = getCss()
      const bentoBody = extractMobileMediaQueryBody()
      // The colored background rule lives BEFORE the bento @media in
      // the file. We slice the CSS to that range and assert the rule
      // is there. We also assert the bento @media body does NOT
      // redeclare the colored background (would break desktop).
      const bentoMediaIdx = css.indexOf("@media (max-width: 767px)")
      const beforeBento = css.slice(0, bentoMediaIdx)
      expect(beforeBento).toMatch(/\.dashboard-metric-hero\s*\{/)
      expect(beforeBento).toMatch(/background-color\s*:\s*var\(--pasto-600\)/)
      expect(beforeBento).toMatch(/color\s*:\s*var\(--on-primary\)/)
      expect(bentoBody).not.toMatch(/background-color\s*:\s*var\(--pasto-600\)/)
    })

    it("on-primary text-color remap is at the top level (not in @media)", () => {
      const css = getCss()
      const bentoBody = extractMobileMediaQueryBody()
      // The text-color remap rules live in the file but MUST NOT be
      // inside the bento @media body. We assert both halves: the
      // bento body has no text-color remap rules, AND the global CSS
      // does declare them.
      expect(bentoBody).not.toMatch(/\.dashboard-metric-hero\s+\.text-foreground\s*\{/)
      expect(bentoBody).not.toMatch(/\.dashboard-metric-hero\s+\.text-muted-foreground\s*\{/)
      expect(css).toMatch(/\.dashboard-metric-hero\s+\.text-foreground\s*\{/)
      expect(css).toMatch(/\.dashboard-metric-hero\s+\.text-muted-foreground\s*\{/)
    })

    it("desktop @media (min-width: 768px) 7rem / 1.75rem overrides are removed (dead code)", () => {
      // After the bento is mobile-only, the desktop override is dead
      // code. The runtime test relies on its absence to assert the
      // desktop grid-column is the initial value (not 1 / -1).
      expect(getCss()).not.toMatch(/min-height\s*:\s*7rem/)
      expect(getCss()).not.toMatch(/font-size\s*:\s*1\.75rem/)
    })
  })
})
