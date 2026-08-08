import {
  EVENTOS_CANONICOS,
  EventoCommandInvalidError,
  EventoForbiddenError,
  permisoEvento,
} from "@ganaweb/dominio"
import type { AnularEventoCommand, EventoWriteCommand, SesionAutorizada } from "@ganaweb/dominio"

export {
  EVENTOS_CANONICOS,
  EventoCommandInvalidError,
  EventoForbiddenError,
} from "@ganaweb/dominio"
export type {
  AnularEventoCommand,
  CriterioRegistroGrupal,
  CrearEventoIndividualCommand,
  CrearHijoEventoGrupalCommand,
  CrearRegistroGrupalCommand,
  EventoWriteCommand,
  TipoEventoCanonico,
  ValorEventoPersistible,
} from "@ganaweb/dominio"

export interface EventoWriteGateway {
  persistir(command: EventoWriteCommand): Promise<{ readonly id: string }>
  anular(command: AnularEventoCommand): Promise<void>
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

export function anularEvento(gateway: EventoWriteGateway) {
  return async (input: {
    readonly sesion: SesionAutorizada
    readonly command: AnularEventoCommand
  }): Promise<void> => {
    if (
      input.sesion.fincaActivaId !== input.command.fincaId ||
      input.sesion.usuarioId !== input.command.usuarioId
    ) {
      throw new EventoForbiddenError("finca_no_autorizada")
    }
    const dominio = EVENTOS_CANONICOS[input.command.evento].dominio
    const permiso = permisoEvento(dominio, "anular")
    if (
      permiso === null ||
      !input.sesion.permisos.some((actual) => `${actual.modulo}:${actual.accion}` === permiso)
    ) {
      throw new EventoForbiddenError("permiso_denegado", permiso ?? undefined)
    }
    if (input.command.motivo.trim() === "") {
      throw new EventoCommandInvalidError("motivo")
    }
    return gateway.anular(input.command)
  }
}
