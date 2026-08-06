/**
 * Server functions del panel de sanidad (Issue #212, RF-SANIDAD v0.2 §4).
 *
 * PE-002/SAN-061: toda invocación (aunque sea directa, sin pasar por la UI)
 * revalida en el servidor la sesión, la finca del recurso y el permiso —
 * nunca por nombre de rol (PE-001). SAN-063: el `fincaId` del input se
 * confronta con la finca activa de la sesión; jamás se confía.
 *
 * Una función por fuente de card (degradación por card): el fallo de UNA
 * consulta devuelve `{ tipo: "error" }` serializable para esa card sin
 * afectar a las demás — el panel nunca se cae completo. Las denegaciones
 * RBAC se retornan como valores, nunca como excepciones (CM-042).
 *
 * Operaciones (todas gateadas por `sanidad:ver`):
 * - `metricas`: SAN-002 (4 MetricCards).
 * - `proximas`: KPI-09/SAN-050 + agrupación por semana natural SAN-052
 *   (la agrupación la aplica el dominio `agruparRefuerzosPorSemana`).
 * - `ultimas`: SAN-004 (últimas 4 registradas).
 * - `stock`: SAN-005/KPI-10 (hasta 4 alertas).
 * - `historial`: D-005 (paginado con filtros producto/fecha/animal-lote).
 *
 * Patrón de harness inyectable (`deps`, `getSession`) idéntico a
 * `sanidad-almacen.server.ts`: el contract test tsx inyecta fakes; el
 * runtime usa el adaptador Drizzle real y la sesión de `auth.ts`.
 */

import type {
  AlertaStockPanel,
  FiltrosHistorialSanidad,
  HistorialSanidadPagina,
  PanelSanidadMetricas,
  PeriodosRefuerzosSanidad,
  SanidadPanelLecturaPort,
  SesionAutorizada,
  UltimaAplicacionPanel,
} from "@ganaweb/aplicacion"
import { agruparRefuerzosPorSemana } from "@ganaweb/aplicacion"
import { type DbClient, db } from "@ganaweb/db/client"
import { DrizzlePanelSanidadAdapter } from "@ganaweb/db/sanidad-panel-infrastructure"
import { createServerFn } from "@tanstack/react-start"

export type SanidadPanelPermiso = "ver"

export type SanidadPanelDenial =
  | { readonly tipo: "no_autenticado" }
  | { readonly tipo: "finca_no_autorizada" }
  | { readonly tipo: "permiso_denegado"; readonly permiso: `sanidad:${SanidadPanelPermiso}` }

/** Fallo de una consulta: la card degrada, el panel sigue (CM-042). */
export type SanidadPanelCardError = { readonly tipo: "error"; readonly detalle: string }

export interface SanidadPanelDeps {
  readonly panel: SanidadPanelLecturaPort
  readonly reloj: { ahora(): Date }
}

export function createSanidadPanelDeps(client: DbClient): SanidadPanelDeps {
  return { panel: new DrizzlePanelSanidadAdapter(client), reloj: { ahora: () => new Date() } }
}

/**
 * PE-001/SAN-061: la decisión es por PERMISO, nunca por nombre de rol. El
 * comodín `*:*` cubre los roles con todos los permisos del módulo.
 */
export function hasSanidadPanelPermission(session: SesionAutorizada): boolean {
  return session.permisos.some(
    (permiso) =>
      (permiso.modulo === "sanidad" && permiso.accion === "ver") ||
      (permiso.modulo === "*" && permiso.accion === "*"),
  )
}

/**
 * PE-002/SAN-063: revalida en el servidor sesión, finca y permiso. El
 * `fincaId` del input (URL) jamás se confía: debe coincidir con la finca
 * activa resuelta por la sesión (PE-003).
 */
export function denySanidadPanelAccess(
  session: SesionAutorizada | null,
  fincaId: string,
): SanidadPanelDenial | null {
  if (!session) return { tipo: "no_autenticado" }
  if (session.fincaActivaId !== fincaId) return { tipo: "finca_no_autorizada" }
  if (!hasSanidadPanelPermission(session)) {
    return { tipo: "permiso_denegado", permiso: "sanidad:ver" }
  }
  return null
}

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

interface SanidadPanelHarnessDeps {
  readonly deps: SanidadPanelDeps
  readonly getSession: (fincaId?: string) => Promise<SesionAutorizada | null>
}

/** ISO YYYY-MM-DD del reloj del harness (ventanas deterministas). */
function hoyIso(reloj: SanidadPanelDeps["reloj"]): string {
  return reloj.ahora().toISOString().slice(0, 10)
}

/**
 * Degradación por card: el fallo de la consulta se traduce a un `error`
 * serializable sin filtrar el detalle interno (CM-042).
 */
async function conDegradacion<Result>(
  consulta: () => Promise<Result>,
): Promise<Result | SanidadPanelCardError> {
  try {
    return await consulta()
  } catch {
    return { tipo: "error", detalle: "No se pudo cargar la información de la card." }
  }
}

