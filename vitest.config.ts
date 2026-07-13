// Vitest config for the repo root.
//
// Picks up root-level test files under `tests/` (NOT `tests/e2e/`,
// which is Playwright). Used by the node-types parity check test
// (tests/check-node-types-parity.test.ts) and any future root-level
// infrastructure tests.
//
// Per-package vitest configs (packages/*/vitest.config.ts) continue
// to govern per-package unit tests; turbo test invokes those.
//
// Why allowOnly: false: matches the project-wide strict-TDD rule
// (see openspec/config.yaml rules.apply and packages/dominio/vitest.config.ts).
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    allowOnly: false,
    include: ["tests/**/*.test.ts"],
    exclude: [
      "tests/e2e/**",
      "node_modules/**",
      "**/node_modules/**",
      "**/dist/**",
    ],
  },
})
