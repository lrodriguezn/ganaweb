/**
 * Server functions del dashboard Inicio (Issue #214, SAN-070/D-003).
 *
 * PE-002/SAN-061: toda invocación revalida en el servidor la sesión, la finca
 * del recurso y el permiso — nunca por nombre de rol (PE-001). SAN-063: el
 * `fincaId` del input se confronta con la finca activa de la sesión; jamás se
 * confía.
 *
 * Degradación por fuente: el fallo de la consulta de refuerzos devuelve las
 * alertas de stock con `errorDetalle` — el panel nunca se cae completo.
 * Las denegaciones se retornan como valores, nunca como excepciones (CM-042).
 *
 * Patrón de harness inyectable (`deps`, `getSession`) idéntico a
 * `sanidad-panel.server.ts`.
 */

import type {
  AlertaAccionInicio,
  DashboardInicioLecturaPort,
  MetricaEnfermos,
  SesionAutorizada,
} from "@ganaweb/aplicacion"
import { placeholderMetricaEnfermos } from "@ganaweb/aplicacion"
import { createServerFn } from "@tanstack/react-start"

export type DashboardInicioPermiso = "ver"

export type DashboardInicioDenial =
  | { readonly tipo: "no_autenticado" }
  | { readonly tipo: "finca_no_autorizada" }
  | { readonly tipo: "permiso_denegado"; readonly permiso: `sanidad:${DashboardInicioPermiso}` }

/** Fallo de una fuente: la card degrada, el panel sigue (CM-042). */
export type DashboardInicioCardError = { readonly tipo: "error"; readonly detalle: string }

export type AlertasInicioServerResult =
  | DashboardInicioDenial
  | {
      readonly tipo: "ok"
      readonly alertas: readonly AlertaAccionInicio[]
      readonly metricaEnfermos: MetricaEnfermos
      readonly errorDetalle?: string
    }

export interface DashboardInicioDeps {
  readonly dashboard: DashboardInicioLecturaPort
  readonly reloj: { ahora(): Date }
}

export function createDashboardInicioDeps(
  dashboard: DashboardInicioLecturaPort,
): DashboardInicioDeps {
  return { dashboard, reloj: { ahora: () => new Date() } }
}

/**
 * PE-001/SAN-061: la decisión es por PERMISO, nunca por nombre de rol.
 */
export function hasDashboardInicioPermission(session: SesionAutorizada): boolean {
  return session.permisos.some(
    (permiso) =>
      (permiso.modulo === "sanidad" && permiso.accion === "ver") ||
      (permiso.modulo === "*" && permiso.accion === "*"),
  )
}

/**
 * PE-002/SAN-063: revalida en el servidor sesión, finca y permiso.
 */
export function denyDashboardInicioAccess(
  session: SesionAutorizada | null,
  fincaId: string,
): DashboardInicioDenial | null {
  if (!session) return { tipo: "no_autenticado" }
  if (session.fincaActivaId !== fincaId) return { tipo: "finca_no_autorizada" }
  if (!hasDashboardInicioPermission(session)) {
    return { tipo: "permiso_denegado", permiso: "sanidad:ver" }
  }
  return null
}

interface DashboardInicioHarnessDeps {
  readonly deps: DashboardInicioDeps
  readonly getSession: (fincaId?: string) => Promise<SesionAutorizada | null>
}

function hoyIso(reloj: DashboardInicioDeps["reloj"]): string {
  return reloj.ahora().toISOString().slice(0, 10)
}

export function createDashboardInicioActionHarness({
  deps,
  getSession,
}: DashboardInicioHarnessDeps) {
  return {
    async alertas(input: {
      readonly fincaId: string
      readonly sesion?: SesionAutorizada
    }): Promise<AlertasInicioServerResult> {
      const session = input.sesion ?? (await getSession(input.fincaId))
      const denied = denyDashboardInicioAccess(session, input.fincaId)
      if (denied) return denied

      const hoy = hoyIso(deps.reloj)
      let alertas: readonly AlertaAccionInicio[] = []
      let errorDetalle: string | undefined

      try {
        alertas = await deps.dashboard.listarAlertasRequiereAccion(input.fincaId, hoy)
      } catch {
        errorDetalle = "No se pudieron cargar las alertas de refuerzo y stock."
      }

      const metricaEnfermos = placeholderMetricaEnfermos()

      return {
        tipo: "ok",
        alertas,
        metricaEnfermos,
        ...(errorDetalle ? { errorDetalle } : {}),
      }
    },
  }
}

type DashboardInicioRuntimeDepsFactory = () => DashboardInicioDeps

let dashboardInicioRuntimeDepsFactory: DashboardInicioRuntimeDepsFactory | null = null

export function configureDashboardInicioRuntimeDeps(
  factory: DashboardInicioRuntimeDepsFactory | null,
) {
  dashboardInicioRuntimeDepsFactory = factory
}

async function getAuthorizedSession(fincaId?: string): Promise<SesionAutorizada | null> {
  const { getAuthDeps } = await import("./auth-deps.server.js")
  const { readFincaActivaCookie, readSessionToken } = await import("./session-cookie.server.js")
  const { obtenerSesionActual } = await import("@ganaweb/aplicacion")
  const decision = await obtenerSesionActual(getAuthDeps())(
    readSessionToken(),
    null,
    fincaId ?? readFincaActivaCookie(),
  )
  return decision.tipo === "autorizado" ? decision.sesion : null
}

export function createDashboardInicioRuntimeHarness({
  depsFactory = dashboardInicioRuntimeDepsFactory,
  getSession = getAuthorizedSession,
}: {
  readonly depsFactory?: DashboardInicioRuntimeDepsFactory | null
  readonly getSession?: (fincaId?: string) => Promise<SesionAutorizada | null>
} = {}) {
  const runWithHarness = async <Result>(
    work: (harness: ReturnType<typeof createDashboardInicioActionHarness>) => Promise<Result>,
  ) => {
    if (!depsFactory) {
      throw new Error("Dashboard inicio persistence adapters are not configured for apps/web.")
    }
    return work(
      createDashboardInicioActionHarness({
        deps: depsFactory(),
        getSession,
      }),
    )
  }

  return {
    alertas: (input: { readonly fincaId: string }) =>
      runWithHarness((harness) => harness.alertas(input)),
  }
}

function getRuntimeHarness() {
  return createDashboardInicioRuntimeHarness()
}

export const listarAlertasInicioFn = createServerFn({ method: "GET" })
  .validator((data: { fincaId: string }) => data)
  .handler(({ data }) => getRuntimeHarness().alertas(data))
