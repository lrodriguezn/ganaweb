import { defineConfig, devices } from "@playwright/test"

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 4173)
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `pnpm --filter @ganaweb/ui build && PLAYWRIGHT_TEST=1 GANAWEB_E2E_ANIMALS=1 pnpm --filter @ganaweb/web dev --host 127.0.0.1 --port ${PORT} --force`,
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
  ],
})
