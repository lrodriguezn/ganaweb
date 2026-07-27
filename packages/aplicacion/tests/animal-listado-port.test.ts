import type {
  AnimalListadoReadPort,
  AnimalListadoReadRequest,
  AnimalListadoReadResult,
} from "../src/puertos/animal-listado-port.js"

const result: AnimalListadoReadResult = {
  data: [],
  page: 1,
  pageSize: 25,
  total: 0,
  totalSinFiltro: 0,
  sort: "codigo:asc",
  cols: ["codigo", "nombre"],
}

const port: AnimalListadoReadPort = {
  listar: async (_request: AnimalListadoReadRequest) => result,
}

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

const response = await port.listar(request)
if (response.total !== 0 || response.totalSinFiltro !== 0 || response.cols.length !== 2) {
  throw new Error("Animal listado port contract did not preserve the normalized result")
}
