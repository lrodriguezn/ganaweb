import { describe, expect, it } from "vitest"

import {
  createAnimalRuntimeHarness,
  loadAnimalSexoCatalog,
  validateSubmittedSexoKey,
} from "../apps/web/src/server/animal-actions.server.js"

const port = (values: readonly string[]) => ({
  listarActivos: async () =>
    values.map((value, index) => ({ id: `sexo-${index}`, key: `Etiqueta ${value}`, value })),
})

describe("animal sexo catalog boundary", () => {
  it("maps only the reader contract into form label/value options", async () => {
    await expect(loadAnimalSexoCatalog(port(["2", "0", "1"]))).resolves.toEqual({
      tipo: "disponible",
      options: [
        { label: "Etiqueta 0", value: "0" },
        { label: "Etiqueta 1", value: "1" },
        { label: "Etiqueta 2", value: "2" },
      ],
    })
  })

  it("rejects unavailable, unknown, missing, and noncanonical submitted values", async () => {
    await expect(loadAnimalSexoCatalog(port([]))).resolves.toEqual({ tipo: "no_disponible" })
    await expect(loadAnimalSexoCatalog(port(["invalid"]))).resolves.toEqual({
      tipo: "no_disponible",
    })
    await expect(
      loadAnimalSexoCatalog({ listarActivos: async () => Promise.reject(new Error("offline")) }),
    ).resolves.toEqual({ tipo: "no_disponible" })
    await expect(validateSubmittedSexoKey("1", port(["0", "1", "2"]))).resolves.toBe(1)
    await expect(validateSubmittedSexoKey(2, port(["0", "1", "2"]))).resolves.toBeNull()
    await expect(validateSubmittedSexoKey("01", port(["0", "1", "2"]))).resolves.toBeNull()
    await expect(validateSubmittedSexoKey(null, port(["0", "1", "2"]))).resolves.toBeNull()
    await expect(validateSubmittedSexoKey("9", port(["0", "1", "2"]))).resolves.toBeNull()
  })

  it("decodes the serialized sexoKey before the create harness validates it", async () => {
    const previous = process.env.GANAWEB_E2E_ANIMALS
    process.env.GANAWEB_E2E_ANIMALS = "1"
    try {
      const harness = createAnimalRuntimeHarness({
        getSession: async () => ({
          usuarioId: "usuario-e2e",
          nombre: "Operario E2E",
          email: "operario@ganaweb.test",
          fincaActivaId: "finca-1",
          rol: "Mayordomo",
          permisos: [
            { modulo: "animales", accion: "crear" },
            { modulo: "animales", accion: "ver" },
          ],
        }),
      })
      await expect(
        harness.create({
          fincaId: "finca-1",
          datos: {
            codigo: "SEX-ROUNDTRIP-01",
            nombre: "Sexo serializado",
            sexoKey: "1",
            fechaNacimiento: "2026-07-15",
          },
        }),
      ).resolves.toMatchObject({ tipo: "creado" })
      await expect(harness.list({ fincaId: "finca-1" })).resolves.toMatchObject({
        animales: expect.arrayContaining([
          expect.objectContaining({ codigoAnimal: "SEX-ROUNDTRIP-01" }),
        ]),
      })
    } finally {
      if (previous === undefined) process.env.GANAWEB_E2E_ANIMALS = undefined
      else process.env.GANAWEB_E2E_ANIMALS = previous
    }
  })

  it("aborts a create when an injected catalog cannot validate the submitted value", async () => {
    const previous = process.env.GANAWEB_E2E_ANIMALS
    process.env.GANAWEB_E2E_ANIMALS = "1"
    try {
      const harness = createAnimalRuntimeHarness({
        catalogoSexo: port([]),
        getSession: async () => ({
          usuarioId: "usuario-e2e",
          nombre: "Operario E2E",
          email: "operario@ganaweb.test",
          fincaActivaId: "finca-1",
          rol: "Mayordomo",
          permisos: [{ modulo: "animales", accion: "crear" }],
        }),
      })
      await expect(
        harness.create({
          fincaId: "finca-1",
          datos: { codigo: "SEX-REJECT-01", nombre: "No debe escribirse", sexoKey: "1" },
        }),
      ).resolves.toMatchObject({ tipo: "validacion", errores: [{ campo: "sexo_key" }] })
      await expect(harness.list({ fincaId: "finca-1" })).resolves.not.toMatchObject({
        animales: expect.arrayContaining([
          expect.objectContaining({ codigoAnimal: "SEX-REJECT-01" }),
        ]),
      })
    } finally {
      if (previous === undefined) process.env.GANAWEB_E2E_ANIMALS = undefined
      else process.env.GANAWEB_E2E_ANIMALS = previous
    }
  })
})
