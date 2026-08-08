/**
 * Puerto del dashboard Inicio (Issue #214, SAN-070/D-003/SAN-072).
 *
 * Contrato type-only de la capa de aplicación (D6) para las consultas del
 * dashboard Inicio. El adaptador Drizzle vive en `packages/db`
 * (`dashboard-inicio-infrastructure.ts`); las server functions de `apps/web`
 * revalidan sesión/finca/permiso antes de llamarlo (PE-002).
 *
 * Todas las filas son serializables (CM-042): fechas como texto ISO
 * YYYY-MM-DD, sin Date ni BigInt. Nombres en español (T-003).
 */

import type { AlertaAccionInicio, MetricaEnfermos } from "@ganaweb/dominio"

export type { AlertaAccionInicio, MetricaEnfermos }

/**
 * Resultado del dashboard Inicio: alertas (≤ 5 con severidad y href)
 * y métrica de enfermos (placeholder D-003).
 */
export type DashboardInicioResultado = {
  readonly alertas: readonly AlertaAccionInicio[]
  readonly metricaEnfermos: MetricaEnfermos
}

/**
 * Lecturas del dashboard Inicio (SAN-070).
 *
 * Todas las lecturas están acotadas a la finca (SAN-063): el adaptador
 * recibe el `fincaId` ya revalidado por la server function contra la
 * sesión activa — jamás de la URL.
 */
export interface DashboardInicioLecturaPort {
  /**
   * Alertas que requieren acción, combinando refuerzos por vencer y
   * stock bajo/agotado. Priorización SAN-070: peligro sobre alerta,
   * truncado a 5.
   */
  listarAlertasRequiereAccion(fincaId: string, hoy: string): Promise<readonly AlertaAccionInicio[]>

  /**
   * D-003: métrica "Enfermos" placeholder (valor 0 fijo, sin href)
   * hasta que se defina la transición sana/enferma.
   */
  obtenerMetricaEnfermosPlaceholder(): Promise<MetricaEnfermos>
}
