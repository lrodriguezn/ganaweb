/**
 * Tests unitarios del adaptador de listado de maestros (issue #148) con
 * una db FALSA (sin Postgres): verifican el shape de las queries
 * (filtros, columnas de búsqueda, orden, paginación) construidas sobre el
 * registro data-driven `FAMILIAS`. El comportamiento real contra Postgres
 * (ILIKE case-insensitive, orden real, count) vive en
 * `maestro-listado-smoke.test.ts`.
 */

import { getTableName } from "drizzle-orm"
import { describe, expect, it } from "vitest"
import { DrizzleMaestroListadoAdapter } from "../src/maestro-listado-infrastructure.js"

interface OperacionSelect {
  readonly tipo: "select"
  readonly tabla: string
  readonly campos: Record<string, unknown>
  readonly condicion: unknown
  orderBy: unknown[]
  limit: number | undefined
  offset: number | undefined
}

interface OperacionCount {
  readonly tipo: "count"
  readonly tabla: string
  readonly condicion: unknown
}

type Operacion = OperacionSelect | OperacionCount

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

function conditionHasColumn(condition: unknown, column: string): boolean {
  if (!condition || typeof condition !== "object") return false
  const chunks = (condition as { queryChunks?: unknown[] }).queryChunks ?? []
  return chunks.some(
    (chunk) => (chunk as { name?: string }).name === column || conditionHasColumn(chunk, column),
  )
}

/** Extrae el valor de un patrón ILIKE de un chunk (string, String o Param). */
function patternValue(node: unknown): string | null {
  if (typeof node === "string" || node instanceof String) return String(node)
  if (
    node !== null &&
    typeof node === "object" &&
    typeof (node as { value?: unknown }).value === "string"
  ) {
    return (node as { value: string }).value
  }
  return null
}

/** Patrones que aparecen en los chunks posteriores a la columna. */
function patternsAfterColumn(chunks: readonly unknown[], index: number): string[] {
  const patterns: string[] = []
  for (const next of chunks.slice(index + 1)) {
    const pattern = patternValue(next)
    if (pattern !== null) patterns.push(pattern)
  }
  return patterns
}

/** Patrones ILIKE asociados a una columna dentro de la condición. */
function ilikePatterns(condition: unknown, column: string): string[] {
  const patterns: string[] = []
  const walk = (node: unknown): void => {
    if (!node || typeof node !== "object") return
    const chunks = (node as { queryChunks?: unknown[] }).queryChunks
    if (!Array.isArray(chunks)) return
    chunks.forEach((chunk, index) => {
      if ((chunk as { name?: string }).name === column) {
        patterns.push(...patternsAfterColumn(chunks, index))
      }
      walk(chunk)
    })
  }
  walk(condition)
  return patterns
}

/** Nombre de la columna de cada chunk de orderBy. */
function orderByColumns(orderBy: readonly unknown[]): string[] {
  return orderBy.map((chunk) => {
    let nombre = ""
    const walk = (node: unknown): void => {
      if (!node || typeof node !== "object" || nombre !== "") return
      const n = (node as { name?: string }).name
      if (typeof n === "string") {
        nombre = n
        return
      }
      const chunks = (node as { queryChunks?: unknown[] }).queryChunks
      if (Array.isArray(chunks)) for (const c of chunks) walk(c)
    }
    walk(chunk)
    return nombre
  })
}

function chunkContainsString(chunk: unknown, text: string): boolean {
  if (!chunk || typeof chunk !== "object") return false
  const value = (chunk as { value?: unknown }).value
  if (Array.isArray(value)) return value.some((v) => typeof v === "string" && v.includes(text))
  const chunks = (chunk as { queryChunks?: unknown[] }).queryChunks
  if (Array.isArray(chunks)) return chunks.some((c) => chunkContainsString(c, text))
  return false
}

interface FakeDbOptions {
  readonly filas?: readonly Record<string, unknown>[]
  readonly total?: number
}

