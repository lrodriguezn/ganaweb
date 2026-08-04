import type {
  AnimalListadoReadPort,
  AnimalListadoReadResult,
  AnimalListadoRow,
  AnimalMobileListReadPort,
  AnimalMobileRow,
  AnimalRegistro,
  AnimalResumen,
  AnimalUseCaseDeps,
  CalidadOption,
  CatalogoAnimalMaestroPort,
  CatalogoFincaOption,
  CatalogoFincaPort,
  CatalogoGlobalPort,
  CatalogoPadresPort,
  ColorOption,
  GrupoOption,
  LoteOption,
  LugarCompraOption,
  ParentComboboxOption,
  PotreroOption,
  RazaOption,
  SectorOption,
  SesionAutorizada,
  TimelineItemAnimalDto,
  TipoExplotacionOption,
} from "@ganaweb/aplicacion"
import { ETIQUETAS_CATEGORIA_REPRODUCTIVA } from "@ganaweb/db/animal-mobile-list-infrastructure"
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

/**
 * Reads the E2E role header when a Start request context exists. Outside a
 * request (e.g. the tsx harness tests that exercise the fixture wiring) the
 * header is unreadable — @tanstack/start-server-core throws instead of
 * returning undefined — so fall back to the default (non-readonly) role.
 */
function readE2eRoleHeader(): string | undefined {
  try {
    return getRequestHeader("x-ganaweb-e2e-role")
  } catch {
    return undefined
  }
}

export function getAnimalE2eSession(): SesionAutorizada {
  const role = readE2eRoleHeader()
  const readonly = role === "readonly"
  const rol = readonly ? "Lectura" : "Mayordomo"
  const permisos = readonly
    ? [{ modulo: "animales", accion: "ver" }]
    : [
        { modulo: "animales", accion: "ver" },
        { modulo: "animales", accion: "crear" },
        { modulo: "animales", accion: "editar" },
        { modulo: "animales", accion: "inactivar" },
      ]
  return {
    usuarioId: readonly ? "usuario-lectura" : "usuario-operario",
    nombre: readonly ? "Lectura E2E" : "Operario E2E",
    email: readonly ? "lectura@ganaweb.test" : "operario@ganaweb.test",
    fincaActivaId: "finca-1",
    fincaActivaNombre: "Finca Demo E2E",
    rol,
    permisos,
    // Issue #144: el fixture E2E es mono-finca; la única membresía es la activa.
    fincas: [{ fincaId: "finca-1", nombre: "Finca Demo E2E", rol, activo: true, permisos }],
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
      fechaNacimiento: 1577923200,
      fechaCompra: 1709510400,
      version: 1,
      activo: true,
      usuarioCreadoPor: "usuario-operario",
      creadoEn: new Date("2026-07-12T10:00:00.000Z"),
    },
  ],
])

function toIsoDate(epochSeconds: number | null | undefined): string | null {
  return epochSeconds === null || epochSeconds === undefined
    ? null
    : new Date(epochSeconds * 1000).toISOString().slice(0, 10)
}

function toAnimalListadoRow(animal: AnimalRegistro): AnimalListadoRow {
  return {
    id: animal.id,
    codigo: animal.codigo,
    nombre: animal.nombre,
    sexo: { key: String(animal.sexoKey), label: animal.sexoKey === 1 ? "Hembra" : "Macho" },
    raza: null,
    fechaNacimiento: toIsoDate(animal.fechaNacimiento),
    edadAnios: null,
    color: null,
    origen: null,
    codigoMadre: null,
    nombreMadre: null,
    codigoPadre: null,
    nombrePadre: null,
    propietario: null,
    hierro: null,
    numeroPezones: null,
    calidad: null,
    codigoArete: null,
    fechaCompra: toIsoDate(animal.fechaCompra),
    precioCompra: null,
    pesoCompraKg: null,
    tatuado: false,
    herrado: false,
    descornado: false,
    codigoRfid: null,
    potrero: null,
    sector: null,
    lote: null,
    grupo: null,
    comentarios: null,
    salud: { key: "sano", label: "Sano" },
    categoriaReproductiva: null,
    estado: {
      key: animal.activo ? "activo" : "vendido",
      label: animal.activo ? "Activo" : "Vendido",
    },
    pesoUltimo: null,
    codigoQr: null,
    esDeMonta: false,
    tipoExplotacion: null,
  }
}

