import { afterEach, beforeEach, describe, expect, it } from "vitest"

import type {
  CalidadOption,
  CatalogoAnimalMaestroPort,
  CatalogoFincaOption,
  CatalogoFincaPort,
  CatalogoGlobalPort,
  CatalogoPadresPort,
  ColorOption,
  ParentComboboxOption,
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
 * 4+3 test cases (per design.md Testing Strategy):
 * Original 4:
 * 1. All 11 catalogs composed and available (disponible)
 * 2. Cross-finca denied: different fincaId returns no_disponible
 * 3. DB partial failure: one catalog error → that one no_disponible, others survive
 * 4. DB total failure: every catalog fails → all no_disponible
 * New (madre/padre):
 * 5. Madre (hembras only) and padre (macho+pajuela) as disponible with mapped options
 * 6. excludedIds drops current animal from both lists
 * 7. Madre query throws → madre no_disponible, padre survives
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
  "potrero" | "sector" | "lote" | "grupo" | "lugarCompra" | "hierro" | "propietario",
  CatalogoFincaOption
> {
  const targetFincaId = options?.fincaId ?? "finca-esperanza"
  return {
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: mock dispatcher with one branch per tabla
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
      if (tabla === "hierro") {
        return [
          { id: "hierro-1", nombre: "Hierro 1", fincaId, activo: true },
        ] as CatalogoFincaOption[]
      }
      if (tabla === "propietario") {
        return [
          { id: "prop-1", nombre: "Propietario 1", fincaId, activo: true },
        ] as CatalogoFincaOption[]
      }
      return []
    },
  } as CatalogoFincaPort<
    "potrero" | "sector" | "lote" | "grupo" | "lugarCompra" | "hierro" | "propietario",
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

function createPadresPort(options?: {
  madreesError?: boolean
  padresError?: boolean
}): CatalogoPadresPort {
  const fincaId = "finca-esperanza"
  const hembras: readonly ParentComboboxOption[] = [
    { id: "animal-h1", codigo: "H-001", nombre: "Matilda" },
    { id: "animal-h2", codigo: "H-002", nombre: "Luna" },
    { id: "animal-h3", codigo: "H-003", nombre: null },
  ]
  const machos: readonly ParentComboboxOption[] = [
    { id: "animal-m1", codigo: "M-001", nombre: "Trueno" },
    { id: "animal-m2", codigo: "M-002", nombre: "Rayo" },
  ]
  const pajuelas: readonly ParentComboboxOption[] = [
    { id: "animal-p1", codigo: "P-001", nombre: "Don Torito" },
  ]

  return {
    async listarMadres(requestedFincaId, excludedIds) {
      if (requestedFincaId !== fincaId) return []
      if (options?.madreesError) throw new Error("DB connection lost")
      return hembras.filter((h) => !excludedIds.includes(h.id))
    },
    async listarPadres(requestedFincaId, excludedIds) {
      if (requestedFincaId !== fincaId) return []
      if (options?.padresError) throw new Error("DB connection lost")
      return [...machos, ...pajuelas].filter((p) => !excludedIds.includes(p.id))
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
  it("composes all 13 catalogs and returns them as disponible with mapped options", async () => {
    const ports: AnimalCatalogPorts = {
      catalogoGlobal: createGlobalPort(),
      catalogoAnimalMaestro: createMaestroPort(),
      catalogoFinca: createFincaPort(),
      catalogoPadres: createPadresPort(),
    }

    const result: AnimalCatalogs = await loadAnimalCatalogs("finca-esperanza", ports, E2E_SESSION)

    // All 11 catalogs should be "disponible"
    expect(result.sexo.tipo).toBe("disponible")
    expect(result.raza.tipo).toBe("disponible")
    expect(result.color.tipo).toBe("disponible")
    expect(result.calidad.tipo).toBe("disponible")
    expect(result.potrero.tipo).toBe("disponible")
    expect(result.sector.tipo).toBe("disponible")
    expect(result.lote.tipo).toBe("disponible")
    expect(result.grupo.tipo).toBe("disponible")
    expect(result.lugarCompra.tipo).toBe("disponible")
    expect(result.hierro.tipo).toBe("disponible")
    expect(result.propietario.tipo).toBe("disponible")
    expect(result.madre.tipo).toBe("disponible")
    expect(result.padre.tipo).toBe("disponible")

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
      catalogoPadres: createPadresPort(),
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
    expect(result.hierro.tipo).toBe("no_disponible")
    expect(result.propietario.tipo).toBe("no_disponible")
    expect(result.madre.tipo).toBe("no_disponible")
    expect(result.padre.tipo).toBe("no_disponible")
  })

  it("isolates partial failures: one DB error → that catalog no_disponible, others survive", async () => {
    const ports: AnimalCatalogPorts = {
      catalogoGlobal: createGlobalPort(),
      catalogoAnimalMaestro: createMaestroPort({ razaError: true }),
      catalogoFinca: createFincaPort(),
      catalogoPadres: createPadresPort(),
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
    expect(result.hierro.tipo).toBe("disponible")
    expect(result.propietario.tipo).toBe("disponible")
    expect(result.madre.tipo).toBe("disponible")
    expect(result.padre.tipo).toBe("disponible")
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
      "potrero" | "sector" | "lote" | "grupo" | "lugarCompra" | "hierro" | "propietario",
      CatalogoFincaOption
    > = {
      async listarPorFinca() {
        throw new Error("DB offline")
      },
    } as CatalogoFincaPort<
      "potrero" | "sector" | "lote" | "grupo" | "lugarCompra" | "hierro" | "propietario",
      CatalogoFincaOption
    >
    const failingPadres: CatalogoPadresPort = {
      async listarMadres() {
        throw new Error("DB offline")
      },
      async listarPadres() {
        throw new Error("DB offline")
      },
    }

    const ports: AnimalCatalogPorts = {
      catalogoGlobal: failingGlobal,
      catalogoAnimalMaestro: failingMaestro,
      catalogoFinca: failingFinca,
      catalogoPadres: failingPadres,
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
      "hierro",
      "propietario",
      "madre",
      "padre",
    ] as const) {
      expect(result[key].tipo).toBe("no_disponible")
      expect(result[key].options).toEqual([])
    }
  })

  it("includes madre (hembras only) and padre (macho+pajuela) as disponible with mapped options", async () => {
    const ports: AnimalCatalogPorts = {
      catalogoGlobal: createGlobalPort(),
      catalogoAnimalMaestro: createMaestroPort(),
      catalogoFinca: createFincaPort(),
      catalogoPadres: createPadresPort(),
    }

    const result = await loadAnimalCatalogs("finca-esperanza", ports, E2E_SESSION)

    // Madre and padre should both be "disponible"
    expect(result.madre.tipo).toBe("disponible")
    expect(result.padre.tipo).toBe("disponible")

    // Madre: 3 hembras (including one with null nombre)
    expect(result.madre.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: "animal-h1", codigo: "H-001", nombre: "Matilda" }),
        expect.objectContaining({ value: "animal-h2", codigo: "H-002", nombre: "Luna" }),
        expect.objectContaining({ value: "animal-h3", codigo: "H-003", nombre: "" }),
      ]),
    )
    expect(result.madre.options).toHaveLength(3)

    // Padre: 2 machos + 1 pajuela = 3
    expect(result.padre.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: "animal-m1", codigo: "M-001", nombre: "Trueno" }),
        expect.objectContaining({ value: "animal-p1", codigo: "P-001", nombre: "Don Torito" }),
      ]),
    )
    expect(result.padre.options).toHaveLength(3)
  })

  it("excludedIds drops the current animal from both madre and padre lists", async () => {
    const ports: AnimalCatalogPorts = {
      catalogoGlobal: createGlobalPort(),
      catalogoAnimalMaestro: createMaestroPort(),
      catalogoFinca: createFincaPort(),
      catalogoPadres: createPadresPort(),
    }

    // Simulate editing animal-h1 (a hembra in the madre list)
    const result = await loadAnimalCatalogs("finca-esperanza", ports, E2E_SESSION, ["animal-h1"])

    // animal-h1 should NOT appear in madre
    const madreIds = result.madre.options.map((o) => o.value)
    expect(madreIds).not.toContain("animal-h1")
    expect(result.madre.options).toHaveLength(2)

    // Padre should be unaffected (animal-h1 is not in the padre list)
    expect(result.padre.options).toHaveLength(3)
  })

  it("madre query throws → madre no_disponible, padre survives", async () => {
    const ports: AnimalCatalogPorts = {
      catalogoGlobal: createGlobalPort(),
      catalogoAnimalMaestro: createMaestroPort(),
      catalogoFinca: createFincaPort(),
      catalogoPadres: createPadresPort({ madreesError: true }),
    }

    const result = await loadAnimalCatalogs("finca-esperanza", ports, E2E_SESSION)

    expect(result.madre.tipo).toBe("no_disponible")
    expect(result.padre.tipo).toBe("disponible")
    expect(result.padre.options).toHaveLength(3)
  })
})
