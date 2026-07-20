import { getTableName } from "drizzle-orm"
import { describe, expect, it } from "vitest"
import { DrizzleCatalogoFincaAdapter } from "../src/catalogo-finca-infrastructure.js"
import { grupos, lotes, lugaresCompras, potreros, sectores } from "../src/schema/index.js"

type PotreroRow = {
  id: string
  fincaId: string
  codigo: string
  nombre: string
  areaHectareas: number | null
  activo: number
}

type SectorRow = {
  id: string
  fincaId: string
  codigo: string
  nombre: string
  activo: number
}

type LoteRow = {
  id: string
  fincaId: string
  nombre: string
  activo: number
}

type GrupoRow = {
  id: string
  fincaId: string
  nombre: string
  activo: number
}

type LugarCompraRow = {
  id: string
  fincaId: string
  nombre: string
  ubicacion: string | null
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

function fakePotreroDb(
  rows: readonly PotreroRow[],
  expectedTableName: string,
  fincaId: string,
  failure?: Error,
) {
  let condition: unknown
  let orderedBy = false
  return {
    select: () => ({
      from: (table: unknown) => {
        expect(getTableName(table as never)).toBe(expectedTableName)
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
    assertFincaQuery: () => {
      expect(conditionContains(condition, "activo", 1)).toBe(true)
      expect(conditionContains(condition, "finca_id", fincaId)).toBe(true)
      expect(orderedBy).toBe(true)
    },
  }
}

function fakeSectorDb(
  rows: readonly SectorRow[],
  expectedTableName: string,
  fincaId: string,
  failure?: Error,
) {
  let condition: unknown
  let orderedBy = false
  return {
    select: () => ({
      from: (table: unknown) => {
        expect(getTableName(table as never)).toBe(expectedTableName)
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
    assertFincaQuery: () => {
      expect(conditionContains(condition, "activo", 1)).toBe(true)
      expect(conditionContains(condition, "finca_id", fincaId)).toBe(true)
      expect(orderedBy).toBe(true)
    },
  }
}

function fakeFincaDb<T extends { id: string; nombre: string; activo: number; fincaId: string }>(
  rows: readonly T[],
  expectedTableName: string,
  fincaId: string,
  failure?: Error,
) {
  let condition: unknown
  let orderedBy = false
  return {
    select: () => ({
      from: (table: unknown) => {
        expect(getTableName(table as never)).toBe(expectedTableName)
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
    assertFincaQuery: () => {
      expect(conditionContains(condition, "activo", 1)).toBe(true)
      expect(conditionContains(condition, "finca_id", fincaId)).toBe(true)
      expect(orderedBy).toBe(true)
    },
  }
}

const activePotrero: PotreroRow = {
  id: "pot-esp-1",
  fincaId: "finca-esperanza",
  codigo: "POT-1",
  nombre: "Potrero La Loma",
  areaHectareas: 12,
  activo: 1,
}

const activeSector: SectorRow = {
  id: "sec-esp-a",
  fincaId: "finca-esperanza",
  codigo: "SEC-A",
  nombre: "Sector Norte",
  activo: 1,
}

const activeLote: LoteRow = {
  id: "lote-esp-2",
  fincaId: "finca-esperanza",
  nombre: "Lote 2 - Ceba",
  activo: 1,
}

const activeGrupo: GrupoRow = {
  id: "grupo-esp-ordeno",
  fincaId: "finca-esperanza",
  nombre: "Grupo de ordeño",
  activo: 1,
}

const activeLugarCompra: LugarCompraRow = {
  id: "lc-esp-feria",
  fincaId: "finca-esperanza",
  nombre: "Feria de Medellín",
  ubicacion: null,
  activo: 1,
}

describe("DrizzleCatalogoFincaAdapter", () => {
  it("listarPorFinca(fincaId, 'potrero') returns only potreros for that finca sorted by nombre", async () => {
    const db = fakePotreroDb([activePotrero], "potreros", "finca-esperanza")

    const result = await new DrizzleCatalogoFincaAdapter(db as never).listarPorFinca(
      "finca-esperanza",
      "potrero",
    )

    expect(result).toEqual([
      {
        id: "pot-esp-1",
        nombre: "Potrero La Loma",
        codigo: "POT-1",
        fincaId: "finca-esperanza",
        activo: true,
        areaHectareas: 12,
      },
    ])
    db.assertFincaQuery()
  })

  it("listarPorFinca(fincaId, 'sector') returns only sectors for that finca sorted by nombre", async () => {
    const db = fakeSectorDb([activeSector], "sectores", "finca-esperanza")

    const result = await new DrizzleCatalogoFincaAdapter(db as never).listarPorFinca(
      "finca-esperanza",
      "sector",
    )

    expect(result).toEqual([
      {
        id: "sec-esp-a",
        nombre: "Sector Norte",
        codigo: "SEC-A",
        fincaId: "finca-esperanza",
        activo: true,
      },
    ])
    db.assertFincaQuery()
  })

  it("propagates database failures", async () => {
    const db = fakePotreroDb([], "potreros", "finca-esperanza", new Error("database unavailable"))
    await expect(
      new DrizzleCatalogoFincaAdapter(db as never).listarPorFinca("finca-esperanza", "potrero"),
    ).rejects.toThrow("database unavailable")
  })

  it("listarPorFinca(fincaId, 'lote') returns only lotes for that finca sorted by nombre (no codigo)", async () => {
    const db = fakeFincaDb([activeLote], "lotes", "finca-esperanza")

    const result = await new DrizzleCatalogoFincaAdapter(db as never).listarPorFinca(
      "finca-esperanza",
      "lote",
    )

    expect(result).toEqual([
      {
        id: "lote-esp-2",
        nombre: "Lote 2 - Ceba",
        fincaId: "finca-esperanza",
        activo: true,
      },
    ])
    db.assertFincaQuery()
  })

  it("listarPorFinca(fincaId, 'grupo') returns only grupos for that finca sorted by nombre (no codigo)", async () => {
    const db = fakeFincaDb([activeGrupo], "grupos", "finca-esperanza")

    const result = await new DrizzleCatalogoFincaAdapter(db as never).listarPorFinca(
      "finca-esperanza",
      "grupo",
    )

    expect(result).toEqual([
      {
        id: "grupo-esp-ordeno",
        nombre: "Grupo de ordeño",
        fincaId: "finca-esperanza",
        activo: true,
      },
    ])
    db.assertFincaQuery()
  })

  it("listarPorFinca(fincaId, 'lugarCompra') maps ubicacion to direccion (no codigo)", async () => {
    const lugar: LugarCompraRow = {
      ...activeLugarCompra,
      ubicacion: "Vereda El Silencio",
    }
    const db = fakeFincaDb([lugar], "lugares_compras", "finca-esperanza")

    const result = await new DrizzleCatalogoFincaAdapter(db as never).listarPorFinca(
      "finca-esperanza",
      "lugarCompra",
    )

    expect(result).toEqual([
      {
        id: "lc-esp-feria",
        nombre: "Feria de Medellín",
        fincaId: "finca-esperanza",
        activo: true,
        direccion: "Vereda El Silencio",
      },
    ])
    db.assertFincaQuery()
  })
})