/** Test-only #107 read port so browser query requests use the same explicit E2E fixture as actions. */
export function createAnimalE2eListadoReadPort(): AnimalListadoReadPort {
  return {
    async listar(request) {
      const allRows = [...animals.values()]
        .filter((animal) => animal.fincaId === request.fincaId)
        .map(toAnimalListadoRow)
      const query = request.q?.trim().toLocaleLowerCase() ?? ""
      const matchingRows =
        query === ""
          ? allRows
          : allRows.filter(
              (animal) =>
                animal.codigo.toLocaleLowerCase().includes(query) ||
                animal.nombre.toLocaleLowerCase().includes(query),
            )
      const start = (request.page - 1) * request.pageSize
      const result: AnimalListadoReadResult = {
        data: matchingRows.slice(start, start + request.pageSize),
        page: request.page,
        pageSize: request.pageSize,
        total: matchingRows.length,
        totalSinFiltro: allRows.length,
        sort: request.sort,
        cols: request.cols,
      }
      return result
    },
  }
}

function toAnimalMobileRow(animal: AnimalRegistro): AnimalMobileRow {
  const sexoLabel = animal.sexoKey === 1 ? "Hembra" : animal.sexoKey === 2 ? "Pajuela" : "Macho"
  const categoria = animal.categoriaReproductiva?.trim() || null
  const etiquetaCategoria = categoria ? ETIQUETAS_CATEGORIA_REPRODUCTIVA[categoria] : undefined
  const saludKey = animal.salud === "enfermo" ? 1 : 0
  return {
    id: animal.id,
    codigo: animal.codigo,
    nombre: animal.nombre,
    sexo: { key: String(animal.sexoKey), label: sexoLabel },
    raza: null,
    categoriaReproductiva:
      categoria && etiquetaCategoria ? { key: categoria, label: etiquetaCategoria } : null,
    salud: { key: String(saludKey), label: saludKey === 1 ? "Enfermo" : "Sano" },
    esDeMonta: animal.esDeMonta === true,
    propietario: null,
    madre: null,
  }
}

/** Test-only #155 mobile read port so the dedicated endpoint replays the same explicit E2E fixture. */
export function createAnimalE2eMobileListReadPort(): AnimalMobileListReadPort {
  return {
    async listar(request) {
      const allRows = [...animals.values()]
        .filter((animal) => animal.fincaId === request.fincaId && animal.activo)
        .map(toAnimalMobileRow)
      const query = request.q?.trim().toLocaleLowerCase() ?? ""
      const matchingRows =
        query === ""
          ? allRows
          : allRows.filter(
              (animal) =>
                animal.codigo.toLocaleLowerCase().includes(query) ||
                animal.nombre.toLocaleLowerCase().includes(query),
            )
      const start = (request.page - 1) * request.pageSize
      const total = matchingRows.length
      return {
        data: matchingRows.slice(start, start + request.pageSize),
        page: request.page,
        pageSize: request.pageSize,
        total,
        totalSinFiltro: allRows.length,
        hayMas: request.page * request.pageSize < total,
      }
    },
  }
}

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
    calidadAnimalId: animal.calidadAnimalId ?? null,
    hierroId: animal.hierroId ?? null,
    propietarioId: animal.propietarioId ?? null,
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

/**
 * redesign-ficha-animal (slice 3, task 3.6): timeline E2E honesto. El doble
 * del puerto deja de devolver 21 items fijos con cursor constante y pasa a
 * filtrar por dominio + paginar por cursor keyset, igual que el repositorio
 * real (D1/D3). 28 eventos en 4 dominios: 20 caben en la primera página y
 * dejan `nextCursor`; cada dominio tiene su propio conjunto filtrable.
 */
