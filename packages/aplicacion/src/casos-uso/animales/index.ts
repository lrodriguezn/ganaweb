import {
  type ErrorValidacionAnimal,
  calcularDecisionEliminarAnimal,
  crearEstadoBannerFichaAnimal,
  validarActualizacionAnimal,
  validarCreacionAnimal,
  validarReactivacionAnimal,
} from "@ganaweb/dominio"

export type { ErrorValidacionAnimal }
import type { EntradaOutbox } from "@ganaweb/sync"
import type { ArchivoAnimalPort, ColaBinariosPort } from "../../puertos/animal-media-port.js"
import type { AnimalReferenceCheckerPort } from "../../puertos/animal-reference-checker-port.js"
import type {
  AnimalRepositoryPort,
  AnimalUpdateCambios,
} from "../../puertos/animal-repository-port.js"
import type { TimelineAnimalPort } from "../../puertos/animal-timeline-port.js"
import type { OutboxPort } from "../../puertos/outbox-port.js"
import type { TransaccionPort } from "../../puertos/transaccion-port.js"

export interface SesionAnimal {
  readonly usuarioId: string
  readonly fincaActivaId: string
  readonly permisos: readonly { readonly modulo: string; readonly accion: string }[]
}

export interface AnimalUseCaseDeps {
  readonly animales: AnimalRepositoryPort
  readonly referencias: AnimalReferenceCheckerPort
  readonly timeline: TimelineAnimalPort
  readonly archivos: ArchivoAnimalPort
  readonly outbox: OutboxPort
  readonly colaBinarios: ColaBinariosPort
  readonly transacciones: TransaccionPort
  readonly auditoriaEliminaciones?: {
    registrar(entrada: {
      readonly id: string
      readonly fincaId: string
      readonly entidad: "animal"
      readonly entidadCodigo: string
      readonly entidadResumen: string
      readonly usuarioId: string
      readonly dispositivoId?: string | null
      readonly via: "permiso" | "autoservicio"
      readonly createdAt: Date
    }): Promise<void>
  }
  readonly tombstones?: {
    registrar(entrada: {
      readonly id: string
      readonly fincaId: string
      readonly tablaDestino: "animales"
      readonly entidadId: string
      readonly payload: unknown
      readonly createdAt: Date
    }): Promise<void>
  }
  readonly ubicaciones?: {
    registrarInicial(entrada: {
      readonly id: string
      readonly fincaId: string
      readonly animalId: string
      readonly potreroId?: string
      readonly sectorId?: string
      readonly loteId?: string
      readonly motivo: "inicial"
      readonly createdAt: Date
    }): Promise<void>
    /** CA-CRE-008: returns one ErrorValidacionAnimal per split-location id
     *  whose (id, fincaId) does not match the active finca. */
    verificarPropiedadEnFinca?(entrada: {
      readonly fincaId: string
      readonly potreroId?: string
      readonly sectorId?: string
      readonly loteId?: string
      readonly grupoId?: string
    }): Promise<readonly ErrorValidacionAnimal[]>
  }
  readonly pesajes?: {
    registrarInicial(entrada: {
      readonly id: string
      readonly fincaId: string
      readonly animalId: string
      readonly pesoKg: number
      readonly fecha: Date
      readonly createdAt: Date
    }): Promise<void>
  }
}

export type ResultadoNoAutorizado = { readonly tipo: "no_autorizado" }

function tienePermiso(sesion: SesionAnimal, accion: string): boolean {
  return sesion.permisos.some(
    (permiso) => permiso.modulo === "animales" && permiso.accion === accion,
  )
}

let secuenciaLocal = 0

function id(prefix: string): string {
  secuenciaLocal += 1
  return `${prefix}-${Date.now()}-${secuenciaLocal}`
}

function outboxBase(
  fincaId: string,
  operacion: EntradaOutbox["operacion"],
  payload: unknown,
): EntradaOutbox {
  return {
    id: id("outbox"),
    fincaId,
    tablaDestino: "animales",
    operacion,
    payload,
    createdAt: new Date().toISOString(),
  }
}

function errorTransaccion(error: unknown): {
  readonly tipo: "transaccion_fallida"
  readonly razon: string
} {
  return { tipo: "transaccion_fallida", razon: error instanceof Error ? error.message : "unknown" }
}

const MAX_ACTIVE_ANIMAL_IMAGES = 5
const ALLOWED_ANIMAL_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
])

