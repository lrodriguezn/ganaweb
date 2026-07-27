import { describe, expect, it } from "vitest"
import type {
  AnimalListadoReadPort,
  AnimalListadoReadRequest,
  AnimalListadoReadResult,
} from "../src/puertos/animal-listado-port.js"

const request: AnimalListadoReadRequest = {
  usuarioId: "usuario-1",
  fincaId: "finca-1",
  page: 1,
  pageSize: 25,
  sort: "codigo:asc",
  q: null,
  filters: [],
  cols: ["codigo", "nombre"],
}

describe("AnimalListadoReadPort", () => {
  it("preserves a normalized paginated response for a valid request", async () => {
    const result: AnimalListadoReadResult = {
      data: [],
      page: 1,
      pageSize: 25,
      total: 3,
      totalSinFiltro: 7,
      sort: "codigo:asc",
      cols: ["codigo", "nombre"],
    }
    let received: AnimalListadoReadRequest | undefined
    const port: AnimalListadoReadPort = {
      listar: async (nextRequest) => {
        received = nextRequest
        return result
      },
    }

    await expect(port.listar(request)).resolves.toEqual(result)
    expect(received).toEqual(request)
  })

  it("permits distinct supported page sizes and sort directions in the port contract", async () => {
    const port: AnimalListadoReadPort = {
      listar: async (nextRequest) => ({
        data: [],
        page: nextRequest.page,
        pageSize: nextRequest.pageSize,
        total: 0,
        totalSinFiltro: 0,
        sort: nextRequest.sort,
        cols: nextRequest.cols,
      }),
    }

    await expect(
      port.listar({ ...request, page: 2, pageSize: 100, sort: "nombre:desc", cols: ["nombre"] }),
    ).resolves.toMatchObject({ page: 2, pageSize: 100, sort: "nombre:desc", cols: ["nombre"] })
  })
})
