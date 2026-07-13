// Vitest config for `@ganaweb/db`.
//
// Provider: v8 (zero-instrumentation, integrates cleanly with Turborepo).
// Coverage scope: ONLY ./src/** excluding the seed script and the lazy
// client Proxy (the Proxy is exercised at type-check time, not at unit
// test time — the integration test under tests/ covers the runtime
// behavior).
//
// Threshold: NOT enforced in this package — D7 keeps the coverage gate
// scoped to `packages/dominio` (the only package with pure logic this
// change). `db` is integration-tested via the `tests/duplicate-insert.test.ts`
// suite which requires a real Postgres (DB_SMOKE=true), so local
// `vitest run` should never block on coverage.
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    allowOnly: false,
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts"],
      exclude: ["src/seed/**", "src/**/*.d.ts", "src/**/index.ts", "src/client.ts"],
    },
  },
})
