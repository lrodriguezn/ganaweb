import { describe, expect, it } from "vitest"
import {
  type CatalogoAnimalMaestroPort,
  type RazaOption,
  listarCatalogoRaza,
} from "../src/index.js"

function port(rows: readonly RazaOption[]): CatalogoAnimalMaestroPort<"raza", RazaOption> {
  return { listarActivos: async () => rows }
}

const razaAngus: RazaOption = {
  id: "raza-angus",
  nombre: "Angus",
  activo: true,
  descripcion: "Aberdeen Angus",
  origen: null,
  tipoProduccion: null,
}

describe("listarCatalogoRaza", () => {
  it("returns {tipo: disponible} with option for a canonical ID", async () => {
    const result = await listarCatalogoRaza(port([razaAngus]))
    expect(result.tipo).toBe("disponible")
    expect(result.options).toHaveLength(1)
    expect(result.options[0]).toEqual(razaAngus)
  })

  it("returns {tipo: no_disponible} when a row has a null/undefined id", async () => {
    const result = await listarCatalogoRaza(port([{ ...razaAngus, id: null as unknown as string }]))
    expect(result.tipo).toBe("no_disponible")
    expect(result.options).toEqual([])
  })

  it("accepts a row with an unknown id and includes it in options", async () => {
    const result = await listarCatalogoRaza(port([{ ...razaAngus, id: "raza-desconocida-xyz" }]))
    expect(result.tipo).toBe("disponible")
    expect(result.options).toHaveLength(1)
    expect(result.options[0].id).toBe("raza-desconocida-xyz")
  })

  it("returns {tipo: no_disponible} when duplicate IDs exist", async () => {
    const result = await listarCatalogoRaza(
      port([razaAngus, { ...razaAngus, nombre: "Angus Copy" }]),
    )
    expect(result.tipo).toBe("no_disponible")
    expect(result.options).toEqual([])
  })

  it("returns {tipo: no_disponible} for an empty list from the port", async () => {
    const result = await listarCatalogoRaza(port([]))
    expect(result.tipo).toBe("no_disponible")
    expect(result.options).toEqual([])
  })
})
