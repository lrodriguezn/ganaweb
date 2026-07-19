/**
 * Entidades de dominio del agregado `Animal`.
 *
 * El dominio se modela en español siguiendo T-001/T-003. Los tipos son
 * readonly para empujar a los consumidores a producir nuevos valores en
 * lugar de mutar (alineado con Clean Architecture — el dominio es
 * inmutable desde la perspectiva de los casos de uso).
 *
 * El alcance de este PR es el subconjunto mínimo necesario para RN-001
 * (código único por finca); los campos adicionales del agregado se
 * completarán en PR futuros.
 */

export type Sexo = "macho" | "hembra" | "pajuela"

export type EstadoAnimal = "activo" | "vendido" | "muerto"

export type Salud = "sano" | "enfermo"

export interface AnimalResumen {
  readonly id: string
  readonly fincaId: string
  /** Único dentro de la misma finca (RN-001). */
  readonly codigo: string
  readonly nombreAnimal?: string | null
  readonly sexo: Sexo
  readonly estadoActual: EstadoAnimal
  readonly salud: Salud
  /** epoch seconds (UTC) — null si no aplica. PR Slice D2: persistencia. */
  readonly fechaNacimiento?: number | null
  readonly fechaCompra?: number | null
}

export type SexoKey = 0 | 1 | 2

export type ReglaAnimal =
  | "CA-CRE-001"
  | "CA-CRE-002"
  | "CA-CRE-003"
  | "CA-CRE-004"
  | "CA-CRE-005"
  | "CA-CRE-006"
  | "CA-CRE-007"
  | "CA-CRE-008"
  | "CA-UPD-001"
  | "CA-UPD-002"
  | "CA-UPD-003"
  | "CA-DEL-001"
  | "CA-DEL-002"
  | "CA-DEL-003"
  | "CA-DEL-004"
  | "CA-DEL-005"
  | "CA-DEL-006"
  | "CA-DEL-007"
  | "CA-DEL-008"
  | "CA-DEL-009"
  | "CA-IMG-001"
  | "CA-IMG-002"
  | "CA-IMG-003"
  | "CA-IMG-004"
  | "CA-IMG-005"
  | "CA-IMG-006"
  | "CA-IMG-007"

export interface ErrorValidacionAnimal {
  readonly campo: string
  readonly regla: ReglaAnimal
  readonly detalle: string
}

export type ResultadoAnimal<T> =
  | { readonly valido: true; readonly valor: T; readonly reglas: readonly ReglaAnimal[] }
  | { readonly valido: false; readonly errores: readonly ErrorValidacionAnimal[] }

export interface AnimalParaValidacion {
  readonly id?: string
  readonly fincaId: string
  readonly codigo: string
  readonly sexoKey?: SexoKey
}

export interface DatosCreacionAnimal {
  readonly codigo: string
  readonly nombre: string
  readonly sexoKey: SexoKey | null | undefined
  readonly fincaId: string
  readonly color?: string | null
  readonly raza?: string | null
  readonly tipoIngreso?: "nacido_en_finca" | "comprado"
  readonly fechaNacimiento?: Date | null
  readonly fechaCompra?: Date | null
  readonly madreId?: string | null
  readonly padreId?: string | null
  readonly existentes: readonly AnimalParaValidacion[]
}

export interface AnimalValidado {
  readonly codigo: string
  readonly nombre: string
  readonly sexoKey: SexoKey
  readonly fincaId: string
  readonly color?: string | null | undefined
  readonly raza?: string | null | undefined
  readonly activo: true
  readonly version: 1
  readonly estadoAnimalKey: 0
  readonly saludAnimalKey: 0
  readonly categoriaReproductiva: "novilla" | "no_aplica"
}

export interface ResumenReferenciasAnimal {
  readonly eventCount: number
  readonly offspringCount: number
  readonly blocksCodeChange: boolean
}

export interface DatosActualizacionAnimal {
  readonly codigoActual: string
  readonly cambios: {
    readonly codigo?: string
    readonly versionLeida: number
    readonly versionActual: number
    readonly estadoAnimalKey?: number
    readonly saludAnimalKey?: number
    readonly potreroId?: string | null
  }
  readonly referencias: ResumenReferenciasAnimal
}

export interface DatosReactivacionAnimal {
  readonly codigo: string
  readonly fincaId: string
  readonly existentesActivos: readonly Pick<AnimalParaValidacion, "fincaId" | "codigo">[]
}

export type DecisionEliminarAnimal =
  | { readonly tipo: "eliminado"; readonly via: "permiso" | "autoservicio" }
  | { readonly tipo: "inactivado"; readonly eventos: number }
  | { readonly tipo: "denegado"; readonly razon: string }

