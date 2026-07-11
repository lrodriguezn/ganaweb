import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

/**
 * PR4.T5 — token-presence + no-dark-variant guard (T-004).
 *
 * Spec: ui-component-library.md §Requirement 2 (tokens present) +
 * §Requirement 3 (zero `dark:` variants).
 *
 * Design T-004: NO component in `packages/ui` MAY use Tailwind `dark:`
 * variants. Theming is achieved exclusively through CSS tokens that the
 * `.dark` selector rewrites at runtime. This test enforces both halves:
 *
 * 1. The 3 spec-mandated design tokens are defined in globals.css.
 * 2. A text search across `src/**` returns zero `dark:` occurrences.
 *
 * Reading the test-first: this is structural verification of invariants
 * established by PR4.T2 (globals.css) and PR4.T4 (components). The test
 * would have caught any token drop during migration and any slip-up of
 * a `dark:` utility into a migrated component.
 *
 * PR1.T-001.4 (selector-estilo-apariencia): extended to cover the
 * Propuesta B cascade. PR1 added the .theme-b and .theme-b.dark blocks
 * to globals.css; the new assertions verify (a) cascade precedence
 * (`.theme-b.dark` must come after both `.dark` and `.theme-b` in source
 * order, otherwise source-order tiebreak would be wrong), (b) the
 * `--brand-panel` token is overridden in B (REQ-CSB-002 + S3 risk gate),
 * and (c) the T-004 guard is also extended to flag `theme-b:` Tailwind
 * variants in components (mirrors `dark:` enforcement, REQ-CSB-001).
 */

const ROOT = fileURLToPath(new URL("..", import.meta.url))
const SRC = join(ROOT, "src")
const GLOBALS_CSS = join(SRC, "styles", "globals.css")

/** Recursively walk a directory and yield file paths matching the predicate. */
function* walk(dir: string, accept: (name: string) => boolean): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      yield* walk(full, accept)
    } else if (accept(entry)) {
      yield full
    }
  }
}

function shouldScanLine(trimmed: string, inBlockComment: boolean): [boolean, boolean] {
  if (inBlockComment) return [trimmed.includes("*/"), false]
  if (trimmed.startsWith("/*") || trimmed.startsWith("/**")) return [!trimmed.includes("*/"), false]
  if (trimmed.startsWith("//")) return [false, false]
  return [false, true]
}

/**
 * T-004 invariant check: scan source content for forbidden Tailwind
 * variant tokens (`dark:`, `theme-b:`), ignoring comments. The rule
 * is about the className surface, not human prose — JSDoc blocks that
 * mention "Sin variantes `dark:`" are NOT violations.
 */
function findOffenders(content: string, pattern: RegExp): { line: number; text: string }[] {
  const lines = content.split("\n")
  const offenders: { line: number; text: string }[] = []
  let inBlockComment = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (typeof line !== "string") continue
    const trimmed = line.trim()
    const [nextInBlockComment, shouldScan] = shouldScanLine(trimmed, inBlockComment)
    inBlockComment = nextInBlockComment
    if (!shouldScan) continue
    if (pattern.test(line)) {
      offenders.push({ line: i + 1, text: trimmed })
    }
  }
  return offenders
}

function expectNoViolations(
  file: string,
  content: string,
  pattern: RegExp,
  variantLabel: string,
): void {
  const offenders = findOffenders(content, pattern)
  if (offenders.length > 0) {
    const formatted = offenders.map((o) => `  ${file}:${o.line}  ${o.text}`).join("\n")
    throw new Error(`${variantLabel} Tailwind variant detected (T-004 violation):\n${formatted}`)
  }
  expect(offenders).toEqual([])
}

type StyleCase = {
  id: "campo" | "moderna" | "indigo" | "cielo" | "grafito"
  mode: "claro" | "oscuro"
  selector: string
  expected: Record<string, string>
}

