#!/usr/bin/env node
/**
 * `apps/web/scripts/health-check.mjs` — smoke test de CI (PR5.T5).
 *
 * Fases (en orden):
 *   1. `migrate` — aplica migraciones Drizzle a la DB de CI
 *      (`packages/db`).
 *   2. `seed` — corre `seed-v3.ts` (2 fincas, 0 animales por D11).
 *   3. `dev` — arranca el dev server de TanStack Start en background.
 *   4. `probe` — hace GET a `/api/health` y valida la respuesta.
 *   5. `cleanup` — mata el dev server y sale con código 0/1.
 *
 * Variables de entorno:
 *   - `DATABASE_URL`  (obligatoria)  URL de Postgres.
 *   - `HEALTH_PORT`   (opcional)     Puerto del dev server. Default 3000.
 *   - `HEALTH_TIMEOUT_MS` (opcional) Timeout del probe. Default 10_000.
 *
 * Exit codes:
 *   0 → smoke completo: migrate + seed + 200/db:"ok"
 *   1 → cualquier paso falló (incluye 503/db:"error")
 *
 * Uso local (dev DB):
 *   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ganaweb \\
 *     node apps/web/scripts/health-check.mjs
 *
 * En CI se invoca desde `.github/workflows/ci.yml` con `postgres:17` como
 * service container. Ver `design.md` §CI Pipeline Design.
 */

import { spawn } from "node:child_process"
import { setTimeout as wait } from "node:timers/promises"

const PORT = Number(process.env.HEALTH_PORT ?? 3000)
const TIMEOUT_MS = Number(process.env.HEALTH_TIMEOUT_MS ?? 10_000)
const DATABASE_URL = process.env.DATABASE_URL ?? ""
const ROOT = new URL("../..", import.meta.url).pathname

if (!DATABASE_URL) {
  console.error("[health-check] DATABASE_URL is not set. Aborting.")
  process.exit(1)
}

/**
 * Corre un comando y propaga el exit code.
 * @param {string} cmd
 * @param {string[]} args
 * @param {string} cwd
 * @returns {Promise<number>}
 */
function run(cmd, args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, stdio: "inherit", env: process.env })
    child.on("close", (code) => resolve(code ?? 1))
  })
}

async function waitForHealth(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url)
      if (res.status === 200) {
        const body = await res.json()
        if (body?.db === "ok") return { ok: true, body }
        return { ok: false, status: res.status, body }
      }
      // 503 is "expected" while DB is down — keep waiting
      if (res.status === 503) {
        await wait(500)
        continue
      }
      return { ok: false, status: res.status, body: await res.text() }
    } catch (_err) {
      // Server not up yet — keep polling
      await wait(500)
    }
  }
  return { ok: false, status: 0, body: "timeout" }
}

async function main() {
  console.log("[health-check] === Phase 1/3: migrate ===")
  const migrateCode = await run("pnpm", ["--filter", "@ganaweb/db", "migrate"], ROOT)
  if (migrateCode !== 0) {
    console.error(`[health-check] migrate failed (exit ${migrateCode})`)
    process.exit(1)
  }

  console.log("[health-check] === Phase 2/3: seed ===")
  const seedCode = await run("pnpm", ["--filter", "@ganaweb/db", "seed"], ROOT)
  if (seedCode !== 0) {
    console.error(`[health-check] seed failed (exit ${seedCode})`)
    process.exit(1)
  }

  console.log("[health-check] === Phase 3/3: dev server + probe ===")
  const dev = spawn("pnpm", ["--filter", "@ganaweb/web", "dev"], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, PORT: String(PORT) },
  })

  // Drain stdout/stderr so the child doesn't block on pipe full
  dev.stdout.on("data", (b) => process.stdout.write(`[web] ${b}`))
  dev.stderr.on("data", (b) => process.stderr.write(`[web] ${b}`))

  try {
    const result = await waitForHealth(`http://localhost:${PORT}/api/health`, TIMEOUT_MS)
    if (!result.ok) {
      console.error(
        `[health-check] /api/health did not return 200/db:ok — status=${result.status} body=${JSON.stringify(result.body)}`,
      )
      process.exit(1)
    }
    console.log(`[health-check] OK: ${JSON.stringify(result.body)}`)
  } finally {
    dev.kill("SIGTERM")
    // Give the child ~2s to exit cleanly before SIGKILL
    await wait(2000)
    if (!dev.killed) dev.kill("SIGKILL")
  }
}

main().catch((err) => {
  console.error("[health-check] uncaught error:", err)
  process.exit(1)
})
