export const ORIGENES_SELECCION_EVENTO = ["manual", "lote", "potrero", "grupo"] as const

export type OrigenSeleccionEvento = (typeof ORIGENES_SELECCION_EVENTO)[number]
export type DominioEvento = "reproductivo" | "productivo" | "sanidad" | "movimientos"
export type AccionEvento = "ver" | "crear" | "editar" | "anular"

export const EVENTOS_CANONICOS = {
  servicio: { tabla: "servicios", dominio: "reproductivo", tipoGrupal: "servicio" },
  palpacion: { tabla: "palpaciones", dominio: "reproductivo", tipoGrupal: "palpacion" },
  parto: { tabla: "partos", dominio: "reproductivo", tipoGrupal: "parto" },
  aplicacion_sanitaria: {
    tabla: "aplicaciones_sanitarias",
    dominio: "sanidad",
    tipoGrupal: "tratamiento",
  },
  revision_veterinaria: {
    tabla: "revisiones_veterinarias",
    dominio: "sanidad",
    tipoGrupal: "revision_veterinaria",
  },
  pesaje: { tabla: "pesos", dominio: "productivo", tipoGrupal: "pesaje" },
  produccion_lactea: {
    tabla: "producciones_lacteas",
    dominio: "productivo",
    tipoGrupal: "produccion_lactea",
  },
  condicion_corporal: {
    tabla: "animales_condicion_corporal",
    dominio: "productivo",
    tipoGrupal: "condicion_corporal",
  },
  venta: { tabla: "ventas", dominio: "movimientos", tipoGrupal: "venta" },
  muerte: { tabla: "muertes", dominio: "movimientos", tipoGrupal: "muerte" },
  traslado: {
    tabla: "animales_ubicacion_historico",
    dominio: "movimientos",
    tipoGrupal: "traslado",
  },
} as const satisfies Record<
  string,
  { readonly tabla: string; readonly dominio: DominioEvento; readonly tipoGrupal: string }
>

export type TipoEventoCanonico = keyof typeof EVENTOS_CANONICOS
export type ValorEventoPersistible = string | number | boolean | Date | null

interface ComandoEventoBase {
  readonly id: string
  readonly fincaId: string
  readonly usuarioId: string
  readonly evento: TipoEventoCanonico
}

export interface CrearEventoIndividualCommand extends ComandoEventoBase {
  readonly tipo: "crear_evento_individual"
  readonly animalId: string
  readonly corrigeAId?: string | null
  readonly datos: Readonly<Record<string, ValorEventoPersistible>>
}

export interface CrearHijoEventoGrupalCommand extends ComandoEventoBase {
  readonly tipo: "crear_hijo_grupal"
  readonly animalId: string
  readonly registroGrupalId: string
  readonly datos: Readonly<Record<string, ValorEventoPersistible>>
}

export type CriterioRegistroGrupal =
  | { readonly origen: "manual" }
  | { readonly origen: "lote"; readonly loteId: string }
  | { readonly origen: "potrero"; readonly potreroId: string }
  | { readonly origen: "grupo"; readonly grupoId: string }

export interface CrearRegistroGrupalCommand extends ComandoEventoBase {
  readonly tipo: "crear_registro_grupal"
  readonly totalAnimales: number
  readonly criterio: CriterioRegistroGrupal
  readonly descripcion?: string | null
  readonly fecha?: Date
  readonly corrigeAId?: string | null
}

export type EventoWriteCommand =
  | CrearEventoIndividualCommand
  | CrearHijoEventoGrupalCommand
  | CrearRegistroGrupalCommand

export class EventoForbiddenError extends Error {
  readonly status = 403

  constructor(
    readonly motivo: "finca_no_autorizada" | "permiso_denegado" | "alcance_invalido",
    readonly permiso?: string,
  ) {
    super("Evento operation forbidden")
    this.name = "EventoForbiddenError"
  }
}

export class EventoCommandInvalidError extends Error {
  constructor(readonly campo: string) {
    super(`Invalid event command field: ${campo}`)
    this.name = "EventoCommandInvalidError"
  }
}

export const PERMISOS_EVENTOS_POR_DOMINIO = {
  reproductivo: {
    modulo: "eventos_reproductivos",
    acciones: ["ver", "crear", "editar", "anular"],
  },
  productivo: {
    modulo: "eventos_productivos",
    acciones: ["ver", "crear", "editar", "anular"],
  },
  sanidad: { modulo: "sanidad", acciones: ["ver", "crear", "editar", "anular"] },
  movimientos: { modulo: "movimientos", acciones: ["ver", "crear", "anular"] },
} as const satisfies Record<
  DominioEvento,
  { readonly modulo: string; readonly acciones: readonly AccionEvento[] }
>

