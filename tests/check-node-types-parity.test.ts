import { spawn } from "node:child_process"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { afterAll, beforeAll, describe, expect, test } from "vitest"

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, "..")
const SCRIPT = join(REPO_ROOT, "scripts", "check-node-types-parity.mjs")
const FIXTURE_DIR = join(REPO_ROOT, "tests", "fixtures", "check-node-types-parity")

type SpawnResult = { code: number | null; stdout: string; stderr: string }

function runScript(cwd: string): Promise<SpawnResult> {
  return new Promise((resolveProm, rejectProm) => {
    const child = spawn("node", [SCRIPT, cwd], { encoding: "utf8" })
    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (chunk) => {
      stdout += chunk
    })
    child.stderr.on("data", (chunk) => {
      stderr += chunk
    })
    child.on("error", rejectProm)
    child.on("close", (code) => {
      resolveProm({ code, stdout, stderr })
    })
  })
}

describe("scripts/check-node-types-parity.mjs", () => {
  beforeAll(() => {
    // Guard: the script must exist before we run any test. If missing,
    // the test fails on the EXISTENCE of the script (true TDD red).
    // We don't pre-check this here — we let each test run and assert
    // on the real subprocess output, so a missing script bubbles up
    // as a clear ENOENT (test 1 fails) rather than a confusing setup
    // error.
  })

  afterAll(() => {
    // No global teardown — each test is independent.
  })

  test("exits 0 on matching fixture (root engines.node 24 + workspace @types/node ^24)", async () => {
    const result = await runScript(join(FIXTURE_DIR, "matching"))
    expect(result.code).toBe(0)
  })

  test("exits 1 on drifting fixture and stderr names the offending package.json", async () => {
    const result = await runScript(join(FIXTURE_DIR, "drifting"))
    expect(result.code).toBe(1)
    // The error message MUST mention the offending file so a reviewer
    // can find the drift at a glance. We accept either a POSIX path
    // (apps/web/package.json) or a backslash path (Windows CI).
    expect(result.stderr).toMatch(/apps[\\/]web[\\/]package\.json/)
  })

  test("exits 0 on root-only fixture (no apps/ or packages/ subdirs)", async () => {
    const result = await runScript(join(FIXTURE_DIR, "root-only"))
    expect(result.code).toBe(0)
  })
})
