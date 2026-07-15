/**
 * Vitest config for @ganaweb/web.
 *
 * Used for the create-route E2E test (apps/web/tests/animal-create-e2e.test.tsx).
 * The web package's primary test runner is `tsx` with `node:assert/strict` for the
 * unit-style harness/route files (animal-web-flow.test.ts, auth-*.test.ts). The
 * E2E test needs a DOM (jsdom) and React Testing Library to mount the create
 * route, stub the action, submit the form, and assert the per-field ARIA wiring
 * that the create route forwards to AnimalFormScreen.
 *
 * The default environment is `node` to keep parity with the existing tsx-based
 * tests; the E2E test uses a per-file `// @vitest-environment jsdom` directive.
 * The include pattern is scoped to the E2E test so vitest does not re-run the
 * tsx-based unit tests (which would double-execute the run() at the bottom of
 * each file).
 */
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  test: {
    allowOnly: false,
    include: ["tests/animal-create-e2e.test.tsx"],
    environment: "node",
  },
})
