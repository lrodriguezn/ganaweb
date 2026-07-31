/**
 * #110 PR2 — server-side preference resolution for the animal-list route loader.
 *
 * Loads the authorized user's per-finca preferences during SSR so the route can
 * initialize `pageSize`/`cols` without a client round-trip (no flicker). Reuses
 * the PR1 authz seam (PE-001–003): an unauthorized or failed resolution maps to
 * `error`, and the route falls back to the 29/25 defaults with a retryable
 * warning. The result is JSON-serializable across the `createServerFn` boundary.
 */
import { obtenerSesionActual } from "@ganaweb/aplicacion"
import { DrizzleAnimalListadoPreferenciasRepository } from "@ganaweb/db/animal-infrastructure"
import { db } from "@ganaweb/db/client"
import { normalizePreferencias } from "./animal-list-preferences.js"
import { getAuthDeps } from "./auth-deps.server.js"
import { readSessionToken } from "./session-cookie.server.js"

export type ResultadoPreferenciasListadoServer =
  | {
      readonly tipo: "listo"
      readonly preferencias: {
        readonly cols: readonly string[]
        readonly pageSize: number
      }
    }
  | { readonly tipo: "error" }

export async function resolverPreferenciasListadoServer(
  fincaId: string,
): Promise<ResultadoPreferenciasListadoServer> {
  try {
    const decision = await obtenerSesionActual(getAuthDeps())(readSessionToken(), fincaId)
    if (decision.tipo !== "autorizado") return { tipo: "error" }
    const port = new DrizzleAnimalListadoPreferenciasRepository(db)
    const guardadas = await port.obtener({ usuarioId: decision.sesion.usuarioId, fincaId })
    const normalizadas = normalizePreferencias({
      cols: guardadas.cols,
      pageSize: guardadas.pageSize,
    })
    return {
      tipo: "listo",
      preferencias: { cols: normalizadas.cols, pageSize: normalizadas.pageSize },
    }
  } catch {
    return { tipo: "error" }
  }
}
