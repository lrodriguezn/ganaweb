/**
 * #110 PR1 — HTTP contract tests for the animal-list preferences handler.
 *
 * Covers: GET 200 (normalized echo), GET 403 (no session / forbidden),
 * PUT 200 (normalized echo), PUT 400 (invalid body), PUT 403 (no session /
 * forbidden), and sanitized 500 errors. Uses a stub port — no DB required.
 *
 * RED: imports from ./animal-list-preferences-http.js which does not exist yet.
 */
import { describe, expect, it } from "vitest"
import type { AnimalListadoPreferenciasPort } from "@ganaweb/aplicacion"
import { AnimalListadoForbiddenError } from "@ganaweb/db/animal-infrastructure"
import { createAnimalListadoPreferenciasHttpHandler } from "./animal-list-preferences-http.js"

const REQUEST_ID = "req-pref-1"

function stubPort(
  overrides: Partial<AnimalListadoPreferenciasPort> = {},
): AnimalListadoPreferenciasPort {
  return {
    obtener: async () => ({ cols: ["codigo", "nombre", "raza"], pageSize: 50 }),
    guardar: async () => {},
    ...overrides,
  }
}

function handlerWith(overrides: {
  getUsuarioId?: (fincaId: string) => Promise<string | null>
  port?: AnimalListadoPreferenciasPort
  isForbidden?: (error: unknown) => boolean
  reportError?: (details: { requestId: string; fincaId: string; error: unknown }) => void
} = {}) {
  return createAnimalListadoPreferenciasHttpHandler({
    getUsuarioId: overrides.getUsuarioId ?? (async () => "user-1"),
    port: overrides.port ?? stubPort(),
    isForbidden: overrides.isForbidden ?? ((e) => e instanceof AnimalListadoForbiddenError),
    requestId: () => REQUEST_ID,
    reportError: overrides.reportError ?? (() => {}),
  })
}

function get(handler: ReturnType<typeof handlerWith>, fincaId = "finca-1") {
  return handler({
    request: new Request(`http://test/api/fincas/${fincaId}/animales/preferencias`),
    fincaId,
    method: "GET",
  })
}

function put(
  handler: ReturnType<typeof handlerWith>,
  body: unknown,
  fincaId = "finca-1",
) {
  return handler({
    request: new Request(`http://test/api/fincas/${fincaId}/animales/preferencias`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    fincaId,
    method: "PUT",
  })
}

describe("GET /preferencias", () => {
  it("returns 200 with normalized preferences", async () => {
    const response = await get(handlerWith())
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.cols).toEqual(["codigo", "nombre", "raza"])
    expect(body.pageSize).toBe(50)
  })

  it("normalizes stored cols: adds mandatory codigo/nombre and sorts canonically", async () => {
    const handler = handlerWith({
      port: stubPort({
        obtener: async () => ({ cols: ["raza", "sexo"], pageSize: 100 }),
      }),
    })
    const response = await get(handler)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.cols).toEqual(["codigo", "nombre", "sexo", "raza"])
    expect(body.pageSize).toBe(100)
  })

  it("returns 29/25 defaults when port returns empty cols", async () => {
    const handler = handlerWith({
      port: stubPort({ obtener: async () => ({ cols: [], pageSize: 25 }) }),
    })
    const response = await get(handler)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.cols).toHaveLength(29)
    expect(body.pageSize).toBe(25)
  })

  it("returns 403 when session resolution returns null", async () => {
    const handler = handlerWith({ getUsuarioId: async () => null })
    const response = await get(handler)
    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toBe("Acceso denegado")
    expect(body.requestId).toBe(REQUEST_ID)
  })

  it("returns 403 when port throws ForbiddenError", async () => {
    const handler = handlerWith({
      port: stubPort({
        obtener: async () => {
          throw new AnimalListadoForbiddenError()
        },
      }),
    })
    const response = await get(handler)
    expect(response.status).toBe(403)
  })

  it("returns sanitized 500 on unexpected error and calls reportError", async () => {
    let reportCalls = 0
    const handler = handlerWith({
      port: stubPort({
        obtener: async () => {
          throw new Error("db exploded")
        },
      }),
      reportError: () => {
        reportCalls += 1
      },
    })
    const response = await get(handler)
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe("Error interno")
    expect(body.motivo).not.toContain("db exploded")
    expect(reportCalls).toBe(1)
  })
})

describe("PUT /preferencias", () => {
  it("returns 200 with normalized echo on valid body", async () => {
    let savedCols: readonly string[] = []
    let savedPageSize: number = 0
    const handler = handlerWith({
      port: stubPort({
        guardar: async (req) => {
          savedCols = req.cols
          savedPageSize = req.pageSize
        },
      }),
    })
    const response = await put(handler, { cols: ["raza", "sexo"], pageSize: 50 })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.cols).toEqual(["codigo", "nombre", "sexo", "raza"])
    expect(body.pageSize).toBe(50)
    // Port received the normalized value.
    expect(savedCols).toEqual(["codigo", "nombre", "sexo", "raza"])
    expect(savedPageSize).toBe(50)
  })

  it("returns 400 for unregistered column", async () => {
    const response = await put(handlerWith(), { cols: ["codigo", "fakeCol"], pageSize: 25 })
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.campo).toBe("cols")
    expect(body.requestId).toBe(REQUEST_ID)
  })

  it("returns 400 for non-whitelisted page size", async () => {
    const response = await put(handlerWith(), { cols: ["codigo"], pageSize: 30 })
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.campo).toBe("pageSize")
  })

  it("returns 400 for malformed body (null)", async () => {
    const handler = handlerWith()
    const response = await handler({
      request: new Request("http://test/api/fincas/finca-1/animales/preferencias", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: "null",
      }),
      fincaId: "finca-1",
      method: "PUT",
    })
    expect(response.status).toBe(400)
  })

  it("returns 403 when session resolution returns null", async () => {
    const handler = handlerWith({ getUsuarioId: async () => null })
    const response = await put(handler, { cols: ["codigo"], pageSize: 25 })
    expect(response.status).toBe(403)
  })

  it("returns 403 when port throws ForbiddenError on guardar", async () => {
    const handler = handlerWith({
      port: stubPort({
        guardar: async () => {
          throw new AnimalListadoForbiddenError()
        },
      }),
    })
    const response = await put(handler, { cols: ["codigo"], pageSize: 25 })
    expect(response.status).toBe(403)
  })

  it("returns sanitized 500 on unexpected guardar error", async () => {
    let reportCalls = 0
    const handler = handlerWith({
      port: stubPort({
        guardar: async () => {
          throw new Error("write failed")
        },
      }),
      reportError: () => {
        reportCalls += 1
      },
    })
    const response = await put(handler, { cols: ["codigo"], pageSize: 25 })
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.motivo).not.toContain("write failed")
    expect(reportCalls).toBe(1)
  })
})