/**
 * Issue #227 — permisos de LECTURA por dominio (sin crear `eventos:*`).
 * Espejo del mapa de arriba, reducido a la acción `ver`; usado por el
 * read model de finca para filtrar ramas antes de que toquen la DB
 * (RBAC fail-closed: una sesion sin `ver` sobre un dominio nunca ve
 * sus eventos).
 */
export type PermisoVerDominio = "reproductivo" | "productivo" | "sanidad" | "movimientos"

export const PERMISOS_VER_POR_DOMINIO: Readonly<Record<PermisoVerDominio, string>> = {
  reproductivo: "eventos_reproductivos:ver",
  productivo: "eventos_productivos:ver",
  sanidad: "sanidad:ver",
  movimientos: "movimientos:ver",
}

/**
 * Issue #227 — catálogo de tipos canónicos por dominio (subset del
 * `EVENTOS_CANONICOS`). Se usa para validar el filtro de tipo en el
 * read model: un tipo solo es válido si pertenece a un dominio que
 * la sesion tiene autorizado para ver.
 */
export const TIPOS_POR_DOMINIO: Readonly<Record<PermisoVerDominio, readonly string[]>> = {
  reproductivo: ["servicio", "palpacion", "parto"],
  productivo: ["pesaje", "produccion_lactea", "condicion_corporal"],
  sanidad: ["aplicacion_sanitaria", "revision_veterinaria"],
  movimientos: ["venta", "muerte", "traslado"],
}

export function permisoEvento(dominio: DominioEvento, accion: AccionEvento): string | null {
  const contrato = PERMISOS_EVENTOS_POR_DOMINIO[dominio]
  return contrato.acciones.includes(accion as never) ? `${contrato.modulo}:${accion}` : null
}

export function validarCriterioSeleccionGrupal(input: {
  readonly origen: OrigenSeleccionEvento
  readonly loteId?: string | null
  readonly potreroId?: string | null
  readonly grupoId?: string | null
}): boolean {
  const criterios = {
    lote: input.loteId,
    potrero: input.potreroId,
    grupo: input.grupoId,
  }
  const presentes = Object.values(criterios).filter(Boolean).length
  if (input.origen === "manual") return presentes === 0
  return presentes === 1 && Boolean(criterios[input.origen])
}

export function validarAlcanceFincaEvento(input: {
  readonly fincaActivaId: string
  readonly fincaAnimalId?: string | null
  readonly fincaRegistroGrupalId?: string | null
}): boolean {
  if (input.fincaAnimalId && input.fincaAnimalId !== input.fincaActivaId) return false
  if (input.fincaRegistroGrupalId && input.fincaRegistroGrupalId !== input.fincaActivaId)
    return false
  return Boolean(input.fincaAnimalId || input.fincaRegistroGrupalId)
}

export function validarAuditoriaAnulacion(input: {
  readonly motivo: string
  readonly actorId: string
  readonly fecha: Date | null
}): boolean {
  return input.motivo.trim().length > 0 && input.actorId.trim().length > 0 && input.fecha !== null
}

/* =====================================================================
 * Issue #227 — Read model de finca (EV-UI-002..005, EV-INT-001)
 * El read model unificado reutiliza el UNION del timeline y la
 * exclusion de registros grupales anulados. La capa de dominio aporta
 * la validacion RBAC y de filtros; la composicion SQL vive en
 * `packages/db` (infraestructura).
 * ===================================================================== */

export type CategoriaFiltroFinca = "todos" | PermisoVerDominio

export interface FiltroEventosFinca {
  /**
   * Dominio canónico. `null`/`undefined` ≡ "todos los dominios
   * autorizados" (el caso de uso expande a la lista de dominios que
   * la sesion tiene permiso de ver).
   */
  readonly categoria?: CategoriaFiltroFinca
  /**
   * Tipo canónico opcional; restringe la lista al tipo dentro del
   * dominio seleccionado. Si pertenece a otro dominio, se rechaza.
   */
  readonly tipo?: string
  /** Inclusivo (YYYY-MM-DD). Opcional. */
  readonly fechaDesde?: string
  /** Inclusivo (YYYY-MM-DD). Opcional. */
  readonly fechaHasta?: string
  /**
   * Límite de página. Acotado a 20 (historial) o 50 (feed) por
   * contrato. El adaptador falla-closed si excede el techo.
   */
  readonly pageSize: 20 | 50
}

export const PAGE_SIZE_FEED_FINCA = 20 as const
export const PAGE_SIZE_HISTORIAL_FINCA = 50 as const

export class EventoReadInvalidError extends Error {
  readonly status = 400
  constructor(readonly campo: string) {
    super(`Invalid eventos read filter field: ${campo}`)
    this.name = "EventoReadInvalidError"
  }
}

