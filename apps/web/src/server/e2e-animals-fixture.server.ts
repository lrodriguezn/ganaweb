import type {
  AnimalRegistro,
  AnimalResumen,
  AnimalUseCaseDeps,
  CalidadOption,
  CatalogoAnimalMaestroPort,
  CatalogoFincaOption,
  CatalogoFincaPort,
  CatalogoGlobalPort,
  ColorOption,
  GrupoOption,
  LoteOption,
  LugarCompraOption,
  PotreroOption,
  RazaOption,
  SectorOption,
  SesionAutorizada,
} from "@ganaweb/aplicacion"
import { getRequestHeader } from "@tanstack/react-start/server"

type AnimalListRepository = AnimalUseCaseDeps["animales"] & {
  readonly listarPorFinca: (fincaId: string) => Promise<readonly AnimalRegistro[]>
}

export function isAnimalE2eEnabled(): boolean {
  return process.env.GANAWEB_E2E_ANIMALS === "1" && isSafeAnimalE2eRuntime()
}

export function isSafeAnimalE2eRuntime(): boolean {
  if (process.env.NODE_ENV === "production") return false
  const explicitlyTestRuntime =
    process.env.VITEST === "true" ||
    process.env.PLAYWRIGHT_TEST === "1" ||
    process.env.PLAYWRIGHT === "1"
  return process.env.NODE_ENV === "test" || explicitlyTestRuntime
}

export function getAnimalE2eSession(): SesionAutorizada {
  const role = getRequestHeader("x-ganaweb-e2e-role")
  const readonly = role === "readonly"
  return {
    usuarioId: readonly ? "usuario-lectura" : "usuario-operario",
    nombre: readonly ? "Lectura E2E" : "Operario E2E",
    email: readonly ? "lectura@ganaweb.test" : "operario@ganaweb.test",
    fincaActivaId: "finca-1",
    fincaActivaNombre: "Finca Demo E2E",
    rol: readonly ? "Lectura" : "Mayordomo",
    permisos: readonly
      ? [{ modulo: "animales", accion: "ver" }]
      : [
          { modulo: "animales", accion: "ver" },
          { modulo: "animales", accion: "crear" },
          { modulo: "animales", accion: "editar" },
          { modulo: "animales", accion: "inactivar" },
        ],
  }
}

const animals = new Map<string, AnimalRegistro>([
  [
    "animal-1",
    {
      id: "animal-1",
      fincaId: "finca-1",
      codigo: "MT-122",
      nombre: "Matilda",
      sexoKey: 1,
      version: 1,
      activo: true,
      usuarioCreadoPor: "usuario-operario",
      creadoEn: new Date("2026-07-12T10:00:00.000Z"),
    },
  ],
])

function toAnimalResumen(animal: AnimalRegistro): AnimalResumen {
  return {
    id: animal.id,
    fincaId: animal.fincaId,
    codigo: animal.codigo,
    nombreAnimal: animal.nombre,
    sexo: animal.sexoKey === 1 ? "hembra" : animal.sexoKey === 0 ? "macho" : "pajuela",
    estadoActual: animal.activo ? (animal.estadoActual ?? "activo") : "vendido",
    salud: "sano",
    fechaNacimiento: animal.fechaNacimiento ?? null,
    fechaCompra: animal.fechaCompra ?? null,
  }
}

const images = new Map([
  ["animal-1", [{ id: "imagen-pendiente", esPrincipal: true, estadoSubida: "pendiente" as const }]],
])

export function createAnimalE2eCatalogoPort(): CatalogoGlobalPort {
  return {
    async listarActivos() {
      return [
        { id: "sexo-macho", key: "Macho", value: "0" },
        { id: "sexo-hembra", key: "Hembra", value: "1" },
        { id: "sexo-pajuela", key: "Pajuela", value: "2" },
      ]
    },
  }
}

