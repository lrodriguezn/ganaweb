import { afterEach, beforeEach, describe, expect, it } from "vitest"

import type {
  CalidadOption,
  CatalogoAnimalMaestroPort,
  CatalogoFincaOption,
  CatalogoFincaPort,
  CatalogoGlobalPort,
  ColorOption,
  RazaOption,
  SesionAutorizada,
} from "@ganaweb/aplicacion"
import {
  type AnimalCatalogPorts,
  type AnimalCatalogs,
  loadAnimalCatalogs,
} from "../apps/web/src/server/animal-actions.server.js"

/**
 * PR-5 — loadAnimalCatalogs server loader composition tests.
 *
 * 4 test cases (per design.md Testing Strategy):
 * 1. All 9 catalogs composed and available (disponible)
 * 2. Cross-finca denied: different fincaId returns no_disponible
 * 3. DB partial failure: one catalog error → that one no_disponible, others survive
 * 4. DB total failure: every catalog fails → all no_disponible
 */

const E2E_SESSION: SesionAutorizada = {
  usuarioId: "usuario-operario",
  nombre: "Operario E2E",
  email: "operario@ganaweb.test",
  fincaActivaId: "finca-esperanza",
  fincaActivaNombre: "La Esperanza",
  rol: "Mayordomo",
  permisos: [
    { modulo: "animales", accion: "ver" },
    { modulo: "animales", accion: "crear" },
  ],
}

function createMaestroPort(options?: {
  razaError?: boolean
  colorError?: boolean
}): CatalogoAnimalMaestroPort<
  "raza" | "color" | "calidad",
  RazaOption | ColorOption | CalidadOption
> {
  return {
    async listarActivos(tabla) {
      if (tabla === "raza") {
        if (options?.razaError) throw new Error("DB connection lost")
        return [
          { id: "raza-angus", nombre: "Angus", activo: true },
          { id: "raza-brahman", nombre: "Brahman", activo: true },
        ] as RazaOption[]
      }
      if (tabla === "color") {
        if (options?.colorError) throw new Error("DB connection lost")
        return [
          { id: "col-negro", nombre: "Negro", activo: true, meta: { hex: "#1a1a1a" } },
        ] as ColorOption[]
      }
      if (tabla === "calidad") {
        return [{ id: "cal-excelente", nombre: "Excelente", activo: true }] as CalidadOption[]
      }
      return []
    },
  } as CatalogoAnimalMaestroPort<
    "raza" | "color" | "calidad",
    RazaOption | ColorOption | CalidadOption
  >
}

function createFincaPort(options?: {
  fincaId?: string
  potreroError?: boolean
}): CatalogoFincaPort<
  "potrero" | "sector" | "lote" | "grupo" | "lugarCompra",
  CatalogoFincaOption
> {
  const targetFincaId = options?.fincaId ?? "finca-esperanza"
  return {
    async listarPorFinca(fincaId, tabla) {
      if (fincaId !== targetFincaId) return []
      if (tabla === "potrero") {
        if (options?.potreroError) throw new Error("DB connection lost")
        return [
          { id: "pot-esp-1", nombre: "Potrero 1", fincaId, activo: true },
          { id: "pot-esp-3", nombre: "Potrero 3", fincaId, activo: true },
        ] as CatalogoFincaOption[]
      }
      if (tabla === "sector") {
        return [
          { id: "sec-esp-a", nombre: "Sector A", fincaId, activo: true, codigo: "SA" },
        ] as CatalogoFincaOption[]
      }
      if (tabla === "lote") {
        return [
          { id: "lote-esp-2", nombre: "Lote 2", fincaId, activo: true },
        ] as CatalogoFincaOption[]
      }
      if (tabla === "grupo") {
        return [
          { id: "grupo-esp-ordeno", nombre: "Grupo Ordeño", fincaId, activo: true },
        ] as CatalogoFincaOption[]
      }
      if (tabla === "lugarCompra") {
        return [
          { id: "lc-esp-feria", nombre: "Feria local", fincaId, activo: true },
        ] as CatalogoFincaOption[]
      }
      return []
    },
  } as CatalogoFincaPort<
    "potrero" | "sector" | "lote" | "grupo" | "lugarCompra",
    CatalogoFincaOption
  >
}

function createGlobalPort(): CatalogoGlobalPort {
  return {
    async listarActivos() {
      return [
        { id: "sexo-macho", key: "Macho", value: "0" },
        { id: "sexo-hembra", key: "Hembra", value: "1" },
      ]
    },
  }
}

let previousE2E: string | undefined

beforeEach(() => {
  previousE2E = process.env.GANAWEB_E2E_ANIMALS
  // Disable E2E mode — we pass session directly to loadAnimalCatalogs
  process.env.GANAWEB_E2E_ANIMALS = undefined
})

afterEach(() => {
  if (previousE2E === undefined) process.env.GANAWEB_E2E_ANIMALS = undefined
  else process.env.GANAWEB_E2E_ANIMALS = previousE2E
})

