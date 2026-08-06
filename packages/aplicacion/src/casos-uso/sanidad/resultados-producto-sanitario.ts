/**
 * Uniones de resultado serializables (CM-042) de los casos de uso del
 * catálogo de productos sanitarios (Issue #209): discriminadas por `tipo`,
 * sin excepciones, aptas para cruzar el boundary HTTP sin transformación.
 */

import type { ErrorValidacionSanidad, EstadoStockSanidad } from "@ganaweb/dominio"
import type { FilaProductoSanitarioListado } from "../../puertos/catalogo-producto-sanitario-port.js"

export type { ErrorValidacionSanidad }

export type ResultadoCrearProductoSanitario =
  | { readonly tipo: "creado"; readonly id: string }
  | { readonly tipo: "validacion"; readonly errores: readonly ErrorValidacionSanidad[] }
  | { readonly tipo: "conflicto"; readonly campo: string }
  | { readonly tipo: "error"; readonly detalle: string }

export type ResultadoEditarProductoSanitario =
  | { readonly tipo: "actualizado" }
  | { readonly tipo: "validacion"; readonly errores: readonly ErrorValidacionSanidad[] }
  | { readonly tipo: "no_encontrado" }
  | { readonly tipo: "conflicto"; readonly campo: string }
  | { readonly tipo: "error"; readonly detalle: string }

export type ResultadoCambiarEstadoProductoSanitario =
  | { readonly tipo: "estado_actualizado"; readonly activo: boolean }
  | { readonly tipo: "no_encontrado" }
  | { readonly tipo: "error"; readonly detalle: string }

/**
 * Fila del catálogo enriquecida con el semáforo KPI-10 (SAN-022): el estado
 * se calcula en el caso de uso con el umbral efectivo de la finca.
 */
export type FilaCatalogoProductoSanitario = FilaProductoSanitarioListado & {
  readonly estadoStock: EstadoStockSanidad
}

export type ResultadoListarCatalogoProductoSanitario =
  | {
      readonly tipo: "catalogo"
      readonly filas: readonly FilaCatalogoProductoSanitario[]
      /** Umbral efectivo usado en el semáforo (T-001: del puerto o fallback). */
      readonly stockMinimoDosis: number
    }
  | { readonly tipo: "error"; readonly detalle: string }
