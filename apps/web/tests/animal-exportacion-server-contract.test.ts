import type { AnimalExportacionRequest } from "@ganaweb/aplicacion"
/**
 * RED → GREEN for tasks 4.1/4.2 (LA-040/041/043/070/072, LA-RBAC-04/05/075).
 *
 * Contract test for the export HTTP handler `createAnimalExportacionHttpHandler`.
 * Mirrors `animal-list-server-contract.test.ts`: a `handlerWith(overrides)`
 * factory injects fake dependencies so the test verifies the HANDLER wiring
 * (parse → authorize → resolve limits → generate → stream) and its error
 * contract, not the generator internals (covered by the PR2 exportador tests).
 *
 * Error contract under test:
 *   - 400 names the offending `campo` (invalid format / scope / shared parser).
 *   - 403 returns no data — both for an unresolved session (the route produces
 *     `null` when `animales:ver` + `reportes:exportar` + finca membership fail)
 *     and for a fail-closed forbidden thrown by the read port.
 *   - 413 on row overflow (config-driven `maxFilas`).
 *   - timeout → a specific 500 (distinct motive) when the abort signal fires.
 *   - generic 500 is sanitized: carries a `requestId`, never leaks driver/stack
 *     detail (LA-043), and calls `reportError` exactly once.
 *   - success sets `Content-Type` per format and `Content-Disposition:
 *     attachment` with filename `animales_{vista|todas}_{yyyyMMdd-HHmmss}.{ext}`.
 *
 * NOTE: this file matches the vitest glob `tests/animal-exportacion-*.test.ts`
 * (alongside the PR2 exportador tests), so it uses vitest `describe/it/expect`
 * rather than the tsx `node:assert` style of the older list contract test.
 */
import { describe, expect, it } from "vitest"
import {
  type AnimalExportacionHttpDependencies,
  createAnimalExportacionHttpHandler,
  formatearMarcaTiempoExportacion,
} from "../src/server/animal-exportacion-http.js"
import { filaAnimal } from "./animal-exportacion-fixture.js"

const codificar = (texto: string): Uint8Array => new TextEncoder().encode(texto)

/** A signal that never aborts — the happy-path default for non-timeout tests. */
const senalNuncaAborta = (): AbortSignal => new AbortController().signal

function handlerWith(overrides: Partial<AnimalExportacionHttpDependencies> = {}) {
  return createAnimalExportacionHttpHandler({
    getUsuarioId: async () => "usuario-1",
    readPort: { exportar: async () => [filaAnimal()] },
    leerLimites: async () => ({ maxFilas: 50000, timeoutSegundos: 30 }),
    generadores: {
      xlsx: async () => codificar("xlsx-bytes"),
      csv: async () => codificar("csv-bytes"),
      pdf: async () => codificar("pdf-bytes"),
    },
    isForbidden: () => false,
    isOverflow: () => false,
    crearSenal: senalNuncaAborta,
    requestId: () => "req-export-1",
    now: () => new Date("2026-01-02T03:04:05Z"),
    reportError: () => {},
    ...overrides,
  })
}

const solicitar = (handler: ReturnType<typeof handlerWith>, query: string, fincaId = "finca-1") =>
  handler({
    request: new Request(`http://test/api/fincas/${fincaId}/animales/exportar?${query}`),
    fincaId,
  })

