/**
 * Issue #227 — caso de uso de lectura del read model de finca.
 * Cubre la matriz RBAC, la validacion de filtros, la expansion
 * efectiva del subset de dominios y el handler tipado de errores.
 */
import {
  EventoReadForbiddenError,
  EventoReadInvalidError,
  PAGE_SIZE_FEED_FINCA,
  PAGE_SIZE_HISTORIAL_FINCA,
  type SesionAutorizada,
} from "@ganaweb/dominio"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  type EventosFincaPagina,
  type EventosFincaReadPort,
  type FeedFincaItem,
  type HistorialFincaItem,
  leerEventosFinca,
} from "../src/index.js"

function sesion(
  permisos: SesionAutorizada["permisos"],
  overrides: Partial<SesionAutorizada> = {},
): SesionAutorizada {
  return {
    usuarioId: "u-1",
    nombre: "Operaria",
    email: "o@ganaweb.test",
    fincaActivaId: "f-1",
    fincaActivaNombre: "Finca 1",
    rol: "Operario",
    permisos,
    fincas: [],
    ...overrides,
  }
}

interface LlamadasPort {
  feedFinca: ReturnType<typeof vi.fn>
  historialFinca: ReturnType<typeof vi.fn>
  contadoresFinca: ReturnType<typeof vi.fn>
}

function crearPortMock(): { port: EventosFincaReadPort; llamadas: LlamadasPort } {
  const llamadas: LlamadasPort = {
    feedFinca: vi.fn(),
    historialFinca: vi.fn(),
    contadoresFinca: vi.fn(),
  }
  const port: EventosFincaReadPort = {
    feedFinca: llamadas.feedFinca,
    historialFinca: llamadas.historialFinca,
    contadoresFinca: llamadas.contadoresFinca,
  }
  return { port, llamadas }
}

