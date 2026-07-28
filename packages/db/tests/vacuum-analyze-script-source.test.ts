import { access, readFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { FIXTURE_VERSION } from "../src/benchmark/animal-listado.js"
import { assertDisposableBenchmarkTarget } from "../src/benchmark/run-animal-listado.js"

const here = dirname(fileURLToPath(import.meta.url))
const packageRoot = resolve(here, "..")

describe("vacuum-analyze script source invariants", () => {
  const scriptPath = resolve(packageRoot, "scripts/vacuum-analyze.ts")

  it("part A: the maintenance script does not call sql.begin() when it exists", async () => {
    let exists = true
    try {
      await access(scriptPath)
    } catch {
      exists = false
    }
    if (!exists) {
      // Script hasn't been created yet — vacuously passes until Phase 2 lands.
      return
    }
    const source = await readFile(scriptPath, "utf8")
    expect(source).not.toMatch(/\.begin\(/)
  })

  it("part B: the §11 benchmark test does not import the strict-IOS helper", async () => {
    const testPath = resolve(packageRoot, "tests/animal-listado-benchmark.test.ts")
    const source = await readFile(testPath, "utf8")
    expect(source).not.toContain("assertS02OrderedIndexOnlyScanPlan")
  })

  it("part C: drift sentinels lock FIXTURE_VERSION and assertDisposableBenchmarkTarget identity", () => {
    expect(FIXTURE_VERSION).toBe("rf-anim-list-11-v2")
    expect(typeof assertDisposableBenchmarkTarget).toBe("function")
  })
})