describe("export handler — 400 names the offending campo (LA-040)", () => {
  it("rejects an invalid format with campo='format' and does no work", async () => {
    let lecturasLimites = 0
    let exportaciones = 0
    const respuesta = await handlerWith({
      leerLimites: async () => {
        lecturasLimites += 1
        return { maxFilas: 50000, timeoutSegundos: 30 }
      },
      readPort: {
        exportar: async () => {
          exportaciones += 1
          return [filaAnimal()]
        },
      },
    })({
      request: new Request(
        "http://test/api/fincas/finca-1/animales/exportar?format=docx&scope=todas",
      ),
      fincaId: "finca-1",
    })

    expect(respuesta.status).toBe(400)
    expect(await respuesta.json()).toEqual({
      error: "Solicitud inválida",
      campo: "format",
      motivo: "format debe ser xlsx, csv o pdf",
      requestId: "req-export-1",
    })
    expect(lecturasLimites).toBe(0)
    expect(exportaciones).toBe(0)
  })

  it("rejects an invalid scope with campo='scope'", async () => {
    const respuesta = await solicitar(handlerWith(), "format=csv&scope=ambas")
    expect(respuesta.status).toBe(400)
    expect(await respuesta.json()).toEqual({
      error: "Solicitud inválida",
      campo: "scope",
      motivo: "scope debe ser todas o vista",
      requestId: "req-export-1",
    })
  })

  it("rejects an invalid shared-parser parameter with its own campo (pageSize)", async () => {
    const respuesta = await solicitar(handlerWith(), "format=csv&scope=todas&pageSize=30")
    expect(respuesta.status).toBe(400)
    expect(await respuesta.json()).toEqual({
      error: "Solicitud inválida",
      campo: "pageSize",
      motivo: "pageSize debe ser 25, 50 o 100",
      requestId: "req-export-1",
    })
  })
})

describe("export handler — 403 returns no data, fail-closed (LA-041, LA-RBAC-04/05/075)", () => {
  it("denies an unresolved session (missing export permission) without reading limits or data", async () => {
    let lecturasLimites = 0
    let exportaciones = 0
    const generados: string[] = []
    const respuesta = await handlerWith({
      getUsuarioId: async () => null,
      leerLimites: async () => {
        lecturasLimites += 1
        return { maxFilas: 50000, timeoutSegundos: 30 }
      },
      readPort: {
        exportar: async () => {
          exportaciones += 1
          return [filaAnimal()]
        },
      },
      generadores: {
        xlsx: async () => {
          generados.push("xlsx")
          return codificar("xlsx-bytes")
        },
        csv: async () => {
          generados.push("csv")
          return codificar("csv-bytes")
        },
        pdf: async () => {
          generados.push("pdf")
          return codificar("pdf-bytes")
        },
      },
    })({
      request: new Request(
        "http://test/api/fincas/finca-a/animales/exportar?format=csv&scope=todas",
      ),
      fincaId: "finca-a",
    })

    expect(respuesta.status).toBe(403)
    expect(await respuesta.json()).toEqual({
      error: "Acceso denegado",
      campo: null,
      motivo: "No autorizado",
      requestId: "req-export-1",
    })
    // Fail-closed ordering: no config read, no data read, no artifact generated.
    expect(lecturasLimites).toBe(0)
    expect(exportaciones).toBe(0)
    expect(generados).toEqual([])
  })

  it("maps a fail-closed forbidden thrown by the read port to 403 without generating or reporting", async () => {
    let reportes = 0
    const generados: string[] = []
    const respuesta = await handlerWith({
      readPort: { exportar: async () => Promise.reject(new Error("forbidden")) },
      isForbidden: (error) => error instanceof Error && error.message === "forbidden",
      generadores: {
        xlsx: async () => {
          generados.push("xlsx")
          return codificar("xlsx-bytes")
        },
        csv: async () => {
          generados.push("csv")
          return codificar("csv-bytes")
        },
        pdf: async () => {
          generados.push("pdf")
          return codificar("pdf-bytes")
        },
      },
      reportError: () => {
        reportes += 1
      },
    })({
      request: new Request(
        "http://test/api/fincas/finca-b/animales/exportar?format=csv&scope=todas",
      ),
      fincaId: "finca-b",
    })

    expect(respuesta.status).toBe(403)
    expect(generados).toEqual([])
    expect(reportes).toBe(0)
  })
})

