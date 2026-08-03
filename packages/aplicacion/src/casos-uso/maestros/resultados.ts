/**
 * Uniones de resultado serializables (CM-042) de los casos de uso de
 * Configuración · Maestros: discriminadas por `tipo`, sin excepciones,
 * aptas para cruzar el boundary HTTP sin transformación.
 */

import type { ErrorValidacionMaestro } from "@ganaweb/dominio"

export type { ErrorValidacionMaestro }

export type ResultadoCrearMaestro =
  | { readonly tipo: "creado"; readonly id: string }
  | { readonly tipo: "validacion"; readonly errores: readonly ErrorValidacionMaestro[] }
  | { readonly tipo: "conflicto"; readonly campo: string }
  | { readonly tipo: "error"; readonly detalle: string }

export type ResultadoEditarMaestro =
  | { readonly tipo: "actualizado" }
  | { readonly tipo: "validacion"; readonly errores: readonly ErrorValidacionMaestro[] }
  | { readonly tipo: "no_encontrado" }
  | { readonly tipo: "conflicto"; readonly campo: string }
  | { readonly tipo: "error"; readonly detalle: string }

export type ResultadoCambiarEstadoMaestro =
  | { readonly tipo: "estado_actualizado"; readonly activo: boolean }
  | { readonly tipo: "no_encontrado" }
  | { readonly tipo: "error"; readonly detalle: string }

export type ResultadoEditarFinca =
  | { readonly tipo: "actualizado" }
  | { readonly tipo: "validacion"; readonly errores: readonly ErrorValidacionMaestro[] }
  | { readonly tipo: "no_encontrado" }
  | { readonly tipo: "error"; readonly detalle: string }
