/**
 * Casos de uso del catálogo de productos sanitarios (Issue #209,
 * RF-SANIDAD v0.2 §6/§11).
 *
 * Reglas cubiertas (TS-001: cada regla citable tiene tests que la nombran):
 * - CM-024 (scope primero): editar/cambiarEstado sobre un registro de otra
 *   finca devuelve `no_encontrado` sin revelar su existencia.
 * - RN-050 / SAN-021: inactivar/reactivar es la ÚNICA baja — no existe
 *   operación de borrado en el puerto ni en los casos de uso.
 * - SAN-022 / T-001: el semáforo KPI-10 usa el umbral leído de
 *   `config_parametros_finca` vía puerto, NUNCA hardcodeado; el default
 *   documentado (20) sólo aplica cuando la finca no tiene el parámetro.
 * - SAN-023: duplicado de código activo+finca (case-insensitive) → error de
 *   campo `codigo` en crear y editar.
 * - CM-042: resultados serializables (uniones discriminadas por `tipo`).
 *
 * Puerto falso en memoria (TS-003): sin Postgres, sin mocks de librería.
 */
import { describe, expect, it } from "vitest"
import type {
  CatalogoProductoSanitarioPort,
  FilaProductoSanitarioListado,
  ProductoSanitarioReferencia,
  ProductoSanitarioValidado,
} from "../src/index.js"
import {
  STOCK_MINIMO_DOSIS_DEFAULT,
  cambiarEstadoProductoSanitario,
  crearProductoSanitario,
  editarProductoSanitario,
  listarCatalogoProductoSanitario,
} from "../src/index.js"

type ResultadoCrear =
  | { readonly tipo: "creado"; readonly id: string }
  | { readonly tipo: "conflicto"; readonly campo: string }
  | { readonly tipo: "error"; readonly detalle: string }

type ResultadoEditar =
  | { readonly tipo: "actualizado" }
  | { readonly tipo: "no_encontrado" }
  | { readonly tipo: "conflicto"; readonly campo: string }
  | { readonly tipo: "error"; readonly detalle: string }

type ResultadoEstado =
  | { readonly tipo: "estado_actualizado" }
  | { readonly tipo: "no_encontrado" }
  | { readonly tipo: "error"; readonly detalle: string }

interface FakeCatalogoOptions {
  readonly producto?: ProductoSanitarioReferencia | null
  readonly codigosActivos?: readonly { readonly id: string; readonly codigo: string }[]
  readonly filas?: readonly FilaProductoSanitarioListado[]
  readonly stockMinimoDosis?: number | null
  readonly resultadoCrear?: ResultadoCrear
  readonly resultadoEditar?: ResultadoEditar
  readonly resultadoEstado?: ResultadoEstado
}

function fakeCatalogo(options: FakeCatalogoOptions = {}) {
  const llamadas: string[] = []
  let ultimoListarOpciones: { readonly soloActivos: boolean } | null = null

  const port: CatalogoProductoSanitarioPort = {
    async obtenerPorId(id: string) {
      llamadas.push(`obtenerPorId:${id}`)
      return options.producto ?? null
    },
    async crear(fincaId: string, datos: ProductoSanitarioValidado) {
      llamadas.push(`crear:${fincaId}:${datos.codigo}`)
      return options.resultadoCrear ?? { tipo: "creado", id: "prod-nuevo" }
    },
    async editar(fincaId: string, id: string, datos: ProductoSanitarioValidado) {
      llamadas.push(`editar:${fincaId}:${id}:${datos.codigo}`)
      return options.resultadoEditar ?? { tipo: "actualizado" }
    },
    async cambiarEstado(fincaId: string, id: string, activo: boolean) {
      llamadas.push(`cambiarEstado:${fincaId}:${id}:${activo}`)
      return options.resultadoEstado ?? { tipo: "estado_actualizado" }
    },
    async listar(fincaId: string, opcionesParam) {
      llamadas.push(`listar:${fincaId}`)
      ultimoListarOpciones = opcionesParam
      return options.filas ?? []
    },
    async listarCodigosActivos(fincaId: string) {
      llamadas.push(`listarCodigosActivos:${fincaId}`)
      return options.codigosActivos ?? []
    },
    async obtenerStockMinimoDosis(fincaId: string) {
      llamadas.push(`obtenerStockMinimoDosis:${fincaId}`)
      return options.stockMinimoDosis ?? null
    },
  }
  return {
    port,
    llamadas,
    get ultimoListarOpciones() {
      return ultimoListarOpciones
    },
  }
}