describe("export handler — 413 on row overflow (LA-072)", () => {
  it("returns 413 with a sanitized motive and does not generate or report", async () => {
    let reportes = 0
    const generados: string[] = []
    const respuesta = await handlerWith({
      readPort: { exportar: async () => Promise.reject(new Error("overflow")) },
      isOverflow: (error) => error instanceof Error && error.message === "overflow",
      generadores: {
        xlsx: async () => {
          generados.push("xlsx")
          return codificar("xlsx-bytes")
        },
        csv: async () => {
          generados.push("csv")
          return codificar("csv-bytes")
        },
        pdf: async () => {
          generados.push("pdf")
          return codificar("pdf-bytes")
        },
      },
      reportError: () => {
        reportes += 1
      },
    })({
      request: new Request(
        "http://test/api/fincas/finca-1/animales/exportar?format=csv&scope=todas",
      ),
      fincaId: "finca-1",
    })

    expect(respuesta.status).toBe(413)
    expect(await respuesta.json()).toEqual({
      error: "Demasiados resultados",
      campo: null,
      motivo: "Afina los filtros para reducir los animales",
      requestId: "req-export-1",
    })
    expect(generados).toEqual([])
    expect(reportes).toBe(0)
  })
})

describe("export handler — timeout signal (LA-072)", () => {
  it("returns a specific 500 (distinct from the generic 500) when the abort signal fires", async () => {
    let reportes = 0
    const respuesta = await handlerWith({
      // Already-aborted signal whose reason is a TimeoutError → deterministic, no timers.
      crearSenal: () =>
        AbortSignal.abort(new DOMException("The operation timed out", "TimeoutError")),
      readPort: { exportar: async () => [filaAnimal()] },
      reportError: () => {
        reportes += 1
      },
    })({
      request: new Request(
        "http://test/api/fincas/finca-1/animales/exportar?format=csv&scope=todas",
      ),
      fincaId: "finca-1",
    })

    expect(respuesta.status).toBe(500)
    expect(await respuesta.json()).toEqual({
      error: "La exportación tardó demasiado",
      campo: null,
      motivo: "Reduce los filtros o el alcance",
      requestId: "req-export-1",
    })
    // A timeout is a sanctioned operational limit, not an unexpected failure.
    expect(reportes).toBe(0)
  })
})

describe("export handler — generic 500 is sanitized (LA-043)", () => {
  it("never leaks driver/stack detail, carries requestId, and reports exactly once", async () => {
    let reportes = 0
    const respuesta = await handlerWith({
      readPort: {
        exportar: async () =>
          Promise.reject(new Error("password=secret connection refused at 10.0.0.1:5432")),
      },
      reportError: () => {
        reportes += 1
      },
    })({
      request: new Request(
        "http://test/api/fincas/finca-1/animales/exportar?format=csv&scope=todas",
      ),
      fincaId: "finca-1",
    })

    expect(respuesta.status).toBe(500)
    const cuerpo = await respuesta.json()
    expect(cuerpo).toEqual({
      error: "Error interno",
      campo: null,
      motivo: "No fue posible generar el archivo",
      requestId: "req-export-1",
    })
    const serializado = JSON.stringify(cuerpo)
    expect(serializado).not.toContain("password")
    expect(serializado).not.toContain("secret")
    expect(serializado).not.toContain("5432")
    expect(reportes).toBe(1)
  })
})

