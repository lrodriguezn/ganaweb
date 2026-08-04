/**
 * Gate UI de Configuración · Maestros (issue #149, CM-002/CM-021).
 *
 * Módulo isomorfo: usa los helpers RBAC de `@ganaweb/ui` sobre los permisos
 * de la sesión autorizada. Es una regla de presentación (LA-RBAC-05): la
 * autorización de fondo sigue siendo la del harness de servidor
 * (`configuracion-actions.server.ts`, PE-002).
 */

import { type Permiso, crearPermisos, tienePermiso } from "@ganaweb/ui"

/** CM-021: sin `configuracion:ver` no se renderizan entradas ni rutas. */
export function puedeVerConfiguracion(permisos: readonly Permiso[]): boolean {
  return tienePermiso(crearPermisos([...permisos]), "configuracion", "ver")
}

/** CM-022: botones de escritura gateados (la re-validación real es del servidor). */
export function puedeCrearConfiguracion(permisos: readonly Permiso[]): boolean {
  return tienePermiso(crearPermisos([...permisos]), "configuracion", "crear")
}

/** CM-050 (issue #151): sin configuracion:editar el predio es solo lectura. */
export function puedeEditarConfiguracion(permisos: readonly Permiso[]): boolean {
  return tienePermiso(crearPermisos([...permisos]), "configuracion", "editar")
}

export function puedeInactivarConfiguracion(permisos: readonly Permiso[]): boolean {
  return tienePermiso(crearPermisos([...permisos]), "configuracion", "inactivar")
}
