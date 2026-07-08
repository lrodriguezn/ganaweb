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
    lines.forEach((line, i) => {
      if (isCss) return // CSS .dark is allowed
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
