/**
 * Issue #157 — typed client adapter for the #155 mobile endpoint
 * (`GET /api/fincas/{fincaId}/animales/mobile`). Vitest suite, node
 * environment (pure logic, no DOM): URL building from the filter state and
 * outcome mapping through the injectable `fetchImpl` seam, mirroring the
 * desktop `cargarListadoDesktop` contract tests (animal-list-server-contract /
 * animal-listado-route.test.tsx style).
 *
 * Grammar (RF-ANIM-LIST-M v1.1 §4, LM-009/LM-014): filters travel by key/id
 * with grammar `in:<valor>` — NEVER labels (LA-001/CA-UI-001); every filter
 * change requests `page=1`, and #158 requests `page=N` for infinite-scroll
 * accumulation through the `pagina` option. LM-023: a 400 maps to
 * `consulta_invalida` carrying the parsed `ApiErrorDto` (sanitization by
 * `campo` lives in `sanitizarFiltrosMobilePorCampo`).
 */
import type { AnimalMobileListReadResult } from "@ganaweb/aplicacion"
import { describe, expect, it, vi } from "vitest"

import {
  cargarListadoMobile,
  construirConsultaListadoMobile,
  sanitizarFiltrosMobilePorCampo,
} from "../src/features/animales-mobile/animal-mobile-list-adapter.js"
import type { FiltrosListadoMobile } from "../src/features/animales-mobile/animal-mobile-list-adapter.js"

const filtrosDefecto: FiltrosListadoMobile = { chip: "todas", propietarioId: null, q: "" }

function paginaMobile(
  overrides: Partial<AnimalMobileListReadResult> = {},
): AnimalMobileListReadResult {
  return {
    data: [
      {
        id: "animal-1",
        codigo: "MT-122",
        nombre: "Matilda",
        sexo: { key: "1", label: "Hembra" },
        raza: { id: "raza-1", label: "Holstein" },
        categoriaReproductiva: { key: "prenada", label: "Preñada" },
        salud: { key: "0", label: "Sano" },
        esDeMonta: false,
        propietario: { id: "prop-1", label: "Don Juan" },
        madre: { codigo: "MT-101", nombre: "Estrella" },
      },
    ],
    page: 1,
    pageSize: 25,
    total: 1,
    totalSinFiltro: 1,
    hayMas: false,
    ...overrides,
  }
}

/** Structural Response: the adapter contract is `status` + `json()`. */
function respuestaHttp(cuerpo: unknown, status = 200): Response {
  return { status, json: async () => cuerpo } as unknown as Response
}

describe("URL building from the mobile filter state (LM-005/006/009)", () => {
  it("defaults to page=1 and pageSize=25 with no filters", () => {
    const parametros = new URLSearchParams(construirConsultaListadoMobile(filtrosDefecto))
    expect(parametros.get("page")).toBe("1")
    expect(parametros.get("pageSize")).toBe("25")
    expect(parametros.has("q")).toBe(false)
    expect([...parametros.keys()].some((key) => key.startsWith("f."))).toBe(false)
  })

  it("maps Preñadas to f.categoriaReproductivaKey=in:prenada", () => {
    const parametros = new URLSearchParams(
      construirConsultaListadoMobile({ ...filtrosDefecto, chip: "prenadas" }),
    )
    expect(parametros.get("f.categoriaReproductivaKey")).toBe("in:prenada")
    expect(parametros.has("f.saludKey")).toBe(false)
  })

  it("maps Enfermas to f.saludKey=in:1", () => {
    const parametros = new URLSearchParams(
      construirConsultaListadoMobile({ ...filtrosDefecto, chip: "enfermas" }),
    )
    expect(parametros.get("f.saludKey")).toBe("in:1")
    expect(parametros.has("f.categoriaReproductivaKey")).toBe(false)
  })

  it("maps a selected propietario to f.propietarioId=in:<id> — never the label", () => {
    const consulta = construirConsultaListadoMobile({
      ...filtrosDefecto,
      propietarioId: "prop-1",
    })
    const parametros = new URLSearchParams(consulta)
    expect(parametros.get("f.propietarioId")).toBe("in:prop-1")
    expect(consulta).not.toContain("Don Juan")
  })

  it("combines chip + propietario + q with AND and always requests page=1", () => {
    const parametros = new URLSearchParams(
      construirConsultaListadoMobile({ chip: "prenadas", propietarioId: "prop-2", q: "luna" }),
    )
    expect(parametros.get("page")).toBe("1")
    expect(parametros.get("f.categoriaReproductivaKey")).toBe("in:prenada")
    expect(parametros.get("f.propietarioId")).toBe("in:prop-2")
    expect(parametros.get("q")).toBe("luna")
  })

  it("encodes q for transport and omits it when empty or whitespace-only", () => {
    const conQ = construirConsultaListadoMobile({ ...filtrosDefecto, q: "hola señor & café" })
    expect(conQ).toContain("q=hola+se%C3%B1or+%26+caf%C3%A9")
    expect(new URLSearchParams(conQ).get("q")).toBe("hola señor & café")

    expect(new URLSearchParams(construirConsultaListadoMobile(filtrosDefecto)).has("q")).toBe(false)
    expect(
      new URLSearchParams(construirConsultaListadoMobile({ ...filtrosDefecto, q: "   " })).has("q"),
    ).toBe(false)
  })

  it("builds page=N for infinite-scroll accumulation, keeping filters intact (LM-009)", () => {
    const parametros = new URLSearchParams(
      construirConsultaListadoMobile({ chip: "prenadas", propietarioId: "prop-2", q: "luna" }, 3),
    )
    expect(parametros.get("page")).toBe("3")
    expect(parametros.get("pageSize")).toBe("25")
    expect(parametros.get("f.categoriaReproductivaKey")).toBe("in:prenada")
    expect(parametros.get("f.propietarioId")).toBe("in:prop-2")
    expect(parametros.get("q")).toBe("luna")
  })
})

