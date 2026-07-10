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
    expect(themeBlock, ".theme-b block not found").not.toBeNull()
    expect(themeBlock![1]).toMatch(/--brand-panel\s*:/)
  })

  it("declares --brand-panel inside .theme-b.dark (B-dark distinct from B-light)", () => {
    const themeBlock = css.match(/^\.theme-b\.dark\s*\{([\s\S]*?)\n\}/m)
    expect(themeBlock, ".theme-b.dark block not found").not.toBeNull()
    expect(themeBlock![1]).toMatch(/--brand-panel\s*:/)
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
    expect(themeBlock, ".theme-b block not found").not.toBeNull()
    const body = themeBlock![1]
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
    expect(themeInline, "@theme inline block not found").not.toBeNull()
    const body = themeInline![1]
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
    expect(themeBBlocks.length, "no .theme-b blocks found").toBeGreaterThan(0)
    const combined = themeBBlocks.map((m) => m[1]).join("\n")
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

  const files: string[] = []
  for (const file of walk(SRC, (name) => /\.(ts|tsx|css)$/.test(name))) {
    files.push(file)
  }

  it("src/ contains at least one source file (sanity)", () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it.each(files)("no dark: in %s", (file) => {
    const content = readFileSync(file, "utf8")
    // Skip the styles/globals.css file: its `.dark` block is the
    // CORRECT way to switch themes (T-004). Only forbid the Tailwind
    // utility variant in TS/TSX (components + barrel).
    const isCss = file.endsWith(".css")
    const lines = content.split("\n")
    const offenders: { line: number; text: string }[] = []
    let inBlockComment = false
    lines.forEach((line, i) => {
      if (isCss) return // CSS .dark is allowed
      // Track JSDoc / multi-line block-comment state. Lines that
      // mention `dark:` inside a comment (e.g. "Sin variantes `dark:`"
      // in a JSDoc block) are NOT code; the rule is about the
      // className surface, not human prose.
      const trimmed = line.trim()
      if (inBlockComment) {
        if (trimmed.includes("*/")) inBlockComment = false
        return
      }
      if (trimmed.startsWith("/*") || trimmed.startsWith("/**")) {
        if (!trimmed.includes("*/")) inBlockComment = true
        return
      }
      // Also skip single-line `//` comments.
      if (trimmed.startsWith("//")) return
      if (DARK_VARIANT.test(line)) {
        offenders.push({ line: i + 1, text: line.trim() })
      }
    })
    if (offenders.length > 0) {
      const formatted = offenders.map((o) => `  ${file}:${o.line}  ${o.text}`).join("\n")
      throw new Error(`dark: Tailwind variant detected (T-004 violation):\n${formatted}`)
    }
    expect(offenders).toEqual([])
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
    const lines = content.split("\n")
    const offenders: { line: number; text: string }[] = []
    let inBlockComment = false
    lines.forEach((line, i) => {
      const trimmed = line.trim()
      if (inBlockComment) {
        if (trimmed.includes("*/")) inBlockComment = false
        return
      }
      if (trimmed.startsWith("/*") || trimmed.startsWith("/**")) {
        if (!trimmed.includes("*/")) inBlockComment = true
        return
      }
      if (trimmed.startsWith("//")) return
      if (THEME_B_VARIANT.test(line)) {
        offenders.push({ line: i + 1, text: line.trim() })
      }
    })
    if (offenders.length > 0) {
      const formatted = offenders.map((o) => `  ${file}:${o.line}  ${o.text}`).join("\n")
      throw new Error(`theme-b: Tailwind variant detected (T-004 violation):\n${formatted}`)
    }
    expect(offenders).toEqual([])
  })
})
