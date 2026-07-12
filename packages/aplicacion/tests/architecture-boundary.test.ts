import { readFile, readdir } from "node:fs/promises"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const forbiddenImports = [
  "@ganaweb/db",
  "@ganaweb/ui",
  "@tanstack/react-router",
  "@tanstack/react-start",
  "react",
]

async function listTsFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) return listTsFiles(path)
      return Promise.resolve(entry.isFile() && path.endsWith(".ts") ? [path] : [])
    }),
  )
  return nested.flat()
}

describe("application architecture boundary", () => {
  it("does not import DB, route, or UI code from packages/aplicacion/src", async () => {
    const files = await listTsFiles(join(process.cwd(), "src"))
    expect(files.length).toBeGreaterThan(0)

    const violations: string[] = []
    for (const file of files) {
      const source = await readFile(file, "utf8")
      for (const forbiddenImport of forbiddenImports) {
        if (
          source.includes(`from "${forbiddenImport}`) ||
          source.includes(`from '${forbiddenImport}`)
        ) {
          violations.push(`${file}: ${forbiddenImport}`)
        }
      }
    }

    expect(violations).toEqual([])
  })
})
