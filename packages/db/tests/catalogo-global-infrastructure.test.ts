import { getTableName } from "drizzle-orm"
import { describe, expect, it } from "vitest"
import { DrizzleCatalogoGlobalAdapter } from "../src/catalogo-global-infrastructure.js"
import { configKeyValues } from "../src/schema/index.js"

type Row = { id: string; key: string; value: string | null }

function conditionContains(condition: unknown, column: string, value: unknown): boolean {
  if (!condition || typeof condition !== "object") return false
  const chunks = (condition as { queryChunks?: unknown[] }).queryChunks ?? []
  return chunks.some(
    (chunk, index) =>
      conditionContains(chunk, column, value) ||
      ((chunk as { name?: string }).name === column &&
        chunks.slice(index + 1).some((next) => (next as { value?: unknown }).value === value)),
  )
}

function fakeDb(rows: readonly Row[], failure?: Error) {
  let condition: unknown
  return {
    select: () => ({
      from: (table: unknown) => {
        expect(getTableName(table as never)).toBe("config_key_values")
        return {
          where: (nextCondition: unknown) => {
            condition = nextCondition
            return failure ? Promise.reject(failure) : Promise.resolve(rows)
          },
        }
      },
    }),
    assertGlobalActiveSexoQuery: () => {
      expect(conditionContains(condition, "opcion", "sexo")).toBe(true)
      expect(conditionContains(condition, "activo", 1)).toBe(true)
    },
  }
}

describe("DrizzleCatalogoGlobalAdapter", () => {
  it("reads only active global sexo rows and maps key to label source with raw value", async () => {
    const db = fakeDb([{ id: "hembra", key: "Hembra", value: "1" }])

    await expect(
      new DrizzleCatalogoGlobalAdapter(db as never).listarActivos("sexo"),
    ).resolves.toEqual([{ id: "hembra", key: "Hembra", value: "1" }])
    db.assertGlobalActiveSexoQuery()
  })

  it("propagates database failures", async () => {
    await expect(
      new DrizzleCatalogoGlobalAdapter(
        fakeDb([], new Error("database unavailable")) as never,
      ).listarActivos("sexo"),
    ).rejects.toThrow("database unavailable")
  })
})
