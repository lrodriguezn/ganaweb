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
 * The include pattern is scoped so vitest does not re-run the tsx-based unit
 * tests (which would double-execute the run() at the bottom of each file).
 *
 * `animal-listado-route.test.tsx` (#108, PR 1) is a vitest suite covering the
 * typed #107 route adapter and the fail-closed visual permission projection;
 * it runs in the node environment (pure logic, no DOM).
 *
 * `animal-listado-route-integration.test.tsx` (#108, PR 3) mounts the exported
 * `AnimalsListRouteView` under jsdom and stubs the #107 transport at the
 * `fetch` seam: the desktop branch consumes #107 through the typed adapter,
 * the mobile branch consumes the loader-resolved #155 first page (issue #156),
 * and ficha navigation is spied.
 */
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  test: {
    allowOnly: false,
    include: [
      "tests/animal-create-e2e.test.tsx",
      "tests/animal-listado-route.test.tsx",
      "tests/animal-listado-route-integration.test.tsx",
      // redesign-ficha-animal slice 1 — ficha route view: EventDrawer wiring,
      // breadcrumb navigation callback, drawer close without navigation.
      "tests/animal-ficha-route-integration.test.tsx",
      // #111 PR2 — server exportadores (pure logic, node env). Scoped glob so
      // the tsx-based unit tests (run separately) are not re-executed here.
      "tests/animal-exportacion-*.test.ts",
      // #110 PR1 — preference normalization (unit) and HTTP contract tests.
      "src/server/animal-list-preferences.test.ts",
      "src/server/animal-list-preferences-http.test.ts",
      // #110 PR2 — preference lifecycle + pagination/column mutation builders.
      "src/features/animal-listado/animal-listado-route.test.tsx",
      // #149 — hub Configuración · Maestros: vistas desktop/mobile, sub-menú
      // de grupos (S-1), estados CM-014 y redirects RBAC de las rutas.
      "tests/configuracion-hub-route.test.tsx",
      // #157 — mobile list client adapter (URL building + #155 outcome mapping).
      "tests/animal-mobile-list-adapter.test.ts",
      // #158 — mobile list state machine: infinite-scroll accumulation,
      // distinguishable states (LM-030) and LM-023 error semantics.
      "tests/animal-mobile-list-states.test.tsx",
    ],
    environment: "node",
  },
})
