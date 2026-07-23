import { getTableName } from "drizzle-orm"
import { describe, expect, it } from "vitest"
import { DrizzleCatalogoAnimalMaestroAdapter } from "../src/catalogo-animal-maestro-infrastructure.js"
import {
  configCalidadAnimal,
  configColores,
  configRazas,
  configTiposExplotacion,
} from "../src/schema/index.js"

type RazaRow = {
  id: string
  nombre: string
  descripcion: string | null
  origen: string | null
  tipoProduccion: string | null
  activo: number
}

type ColorRow = {
  id: string
  nombre: string
  codigo: string | null
  activo: number
}

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

function fakeDb(rows: readonly RazaRow[], failure?: Error) {
  let condition: unknown
  let orderedBy = false
  return {
    select: () => ({
      from: (table: unknown) => {
        expect(getTableName(table as never)).toBe("config_razas")
        return {
          where: (nextCondition: unknown) => {
            condition = nextCondition
            return {
              orderBy: () => {
                orderedBy = true
                return failure ? Promise.reject(failure) : Promise.resolve(rows)
              },
            }
          },
        }
      },
    }),
    assertActiveRazaQuery: () => {
      expect(conditionContains(condition, "activo", 1)).toBe(true)
      expect(orderedBy).toBe(true)
    },
  }
}

function fakeColorDb(rows: readonly ColorRow[], failure?: Error) {
  let condition: unknown
  let orderedBy = false
  return {
    select: () => ({
      from: (table: unknown) => {
        expect(getTableName(table as never)).toBe("config_colores")
        return {
          where: (nextCondition: unknown) => {
            condition = nextCondition
            return {
              orderBy: () => {
                orderedBy = true
                return failure ? Promise.reject(failure) : Promise.resolve(rows)
              },
            }
          },
        }
      },
    }),
    assertActiveColorQuery: () => {
      expect(conditionContains(condition, "activo", 1)).toBe(true)
      expect(orderedBy).toBe(true)
    },
  }
}

const activeRaza: RazaRow = {
  id: "raza-angus",
  nombre: "Angus",
  descripcion: "Aberdeen Angus",
  origen: null,
  tipoProduccion: null,
  activo: 1,
}

const activeColor: ColorRow = {
  id: "col-negro",
  nombre: "Negro",
  codigo: "#000000",
  activo: 1,
}

type TipoExplotacionRow = {
  id: string
  nombre: string
  activo: number
}

function fakeTipoExplotacionDb(rows: readonly TipoExplotacionRow[]) {
  let whereCalled = false
  let orderedBy = false
  const sortedRows = [...rows].sort((a, b) => a.nombre.localeCompare(b.nombre, "es-CO"))
  return {
    select: () => ({
      from: (table: unknown) => {
        expect(getTableName(table as never)).toBe("config_tipos_explotacion")
        return {
          where: () => {
            whereCalled = true
            return {
              orderBy: () => {
                orderedBy = true
                return Promise.resolve(sortedRows)
              },
            }
          },
          orderBy: () => {
            orderedBy = true
            return Promise.resolve(sortedRows)
          },
        }
      },
    }),
    assertNoActiveFilter: () => {
      expect(whereCalled).toBe(false)
      expect(orderedBy).toBe(true)
    },
  }
}

describe("DrizzleCatalogoAnimalMaestroAdapter", () => {
  it("reads only active raza rows sorted by nombre and maps to RazaOption DTO", async () => {
    const db = fakeDb([activeRaza])

    const result = await new DrizzleCatalogoAnimalMaestroAdapter(db as never).listarActivos("raza")

    expect(result).toEqual([
      {
        id: "raza-angus",
        nombre: "Angus",
        activo: true,
        descripcion: "Aberdeen Angus",
        origen: null,
        tipoProduccion: null,
      },
    ])
    db.assertActiveRazaQuery()
  })

  it("propagates database failures", async () => {
    const db = fakeDb([], new Error("database unavailable"))
    await expect(
      new DrizzleCatalogoAnimalMaestroAdapter(db as never).listarActivos("raza"),
    ).rejects.toThrow("database unavailable")
  })

  it("reads only active color rows sorted by nombre and maps to ColorOption with meta.hex from codigo", async () => {
    const db = fakeColorDb([activeColor])

    const result = await new DrizzleCatalogoAnimalMaestroAdapter(db as never).listarActivos("color")

    expect(result).toEqual([
      {
        id: "col-negro",
        nombre: "Negro",
        activo: true,
        meta: { hex: "#000000" },
      },
    ])
    db.assertActiveColorQuery()
  })

  it("reads all tipoExplotacion rows (no activo filter) sorted by nombre and maps to CatalogoMaestroOption", async () => {
    const db = fakeTipoExplotacionDb([
      { id: "te-leche", nombre: "Leche", activo: 1 },
      { id: "te-cria", nombre: "Cría", activo: 0 },
    ])

    const result = await new DrizzleCatalogoAnimalMaestroAdapter(db as never).listarActivos(
      "tipoExplotacion",
    )

    expect(result).toEqual([
      { id: "te-cria", nombre: "Cría", activo: false },
      { id: "te-leche", nombre: "Leche", activo: true },
    ])
    db.assertNoActiveFilter()
  })
})
