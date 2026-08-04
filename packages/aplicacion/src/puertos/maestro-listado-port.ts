/**
 * Puerto de listado de Configuración · Maestros (issue #148,
 * RF-CONFIG-MAESTROS v1.0, CM-034/CM-040).
 *
 * Contrato type-only de la capa de aplicación (D6): los adaptadores
 * Drizzle viven en `packages/db`. La búsqueda es case-insensitive y se
 * resuelve en el servidor (ILIKE), el orden es nombre asc con segunda
 * ordenación estable por id, y la paginación devuelve el total de filas
 * que coinciden con el filtro para poder calcular páginas.
 *
 * Nombres en español (T-003).
 */

import type { FamiliaMaestro } from "@ganaweb/dominio"

export type { FamiliaMaestro }

/** Fila genérica serializable del listado de un maestro. */
export type MaestroFila = Readonly<Record<string, string | number | null>> & {
  readonly id: string
  readonly nombre: string
  /** 0/1 (convención del esquema). */
  readonly activo: number
}

export interface MaestroListadoOpciones {
  readonly busqueda?: string
  readonly incluirInactivos?: boolean
  /** 1-based, default 1. */
  readonly pagina?: number
  /** Default 25. */
  readonly pageSize?: 25 | 50 | 100
}

export interface MaestroListadoResultado {
  readonly filas: readonly MaestroFila[]
  /** Total de filas que coinciden con el filtro (para paginar). */
  readonly total: number
  readonly pagina: number
  readonly pageSize: number
}

export interface MaestroListadoPort {
  /**
   * CM-034: búsqueda case-insensitive sobre nombre (+ codigo en
   * potreros/sectores, + numero_documento en propietarios), orden
   * nombre asc, filtro activo=1 salvo incluirInactivos.
   * Para "inseminadores" lista veterinarios con es_inseminador=1 (CM-040).
   */
  listar(
    maestro: FamiliaMaestro | "inseminadores",
    fincaId: string,
    opciones?: MaestroListadoOpciones,
  ): Promise<MaestroListadoResultado>
}