const FINCA = "finca-1"

function datosValidos(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    codigo: "VAC-AFTOSA",
    descripcion: "Vacuna fiebre aftosa",
    mlMgPorDosis: 2,
    tipoTratamiento: "vacuna",
    precioDosis: 3500,
    comentarios: null,
    ...overrides,
  }
}

function fila(overrides: Partial<FilaProductoSanitarioListado> = {}): FilaProductoSanitarioListado {
  return {
    id: "prod-1",
    codigo: "VAC-AFTOSA",
    descripcion: "Vacuna fiebre aftosa",
    mlMgPorDosis: 2,
    tipoTratamiento: "vacuna",
    precioDosis: 3500,
    comentarios: null,
    activo: true,
    stockDisponible: 100,
    ...overrides,
  }
}

describe("crearProductoSanitario", () => {
  it("SAN-020: entrada válida persiste vía puerto y devuelve creado (CM-042)", async () => {
    const fake = fakeCatalogo()
    const resultado = await crearProductoSanitario(fake.port)({
      fincaId: FINCA,
      datos: datosValidos(),
    })

    expect(resultado).toEqual({ tipo: "creado", id: "prod-nuevo" })
    expect(fake.llamadas).toContain(`listarCodigosActivos:${FINCA}`)
    expect(fake.llamadas).toContain(`crear:${FINCA}:VAC-AFTOSA`)
  })

  it("SAN-020: datos inválidos devuelven validacion SIN tocar el puerto de escritura", async () => {
    const fake = fakeCatalogo()
    const resultado = await crearProductoSanitario(fake.port)({
      fincaId: FINCA,
      datos: datosValidos({ codigo: "", descripcion: "" }),
    })

    expect(resultado.tipo).toBe("validacion")
    if (resultado.tipo === "validacion") {
      const campos = resultado.errores.map((error) => error.campo)
      expect(campos).toContain("codigo")
      expect(campos).toContain("descripcion")
    }
    expect(fake.llamadas.some((llamada) => llamada.startsWith("crear:"))).toBe(false)
  })

  it("SAN-023: código duplicado entre activos de la finca → error de campo codigo", async () => {
    const fake = fakeCatalogo({
      codigosActivos: [{ id: "prod-existente", codigo: "vac-aftosa" }],
    })
    const resultado = await crearProductoSanitario(fake.port)({
      fincaId: FINCA,
      datos: datosValidos(),
    })

    expect(resultado.tipo).toBe("validacion")
    if (resultado.tipo === "validacion") {
      expect(resultado.errores).toHaveLength(1)
      expect(resultado.errores[0]?.campo).toBe("codigo")
    }
    expect(fake.llamadas.some((llamada) => llamada.startsWith("crear:"))).toBe(false)
  })

  it("conflicto del puerto (carrera con el UNIQUE) se mapea 1:1 (SAN-023)", async () => {
    const fake = fakeCatalogo({ resultadoCrear: { tipo: "conflicto", campo: "codigo" } })
    const resultado = await crearProductoSanitario(fake.port)({
      fincaId: FINCA,
      datos: datosValidos(),
    })

    expect(resultado).toEqual({ tipo: "conflicto", campo: "codigo" })
  })
})

