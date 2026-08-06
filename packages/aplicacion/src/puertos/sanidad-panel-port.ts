/**
 * Puerto del read model del panel de Sanidad (Issue #212, RF-SANIDAD v0.2 §4/§11).
 *
 * Contrato type-only de la capa de aplicación (D6) para las consultas del
 * panel desktop (SAN-001..SAN-006) y el historial de aplicaciones (D-005).
 * El adaptador Drizzle vive en `packages/db`
 * (`sanidad-panel-infrastructure.ts`); las server functions de
 * `apps/web` revalidan sesión/finca/permiso antes de llamarlo (PE-002).
 *
 * Todas las filas son serializables (CM-042): fechas como texto ISO
 * YYYY-MM-DD, números como `number`, sin Date ni BigInt. Nombres en
 * español (T-003).
 *
 * Reglas materializadas por el adaptador:
 * - SAN-002: métricas del panel (aplicaciones de la semana, animales en
 *   tratamiento D-002, stock crítico y agotados KPI-10).
 * - KPI-09/SAN-050: refuerzos pendientes (ventana hoy+30, sin aplicación
 *   posterior del mismo producto, solo animales EN_FINCA, excluidas las
 *   filas de grupos anulados RN-051). La agrupación por semana natural
 *   (SAN-052) la aplica el dominio (`agruparRefuerzosPorSemana`).
 * - SAN-004: últimas 4 aplicaciones registradas.
 * - SAN-005/KPI-10/T-001: alertas de stock con el umbral leído de
 *   `config_parametros_finca` (nunca hardcodeado).
 * - D-005: historial paginado con filtros producto/fecha/animal-lote.
 */

import type { EstadoStockSanidad, RefuerzoPendienteFila } from "@ganaweb/dominio"

export type { RefuerzoPendienteFila }

/** SAN-002: las 4 métricas del panel (contados, nunca filas). */
export type PanelSanidadMetricas = {
  /** Aplicaciones con fecha en la semana natural actual. */
  readonly aplicacionesEstaSemana: number
  /** D-002: animales distintos con tratamiento (≠ vacuna) en 30 días. */
  readonly animalesEnTratamiento: number
  /** KPI-10: productos con stock < umbral `stock_minimo_dosis`. */
  readonly stockCritico: number
  /** KPI-10: productos con stock ≤ 0. */
  readonly productosAgotados: number
}

/** SAN-004: objetivo de una aplicación registrada. */
export type ObjetivoAplicacionSanidad = "animal" | "lote"

/** SAN-004: fila de las últimas aplicaciones registradas. */
export type UltimaAplicacionPanel = {
  readonly id: string
  /** ISO YYYY-MM-DD. */
  readonly fecha: string
  readonly productoCodigo: string
  readonly productoDescripcion: string
  /** animal (registro individual) | lote (registro grupal, RN-052). */
  readonly objetivo: ObjetivoAplicacionSanidad
  /** N animales: 1 en individual; total_animales de la cabecera en lote. */
  readonly cantidadAnimales: number
  /** Nombre del usuario que registró (usuario_creado_por); null si falta. */
  readonly responsable: string | null
}

/** SAN-005/KPI-10: fila de la card de alertas de stock. */
export type AlertaStockPanel = {
  readonly productoId: string
  readonly codigo: string
  readonly descripcion: string
  /** RN-041: stock SIEMPRE calculado (vista `inventario_sanitario`). */
  readonly dosisDisponibles: number
  readonly estado: EstadoStockSanidad
}

/** D-005: filtros del historial de aplicaciones (todos opcionales). */
export type FiltrosHistorialSanidad = {
  readonly productoId?: string | null
  /** ISO YYYY-MM-DD inclusivo. */
  readonly desde?: string | null
  /** ISO YYYY-MM-DD inclusivo. */
  readonly hasta?: string | null
  /** Texto libre que acota por animal o lote (D-005). */
  readonly animalOLote?: string | null
  /** 1-based. */
  readonly pagina: number
  readonly tamanoPagina: number
}

/** D-005: fila del historial de aplicaciones. */
export type FilaHistorialSanidad = {
  readonly id: string
  /** ISO YYYY-MM-DD. */
  readonly fecha: string
  readonly productoCodigo: string
  readonly productoDescripcion: string
  readonly objetivo: ObjetivoAplicacionSanidad
  /** N animales de la operación (1 individual; cabecera en grupal). */
  readonly cantidadAnimales: number
  /** Código del animal cuando el objetivo es individual. */
  readonly animalCodigo: string | null
  /** Identificador del lote/grupo cuando el objetivo es grupal. */
  readonly loteDescripcion: string | null
  readonly dosis: number
  readonly responsable: string | null
}

/** D-005: página del historial (total para paginación). */
export type HistorialSanidadPagina = {
  readonly filas: readonly FilaHistorialSanidad[]
  readonly total: number
  readonly pagina: number
  readonly tamanoPagina: number
}

/**
 * Lecturas del read model del panel (SAN-001..SAN-006, D-005).
 *
 * Todas las lecturas están acotadas a la finca (SAN-063): el adaptador
 * recibe el `fincaId` ya revalidado por la server function contra la
 * sesión activa — jamás de la URL. `hoy` (ISO) lo aporta el reloj del
 * harness para que las ventanas (semana actual, 30 días, hoy+30) sean
 * deterministas.
 */
export interface SanidadPanelLecturaPort {
  /** SAN-002: métricas del panel. */
  obtenerMetricas(fincaId: string, hoy: string): Promise<PanelSanidadMetricas>

  /**
   * KPI-09/SAN-050: filas de refuerzo pendiente por animal/producto.
   * La agrupación por semana natural (SAN-052) y por producto (SAN-003)
   * la aplica el dominio con `agruparRefuerzosPorSemana`.
   */
  listarRefuerzosPendientes(
    fincaId: string,
    hoy: string,
  ): Promise<readonly RefuerzoPendienteFila[]>

  /** SAN-004: las 4 aplicaciones más recientes. */
  listarUltimasAplicaciones(fincaId: string): Promise<readonly UltimaAplicacionPanel[]>

  /**
   * SAN-005/KPI-10: hasta 4 productos con su estado de stock, ordenados
   * por criticidad (agotado primero). Umbral desde `config_parametros_finca`
   * (T-001).
   */
  listarAlertasStock(fincaId: string): Promise<readonly AlertaStockPanel[]>

  /** D-005: historial paginado con filtros producto/fecha/animal-lote. */
  listarHistorial(
    fincaId: string,
    filtros: FiltrosHistorialSanidad,
  ): Promise<HistorialSanidadPagina>
}
