/**
 * #110 (PR 2) — animal-list preference lifecycle + pagination/column mutation
 * builders. Vitest suite, node environment (pure logic, no DOM).
 *
 * Contract source: the typed route adapter (`./animal-listado-route-adapter.js`)
 * extended for #110, plus the #107 registry (`animal-list-contract.ts`) and the
 * PR1 preference normalization rules (registered-only, mandatory `codigo`/
 * `nombre`, page-size whitelist, 29/25 defaults).
 *
 * Covers the route-level spec decisions at the adapter boundary:
 * - URL overrides preferences (animal-listado-query-state).
 * - Failed preference load resolves 29/25 defaults + retryable warning.
 * - page resets to 1 on page-size/column mutation; page mutation is isolated.
 * - Failed save reports error so the route keeps the session selection + retry.
 */
import { describe, expect, it } from "vitest"
import { ANIMAL_LIST_DEFAULT_COLUMNS } from "../../server/animal-list-contract.js"
import {
  COLUMNAS_INMUTABLES_LISTADO,
  PAGE_SIZE_OPTIONS_LISTADO,
  type PreferenciasListado,
  cambiarColsListado,
  cambiarPageSizeListado,
  cambiarPaginaListado,
  cargarPreferenciasListado,
  crearSelectorColumnasListado,
  esPreferenciaDefectoListado,
  guardarPreferenciasListado,
  mezclarPreferenciasListado,
  normalizarColsListado,
  normalizarPageSizeListado,
  resolverColsListado,
  resolverPageSizeListado,
} from "./animal-listado-route-adapter.js"

const VEINTINUEVE = [...ANIMAL_LIST_DEFAULT_COLUMNS]

function consulta(params: string): URLSearchParams {
  return new URLSearchParams(params)
}

describe("resolverPageSizeListado", () => {
  it("accepts a whitelisted page size", () => {
    expect(resolverPageSizeListado(consulta("pageSize=50"))).toBe(50)
    expect(resolverPageSizeListado(consulta("pageSize=100"))).toBe(100)
  })

  it("rejects absent, empty, or non-whitelisted values", () => {
    expect(resolverPageSizeListado(consulta(""))).toBeNull()
    expect(resolverPageSizeListado(consulta("pageSize="))).toBeNull()
    expect(resolverPageSizeListado(consulta("pageSize=99"))).toBeNull()
    expect(resolverPageSizeListado(consulta("pageSize=abc"))).toBeNull()
  })
})

describe("resolverColsListado", () => {
  it("parses recognized columns in canonical order", () => {
    expect(resolverColsListado(consulta("cols=raza,codigo,nombre"))).toEqual([
      "codigo",
      "nombre",
      "raza",
    ])
  })

  it("returns null when absent or nothing is recognized", () => {
    expect(resolverColsListado(consulta(""))).toBeNull()
    expect(resolverColsListado(consulta("cols="))).toBeNull()
    expect(resolverColsListado(consulta("cols=fake,otro"))).toBeNull()
  })
})

describe("normalizarColsListado", () => {
  it("filters to registered, dedupes, injects mandatory, sorts canonically", () => {
    expect(normalizarColsListado(["raza", "codigo", "nombre", "raza", "fake"])).toEqual([
      "codigo",
      "nombre",
      "raza",
    ])
  })

  it("injects mandatory columns when absent", () => {
    expect(normalizarColsListado(["raza", "sexo"])).toEqual(["codigo", "nombre", "sexo", "raza"])
  })

  it("falls back to the 29 base columns when nothing valid survives", () => {
    expect(normalizarColsListado(["fake"])).toEqual(VEINTINUEVE)
    expect(normalizarColsListado([])).toEqual(VEINTINUEVE)
  })
})

