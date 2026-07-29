/**
 * Visual-only permission projection for the #108 desktop animal list (PR 1).
 *
 * Resolves the current session for the requested finca through the existing
 * auth use case (`obtenerSesionActual(getAuthDeps())(readSessionToken(),
 * fincaId)`) and projects two presentation flags:
 *   - canCreate → `animales:crear` (LA-RBAC-02, gates `Nuevo animal`)
 *   - canExport → `animales:ver` AND `reportes:exportar` (LA-RBAC-03, gates
 *     `Exportar`; #111 must enforce export independently on the server)
 * A global `*:*` permission grants both.
 *
 * FAIL CLOSED: hiding actions is a presentation rule (LA-RBAC-05) — this
 * projection never authorizes a request. Any denial (`no_autenticado`,
 * `pendiente`, another active finca) or failure (thrown error) resolves both
 * flags `false` and never produces a false 403. Server authorization (#107
 * for listing, create enforcement, future export) remains authoritative.
 *
 * Gate: epic #106 approved + #107 delivered before PR 1. #107 carries no
 * permission payload, which is why this read-only projection exists; #107,
 * the legacy mobile branch, and #109–#111 behavior remain untouched.
 */
import type { DecisionAutorizacion, PermisoUsuario } from "@ganaweb/aplicacion"
import type { AnimalListadoVisualPermissions } from "../features/animal-listado/animal-listado-route-adapter.js"

export const PERMISOS_VISUALES_LISTADO_DENEGADOS: AnimalListadoVisualPermissions = Object.freeze({
  canCreate: false,
  canExport: false,
})

function tienePermiso(
  permisos: readonly PermisoUsuario[],
  modulo: string,
  accion: string,
): boolean {
  return permisos.some(
    (permiso) =>
      (permiso.modulo === modulo && permiso.accion === accion) ||
      (permiso.modulo === "*" && permiso.accion === "*"),
  )
}

/**
 * Pure projection from an authorization decision to visual flags. Denial or a
 * session authorized for another finca fails closed (both flags false).
 */
export function proyectarPermisosVisualesListado(
  decision: DecisionAutorizacion,
  fincaId: string,
): AnimalListadoVisualPermissions {
  if (decision.tipo !== "autorizado") return PERMISOS_VISUALES_LISTADO_DENEGADOS
  const sesion = decision.sesion
  if (sesion.fincaActivaId !== fincaId) return PERMISOS_VISUALES_LISTADO_DENEGADOS
  return Object.freeze({
    canCreate: tienePermiso(sesion.permisos, "animales", "crear"),
    canExport:
      tienePermiso(sesion.permisos, "animales", "ver") &&
      tienePermiso(sesion.permisos, "reportes", "exportar"),
  })
}

/**
 * Read-only server-side resolver used by `getAnimalListadoVisualPermissionsAction`.
 * Any failure (missing request context, repository error, unexpected throw)
 * fails closed — both flags false — without surfacing a false 403.
 */
export async function resolverPermisosVisualesListado(
  fincaId: string,
): Promise<AnimalListadoVisualPermissions> {
  try {
    const { getAuthDeps } = await import("./auth-deps.server.js")
    const { readSessionToken } = await import("./session-cookie.server.js")
    const { obtenerSesionActual } = await import("@ganaweb/aplicacion")
    const decision = await obtenerSesionActual(getAuthDeps())(readSessionToken(), fincaId)
    return proyectarPermisosVisualesListado(decision, fincaId)
  } catch {
    return PERMISOS_VISUALES_LISTADO_DENEGADOS
  }
}
