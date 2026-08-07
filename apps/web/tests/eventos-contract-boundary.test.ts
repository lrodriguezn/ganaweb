import { EventoForbiddenError } from "@ganaweb/aplicacion"
import { describe, expect, it } from "vitest"
import { mapEventoBoundaryToHttp } from "../src/server/eventos-contract.server.js"

describe("event contract HTTP boundary", () => {
  it("maps typed authorization and scope failures to 403", async () => {
    const response = await mapEventoBoundaryToHttp(async () => {
      throw new EventoForbiddenError("alcance_invalido")
    })
    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ tipo: "alcance_invalido" })
  })

  it("does not hide unexpected failures", async () => {
    await expect(
      mapEventoBoundaryToHttp(async () => {
        throw new Error("db unavailable")
      }),
    ).rejects.toThrow("db unavailable")
  })
})