describe("editarProductoSanitario — scope primero (CM-024)", () => {
  const productoDeFinca1: ProductoSanitarioReferencia = {
    id: "prod-1",
    fincaId: FINCA,
    codigo: "VAC-AFTOSA",
    descripcion: "Vacuna fiebre aftosa",
    tipoTratamiento: "vacuna",
    precioDosis: 3500,
    mlMgPorDosis: 2,
    activo: true,
  }

  it("CM-024: registro inexistente → no_encontrado sin validar ni escribir", async () => {
    const fake = fakeCatalogo({ producto: null })
    const resultado = await editarProductoSanitario(fake.port)({
      fincaId: FINCA,
      id: "prod-x",
      datos: datosValidos(),
    })

    expect(resultado).toEqual({ tipo: "no_encontrado" })
    expect(fake.llamadas).toEqual(["obtenerPorId:prod-x"])
  })

  it("CM-024: registro de OTRA finca → no_encontrado sin revelar su existencia", async () => {
    const fake = fakeCatalogo({ producto: { ...productoDeFinca1, fincaId: "finca-ajena" } })
    const resultado = await editarProductoSanitario(fake.port)({
      fincaId: FINCA,
      id: "prod-1",
      datos: datosValidos(),
    })

    expect(resultado).toEqual({ tipo: "no_encontrado" })
    expect(fake.llamadas).toEqual(["obtenerPorId:prod-1"])
  })

  it("SAN-023 (edición): duplicado excluye el propio registro (CM-041)", async () => {
    const fake = fakeCatalogo({
      producto: productoDeFinca1,
      codigosActivos: [
        { id: "prod-1", codigo: "VAC-AFTOSA" },
        { id: "prod-2", codigo: "IVERMECTINA" },
      ],
    })

    const mismoCodigo = await editarProductoSanitario(fake.port)({
      fincaId: FINCA,
      id: "prod-1",
      datos: datosValidos({ descripcion: "Nueva descripción" }),
    })
    expect(mismoCodigo).toEqual({ tipo: "actualizado" })

    const codigoAjeno = await editarProductoSanitario(fake.port)({
      fincaId: FINCA,
      id: "prod-1",
      datos: datosValidos({ codigo: "ivermectina" }),
    })
    expect(codigoAjeno.tipo).toBe("validacion")
    if (codigoAjeno.tipo === "validacion") {
      expect(codigoAjeno.errores[0]?.campo).toBe("codigo")
    }
  })
})

describe("cambiarEstadoProductoSanitario — RN-050 / SAN-021", () => {
  it("SAN-021: inactivar es la única baja — pasa false al puerto y devuelve el estado serializable", async () => {
    const fake = fakeCatalogo({
      producto: {
        id: "prod-1",
        fincaId: FINCA,
        codigo: "VAC-AFTOSA",
        descripcion: "Vacuna",
        tipoTratamiento: "vacuna",
        precioDosis: null,
        mlMgPorDosis: null,
        activo: true,
      },
    })
    const resultado = await cambiarEstadoProductoSanitario(fake.port)({
      fincaId: FINCA,
      id: "prod-1",
      activo: false,
    })

    expect(resultado).toEqual({ tipo: "estado_actualizado", activo: false })
    expect(fake.llamadas).toContain(`cambiarEstado:${FINCA}:prod-1:false`)
  })

  it("SAN-021: reactivar pasa true al puerto (el inactivo vuelve a selects)", async () => {
    const fake = fakeCatalogo({
      producto: {
        id: "prod-1",
        fincaId: FINCA,
        codigo: "VAC-AFTOSA",
        descripcion: "Vacuna",
        tipoTratamiento: "vacuna",
        precioDosis: null,
        mlMgPorDosis: null,
        activo: false,
      },
    })
    const resultado = await cambiarEstadoProductoSanitario(fake.port)({
      fincaId: FINCA,
      id: "prod-1",
      activo: true,
    })

    expect(resultado).toEqual({ tipo: "estado_actualizado", activo: true })
    expect(fake.llamadas).toContain(`cambiarEstado:${FINCA}:prod-1:true`)
  })

  it("CM-024: registro de otra finca → no_encontrado; RN-050: nunca hay borrado físico", async () => {
    const fake = fakeCatalogo({
      producto: {
        id: "prod-1",
        fincaId: "finca-ajena",
        codigo: "VAC-AFTOSA",
        descripcion: "Vacuna",
        tipoTratamiento: "vacuna",
        precioDosis: null,
        mlMgPorDosis: null,
        activo: true,
      },
    })
    const resultado = await cambiarEstadoProductoSanitario(fake.port)({
      fincaId: FINCA,
      id: "prod-1",
      activo: false,
    })

    expect(resultado).toEqual({ tipo: "no_encontrado" })
    // RN-050: el puerto del catálogo no expone operación de borrado.
    expect("eliminar" in fake.port).toBe(false)
  })
})

