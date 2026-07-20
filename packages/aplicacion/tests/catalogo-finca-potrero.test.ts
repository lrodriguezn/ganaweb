import { describe, expect, it } from "vitest"
import { type CatalogoFincaPort, type PotreroOption, listarPotrerosPorFinca } from "../src/index.js"

function port(rows: readonly PotreroOption[]): CatalogoFincaPort<"potrero", PotreroOption> {
  return { listarPorFinca: async () => rows }
}

const potreroLaLoma: PotreroOption = {
  id: "pot-esp-1",
  nombre: "Potrero La Loma",
  codigo: "POT-1",
  fincaId: "finca-esperanza",
  activo: true,
  areaHectareas: 12,
}

describe("listarPotrerosPorFinca", () => {
  it("returns {tipo: disponible} with options sorted by nombre (es-CO) for a valid fincaId", async () => {
    const otro: PotreroOption = {
      id: "pot-esp-3",
      nombre: "Potrero El Bajo",
      codigo: "POT-3",
      fincaId: "finca-esperanza",
      activo: true,
      areaHectareas: 15,
    }
    const result = await listarPotrerosPorFinca("finca-esperanza", port([otro, potreroLaLoma]))
    expect(result.tipo).toBe("disponible")
    expect(result.options).toHaveLength(2)
    expect(result.options[0].nombre).toBe("Potrero El Bajo")
    expect(result.options[1].nombre).toBe("Potrero La Loma")
  })

  it("returns {tipo: no_disponible} when the port returns an empty array", async () => {
    const result = await listarPotrerosPorFinca("finca-esperanza", port([]))
    expect(result.tipo).toBe("no_disponible")
    expect(result.options).toEqual([])
  })

  it("returns {tipo: no_disponible} when a row has an unknown/noncanonical id", async () => {
    const result = await listarPotrerosPorFinca(
      "finca-esperanza",
      port([{ ...potreroLaLoma, id: "pot-desconocido-xyz" }]),
    )
    expect(result.tipo).toBe("no_disponible")
    expect(result.options).toEqual([])
  })

  it("returns {tipo: no_disponible} when fincaId is null or empty", async () => {
    const result = await listarPotrerosPorFinca("", port([potreroLaLoma]))
    expect(result.tipo).toBe("no_disponible")
    expect(result.options).toEqual([])
  })

  it("returns {tipo: no_disponible} when duplicate IDs exist", async () => {
    const result = await listarPotrerosPorFinca(
      "finca-esperanza",
      port([potreroLaLoma, { ...potreroLaLoma, nombre: "La Loma Copy" }]),
    )
    expect(result.tipo).toBe("no_disponible")
    expect(result.options).toEqual([])
  })
})
