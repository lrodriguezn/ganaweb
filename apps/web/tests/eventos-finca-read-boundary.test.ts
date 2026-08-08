/**
 * Issue #227 — boundary HTTP del read model de finca. Verifica que
 * los resultados tipados del caso de uso se traducen a `Response` con
 * los status codes correctos: 200 para `ok`, 403 para `no_autorizado`,
 * 400 para `filtro_invalido`. Misma forma que el boundary de escritura
 * de #226 (`eventos-contract-boundary.test.ts`).
 */
import { describe, expect, it } from "vitest"
import {
  EventosFincaReadHttpError,
  mapEventosFincaReadToHttp,
} from "../src/server/eventos-finca-read.server.js"

describe("eventosFinca read HTTP boundary", () => {
  it("responde 200 cuando el caso de uso entrega un resultado `ok`", async () => {
    const response = await mapEventosFincaReadToHttp(async () => ({
      tipo: "ok" as const,
      items: [{ id: "x", dominio: "productivo", tipo: "pesaje", fecha: "2026-08-01" }],
    }))
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      tipo: "ok",
      items: [{ id: "x" }],
    })
  })

  it("mapea EventosFincaReadHttpError 403 a una respuesta con motivo y permiso", async () => {
    const response = await mapEventosFincaReadToHttp(async () => {
      throw new EventosFincaReadHttpError(403, "permiso_denegado", "sanidad:ver")
    })
    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      tipo: "permiso_denegado",
      campo: "sanidad:ver",
    })
  })

  it("mapea EventosFincaReadHttpError 400 (filtro_invalido) sin detalle", async () => {
    const response = await mapEventosFincaReadToHttp(async () => {
      throw new EventosFincaReadHttpError(400, "filtro_invalido", "fechaDesde")
    })
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      tipo: "filtro_invalido",
      campo: "fechaDesde",
    })
  })

  it("no oculta errores inesperados (deja que el runtime los reporte)", async () => {
    await expect(
      mapEventosFincaReadToHttp(async () => {
        throw new Error("db unavailable")
      }),
    ).rejects.toThrow("db unavailable")
  })
})