export type DecisionEditabilidadCodigoAnimal =
  | { readonly editable: true; readonly reglas: readonly ["CA-UPD-001"] }
  | {
      readonly editable: false
      readonly regla: "CA-UPD-001"
      readonly referencias: number
    }

export interface DatosDecisionEliminarAnimal {
  readonly online: boolean
  readonly referencias: ResumenReferenciasAnimal
  readonly usuarioId: string
  readonly usuarioCreadoPor: string
  readonly creadoEn: Date
  readonly ahora: Date
  readonly permisos: readonly { readonly modulo: string; readonly accion: string }[]
}

export interface ImagenAnimalLink {
  readonly id: string
  readonly activa: boolean
  readonly esPrincipal: boolean
}

export type TipoMimeImagenAnimal = "image/jpeg" | "image/png" | "image/webp" | "image/heic"

export type EstadoBannerFichaAnimal = {
  readonly tipo: "inactivo" | "vendido" | "muerto"
  readonly bloqueaAccionesEventos: true
} | null

const MAX_IMAGENES_ACTIVAS = 5
const HORAS_AUTOSERVICIO_ELIMINACION = 24
const DIAS_PURGA_IMAGEN_DESVINCULADA = 30
const TIPOS_IMAGEN_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "image/heic"] as const

function tienePermiso(
  permisos: readonly { readonly modulo: string; readonly accion: string }[],
  accion: string,
): boolean {
  return permisos.some((permiso) => permiso.modulo === "animales" && permiso.accion === accion)
}

function error(campo: string, regla: ReglaAnimal, detalle: string): ErrorValidacionAnimal {
  return { campo, regla, detalle }
}

function validarCamposMinimos(
  datos: DatosCreacionAnimal,
  codigo: string,
  nombre: string,
): ErrorValidacionAnimal[] {
  const errores: ErrorValidacionAnimal[] = []
  if (codigo.length === 0) errores.push(error("codigo", "CA-CRE-001", "El código es obligatorio."))
  if (nombre.length === 0) errores.push(error("nombre", "CA-CRE-001", "El nombre es obligatorio."))
  if (datos.sexoKey !== 0 && datos.sexoKey !== 1 && datos.sexoKey !== 2) {
    errores.push(error("sexo_key", "CA-CRE-001", "El sexo es obligatorio."))
  }
  return errores
}

function codigoDuplicado(datos: DatosCreacionAnimal, codigo: string): boolean {
  return datos.existentes.some(
    (animal) =>
      animal.fincaId === datos.fincaId &&
      animal.codigo.trim().toLowerCase() === codigo.toLowerCase(),
  )
}

function validarOrigen(datos: DatosCreacionAnimal): ErrorValidacionAnimal[] {
  if (datos.tipoIngreso === "comprado" && !datos.fechaCompra) {
    return [error("fecha_compra", "CA-CRE-002", "La compra requiere fecha de compra.")]
  }
  if (datos.tipoIngreso === "nacido_en_finca" && !datos.fechaNacimiento) {
    return [error("fecha_nacimiento", "CA-CRE-002", "El nacimiento requiere fecha de nacimiento.")]
  }
  return []
}

function validarMadre(datos: DatosCreacionAnimal): ErrorValidacionAnimal[] {
  const madre = datos.madreId
    ? datos.existentes.find((animal) => animal.id === datos.madreId)
    : undefined
  if (datos.madreId && (!madre || madre.fincaId !== datos.fincaId || madre.sexoKey !== 1)) {
    return [error("madre_id", "CA-CRE-003", "La madre debe ser hembra de la misma finca.")]
  }
  return []
}

function validarPadre(datos: DatosCreacionAnimal): ErrorValidacionAnimal[] {
  const padre = datos.padreId
    ? datos.existentes.find((animal) => animal.id === datos.padreId)
    : undefined
  if (datos.padreId && (!padre || padre.fincaId !== datos.fincaId || padre.sexoKey !== 0)) {
    return [error("padre_id", "CA-CRE-004", "El padre debe ser macho de la misma finca.")]
  }
  return []
}

