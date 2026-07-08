#!/usr/bin/env node
/**
 * `scripts/check-coverage.mjs` — coverage gate para `packages/dominio` (D7).
 *
 * Lee `packages/dominio/coverage/coverage-summary.json` (producido por
 * `vitest run --coverage` con provider `v8`) y falla si `lines.pct < 90`.
 *
 * Exit codes:
 *   0 → coverage ≥ 90% en dominio
 *   1 → coverage < 90% (o el archivo no existe / es inválido)
 *
 * Uso local:
 *   pnpm --filter @ganaweb/dominio test -- --coverage
 *   node scripts/check-coverage.mjs
 *
 * Uso en CI:
 *   pnpm --filter @ganaweb/dominio exec vitest run --coverage \\
 *     && node scripts/check-coverage.mjs
 *
 * Por qué este script (no vitest.config threshold):
 *   - El threshold de vitest FALLA el test suite con un mensaje
 *     confuso. Este script produce un mensaje claro y permite
 *     separar "tests corren" de "gate de cobertura".
 *   - El threshold queda en vitest.config.ts COMO salvaguarda
 *     adicional; este script es la decisión final del gate.
 *
 * Path del coverage-summary.json (default):
 *   packages/dominio/coverage/coverage-summary.json
 *
 * Override: `COVERAGE_SUMMARY=/path/to/coverage-summary.json`
 */

import { readFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")

const THRESHOLD_PCT = 90
const SUMMARY_PATH =
  process.env.COVERAGE_SUMMARY ?? join(ROOT, "packages/dominio/coverage/coverage-summary.json")

async function main() {
  let raw
  try {
    raw = await readFile(SUMMARY_PATH, "utf8")
  } catch (err) {
    console.error(
      `[check-coverage] Cannot read ${SUMMARY_PATH}. Run \`pnpm --filter @ganaweb/dominio exec vitest run --coverage\` first.`,
    )
    console.error(`[check-coverage] Underlying error: ${err.message}`)
    process.exit(1)
  }

  let summary
  try {
    summary = JSON.parse(raw)
  } catch (err) {
    console.error(`[check-coverage] Invalid JSON in ${SUMMARY_PATH}: ${err.message}`)
    process.exit(1)
  }

  const total = summary.total
  if (!total) {
    console.error(`[check-coverage] No "total" key in coverage summary.`)
    process.exit(1)
  }

  const linesPct = total.lines?.pct
  const branchesPct = total.branches?.pct
  const functionsPct = total.functions?.pct
  const statementsPct = total.statements?.pct

  if (typeof linesPct !== "number") {
    console.error("[check-coverage] total.lines.pct missing or not a number.")
    process.exit(1)
  }

  const lineOk = linesPct >= THRESHOLD_PCT
  const status = lineOk ? "PASS" : "FAIL"
  const report = [
    `[check-coverage] dominio coverage: lines=${linesPct}% branches=${branchesPct ?? "?"}% functions=${functionsPct ?? "?"}% statements=${statementsPct ?? "?"}%`,
    `[check-coverage] gate (lines >= ${THRESHOLD_PCT}%): ${status}`,
  ]

  if (lineOk) {
    console.log(report.join("\n"))
    process.exit(0)
  } else {
    console.error(report.join("\n"))
    console.error(
      "[check-coverage] Coverage below threshold. Add tests for uncovered lines in packages/dominio/src/.",
    )
    process.exit(1)
  }
}

main().catch((err) => {
  console.error("[check-coverage] uncaught error:", err)
  process.exit(1)
})