export interface AnimalImageValidationError {
  readonly campo: "imagenes"
  readonly mensaje: string
}

export function validarImagenesAnimalMutation(
  imagenes: readonly { readonly mimeType: string }[],
  activeExistingCount = 0,
):
  | { readonly valido: true }
  | { readonly valido: false; readonly errores: readonly AnimalImageValidationError[] } {
  if (activeExistingCount + imagenes.length > MAX_ACTIVE_ANIMAL_IMAGES) {
    return {
      valido: false,
      errores: [{ campo: "imagenes", mensaje: "Máximo 5 fotos activas por animal" }],
    }
  }

  const unsupported = imagenes.find(
    (imagen) => !ALLOWED_ANIMAL_IMAGE_MIME_TYPES.has(imagen.mimeType.toLowerCase()),
  )
  if (unsupported) {
    return {
      valido: false,
      errores: [
        { campo: "imagenes", mensaje: `Tipo de imagen no permitido: ${unsupported.mimeType}` },
      ],
    }
  }

  return { valido: true }
}

interface ImagenPendienteAnimal {
  readonly id: string
  readonly blobId: string
  readonly estadoSubida: "pendiente"
}

interface CrearAnimalCommand {
  readonly sesion: SesionAnimal
  readonly datos: {
    readonly codigo: string
    readonly nombre: string
    readonly sexoKey: 0 | 1 | 2
    /**
     * v1.3 (PR 2b) — extended fields. The web mapper carries the raw form
     * payload; this use-case command is the typed surface the dominio's
     * `validarCreacionAnimal` expects. `fechaNacimiento` / `fechaCompra`
     * are normalized to `Date` here so the dominio's nullable-Date fields
     * stay honest.
     */
    readonly tipoIngreso?: "nacido_en_finca" | "comprado"
    readonly fechaNacimiento?: Date | null
    readonly fechaCompra?: Date | null
    readonly color?: string | null
    readonly raza?: string | null
    readonly madreId?: string | null
    readonly padreId?: string | null
    readonly calidadId?: string | null
    readonly precioCompra?: number | null
    readonly pesoCompra?: number | null
    readonly comentarios?: string | null
    readonly codigoArete?: string | null
    readonly codigoRfid?: string | null
    readonly tipoExplotacionId?: string | null
    readonly tatuado?: boolean | null
    readonly herrado?: boolean | null
    readonly descornado?: boolean | null
    readonly esDeMonta?: boolean | null
    readonly numeroPezones?: number | null
  }
  readonly imagenes?: readonly {
    readonly id: string
    readonly mimeType: string
    readonly bytes: number
  }[]
  readonly ubicacionInicial?: {
    readonly potreroId?: string
    readonly sectorId?: string
    readonly loteId?: string
    readonly grupoId?: string
  }
  readonly pesoInicial?: {
    readonly pesoKg: number
    readonly fecha: Date
  }
}

async function registrarUbicacionInicialAnimal(
  deps: AnimalUseCaseDeps,
  input: {
    readonly fincaId: string
    readonly animalId: string
    readonly ubicacion: {
      readonly potreroId?: string
      readonly sectorId?: string
      readonly loteId?: string
      readonly grupoId?: string
    }
  },
) {
  const createdAt = new Date()
  await deps.ubicaciones?.registrarInicial({
    id: id("ubicacion-animal"),
    fincaId: input.fincaId,
    animalId: input.animalId,
    ...input.ubicacion,
    motivo: "inicial",
    createdAt,
  })
  await deps.outbox.append(
    outboxBase(input.fincaId, "INSERT", {
      animalId: input.animalId,
      tablaDestino: "animales_ubicacion_historico",
      ...input.ubicacion,
      motivo: "inicial",
    }),
  )
}

async function registrarPesoInicialAnimal(
  deps: AnimalUseCaseDeps,
  input: {
    readonly fincaId: string
    readonly animalId: string
    readonly peso: { readonly pesoKg: number; readonly fecha: Date }
  },
) {
  const createdAt = new Date()
  await deps.pesajes?.registrarInicial({
    id: id("peso-animal"),
    fincaId: input.fincaId,
    animalId: input.animalId,
    pesoKg: input.peso.pesoKg,
    fecha: input.peso.fecha,
    createdAt,
  })
  await deps.outbox.append(
    outboxBase(input.fincaId, "INSERT", {
      animalId: input.animalId,
      tablaDestino: "pesos",
      pesoKg: input.peso.pesoKg,
      fecha: input.peso.fecha.toISOString(),
    }),
  )
}

