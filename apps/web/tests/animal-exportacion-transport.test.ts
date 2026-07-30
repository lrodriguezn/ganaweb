/**
 * #111 (PR5) — export download transport for the desktop animal list.
 * Vitest suite, node environment (pure logic; fetch + download are injected).
 *
 * Contract source: the export HTTP handler (`animal-exportacion-http.ts`) and
 * the `ResultadoListadoDesktop` discriminated union this transport mirrors.
 * The transport fetches the export endpoint, receives the artifact as a blob,
 * and triggers a real client download (LA-070) — never an inline render or a
 * navigation. HTTP outcomes map onto distinct, non-destructive states
 * (LA-040/041/072/076): 400 / 403 / 413 / timeout / 500.
 */
import { describe, expect, it, vi } from "vitest"
import {
  type ResultadoExportacionDesktop,
  exportarListadoDesktop,
} from "../src/features/animal-listado/animal-listado-route-adapter.js"
import type { ApiErrorDto } from "../src/server/animal-list-contract.js"

const SELECCION = { alcance: "todas", formato: "csv" } as const

function errorApi(overrides: Partial<ApiErrorDto> = {}): ApiErrorDto {
  return {
    error: "bad_request",
    campo: "format",
    motivo: "format debe ser xlsx, csv o pdf",
    requestId: "req-1",
    ...overrides,
  }
}

function fetchJson(cuerpo: unknown, estado: number): typeof fetch {
  return async () => new Response(JSON.stringify(cuerpo), { status: estado })
}

/** Captures every download the transport triggers. */
function spyDescarga() {
  const descargas: { blob: Blob; nombreArchivo: string }[] = []
  const descargaImpl = (blob: Blob, nombreArchivo: string) => {
    descargas.push({ blob, nombreArchivo })
  }
  return { descargas, descargaImpl }
}

describe("Export transport — successful download (LA-070, task 6.3)", () => {
  it("200 → exito, fetching the artifact as a blob and triggering a real download", async () => {
    const bytes = new TextEncoder().encode("codigo,nombre\nMT-001,Mariposa\n")
    const fetchImpl: typeof fetch = async () =>
      new Response(bytes, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="animales_todas_20260731-120000.csv"',
        },
      })
    const { descargas, descargaImpl } = spyDescarga()

    const resultado = await exportarListadoDesktop("finca-1", SELECCION, {
      fetchImpl,
      descargaImpl,
    })

    if (resultado.tipo !== "exito") throw new Error(`esperado exito, recibido ${resultado.tipo}`)
    // The filename is taken from Content-Disposition.
    expect(resultado.nombreArchivo).toBe("animales_todas_20260731-120000.csv")
    // Exactly one download was triggered, with the artifact bytes as a Blob.
    expect(descargas).toHaveLength(1)
    expect(descargas[0]?.nombreArchivo).toBe("animales_todas_20260731-120000.csv")
    expect(descargas[0]?.blob).toBeInstanceOf(Blob)
    expect(descargas[0]?.blob.size).toBe(bytes.byteLength)
    expect(await descargas[0]?.blob.text()).toBe("codigo,nombre\nMT-001,Mariposa\n")
  })

  it("requests the export endpoint for the finca, preserving the active query and adding format/scope", async () => {
    const urls: string[] = []
    const fetchImpl: typeof fetch = async (input) => {
      urls.push(String(input))
      return new Response(new Uint8Array([1]), { status: 200 })
    }
    const { descargaImpl } = spyDescarga()

    await exportarListadoDesktop("finca-1", SELECCION, {
      fetchImpl,
      descargaImpl,
      consulta: "pageSize=50&sort=codigo%3Aasc&q=toros&f.razaId=in%3Araza-1&cols=codigo%2Cnombre",
    })

    expect(urls).toHaveLength(1)
    const url = new URL(urls[0] ?? "", "http://localhost")
    expect(url.pathname).toBe("/api/fincas/finca-1/animales/exportar")
    expect(url.searchParams.get("format")).toBe("csv")
    expect(url.searchParams.get("scope")).toBe("todas")
    // The active filters/sort/search/cols ride along — the retry preserves them.
    expect(url.searchParams.get("sort")).toBe("codigo:asc")
    expect(url.searchParams.get("q")).toBe("toros")
    expect(url.searchParams.get("f.razaId")).toBe("in:raza-1")
    expect(url.searchParams.get("cols")).toBe("codigo,nombre")
  })

  it("falls back to a derived filename when Content-Disposition is absent", async () => {
    const fetchImpl: typeof fetch = async () => new Response(new Uint8Array([1]), { status: 200 })
    const { descargas, descargaImpl } = spyDescarga()

    const resultado = await exportarListadoDesktop(
      "finca-1",
      { alcance: "vista", formato: "xlsx" },
      {
        fetchImpl,
        descargaImpl,
      },
    )

    if (resultado.tipo !== "exito") throw new Error(`esperado exito, recibido ${resultado.tipo}`)
    expect(resultado.nombreArchivo).toBe("animales_vista.xlsx")
    expect(descargas[0]?.nombreArchivo).toBe("animales_vista.xlsx")
  })
})

