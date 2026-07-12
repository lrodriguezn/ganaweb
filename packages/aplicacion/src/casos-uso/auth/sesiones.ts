import type { AuthUseCaseDeps } from "../../puertos/auth-repository-port.js"

export function cerrarSesion(deps: AuthUseCaseDeps) {
  return async (token: string | null): Promise<{ tipo: "cerrada" }> => {
    if (token) {
      const sesion = await deps.repo.obtenerSesionPorTokenHash(deps.tokens.hashToken(token))
      if (sesion) await deps.repo.revocarSesion(sesion.sesionId)
    }
    return { tipo: "cerrada" }
  }
}

export function obtenerSesionActual(deps: AuthUseCaseDeps) {
  return async (token: string | null, fincaId?: string | null) => {
    if (!token) return { tipo: "no_autenticado" } as const
    const sesion = await deps.repo.obtenerSesionPorTokenHash(deps.tokens.hashToken(token))
    if (!sesion) return { tipo: "no_autenticado" } as const
    return deps.repo.obtenerAutorizacionUsuario(sesion.usuarioId, fincaId)
  }
}