function fakeDb(options: FakeDbOptions = {}) {
  const operaciones: Operacion[] = []
  const filasSelect = options.filas ?? []
  const total = options.total ?? 0
  const db = {
    select: (campos: Record<string, unknown>) => ({
      from: (tabla: unknown) => ({
        where: (condicion: unknown) => {
          const nombreTabla = getTableName(tabla as never)
          if ("total" in campos) {
            operaciones.push({ tipo: "count", tabla: nombreTabla, condicion })
            return Promise.resolve([{ total }])
          }
          const operacion: OperacionSelect = {
            tipo: "select",
            tabla: nombreTabla,
            campos,
            condicion,
            orderBy: [],
            limit: undefined,
            offset: undefined,
          }
          operaciones.push(operacion)
          const resolver = () => Promise.resolve(filasSelect)
          return Object.assign(resolver(), {
            orderBy: (...columnas: unknown[]) => {
              operacion.orderBy = columnas
              return Object.assign(resolver(), {
                limit: (n: number) => {
                  operacion.limit = n
                  return Object.assign(resolver(), {
                    offset: (m: number) => {
                      operacion.offset = m
                      return resolver()
                    },
                  })
                },
              })
            },
          })
        },
      }),
    }),
  }
  return { db, operaciones }
}

function operacionSelect(operaciones: readonly Operacion[], indice = 0): OperacionSelect {
  const operacion = operaciones[indice]
  if (operacion?.tipo !== "select") throw new Error("esperaba select")
  return operacion
}

function operacionCount(operaciones: readonly Operacion[]): OperacionCount {
  const operacion = operaciones.find((op) => op.tipo === "count")
  if (operacion?.tipo !== "count") throw new Error("esperaba count")
  return operacion
}