describe("mezclarPreferenciasListado — URL overrides preferences", () => {
  const prefs: PreferenciasListado = { cols: ["codigo", "nombre", "sexo"], pageSize: 100 }

  it("uses valid URL values over saved preferences", () => {
    const resultado = mezclarPreferenciasListado(consulta("pageSize=50&cols=codigo,nombre,raza"), {
      tipo: "listo",
      preferencias: prefs,
    })
    expect(resultado.efectivas.pageSize).toBe(50)
    expect(resultado.efectivas.cols).toEqual(["codigo", "nombre", "raza"])
    expect(resultado.avisoCarga).toBe(false)
  })

  it("uses saved preferences when the URL lacks values", () => {
    const resultado = mezclarPreferenciasListado(consulta(""), {
      tipo: "listo",
      preferencias: prefs,
    })
    expect(resultado.efectivas.pageSize).toBe(100)
    expect(resultado.efectivas.cols).toEqual(["codigo", "nombre", "sexo"])
    expect(resultado.avisoCarga).toBe(false)
  })

  it("merges per field: URL page size with preference columns", () => {
    const resultado = mezclarPreferenciasListado(consulta("pageSize=50"), {
      tipo: "listo",
      preferencias: prefs,
    })
    expect(resultado.efectivas.pageSize).toBe(50)
    expect(resultado.efectivas.cols).toEqual(["codigo", "nombre", "sexo"])
  })

  it("ignores an invalid URL page size and keeps the preference value", () => {
    const resultado = mezclarPreferenciasListado(consulta("pageSize=99"), {
      tipo: "listo",
      preferencias: prefs,
    })
    expect(resultado.efectivas.pageSize).toBe(100)
    expect(resultado.avisoCarga).toBe(false)
  })
})

describe("mezclarPreferenciasListado — failed load uses defaults + warning", () => {
  it("resolves 29/25 defaults with a retryable warning when URL values are absent", () => {
    const resultado = mezclarPreferenciasListado(consulta(""), { tipo: "error" })
    expect(resultado.efectivas.pageSize).toBe(25)
    expect(resultado.efectivas.cols).toEqual(VEINTINUEVE)
    expect(resultado.avisoCarga).toBe(true)
  })

  it("keeps valid URL values without a warning even when the load failed", () => {
    const resultado = mezclarPreferenciasListado(consulta("pageSize=50&cols=codigo,nombre,raza"), {
      tipo: "error",
    })
    expect(resultado.efectivas.pageSize).toBe(50)
    expect(resultado.efectivas.cols).toEqual(["codigo", "nombre", "raza"])
    expect(resultado.avisoCarga).toBe(false)
  })
})

describe("pagination and column mutation builders", () => {
  it("page mutation changes only page", () => {
    const siguiente = cambiarPaginaListado(consulta("page=2&pageSize=50&q=vaca&sort=raza:asc"), 3)
    expect(siguiente.get("page")).toBe("3")
    expect(siguiente.get("pageSize")).toBe("50")
    expect(siguiente.get("q")).toBe("vaca")
    expect(siguiente.get("sort")).toBe("raza:asc")
  })

  it("selecting page 1 canonicalizes the URL by dropping page", () => {
    const siguiente = cambiarPaginaListado(consulta("page=4&pageSize=50"), 1)
    expect(siguiente.has("page")).toBe(false)
    expect(siguiente.get("pageSize")).toBe("50")
  })

  it("page-size mutation resets the page to 1", () => {
    const siguiente = cambiarPageSizeListado(consulta("page=3&pageSize=25&cols=codigo,nombre"), 50)
    expect(siguiente.get("pageSize")).toBe("50")
    expect(siguiente.has("page")).toBe(false)
    expect(siguiente.get("cols")).toBe("codigo,nombre")
  })

  it("column mutation resets the page to 1 and serializes canonical cols", () => {
    const siguiente = cambiarColsListado(consulta("page=5&pageSize=25"), [
      "nombre",
      "codigo",
      "raza",
    ])
    expect(siguiente.get("cols")).toBe("codigo,nombre,raza")
    expect(siguiente.has("page")).toBe(false)
    expect(siguiente.get("pageSize")).toBe("25")
  })
})

