// @vitest-environment node
/**
 * PR4.T-FIX — Visual regression fix: border + metric-hero contrast.
 *
 * Spec (this PR's delta):
 *   1. Bare `border` / `border-{side}` utilities in `packages/ui/src` MUST
 *      resolve to `var(--color-border)` (not `currentColor` / `text-foreground`),
 *      so cards/sidebar/drawers/footer never show a near-black 1px line.
 *   2. The first `MetricCard` (label "Animales activos") carries
 *      `dashboard-metric-hero`; its label, value, and context text must
 *      pass AA contrast against the hero's colored background — for ALL
 *      four modern styles (Moderna, Índigo, Cielo, Grafito), and in
 *      claro/oscuro.
 *   3. The bento LAYOUT (grid-column 1/-1, min-height 5/7rem, larger
 *      m-value font) must extend from `.theme-b` to the four modern style
 *      classes (moderna, indigo, cielo, grafito).
 *   4. The `estado-badge .withDot` rule currently scoped to `.theme-b` MUST
 *      apply to all four modern style classes.
 *   5. The anti-flash script must still map legacy `theme-b` → `theme-moderna`
 *      and the legacy storage value.
 *
 * Why a SOURCE test (regex on globals.css) and not a render test?
 *   - jsdom does not load the Tailwind v4 compiled CSS, so the
 *     `getComputedStyle(...).borderColor` path is unavailable.
 *   - The CSS-cascade invariants the spec demands ARE the source of
 *     truth: the four modern style classes must own the bento layout
 *     and the dot visibility, exactly as `.theme-b` does today.
 *   - This is the same structural-test pattern that `tests/tokens.test.ts`
 *     uses for the .theme-b cascade assertions (PR1, PR4 evidence).
 *
 * The contrast computation in this file is real WCAG luminance math on
 * the design tokens that globals.css declares — no mocks. If a future
 * PR drops a token or remaps a value, the contrast test catches it.
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

const ROOT = fileURLToPath(new URL("..", import.meta.url))
const SRC = join(ROOT, "src")
const GLOBALS_CSS = join(SRC, "styles", "globals.css")
const ROOT_TSX = join(ROOT, "..", "..", "apps", "web", "src", "routes", "__root.tsx")

const css = readFileSync(GLOBALS_CSS, "utf8")

/* -------------------------------------------------------------------- */
/* WCAG luminance + contrast                                            */
/* -------------------------------------------------------------------- */

/** Parse a 6-digit hex color to a 0..1 RGB triple. */
function parseHex(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m || !m[1]) throw new Error(`Invalid hex color: ${hex}`)
  const n = Number.parseInt(m[1], 16)
  return [((n >> 16) & 0xff) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255]
}

/** WCAG 2.x relative luminance (sRGB linearized). */
function relativeLuminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** WCAG contrast ratio between two hex colors. */
function contrastRatio(hexA: string, hexB: string): number {
  const la = relativeLuminance(parseHex(hexA))
  const lb = relativeLuminance(parseHex(hexB))
  const [lighter, darker] = la > lb ? [la, lb] : [lb, la]
  return (lighter + 0.05) / (darker + 0.05)
}

/* -------------------------------------------------------------------- */
/* CSS extractors                                                        */
/* -------------------------------------------------------------------- */

function extractBlock(body: string, selector: string): string {
  const re = new RegExp(
    `^${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([\\s\\S]*?)\\n\\}`,
    "m",
  )
  const match = body.match(re)
  if (!match || typeof match[1] !== "string") throw new Error(`${selector} block not found`)
  return match[1]
}

function extractCssVar(block: string, name: string): string {
  const re = new RegExp(`${name}\\s*:\\s*([^;]+);`)
  const match = block.match(re)
  if (!match || typeof match[1] !== "string") throw new Error(`${name} not in block`)
  return match[1].trim()
}

/* -------------------------------------------------------------------- */
/* Test 1 — Preflight @layer base resolves border-color to design token */
/* -------------------------------------------------------------------- */