describe("DrizzleMaestroListadoAdapter", () => {
  describe("listar", () => {
    it("familia simple (grupos): filtros base, campos snake_case, orden y paginación default", async () => {
      const filaGrupo = { id: "g1", activo: 1, nombre: "Grupo Uno", descripcion: null }
      const { db, operaciones } = fakeDb({ filas: [filaGrupo], total: 1 })

      const resultado = await new DrizzleMaestroListadoAdapter(db as never).listar(
        "grupos",
        "finca-esperanza",
      )

      const select = operacionSelect(operaciones)
      expect(select.tabla).toBe("grupos")
      expect(Object.keys(select.campos).sort()).toEqual(["activo", "descripcion", "id", "nombre"])
      expect(conditionContains(select.condicion, "finca_id", "finca-esperanza")).toBe(true)
      expect(conditionContains(select.condicion, "activo", 1)).toBe(true)
      expect(ilikePatterns(select.condicion, "nombre")).toEqual([])
      expect(orderByColumns(select.orderBy)).toEqual(["nombre", "id"])
      expect(select.orderBy.every((chunk) => chunkContainsString(chunk, " asc"))).toBe(true)
      expect(select.limit).toBe(25)
      expect(select.offset).toBe(0)

      const count = operacionCount(operaciones)
      expect(count.tabla).toBe("grupos")
      expect(conditionContains(count.condicion, "finca_id", "finca-esperanza")).toBe(true)

      expect(resultado).toEqual({ filas: [filaGrupo], total: 1, pagina: 1, pageSize: 25 })
    })

    it("potreros: la búsqueda añade codigo al ILIKE (OR entre columnas)", async () => {
      const { db, operaciones } = fakeDb()

      await new DrizzleMaestroListadoAdapter(db as never).listar("potreros", "finca-esperanza", {
        busqueda: "  p-01 ",
      })

      const select = operacionSelect(operaciones)
      expect(select.tabla).toBe("potreros")
      expect(ilikePatterns(select.condicion, "nombre")).toEqual(["%p-01%"])
      expect(ilikePatterns(select.condicion, "codigo")).toEqual(["%p-01%"])
    })

    it("propietarios: la búsqueda añade numero_documento al ILIKE", async () => {
      const { db, operaciones } = fakeDb()

      await new DrizzleMaestroListadoAdapter(db as never).listar(
        "propietarios",
        "finca-esperanza",
        { busqueda: "12345678" },
      )

      const select = operacionSelect(operaciones)
      expect(select.tabla).toBe("propietarios")
      expect(ilikePatterns(select.condicion, "nombre")).toEqual(["%12345678%"])
      expect(ilikePatterns(select.condicion, "numero_documento")).toEqual(["%12345678%"])
    })

    it("escapa los comodines LIKE del término de búsqueda", async () => {
      const { db, operaciones } = fakeDb()

      await new DrizzleMaestroListadoAdapter(db as never).listar("grupos", "finca-esperanza", {
        busqueda: "50%_x",
      })

      const select = operacionSelect(operaciones)
      expect(ilikePatterns(select.condicion, "nombre")).toEqual(["%50\\%\\_x%"])
    })

    it("búsqueda vacía o de solo espacios no añade filtro ILIKE", async () => {
      const { db, operaciones } = fakeDb()

      await new DrizzleMaestroListadoAdapter(db as never).listar("grupos", "finca-esperanza", {
        busqueda: "   ",
      })

      const select = operacionSelect(operaciones)
      expect(ilikePatterns(select.condicion, "nombre")).toEqual([])
    })

    it("incluirInactivos quita el filtro activo=1", async () => {
      const { db, operaciones } = fakeDb()

      await new DrizzleMaestroListadoAdapter(db as never).listar("grupos", "finca-esperanza", {
        incluirInactivos: true,
      })

      const select = operacionSelect(operaciones)
      expect(conditionHasColumn(select.condicion, "activo")).toBe(false)
      expect(conditionContains(select.condicion, "finca_id", "finca-esperanza")).toBe(true)
    })

    it("inseminadores: tabla veterinarios + filtro es_inseminador=1 y búsqueda solo por nombre", async () => {
      const { db, operaciones } = fakeDb()

      await new DrizzleMaestroListadoAdapter(db as never).listar(
        "inseminadores",
        "finca-esperanza",
        { busqueda: "vet" },
      )

      const select = operacionSelect(operaciones)
      expect(select.tabla).toBe("veterinarios")
      expect(conditionContains(select.condicion, "es_inseminador", 1)).toBe(true)
      expect(conditionContains(select.condicion, "activo", 1)).toBe(true)
      expect(Object.keys(select.campos)).toContain("es_inseminador")
      expect(ilikePatterns(select.condicion, "nombre")).toEqual(["%vet%"])
      expect(conditionHasColumn(select.condicion, "codigo")).toBe(false)
      expect(conditionHasColumn(select.condicion, "numero_documento")).toBe(false)
    })

    it("paginación: limit/offset según pagina y pageSize, total del count", async () => {
      const { db, operaciones } = fakeDb({ total: 120 })

      const resultado = await new DrizzleMaestroListadoAdapter(db as never).listar(
        "grupos",
        "finca-esperanza",
        { pagina: 3, pageSize: 50 },
      )

      const select = operacionSelect(operaciones)
      expect(select.limit).toBe(50)
      expect(select.offset).toBe(100)
      expect(resultado.total).toBe(120)
      expect(resultado.pagina).toBe(3)
      expect(resultado.pageSize).toBe(50)
    })

    it("pagina < 1 se corrige a 1 (offset 0)", async () => {
      const { db, operaciones } = fakeDb()

      const resultado = await new DrizzleMaestroListadoAdapter(db as never).listar(
        "grupos",
        "finca-esperanza",
        { pagina: 0 },
      )

      const select = operacionSelect(operaciones)
      expect(select.offset).toBe(0)
      expect(resultado.pagina).toBe(1)
    })

    it("devuelve las filas con claves snake_case y NULL → null", async () => {
      const fila = {
        id: "g1",
        activo: 1,
        nombre: "Grupo Uno",
        descripcion: null,
      }
      const { db } = fakeDb({ filas: [fila], total: 1 })

      const resultado = await new DrizzleMaestroListadoAdapter(db as never).listar(
        "grupos",
        "finca-esperanza",
      )

      expect(resultado.filas).toEqual([fila])
      expect(resultado.filas[0]?.descripcion).toBeNull()
      expect(resultado.filas[0]?.activo).toBe(1)
    })
  })
})
