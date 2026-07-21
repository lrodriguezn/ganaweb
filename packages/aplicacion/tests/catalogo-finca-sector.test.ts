import { describe, expect, it } from "vitest"
import { type CatalogoFincaPort, type SectorOption, listarSectoresPorFinca } from "../src/index.js"

function port(rows: readonly SectorOption[]): CatalogoFincaPort<"sector", SectorOption> {
  return { listarPorFinca: async () => rows }
}

const sectorNorte: SectorOption = {
  id: "sec-esp-a",
  nombre: "Sector Norte",
  codigo: "SEC-A",
  fincaId: "finca-esperanza",
  activo: true,
}

describe("listarSectoresPorFinca", () => {
  it("returns {tipo: disponible} with options sorted by nombre (es-CO) for a valid fincaId", async () => {
    const otro: SectorOption = {
      id: "sec-esp-b",
      nombre: "Sector Sur",
      codigo: "SEC-B",
      fincaId: "finca-esperanza",
      activo: true,
    }
    const result = await listarSectoresPorFinca("finca-esperanza", port([otro, sectorNorte]))
    expect(result.tipo).toBe("disponible")
    expect(result.options).toHaveLength(2)
    expect(result.options[0].nombre).toBe("Sector Norte")
    expect(result.options[1].nombre).toBe("Sector Sur")
  })

  it("returns {tipo: no_disponible} when the port returns an empty array", async () => {
    const result = await listarSectoresPorFinca("finca-esperanza", port([]))
    expect(result.tipo).toBe("no_disponible")
    expect(result.options).toEqual([])
  })

  it("accepts a row with an unknown id and includes it in options", async () => {
    const result = await listarSectoresPorFinca(
      "finca-esperanza",
      port([{ ...sectorNorte, id: "sec-desconocido-xyz" }]),
    )
    expect(result.tipo).toBe("disponible")
    expect(result.options).toHaveLength(1)
    expect(result.options[0].id).toBe("sec-desconocido-xyz")
  })

  it("returns {tipo: no_disponible} when fincaId is null or empty", async () => {
    const result = await listarSectoresPorFinca("", port([sectorNorte]))
    expect(result.tipo).toBe("no_disponible")
    expect(result.options).toEqual([])
  })

  it("returns {tipo: no_disponible} when duplicate IDs exist", async () => {
    const result = await listarSectoresPorFinca(
      "finca-esperanza",
      port([sectorNorte, { ...sectorNorte, nombre: "Norte Copy" }]),
    )
    expect(result.tipo).toBe("no_disponible")
    expect(result.options).toEqual([])
  })
})