describe("crearSelectorColumnasListado", () => {
  it("marks all 36 columns, selecting the effective ones and freezing mandatory", () => {
    const selector = crearSelectorColumnasListado(["codigo", "nombre", "raza"])
    expect(selector).toHaveLength(36)
    const porId = new Map(selector.map((columna) => [columna.id, columna]))
    expect(porId.get("codigo")).toMatchObject({ seleccionado: true, inmutable: true })
    expect(porId.get("nombre")).toMatchObject({ seleccionado: true, inmutable: true })
    expect(porId.get("raza")).toMatchObject({ seleccionado: true, inmutable: false })
    expect(porId.get("sexo")).toMatchObject({ seleccionado: false, inmutable: false })
  })

  it("never allows deselecting the mandatory columns", () => {
    expect(COLUMNAS_INMUTABLES_LISTADO).toEqual(["codigo", "nombre"])
    const selector = crearSelectorColumnasListado(VEINTINUEVE)
    for (const inmutable of COLUMNAS_INMUTABLES_LISTADO) {
      const columna = selector.find((candidate) => candidate.id === inmutable)
      expect(columna?.inmutable).toBe(true)
      expect(columna?.seleccionado).toBe(true)
    }
  })
})

describe("esPreferenciaDefectoListado", () => {
  it("recognizes the 29/25 default selection", () => {
    expect(esPreferenciaDefectoListado({ cols: VEINTINUEVE, pageSize: 25 })).toBe(true)
  })

  it("detects deviations in columns or page size", () => {
    expect(esPreferenciaDefectoListado({ cols: ["codigo", "nombre", "raza"], pageSize: 25 })).toBe(
      false,
    )
    expect(esPreferenciaDefectoListado({ cols: VEINTINUEVE, pageSize: 50 })).toBe(false)
  })
})

describe("preference transports", () => {
  it("loads normalized preferences on a 200", async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ cols: ["nombre", "codigo", "raza"], pageSize: 50 }), {
        status: 200,
      })) as unknown as typeof fetch
    const resultado = await cargarPreferenciasListado("f1", { fetchImpl })
    expect(resultado).toEqual({
      tipo: "listo",
      preferencias: { cols: ["codigo", "nombre", "raza"], pageSize: 50 },
    })
  })

  it("maps a 403 and a network failure to an error result", async () => {
    const denegado = (async () => new Response("{}", { status: 403 })) as unknown as typeof fetch
    expect(await cargarPreferenciasListado("f1", { fetchImpl: denegado })).toEqual({
      tipo: "error",
    })
    const falla = (async () => {
      throw new Error("red")
    }) as unknown as typeof fetch
    expect(await cargarPreferenciasListado("f1", { fetchImpl: falla })).toEqual({ tipo: "error" })
  })

  it("saves preferences with a normalized PUT body and reports success", async () => {
    let cuerpo: string | undefined
    const fetchImpl = (async (_url: string, init?: RequestInit) => {
      cuerpo = init?.body as string
      return new Response("{}", { status: 200 })
    }) as unknown as typeof fetch
    const resultado = await guardarPreferenciasListado(
      "f1",
      { cols: ["nombre", "codigo", "raza"], pageSize: 50 },
      { fetchImpl },
    )
    expect(resultado).toEqual({ tipo: "exito" })
    expect(JSON.parse(cuerpo ?? "{}")).toEqual({
      cols: ["codigo", "nombre", "raza"],
      pageSize: 50,
    })
  })

  it("reports a save failure so the route keeps the session selection and can retry", async () => {
    const falla = (async () => new Response("{}", { status: 500 })) as unknown as typeof fetch
    expect(
      await guardarPreferenciasListado(
        "f1",
        { cols: VEINTINUEVE, pageSize: 25 },
        { fetchImpl: falla },
      ),
    ).toEqual({ tipo: "error" })
    const red = (async () => {
      throw new Error("red")
    }) as unknown as typeof fetch
    expect(
      await guardarPreferenciasListado(
        "f1",
        { cols: VEINTINUEVE, pageSize: 25 },
        { fetchImpl: red },
      ),
    ).toEqual({ tipo: "error" })
  })
})

describe("page-size option surface", () => {
  it("exposes exactly the whitelisted page sizes", () => {
    expect(PAGE_SIZE_OPTIONS_LISTADO).toEqual([25, 50, 100])
  })

  it("coerces raw page sizes to the whitelist with a 25 fallback", () => {
    expect(normalizarPageSizeListado(50)).toBe(50)
    expect(normalizarPageSizeListado(100)).toBe(100)
    expect(normalizarPageSizeListado(99)).toBe(25)
    expect(normalizarPageSizeListado(null)).toBe(25)
    expect(normalizarPageSizeListado(undefined)).toBe(25)
  })
})
