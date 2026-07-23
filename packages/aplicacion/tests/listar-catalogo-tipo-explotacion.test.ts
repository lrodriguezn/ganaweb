import { describe, expect, it } from "vitest"
import {
  type CatalogoAnimalMaestroPort,
  type TipoExplotacionOption,
  listarCatalogoTipoExplotacion,
} from "../src/index.js"

function port(
  rows: readonly TipoExplotacionOption[],
): CatalogoAnimalMaestroPort<"tipoExplotacion", TipoExplotacionOption> {
  return { listarActivos: async () => rows }
}

const teLeche: TipoExplotacionOption = {
  id: "te-leche",
  nombre: "Leche",
  activo: true,
}

const teCria: TipoExplotacionOption = {
  id: "te-cria",
  nombre: "Cría",
  activo: true,
}

describe("listarCatalogoTipoExplotacion", () => {
  it("returns {tipo: disponible} with options sorted es-CO by nombre", async () => {
    const result = await listarCatalogoTipoExplotacion(port([teCria, teLeche]))
    expect(result.tipo).toBe("disponible")
    expect(result.options).toHaveLength(2)
    expect(result.options[0].nombre).toBe("Cría")
    expect(result.options[1].nombre).toBe("Leche")
  })

  it("returns {tipo: no_disponible} when a row has a null/undefined id", async () => {
    const result = await listarCatalogoTipoExplotacion(
      port([{ ...teLeche, id: null as unknown as string }]),
    )
    expect(result.tipo).toBe("no_disponible")
    expect(result.options).toEqual([])
  })

  it("accepts a row with an unknown id (no canonical-id whitelist)", async () => {
    const result = await listarCatalogoTipoExplotacion(
      port([{ ...teLeche, id: "te-desconocido-xyz" }]),
    )
    expect(result.tipo).toBe("disponible")
    expect(result.options).toHaveLength(1)
    expect(result.options[0].id).toBe("te-desconocido-xyz")
  })

  it("returns {tipo: no_disponible} when duplicate IDs exist", async () => {
    const result = await listarCatalogoTipoExplotacion(
      port([teLeche, { ...teLeche, nombre: "Leche Copy" }]),
    )
    expect(result.tipo).toBe("no_disponible")
    expect(result.options).toEqual([])
  })

  it("returns {tipo: no_disponible} for an empty list from the port", async () => {
    const result = await listarCatalogoTipoExplotacion(port([]))
    expect(result.tipo).toBe("no_disponible")
    expect(result.options).toEqual([])
  })
})
