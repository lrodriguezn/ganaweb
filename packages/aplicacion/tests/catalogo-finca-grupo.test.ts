import { describe, expect, it } from "vitest"
import { type CatalogoFincaPort, type GrupoOption, listarGruposPorFinca } from "../src/index.js"

function port(rows: readonly GrupoOption[]): CatalogoFincaPort<"grupo", GrupoOption> {
  return { listarPorFinca: async () => rows }
}

const grupoOrdeno: GrupoOption = {
  id: "grupo-esp-ordeno",
  nombre: "Grupo de ordeño",
  fincaId: "finca-esperanza",
  activo: true,
}

describe("listarGruposPorFinca", () => {
  it("returns {tipo: disponible} with options sorted by nombre (es-CO) for a valid fincaId", async () => {
    const otro: GrupoOption = {
      id: "grupo-rob-vientres",
      nombre: "Grupo de vientres",
      fincaId: "finca-roble",
      activo: true,
    }
    const result = await listarGruposPorFinca("finca-esperanza", port([otro, grupoOrdeno]))
    expect(result.tipo).toBe("disponible")
    expect(result.options).toHaveLength(2)
    expect(result.options[0].nombre).toBe("Grupo de ordeño")
    expect(result.options[1].nombre).toBe("Grupo de vientres")
  })

  it("returns {tipo: no_disponible} when the port returns an empty array", async () => {
    const result = await listarGruposPorFinca("finca-esperanza", port([]))
    expect(result.tipo).toBe("no_disponible")
    expect(result.options).toEqual([])
  })

  it("returns {tipo: no_disponible} when a row has an unknown/noncanonical id", async () => {
    const result = await listarGruposPorFinca(
      "finca-esperanza",
      port([{ ...grupoOrdeno, id: "grupo-desconocido-xyz" }]),
    )
    expect(result.tipo).toBe("no_disponible")
    expect(result.options).toEqual([])
  })

  it("returns {tipo: no_disponible} when fincaId is null or empty", async () => {
    const result = await listarGruposPorFinca("", port([grupoOrdeno]))
    expect(result.tipo).toBe("no_disponible")
    expect(result.options).toEqual([])
  })

  it("returns {tipo: no_disponible} when duplicate IDs exist", async () => {
    const result = await listarGruposPorFinca(
      "finca-esperanza",
      port([grupoOrdeno, { ...grupoOrdeno, nombre: "Ordeño Copy" }]),
    )
    expect(result.tipo).toBe("no_disponible")
    expect(result.options).toEqual([])
  })
})
