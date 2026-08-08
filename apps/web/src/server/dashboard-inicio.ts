/**
 * Server functions públicas del dashboard Inicio (Issue #214, SAN-070/D-003).
 *
 * Mismo patrón que `sanidad-panel.ts`: módulo público bundleable con lazy
 * import del runtime harness para que este módulo sea bundleable en el
 * cliente. RBAC lo aplica el harness en `dashboard-inicio.server.ts`;
 * acá nunca se importa ese módulo en el top-level (import-protection
 * prohíbe `**\/*.server.*` en el cliente).
 *
 * Degradación por fuente: el fallo de una consulta se degrada sin tumbar
 * el panel. Las denegaciones se retornan como valores serializables.
 */

import type { AlertaAccionInicio, MetricaEnfermos } from "@ganaweb/aplicacion"
import { createServerFn } from "@tanstack/react-start"

export type DashboardInicioPermiso = "ver"

export type DashboardInicioDenial =
  | { readonly tipo: "no_autenticado" }
  | { readonly tipo: "finca_no_autorizada" }
  | { readonly tipo: "permiso_denegado"; readonly permiso: `sanidad:${DashboardInicioPermiso}` }

export type AlertasInicioServerResult =
  | DashboardInicioDenial
  | {
      readonly tipo: "ok"
      readonly alertas: readonly AlertaAccionInicio[]
      readonly metricaEnfermos: MetricaEnfermos
      readonly errorDetalle?: string
    }

async function getRuntimeHarness() {
  const { createDashboardInicioRuntimeHarness } = await import("./dashboard-inicio.server.js")
  return createDashboardInicioRuntimeHarness()
}

export const listarAlertasInicioFn = createServerFn({ method: "GET" })
  .validator((data: { fincaId: string }) => data)
  .handler(
    async ({ data }) =>
      (await (await getRuntimeHarness()).alertas(data)) as AlertasInicioServerResult,
  )
