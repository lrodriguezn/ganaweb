import { describe, expect, it } from "vitest"
import {
  type CatalogoAnimalMaestroPort,
  type ColorOption,
  listarCatalogoColor,
} from "../src/index.js"

function port(rows: readonly ColorOption[]): CatalogoAnimalMaestroPort<"color", ColorOption> {
  return { listarActivos: async () => rows }
}

const colorNegro: ColorOption = {
  id: "col-negro",
  nombre: "Negro",
  activo: true,
  meta: { hex: "#000000" },
}

describe("listarCatalogoColor", () => {
  it("returns {tipo: disponible} with option for a canonical ID including meta.hex", async () => {
    const result = await listarCatalogoColor(port([colorNegro]))
    expect(result.tipo).toBe("disponible")
    expect(result.options).toHaveLength(1)
    expect(result.options[0]).toEqual(colorNegro)
    expect(result.options[0].meta.hex).toBe("#000000")
  })

  it("returns {tipo: no_disponible} when a row has a null/undefined id", async () => {
    const result = await listarCatalogoColor(
      port([{ ...colorNegro, id: null as unknown as string }]),
    )
    expect(result.tipo).toBe("no_disponible")
    expect(result.options).toEqual([])
  })

  it("returns {tipo: no_disponible} when a row has an unknown/noncanonical id", async () => {
    const result = await listarCatalogoColor(port([{ ...colorNegro, id: "col-desconocido-xyz" }]))
    expect(result.tipo).toBe("no_disponible")
    expect(result.options).toEqual([])
  })

  it("returns {tipo: no_disponible} when duplicate IDs exist", async () => {
    const result = await listarCatalogoColor(
      port([colorNegro, { ...colorNegro, nombre: "Negro Copy" }]),
    )
    expect(result.tipo).toBe("no_disponible")
    expect(result.options).toEqual([])
  })

  it("returns {tipo: no_disponible} for an empty list from the port", async () => {
    const result = await listarCatalogoColor(port([]))
    expect(result.tipo).toBe("no_disponible")
    expect(result.options).toEqual([])
  })
})
