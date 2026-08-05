/**
 * Tests unitarios del adaptador del catálogo de productos sanitarios
 * (Issue #209) con una db FALSA (sin Postgres): verifican el scope de las
 * queries, el mapeo del stock calculado (RN-041), la lectura del umbral
 * T-001 desde `config_parametros_finca` y la traducción del UNIQUE a
 * `conflicto` (SAN-023). El comportamiento real contra Postgres (vista
 * `inventario_sanitario`, UNIQUE) vive en los smoke tests con DB_SMOKE.
 *
 * Reglas cubiertas (TS-001):
 * - SAN-023: unique (finca_id, codigo) → { tipo: "conflicto", campo: "codigo" }.
 * - RN-041: listar mapea `dosis_disponibles` de la vista inventario_sanitario.
 * - T-001: obtenerStockMinimoDosis lee el parámetro de la finca; sin
 *   parámetro → null (el fallback lo aplica el caso de uso, no el adaptador).
 * - SAN-021: soloActivos filtra activo=1; sin borrado físico (RN-050).
 * - CM-024: obtenerPorId NO filtra por finca (el scope es del caso de uso).
 */
import { getTableName } from "drizzle-orm"
import { describe, expect, it } from "vitest"
import { DrizzleCatalogoProductoSanitarioAdapter } from "../src/catalogo-producto-sanitario-infrastructure.js"

