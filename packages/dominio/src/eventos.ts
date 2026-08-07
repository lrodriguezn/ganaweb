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
