import assert from "node:assert/strict"

import type { AnimalRegistro, AnimalUseCaseDeps, SesionAutorizada } from "@ganaweb/aplicacion"

import { createAnimalActionHarness } from "../src/server/animal-actions.server.js"

function session(): SesionAutorizada {
  return {
    usuarioId: "usuario-1",
    nombre: "Operario",
    email: "operario@ganaweb.test",
    fincaActivaId: "finca-1",
    fincaActivaNombre: "Finca 1",
    rol: "Mayordomo",
    permisos: [{ modulo: "animales", accion: "ver" }],
    fincas: [
      {
        fincaId: "finca-1",
        nombre: "Finca 1",
        rol: "Mayordomo",
        activo: true,
        permisos: [{ modulo: "animales", accion: "ver" }],
      },
    ],
  }
}

function deps(animales: readonly AnimalRegistro[]): AnimalUseCaseDeps {
  return {
    animales: {
      async buscarPorCodigoYFinca(codigo, fincaId) {
        return (
          animales.find((animal) => animal.fincaId === fincaId && animal.codigo === codigo) ?? null
        )
      },
      async obtenerPorIdYFinca(animalId, fincaId) {
        const animal = animales.find((entry) => entry.id === animalId)
        return animal?.fincaId === fincaId ? animal : null
      },
      async listarPorFinca(fincaId) {
        return animales.filter((animal) => animal.fincaId === fincaId)
      },
      async guardar() {},
    },
    referencias: {
      async summarize() {
        return { eventCount: 0, offspringCount: 0, blocksCodeChange: false }
      },
    },
    timeline: {
      async listarPagina() {
        return { items: [], nextCursor: undefined }
      },
    },
    archivos: {
      async listarImagenes() {
        return []
      },
    },
    colaBinarios: { async encolar() {} },
    outbox: { async append() {} },
    transacciones: {
      async run(work) {
        return work()
      },
    },
  }
}

function registro(overrides: Partial<AnimalRegistro> & Pick<AnimalRegistro, "id" | "codigo">) {
  return {
    fincaId: "finca-1",
    nombre: overrides.codigo,
    sexoKey: 1 as const,
    version: 1,
    activo: true,
    usuarioCreadoPor: "usuario-1",
    creadoEn: new Date("2026-07-12T10:00:00.000Z"),
    ...overrides,
  }
}

async function testToListItemPropagatesRealSaludAndCategoria() {
  const harness = createAnimalActionHarness({
    deps: deps([
      registro({
        id: "animal-enferma",
        codigo: "AA-001",
        sexoKey: 1,
        salud: "enfermo",
        categoriaReproductiva: "prenada",
      }),
      registro({
        id: "animal-macho-sin-categoria",
        codigo: "MM-001",
        sexoKey: 0,
        salud: "sano",
        categoriaReproductiva: null,
      }),
      registro({
        id: "animal-macho-desconocida",
        codigo: "MM-002",
        sexoKey: 0,
        salud: "sano",
        categoriaReproductiva: "gestante",
      }),
      registro({
        id: "animal-sin-salud",
        codigo: "SS-001",
        sexoKey: 1,
        categoriaReproductiva: "vacia",
      }),
    ]),
    getSession: async () => session(),
  })

  const result = await harness.list({ fincaId: "finca-1" })
  assert.equal(result.tipo, "lista")
  if (result.tipo !== "lista") return

  const porCodigo = new Map(result.animales.map((animal) => [animal.codigoAnimal, animal]))

  const enferma = porCodigo.get("AA-001")
  assert.ok(enferma, "AA-001 must be listed")
  assert.equal(enferma.salud, "enfermo", "real salud must propagate (BUG-DATA-001)")
  assert.equal(
    enferma.categoriaReproductiva,
    "prenada",
    "real categoriaReproductiva must propagate (BUG-DATA-001)",
  )

  const machoSinCategoria = porCodigo.get("MM-001")
  assert.ok(machoSinCategoria, "MM-001 must be listed")
  assert.equal(machoSinCategoria.sexo, "macho")
  assert.notEqual(
    machoSinCategoria.categoriaReproductiva,
    "novilla",
    "a macho must never be hardcoded to novilla (BUG-DATA-001)",
  )
  assert.equal(
    machoSinCategoria.categoriaReproductiva,
    "no_aplica",
    "null categoria must normalize to no_aplica",
  )

  const machoDesconocida = porCodigo.get("MM-002")
  assert.ok(machoDesconocida, "MM-002 must be listed")
  assert.equal(
    machoDesconocida.categoriaReproductiva,
    "no_aplica",
    "unknown categoria values must normalize to no_aplica",
  )

  const sinSalud = porCodigo.get("SS-001")
  assert.ok(sinSalud, "SS-001 must be listed")
  assert.equal(sinSalud.salud, "sano", "missing salud defaults to sano (DB default 0)")
  assert.equal(sinSalud.categoriaReproductiva, "vacia")
}

await testToListItemPropagatesRealSaludAndCategoria()

// biome-ignore lint/suspicious/noConsole: focused TDD harness progress output
console.log("✅ animal-mobile-list-mapping.test.ts passed")