describe("loadAnimalCatalogs server loader composition", () => {
  it("composes all 9 catalogs and returns them as disponible with mapped options", async () => {
    const ports: AnimalCatalogPorts = {
      catalogoGlobal: createGlobalPort(),
      catalogoAnimalMaestro: createMaestroPort(),
      catalogoFinca: createFincaPort(),
    }

    const result: AnimalCatalogs = await loadAnimalCatalogs("finca-esperanza", ports, E2E_SESSION)

    // All 9 catalogs should be "disponible"
    expect(result.sexo.tipo).toBe("disponible")
    expect(result.raza.tipo).toBe("disponible")
    expect(result.color.tipo).toBe("disponible")
    expect(result.calidad.tipo).toBe("disponible")
    expect(result.potrero.tipo).toBe("disponible")
    expect(result.sector.tipo).toBe("disponible")
    expect(result.lote.tipo).toBe("disponible")
    expect(result.grupo.tipo).toBe("disponible")
    expect(result.lugarCompra.tipo).toBe("disponible")

    // Sex options should have {value, label}
    expect(result.sexo.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: "0", label: "Macho" }),
        expect.objectContaining({ value: "1", label: "Hembra" }),
      ]),
    )

    // Raza options should map id→value, nombre→label
    expect(result.raza.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: "raza-angus", label: "Angus" }),
        expect.objectContaining({ value: "raza-brahman", label: "Brahman" }),
      ]),
    )

    // Color options should carry meta.hex
    expect(result.color.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: "col-negro", label: "Negro", meta: { hex: "#1a1a1a" } }),
      ]),
    )

    // Potrero options should map id→value, nombre→label
    expect(result.potrero.options).toEqual(
      expect.arrayContaining([expect.objectContaining({ value: "pot-esp-1", label: "Potrero 1" })]),
    )
  })

  it("returns no_disponible for all catalogs when session is not authorized for the finca", async () => {
    const ports: AnimalCatalogPorts = {
      catalogoGlobal: createGlobalPort(),
      catalogoAnimalMaestro: createMaestroPort(),
      catalogoFinca: createFincaPort({ fincaId: "finca-esperanza" }),
    }

    // Request for finca-roble when session has fincaActivaId = "finca-esperanza"
    const result = await loadAnimalCatalogs("finca-roble", ports, E2E_SESSION)

    // All catalogs should be no_disponible (cross-finca denied)
    expect(result.sexo.tipo).toBe("no_disponible")
    expect(result.raza.tipo).toBe("no_disponible")
    expect(result.color.tipo).toBe("no_disponible")
    expect(result.calidad.tipo).toBe("no_disponible")
    expect(result.potrero.tipo).toBe("no_disponible")
    expect(result.sector.tipo).toBe("no_disponible")
    expect(result.lote.tipo).toBe("no_disponible")
    expect(result.grupo.tipo).toBe("no_disponible")
    expect(result.lugarCompra.tipo).toBe("no_disponible")
  })

  it("isolates partial failures: one DB error → that catalog no_disponible, others survive", async () => {
    const ports: AnimalCatalogPorts = {
      catalogoGlobal: createGlobalPort(),
      catalogoAnimalMaestro: createMaestroPort({ razaError: true }),
      catalogoFinca: createFincaPort(),
    }

    const result = await loadAnimalCatalogs("finca-esperanza", ports, E2E_SESSION)

    // Raza should be no_disponible (DB error)
    expect(result.raza.tipo).toBe("no_disponible")

    // Others should survive
    expect(result.sexo.tipo).toBe("disponible")
    expect(result.color.tipo).toBe("disponible")
    expect(result.calidad.tipo).toBe("disponible")
    expect(result.potrero.tipo).toBe("disponible")
    expect(result.sector.tipo).toBe("disponible")
    expect(result.lote.tipo).toBe("disponible")
    expect(result.grupo.tipo).toBe("disponible")
    expect(result.lugarCompra.tipo).toBe("disponible")
  })

  it("returns no_disponible for all when every catalog fails simultaneously", async () => {
    const failingGlobal: CatalogoGlobalPort = {
      async listarActivos() {
        throw new Error("DB offline")
      },
    }
    const failingMaestro: CatalogoAnimalMaestroPort<
      "raza" | "color" | "calidad",
      RazaOption | ColorOption | CalidadOption
    > = {
      async listarActivos() {
        throw new Error("DB offline")
      },
    } as CatalogoAnimalMaestroPort<
      "raza" | "color" | "calidad",
      RazaOption | ColorOption | CalidadOption
    >
    const failingFinca: CatalogoFincaPort<
      "potrero" | "sector" | "lote" | "grupo" | "lugarCompra",
      CatalogoFincaOption
    > = {
      async listarPorFinca() {
        throw new Error("DB offline")
      },
    } as CatalogoFincaPort<
      "potrero" | "sector" | "lote" | "grupo" | "lugarCompra",
      CatalogoFincaOption
    >

    const ports: AnimalCatalogPorts = {
      catalogoGlobal: failingGlobal,
      catalogoAnimalMaestro: failingMaestro,
      catalogoFinca: failingFinca,
    }

    const result = await loadAnimalCatalogs("finca-esperanza", ports, E2E_SESSION)

    // Every catalog should be no_disponible
    for (const key of [
      "sexo",
      "raza",
      "color",
      "calidad",
      "potrero",
      "sector",
      "lote",
      "grupo",
      "lugarCompra",
    ] as const) {
      expect(result[key].tipo).toBe("no_disponible")
      expect(result[key].options).toEqual([])
    }
  })
})
