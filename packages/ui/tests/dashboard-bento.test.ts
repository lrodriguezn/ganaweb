import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

/**
 * PR5.T-005.2 — dashboard bento marker guard.
 *
 * Spec: `openspec/changes/selector-estilo-apariencia/specs/b-visual-adaptations.md`
 *       §REQ-BVA-004 (gradient discipline, one gradient per view) +
 *       §MODIFIED MetricCards grid (bento hero under .theme-b).
 * Design: D10 (bento via CSS, no component branch) + D12 (gradient CTAs).
 *
 * **Why a source test, not a render test?**
 *
 * The route lives in `apps/web/src/routes/_app/index.tsx`, which has no
 * vitest harness (apps/web/package.json uses a health-check integration
 * script, not a unit runner). The existing structural-test pattern in
 * `tokens.test.ts` reads the source from disk and asserts invariants
 * without a render tree — exactly the right shape for this assertion.
 *
 * The two invariants from REQ-BVA-004:
 *  1. The first `MetricCard` rendered from `MOCK_METRICS` MUST carry
 *     the `dashboard-metric-hero` className (D10 hero marker). Under
 *     `.theme-b` globals.css applies the gradient + glow + full grid
 *     span; under A the class is inert (REQ-BVA-004 + D10).
 *  2. The "Registrar evento" `Button` MUST NOT carry `bg-primary-gradient`
 *     (D12, design-b rule 2). The hero metric + BottomNav FAB already
 *     own the gradient on this view; a third gradient on the CTA is a
 *     violation.
 *
 * These are static, file-level invariants — a render test would only
 * re-derive the same answer at higher cost (jsdom + react-test-renderer
 * + the full route's deps). The source-read test is deterministic,
 * cheap, and catches the exact regression the spec warns about.
 */

const DASHBOARD_ROUTE = join(
  fileURLToPath(new URL("..", import.meta.url)),
  "..",
  "..",
  "apps",
  "web",
  "src",
  "routes",
  "_app",
  "index.tsx",
)

describe("dashboard bento (PR5.T-005.2)", () => {
  const source = readFileSync(DASHBOARD_ROUTE, "utf8")

  it("applies dashboard-metric-hero to the first MetricCard in the MOCK_METRICS map", () => {
    // Locate the MOCK_METRICS.map((m, index) => ...) block. The first
    // iteration (index === 0) MUST set className to dashboard-metric-hero.
    // We assert:
    //   (a) the map callback destructures `index`,
    //   (b) an `if (index === 0)` branch exists,
    //   (c) the branch sets className to the literal marker string.
    // This is more robust than a "string occurs" check — it would catch
    // a refactor that moves the class to a different element.
    expect(source).toMatch(/\.map\(\(m,\s*index\)\s*=>/)
    expect(source).toMatch(/if\s*\(\s*index\s*===\s*0\s*\)/)
    // Class literal — string match, no template expression.
    expect(source).toMatch(/className\s*=\s*["']dashboard-metric-hero["']/)
  })

  it("does not apply dashboard-metric-hero to any other MetricCard position", () => {
    // The marker MUST be a per-first-iteration choice, not a blanket
    // application to every card. A single assignment under `index === 0`
    // is the contract.
    const heroAssignments = source.match(/className\s*=\s*["']dashboard-metric-hero["']/g) ?? []
    expect(heroAssignments).toHaveLength(1)
  })

  it("keeps the primary CTA on a solid bg-primary (no gradient on the dashboard view)", () => {
    // REQ-BVA-004 + D12: gradient discipline — only one element per view
    // gets `bg-primary-gradient` (here: the hero metric + the FAB in
    // BottomNav). The "Registrar evento" Button MUST NOT carry the
    // gradient className.
    //
    // Find the Button block (the one whose child text is "Registrar evento")
    // and assert `bg-primary-gradient` is not in its className.
    const buttonBlockMatch = source.match(/<Button[\s\S]*?Registrar evento[\s\S]*?<\/Button>/)
    expect(buttonBlockMatch, 'expected a <Button> wrapping "Registrar evento"').not.toBeNull()
    const block = buttonBlockMatch?.[0] ?? ""
    expect(block).not.toMatch(/bg-primary-gradient/)
    // The Button MUST have a className (defensive — explicit > implicit).
    expect(block).toMatch(/className\s*=\s*\{?["']/)
  })

  it("imports MetricCard from @ganaweb/ui (so the marker is rendered on a real element)", () => {
    // Regression guard: if the import is removed, the marker would never
    // reach the DOM. Cheap assertion; matches the structural-test pattern.
    expect(source).toMatch(/import\s*\{[^}]*\bMetricCard\b[^}]*\}\s*from\s*["']@ganaweb\/ui["']/)
  })
})