type Operacion =
  | { readonly tipo: "select"; readonly tabla: string; readonly condicion: unknown }
  | { readonly tipo: "insert"; readonly tabla: string; readonly fila: Record<string, unknown> }
  | {
      readonly tipo: "update"
      readonly tabla: string
      readonly valores: Record<string, unknown>
      readonly condicion: unknown
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

interface FakeDbOptions {
  readonly filasSelect?: readonly Record<string, unknown>[]
  readonly updateCount?: number
  readonly errorInsert?: unknown
  readonly errorUpdate?: unknown
}

function fakeDb(options: FakeDbOptions = {}) {
  const operaciones: Operacion[] = []
  const filasSelect = options.filasSelect ?? []
  let huboLeftJoin = false

  const db = {
    select: () => ({
      from: (tabla: unknown) => {
        const nombreTabla = getTableName(tabla as never)
        const resolver = (condicion: unknown) => {
          operaciones.push({ tipo: "select", tabla: nombreTabla, condicion })
          const resultado = Promise.resolve(filasSelect)
          return Object.assign(resultado, {
            limit: () => Promise.resolve(filasSelect),
            orderBy: () => Promise.resolve(filasSelect),
          })
        }
        return {
          where: resolver,
          leftJoin: () => {
            huboLeftJoin = true
            return { where: resolver }
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

  return {
    db,
    operaciones,
    get huboLeftJoin() {
      return huboLeftJoin
    },
  }
}

const FINCA = "finca-1"

function errorUniqueProducto() {
  const causa = { constraint_name: "uq_productos_sanitarios_finca_codigo", code: "23505" }
  return Object.assign(new Error("unique violation"), { cause: causa })
}

describe("crear — SAN-023", () => {
  it("inserta en productos_sanitarios con los valores validados (sin usuario_creado_por, IA-002)", async () => {
    const fake = fakeDb()
    const adaptador = new DrizzleCatalogoProductoSanitarioAdapter(fake.db as never)

    const resultado = await adaptador.crear(FINCA, {
      codigo: "VAC-AFTOSA",
      descripcion: "Vacuna fiebre aftosa",
      mlMgPorDosis: 2.5,
      tipoTratamiento: "vacuna",
      precioDosis: 3500,
      comentarios: null,
    })

    expect(resultado.tipo).toBe("creado")
    const insert = fake.operaciones.find((operacion) => operacion.tipo === "insert")
    expect(insert?.tabla).toBe("productos_sanitarios")
    if (insert?.tipo === "insert") {
      expect(insert.fila.finca_id ?? insert.fila.fincaId).toBe(FINCA)
      expect(insert.fila.codigo).toBe("VAC-AFTOSA")
      expect(insert.fila.descripcion).toBe("Vacuna fiebre aftosa")
      expect(insert.fila.mlMgPorDosis).toBe("2.5")
      expect(insert.fila.precioDosis).toBe("3500")
      expect(insert.fila.tipoTratamiento).toBe("vacuna")
      expect(insert.fila.activo).toBe(1)
      // Esquema manda: la tabla NO tiene usuario_creado_por (PE-006 es de eventos).
      expect("usuarioCreadoPor" in insert.fila).toBe(false)
      expect("usuario_creado_por" in insert.fila).toBe(false)
    }
  })

  it("SAN-023: violación del UNIQUE (finca_id, codigo) → conflicto campo codigo", async () => {
    const fake = fakeDb({ errorInsert: errorUniqueProducto() })
    const adaptador = new DrizzleCatalogoProductoSanitarioAdapter(fake.db as never)

    const resultado = await adaptador.crear(FINCA, {
      codigo: "VAC-AFTOSA",
      descripcion: "Vacuna fiebre aftosa",
      mlMgPorDosis: null,
      tipoTratamiento: "vacuna",
      precioDosis: null,
      comentarios: null,
    })

    expect(resultado).toEqual({ tipo: "conflicto", campo: "codigo" })
  })

  it("otro error de inserción → error genérico sin filtrar detalles", async () => {
    const fake = fakeDb({ errorInsert: new Error("connection lost") })
    const adaptador = new DrizzleCatalogoProductoSanitarioAdapter(fake.db as never)

    const resultado = await adaptador.crear(FINCA, {
      codigo: "VAC-AFTOSA",
      descripcion: "Vacuna",
      mlMgPorDosis: null,
      tipoTratamiento: "vacuna",
      precioDosis: null,
      comentarios: null,
    })

    expect(resultado.tipo).toBe("error")
  })
})

describe("editar / cambiarEstado — scope y RN-050", () => {
  it("editar actualiza por id + finca_id y mapea count 0 → no_encontrado (CM-024)", async () => {
    const fake = fakeDb({ updateCount: 0 })
    const adaptador = new DrizzleCatalogoProductoSanitarioAdapter(fake.db as never)

    const resultado = await adaptador.editar(FINCA, "prod-1", {
      codigo: "VAC-NUEVO",
      descripcion: "Nueva descripción",
      mlMgPorDosis: null,
      tipoTratamiento: "no_reproductivo",
      precioDosis: null,
      comentarios: null,
    })

    expect(resultado).toEqual({ tipo: "no_encontrado" })
    const update = fake.operaciones.find((operacion) => operacion.tipo === "update")
    expect(update?.tabla).toBe("productos_sanitarios")
    if (update?.tipo === "update") {
      expect(conditionContains(update.condicion, "id", "prod-1")).toBe(true)
      expect(conditionContains(update.condicion, "finca_id", FINCA)).toBe(true)
      expect(update.valores.codigo).toBe("VAC-NUEVO")
    }
  })

  it("SAN-023: conflicto del UNIQUE en editar → conflicto campo codigo", async () => {
    const fake = fakeDb({ errorUpdate: errorUniqueProducto() })
    const adaptador = new DrizzleCatalogoProductoSanitarioAdapter(fake.db as never)

    const resultado = await adaptador.editar(FINCA, "prod-1", {
      codigo: "VAC-OTRO",
      descripcion: "Descripción",
      mlMgPorDosis: null,
      tipoTratamiento: "vacuna",
      precioDosis: null,
      comentarios: null,
    })

    expect(resultado).toEqual({ tipo: "conflicto", campo: "codigo" })
  })

  it("SAN-021/RN-050: cambiarEstado sólo escribe activo + updated_at (nunca borrado físico)", async () => {
    const fake = fakeDb({ updateCount: 1 })
    const adaptador = new DrizzleCatalogoProductoSanitarioAdapter(fake.db as never)

    const resultado = await adaptador.cambiarEstado(FINCA, "prod-1", false)

    expect(resultado).toEqual({ tipo: "estado_actualizado" })
    const update = fake.operaciones.find((operacion) => operacion.tipo === "update")
    if (update?.tipo === "update") {
      expect(update.valores.activo).toBe(0)
      expect(update.valores.updatedAt).toBeInstanceOf(Date)
      expect(Object.keys(update.valores).sort()).toEqual(["activo", "updatedAt"])
      expect(conditionContains(update.condicion, "id", "prod-1")).toBe(true)
      expect(conditionContains(update.condicion, "finca_id", FINCA)).toBe(true)
    }
    expect(fake.operaciones.some((operacion) => operacion.tipo === "insert")).toBe(false)
  })

  it("cambiarEstado con count 0 → no_encontrado", async () => {
    const fake = fakeDb({ updateCount: 0 })
    const adaptador = new DrizzleCatalogoProductoSanitarioAdapter(fake.db as never)

    expect(await adaptador.cambiarEstado(FINCA, "prod-x", true)).toEqual({
      tipo: "no_encontrado",
    })
  })
})

describe("listar — RN-041 / SAN-021", () => {
  it("RN-041: une inventario_sanitario y mapea dosis_disponibles como stock (null → 0)", async () => {
    const fake = fakeDb({
      filasSelect: [
        {
          id: "prod-1",
          codigo: "VAC-AFTOSA",
          descripcion: "Vacuna fiebre aftosa",
          mlMgPorDosis: "2.5",
          tipoTratamiento: "vacuna",
          precioDosis: "3500",
          comentarios: null,
          activo: 1,
          stockDisponible: "148",
        },
        {
          id: "prod-2",
          codigo: "IVERMECTINA",
          descripcion: "Ivermectina 1%",
          mlMgPorDosis: null,
          tipoTratamiento: "no_reproductivo",
          precioDosis: null,
          comentarios: "Uso externo",
          activo: 0,
          stockDisponible: null,
        },
      ],
    })
    const adaptador = new DrizzleCatalogoProductoSanitarioAdapter(fake.db as never)

    const filas = await adaptador.listar(FINCA, { soloActivos: false })

    expect(fake.huboLeftJoin).toBe(true)
    expect(filas).toHaveLength(2)
    expect(filas[0]).toEqual({
      id: "prod-1",
      codigo: "VAC-AFTOSA",
      descripcion: "Vacuna fiebre aftosa",
      mlMgPorDosis: 2.5,
      tipoTratamiento: "vacuna",
      precioDosis: 3500,
      comentarios: null,
      activo: true,
      stockDisponible: 148,
    })
    expect(filas[1]?.stockDisponible).toBe(0)
    expect(filas[1]?.activo).toBe(false)
    expect(filas[1]?.mlMgPorDosis).toBeNull()

    const select = fake.operaciones.find((operacion) => operacion.tipo === "select")
    if (select?.tipo === "select") {
      expect(select.tabla).toBe("productos_sanitarios")
      expect(conditionContains(select.condicion, "finca_id", FINCA)).toBe(true)
    }
  })

  it("SAN-021: soloActivos agrega el filtro activo=1 (inactivos fuera de selects)", async () => {
    const fake = fakeDb({ filasSelect: [] })
    const adaptador = new DrizzleCatalogoProductoSanitarioAdapter(fake.db as never)

    await adaptador.listar(FINCA, { soloActivos: true })
    const conFiltro = fake.operaciones.find((operacion) => operacion.tipo === "select")
    if (conFiltro?.tipo === "select") {
      expect(conditionContains(conFiltro.condicion, "activo", 1)).toBe(true)
    }

    const fakeSinFiltro = fakeDb({ filasSelect: [] })
    const adaptadorSinFiltro = new DrizzleCatalogoProductoSanitarioAdapter(fakeSinFiltro.db as never)
    await adaptadorSinFiltro.listar(FINCA, { soloActivos: false })
    const sinFiltro = fakeSinFiltro.operaciones.find((operacion) => operacion.tipo === "select")
    if (sinFiltro?.tipo === "select") {
      expect(conditionContains(sinFiltro.condicion, "activo", 1)).toBe(false)
    }
  })
})

describe("listarCodigosActivos — SAN-023/CM-041", () => {
  it("devuelve id+codigo sólo de activos de la finca", async () => {
    const fake = fakeDb({
      filasSelect: [
        { id: "prod-1", codigo: "VAC-AFTOSA" },
        { id: "prod-2", codigo: "IVERMECTINA" },
      ],
    })
    const adaptador = new DrizzleCatalogoProductoSanitarioAdapter(fake.db as never)

    const codigos = await adaptador.listarCodigosActivos(FINCA)

    expect(codigos).toEqual([
      { id: "prod-1", codigo: "VAC-AFTOSA" },
      { id: "prod-2", codigo: "IVERMECTINA" },
    ])
    const select = fake.operaciones.find((operacion) => operacion.tipo === "select")
    if (select?.tipo === "select") {
      expect(conditionContains(select.condicion, "finca_id", FINCA)).toBe(true)
      expect(conditionContains(select.condicion, "activo", 1)).toBe(true)
    }
  })
})

describe("obtenerStockMinimoDosis — T-001", () => {
  it("T-001: lee stock_minimo_dosis de config_parametros_finca (valor numérico)", async () => {
    const fake = fakeDb({ filasSelect: [{ valor: "15" }] })
    const adaptador = new DrizzleCatalogoProductoSanitarioAdapter(fake.db as never)

    expect(await adaptador.obtenerStockMinimoDosis(FINCA)).toBe(15)

    const select = fake.operaciones.find((operacion) => operacion.tipo === "select")
    if (select?.tipo === "select") {
      expect(select.tabla).toBe("config_parametros_finca")
      expect(conditionContains(select.condicion, "finca_id", FINCA)).toBe(true)
      expect(conditionContains(select.condicion, "codigo", "stock_minimo_dosis")).toBe(true)
      expect(conditionContains(select.condicion, "activo", 1)).toBe(true)
    }
  })

  it("T-001: finca sin parámetro → null (el fallback 20 lo decide el caso de uso)", async () => {
    const fake = fakeDb({ filasSelect: [] })
    const adaptador = new DrizzleCatalogoProductoSanitarioAdapter(fake.db as never)

    expect(await adaptador.obtenerStockMinimoDosis(FINCA)).toBeNull()
  })

  it("T-001: valor no numérico o negativo → null (nunca un umbral corrupto)", async () => {
    for (const valor of ["abc", "-5", null]) {
      const fake = fakeDb({ filasSelect: [{ valor }] })
      const adaptador = new DrizzleCatalogoProductoSanitarioAdapter(fake.db as never)
      expect(await adaptador.obtenerStockMinimoDosis(FINCA)).toBeNull()
    }
  })
})

describe("obtenerPorId — CM-024", () => {
  it("busca SOLO por id (el scope de finca lo revalida el caso de uso)", async () => {
    const fake = fakeDb({
      filasSelect: [
        {
          id: "prod-1",
          fincaId: "finca-ajena",
          codigo: "VAC-AFTOSA",
          descripcion: "Vacuna",
          mlMgPorDosis: "2",
          tipoTratamiento: "vacuna",
          precioDosis: "3500",
          activo: 1,
        },
      ],
    })
    const adaptador = new DrizzleCatalogoProductoSanitarioAdapter(fake.db as never)

    const producto = await adaptador.obtenerPorId("prod-1")

    expect(producto).toEqual({
      id: "prod-1",
      fincaId: "finca-ajena",
      codigo: "VAC-AFTOSA",
      descripcion: "Vacuna",
      mlMgPorDosis: 2,
      tipoTratamiento: "vacuna",
      precioDosis: 3500,
      activo: true,
    })
    const select = fake.operaciones.find((operacion) => operacion.tipo === "select")
    if (select?.tipo === "select") {
      expect(conditionContains(select.condicion, "id", "prod-1")).toBe(true)
      expect(conditionContains(select.condicion, "finca_id", "finca-ajena")).toBe(false)
    }
  })

  it("sin filas → null", async () => {
    const fake = fakeDb({ filasSelect: [] })
    const adaptador = new DrizzleCatalogoProductoSanitarioAdapter(fake.db as never)

    expect(await adaptador.obtenerPorId("prod-x")).toBeNull()
  })
})
