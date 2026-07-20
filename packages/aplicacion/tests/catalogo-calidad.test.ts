import { describe, expect, it } from "vitest"
import {
  type CalidadOption,
  type CatalogoAnimalMaestroPort,
  listarCatalogoCalidad,
} from "../src/index.js"

function port(rows: readonly CalidadOption[]): CatalogoAnimalMaestroPort<"calidad", CalidadOption> {
  return { listarActivos: async () => rows }
}

const calidadExcelente: CalidadOption = {
  id: "cal-excelente",
  nombre: "Excelente",
  activo: true,
}

describe("listarCatalogoCalidad", () => {
  it("returns {tipo: disponible} with option for a canonical ID", async () => {
    const result = await listarCatalogoCalidad(port([calidadExcelente]))
    expect(result.tipo).toBe("disponible")
    expect(result.options).toHaveLength(1)
    expect(result.options[0]).toEqual(calidadExcelente)
  })

  it("returns {tipo: no_disponible} when a row has a null/undefined id", async () => {
    const result = await listarCatalogoCalidad(
      port([{ ...calidadExcelente, id: null as unknown as string }]),
    )
    expect(result.tipo).toBe("no_disponible")
    expect(result.options).toEqual([])
  })

  it("returns {tipo: no_disponible} when a row has an unknown/noncanonical id", async () => {
    const result = await listarCatalogoCalidad(
      port([{ ...calidadExcelente, id: "cal-desconocido-xyz" }]),
    )
    expect(result.tipo).toBe("no_disponible")
    expect(result.options).toEqual([])
  })

  it("returns {tipo: no_disponible} when duplicate IDs exist", async () => {
    const result = await listarCatalogoCalidad(
      port([calidadExcelente, { ...calidadExcelente, nombre: "Excelente Copy" }]),
    )
    expect(result.tipo).toBe("no_disponible")
    expect(result.options).toEqual([])
  })

  it("returns {tipo: no_disponible} for an empty list from the port", async () => {
    const result = await listarCatalogoCalidad(port([]))
    expect(result.tipo).toBe("no_disponible")
    expect(result.options).toEqual([])
  })
})
