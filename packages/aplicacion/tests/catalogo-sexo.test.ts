import { describe, expect, it } from "vitest"
import {
  type CatalogoGlobalPort,
  CatalogoSexoInvalidoError,
  listarCatalogoSexo,
} from "../src/index.js"

function port(
  rows: readonly { id: string; key: string; value: string | null }[],
): CatalogoGlobalPort {
  return { listarActivos: async () => rows }
}

describe("listarCatalogoSexo", () => {
  it("loads the global sexo catalog and decodes canonical values in numeric order", async () => {
    let option: "sexo" | undefined
    const catalog: CatalogoGlobalPort = {
      listarActivos: async (nextOption) => {
        option = nextOption
        return [
          { id: "hembra", key: "Hembra", value: "1" },
          { id: "macho", key: "Macho", value: "0" },
          { id: "pajuela", key: "Pajuela", value: "2" },
        ]
      },
    }

    await expect(listarCatalogoSexo(catalog)).resolves.toEqual([
      { label: "Macho", value: 0 },
      { label: "Hembra", value: 1 },
      { label: "Pajuela", value: 2 },
    ])
    expect(option).toBe("sexo")
  })

  it.each([null, "3", "01"])("rejects noncanonical raw value %j", async (value) => {
    await expect(
      listarCatalogoSexo(port([{ id: "sexo", key: "Sexo", value }])),
    ).rejects.toBeInstanceOf(CatalogoSexoInvalidoError)
  })

  it("rejects duplicate decoded values and an empty catalog", async () => {
    await expect(
      listarCatalogoSexo(
        port([
          { id: "a", key: "Macho", value: "0" },
          { id: "b", key: "Otro macho", value: "0" },
        ]),
      ),
    ).rejects.toBeInstanceOf(CatalogoSexoInvalidoError)
    await expect(listarCatalogoSexo(port([]))).rejects.toBeInstanceOf(CatalogoSexoInvalidoError)
  })
})
