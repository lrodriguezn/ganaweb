import { defineConfig } from "vitest/config"

/**
 * Vitest config for @ganaweb/ui.
 *
 * PR4.T5: `tests/tokens.test.ts` — static check that asserts the
 * migrated design tokens are present in globals.css and that no `dark:`
 * Tailwind variant slipped into the migrated source. No JSX is executed;
 * the test reads files from disk. Runs in `node` environment.
 *
 * PR1.T-001.4 + T-001.6: extended token tests and the anti-flash script
 * test both need a DOM. The anti-flash test mounts a <html> element and
 * runs the IIFE body against it — jsdom is required for that. We use
 * per-file `// @vitest-environment jsdom` directives inside the anti-
 * flash test rather than flipping the default to keep the structural
 * tokens test on the cheap `node` environment.
 *
 * No coverage threshold: tokens-test is structural, not behavioral. D7
 * keeps the coverage gate scoped to `packages/dominio`.
 */
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
})
