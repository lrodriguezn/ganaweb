import { describe, expect, it } from "vitest"
import { type CatalogoFincaPort, type LoteOption, listarLotesPorFinca } from "../src/index.js"

function port(rows: readonly LoteOption[]): CatalogoFincaPort<"lote", LoteOption> {
  return { listarPorFinca: async () => rows }
}

const loteCeba: LoteOption = {
  id: "lote-esp-2",
  nombre: "Lote 2 - Ceba",
  fincaId: "finca-esperanza",
  activo: true,
}

describe("listarLotesPorFinca", () => {
  it("returns {tipo: disponible} with options sorted by nombre (es-CO) for a valid fincaId", async () => {
    const otro: LoteOption = {
      id: "lote-esp-4",
      nombre: "Lote 4 - Levante",
      fincaId: "finca-esperanza",
      activo: true,
    }
    const result = await listarLotesPorFinca("finca-esperanza", port([otro, loteCeba]))
    expect(result.tipo).toBe("disponible")
    expect(result.options).toHaveLength(2)
    expect(result.options[0].nombre).toBe("Lote 2 - Ceba")
    expect(result.options[1].nombre).toBe("Lote 4 - Levante")
  })

  it("returns {tipo: no_disponible} when the port returns an empty array", async () => {
    const result = await listarLotesPorFinca("finca-esperanza", port([]))
    expect(result.tipo).toBe("no_disponible")
    expect(result.options).toEqual([])
  })

  it("accepts a row with an unknown id and includes it in options", async () => {
    const result = await listarLotesPorFinca(
      "finca-esperanza",
      port([{ ...loteCeba, id: "lote-desconocido-xyz" }]),
    )
    expect(result.tipo).toBe("disponible")
    expect(result.options).toHaveLength(1)
    expect(result.options[0].id).toBe("lote-desconocido-xyz")
  })

  it("returns {tipo: no_disponible} when fincaId is null or empty", async () => {
    const result = await listarLotesPorFinca("", port([loteCeba]))
    expect(result.tipo).toBe("no_disponible")
    expect(result.options).toEqual([])
  })

  it("returns {tipo: no_disponible} when duplicate IDs exist", async () => {
    const result = await listarLotesPorFinca(
      "finca-esperanza",
      port([loteCeba, { ...loteCeba, nombre: "Ceba Copy" }]),
    )
    expect(result.tipo).toBe("no_disponible")
    expect(result.options).toEqual([])
  })
})