describe("listarCatalogoProductoSanitario — SAN-022 / KPI-10 / T-001", () => {
  it("T-001: el semáforo usa el umbral del puerto (15), nunca un valor hardcodeado", async () => {
    const fake = fakeCatalogo({
      filas: [
        fila({ id: "p-bajo", stockDisponible: 10 }),
        fila({ id: "p-ok", stockDisponible: 15 }),
        fila({ id: "p-agotado", stockDisponible: 0 }),
      ],
      stockMinimoDosis: 15,
    })

    const resultado = await listarCatalogoProductoSanitario(fake.port)({
      fincaId: FINCA,
      soloActivos: true,
    })

    expect(resultado.tipo).toBe("catalogo")
    if (resultado.tipo === "catalogo") {
      expect(resultado.stockMinimoDosis).toBe(15)
      const porId = new Map(resultado.filas.map((filaCatalogo) => [filaCatalogo.id, filaCatalogo]))
      expect(porId.get("p-bajo")?.estadoStock).toBe("bajo")
      expect(porId.get("p-ok")?.estadoStock).toBe("ok")
      expect(porId.get("p-agotado")?.estadoStock).toBe("agotado")
    }
  })

  it("T-001: finca sin parámetro → fallback documentado STOCK_MINIMO_DOSIS_DEFAULT (20)", async () => {
    const fake = fakeCatalogo({
      filas: [fila({ id: "p-19", stockDisponible: 19 }), fila({ id: "p-20", stockDisponible: 20 })],
      stockMinimoDosis: null,
    })

    const resultado = await listarCatalogoProductoSanitario(fake.port)({
      fincaId: FINCA,
      soloActivos: true,
    })

    expect(resultado.tipo).toBe("catalogo")
    if (resultado.tipo === "catalogo") {
      expect(resultado.stockMinimoDosis).toBe(STOCK_MINIMO_DOSIS_DEFAULT)
      const porId = new Map(resultado.filas.map((filaCatalogo) => [filaCatalogo.id, filaCatalogo]))
      expect(porId.get("p-19")?.estadoStock).toBe("bajo")
      expect(porId.get("p-20")?.estadoStock).toBe("ok")
    }
  })

  it("SAN-021: soloActivos se transmite al puerto (inactivos fuera de selects, visibles en históricos)", async () => {
    const fake = fakeCatalogo({ filas: [fila()] })

    await listarCatalogoProductoSanitario(fake.port)({ fincaId: FINCA, soloActivos: true })
    expect(fake.ultimoListarOpciones).toEqual({ soloActivos: true })

    await listarCatalogoProductoSanitario(fake.port)({ fincaId: FINCA, soloActivos: false })
    expect(fake.ultimoListarOpciones).toEqual({ soloActivos: false })
  })

  it("RN-041: el stock de cada fila proviene del puerto (vista inventario_sanitario), no se calcula en la capa de aplicación", async () => {
    const fake = fakeCatalogo({
      filas: [fila({ id: "p-negativo", stockDisponible: -4 })],
      stockMinimoDosis: 15,
    })

    const resultado = await listarCatalogoProductoSanitario(fake.port)({
      fincaId: FINCA,
      soloActivos: false,
    })

    expect(resultado.tipo).toBe("catalogo")
    if (resultado.tipo === "catalogo") {
      expect(resultado.filas[0]?.stockDisponible).toBe(-4)
      expect(resultado.filas[0]?.estadoStock).toBe("agotado")
    }
  })
})
