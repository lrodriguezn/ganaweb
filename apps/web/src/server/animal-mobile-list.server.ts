/**
 * Issue #156 (RF-ANIM-LIST-M v1.1) — SSR resolver for the mobile animal list
 * first page. The loader of `/_app/fincas/$fincaId/animales` resolves the #155
 * contract server-side through the read model (NO self-fetch to its own HTTP
 * endpoint). Same authz pattern as the API route
 * (`routes/api/fincas/$fincaId/animales/mobile.ts`): session decision →
 * `usuarioId`; the Drizzle read model re-validates `animales:ver` + membership
 * through its authz CTE. The E2E fixture replays the explicit in-memory data
 * when `GANAWEB_E2E_ANIMALS=1`.
 *
 * FAIL CLOSED (LM-RBAC-01/02 parity): any denial or failure — unauthorized
 * session, `AnimalListadoForbiddenError` from the authz CTE, or an unexpected
 * throw — resolves `permiso_denegado` and NEVER throws: the loader's
 * `Promise.all` must not take the desktop branch down on a mobile failure.
 */
import type { AnimalMobileListReadPort, AnimalMobileListReadResult } from "@ganaweb/aplicacion"

export type ResultadoListadoMobileServer =
  | { readonly tipo: "lista"; readonly resultado: AnimalMobileListReadResult }
  | { readonly tipo: "permiso_denegado" }

export interface AnimalMobileListLoaderDeps {
  readonly getUsuarioId: (fincaId: string) => Promise<string | null>
  readonly readPort: AnimalMobileListReadPort
}

const LISTADO_MOBILE_DENEGADO: ResultadoListadoMobileServer = { tipo: "permiso_denegado" }

/**
 * Pure resolver factory (stubbed deps in tests). LM-020/LM-009: page 1,
 * pageSize 25, sin filtros — #157 owns chips/search and #158 owns the
 * infinite-scroll accumulation; the loader never accumulates pages.
 */
export function crearResolverListadoMobileServer(deps: AnimalMobileListLoaderDeps) {
  return async (fincaId: string): Promise<ResultadoListadoMobileServer> => {
    try {
      const usuarioId = await deps.getUsuarioId(fincaId)
      if (usuarioId === null) return LISTADO_MOBILE_DENEGADO
      const resultado = await deps.readPort.listar({
        usuarioId,
        fincaId,
        page: 1,
        pageSize: 25,
        q: null,
        filters: [],
      })
      return { tipo: "lista", resultado }
    } catch {
      return LISTADO_MOBILE_DENEGADO
    }
  }
}

/**
 * Runtime wiring used by `getAnimalMobileListAction`. Heavy imports stay
 * dynamic so the client facade never drags server modules into the browser
 * bundle, and a missing request context fails closed instead of throwing
 * (same contract as `resolverPermisosVisualesListado`).
 */
export async function resolverListadoMobileServer(
  fincaId: string,
): Promise<ResultadoListadoMobileServer> {
  try {
    const { createAnimalE2eMobileListReadPort, getAnimalE2eSession, isAnimalE2eEnabled } =
      await import("./e2e-animals-fixture.server.js")
    const e2e = isAnimalE2eEnabled()
    const getUsuarioId = async (fincaSolicitada: string): Promise<string | null> => {
      if (e2e) {
        const session = getAnimalE2eSession()
        return session.fincaActivaId === fincaSolicitada ? session.usuarioId : null
      }
      const { getAuthDeps } = await import("./auth-deps.server.js")
      const { readSessionToken } = await import("./session-cookie.server.js")
      const { obtenerSesionActual } = await import("@ganaweb/aplicacion")
      const decision = await obtenerSesionActual(getAuthDeps())(readSessionToken(), fincaSolicitada)
      return decision.tipo === "autorizado" ? decision.sesion.usuarioId : null
    }
    let readPort: AnimalMobileListReadPort
    if (e2e) {
      readPort = createAnimalE2eMobileListReadPort()
    } else {
      const { DrizzleAnimalMobileListReadModel } = await import(
        "@ganaweb/db/animal-mobile-list-infrastructure"
      )
      const { db } = await import("@ganaweb/db/client")
      readPort = new DrizzleAnimalMobileListReadModel(db)
    }
    return await crearResolverListadoMobileServer({ getUsuarioId, readPort })(fincaId)
  } catch {
    return LISTADO_MOBILE_DENEGADO
  }
}
