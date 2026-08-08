/**
 * Adaptador Drizzle (PostgreSQL) del dashboard Inicio (Issue #214, SAN-070/D-003).
 *
 * Implementa `DashboardInicioLecturaPort` (`@ganaweb/aplicacion`, type-only).
 *
 * Reutiliza `DrizzlePanelSanidadAdapter` para las lecturas de refuerzos
 * pendientes y alertas de stock, y aplica la priorización SAN-070
 * (`seleccionarAlertasInicio` del dominio).
 *
 * D-003: la métrica "Enfermos" es un placeholder con valor 0 fijo.
 *
 * Driver único PostgreSQL (online-first, D3).
 */

import type {
  AlertaAccionInicio,
  DashboardInicioLecturaPort,
  MetricaEnfermos,
} from "@ganaweb/aplicacion"
import { placeholderMetricaEnfermos, seleccionarAlertasInicio } from "@ganaweb/dominio"
import type { DbClient } from "./client.js"
import { DrizzlePanelSanidadAdapter } from "./sanidad-panel-infrastructure.js"

export class DrizzleDashboardInicioAdapter implements DashboardInicioLecturaPort {
  private readonly panelAdapter: DrizzlePanelSanidadAdapter

  constructor(private readonly db: DbClient) {
    this.panelAdapter = new DrizzlePanelSanidadAdapter(db)
  }

  async listarAlertasRequiereAccion(
    fincaId: string,
    hoy: string,
  ): Promise<readonly AlertaAccionInicio[]> {
    const [refuerzos, stock] = await Promise.all([
      this.panelAdapter.listarRefuerzosPendientes(fincaId, hoy),
      this.panelAdapter.listarAlertasStock(fincaId),
    ])

    const refuerzosPorVencer = refuerzos.map((r) => ({
      id: `refuerzo-${r.productoId}-${r.animalId}`,
      texto: `${r.descripcion} — ${r.codigo} vence el ${r.proximaDosis}`,
      tipo: "refuerzo" as const,
      severidad: r.proximaDosis < hoy ? ("peligro" as const) : ("alerta" as const),
      fechaReferencia: r.proximaDosis,
      href: `/fincas/${fincaId}/sanidad?alerta=refuerzo&producto=${r.productoId}`,
    }))

    const stockBajo = stock.map((s) => ({
      id: `stock-${s.productoId}`,
      texto: `${s.descripcion} — ${s.codigo}: ${s.dosisDisponibles} dosis disponibles`,
      tipo: "stock" as const,
      severidad: s.estado === "agotado" ? ("peligro" as const) : ("alerta" as const),
      fechaReferencia: hoy,
      href: `/fincas/${fincaId}/sanidad?alerta=stock&producto=${s.productoId}`,
    }))

    return seleccionarAlertasInicio({
      refuerzosPorVencer,
      stockBajo,
      maximo: 5,
    })
  }

  async obtenerMetricaEnfermosPlaceholder(): Promise<MetricaEnfermos> {
    return placeholderMetricaEnfermos()
  }
}