export function validarCreacionAnimal(datos: DatosCreacionAnimal): ResultadoAnimal<AnimalValidado> {
  const codigo = datos.codigo.trim()
  const nombre = datos.nombre.trim()
  const errores: ErrorValidacionAnimal[] = [
    ...validarCamposMinimos(datos, codigo, nombre),
    ...validarOrigen(datos),
    ...validarMadre(datos),
    ...validarPadre(datos),
  ]

  if (codigo.length > 0 && codigoDuplicado(datos, codigo)) {
    errores.push(error("codigo", "CA-CRE-001", "El código ya existe en la finca."))
  }

  if (errores.length > 0) return { valido: false, errores }

  const sexoKey = datos.sexoKey as SexoKey
  return {
    valido: true,
    valor: {
      codigo,
      nombre,
      sexoKey,
      fincaId: datos.fincaId,
      color: datos.color,
      raza: datos.raza,
      activo: true,
      version: 1,
      estadoAnimalKey: 0,
      saludAnimalKey: 0,
      categoriaReproductiva: sexoKey === 1 ? "novilla" : "no_aplica",
    },
    reglas: ["CA-CRE-001", "CA-CRE-005", "CA-CRE-007"],
  }
}

export function validarActualizacionAnimal(
  datos: DatosActualizacionAnimal,
): ResultadoAnimal<{ readonly ok: true }> {
  const errores: ErrorValidacionAnimal[] = []
  if (datos.cambios.versionLeida !== datos.cambios.versionActual) {
    errores.push(error("version", "CA-UPD-002", "La versión leída no coincide con la actual."))
  }
  if (datos.cambios.estadoAnimalKey !== undefined) {
    errores.push(
      error(
        "estado_animal_key",
        "CA-UPD-003",
        "El estado derivado de eventos no se edita directamente.",
      ),
    )
  }
  if (datos.cambios.saludAnimalKey !== undefined) {
    errores.push(
      error(
        "salud_animal_key",
        "CA-UPD-003",
        "La salud derivada de eventos no se edita directamente.",
      ),
    )
  }
  if (datos.cambios.potreroId !== undefined) {
    errores.push(
      error("potrero_id", "CA-UPD-003", "La ubicación cambia mediante eventos de movimiento."),
    )
  }
  if (
    datos.cambios.codigo !== undefined &&
    datos.cambios.codigo.trim() !== datos.codigoActual.trim() &&
    datos.referencias.blocksCodeChange
  ) {
    errores.push(
      error("codigo", "CA-UPD-001", "El código no se puede cambiar: el animal tiene referencias."),
    )
  }
  return errores.length > 0
    ? { valido: false, errores }
    : { valido: true, valor: { ok: true }, reglas: [] }
}

export function validarReactivacionAnimal(
  datos: DatosReactivacionAnimal,
): ResultadoAnimal<{ readonly ok: true }> {
  const codigo = datos.codigo.trim()
  const existeCodigoActivo = datos.existentesActivos.some(
    (animal) =>
      animal.fincaId === datos.fincaId &&
      animal.codigo.trim().toLowerCase() === codigo.toLowerCase(),
  )

  if (existeCodigoActivo) {
    return {
      valido: false,
      errores: [error("codigo", "CA-DEL-009", "El código ya fue reutilizado en un animal activo.")],
    }
  }

  return { valido: true, valor: { ok: true }, reglas: ["CA-DEL-009"] }
}

export function calcularEditabilidadCodigoAnimal(
  referencias: ResumenReferenciasAnimal,
): DecisionEditabilidadCodigoAnimal {
  const totalReferencias = referencias.eventCount + referencias.offspringCount
  if (referencias.blocksCodeChange || totalReferencias > 0) {
    return { editable: false, regla: "CA-UPD-001", referencias: totalReferencias }
  }
  return { editable: true, reglas: ["CA-UPD-001"] }
}

export function calcularDecisionEliminarAnimal(
  datos: DatosDecisionEliminarAnimal,
): DecisionEliminarAnimal {
  const eventos = datos.referencias.eventCount + datos.referencias.offspringCount
  if (eventos > 0) return { tipo: "inactivado", eventos }
  if (!datos.online) return { tipo: "inactivado", eventos: 0 }
  if (tienePermiso(datos.permisos, "eliminar")) return { tipo: "eliminado", via: "permiso" }

  const edadHoras = (datos.ahora.getTime() - datos.creadoEn.getTime()) / 3_600_000
  if (
    tienePermiso(datos.permisos, "crear") &&
    datos.usuarioId === datos.usuarioCreadoPor &&
    edadHoras >= 0 &&
    edadHoras < HORAS_AUTOSERVICIO_ELIMINACION
  ) {
    return { tipo: "eliminado", via: "autoservicio" }
  }
  return { tipo: "denegado", razon: "Sin permiso para eliminación física ni autoservicio." }
}

export function validarLimiteImagenesAnimal(
  cantidadActivas: number,
):
  | { readonly valido: true }
  | { readonly valido: false; readonly regla: "CA-IMG-001"; readonly limite: 5 } {
  return cantidadActivas < MAX_IMAGENES_ACTIVAS
    ? { valido: true }
    : { valido: false, regla: "CA-IMG-001", limite: MAX_IMAGENES_ACTIVAS }
}