export class EventoReadForbiddenError extends Error {
  readonly status = 403
  constructor(
    readonly motivo: "finca_no_autorizada" | "permiso_denegado" | "alcance_invalido",
    readonly permiso?: string,
  ) {
    super("Eventos read forbidden")
    this.name = "EventoReadForbiddenError"
  }
}

const FORMATO_FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/

function fechaIsoValida(fecha: string): boolean {
  if (!FORMATO_FECHA_ISO.test(fecha)) return false
  const parsed = new Date(`${fecha}T00:00:00.000Z`).getTime()
  return !Number.isNaN(parsed)
}

/**
 * RBAC server-side: dada la sesion, devuelve SOLO los dominios que la
 * sesion puede ver. Si la sesion no tiene `ver` para ningun dominio
 * del mapa, devuelve `[]` (el read model no expone nada — fail-closed).
 * El permiso `*`/`*` (admin de sistema) ve todos los dominios.
 */
export function dominiosAutorizadosParaSesion(
  permisos: readonly { readonly modulo: string; readonly accion: string }[],
): readonly PermisoVerDominio[] {
  const autorizado: PermisoVerDominio[] = []
  for (const dominio of Object.keys(PERMISOS_VER_POR_DOMINIO) as PermisoVerDominio[]) {
    const permisoEsperado = PERMISOS_VER_POR_DOMINIO[dominio]
    const tiene = permisos.some(
      (permiso) =>
        (permiso.modulo === permisoEsperado.split(":")[0] &&
          permiso.accion === permisoEsperado.split(":")[1]) ||
        (permiso.modulo === "*" && permiso.accion === "*"),
    )
    if (tiene) autorizado.push(dominio)
  }
  return autorizado
}

/**
 * Verifica que la sesion pueda leer los eventos de la finca solicitada.
 * - La sesion debe tener `fincaActivaId === fincaSolicitadaId`.
 * - La sesion debe tener al menos un permiso de lectura por dominio.
 * - Lanza `EventoReadForbiddenError` con motivo explícito (la web lo
 *   mapea a 403 sin filtrar informacion del sistema de permisos).
 */
export function validarAlcanceFincaRead(input: {
  readonly sesionFincaActivaId: string
  readonly fincaSolicitadaId: string
  readonly dominiosAutorizados: readonly PermisoVerDominio[]
}): void {
  if (input.sesionFincaActivaId !== input.fincaSolicitadaId) {
    throw new EventoReadForbiddenError("finca_no_autorizada")
  }
  if (input.dominiosAutorizados.length === 0) {
    throw new EventoReadForbiddenError("permiso_denegado", "eventos:ver")
  }
}

/**
 * Valida el filtro normalizado del read model. Devuelve la lista de
 * dominios que la query debe evaluar (tras aplicar la categoria, si
 * viene) cruzandola con los dominios que la sesion tiene autorizados.
 * Lanza `EventoReadInvalidError` si el filtro es inconsistente.
 */
export function normalizarFiltroEventosFinca(input: {
  readonly filtro: FiltroEventosFinca
  readonly dominiosAutorizados: readonly PermisoVerDominio[]
}): readonly PermisoVerDominio[] {
  const { filtro, dominiosAutorizados } = input
  const setAutorizados = new Set<PermisoVerDominio>(dominiosAutorizados)
  const candidatos =
    !filtro.categoria || filtro.categoria === "todos"
      ? (Object.keys(PERMISOS_VER_POR_DOMINIO) as PermisoVerDominio[])
      : [filtro.categoria]
  if (filtro.tipo) {
    const tipoEncontrado = (Object.keys(TIPOS_POR_DOMINIO) as PermisoVerDominio[]).find((dominio) =>
      TIPOS_POR_DOMINIO[dominio].includes(filtro.tipo as string),
    )
    if (!tipoEncontrado) {
      throw new EventoReadInvalidError("tipo")
    }
    if (filtro.categoria && filtro.categoria !== "todos" && filtro.categoria !== tipoEncontrado) {
      throw new EventoReadInvalidError("tipo")
    }
  }
  if (filtro.fechaDesde && !fechaIsoValida(filtro.fechaDesde)) {
    throw new EventoReadInvalidError("fechaDesde")
  }
  if (filtro.fechaHasta && !fechaIsoValida(filtro.fechaHasta)) {
    throw new EventoReadInvalidError("fechaHasta")
  }
  if (
    filtro.fechaDesde &&
    filtro.fechaHasta &&
    filtro.fechaDesde.localeCompare(filtro.fechaHasta) > 0
  ) {
    throw new EventoReadInvalidError("fechaDesde")
  }
  const filtrados = candidatos.filter((dominio) => setAutorizados.has(dominio))
  if (filtrados.length === 0) {
    throw new EventoReadForbiddenError("permiso_denegado", "eventos:ver")
  }
  return filtrados
}
