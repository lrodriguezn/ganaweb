import type { AuthUseCaseDeps } from "../../puertos/auth-repository-port.js"

export type AutorizarUsuarioFincaInput = Readonly<{
  actorUsuarioId: string
  usuarioId: string
  fincaId: string
}>

export type AutorizarUsuarioFincaResult = Readonly<{ tipo: "autorizado" | "no_autorizado" }>

function puedeAprobar(permisos: readonly { modulo: string; accion: string }[]) {
  return permisos.some(
    (permiso) =>
      (permiso.modulo === "usuarios" && permiso.accion === "aprobar") ||
      (permiso.modulo === "configuracion" && permiso.accion === "administrar") ||
      (permiso.modulo === "*" && permiso.accion === "*"),
  )
}

export function autorizarUsuarioFinca(deps: AuthUseCaseDeps) {
  return async (input: AutorizarUsuarioFincaInput): Promise<AutorizarUsuarioFincaResult> => {
    const actor = await deps.repo.obtenerAutorizacionUsuario(input.actorUsuarioId, input.fincaId)
    if (
      actor.tipo !== "autorizado" ||
      actor.sesion.fincaActivaId !== input.fincaId ||
      !puedeAprobar(actor.sesion.permisos)
    ) {
      return { tipo: "no_autorizado" }
    }

    await deps.repo.autorizarUsuarioFinca(input)
    return { tipo: "autorizado" }
  }
}