describe("Export transport — error mapping (LA-040/041/072/076, task 6.3)", () => {
  it("400 → consulta_invalida carrying the ApiErrorDto", async () => {
    const cuerpo = errorApi()
    const resultado = await exportarListadoDesktop("finca-1", SELECCION, {
      fetchImpl: fetchJson(cuerpo, 400),
      descargaImpl: spyDescarga().descargaImpl,
    })
    expect(resultado).toEqual({
      tipo: "consulta_invalida",
      error: cuerpo,
    } satisfies ResultadoExportacionDesktop)
  })

  it("403 → sin_acceso carrying the ApiErrorDto", async () => {
    const cuerpo = errorApi({
      error: "Acceso denegado",
      campo: null,
      motivo: "No autorizado",
      requestId: "req-403",
    })
    const resultado = await exportarListadoDesktop("finca-1", SELECCION, {
      fetchImpl: fetchJson(cuerpo, 403),
      descargaImpl: spyDescarga().descargaImpl,
    })
    if (resultado.tipo !== "sin_acceso")
      throw new Error(`esperado sin_acceso, recibido ${resultado.tipo}`)
    expect(resultado.error.requestId).toBe("req-403")
  })

  it("403 without a parseable body still resolves sin_acceso (never a false table)", async () => {
    const fetchImpl: typeof fetch = async () => new Response("oops", { status: 403 })
    const resultado = await exportarListadoDesktop("finca-1", SELECCION, {
      fetchImpl,
      descargaImpl: spyDescarga().descargaImpl,
    })
    expect(resultado.tipo).toBe("sin_acceso")
  })

  it("413 → demasiados_resultados carrying the ApiErrorDto", async () => {
    const cuerpo = errorApi({
      error: "Demasiados resultados",
      campo: null,
      motivo: "Afina los filtros para reducir los animales",
      requestId: "req-413",
    })
    const resultado = await exportarListadoDesktop("finca-1", SELECCION, {
      fetchImpl: fetchJson(cuerpo, 413),
      descargaImpl: spyDescarga().descargaImpl,
    })
    expect(resultado).toEqual({
      tipo: "demasiados_resultados",
      error: cuerpo,
    } satisfies ResultadoExportacionDesktop)
  })

  it("500 with the timeout title → timeout (the specific message)", async () => {
    const cuerpo = errorApi({
      error: "La exportación tardó demasiado",
      campo: null,
      motivo: "Reduce los filtros o el alcance",
      requestId: "req-to",
    })
    const resultado = await exportarListadoDesktop("finca-1", SELECCION, {
      fetchImpl: fetchJson(cuerpo, 500),
      descargaImpl: spyDescarga().descargaImpl,
    })
    expect(resultado).toEqual({
      tipo: "timeout",
      error: cuerpo,
    } satisfies ResultadoExportacionDesktop)
  })

  it("500 sanitized → error_servidor carrying the ApiErrorDto", async () => {
    const cuerpo = errorApi({
      error: "Error interno",
      campo: null,
      motivo: "No fue posible generar el archivo",
      requestId: "req-500",
    })
    const resultado = await exportarListadoDesktop("finca-1", SELECCION, {
      fetchImpl: fetchJson(cuerpo, 500),
      descargaImpl: spyDescarga().descargaImpl,
    })
    expect(resultado).toEqual({
      tipo: "error_servidor",
      error: cuerpo,
    } satisfies ResultadoExportacionDesktop)
  })

  it("network failure → error_servidor with null error, never a false 403", async () => {
    const fetchImpl: typeof fetch = async () => {
      throw new TypeError("fetch failed")
    }
    const resultado = await exportarListadoDesktop("finca-1", SELECCION, {
      fetchImpl,
      descargaImpl: spyDescarga().descargaImpl,
    })
    expect(resultado).toEqual({
      tipo: "error_servidor",
      error: null,
    } satisfies ResultadoExportacionDesktop)
  })

  it("never triggers a download on a failed outcome", async () => {
    const { descargas, descargaImpl } = spyDescarga()
    await exportarListadoDesktop("finca-1", SELECCION, {
      fetchImpl: fetchJson(errorApi({ error: "Error interno", requestId: "req-500" }), 500),
      descargaImpl,
    })
    expect(descargas).toHaveLength(0)
  })
})