async function registrarImagenesPendientesAnimal(
  deps: AnimalUseCaseDeps,
  input: {
    readonly fincaId: string
    readonly animalId: string
    readonly imagenes: readonly {
      readonly id: string
      readonly mimeType: string
      readonly bytes: number
    }[]
  },
): Promise<ImagenPendienteAnimal[]> {
  const imagenesPendientes: ImagenPendienteAnimal[] = []
  for (const imagen of input.imagenes) {
    const imagenId = id("imagen")
    const link = {
      id: imagenId,
      fincaId: input.fincaId,
      animalId: input.animalId,
      blobId: imagen.id,
      mimeType: imagen.mimeType,
      bytes: imagen.bytes,
      esPrincipal: imagenesPendientes.length === 0,
      estadoSubida: "pendiente" as const,
    }
    await deps.archivos.vincularImagenPendiente?.(link)
    await deps.outbox.append(
      outboxBase(input.fincaId, "INSERT", {
        animalId: input.animalId,
        imagenId,
        blobId: imagen.id,
        tablaDestino: "animales_imagenes",
        estadoSubida: "pendiente",
      }),
    )
    await deps.colaBinarios.encolar({
      id: id("binario"),
      fincaId: input.fincaId,
      animalId: input.animalId,
      blobId: imagen.id,
      mimeType: imagen.mimeType,
      bytes: imagen.bytes,
    })
    imagenesPendientes.push({ id: imagenId, blobId: imagen.id, estadoSubida: "pendiente" })
  }
  return imagenesPendientes
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: field mapper with many optional DB columns
function crearAnimalPersistible(input: {
  readonly animalId: string
  readonly fincaId: string
  readonly usuarioId: string
  readonly codigo: string
  readonly nombre: string
  readonly sexoKey: 0 | 1 | 2
  readonly version: number
  readonly activo: boolean
  readonly fechaNacimiento?: Date | null
  readonly fechaCompra?: Date | null
  readonly color?: string | null
  readonly raza?: string | null
  readonly madreId?: string | null
  readonly padreId?: string | null
  readonly categoriaReproductiva?: string | null
  readonly calidadId?: string | null
  readonly precioCompra?: number | null
  readonly pesoCompra?: number | null
  readonly comentarios?: string | null
  readonly codigoArete?: string | null
  readonly codigoRfid?: string | null
  readonly tipoExplotacionId?: string | null
  readonly tatuado?: boolean | null
  readonly herrado?: boolean | null
  readonly descornado?: boolean | null
  readonly esDeMonta?: boolean | null
  readonly numeroPezones?: number | null
}) {
  const sexo = input.sexoKey === 1 ? "hembra" : input.sexoKey === 0 ? "macho" : "pajuela"
  const epochSeconds = (date: Date | null | undefined) =>
    date ? Math.floor(date.getTime() / 1000) : null
  return {
    id: input.animalId,
    fincaId: input.fincaId,
    codigo: input.codigo,
    nombreAnimal: input.nombre,
    sexo,
    estadoActual: "activo",
    salud: "sano",
    version: input.version,
    activo: input.activo,
    usuarioCreadoPor: input.usuarioId,
    creadoEn: new Date(),
    fechaNacimiento: epochSeconds(input.fechaNacimiento),
    fechaCompra: epochSeconds(input.fechaCompra),
    razaId: input.raza ?? null,
    colorId: input.color ?? null,
    madreId: input.madreId ?? null,
    padreId: input.padreId ?? null,
    categoriaReproductiva: input.categoriaReproductiva ?? null,
    calidadAnimalId: input.calidadId ?? null,
    precioCompra: input.precioCompra ?? null,
    pesoCompra: input.pesoCompra ?? null,
    comentarios: input.comentarios ?? null,
    codigoArete: input.codigoArete ?? null,
    codigoRfid: input.codigoRfid ?? null,
    tipoExplotacionId: input.tipoExplotacionId ?? null,
    tatuado: input.tatuado ?? null,
    herrado: input.herrado ?? null,
    descornado: input.descornado ?? null,
    esDeMonta: input.esDeMonta ?? null,
    numeroPezones: input.numeroPezones ?? null,
  } as const
}

async function persistirCreacionAnimal(
  deps: AnimalUseCaseDeps,
  cmd: CrearAnimalCommand,
  animal: ReturnType<typeof crearAnimalPersistible>,
): Promise<ImagenPendienteAnimal[]> {
  await deps.animales.guardar(animal)
  await deps.outbox.append(
    outboxBase(cmd.sesion.fincaActivaId, "INSERT", { animalId: animal.id, codigo: animal.codigo }),
  )
  if (cmd.ubicacionInicial)
    await registrarUbicacionInicialAnimal(deps, {
      fincaId: cmd.sesion.fincaActivaId,
      animalId: animal.id,
      ubicacion: cmd.ubicacionInicial,
    })
  if (cmd.pesoInicial)
    await registrarPesoInicialAnimal(deps, {
      fincaId: cmd.sesion.fincaActivaId,
      animalId: animal.id,
      peso: cmd.pesoInicial,
    })
  return registrarImagenesPendientesAnimal(deps, {
    fincaId: cmd.sesion.fincaActivaId,
    animalId: animal.id,
    imagenes: cmd.imagenes ?? [],
  })
}

async function validarDuplicadoAnimal(deps: AnimalUseCaseDeps, cmd: CrearAnimalCommand) {
  const existente = await deps.animales.buscarPorCodigoYFinca(
    cmd.datos.codigo.trim(),
    cmd.sesion.fincaActivaId,
  )
  return validarCreacionAnimal({
    ...cmd.datos,
    fincaId: cmd.sesion.fincaActivaId,
    existentes: existente ? [{ fincaId: existente.fincaId, codigo: existente.codigo }] : [],
  })
}

async function validarUbicacionInicialAnimal(
  deps: AnimalUseCaseDeps,
  cmd: CrearAnimalCommand,
): Promise<{ readonly tipo: "validacion"; readonly errores: unknown } | null> {
  if (cmd.ubicacionInicial && deps.ubicaciones?.verificarPropiedadEnFinca) {
    const erroresUbicacion = await deps.ubicaciones.verificarPropiedadEnFinca({
      fincaId: cmd.sesion.fincaActivaId,
      ...cmd.ubicacionInicial,
    })
    if (erroresUbicacion.length > 0) {
      return { tipo: "validacion", errores: erroresUbicacion }
    }
  }
  return null
}

function validarImagenesAnimal(
  cmd: CrearAnimalCommand,
): { readonly tipo: "validacion"; readonly errores: unknown } | null {
  const validacionImagenes = validarImagenesAnimalMutation(cmd.imagenes ?? [])
  if (!validacionImagenes.valido) {
    return { tipo: "validacion", errores: validacionImagenes.errores }
  }
  return null
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: field mapper with many optional DB columns
function buildCrearAnimalInput(
  cmd: CrearAnimalCommand,
  animalId: string,
  validacion: {
    readonly valor: {
      readonly codigo: string
      readonly nombre: string
      readonly sexoKey: 0 | 1 | 2
      readonly version: number
      readonly activo: boolean
      readonly color?: string | null | undefined
      readonly raza?: string | null | undefined
      readonly categoriaReproductiva: "novilla" | "no_aplica"
    }
  },
) {
  const { valor } = validacion
  const { datos } = cmd
  return {
    animalId,
    fincaId: cmd.sesion.fincaActivaId,
    usuarioId: cmd.sesion.usuarioId,
    codigo: valor.codigo,
    nombre: valor.nombre,
    sexoKey: valor.sexoKey,
    version: valor.version,
    activo: valor.activo,
    fechaNacimiento: datos.fechaNacimiento ?? null,
    fechaCompra: datos.fechaCompra ?? null,
    color: valor.color ?? null,
    raza: valor.raza ?? null,
    madreId: datos.madreId ?? null,
    padreId: datos.padreId ?? null,
    categoriaReproductiva: valor.categoriaReproductiva,
    calidadId: datos.calidadId ?? null,
    precioCompra: datos.precioCompra ?? null,
    pesoCompra: datos.pesoCompra ?? null,
    comentarios: datos.comentarios ?? null,
    codigoArete: datos.codigoArete ?? null,
    codigoRfid: datos.codigoRfid ?? null,
    tipoExplotacionId: datos.tipoExplotacionId ?? null,
    tatuado: datos.tatuado ?? null,
    herrado: datos.herrado ?? null,
    descornado: datos.descornado ?? null,
    esDeMonta: datos.esDeMonta ?? null,
    numeroPezones: datos.numeroPezones ?? null,
  }
}

export function crearAnimal(deps: AnimalUseCaseDeps) {
  return async (
    cmd: CrearAnimalCommand,
  ): Promise<
    | ResultadoNoAutorizado
    | {
        readonly tipo: "creado"
        readonly animalId: string
        readonly imagenes?: readonly {
          readonly id: string
          readonly blobId: string
          readonly estadoSubida: "pendiente"
        }[]
      }
    | { readonly tipo: "validacion"; readonly errores: unknown }
    | { readonly tipo: "transaccion_fallida"; readonly razon: string }
  > => {
    if (!tienePermiso(cmd.sesion, "crear")) return { tipo: "no_autorizado" }

    const validacion = await validarDuplicadoAnimal(deps, cmd)
    if (!validacion.valido) return { tipo: "validacion", errores: validacion.errores }

    const errorUbicacion = await validarUbicacionInicialAnimal(deps, cmd)
    if (errorUbicacion) return errorUbicacion

    const errorImagenes = validarImagenesAnimal(cmd)
    if (errorImagenes) return errorImagenes

    const animalId = id("animal")
    const animal = crearAnimalPersistible(buildCrearAnimalInput(cmd, animalId, validacion))
    let imagenesPendientes: ImagenPendienteAnimal[] = []

    try {
      await deps.transacciones.run(async () => {
        imagenesPendientes = await persistirCreacionAnimal(deps, cmd, animal)
      })
    } catch (error) {
      return errorTransaccion(error)
    }

    return imagenesPendientes.length > 0
      ? { tipo: "creado", animalId, imagenes: imagenesPendientes }
      : { tipo: "creado", animalId }
  }
}

export function obtenerFichaAnimal(deps: AnimalUseCaseDeps) {
  return async (cmd: {
    readonly sesion: SesionAnimal
    readonly animalId: string
    readonly cursorTimeline?: string
  }) => {
    if (!tienePermiso(cmd.sesion, "ver")) return { tipo: "no_autorizado" } as const
    const animal = await deps.animales.obtenerPorIdYFinca?.(cmd.animalId, cmd.sesion.fincaActivaId)
    if (!animal) return { tipo: "no_encontrado" } as const
    const [imagenes, timeline] = await Promise.all([
      deps.archivos.listarImagenes(cmd.animalId, cmd.sesion.fincaActivaId),
      deps.timeline.listarPagina({
        animalId: cmd.animalId,
        fincaId: cmd.sesion.fincaActivaId,
        ...(cmd.cursorTimeline ? { cursor: cmd.cursorTimeline } : {}),
        limit: 20,
      }),
    ])
    return {
      tipo: "ficha",
      animal,
      imagenes,
      genealogia: { madre: null, padre: null, crias: [] },
      estadoBanner: crearEstadoBannerFichaAnimal(
        animal.estadoActual === undefined
          ? { activo: animal.activo }
          : { activo: animal.activo, estadoActual: animal.estadoActual },
      ),
      timeline,
    } as const
  }
}

export function eliminarAnimal(deps: AnimalUseCaseDeps) {
  return async (cmd: {
    readonly sesion: SesionAnimal
    readonly animalId: string
    readonly online: boolean
  }) => {
    if (!tienePermiso(cmd.sesion, "inactivar") && !tienePermiso(cmd.sesion, "eliminar")) {
      return { tipo: "no_autorizado" } as const
    }
    const animal = await deps.animales.obtenerPorIdYFinca?.(cmd.animalId, cmd.sesion.fincaActivaId)
    if (!animal) return { tipo: "no_encontrado" } as const
    const referencias = await deps.referencias.summarize(cmd.animalId, cmd.sesion.fincaActivaId)
    const decision = calcularDecisionEliminarAnimal({
      online: cmd.online,
      referencias,
      usuarioId: cmd.sesion.usuarioId,
      usuarioCreadoPor: animal.usuarioCreadoPor,
      creadoEn: animal.creadoEn,
      ahora: new Date(),
      permisos: cmd.sesion.permisos,
    })
    try {
      if (decision.tipo === "eliminado") {
        await deps.transacciones.run(async () => {
          const createdAt = new Date()
          await deps.auditoriaEliminaciones?.registrar({
            id: id("audit-animal-delete"),
            fincaId: cmd.sesion.fincaActivaId,
            entidad: "animal",
            entidadCodigo: animal.codigo,
            entidadResumen: animal.nombre ? `${animal.codigo} · ${animal.nombre}` : animal.codigo,
            usuarioId: cmd.sesion.usuarioId,
            dispositivoId: null,
            via: decision.via,
            createdAt,
          })
          await deps.tombstones?.registrar({
            id: id("tombstone-animal"),
            fincaId: cmd.sesion.fincaActivaId,
            tablaDestino: "animales",
            entidadId: cmd.animalId,
            payload: { animalId: cmd.animalId, codigo: animal.codigo, via: decision.via },
            createdAt,
          })
          await deps.animales.eliminarFisico?.(cmd.animalId, cmd.sesion.fincaActivaId)
          await deps.outbox.append(
            outboxBase(cmd.sesion.fincaActivaId, "DELETE", {
              animalId: cmd.animalId,
              via: decision.via,
              tombstone: true,
            }),
          )
        })
      }
      if (decision.tipo === "inactivado") {
        await deps.transacciones.run(async () => {
          await deps.animales.inactivar?.(cmd.animalId, cmd.sesion.fincaActivaId)
          await deps.outbox.append(
            outboxBase(cmd.sesion.fincaActivaId, "UPDATE", {
              animalId: cmd.animalId,
              activo: false,
            }),
          )
        })
      }
    } catch (error) {
      return errorTransaccion(error)
    }
    return decision
  }
}

export function actualizarAnimal(deps: AnimalUseCaseDeps) {
  return async (cmd: {
    readonly sesion: SesionAnimal
    readonly animalId: string
    readonly cambios: AnimalUpdateCambios
  }) => {
    if (!tienePermiso(cmd.sesion, "editar")) return { tipo: "no_autorizado" } as const
    const animal = await deps.animales.obtenerPorIdYFinca?.(cmd.animalId, cmd.sesion.fincaActivaId)
    if (!animal) return { tipo: "no_encontrado" } as const
    const referencias = await deps.referencias.summarize(cmd.animalId, cmd.sesion.fincaActivaId)
    const validacion = validarActualizacionAnimal({
      codigoActual: animal.codigo,
      cambios: { ...cmd.cambios, versionActual: animal.version },
      referencias,
    })
    if (!validacion.valido) return { tipo: "validacion", errores: validacion.errores } as const

    try {
      await deps.transacciones.run(async () => {
        await deps.animales.actualizar?.(cmd.animalId, cmd.sesion.fincaActivaId, cmd.cambios)
        await deps.outbox.append(
          outboxBase(cmd.sesion.fincaActivaId, "UPDATE", {
            animalId: cmd.animalId,
            cambios: cmd.cambios,
          }),
        )
      })
    } catch (error) {
      return errorTransaccion(error)
    }
    return { tipo: "actualizado" } as const
  }
}

export function reactivarAnimal(deps: AnimalUseCaseDeps) {
  return async (cmd: {
    readonly sesion: SesionAnimal
    readonly animalId: string
    readonly codigo: string
  }) => {
    if (!tienePermiso(cmd.sesion, "inactivar")) return { tipo: "no_autorizado" } as const
    const animal = await deps.animales.obtenerPorIdYFinca?.(cmd.animalId, cmd.sesion.fincaActivaId)
    if (!animal) return { tipo: "no_encontrado" } as const
    const activoConCodigo = await deps.animales.buscarPorCodigoYFinca(
      cmd.codigo.trim(),
      cmd.sesion.fincaActivaId,
    )
    const validacion = validarReactivacionAnimal({
      codigo: cmd.codigo,
      fincaId: cmd.sesion.fincaActivaId,
      existentesActivos: activoConCodigo ? [activoConCodigo] : [],
    })
    if (!validacion.valido) return { tipo: "validacion", errores: validacion.errores } as const

    try {
      await deps.transacciones.run(async () => {
        await deps.animales.reactivar?.(cmd.animalId, cmd.sesion.fincaActivaId, cmd.codigo.trim())
        await deps.outbox.append(
          outboxBase(cmd.sesion.fincaActivaId, "UPDATE", {
            animalId: cmd.animalId,
            activo: true,
            codigo: cmd.codigo.trim(),
          }),
        )
      })
    } catch (error) {
      return errorTransaccion(error)
    }
    return { tipo: "reactivado" } as const
  }
}