describe("export handler — success streams an attachment (LA-070/072)", () => {
  it("CSV: sets Content-Type, Content-Disposition attachment and the design filename", async () => {
    const generados: string[] = []
    let solicitudExportacion: AnimalExportacionRequest | null = null
    const respuesta = await handlerWith({
      readPort: {
        exportar: async (request) => {
          solicitudExportacion = request
          return [filaAnimal()]
        },
      },
      generadores: {
        xlsx: async () => {
          generados.push("xlsx")
          return codificar("xlsx-bytes")
        },
        csv: async () => {
          generados.push("csv")
          return codificar("csv-bytes")
        },
        pdf: async () => {
          generados.push("pdf")
          return codificar("pdf-bytes")
        },
      },
    })({
      request: new Request(
        "http://test/api/fincas/finca-1/animales/exportar?format=csv&scope=todas",
      ),
      fincaId: "finca-1",
    })

    expect(respuesta.status).toBe(200)
    expect(respuesta.headers.get("Content-Type")).toBe("text/csv; charset=utf-8")
    expect(respuesta.headers.get("Content-Disposition")).toBe(
      'attachment; filename="animales_todas_20260102-030405.csv"',
    )
    expect(generados).toEqual(["csv"])
    expect(new Uint8Array(await respuesta.arrayBuffer())).toEqual(codificar("csv-bytes"))
    // Config-driven limits + scope column resolution are injected into the port.
    expect(solicitudExportacion?.maxFilas).toBe(50000)
    expect(solicitudExportacion?.columnas).toHaveLength(36)
    expect(solicitudExportacion?.fincaId).toBe("finca-1")
    expect(solicitudExportacion?.usuarioId).toBe("usuario-1")
  })

  it("XLSX: selects the xlsx generator and its Open XML content type / extension", async () => {
    const generados: string[] = []
    const respuesta = await handlerWith({
      generadores: {
        xlsx: async () => {
          generados.push("xlsx")
          return codificar("xlsx-bytes")
        },
        csv: async () => {
          generados.push("csv")
          return codificar("csv-bytes")
        },
        pdf: async () => {
          generados.push("pdf")
          return codificar("pdf-bytes")
        },
      },
    })({
      request: new Request(
        "http://test/api/fincas/finca-1/animales/exportar?format=xlsx&scope=todas",
      ),
      fincaId: "finca-1",
    })

    expect(respuesta.status).toBe(200)
    expect(respuesta.headers.get("Content-Type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    expect(respuesta.headers.get("Content-Disposition")).toBe(
      'attachment; filename="animales_todas_20260102-030405.xlsx"',
    )
    expect(generados).toEqual(["xlsx"])
  })

  it("PDF: selects the pdf generator and its content type / extension", async () => {
    const generados: string[] = []
    const respuesta = await handlerWith({
      generadores: {
        xlsx: async () => {
          generados.push("xlsx")
          return codificar("xlsx-bytes")
        },
        csv: async () => {
          generados.push("csv")
          return codificar("csv-bytes")
        },
        pdf: async () => {
          generados.push("pdf")
          return codificar("pdf-bytes")
        },
      },
    })({
      request: new Request(
        "http://test/api/fincas/finca-1/animales/exportar?format=pdf&scope=todas",
      ),
      fincaId: "finca-1",
    })

    expect(respuesta.status).toBe(200)
    expect(respuesta.headers.get("Content-Type")).toBe("application/pdf")
    expect(respuesta.headers.get("Content-Disposition")).toBe(
      'attachment; filename="animales_todas_20260102-030405.pdf"',
    )
    expect(generados).toEqual(["pdf"])
  })

  it("scope=vista uses the 'vista' filename segment and the effective cols", async () => {
    let solicitudExportacion: AnimalExportacionRequest | null = null
    const respuesta = await handlerWith({
      readPort: {
        exportar: async (request) => {
          solicitudExportacion = request
          return [filaAnimal()]
        },
      },
    })({
      request: new Request(
        "http://test/api/fincas/finca-1/animales/exportar?format=csv&scope=vista&cols=codigo,nombre,sexo,raza",
      ),
      fincaId: "finca-1",
    })

    expect(respuesta.status).toBe(200)
    expect(respuesta.headers.get("Content-Disposition")).toBe(
      'attachment; filename="animales_vista_20260102-030405.csv"',
    )
    // vista resolves the normalized effective cols in canonical order.
    expect(solicitudExportacion?.columnas).toEqual(["codigo", "nombre", "sexo", "raza"])
  })
})

describe("formatearMarcaTiempoExportacion — pure filename timestamp (LA-070)", () => {
  it("formats a Date as yyyyMMdd-HHmmss in UTC with zero padding", () => {
    expect(formatearMarcaTiempoExportacion(new Date("2026-01-02T03:04:05Z"))).toBe(
      "20260102-030405",
    )
  })

  it("zero-pads single-digit month/day/hour/minute/second", () => {
    expect(formatearMarcaTiempoExportacion(new Date("2026-12-31T23:59:58Z"))).toBe(
      "20261231-235958",
    )
    expect(formatearMarcaTiempoExportacion(new Date("2026-07-09T08:07:06Z"))).toBe(
      "20260709-080706",
    )
  })
})