describe("Outcome mapping through the fetchImpl seam (LM-009)", () => {
  it("200 → listo carrying the #155 read result, requesting the mobile endpoint", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(respuestaHttp(paginaMobile()))
    const resultado = await cargarListadoMobile("finca-1", filtrosDefecto, { fetchImpl })

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const url = fetchImpl.mock.calls[0]?.[0] as string
    expect(url.startsWith("/api/fincas/finca-1/animales/mobile?")).toBe(true)
    expect(new URLSearchParams(url.slice(url.indexOf("?") + 1)).get("page")).toBe("1")
    expect(resultado).toEqual({ tipo: "listo", resultado: paginaMobile() })
  })

  it("403 → sin_acceso", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        respuestaHttp(
          { error: "forbidden", campo: null, motivo: "No autorizado", requestId: "r1" },
          403,
        ),
      )
    expect(await cargarListadoMobile("finca-1", filtrosDefecto, { fetchImpl })).toEqual({
      tipo: "sin_acceso",
    })
  })

  it("400 → consulta_invalida carrying the parsed ApiErrorDto with its campo (LM-023)", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        respuestaHttp(
          { error: "bad_request", campo: "q", motivo: "q no puede estar vacío", requestId: "r2" },
          400,
        ),
      )
    expect(await cargarListadoMobile("finca-1", filtrosDefecto, { fetchImpl })).toEqual({
      tipo: "consulta_invalida",
      error: {
        error: "bad_request",
        campo: "q",
        motivo: "q no puede estar vacío",
        requestId: "r2",
      },
    })
  })

  it("a 400 with an unparseable body degrades to error_servidor, never a crash", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      status: 400,
      json: async () => {
        throw new Error("cuerpo inválido")
      },
    })
    expect(await cargarListadoMobile("finca-1", filtrosDefecto, { fetchImpl })).toEqual({
      tipo: "error_servidor",
    })
  })

  it("the pagina option requests page=N on the mobile endpoint (LM-009)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(respuestaHttp(paginaMobile({ page: 2 })))
    await cargarListadoMobile("finca-1", filtrosDefecto, { fetchImpl, pagina: 2 })

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const url = fetchImpl.mock.calls[0]?.[0] as string
    const parametros = new URLSearchParams(url.slice(url.indexOf("?") + 1))
    expect(parametros.get("page")).toBe("2")
    expect(parametros.get("pageSize")).toBe("25")
  })

  it("500 → error_servidor", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        respuestaHttp(
          { error: "server_error", campo: null, motivo: "Fallo interno", requestId: "r3" },
          500,
        ),
      )
    expect(await cargarListadoMobile("finca-1", filtrosDefecto, { fetchImpl })).toEqual({
      tipo: "error_servidor",
    })
  })

  it("network failure / timeout abort → error_servidor, never a crash", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValue(new DOMException("The operation was aborted", "AbortError"))
    expect(await cargarListadoMobile("finca-1", filtrosDefecto, { fetchImpl })).toEqual({
      tipo: "error_servidor",
    })
  })

  it("an unparseable 200 body → error_servidor, never a silent empty list", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => {
        throw new Error("cuerpo inválido")
      },
    })
    expect(await cargarListadoMobile("finca-1", filtrosDefecto, { fetchImpl })).toEqual({
      tipo: "error_servidor",
    })
  })
})

describe("400 filter sanitization by ApiErrorDto campo (LM-023)", () => {
  const filtrosActivos: FiltrosListadoMobile = {
    chip: "prenadas",
    propietarioId: "prop-1",
    q: "luna",
  }

  it("campo q clears the search and keeps chip/propietario", () => {
    const saneado = sanitizarFiltrosMobilePorCampo(filtrosActivos, "q")
    expect(saneado).toEqual({ chip: "prenadas", propietarioId: "prop-1", q: "" })
  })

  it("campo f.categoriaReproductivaKey resets the chip to todas", () => {
    const saneado = sanitizarFiltrosMobilePorCampo(filtrosActivos, "f.categoriaReproductivaKey")
    expect(saneado).toEqual({ chip: "todas", propietarioId: "prop-1", q: "luna" })
  })

  it("campo f.saludKey resets the chip to todas", () => {
    const saneado = sanitizarFiltrosMobilePorCampo(
      { ...filtrosActivos, chip: "enfermas" },
      "f.saludKey",
    )
    expect(saneado).toEqual({ chip: "todas", propietarioId: "prop-1", q: "luna" })
  })

  it("campo f.propietarioId clears the propietario selection", () => {
    const saneado = sanitizarFiltrosMobilePorCampo(filtrosActivos, "f.propietarioId")
    expect(saneado).toEqual({ chip: "prenadas", propietarioId: null, q: "luna" })
  })

  it("page/pageSize are transport-only — the filters are returned unchanged", () => {
    expect(sanitizarFiltrosMobilePorCampo(filtrosActivos, "page")).toEqual(filtrosActivos)
    expect(sanitizarFiltrosMobilePorCampo(filtrosActivos, "pageSize")).toEqual(filtrosActivos)
  })

  it("an unknown or absent campo leaves the filters unchanged", () => {
    expect(sanitizarFiltrosMobilePorCampo(filtrosActivos, null)).toEqual(filtrosActivos)
    expect(sanitizarFiltrosMobilePorCampo(filtrosActivos, "f.desconocido")).toEqual(filtrosActivos)
  })
})