export function createSanidadPanelActionHarness({ deps, getSession }: SanidadPanelHarnessDeps) {
  return {
    async metricas(input: { readonly fincaId: string }): Promise<MetricasPanelServerResult> {
      const session = await getSession(input.fincaId)
      const denied = denySanidadPanelAccess(session, input.fincaId)
      if (denied) return denied

      const metricas = await conDegradacion(() =>
        deps.panel.obtenerMetricas(input.fincaId, hoyIso(deps.reloj)),
      )
      if ("tipo" in metricas) return metricas
      return { tipo: "ok", metricas }
    },

    async proximas(input: { readonly fincaId: string }): Promise<ProximasPanelServerResult> {
      const session = await getSession(input.fincaId)
      const denied = denySanidadPanelAccess(session, input.fincaId)
      if (denied) return denied

      const hoy = hoyIso(deps.reloj)
      const periodos = await conDegradacion(async () => {
        const filas = await deps.panel.listarRefuerzosPendientes(input.fincaId, hoy)
        // SAN-052: la agrupación por semana natural es del dominio.
        return agruparRefuerzosPorSemana(filas, hoy)
      })
      if ("tipo" in periodos) return periodos
      return { tipo: "ok", periodos }
    },

    async ultimas(input: { readonly fincaId: string }): Promise<UltimasPanelServerResult> {
      const session = await getSession(input.fincaId)
      const denied = denySanidadPanelAccess(session, input.fincaId)
      if (denied) return denied

      const aplicaciones = await conDegradacion(() =>
        deps.panel.listarUltimasAplicaciones(input.fincaId),
      )
      if ("tipo" in aplicaciones) return aplicaciones
      return { tipo: "ok", aplicaciones }
    },

    async stock(input: { readonly fincaId: string }): Promise<StockPanelServerResult> {
      const session = await getSession(input.fincaId)
      const denied = denySanidadPanelAccess(session, input.fincaId)
      if (denied) return denied

      const alertas = await conDegradacion(() => deps.panel.listarAlertasStock(input.fincaId))
      if ("tipo" in alertas) return alertas
      return { tipo: "ok", alertas }
    },

    async historial(input: HistorialPanelInput): Promise<HistorialPanelServerResult> {
      const session = await getSession(input.fincaId)
      const denied = denySanidadPanelAccess(session, input.fincaId)
      if (denied) return denied

      const pagina = await conDegradacion(() =>
        deps.panel.listarHistorial(input.fincaId, input.filtros),
      )
      if ("tipo" in pagina) return pagina
      return { tipo: "ok", pagina }
    },
  }
}

type SanidadPanelRuntimeDepsFactory = () => SanidadPanelDeps

let sanidadPanelRuntimeDepsFactory: SanidadPanelRuntimeDepsFactory | null = () =>
  createSanidadPanelDeps(db)

export function configureSanidadPanelRuntimeDeps(factory: SanidadPanelRuntimeDepsFactory | null) {
  sanidadPanelRuntimeDepsFactory = factory
}

async function getAuthorizedSession(fincaId?: string): Promise<SesionAutorizada | null> {
  const { getAuthDeps } = await import("./auth-deps.server.js")
  const { readFincaActivaCookie, readSessionToken } = await import("./session-cookie.server.js")
  const { obtenerSesionActual } = await import("@ganaweb/aplicacion")
  // La finca solicitada es preferencia suave (patrón animal-actions, #144):
  // la autorización real exige que la sesión activa coincida con el recurso.
  const decision = await obtenerSesionActual(getAuthDeps())(
    readSessionToken(),
    null,
    fincaId ?? readFincaActivaCookie(),
  )
  return decision.tipo === "autorizado" ? decision.sesion : null
}

export function createSanidadPanelRuntimeHarness({
  depsFactory = sanidadPanelRuntimeDepsFactory,
  getSession = getAuthorizedSession,
}: {
  readonly depsFactory?: SanidadPanelRuntimeDepsFactory | null
  readonly getSession?: (fincaId?: string) => Promise<SesionAutorizada | null>
} = {}) {
  const runWithHarness = async <Result>(
    work: (harness: ReturnType<typeof createSanidadPanelActionHarness>) => Promise<Result>,
  ) => {
    if (!depsFactory) {
      throw new Error(
        "Sanidad panel persistence adapters are not configured for apps/web. Register real deps with configureSanidadPanelRuntimeDeps; demo harnesses are test-only.",
      )
    }
    return work(
      createSanidadPanelActionHarness({
        deps: depsFactory(),
        getSession,
      }),
    )
  }

  return {
    metricas: (input: { readonly fincaId: string }) =>
      runWithHarness((harness) => harness.metricas(input)),
    proximas: (input: { readonly fincaId: string }) =>
      runWithHarness((harness) => harness.proximas(input)),
    ultimas: (input: { readonly fincaId: string }) =>
      runWithHarness((harness) => harness.ultimas(input)),
    stock: (input: { readonly fincaId: string }) =>
      runWithHarness((harness) => harness.stock(input)),
    historial: (input: HistorialPanelInput) =>
      runWithHarness((harness) => harness.historial(input)),
  }
}

function getRuntimeHarness() {
  return createSanidadPanelRuntimeHarness()
}

export const obtenerMetricasPanelSanidadFn = createServerFn({ method: "GET" })
  .validator((data: { fincaId: string }) => data)
  .handler(({ data }) => getRuntimeHarness().metricas(data))

export const listarProximasPanelSanidadFn = createServerFn({ method: "GET" })
  .validator((data: { fincaId: string }) => data)
  .handler(({ data }) => getRuntimeHarness().proximas(data))

export const listarUltimasPanelSanidadFn = createServerFn({ method: "GET" })
  .validator((data: { fincaId: string }) => data)
  .handler(({ data }) => getRuntimeHarness().ultimas(data))

export const listarStockPanelSanidadFn = createServerFn({ method: "GET" })
  .validator((data: { fincaId: string }) => data)
  .handler(({ data }) => getRuntimeHarness().stock(data))

export const listarHistorialPanelSanidadFn = createServerFn({ method: "GET" })
  .validator((data: HistorialPanelInput) => data)
  .handler(({ data }) => getRuntimeHarness().historial(data))