export function validarTipoArchivoImagenAnimal(mimeType: string):
  | { readonly valido: true; readonly regla: "CA-IMG-002" }
  | {
      readonly valido: false
      readonly regla: "CA-IMG-002"
      readonly permitidos: readonly TipoMimeImagenAnimal[]
    } {
  return (TIPOS_IMAGEN_PERMITIDOS as readonly string[]).includes(mimeType)
    ? { valido: true, regla: "CA-IMG-002" }
    : { valido: false, regla: "CA-IMG-002", permitidos: TIPOS_IMAGEN_PERMITIDOS }
}

export function validarPrincipalImagenAnimal(
  imagenes: readonly ImagenAnimalLink[],
):
  | { readonly valido: true; readonly reglas: readonly ["CA-IMG-003", "CA-IMG-004"] }
  | { readonly valido: false; readonly errores: readonly ErrorValidacionAnimal[] } {
  const activas = imagenes.filter((imagen) => imagen.activa)
  const principalesActivas = activas.filter((imagen) => imagen.esPrincipal)
  const errores: ErrorValidacionAnimal[] = []

  if (activas.length > 0 && principalesActivas.length === 0) {
    errores.push(error("es_principal", "CA-IMG-003", "Debe existir una imagen principal activa."))
  }
  if (principalesActivas.length > 1) {
    errores.push(error("es_principal", "CA-IMG-004", "Sólo una imagen activa puede ser principal."))
  }

  return errores.length > 0
    ? { valido: false, errores }
    : { valido: true, reglas: ["CA-IMG-003", "CA-IMG-004"] }
}

export function seleccionarCandidatoPrincipalImagenAnimalAlDesvincular(
  imagenes: readonly ImagenAnimalLink[],
  imagenId: string,
): { readonly candidatoId: string | null; readonly regla: "CA-IMG-005" } {
  const imagenDesvinculada = imagenes.find((imagen) => imagen.id === imagenId)
  if (!imagenDesvinculada?.esPrincipal) return { candidatoId: null, regla: "CA-IMG-005" }

  const candidato = imagenes.find((imagen) => imagen.id !== imagenId && imagen.activa)
  return { candidatoId: candidato?.id ?? null, regla: "CA-IMG-005" }
}

export function validarPurgadoImagenAnimal(datos: {
  readonly activa: boolean
  readonly desvinculadaEn: Date | null
  readonly ahora: Date
  readonly tieneVinculosActivos: boolean
}):
  | { readonly valido: true; readonly reglas: readonly ["CA-IMG-006", "CA-IMG-007"] }
  | { readonly valido: false; readonly errores: readonly ErrorValidacionAnimal[] } {
  const errores: ErrorValidacionAnimal[] = []
  const diasDesvinculada = datos.desvinculadaEn
    ? (datos.ahora.getTime() - datos.desvinculadaEn.getTime()) / 86_400_000
    : 0

  if (datos.activa || datos.tieneVinculosActivos) {
    errores.push(error("imagen", "CA-IMG-006", "La imagen tiene vínculos activos."))
  }
  if (!datos.desvinculadaEn || diasDesvinculada < DIAS_PURGA_IMAGEN_DESVINCULADA) {
    errores.push(
      error("desvinculada_en", "CA-IMG-007", "La purga requiere 30 días sin vínculos activos."),
    )
  }

  return errores.length > 0
    ? { valido: false, errores }
    : { valido: true, reglas: ["CA-IMG-006", "CA-IMG-007"] }
}

export function marcarImagenPrincipal(
  imagenes: readonly ImagenAnimalLink[],
  imagenId: string,
): readonly ImagenAnimalLink[] {
  return imagenes.map((imagen) => ({
    ...imagen,
    esPrincipal: imagen.activa && imagen.id === imagenId,
  }))
}

export function validarFichaTimeline(items: readonly unknown[]): {
  readonly pageSize: 20
  readonly hasNextPage: boolean
} {
  return { pageSize: 20, hasNextPage: items.length > 20 }
}

export function crearEstadoBannerFichaAnimal(animal: {
  readonly activo: boolean
  readonly estadoActual?: EstadoAnimal
}): EstadoBannerFichaAnimal {
  if (!animal.activo) return { tipo: "inactivo", bloqueaAccionesEventos: true }
  if (animal.estadoActual === "vendido") return { tipo: "vendido", bloqueaAccionesEventos: true }
  if (animal.estadoActual === "muerto") return { tipo: "muerto", bloqueaAccionesEventos: true }
  return null
}
