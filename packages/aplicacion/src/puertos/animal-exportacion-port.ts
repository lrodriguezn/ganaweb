/**
 * Puerto de exportación del listado de animales (LA-070/071/072).
 *
 * Capa de aplicación — format-free: devuelve las filas del listado
 * completo filtrado, NO tipos de exceljs/pdfkit. Los generadores por
 * formato (XLSX/CSV/PDF) viven en `apps/web/src/server/exportadores/`
 * (PR2), de modo que ninguna dependencia de formato entra en
 * `aplicacion` (regla de capa: aplicacion format-free).
 *
 * Reutiliza los tipos canónicos del listado (`AnimalListadoReadFilter`,
 * `AnimalListadoRow`) para garantizar que la exportación aplica los
 * mismos filtros y orden que el endpoint de listado (LA-071).
 *
 * Contrato de errores:
 *   - `AnimalExportacionOverflowError` — el conjunto filtrado supera
 *     `maxFilas` (LA-072); el handler lo mapea a HTTP 413 (PR3).
 *   - La denegación RBAC reutiliza `AnimalListadoForbiddenError`
 *     (definida en la capa db, fail-closed) — LA-RBAC-04/05.
 */

import type { AnimalListadoReadFilter, AnimalListadoRow } from "./animal-listado-port.js"

// Re-exported from dominio for backward compatibility (issue #134).
export { AnimalExportacionOverflowError } from "@ganaweb/dominio"

export interface AnimalExportacionRequest {
  readonly usuarioId: string
  readonly fincaId: string
  readonly sort: `${string}:${"asc" | "desc"}`
  readonly q: string | null
  readonly filters: readonly AnimalListadoReadFilter[]
  /** columnIds efectivos en orden canónico (resueltos por el handler). */
  readonly columnas: readonly string[]
  /** Límite resuelto desde config_parametros_finca; la lectura usa LIMIT n+1. */
  readonly maxFilas: number
}

export interface AnimalExportacionReadPort {
  exportar(request: AnimalExportacionRequest): Promise<readonly AnimalListadoRow[]>
}
