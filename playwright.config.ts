import { defineConfig, devices } from "@playwright/test"

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 4173)
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  // Cold-start de Vite SSR + hidratación: los flujos de configuración hacen
  // varias navegaciones y cada ruta compila bajo demanda en dev.
  timeout: 120_000,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `pnpm --filter @ganaweb/ui build && PLAYWRIGHT_TEST=1 GANAWEB_E2E_ANIMALS=1 pnpm --filter @ganaweb/web dev --host 127.0.0.1 --port ${PORT} --force & app_pid=$!; trap 'kill $app_pid' EXIT; until curl --fail --silent '${baseURL}/api/fincas/finca-1/animales?q=MT-122&sort=codigo%3Aasc' >/dev/null; do sleep 1; done; wait $app_pid`,
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: false,
  },
  projects: [
    {
      name: "animales-desktop",
      testMatch: /animales\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
    {
      name: "animales-mobile",
      testMatch: /animales\.spec\.ts/,
      use: { ...devices["Pixel 5"] },
    },
    // Issue #152 (RF-CONFIG-MAESTROS v1.0): suite E2E de Configuración ·
    // Maestros contra la BD real (finca-1 del fixture de configuración).
    {
      name: "configuracion-desktop",
      testMatch: /configuracion\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
    {
      name: "configuracion-mobile",
      testMatch: /configuracion\.spec\.ts/,
      use: { ...devices["Pixel 5"] },
    },
  ],
})