const EVENTOS_TIMELINE_E2E: readonly TimelineItemAnimalDto[] = [
  // Producción — pesajes (9)
  {
    id: "e2e-peso-09",
    dominio: "produccion",
    tipo: "pesaje",
    fecha: "2026-07-15",
    detalle: "445 kg",
  },
  {
    id: "e2e-peso-08",
    dominio: "produccion",
    tipo: "pesaje",
    fecha: "2026-06-15",
    detalle: "432 kg",
  },
  {
    id: "e2e-peso-07",
    dominio: "produccion",
    tipo: "pesaje",
    fecha: "2026-05-15",
    detalle: "420 kg",
  },
  {
    id: "e2e-peso-06",
    dominio: "produccion",
    tipo: "pesaje",
    fecha: "2026-04-15",
    detalle: "407 kg",
  },
  {
    id: "e2e-peso-05",
    dominio: "produccion",
    tipo: "pesaje",
    fecha: "2026-03-15",
    detalle: "395 kg",
  },
  {
    id: "e2e-peso-04",
    dominio: "produccion",
    tipo: "pesaje",
    fecha: "2026-02-15",
    detalle: "382 kg",
  },
  {
    id: "e2e-peso-03",
    dominio: "produccion",
    tipo: "pesaje",
    fecha: "2026-01-15",
    detalle: "370 kg",
  },
  {
    id: "e2e-peso-02",
    dominio: "produccion",
    tipo: "pesaje",
    fecha: "2025-12-15",
    detalle: "357 kg",
  },
  {
    id: "e2e-peso-01",
    dominio: "produccion",
    tipo: "pesaje",
    fecha: "2025-11-15",
    detalle: "345 kg",
  },
  // Producción — lácteos (4) y condición corporal (2)
  {
    id: "e2e-lacteo-04",
    dominio: "produccion",
    tipo: "produccion",
    fecha: "2026-07-10",
    detalle: "18 L",
  },
  {
    id: "e2e-lacteo-03",
    dominio: "produccion",
    tipo: "produccion",
    fecha: "2026-06-10",
    detalle: "17 L",
  },
  {
    id: "e2e-lacteo-02",
    dominio: "produccion",
    tipo: "produccion",
    fecha: "2026-05-10",
    detalle: "16 L",
  },
  {
    id: "e2e-lacteo-01",
    dominio: "produccion",
    tipo: "produccion",
    fecha: "2026-04-10",
    detalle: "15 L",
  },
  {
    id: "e2e-cond-02",
    dominio: "produccion",
    tipo: "condicion",
    fecha: "2026-07-01",
    detalle: "3.5",
  },
  {
    id: "e2e-cond-01",
    dominio: "produccion",
    tipo: "condicion",
    fecha: "2026-03-01",
    detalle: "3.0",
  },
  // Reproducción — servicios (4), palpaciones (2), partos (1)
  {
    id: "e2e-servicio-04",
    dominio: "reproduccion",
    tipo: "servicio",
    fecha: "2026-06-20",
    detalle: "inseminacion",
  },
  {
    id: "e2e-servicio-03",
    dominio: "reproduccion",
    tipo: "servicio",
    fecha: "2026-02-20",
    detalle: "monta",
  },
  {
    id: "e2e-servicio-02",
    dominio: "reproduccion",
    tipo: "servicio",
    fecha: "2025-10-20",
    detalle: "inseminacion",
  },
  {
    id: "e2e-servicio-01",
    dominio: "reproduccion",
    tipo: "servicio",
    fecha: "2025-06-20",
    detalle: "monta",
  },
  {
    id: "e2e-palpacion-02",
    dominio: "reproduccion",
    tipo: "palpacion",
    fecha: "2026-05-20",
    detalle: "prenada",
  },
  {
    id: "e2e-palpacion-01",
    dominio: "reproduccion",
    tipo: "palpacion",
    fecha: "2026-01-20",
    detalle: "vacia",
  },
  {
    id: "e2e-parto-01",
    dominio: "reproduccion",
    tipo: "parto",
    fecha: "2025-03-01",
    detalle: "normal",
  },
  // Sanidad — vacunaciones (2) y revisión (1)
  {
    id: "e2e-vacuna-02",
    dominio: "sanidad",
    tipo: "vacunacion",
    fecha: "2026-05-01",
    detalle: "Aftosa",
  },
  {
    id: "e2e-vacuna-01",
    dominio: "sanidad",
    tipo: "vacunacion",
    fecha: "2025-11-01",
    detalle: "Brucelosis",
  },
  {
    id: "e2e-revision-01",
    dominio: "sanidad",
    tipo: "revision",
    fecha: "2026-02-10",
    detalle: "vitaminas",
  },
  // Manejo — reubicaciones (2) y venta (1)
  {
    id: "e2e-reub-02",
    dominio: "manejo",
    tipo: "reubicacion",
    fecha: "2026-06-01",
    detalle: "Potrero Norte",
  },
  {
    id: "e2e-reub-01",
    dominio: "manejo",
    tipo: "reubicacion",
    fecha: "2025-09-01",
    detalle: "Potrero Sur",
  },
  { id: "e2e-venta-01", dominio: "manejo", tipo: "venta", fecha: "2025-05-01", detalle: "Feria" },
]

