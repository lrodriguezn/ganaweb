/**
 * Tests unitarios del adaptador de escritura de maestros (issue #147) con
 * una db FALSA (sin Postgres): verifican el mapeo data-driven de claves
 * snake_case → columnas Drizzle, el scope de las queries y la traducción
 * de errores. El comportamiento real contra Postgres (UNIQUE, rowCount)
 * vive en `maestro-escritura-smoke.test.ts`.
 */

import { getTableName } from "drizzle-orm"
import { describe, expect, it } from "vitest"
import { DrizzleMaestroEscrituraAdapter } from "../src/maestro-escritura-infrastructure.js"

type Operacion =
  | { readonly tipo: "select"; readonly tabla: string; readonly condicion: unknown }
  | { readonly tipo: "insert"; readonly tabla: string; readonly fila: Record<string, unknown> }
  | {
      readonly tipo: "update"
      readonly tabla: string
      readonly valores: Record<string, unknown>
      readonly condicion: unknown
    }

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

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

interface FakeDbOptions {
  readonly filasSelect?: readonly Record<string, unknown>[]
  readonly updateCount?: number
  readonly errorInsert?: unknown
  readonly errorUpdate?: unknown
}

function fakeDb(options: FakeDbOptions = {}) {
  const operaciones: Operacion[] = []
  const filasSelect = options.filasSelect ?? []
  const db = {
    select: () => ({
      from: (tabla: unknown) => {
        const nombreTabla = getTableName(tabla as never)
        return {
          where: (condicion: unknown) => {
            operaciones.push({ tipo: "select", tabla: nombreTabla, condicion })
            const resultado = Promise.resolve(filasSelect)
            return Object.assign(resultado, {
              limit: () => Promise.resolve(filasSelect),
              orderBy: () => Promise.resolve(filasSelect),
            })
          },
        }
      },
    }),
    insert: (tabla: unknown) => ({
      values: (fila: Record<string, unknown>) => {
        operaciones.push({ tipo: "insert", tabla: getTableName(tabla as never), fila })
        return options.errorInsert !== undefined
          ? Promise.reject(options.errorInsert)
          : Promise.resolve([])
      },
    }),
    update: (tabla: unknown) => ({
      set: (valores: Record<string, unknown>) => ({
        where: (condicion: unknown) => {
          operaciones.push({
            tipo: "update",
            tabla: getTableName(tabla as never),
            valores,
            condicion,
          })
          return options.errorUpdate !== undefined
            ? Promise.reject(options.errorUpdate)
            : Promise.resolve({ count: options.updateCount ?? 1 })
        },
      }),
    }),
  }
  return { db, operaciones }
}

function errorUnique(constraintName: string): Error {
  return Object.assign(new Error("duplicate key value violates unique constraint"), {
    cause: { code: "23505", constraint_name: constraintName },
  })
}