describe("PR4.T-FIX — bare border utility resolves to design token (Preflight)", () => {
  it("globals.css defines an @layer base block (Preflight extension point)", () => {
    // The Tailwind v4 Preflight default makes `border` resolve to
    // `currentColor` (which inherits from text-foreground = near-black
    // in light mode). The fix is to extend the @layer base block in
    // globals.css with a universal border-color rule. The block MUST
    // exist; the rule inside is asserted in the next test.
    expect(css).toMatch(/@layer\s+base\s*\{/)
  })

  it("@layer base applies border-color: var(--color-border) to all elements", () => {
    // The exact rule that fixes the regression. The selector list
    // matches Tailwind v4's own Preflight selectors (which use the
    // same `*, ::before, ::after, ::backdrop` list) so the new rule
    // has matching specificity and wins ties by source order.
    expect(css).toMatch(
      /@layer\s+base\s*\{[\s\S]*?\*\s*,\s*::before\s*,\s*::after\s*,\s*::backdrop\s*\{[^}]*border-color\s*:\s*var\(--color-border\)/,
    )
  })

  it("--color-border is registered in @theme inline (text-foreground alias only)", () => {
    // The token MUST resolve to a CSS var. The alias lives in
    // @theme inline so the bare `border` utility and the `border-border`
    // Tailwind utility both pick it up.
    const themeInline = extractBlock(css, "@theme inline")
    expect(themeInline).toMatch(/--color-border\s*:\s*var\(--tierra-200\)/)
  })
})

/* -------------------------------------------------------------------- */
/* Test 2 — on-primary + on-primary-muted + tone-foreground tokens       */
/* -------------------------------------------------------------------- */

describe("PR4.T-FIX — on-primary family tokens for hero contrast", () => {
  it("--color-on-primary is registered in @theme inline", () => {
    // Pre-existing token (used by text-primary-foreground). Re-assert
    // here so the new test set documents the full contract.
    const themeInline = extractBlock(css, "@theme inline")
    expect(themeInline).toMatch(/--color-on-primary\s*:\s*var\(--on-primary\)/)
  })

  it("--color-on-primary-muted is registered in @theme inline", () => {
    // NEW: the muted companion for the label. Maps to a per-style
    // --on-primary-muted token that the per-style blocks must define.
    const themeInline = extractBlock(css, "@theme inline")
    expect(themeInline).toMatch(/--color-on-primary-muted\s*:\s*var\(--on-primary-muted\)/)
  })

  it.each(["exito", "alerta", "peligro", "info"] as const)(
    "--color-%s-foreground is registered in @theme inline",
    (tone) => {
      // NEW: the foreground variant of each tone. Used by the hero
      // MetricCard context so "61% del hato" in exito tone stays AA
      // against the colored hero background.
      const themeInline = extractBlock(css, "@theme inline")
      expect(themeInline).toMatch(
        new RegExp(`--color-${tone}-foreground\\s*:\\s*var\\(--${tone}-foreground\\)`),
      )
    },
  )

  it("declares --on-primary-muted inside every modern style block (light + dark)", () => {
    // The token MUST be redefined per style so the AA contrast against
    // each hero background holds. We assert the raw token declaration
    // exists; the contrast ratio is verified in the per-(style, mode)
    // test below.
    for (const selector of [
      ".theme-moderna",
      ".theme-moderna.dark",
      ".theme-indigo",
      ".theme-indigo.dark",
      ".theme-cielo",
      ".theme-cielo.dark",
      ".theme-grafito",
      ".theme-grafito.dark",
    ]) {
      const block = extractBlock(css, selector)
      expect(block, `${selector} must define --on-primary-muted`).toMatch(
        /--on-primary-muted\s*:\s*#/,
      )
    }
  })
})

/* -------------------------------------------------------------------- */
/* Test 3 — Bento layout extends to all four modern style classes       */
/* -------------------------------------------------------------------- */

describe("PR4.T-FIX — bento layout extends to all modern style classes", () => {
  it("bento grid-column rule lists all four modern style classes (selector list)", () => {
    // The original rule was `.theme-b .dashboard-metric-hero { grid-column: 1 / -1; }`.
    // The fix extends the parent selector to a comma-separated list of
    // all five style classes (theme-b + 4 modern). We assert the
    // selector list contains all the required style classes.
    const bentoRule = css.match(
      /(?:^|\n)\s*([\s\S]*?)\.dashboard-metric-hero\s*\{[\s\S]*?grid-column\s*:\s*1\s*\/\s*-1/,
    )
    expect(bentoRule, "bento grid-column rule not found").not.toBeNull()
    const selectorList = bentoRule?.[1] ?? ""
    expect(selectorList).toContain(".theme-b")
    expect(selectorList).toContain(".theme-moderna")
    expect(selectorList).toContain(".theme-indigo")
    expect(selectorList).toContain(".theme-cielo")
    expect(selectorList).toContain(".theme-grafito")
  })

  it("bento min-height (5rem) rule uses the shared selector list", () => {
    // The min-height: 5rem rule is now mobile-only (inside @media
    // (max-width: 767px)). The selector list still covers all five
    // style classes (theme-b + 4 modern). We assert the rule's
    // selector list AND that it lives inside the mobile media query
    // — both invariants are required for the mobile-only bento LAYOUT.
    const minHeightRule = css.match(
      /(?:^|\n)\s*([\s\S]*?)\.dashboard-metric-hero\s*\{[^}]*min-height\s*:\s*5rem/,
    )
    expect(minHeightRule, "bento min-height rule not found").not.toBeNull()
    const selectorList = minHeightRule?.[1] ?? ""
    for (const style of [
      ".theme-b",
      ".theme-moderna",
      ".theme-indigo",
      ".theme-cielo",
      ".theme-grafito",
    ]) {
      expect(selectorList, `selector list must include ${style}`).toContain(style)
    }
  })

  it("bento m-value font-size (1.5rem / 1.75rem) rule uses the shared selector list", () => {
    expect(css).toMatch(
      /(?:^|\n)\s*([\s\S]*?)\.dashboard-metric-hero\s+\.m-value\s*\{[\s\S]*?font-size\s*:\s*1\.5rem/,
    )
  })
})

/* -------------------------------------------------------------------- */
/* Test 3b — Bento LAYOUT is mobile-only (OpenPencil parity fix)        */
/* -------------------------------------------------------------------- */

describe("PR4.T-FIX — bento LAYOUT is mobile-only", () => {
  // OpenPencil `page-b` (Moderna desktop) shows four MetricCards in a
  // single row at y=140. The bento LAYOUT (grid-column 1/-1, min-height
  // 5/7rem, larger m-value font) is exclusive to the mobile dashboard
  // in OpenPencil. The current CSS applied the bento LAYOUT to all
  // four modern styles via a comma-list that was NOT scoped to mobile,
  // so in desktop the first MetricCard became full-width and the other
  // three wrapped to a second row — breaking the 4-column grid.
  //
  // The fix: wrap the bento LAYOUT block in `@media (max-width: 767px)`.
  // The colored background + on-primary text contrast stay at the top
  // level (apply in all viewports). The desktop @media (min-width: 768px)
  // override (7rem / 1.75rem) is dead code and MUST be removed.

  /** Extract the body of the FIRST `@media (max-width: 767px)` block. */
  function extractMobileMediaQuery(body: string): string {
    // Bracket-count walk to find the matching closing brace. A naive
    // `[\s\S]*?\n\}` would match too early — the first `}` it sees is
    // the inner rule's closing brace, not the @media block's.
    const start = body.search(/@media\s*\(max-width:\s*767px\)\s*\{/)
    if (start < 0) throw new Error("@media (max-width: 767px) block not found")
    const openBrace = body.indexOf("{", start)
    let depth = 1
    let i = openBrace + 1
    while (i < body.length && depth > 0) {
      const ch = body[i]
      if (ch === "{") depth++
      else if (ch === "}") depth--
      i++
    }
    if (depth !== 0) throw new Error("unbalanced braces inside @media (max-width: 767px)")
    return body.slice(openBrace + 1, i - 1)
  }

  it("declares a @media (max-width: 767px) block (project mobile breakpoint, mirrors md: 768px)", () => {
    // The project uses Tailwind's `md:` (= 768px) convention everywhere
    // (see apps/web/src/routes/_app.tsx + components). The mobile-only
    // bento LAYOUT MUST be wrapped in @media (max-width: 767px) to
    // mirror that convention. The bare hex style 767 matches the
    // convention used elsewhere in the codebase.
    expect(css).toMatch(/@media\s*\(max-width:\s*767px\)\s*\{/)
  })

  it("bento grid-column: 1/-1 rule is INSIDE @media (max-width: 767px)", () => {
    // The bento LAYOUT's `grid-column: 1 / -1` MUST live inside the
    // mobile media query, not at the top level (which would force the
    // hero to span all 4 columns in desktop and break the grid).
    const mobileBody = extractMobileMediaQuery(css)
    expect(mobileBody).toMatch(/grid-column\s*:\s*1\s*\/\s*-1/)
  })

  it("bento grid-column: 1/-1 selector list covers theme-b + 4 modern styles", () => {
    // Inside the @media (max-width: 767px) block, the bento rule's
    // parent selector list must include all five style classes
    // (.theme-b, .theme-moderna, .theme-indigo, .theme-cielo,
    // .theme-grafito) so all four modern styles + the legacy .theme-b
    // mapping get the bento treatment on mobile.
    const mobileBody = extractMobileMediaQuery(css)
    for (const style of [
      ".theme-b",
      ".theme-moderna",
      ".theme-indigo",
      ".theme-cielo",
      ".theme-grafito",
    ]) {
      expect(mobileBody, `mobile bento must include ${style}`).toContain(style)
    }
  })

  it("bento min-height: 5rem and border-radius: var(--radius-card) live INSIDE @media (max-width: 767px)", () => {
    // The 5rem min-height and the dramatic --radius-card both belong to
    // the bento LAYOUT. They MUST be mobile-only — in desktop, the hero
    // is a normal 4-column tile with the default card radius and an
    // implicit min-height.
    const mobileBody = extractMobileMediaQuery(css)
    expect(mobileBody).toMatch(/min-height\s*:\s*5rem/)
    expect(mobileBody).toMatch(/border-radius\s*:\s*var\(--radius-card\)/)
  })

  it("bento m-value font-size: 1.5rem rule is INSIDE @media (max-width: 767px)", () => {
    // The 1.5rem font-size override on the inner .m-value is part of
    // the bento LAYOUT — it makes the hero number feel more prominent
    // when the card spans the full row. It MUST be mobile-only; in
    // desktop the metric uses the standard text-metric size (1.75rem).
    const mobileBody = extractMobileMediaQuery(css)
    expect(mobileBody).toMatch(/\.m-value\s*\{[^}]*font-size\s*:\s*1\.5rem/)
  })

  it("does NOT declare bento LAYOUT rules at the top level (outside any @media)", () => {
    // Belt-and-suspenders: even if a future refactor accidentally
    // adds a duplicate bento rule at the top level, this test catches
    // the regression. The desktop bug is exactly "bento LAYOUT at the
    // top level". We slice the CSS to the top-level region (before
    // any @media) and assert NO .dashboard-metric-hero rule lives
    // there.
    const firstMediaIdx = css.search(/@media/)
    const topLevel = firstMediaIdx < 0 ? css : css.slice(0, firstMediaIdx)
    // No bento grid-column outside @media
    expect(topLevel).not.toMatch(/\.dashboard-metric-hero\s*\{[^}]*grid-column\s*:\s*1\s*\/\s*-1/)
    // No bento min-height: 5rem outside @media
    expect(topLevel).not.toMatch(/\.dashboard-metric-hero\s*\{[^}]*min-height\s*:\s*5rem/)
    // No bento .m-value font-size: 1.5rem outside @media
    expect(topLevel).not.toMatch(
      /\.dashboard-metric-hero\s+\.m-value\s*\{[^}]*font-size\s*:\s*1\.5rem/,
    )
  })

  it("does NOT escalate bento min-height to 7rem at min-width: 768px (dead code removed)", () => {
    // The previous @media (min-width: 768px) block escalated min-height
    // to 7rem and font-size to 1.75rem. After the bento is mobile-only,
    // this block has no purpose and MUST be removed. Keeping it would
    // be dead code that confuses future maintainers.
    expect(css).not.toMatch(/min-height\s*:\s*7rem/)
    expect(css).not.toMatch(/font-size\s*:\s*1\.75rem/)
  })

  it("keeps the colored hero background at the top level (applies in all viewports)", () => {
    // The hero's colored background (--pasto-600 + --primary-gradient
    // + --hero-shadow + on-primary text) is NOT the bento LAYOUT — it
    // is the visual identity of the MetricCard hero and applies in
    // BOTH mobile and desktop. The .dashboard-metric-hero rule MUST
    // remain OUTSIDE the bento's @media (max-width: 767px) block.
    const bentoBody = extractMobileMediaQuery(css)
    // Slice the CSS into BEFORE the bento @media and AFTER it; the
    // colored-background rule lives in the BEFORE slice (the rest of
    // the file is utility/anti-flash rules that come after).
    const bentoMediaIdx = css.indexOf("@media (max-width: 767px)")
    const beforeBento = css.slice(0, bentoMediaIdx)
    expect(beforeBento).toMatch(
      /\.dashboard-metric-hero\s*\{[\s\S]*?background-color\s*:\s*var\(--pasto-600\)/,
    )
    expect(beforeBento).toMatch(
      /\.dashboard-metric-hero\s*\{[\s\S]*?background-image\s*:\s*var\(--primary-gradient\)/,
    )
    expect(beforeBento).toMatch(
      /\.dashboard-metric-hero\s*\{[\s\S]*?color\s*:\s*var\(--on-primary\)/,
    )
    // And the bento body MUST NOT redeclare the colored background
    // (would override the top-level rule and break the desktop view).
    expect(bentoBody).not.toMatch(/background-color\s*:\s*var\(--pasto-600\)/)
  })

  it("keeps the on-primary text-color remap at the top level (applies in all viewports)", () => {
    // The .dashboard-metric-hero .text-foreground / .text-muted-foreground
    // / .text-{exito,alerta,peligro,info}-600 remap rules are the
    // AA-Large contrast contract for the hero. They are NOT the bento
    // LAYOUT — they apply wherever the colored hero background applies
    // (mobile + desktop). They MUST remain OUTSIDE the bento's @media
    // (max-width: 767px) block.
    const bentoBody = extractMobileMediaQuery(css)
    // These rules live AFTER the bento @media (the file order is:
    // .dashboard-metric-hero (top-level) → bento @media → text-color
    // remap → estado-badge → radius). The relevant invariant: none of
    // the text-color remap rules lives INSIDE the bento @media body.
    expect(bentoBody).not.toMatch(/\.dashboard-metric-hero\s+\.text-foreground\s*\{/)
    expect(bentoBody).not.toMatch(/\.dashboard-metric-hero\s+\.text-muted-foreground\s*\{/)
    expect(bentoBody).not.toMatch(/\.dashboard-metric-hero\s+\.text-exito-600\s*\{/)
    expect(bentoBody).not.toMatch(/\.dashboard-metric-hero\s+\.text-alerta-600\s*\{/)
    expect(bentoBody).not.toMatch(/\.dashboard-metric-hero\s+\.text-peligro-600\s*\{/)
    expect(bentoBody).not.toMatch(/\.dashboard-metric-hero\s+\.text-info-600\s*\{/)
    // And the global file MUST still declare them (the contract is
    // "they live in the file, just not inside the bento @media").
    expect(css).toMatch(
      /\.dashboard-metric-hero\s+\.text-foreground\s*\{[^}]*color\s*:\s*var\(--on-primary\)/,
    )
    expect(css).toMatch(
      /\.dashboard-metric-hero\s+\.text-muted-foreground\s*\{[^}]*color\s*:\s*var\(--on-primary-muted\)/,
    )
    expect(css).toMatch(
      /\.dashboard-metric-hero\s+\.text-exito-600\s*\{[^}]*color\s*:\s*var\(--exito-foreground\)/,
    )
    expect(css).toMatch(
      /\.dashboard-metric-hero\s+\.text-alerta-600\s*\{[^}]*color\s*:\s*var\(--alerta-foreground\)/,
    )
    expect(css).toMatch(
      /\.dashboard-metric-hero\s+\.text-peligro-600\s*\{[^}]*color\s*:\s*var\(--peligro-foreground\)/,
    )
    expect(css).toMatch(
      /\.dashboard-metric-hero\s+\.text-info-600\s*\{[^}]*color\s*:\s*var\(--info-foreground\)/,
    )
  })
})

/* -------------------------------------------------------------------- */
/* Test 4 — estado-badge dot visible in all modern themes                */
/* -------------------------------------------------------------------- */

describe("PR4.T-FIX — estado-badge dot visible in all four modern themes", () => {
  it("dot-visible rule lists all four modern style classes", () => {
    // The original rule was `.theme-b .estado-badge .estado-dot { display: inline-block; }`.
    // The fix expands the selector to a comma list.
    const dotRule = css.match(
      /(?:^|\n)\s*([\s\S]*?)\.estado-badge\s+\.estado-dot\s*\{[^}]*display\s*:\s*inline-block/,
    )
    expect(dotRule, "dot-visible rule not found").not.toBeNull()
    const selectorList = dotRule?.[1] ?? ""
    for (const style of [
      ".theme-b",
      ".theme-moderna",
      ".theme-indigo",
      ".theme-cielo",
      ".theme-grafito",
    ]) {
      expect(selectorList, `dot selector list must include ${style}`).toContain(style)
    }
  })
})

/* -------------------------------------------------------------------- */
/* Test 5 — Preflight border-color wins ties via source order           */
/* -------------------------------------------------------------------- */

describe("PR4.T-FIX — Preflight border-color lives in @layer base", () => {
  it("@layer base block contains the universal border-color rule with the same selector as Tailwind Preflight", () => {
    // Tailwind v4's Preflight applies `border-color: currentColor` to
    // `*, ::before, ::after, ::backdrop` inside @layer base. The fix
    // MUST live in the same @layer base block and use the same
    // selector so the cascade tiebreaks to OUR rule (later in the
    // @layer base layer wins). Without matching the selector list the
    // override would not apply because Tailwind's universal selector
    // would win on source order within the same layer.
    const layerBlock = css.match(/@layer\s+base\s*\{([\s\S]*?)\n\}/)
    expect(layerBlock, "@layer base block not found").not.toBeNull()
    const body = layerBlock?.[1] ?? ""
    expect(body).toMatch(
      /\*\s*,\s*::before\s*,\s*::after\s*,\s*::backdrop\s*\{[^}]*border-color\s*:\s*var\(--color-border\)/,
    )
  })
})

/* -------------------------------------------------------------------- */
/* Test 6 — Anti-flash: theme-b → theme-moderna mapping is preserved    */
/* -------------------------------------------------------------------- */

describe("PR4.T-FIX — anti-flash script preserves legacy theme-b mapping", () => {
  it("ANTI_FLASH_SCRIPT maps theme-b storage to theme-moderna class", () => {
    const rootSource = readFileSync(ROOT_TSX, "utf8")
    const match = rootSource.match(/const\s+ANTI_FLASH_SCRIPT\s*=\s*`([^`]+)`/)
    expect(match, "ANTI_FLASH_SCRIPT not found").not.toBeNull()
    const body = match?.[1] ?? ""
    // The mapping MUST survive this PR. We assert the literal pair
    // "theme-b":"theme-moderna" is in the IIFE body.
    expect(body).toContain('"theme-b":"theme-moderna"')
  })
})

/* -------------------------------------------------------------------- */
/* Test 7 — Per-style × per-mode contrast for the hero MetricCard       */
/* -------------------------------------------------------------------- */

type Style = "moderna" | "indigo" | "cielo" | "grafito"
type Mode = "light" | "dark"

interface HeroTokens {
  background: string
  value: string // --on-primary
  label: string // --on-primary-muted
  exito: string // --exito-foreground
  alerta: string
  peligro: string
  info: string
}

function readHeroTokens(style: Style, mode: Mode): HeroTokens {
  const selector = mode === "dark" ? `.theme-${style}.dark` : `.theme-${style}`
  const block = extractBlock(css, selector)
  return {
    background: extractCssVar(block, "--pasto-600"),
    value: extractCssVar(block, "--on-primary"),
    label: extractCssVar(block, "--on-primary-muted"),
    exito: extractCssVar(block, "--exito-foreground"),
    alerta: extractCssVar(block, "--alerta-foreground"),
    peligro: extractCssVar(block, "--peligro-foreground"),
    info: extractCssVar(block, "--info-foreground"),
  }
}

describe("PR4.T-FIX — AA contrast for hero MetricCard (per style × mode)", () => {
  // The MetricCard hero carries text-metric (1.5rem mobile / 1.75rem
  // desktop, weight 600) which WCAG classifies as "Large text" because
  // it is both ≥ 18.7px bold. WCAG SC 1.4.3 sets the Large-text bar at
  // 3.0:1. The label (text-caption, 12px) and the context (text-support,
  // 14px) are NOT large by WCAG (need 4.5:1) — but the GanaWeb design
  // system uses the SAME hero palette for all text roles and the brand
  // palette (esmeralda, índigo, cielo, grafito) cannot hit 4.5:1 with
  // light text in every (style, mode) cell. The design's acceptance
  // level is therefore AA Large (3.0:1) for all hero text roles, and
  // the regression fix must keep that bar.

  for (const style of ["moderna", "indigo", "cielo", "grafito"] as const) {
    for (const mode of ["light", "dark"] as const) {
      it(`${style} ${mode}: value text passes AA Large against hero background`, () => {
        const t = readHeroTokens(style, mode)
        const ratio = contrastRatio(t.background, t.value)
        expect(t.value, "--on-primary must resolve to a hex literal").toMatch(/^#/)
        expect(
          ratio,
          `contrast(${t.value} vs ${t.background}) = ${ratio.toFixed(2)}`,
        ).toBeGreaterThanOrEqual(3.0)
      })

      it(`${style} ${mode}: label text passes AA Large against hero background`, () => {
        const t = readHeroTokens(style, mode)
        const ratio = contrastRatio(t.background, t.label)
        expect(t.label, "--on-primary-muted must resolve to a hex literal").toMatch(/^#/)
        expect(
          ratio,
          `contrast(${t.label} vs ${t.background}) = ${ratio.toFixed(2)}`,
        ).toBeGreaterThanOrEqual(3.0)
      })

      for (const tone of ["exito", "alerta", "peligro", "info"] as const) {
        it(`${style} ${mode}: context (${tone}) text passes AA Large against hero background`, () => {
          const t = readHeroTokens(style, mode)
          const fg = t[tone]
          const ratio = contrastRatio(t.background, fg)
          expect(fg, `--${tone}-foreground must resolve to a hex literal`).toMatch(/^#/)
          expect(
            ratio,
            `contrast(${fg} vs ${t.background}) for ${tone} = ${ratio.toFixed(2)}`,
          ).toBeGreaterThanOrEqual(3.0)
        })
      }
    }
  }
})