function paginaVacia<T>(): EventosFincaPagina<T> {
  return { items: [] }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("leerEventosFinca — RBAC server-side (fail-closed)", () => {
  it("rechaza feed sin permisos de ver para ningun dominio", async () => {
    const { port, llamadas } = crearPortMock()
    const caso = leerEventosFinca({ port })
    const resultado = await caso.feedFinca({
      sesion: sesion([{ modulo: "animales", accion: "ver" }]),
      fincaId: "f-1",
      pageSize: PAGE_SIZE_FEED_FINCA,
      dominiosPermitidos: [],
    })
    expect(resultado).toEqual({ tipo: "no_autorizado", permiso: "eventos:ver" })
    expect(llamadas.feedFinca).not.toHaveBeenCalled()
  })

  it("rechaza feed cuando la sesion apunta a otra finca (403 finca_no_autorizada)", async () => {
    const { port, llamadas } = crearPortMock()
    const caso = leerEventosFinca({ port })
    const resultado = await caso.feedFinca({
      sesion: sesion([{ modulo: "eventos_productivos", accion: "ver" }], { fincaActivaId: "f-1" }),
      fincaId: "f-2",
      pageSize: PAGE_SIZE_FEED_FINCA,
      dominiosPermitidos: ["productivo"],
    })
    expect(resultado.tipo).toBe("no_autorizado")
    if (resultado.tipo === "no_autorizado") {
      expect(resultado.permiso).toBeUndefined()
    }
    expect(llamadas.feedFinca).not.toHaveBeenCalled()
  })

  it("expone la lista efectiva de dominios visibles segun la sesion", () => {
    const { port } = crearPortMock()
    const caso = leerEventosFinca({ port })
    expect(
      caso.dominiosVisibles(
        sesion([
          { modulo: "eventos_productivos", accion: "ver" },
          { modulo: "sanidad", accion: "ver" },
        ]),
      ),
    ).toEqual(["productivo", "sanidad"])
  })
})

describe("leerEventosFinca — composicion del filtro y de la query al port", () => {
  it("envia al port la lista efectiva de dominios tras cruzar categoria y permisos", async () => {
    const { port, llamadas } = crearPortMock()
    const caso = leerEventosFinca({ port })
    llamadas.feedFinca.mockResolvedValueOnce(paginaVacia<FeedFincaItem>())
    const resultado = await caso.feedFinca({
      sesion: sesion([
        { modulo: "eventos_productivos", accion: "ver" },
        { modulo: "eventos_reproductivos", accion: "ver" },
      ]),
      fincaId: "f-1",
      categoria: "productivo",
      pageSize: PAGE_SIZE_FEED_FINCA,
      dominiosPermitidos: ["productivo", "reproductivo"],
    })
    expect(resultado).toEqual({ tipo: "ok", pagina: paginaVacia<FeedFincaItem>() })
    expect(llamadas.feedFinca).toHaveBeenCalledTimes(1)
    const request = llamadas.feedFinca.mock.calls[0]?.[0] as { categoria?: string }
    expect(request.categoria).toBe("productivo")
    expect(request.pageSize).toBe(PAGE_SIZE_FEED_FINCA)
  })

  it("convierte un filtro multi-dominio a categoria `todos` para el port", async () => {
    const { port, llamadas } = crearPortMock()
    const caso = leerEventosFinca({ port })
    llamadas.feedFinca.mockResolvedValueOnce(paginaVacia<FeedFincaItem>())
    await caso.feedFinca({
      sesion: sesion([
        { modulo: "eventos_productivos", accion: "ver" },
        { modulo: "sanidad", accion: "ver" },
      ]),
      fincaId: "f-1",
      pageSize: PAGE_SIZE_FEED_FINCA,
      dominiosPermitidos: ["productivo", "sanidad"],
    })
    const request = llamadas.feedFinca.mock.calls[0]?.[0] as { categoria?: string }
    expect(request.categoria).toBe("todos")
  })

  it("rechaza feed con pageSize que no es el del feed (20)", async () => {
    const { port, llamadas } = crearPortMock()
    const caso = leerEventosFinca({ port })
    const resultado = await caso.feedFinca({
      sesion: sesion([{ modulo: "eventos_productivos", accion: "ver" }]),
      fincaId: "f-1",
      pageSize: 50,
      dominiosPermitidos: ["productivo"],
    })
    expect(resultado).toEqual({ tipo: "filtro_invalido", campo: "pageSize" })
    expect(llamadas.feedFinca).not.toHaveBeenCalled()
  })

  it("rechaza historial con pageSize que no es 50", async () => {
    const { port, llamadas } = crearPortMock()
    const caso = leerEventosFinca({ port })
    const resultado = await caso.historialFinca({
      sesion: sesion([{ modulo: "eventos_productivos", accion: "ver" }]),
      fincaId: "f-1",
      pageSize: 20,
      dominiosPermitidos: ["productivo"],
    })
    expect(resultado).toEqual({ tipo: "filtro_invalido", campo: "pageSize" })
    expect(llamadas.historialFinca).not.toHaveBeenCalled()
  })

  it("mapea un EventoReadInvalidError del port a filtro_invalido", async () => {
    const { port, llamadas } = crearPortMock()
    const caso = leerEventosFinca({ port })
    llamadas.feedFinca.mockRejectedValueOnce(new EventoReadInvalidError("tipo"))
    const resultado = await caso.feedFinca({
      sesion: sesion([{ modulo: "eventos_productivos", accion: "ver" }]),
      fincaId: "f-1",
      tipo: "foto",
      pageSize: PAGE_SIZE_FEED_FINCA,
      dominiosPermitidos: ["productivo"],
    })
    expect(resultado).toEqual({ tipo: "filtro_invalido", campo: "tipo" })
  })

  it("mapea un EventoReadForbiddenError del port a no_autorizado (con permiso)", async () => {
    const { port, llamadas } = crearPortMock()
    const caso = leerEventosFinca({ port })
    llamadas.historialFinca.mockRejectedValueOnce(
      new EventoReadForbiddenError("permiso_denegado", "sanidad:ver"),
    )
    const resultado = await caso.historialFinca({
      sesion: sesion([{ modulo: "eventos_productivos", accion: "ver" }]),
      fincaId: "f-1",
      pageSize: PAGE_SIZE_HISTORIAL_FINCA,
      dominiosPermitidos: ["productivo"],
    })
    expect(resultado).toEqual({ tipo: "no_autorizado", permiso: "sanidad:ver" })
  })

  it("propaga errores no esperados sin envolverlos", async () => {
    const { port, llamadas } = crearPortMock()
    const caso = leerEventosFinca({ port })
    const fallo = new Error("db unavailable")
    llamadas.feedFinca.mockRejectedValueOnce(fallo)
    await expect(
      caso.feedFinca({
        sesion: sesion([{ modulo: "eventos_productivos", accion: "ver" }]),
        fincaId: "f-1",
        pageSize: PAGE_SIZE_FEED_FINCA,
        dominiosPermitidos: ["productivo"],
      }),
    ).rejects.toBe(fallo)
  })
})

describe("leerEventosFinca — historial y contadores", () => {
  it("delega al historial del port con la categoria efectiva", async () => {
    const { port, llamadas } = crearPortMock()
    const caso = leerEventosFinca({ port })
    llamadas.historialFinca.mockResolvedValueOnce(paginaVacia<HistorialFincaItem>())
    const resultado = await caso.historialFinca({
      sesion: sesion([{ modulo: "sanidad", accion: "ver" }]),
      fincaId: "f-1",
      categoria: "sanidad",
      pageSize: PAGE_SIZE_HISTORIAL_FINCA,
      dominiosPermitidos: ["sanidad"],
    })
    expect(resultado.tipo).toBe("ok")
    const request = llamadas.historialFinca.mock.calls[0]?.[0] as { categoria?: string }
    expect(request.categoria).toBe("sanidad")
  })

  it("pide contadores al port con el mes y la sesion de la finca activa", async () => {
    const { port, llamadas } = crearPortMock()
    const caso = leerEventosFinca({ port })
    llamadas.contadoresFinca.mockResolvedValueOnce({
      mes: "2026-08",
      desde: "2026-08-01",
      hasta: "2026-08-31",
      porDominio: { reproductivo: 0, productivo: 4, sanidad: 2, movimientos: 0 },
      total: 6,
    })
    const resultado = await caso.contadoresFinca({
      sesion: sesion([{ modulo: "eventos_productivos", accion: "ver" }]),
      fincaId: "f-1",
      mes: "2026-08",
      dominiosPermitidos: ["productivo", "sanidad"],
    })
    expect(resultado).toEqual({
      tipo: "ok",
      contadores: {
        mes: "2026-08",
        desde: "2026-08-01",
        hasta: "2026-08-31",
        porDominio: { reproductivo: 0, productivo: 4, sanidad: 2, movimientos: 0 },
        total: 6,
      },
    })
    const request = llamadas.contadoresFinca.mock.calls[0]?.[0] as { mes?: string }
    expect(request.mes).toBe("2026-08")
  })
})