const STYLE_CASES: StyleCase[] = [
  {
    id: "campo",
    mode: "claro",
    selector: ":root",
    expected: {
      "--pasto-600": "#2f6b3f",
      "--crema-50": "#faf8f4",
      "--superficie": "#ffffff",
      "--tierra-900": "#2b2620",
    },
  },
  {
    id: "campo",
    mode: "oscuro",
    selector: ".dark",
    expected: {
      "--pasto-600": "#4c9d62",
      "--crema-50": "#171512",
      "--superficie": "#211e1a",
      "--tierra-900": "#ede9e1",
    },
  },
  {
    id: "moderna",
    mode: "claro",
    selector: ".theme-moderna",
    expected: {
      "--pasto-600": "#059669",
      "--crema-50": "#f4f5f7",
      "--superficie": "#ffffff",
      "--tierra-900": "#18181b",
    },
  },
  {
    id: "moderna",
    mode: "oscuro",
    selector: ".theme-moderna.dark",
    expected: {
      "--pasto-600": "#10b981",
      "--crema-50": "#09090b",
      "--superficie": "#18181b",
      "--tierra-900": "#fafafa",
    },
  },
  {
    id: "indigo",
    mode: "claro",
    selector: ".theme-indigo",
    expected: {
      "--pasto-600": "#4f46e5",
      "--pasto-100": "#e0e7ff",
      "--primary-soft-text": "#4338ca",
      "--dom-repro": "#c026d3",
    },
  },
  {
    id: "indigo",
    mode: "oscuro",
    selector: ".theme-indigo.dark",
    expected: {
      "--pasto-600": "#818cf8",
      "--pasto-100": "#312e81",
      "--primary-soft-text": "#c7d2fe",
      "--dom-repro": "#e879f9",
    },
  },
  {
    id: "cielo",
    mode: "claro",
    selector: ".theme-cielo",
    expected: {
      "--pasto-600": "#0284c7",
      "--crema-50": "#f3f6f9",
      "--superficie": "#ffffff",
      "--tierra-900": "#0f172a",
    },
  },
  {
    id: "cielo",
    mode: "oscuro",
    selector: ".theme-cielo.dark",
    expected: {
      "--pasto-600": "#38bdf8",
      "--crema-50": "#09090b",
      "--superficie": "#0f172a",
      "--tierra-900": "#f8fafc",
    },
  },
  {
    id: "grafito",
    mode: "claro",
    selector: ".theme-grafito",
    expected: {
      "--pasto-600": "#1c1917",
      "--crema-50": "#f5f5f4",
      "--superficie": "#ffffff",
      "--tierra-900": "#1c1917",
    },
  },
  {
    id: "grafito",
    mode: "oscuro",
    selector: ".theme-grafito.dark",
    expected: {
      "--pasto-600": "#e7e5e4",
      "--crema-50": "#0c0a09",
      "--superficie": "#1c1917",
      "--tierra-900": "#fafaf9",
    },
  },
]

function selectorToRegexSource(selector: string): string {
  return selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\ /g, "\\s+")
}

function extractBlock(css: string, selector: string): string {
  const match = css.match(
    new RegExp(`^${selectorToRegexSource(selector)}\\s*\\{([\\s\\S]*?)\\n\\}`, "m"),
  )
  if (!match || typeof match[1] !== "string") throw new Error(`${selector} block not found`)
  return match[1]
}

function expectToken(block: string, token: string, value: string): void {
  expect(block.toLowerCase()).toMatch(new RegExp(`${token}:\\s*${value.toLowerCase()}`))
}