export function addAnimalE2eRecord(input: {
  readonly fincaId: string
  readonly codigo: string
  readonly nombre: string
  readonly sexoKey: 0 | 1 | 2
}) {
  const animalId = `animal-e2e-${input.codigo}`
  animals.set(animalId, {
    id: animalId,
    fincaId: input.fincaId,
    codigo: input.codigo,
    nombre: input.nombre,
    sexoKey: input.sexoKey,
    version: 1,
    activo: true,
    usuarioCreadoPor: "usuario-operario",
    creadoEn: new Date("2026-07-12T10:00:00.000Z"),
  })
}

export function createAnimalE2eDeps(): AnimalUseCaseDeps {
  const animalRepository: AnimalListRepository = {
    async buscarPorCodigoYFinca(codigo, fincaId) {
      const animal = [...animals.values()].find(
        (candidate) => candidate.fincaId === fincaId && candidate.codigo === codigo,
      )
      return animal ? toAnimalResumen(animal) : null
    },
    async listarPorFinca(fincaId: string) {
      return [...animals.values()].filter((animal) => animal.fincaId === fincaId)
    },
    async obtenerPorIdYFinca(animalId, fincaId) {
      const animal = animals.get(animalId)
      return animal?.fincaId === fincaId ? animal : null
    },
    async guardar(animal) {
      animals.set(animal.id, {
        id: animal.id,
        fincaId: animal.fincaId,
        codigo: animal.codigo,
        nombre: animal.nombreAnimal ?? animal.codigo,
        sexoKey: animal.sexo === "hembra" ? 1 : animal.sexo === "macho" ? 0 : 2,
        estadoActual: animal.estadoActual,
        version: 1,
        activo: true,
        usuarioCreadoPor: "usuario-operario",
        creadoEn: new Date("2026-07-12T10:00:00.000Z"),
        fechaNacimiento: animal.fechaNacimiento ?? null,
        fechaCompra: animal.fechaCompra ?? null,
      })
    },
    async actualizar(animalId, fincaId, cambios) {
      const animal = animals.get(animalId)
      if (animal?.fincaId === fincaId) {
        animals.set(animalId, {
          ...animal,
          codigo: cambios.codigo ?? animal.codigo,
          version: animal.version + 1,
        })
      }
    },
    async inactivar(animalId, fincaId) {
      const animal = animals.get(animalId)
      if (animal?.fincaId === fincaId) animals.set(animalId, { ...animal, activo: false })
    },
    async reactivar(animalId, fincaId, codigo) {
      const animal = animals.get(animalId)
      if (animal?.fincaId === fincaId) animals.set(animalId, { ...animal, codigo, activo: true })
    },
    async eliminarFisico(animalId, fincaId) {
      const animal = animals.get(animalId)
      if (animal?.fincaId === fincaId) animals.delete(animalId)
    },
  }

  return {
    animales: animalRepository,
    referencias: {
      async summarize(animalId) {
        return animalId === "animal-1"
          ? { eventCount: 3, offspringCount: 0, blocksCodeChange: true }
          : { eventCount: 0, offspringCount: 0, blocksCodeChange: false }
      },
    },
    timeline: {
      async listarPagina() {
        return {
          items: Array.from({ length: 21 }, (_, index) => ({
            id: `timeline-${index}`,
            fecha: `202${index % 4}-01-01`,
            titulo: `Evento ${index}`,
          })),
          nextCursor: "cursor-2",
        }
      },
    },
    archivos: {
      async listarImagenes(animalId) {
        return images.get(animalId) ?? []
      },
      async vincularImagenPendiente(entrada) {
        const current = images.get(entrada.animalId) ?? []
        images.set(entrada.animalId, [
          ...current,
          { id: entrada.id, esPrincipal: entrada.esPrincipal, estadoSubida: entrada.estadoSubida },
        ])
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

/**
 * PR-5: E2E fallback for CatalogoAnimalMaestroPort.
 * Returns seeded raza/color/calidad data matching the DB seed canonical IDs.
 */
export function createAnimalE2eCatalogoMaestroPort(): CatalogoAnimalMaestroPort<
  "raza" | "color" | "calidad",
  RazaOption | ColorOption | CalidadOption
> {
  const razas: readonly RazaOption[] = [
    {
      id: "raza-angus",
      nombre: "Angus",
      activo: true,
      descripcion: null,
      origen: null,
      tipoProduccion: null,
    },
    {
      id: "raza-brahman",
      nombre: "Brahman",
      activo: true,
      descripcion: null,
      origen: null,
      tipoProduccion: null,
    },
    {
      id: "raza-holstein",
      nombre: "Holstein",
      activo: true,
      descripcion: null,
      origen: null,
      tipoProduccion: null,
    },
  ]
  const colores: readonly ColorOption[] = [
    { id: "col-negro", nombre: "Negro", activo: true, meta: { hex: "#1a1a1a" } },
    { id: "col-blanco", nombre: "Blanco", activo: true, meta: { hex: "#f5f5f5" } },
    { id: "col-rojo", nombre: "Rojo", activo: true, meta: { hex: "#8b0000" } },
  ]
  const calidades: readonly CalidadOption[] = [
    { id: "cal-excelente", nombre: "Excelente", activo: true },
    { id: "cal-bueno", nombre: "Bueno", activo: true },
  ]

  return {
    async listarActivos(tabla) {
      switch (tabla) {
        case "raza":
          return razas
        case "color":
          return colores
        case "calidad":
          return calidades
        default:
          return []
      }
    },
  } as CatalogoAnimalMaestroPort<
    "raza" | "color" | "calidad",
    RazaOption | ColorOption | CalidadOption
  >
}

/**
 * PR-5: E2E fallback for CatalogoFincaPort.
 * Returns seeded potrero/sector/lote/grupo/lugarCompra data for the test finca (finca-1).
 */
export function createAnimalE2eCatalogoFincaPort(): CatalogoFincaPort<
  "potrero" | "sector" | "lote" | "grupo" | "lugarCompra",
  CatalogoFincaOption
> {
  const fincaId = "finca-1"
  const potreros: readonly PotreroOption[] = [
    {
      id: "potrero-norte",
      nombre: "Potrero Norte",
      fincaId,
      activo: true,
      codigo: "PN",
      areaHectareas: 10,
    },
    {
      id: "potrero-sur",
      nombre: "Potrero Sur",
      fincaId,
      activo: true,
      codigo: "PS",
      areaHectareas: 8,
    },
  ]
  const sectores: readonly SectorOption[] = [
    { id: "sector-cria", nombre: "Sector Cría", fincaId, activo: true, codigo: "SC" },
    { id: "sector-levante", nombre: "Sector Levante", fincaId, activo: true, codigo: "SL" },
  ]
  const lotes: readonly LoteOption[] = [
    { id: "lote-a", nombre: "Lote A", fincaId, activo: true },
    { id: "lote-b", nombre: "Lote B", fincaId, activo: true },
  ]
  const grupos: readonly GrupoOption[] = [
    { id: "grupo-hato", nombre: "Hato General", fincaId, activo: true },
  ]
  const lugaresCompra: readonly LugarCompraOption[] = [
    { id: "lc-feria", nombre: "Feria local", fincaId, activo: true },
  ]

  return {
    async listarPorFinca(requestedFincaId, tabla) {
      if (requestedFincaId !== fincaId) return []
      switch (tabla) {
        case "potrero":
          return potreros
        case "sector":
          return sectores
        case "lote":
          return lotes
        case "grupo":
          return grupos
        case "lugarCompra":
          return lugaresCompra
        default:
          return []
      }
    },
  } as CatalogoFincaPort<
    "potrero" | "sector" | "lote" | "grupo" | "lugarCompra",
    CatalogoFincaOption
  >
}