function codificarCursorTimelineE2e(item: { readonly fecha: string; readonly id: string }): string {
  return Buffer.from(JSON.stringify({ f: item.fecha, id: item.id }), "utf8").toString("base64url")
}

function decodificarCursorTimelineE2e(
  cursor: string | undefined,
): { readonly f: string; readonly id: string } | null {
  if (!cursor) return null
  try {
    const parseado: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"))
    if (typeof parseado !== "object" || parseado === null) return null
    const { f, id } = parseado as { readonly f?: unknown; readonly id?: unknown }
    if (typeof f !== "string" || typeof id !== "string") return null
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) return null
    if (Number.isNaN(new Date(f).getTime())) return null
    return { f, id }
  } catch {
    return null
  }
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
      async listarPagina(consulta) {
        const cursor = decodificarCursorTimelineE2e(consulta.cursor)
        const eventos = EVENTOS_TIMELINE_E2E.filter(
          (evento) => !consulta.dominio || evento.dominio === consulta.dominio,
        )
          .filter(
            (evento) =>
              !cursor ||
              evento.fecha < cursor.f ||
              (evento.fecha === cursor.f && evento.id < cursor.id),
          )
          .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id))
        const pagina = eventos.slice(0, consulta.limit)
        const ultimo = pagina[pagina.length - 1]
        return {
          items: pagina,
          ...(eventos.length > consulta.limit && ultimo
            ? { nextCursor: codificarCursorTimelineE2e(ultimo) }
            : {}),
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
  "raza" | "color" | "calidad" | "tipoExplotacion",
  RazaOption | ColorOption | CalidadOption | TipoExplotacionOption
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
  const tiposExplotacion: readonly TipoExplotacionOption[] = [
    { id: "te-leche", nombre: "Leche", activo: true },
    { id: "te-cria", nombre: "Cría", activo: true },
    { id: "te-doble", nombre: "Doble Propósito", activo: true },
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
        case "tipoExplotacion":
          return tiposExplotacion
        default:
          return []
      }
    },
  } as CatalogoAnimalMaestroPort<
    "raza" | "color" | "calidad" | "tipoExplotacion",
    RazaOption | ColorOption | CalidadOption | TipoExplotacionOption
  >
}

/**
 * PR-5: E2E fallback for CatalogoFincaPort.
 * Returns seeded potrero/sector/lote/grupo/lugarCompra data for the test finca (finca-1).
 */
export function createAnimalE2eCatalogoFincaPort(): CatalogoFincaPort<
  "potrero" | "sector" | "lote" | "grupo" | "lugarCompra" | "hierro" | "propietario",
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
        case "hierro":
          return [{ id: "hierro-h1", nombre: "Hierro 1", fincaId, activo: true }]
        case "propietario":
          return [{ id: "prop-1", nombre: "Propietario 1", fincaId, activo: true }]
        default:
          return []
      }
    },
  } as CatalogoFincaPort<
    "potrero" | "sector" | "lote" | "grupo" | "lugarCompra" | "hierro" | "propietario",
    CatalogoFincaOption
  >
}

/**
 * E2E mock for CatalogoPadresPort.
 * Returns seeded hembras (madres), machos and pajuelas (padres) for finca-1.
 * Respects excludedIds to prevent self-parent selection in edit mode.
 */
export function createAnimalE2eCatalogoPadresPort(): CatalogoPadresPort {
  const fincaId = "finca-1"
  const hembras: readonly ParentComboboxOption[] = [
    { id: "animal-1", codigo: "MT-122", nombre: "Matilda" },
    { id: "animal-e2e-h2", codigo: "HR-010", nombre: "Rosa" },
  ]
  const machos: readonly ParentComboboxOption[] = [
    { id: "animal-e2e-m1", codigo: "TOR-001", nombre: "Trueno" },
  ]
  const pajuelas: readonly ParentComboboxOption[] = [
    { id: "animal-e2e-p1", codigo: "PJ-001", nombre: "Don Líbano" },
  ]

  return {
    async listarMadres(requestedFincaId, excludedIds) {
      if (requestedFincaId !== fincaId) return []
      return hembras.filter((h) => !excludedIds.includes(h.id))
    },
    async listarPadres(requestedFincaId, excludedIds) {
      if (requestedFincaId !== fincaId) return []
      return [...machos, ...pajuelas].filter((p) => !excludedIds.includes(p.id))
    },
  }
}
