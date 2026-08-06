import { permisoEvento } from "@ganaweb/dominio"
import type { DominioEvento, SesionAutorizada } from "@ganaweb/dominio"

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

export interface EventoWriteGateway {
  persistir(command: EventoWriteCommand): Promise<{ readonly id: string }>
}

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

export function registrarEvento(gateway: EventoWriteGateway) {
  return async (input: {
    readonly sesion: SesionAutorizada
    readonly command: EventoWriteCommand
  }): Promise<{ readonly id: string }> => {
    if (
      input.sesion.fincaActivaId !== input.command.fincaId ||
      input.sesion.usuarioId !== input.command.usuarioId
    ) {
      throw new EventoForbiddenError("finca_no_autorizada")
    }
    const permiso = permisoEvento(EVENTOS_CANONICOS[input.command.evento].dominio, "crear")
    if (
      permiso === null ||
      !input.sesion.permisos.some((actual) => `${actual.modulo}:${actual.accion}` === permiso)
    ) {
      throw new EventoForbiddenError("permiso_denegado", permiso ?? undefined)
    }
    return gateway.persistir(input.command)
  }
}
