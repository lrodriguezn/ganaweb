/**
 * Server functions públicas del panel de sanidad (Issue #212,
 * RF-SANIDAD v0.2 §4).
 *
 * Mismo patrón que `configuracion-actions.ts`: tipos de resultado
 * serializables DECLARADOS LOCALMENTE (la web no importa dominio; los tipos
 * de payload llegan vía `@ganaweb/aplicacion` sólo como `import type`) y
 * handler vía lazy import del runtime harness para que este módulo sea
 * bundleable en el cliente. RBAC (PE-002/SAN-061/063) lo aplica el harness
 * en `sanidad-panel.server.ts`; acá nunca se importa ese módulo en el
 * top-level (import-protection prohíbe `**\/*.server.*` en el cliente).
 *
 * Una función por fuente de card (degradación por card, CM-042): el fallo de
 * UNA consulta se degrada sin tumbar el panel. Las denegaciones se retornan
 * como valores serializables, nunca como excepciones.
 */

import type {
  AlertaStockPanel,
  FiltrosHistorialSanidad,
  HistorialSanidadPagina,
  PanelSanidadMetricas,
  PeriodosRefuerzosSanidad,
  UltimaAplicacionPanel,
} from "@ganaweb/aplicacion"
import { createServerFn } from "@tanstack/react-start"

export type SanidadPanelPermiso = "ver"

export type SanidadPanelDenial =
  | { readonly tipo: "no_autenticado" }
  | { readonly tipo: "finca_no_autorizada" }
  | { readonly tipo: "permiso_denegado"; readonly permiso: `sanidad:${SanidadPanelPermiso}` }

/** Fallo de una consulta: la card degrada, el panel sigue (CM-042). */
export type SanidadPanelCardError = { readonly tipo: "error"; readonly detalle: string }

export type MetricasPanelServerResult =
  | SanidadPanelDenial
  | SanidadPanelCardError
  | { readonly tipo: "ok"; readonly metricas: PanelSanidadMetricas }

export type ProximasPanelServerResult =
  | SanidadPanelDenial
  | SanidadPanelCardError
  | { readonly tipo: "ok"; readonly periodos: PeriodosRefuerzosSanidad }

export type UltimasPanelServerResult =
  | SanidadPanelDenial
  | SanidadPanelCardError
  | { readonly tipo: "ok"; readonly aplicaciones: readonly UltimaAplicacionPanel[] }

export type StockPanelServerResult =
  | SanidadPanelDenial
  | SanidadPanelCardError
  | { readonly tipo: "ok"; readonly alertas: readonly AlertaStockPanel[] }

export type HistorialPanelServerResult =
  | SanidadPanelDenial
  | SanidadPanelCardError
  | { readonly tipo: "ok"; readonly pagina: HistorialSanidadPagina }

export interface HistorialPanelInput {
  readonly fincaId: string
  readonly filtros: FiltrosHistorialSanidad
}

async function getRuntimeHarness() {
  const { createSanidadPanelRuntimeHarness } = await import("./sanidad-panel.server.js")
  return createSanidadPanelRuntimeHarness()
}

export const obtenerMetricasPanelSanidadFn = createServerFn({ method: "GET" })
  .validator((data: { fincaId: string }) => data)
  .handler(
    async ({ data }) =>
      (await (await getRuntimeHarness()).metricas(data)) as MetricasPanelServerResult,
  )

export const listarProximasPanelSanidadFn = createServerFn({ method: "GET" })
  .validator((data: { fincaId: string }) => data)
  .handler(
    async ({ data }) =>
      (await (await getRuntimeHarness()).proximas(data)) as ProximasPanelServerResult,
  )

export const listarUltimasPanelSanidadFn = createServerFn({ method: "GET" })
  .validator((data: { fincaId: string }) => data)
  .handler(
    async ({ data }) =>
      (await (await getRuntimeHarness()).ultimas(data)) as UltimasPanelServerResult,
  )

export const listarStockPanelSanidadFn = createServerFn({ method: "GET" })
  .validator((data: { fincaId: string }) => data)
  .handler(
    async ({ data }) => (await (await getRuntimeHarness()).stock(data)) as StockPanelServerResult,
  )

export const listarHistorialPanelSanidadFn = createServerFn({ method: "GET" })
  .validator((data: HistorialPanelInput) => data)
  .handler(
    async ({ data }) =>
      (await (await getRuntimeHarness()).historial(data)) as HistorialPanelServerResult,
  )
