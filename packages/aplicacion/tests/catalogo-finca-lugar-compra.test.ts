import { describe, expect, it } from "vitest"
import {
  type CatalogoFincaPort,
  type LugarCompraOption,
  listarLugaresCompraPorFinca,
} from "../src/index.js"

function port(
  rows: readonly LugarCompraOption[],
): CatalogoFincaPort<"lugarCompra", LugarCompraOption> {
  return { listarPorFinca: async () => rows }
}

const lugarFeria: LugarCompraOption = {
  id: "lc-esp-feria",
  nombre: "Feria de Medellín",
  fincaId: "finca-esperanza",
  activo: true,
  direccion: null,
}

describe("listarLugaresCompraPorFinca", () => {
  it("returns {tipo: disponible} with options sorted by nombre (es-CO) for a valid fincaId", async () => {
    const otro: LugarCompraOption = {
      id: "lc-esp-directa",
      nombre: "Compra directa finca",
      fincaId: "finca-esperanza",
      activo: true,
      direccion: "Vereda El Silencio",
    }
    const result = await listarLugaresCompraPorFinca("finca-esperanza", port([otro, lugarFeria]))
    expect(result.tipo).toBe("disponible")
    expect(result.options).toHaveLength(2)
    expect(result.options[0].nombre).toBe("Compra directa finca")
    expect(result.options[1].nombre).toBe("Feria de Medellín")
    expect(result.options[0].direccion).toBe("Vereda El Silencio")
    expect(result.options[1].direccion).toBeNull()
  })

  it("returns {tipo: no_disponible} when the port returns an empty array", async () => {
    const result = await listarLugaresCompraPorFinca("finca-esperanza", port([]))
    expect(result.tipo).toBe("no_disponible")
    expect(result.options).toEqual([])
  })

  it("returns {tipo: no_disponible} when a row has an unknown/noncanonical id", async () => {
    const result = await listarLugaresCompraPorFinca(
      "finca-esperanza",
      port([{ ...lugarFeria, id: "lc-desconocido-xyz" }]),
    )
    expect(result.tipo).toBe("no_disponible")
    expect(result.options).toEqual([])
  })

  it("returns {tipo: no_disponible} when fincaId is null or empty", async () => {
    const result = await listarLugaresCompraPorFinca("", port([lugarFeria]))
    expect(result.tipo).toBe("no_disponible")
    expect(result.options).toEqual([])
  })

  it("returns {tipo: no_disponible} when duplicate IDs exist", async () => {
    const result = await listarLugaresCompraPorFinca(
      "finca-esperanza",
      port([lugarFeria, { ...lugarFeria, nombre: "Feria Copy" }]),
    )
    expect(result.tipo).toBe("no_disponible")
    expect(result.options).toEqual([])
  })
})
