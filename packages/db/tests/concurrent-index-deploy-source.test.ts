import { readFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const here = dirname(fileURLToPath(import.meta.url))
const packageRoot = resolve(here, "..")

describe("concurrent-index-deploy script source invariants", () => {
  const scriptPath = resolve(packageRoot, "scripts/concurrent-index-deploy.ts")

  it("builds indexes with CREATE INDEX CONCURRENTLY", async () => {
    const source = await readFile(scriptPath, "utf8")
    expect(source).toContain("CREATE INDEX CONCURRENTLY")
  })

  it("recovers interrupted builds with REINDEX CONCURRENTLY and indisvalid checks", async () => {
    const source = await readFile(scriptPath, "utf8")
    expect(source).toContain("REINDEX CONCURRENTLY")
    expect(source).toContain("indisvalid")
  })

  it("never wraps the concurrent build in a transaction", async () => {
    const source = await readFile(scriptPath, "utf8")
    expect(source).not.toMatch(/\.begin\(/)
    expect(source).not.toMatch(/\bBEGIN\b/)
  })
})
