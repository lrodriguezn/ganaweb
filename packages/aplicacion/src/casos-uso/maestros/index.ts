/**
 * Casos de uso de Configuración · Maestros (issue #147,
 * RF-CONFIG-MAESTROS v1.0).
 *
 * Casos puros de la capa de aplicación: reciben puertos, no hacen I/O
 * directa y devuelven uniones serializables discriminadas por `tipo`
 * (CM-042), sin excepciones.
 *
 * NO verifican permisos: la re-validación RBAC (PE-002,
 * configuracion:crear/editar/inactivar) la añadirá la capa de funciones
 * de servidor (issue #148).
 */

export * from "./resultados.js"
export * from "./crear-maestro.js"
export * from "./editar-maestro.js"
export * from "./cambiar-estado-maestro.js"
export * from "./editar-finca.js"
