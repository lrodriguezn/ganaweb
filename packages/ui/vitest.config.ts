import { defineConfig } from "vitest/config"

/**
 * Vitest config for @ganaweb/ui.
 *
 * The only test in this package is `tests/tokens.test.ts` (PR4.T5) — a
 * static check that asserts the migrated design tokens are present in
 * globals.css and that no `dark:` Tailwind variant slipped into the
 * migrated source. No JSX is executed; the test reads files from disk.
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