describe("PR4.T5 — design tokens (T-004)", () => {
  const css = readFileSync(GLOBALS_CSS, "utf8")

  it("defines --color-primary in globals.css", () => {
    expect(css).toMatch(/--color-primary\s*:/)
  })

  it("defines --color-background in globals.css", () => {
    expect(css).toMatch(/--color-background\s*:/)
  })

  it("defines --color-ring in globals.css", () => {
    expect(css).toMatch(/--color-ring\s*:/)
  })

  it("keeps the .dark override block (CSS-token theming, not dark: utility)", () => {
    // The .dark block rewrites the same CSS vars at runtime; the
    // components never branch on it. If this drops, dark mode silently
    // reverts to light tokens — easier to catch here than in production.
    expect(css).toMatch(/^\.dark\s*\{/m)
  })
})

describe("cinco-estilos-apariencia — five-style token cascade", () => {
  const css = readFileSync(GLOBALS_CSS, "utf8")

  it.each(STYLE_CASES)("defines $id $mode tokens in $selector", ({ expected, selector }) => {
    const block = extractBlock(css, selector)
    for (const [token, value] of Object.entries(expected)) {
      expectToken(block, token, value)
    }
  })

  it("keeps semantic Tailwind tokens mapped to runtime CSS variables", () => {
    const themeInline = extractBlock(css, "@theme inline")
    expect(themeInline).toMatch(/--color-primary\s*:\s*var\(--pasto-600\)/)
    expect(themeInline).toMatch(/--color-background\s*:\s*var\(--crema-50\)/)
    expect(themeInline).toMatch(/--color-ring\s*:\s*var\(--pasto-600\)/)
  })

  it("orders style blocks so each dark style wins after the base dark block", () => {
    const darkIdx = css.search(/^\.dark\s*\{/m)
    expect(darkIdx).toBeGreaterThan(-1)

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
      const idx = css.search(new RegExp(`^${selectorToRegexSource(selector)}\\s*\\{`, "m"))
      expect(idx).toBeGreaterThan(darkIdx)
    }
  })

  it("keeps .theme-b and Moderna selectors available for compatibility", () => {
    expect(css).toMatch(/^\.theme-b\s*\{/m)
    expect(css).toMatch(/^\.theme-b\.dark\s*\{/m)
    expect(css).toMatch(/^\.theme-moderna\s*\{/m)
    expect(css).toMatch(/^\.theme-moderna\.dark\s*\{/m)
  })
})

describe("PR1.T-001.4 — Propuesta B cascade (REQ-CSB-001)", () => {
  const css = readFileSync(GLOBALS_CSS, "utf8")

  it("defines a .theme-b override block", () => {
    expect(css).toMatch(/^\.theme-b\s*\{/m)
  })

  it("defines a .theme-b.dark override block (B-dark wins on both axes)", () => {
    expect(css).toMatch(/^\.theme-b\.dark\s*\{/m)
  })

  it("declares --brand-panel inside .theme-b (S3 risk gate, REQ-CSB-002)", () => {
    // The gate review surfaced brand-panel as the panel token that
    // historically broke in Propuesta B (A-dark = #1C3A26 vs B-dark =
    // #064E3B). The B override MUST be present and distinct from A.
    const themeBlock = css.match(/^\.theme-b\s*\{([\s\S]*?)\n\}/m)
    if (!themeBlock) throw new Error(".theme-b block not found")
    const body = themeBlock[1]
    if (typeof body !== "string") throw new Error(".theme-b body missing")
    expect(body).toMatch(/--brand-panel\s*:/)
  })

  it("declares --brand-panel inside .theme-b.dark (B-dark distinct from B-light)", () => {
    const themeBlock = css.match(/^\.theme-b\.dark\s*\{([\s\S]*?)\n\}/m)
    if (!themeBlock) throw new Error(".theme-b.dark block not found")
    const body = themeBlock[1]
    if (typeof body !== "string") throw new Error(".theme-b.dark body missing")
    expect(body).toMatch(/--brand-panel\s*:/)
  })

  it("orders blocks :root → .dark → .theme-b → .theme-b.dark (D1 cascade contract)", () => {
    // Source order is the cascade tiebreak between equal-specificity
    // selectors. .theme-b.dark (0,2,0) wins by specificity alone, but
    // .theme-b and .dark share specificity (0,1,0) — they tie and
    // source order decides. The selector that appears LATER in the
    // file wins for the same property.
    const rootIdx = css.search(/^\s*:root\s*\{/m)
    const darkIdx = css.search(/^\s*\.dark\s*\{/m)
    const themeBIdx = css.search(/^\s*\.theme-b\s*\{/m)
    const themeBDarkIdx = css.search(/^\s*\.theme-b\.dark\s*\{/m)
    expect(rootIdx).toBeGreaterThan(-1)
    expect(darkIdx).toBeGreaterThan(rootIdx)
    expect(themeBIdx).toBeGreaterThan(darkIdx)
    expect(themeBDarkIdx).toBeGreaterThan(themeBIdx)
  })

  it("sets B-only depth tokens to real values under .theme-b (REQ-CSB-003)", () => {
    const themeBlock = css.match(/^\.theme-b\s*\{([\s\S]*?)\n\}/m)
    if (!themeBlock) throw new Error(".theme-b block not found")
    const body = themeBlock[1]
    if (typeof body !== "string") throw new Error(".theme-b body missing")
    expect(body).toMatch(/--card-shadow\s*:\s*\S/) // not empty / not "none" in B
    expect(body).toMatch(/--primary-gradient\s*:\s*linear-gradient/)
    expect(body).toMatch(/--glass-bg\s*:\s*rgb\(/)
  })

  it("sets B-only depth tokens to none/transparent in :root and .dark (REQ-CSB-003)", () => {
    // A stays flat — explicitly. A components consume var(--card-shadow)
    // and get nothing; B components get the real value.
    expect(css).toMatch(/--card-shadow\s*:\s*none/)
    expect(css).toMatch(/--primary-gradient\s*:\s*none/)
    expect(css).toMatch(/--glass-bg\s*:\s*transparent/)
  })

  it("registers B-only tokens in @theme inline (REQ-CSB-005)", () => {
    const themeInline = css.match(/@theme inline\s*\{([\s\S]*?)\n\}/m)
    if (!themeInline) throw new Error("@theme inline block not found")
    const body = themeInline[1]
    if (typeof body !== "string") throw new Error("@theme inline body missing")
    expect(body).toMatch(/--color-primary-gradient\s*:/)
    expect(body).toMatch(/--color-card-shadow\s*:/)
    expect(body).toMatch(/--color-glass-bg\s*:/)
  })

  it("redefines B radius tokens (0.75 / 1 / 1.5rem) under .theme-b (REQ-CSB-004)", () => {
    // B radius redefinitions may live in a separate .theme-b block
    // (after the @theme inline + utility classes) so the spec rule is
    // "any .theme-b block redefines the radius", not "the first one".
    // We extract the union of all .theme-b block bodies and check.
    const themeBBlocks = [...css.matchAll(/^\.theme-b\s*\{([\s\S]*?)\n\}/gm)]
    if (themeBBlocks.length === 0) throw new Error("no .theme-b blocks found")
    const combined = themeBBlocks
      .map((m) => m[1])
      .filter((s): s is string => typeof s === "string")
      .join("\n")
    expect(combined).toMatch(/--radius\s*:\s*0\.75rem/)
    expect(combined).toMatch(/--radius-card\s*:\s*1rem/)
    expect(combined).toMatch(/--radius-sheet\s*:\s*1\.5rem/)
  })

  it("declares B-only utility classes (T-001.3, REQ-CSB-005..007)", () => {
    expect(css).toMatch(/\.bg-primary-gradient\s*\{/)
    expect(css).toMatch(/\.glass-shell\s*\{/)
    expect(css).toMatch(/\.dashboard-metric-hero\s*\{/)
    expect(css).toMatch(/\.estado-badge\s+\.estado-dot\s*\{/)
  })

  it("scopes .glass-shell to .theme-b inside an @supports guard (D3, REQ-CSB-006)", () => {
    // The @supports check guards backdrop-filter; inside, the override
    // is .theme-b .glass-shell — never an unscoped .glass-shell rule.
    expect(css).toMatch(/@supports[^{]*backdrop-filter[^)]*\)[\s\S]*?\.theme-b\s+\.glass-shell/)
  })
})

describe("PR4.T5 — no dark: variant in src/** (T-004)", () => {
  // Match `dark:` only when used as a Tailwind variant token. Patterns
  // like `bdark:`, `darkmode:` would be false positives — guard with
  // a word boundary on the left.
  const DARK_VARIANT = /(?:^|[^a-zA-Z0-9_-])dark:/
  // Skip the styles/globals.css file: its `.dark` block is the
  // CORRECT way to switch themes (T-004). Only forbid the Tailwind
  // utility variant in TS/TSX (components + barrel).
  const skip = (file: string) => file.endsWith(".css")

  const files: string[] = []
  for (const file of walk(SRC, (name) => /\.(ts|tsx|css)$/.test(name))) {
    files.push(file)
  }

  it("src/ contains at least one source file (sanity)", () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it.each(files)("no dark: in %s", (file) => {
    if (skip(file)) return
    const content = readFileSync(file, "utf8")
    expectNoViolations(file, content, DARK_VARIANT, "dark:")
  })
})

describe("PR1.T-001.4 — no theme-b: variant in src/ganado/** (T-004 extended)", () => {
  // PR1 extends the T-004 invariant: the same way `dark:` is forbidden
  // in components, `theme-b:` is forbidden. Theming under .theme-b is
  // CSS-cascade-only; components use marker classNames (bg-primary-
  // gradient, glass-shell, dashboard-metric-hero) instead of conditional
  // Tailwind variants. This guard is intentionally narrower than the
  // dark: check: it covers ganado/ only, because the B-only markers are
  // specifically the ones in PR3 (badges, bottom-nav, fab, etc.).
  const THEME_B_VARIANT = /(?:^|[^a-zA-Z0-9_-])theme-b:/

  const ganadoSrc = join(SRC, "ganado")
  const files: string[] = []
  try {
    for (const file of walk(ganadoSrc, (name) => /\.(ts|tsx)$/.test(name))) {
      files.push(file)
    }
  } catch {
    // ganado/ may not exist in the future; skip silently.
  }

  it.each(files)("no theme-b: in %s", (file) => {
    const content = readFileSync(file, "utf8")
    expectNoViolations(file, content, THEME_B_VARIANT, "theme-b:")
  })
})

describe("cinco-estilos-apariencia — no component-level style variants", () => {
  const STYLE_VARIANT = /(?:^|[^a-zA-Z0-9_-])theme-(?:b|moderna|indigo|cielo|grafito):/

  const files: string[] = []
  for (const file of walk(SRC, (name) => /\.(ts|tsx)$/.test(name))) {
    files.push(file)
  }

  it("src/ contains at least one TypeScript source file (sanity)", () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it.each(files)("no theme-* Tailwind style variant in %s", (file) => {
    const content = readFileSync(file, "utf8")
    expectNoViolations(file, content, STYLE_VARIANT, "theme-*")
  })
})

/**
 * PR1 (intensificar-b-visuals) — B visual identity tightening.
 *
 * The original Propuesta B cascade delivered color tokens, radius, gradient
 * utility, glass shell, and bento hero — but several of B's depth markers
 * were *defined as tokens* and never *consumed*. This block verifies the
 * six new cascade rules (REQ-BVA-006/007/008 + REQ-CSB-008/009/010) plus
 * the A-untouched guard that proves A's token values are unchanged.
 *
 * Spec: openspec/changes/intensificar-b-visuals/specs/{b-visual-adaptations,
 * css-tokens-b}-delta.md. The structural regexes mirror the existing
 * PR1.T-001.4 tests above — same source-order / block-extraction pattern,
 * so future maintainers only need to learn one parsing style.
 */
describe("intensificar-b-visuals — B cascade consumption rules", () => {
  const css = readFileSync(GLOBALS_CSS, "utf8")

  // Extractors reused by multiple tests below. Fail fast with a clear
  // message if the block we're matching against is missing — a future
  // refactor that renames .theme-b or :root should not produce a cryptic
  // "undefined.match" stack.
  const rootBody = css.match(/^:root\s*\{([\s\S]*?)\n\}/m)?.[1]
  const darkBody = css.match(/^\.dark\s*\{([\s\S]*?)\n\}/m)?.[1]
  const themeBBody = css.match(/^\.theme-b\s*\{([\s\S]*?)\n\}/m)?.[1]
  const themeBDarkBody = css.match(/^\.theme-b\.dark\s*\{([\s\S]*?)\n\}/m)?.[1]

  it("REQ-BVA-006 — .theme-b .rounded-card consumes --card-shadow", () => {
    // The rule is structural: `.theme-b .rounded-card { box-shadow: var(--card-shadow); }`.
    // The selector scope is important: NEVER .rounded-md (buttons/inputs) or
    // .rounded-lg (chips/segments). The regex anchors the brace immediately
    // after the selector, so the .rounded-card rule is uniquely identified.
    expect(css).toMatch(/\.theme-b\s+\.rounded-card\s*\{\s*box-shadow:\s*var\(--card-shadow\)/)
  })

  it("REQ-BVA-006 — selector scope is .rounded-card only (no .rounded-md leak)", () => {
    // Belt-and-suspenders for the spec's "never .rounded-md" requirement.
    // .rounded-md must NOT appear as a sibling selector on the card-shadow rule.
    // We locate the declaration by indexOf (match() returns an array, not a
    // string, so the "typeof !== 'string'" guard the first draft used was
    // structurally wrong and always threw on success).
    const idx = css.indexOf("box-shadow: var(--card-shadow)")
    if (idx < 0) throw new Error("box-shadow: var(--card-shadow) declaration not found")
    const preceding = css.slice(Math.max(0, idx - 400), idx)
    // Selector list ends at the most recent `}` (rule close) or `*/` (comment close).
    const lastBraceOrComment = Math.max(preceding.lastIndexOf("}"), preceding.lastIndexOf("*/"))
    const selectorSlice = preceding.slice(lastBraceOrComment + 1)
    expect(selectorSlice).toContain(".rounded-card")
    expect(selectorSlice).not.toContain(".rounded-md")
    expect(selectorSlice).not.toContain(".rounded-lg")
  })

  it("REQ-BVA-007 — headings and text utility classes get letter-spacing -0.02em", () => {
    // The selector list (h1, h2, .text-title, .text-section) is grouped;
    // any one of them on the same rule body as the declaration suffices.
    const letterSpacingRule = css.match(/\.theme-b\s+h1[\s\S]*?letter-spacing:\s*-0\.02em/)
    expect(letterSpacingRule).not.toBeNull()
    // Sanity: the grouped selector list mentions all four required classes.
    const idx = css.indexOf("letter-spacing: -0.02em")
    if (idx < 0) throw new Error("letter-spacing: -0.02em not found")
    const preceding = css.slice(Math.max(0, idx - 400), idx)
    const lastBraceOrComment = Math.max(preceding.lastIndexOf("}"), preceding.lastIndexOf("*/"))
    const selectorSlice = preceding.slice(lastBraceOrComment + 1)
    expect(selectorSlice).toContain("h1")
    expect(selectorSlice).toContain("h2")
    expect(selectorSlice).toContain(".text-title")
    expect(selectorSlice).toContain(".text-section")
  })

  it("REQ-BVA-007 — .text-metric gets the tighter letter-spacing -0.025em", () => {
    // .text-metric is on its own rule with the tighter -0.025em (per
    // design-b typography.extra: 'cifras con letter-spacing -0.02em'
    // BUT the spec amplifies to -0.025em for numeric figures).
    expect(css).toMatch(/\.theme-b\s+\.text-metric\s*\{\s*letter-spacing:\s*-0\.025em/)
  })

  it("REQ-BVA-008 — bento hero under .theme-b is mobile-only (5rem + --radius-card inside @media (max-width: 767px))", () => {
    // v1.4 extended the bento rule from a single .theme-b selector to
    // a list of theme-b + 4 modern styles. The bento LAYOUT (full
    // grid span, 5rem min-height, dramatic --radius-card) is now
    // mobile-only — it lives inside `@media (max-width: 767px)` so
    // the desktop dashboard keeps the 4-column grid (the first
    // MetricCard must NOT span the full row at >= 768px). We
    // bracket-count the @media body to extract it, then assert the
    // 5rem + --radius-card + grid-column 1/-1 declarations live
    // there.
    const start = css.search(/@media\s*\(max-width:\s*767px\)\s*\{/)
    expect(start, "@media (max-width: 767px) block must exist").toBeGreaterThan(-1)
    const openBrace = css.indexOf("{", start)
    let depth = 1
    let i = openBrace + 1
    while (i < css.length && depth > 0) {
      const ch = css[i]
      if (ch === "{") depth++
      else if (ch === "}") depth--
      i++
    }
    const bentoBody = css.slice(openBrace + 1, i - 1)
    // The bento selector list (theme-b + 4 modern) is preserved.
    expect(bentoBody).toMatch(/\.theme-b\s+\.dashboard-metric-hero\s*,/)
    expect(bentoBody).toMatch(/\.theme-moderna\s+\.dashboard-metric-hero\s*,/)
    expect(bentoBody).toMatch(/\.theme-indigo\s+\.dashboard-metric-hero\s*,/)
    expect(bentoBody).toMatch(/\.theme-cielo\s+\.dashboard-metric-hero\s*,/)
    expect(bentoBody).toMatch(/\.theme-grafito\s+\.dashboard-metric-hero\s*\{/)
    // The bento LAYOUT body declarations.
    expect(bentoBody).toMatch(/grid-column:\s*1\s*\/\s*-1/)
    expect(bentoBody).toMatch(/min-height:\s*5rem/)
    expect(bentoBody).toMatch(/border-radius:\s*var\(--radius-card\)/)
  })

  it("REQ-BVA-008 — bento hero has NO desktop override at min-width: 768px (mobile-only bento LAYOUT)", () => {
    // The previous bento layout had an @media (min-width: 768px) block
    // that escalated min-height to 7rem and font-size to 1.75rem.
    // After the bento became mobile-only, that override is dead code
    // and MUST be removed. The desktop dashboard now shows the hero
    // as a normal 4-column tile (no full-row span, no dramatic size).
    // We assert both 7rem and 1.75rem are absent from the file.
    expect(css).not.toMatch(/min-height\s*:\s*7rem/)
    expect(css).not.toMatch(/font-size\s*:\s*1\.75rem/)
  })

  it("REQ-BVA-008 — bento hero m-value font-size is 1.5rem inside @media (max-width: 767px) (mobile-only)", () => {
    // The .m-value 1.5rem override is part of the bento LAYOUT — it
    // makes the hero number feel more prominent when the card spans
    // the full row. It MUST be inside the mobile @media block; in
    // desktop the metric uses the standard text-metric size.
    const start = css.search(/@media\s*\(max-width:\s*767px\)\s*\{/)
    expect(start, "@media (max-width: 767px) block must exist").toBeGreaterThan(-1)
    const openBrace = css.indexOf("{", start)
    let depth = 1
    let i = openBrace + 1
    while (i < css.length && depth > 0) {
      const ch = css[i]
      if (ch === "{") depth++
      else if (ch === "}") depth--
      i++
    }
    const bentoBody = css.slice(openBrace + 1, i - 1)
    expect(bentoBody).toMatch(
      /\.theme-b\s+\.dashboard-metric-hero\s*,[\s\S]*?\s+\.m-value\s*\{[^}]*font-size:\s*1\.5rem/,
    )
  })

  it("REQ-CSB-008 — .theme-b --tierra-200 re-tuned to zinc-300 (#d4d4d8)", () => {
    if (typeof themeBBody !== "string") throw new Error(".theme-b block not found")
    expect(themeBBody).toMatch(/--tierra-200:\s*#d4d4d8/)
  })

  it("REQ-CSB-008 — .theme-b.dark --tierra-200 re-tuned to zinc-700 (#3f3f46)", () => {
    if (typeof themeBDarkBody !== "string") throw new Error(".theme-b.dark block not found")
    expect(themeBDarkBody).toMatch(/--tierra-200:\s*#3f3f46/)
  })

  it("REQ-CSB-009 — .theme-b --crema-50 re-tuned to slightly darker (#eef0f3)", () => {
    if (typeof themeBBody !== "string") throw new Error(".theme-b block not found")
    expect(themeBBody).toMatch(/--crema-50:\s*#eef0f3/)
  })

  it("REQ-CSB-009 — .theme-b.dark --crema-50 re-tuned to slightly darker (#0a0a0c)", () => {
    if (typeof themeBDarkBody !== "string") throw new Error(".theme-b.dark block not found")
    expect(themeBDarkBody).toMatch(/--crema-50:\s*#0a0a0c/)
  })

  it("REQ-CSB-010 — .theme-b .glass-shell gets a 1px hairline shadow (light)", () => {
    // The hairline rule lives OUTSIDE the @supports guard. We assert by
    // matching the selector+brace+declaration pattern: the @supports version
    // of .theme-b .glass-shell starts with `-webkit-backdrop-filter`, so the
    // regex with `box-shadow` immediately after `{` uniquely matches the
    // standalone rule.
    expect(css).toMatch(
      /\.theme-b\s+\.glass-shell\s*\{\s*box-shadow:\s*0 1px 0 0 rgb\(0 0 0 \/ 0\.04\)/,
    )
  })

  it("REQ-CSB-010 — .theme-b.dark .glass-shell gets a 1px hairline shadow (dark)", () => {
    expect(css).toMatch(
      /\.theme-b\.dark\s+\.glass-shell\s*\{\s*box-shadow:\s*0 1px 0 0 rgb\(255 255 255 \/ 0\.06\)/,
    )
  })

  it("REQ-CSB-010 — hairline rule is OUTSIDE the @supports guard (applies unconditionally)", () => {
    // The standalone hairline rule must come AFTER the @supports block closes
    // so it always applies, even on browsers without backdrop-filter support.
    const supportsBlockEnd = css.indexOf("backdrop-filter: blur(12px);")
    if (supportsBlockEnd < 0) throw new Error("@supports block not found")
    const hairlineIdx = css.indexOf("box-shadow: 0 1px 0 0 rgb(0 0 0 / 0.04)")
    expect(hairlineIdx).toBeGreaterThan(supportsBlockEnd)
  })

  // ---- A-untouched guards --------------------------------------------------
  // The whole point of scoping every fix under .theme-b / .theme-b.dark is
  // that A (:root, .dark) MUST be unchanged. These four assertions are the
  // safety net — if any of them fails, the change is not B-only anymore.

  it("guard — :root --tierra-200 still equals A's warm stone-200 (#e3ded5)", () => {
    if (typeof rootBody !== "string") throw new Error(":root block not found")
    expect(rootBody).toMatch(/--tierra-200:\s*#e3ded5/)
  })

  it("guard — :root --crema-50 still equals A's warm crema-50 (#faf8f4)", () => {
    if (typeof rootBody !== "string") throw new Error(":root block not found")
    expect(rootBody).toMatch(/--crema-50:\s*#faf8f4/)
  })

  it("guard — .dark --tierra-200 still equals A's dark border (#3a362f)", () => {
    if (typeof darkBody !== "string") throw new Error(".dark block not found")
    expect(darkBody).toMatch(/--tierra-200:\s*#3a362f/)
  })

  it("guard — .dark --crema-50 still equals A's dark background (#171512)", () => {
    if (typeof darkBody !== "string") throw new Error(".dark block not found")
    expect(darkBody).toMatch(/--crema-50:\s*#171512/)
  })
})
