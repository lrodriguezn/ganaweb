import { describe, expect, it } from "vitest"
import {
  AnimalExportacionOverflowError,
  type AnimalExportacionReadPort,
  type AnimalExportacionRequest,
} from "../src/puertos/animal-exportacion-port.js"
import type { AnimalListadoRow } from "../src/puertos/animal-listado-port.js"

const request: AnimalExportacionRequest = {
  usuarioId: "usuario-1",
  fincaId: "finca-1",
  sort: "codigo:asc",
  q: null,
  filters: [],
  columnas: ["codigo", "nombre", "sexo"],
  maxFilas: 50000,
}

function makeRow(overrides: Partial<AnimalListadoRow> = {}): AnimalListadoRow {
  return {
    id: "animal-1",
    codigo: "AA-001",
    nombre: "Alpha",
    sexo: { key: "1", label: "Hembra" },
    raza: null,
    fechaNacimiento: null,
    edadAnios: null,
    color: null,
    origen: null,
    codigoMadre: null,
    nombreMadre: null,
    codigoPadre: null,
    nombrePadre: null,
    propietario: null,
    hierro: null,
    numeroPezones: null,
    calidad: null,
    codigoArete: null,
    fechaCompra: null,
    precioCompra: null,
    pesoCompraKg: null,
    tatuado: false,
    herrado: false,
    descornado: false,
    codigoRfid: null,
    potrero: null,
    sector: null,
    lote: null,
    grupo: null,
    comentarios: null,
    salud: { key: "0", label: "Sano" },
    categoriaReproductiva: null,
    estado: { key: "0", label: "Activo" },
    pesoUltimo: null,
    codigoQr: null,
    esDeMonta: false,
    tipoExplotacion: null,
    ...overrides,
  }
}

describe("AnimalExportacionReadPort", () => {
  it("preserves the export request and returns the full row set", async () => {
    const rows = [makeRow(), makeRow({ id: "animal-2", codigo: "AA-002", nombre: "Bravo" })]
    let received: AnimalExportacionRequest | undefined
    const port: AnimalExportacionReadPort = {
      exportar: async (nextRequest) => {
        received = nextRequest
        return rows
      },
    }

    await expect(port.exportar(request)).resolves.toEqual(rows)
    expect(received).toEqual(request)
    expect(received?.maxFilas).toBe(50000)
    expect(received?.columnas).toEqual(["codigo", "nombre", "sexo"])
  })

  it("rejects with AnimalExportacionOverflowError when the filtered set exceeds maxFilas", async () => {
    const maxFilas = 5
    const totalRows = 40
    const port: AnimalExportacionReadPort = {
      exportar: async (nextRequest) => {
        if (totalRows > nextRequest.maxFilas) {
          throw new AnimalExportacionOverflowError(nextRequest.maxFilas)
        }
        return [makeRow()]
      },
    }

    const error = await port.exportar({ ...request, maxFilas }).catch((value: unknown) => value)
    expect(error).toBeInstanceOf(AnimalExportacionOverflowError)
    expect((error as AnimalExportacionOverflowError).maxFilas).toBe(maxFilas)
    expect((error as Error).name).toBe("AnimalExportacionOverflowError")
  })

  it("exposes AnimalExportacionOverflowError as a well-formed Error carrying maxFilas", () => {
    const error = new AnimalExportacionOverflowError(50000)

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe("AnimalExportacionOverflowError")
    expect(error.maxFilas).toBe(50000)
    expect(error.message).toContain("50000")
  })

  // The concrete forbidden error reuse (AnimalListadoForbiddenError) lives in the
  // db layer and is asserted in packages/db/tests/animal-exportacion-postgres.test.ts;
  // aplicacion cannot import db (architecture boundary), so here we verify the port
  // contract supports a fail-closed denial that yields no rows (LA-RBAC-04/05).
  it("propagates a forbidden denial without producing rows", async () => {
    class ForbiddenError extends Error {
      constructor() {
        super("Animal listing is forbidden")
        this.name = "AnimalListadoForbiddenError"
      }
    }
    const port: AnimalExportacionReadPort = {
      exportar: async (nextRequest) => {
        if (nextRequest.usuarioId === "sin-permiso") throw new ForbiddenError()
        return [makeRow()]
      },
    }

    await expect(port.exportar({ ...request, usuarioId: "sin-permiso" })).rejects.toBeInstanceOf(
      ForbiddenError,
    )
    await expect(port.exportar(request)).resolves.toHaveLength(1)
  })
})