describe("DrizzleMaestroEscrituraAdapter", () => {
  describe("crear", () => {
    it("mapea las claves de potreros (familia con codigo) a columnas y genera id UUID", async () => {
      const { db, operaciones } = fakeDb()

      const resultado = await new DrizzleMaestroEscrituraAdapter(db as never).crear(
        "potreros",
        "finca-esperanza",
        {
          codigo: "P-01",
          nombre: "Potrero Uno",
          area_hectareas: 12.5,
          tipo_pasto: "Kikuyo",
          capacidad_maxima: 20,
          estado: "activo",
        },
      )

      expect(resultado.tipo).toBe("creado")
      const insert = operaciones[0]
      expect(insert?.tipo).toBe("insert")
      if (insert?.tipo !== "insert") return
      expect(insert.tabla).toBe("potreros")
      expect(insert.fila).toEqual({
        codigo: "P-01",
        nombre: "Potrero Uno",
        areaHectareas: 12.5,
        tipoPasto: "Kikuyo",
        capacidadMaxima: 20,
        estado: "activo",
        id: expect.stringMatching(UUID_REGEX),
        fincaId: "finca-esperanza",
      })
      if (resultado.tipo === "creado") {
        expect(resultado.id).toBe(insert.fila.id)
      }
    })

    it("mapea las claves de grupos (familia simple nombre/descripcion)", async () => {
      const { db, operaciones } = fakeDb()

      const resultado = await new DrizzleMaestroEscrituraAdapter(db as never).crear(
        "grupos",
        "finca-esperanza",
        { nombre: "Grupo de ordeño", descripcion: "Turno mañana" },
      )

      expect(resultado.tipo).toBe("creado")
      const insert = operaciones[0]
      expect(insert?.tipo).toBe("insert")
      if (insert?.tipo !== "insert") return
      expect(insert.tabla).toBe("grupos")
      expect(insert.fila).toMatchObject({
        nombre: "Grupo de ordeño",
        descripcion: "Turno mañana",
        fincaId: "finca-esperanza",
      })
    })

    it("ignora claves desconocidas para la familia", async () => {
      const { db, operaciones } = fakeDb()

      await new DrizzleMaestroEscrituraAdapter(db as never).crear("grupos", "finca-esperanza", {
        nombre: "Grupo",
        campo_inexistente: "no debe aparecer",
        codigo: "los grupos no tienen codigo",
      })

      const insert = operaciones[0]
      if (insert?.tipo !== "insert") throw new Error("esperaba insert")
      expect(insert.fila).not.toHaveProperty("campo_inexistente")
      expect(insert.fila).not.toHaveProperty("codigo")
      expect(insert.fila).toHaveProperty("nombre", "Grupo")
    })

    it("mapea es_inseminador solo en veterinarios (CM-040)", async () => {
      const veterinarios = fakeDb()
      await new DrizzleMaestroEscrituraAdapter(veterinarios.db as never).crear(
        "veterinarios",
        "finca-esperanza",
        { nombre: "Vet", es_inseminador: 1 },
      )
      const insertVet = veterinarios.operaciones[0]
      if (insertVet?.tipo !== "insert") throw new Error("esperaba insert")
      expect(insertVet.fila).toHaveProperty("esInseminador", 1)

      const grupos = fakeDb()
      await new DrizzleMaestroEscrituraAdapter(grupos.db as never).crear(
        "grupos",
        "finca-esperanza",
        { nombre: "Grupo", es_inseminador: 1 },
      )
      const insertGrupo = grupos.operaciones[0]
      if (insertGrupo?.tipo !== "insert") throw new Error("esperaba insert")
      expect(insertGrupo.fila).not.toHaveProperty("esInseminador")
    })

    it("reporta conflicto campo codigo ante uq_potreros_finca_codigo (CM-032)", async () => {
      const { db } = fakeDb({ errorInsert: errorUnique("uq_potreros_finca_codigo") })

      const resultado = await new DrizzleMaestroEscrituraAdapter(db as never).crear(
        "potreros",
        "finca-esperanza",
        { codigo: "P-01", nombre: "Potrero" },
      )

      expect(resultado).toEqual({ tipo: "conflicto", campo: "codigo" })
    })

    it("reporta conflicto campo codigo ante uq_sectores_finca_codigo (CM-032)", async () => {
      const { db } = fakeDb({ errorInsert: errorUnique("uq_sectores_finca_codigo") })

      const resultado = await new DrizzleMaestroEscrituraAdapter(db as never).crear(
        "sectores",
        "finca-esperanza",
        { codigo: "S-01", nombre: "Sector" },
      )

      expect(resultado).toEqual({ tipo: "conflicto", campo: "codigo" })
    })

    it("devuelve error generico sin filtrar detalles internos", async () => {
      const { db } = fakeDb({
        errorInsert: new Error("connection refused at 10.0.0.1:5432 secret-detail"),
      })

      const resultado = await new DrizzleMaestroEscrituraAdapter(db as never).crear(
        "potreros",
        "finca-esperanza",
        { codigo: "P-01", nombre: "Potrero" },
      )

      expect(resultado).toEqual({ tipo: "error", detalle: "No se pudo crear el registro." })
    })
  })

  describe("editar", () => {
    it("actualiza solo las claves presentes + updatedAt, filtrando por id AND finca_id", async () => {
      const { db, operaciones } = fakeDb()

      const resultado = await new DrizzleMaestroEscrituraAdapter(db as never).editar(
        "potreros",
        "finca-esperanza",
        "pot-1",
        { nombre: "Nombre editado" },
      )

      expect(resultado).toEqual({ tipo: "actualizado" })
      const update = operaciones[0]
      expect(update?.tipo).toBe("update")
      if (update?.tipo !== "update") return
      expect(update.tabla).toBe("potreros")
      expect(update.valores.nombre).toBe("Nombre editado")
      expect(update.valores.updatedAt).toBeInstanceOf(Date)
      expect(Object.keys(update.valores).sort()).toEqual(["nombre", "updatedAt"])
      expect(conditionContains(update.condicion, "id", "pot-1")).toBe(true)
      expect(conditionContains(update.condicion, "finca_id", "finca-esperanza")).toBe(true)
    })

    it("devuelve no_encontrado cuando rowCount es 0", async () => {
      const { db } = fakeDb({ updateCount: 0 })

      const resultado = await new DrizzleMaestroEscrituraAdapter(db as never).editar(
        "potreros",
        "finca-esperanza",
        "pot-inexistente",
        { nombre: "X" },
      )

      expect(resultado).toEqual({ tipo: "no_encontrado" })
    })

    it("mapea el conflicto UNIQUE de codigo tambien en la edicion (CM-032)", async () => {
      const { db } = fakeDb({ errorUpdate: errorUnique("uq_potreros_finca_codigo") })

      const resultado = await new DrizzleMaestroEscrituraAdapter(db as never).editar(
        "potreros",
        "finca-esperanza",
        "pot-1",
        { codigo: "P-DUP" },
      )

      expect(resultado).toEqual({ tipo: "conflicto", campo: "codigo" })
    })
  })

  describe("cambiarEstado", () => {
    it("actualiza activo + updatedAt con scope id AND finca_id (RN-050)", async () => {
      const { db, operaciones } = fakeDb()

      const resultado = await new DrizzleMaestroEscrituraAdapter(db as never).cambiarEstado(
        "potreros",
        "finca-esperanza",
        "pot-1",
        0,
      )

      expect(resultado).toEqual({ tipo: "estado_actualizado" })
      const update = operaciones[0]
      if (update?.tipo !== "update") throw new Error("esperaba update")
      expect(update.valores.activo).toBe(0)
      expect(update.valores.updatedAt).toBeInstanceOf(Date)
      expect(conditionContains(update.condicion, "id", "pot-1")).toBe(true)
      expect(conditionContains(update.condicion, "finca_id", "finca-esperanza")).toBe(true)
    })

    it("devuelve no_encontrado cuando rowCount es 0", async () => {
      const { db } = fakeDb({ updateCount: 0 })

      const resultado = await new DrizzleMaestroEscrituraAdapter(db as never).cambiarEstado(
        "potreros",
        "finca-esperanza",
        "pot-inexistente",
        1,
      )

      expect(resultado).toEqual({ tipo: "no_encontrado" })
    })
  })

  describe("obtenerPorId", () => {
    it("busca por id SIN filtrar por finca (CM-024)", async () => {
      const { db, operaciones } = fakeDb({
        filasSelect: [{ id: "pot-1", fincaId: "finca-esperanza" }],
      })

      const resultado = await new DrizzleMaestroEscrituraAdapter(db as never).obtenerPorId(
        "potreros",
        "pot-1",
      )

      expect(resultado).toEqual({ id: "pot-1", fincaId: "finca-esperanza" })
      const select = operaciones[0]
      if (select?.tipo !== "select") throw new Error("esperaba select")
      expect(select.tabla).toBe("potreros")
      expect(conditionContains(select.condicion, "id", "pot-1")).toBe(true)
      expect(conditionHasColumn(select.condicion, "finca_id")).toBe(false)
    })

    it("devuelve null si el registro no existe", async () => {
      const { db } = fakeDb({ filasSelect: [] })

      const resultado = await new DrizzleMaestroEscrituraAdapter(db as never).obtenerPorId(
        "potreros",
        "pot-inexistente",
      )

      expect(resultado).toBeNull()
    })
  })

  describe("listarNombresActivos", () => {
    it("filtra por finca_id y activo=1", async () => {
      const { db, operaciones } = fakeDb({
        filasSelect: [{ id: "pot-1", nombre: "Potrero Uno" }],
      })

      const resultado = await new DrizzleMaestroEscrituraAdapter(db as never).listarNombresActivos(
        "potreros",
        "finca-esperanza",
      )

      expect(resultado).toEqual([{ id: "pot-1", nombre: "Potrero Uno" }])
      const select = operaciones[0]
      if (select?.tipo !== "select") throw new Error("esperaba select")
      expect(conditionContains(select.condicion, "finca_id", "finca-esperanza")).toBe(true)
      expect(conditionContains(select.condicion, "activo", 1)).toBe(true)
    })
  })

  describe("actualizarDatosBasicos (CM-050)", () => {
    it("mapea los datos basicos de la finca a las columnas de fincas", async () => {
      const { db, operaciones } = fakeDb()

      const resultado = await new DrizzleMaestroEscrituraAdapter(
        db as never,
      ).actualizarDatosBasicos("finca-esperanza", {
        nombre: "Finca Editada",
        departamento: "Antioquia",
        municipio: "Yarumal",
        vereda: "El Silencio",
        area_hectareas: 42.5,
        capacidad_maxima: 100,
        tipo_explotacion_id: "tipo-1",
        clave_desconocida: "ignorada",
      })

      expect(resultado).toEqual({ tipo: "actualizado" })
      const update = operaciones[0]
      if (update?.tipo !== "update") throw new Error("esperaba update")
      expect(update.tabla).toBe("fincas")
      expect(update.valores).toMatchObject({
        nombre: "Finca Editada",
        departamento: "Antioquia",
        municipio: "Yarumal",
        vereda: "El Silencio",
        areaHectareas: 42.5,
        capacidadMaxima: 100,
        tipoExplotacionId: "tipo-1",
      })
      expect(update.valores.updatedAt).toBeInstanceOf(Date)
      expect(update.valores).not.toHaveProperty("clave_desconocida")
      expect(conditionContains(update.condicion, "id", "finca-esperanza")).toBe(true)
    })

    it("devuelve no_encontrado cuando rowCount es 0", async () => {
      const { db } = fakeDb({ updateCount: 0 })

      const resultado = await new DrizzleMaestroEscrituraAdapter(
        db as never,
      ).actualizarDatosBasicos("finca-inexistente", { nombre: "X" })

      expect(resultado).toEqual({ tipo: "no_encontrado" })
    })
  })
})
