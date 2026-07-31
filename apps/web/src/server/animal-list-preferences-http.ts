/**
 * #110 PR1 — HTTP handler factory for animal-list preferences.
 *
 * Mirrors `createAnimalListadoHttpHandler`: dependency-injected, pure factory.
 * GET → 200 (normalized) | 403. PUT → 200 (normalized echo) | 400 | 403.
 * Errors use `apiError(...)` and never leak internal details or other scopes.
 */
import type { AnimalListadoPreferenciasPort } from "@ganaweb/aplicacion"
import { apiError } from "./animal-list-contract.js"
import { normalizePreferencias, validatePreferenciasBody } from "./animal-list-preferences.js"

type HandlerInput = Readonly<{ request: Request; fincaId: string; method: "GET" | "PUT" }>

export interface AnimalListadoPreferenciasHttpDependencies {
  readonly getUsuarioId: (fincaId: string) => Promise<string | null>
  readonly port: AnimalListadoPreferenciasPort
  readonly isForbidden: (error: unknown) => boolean
  readonly requestId: () => string
  readonly reportError: (
    details: Readonly<{ requestId: string; fincaId: string; error: unknown }>,
  ) => void
}

export function createAnimalListadoPreferenciasHttpHandler(
  deps: AnimalListadoPreferenciasHttpDependencies,
) {
  return async ({ request, fincaId, method }: HandlerInput): Promise<Response> => {
    const requestId = deps.requestId()

    try {
      const usuarioId = await deps.getUsuarioId(fincaId)
      if (!usuarioId) return forbiddenResponse(requestId)

      if (method === "GET") {
        const stored = await deps.port.obtener({ usuarioId, fincaId })
        const normalized = normalizePreferencias({
          cols: stored.cols,
          pageSize: stored.pageSize,
        })
        return Response.json(normalized)
      }

      // PUT
      let body: unknown
      try {
        body = await request.json()
      } catch {
        return Response.json(
          apiError("Solicitud inválida", "body", "Cuerpo JSON inválido", requestId),
          { status: 400 },
        )
      }

      const validated = validatePreferenciasBody(body)
      if (!validated.ok) {
        return Response.json(
          apiError("Solicitud inválida", validated.error.campo, validated.error.motivo, requestId),
          { status: 400 },
        )
      }

      await deps.port.guardar({ usuarioId, fincaId, ...validated.value })
      return Response.json(validated.value)
    } catch (error) {
      if (deps.isForbidden(error)) return forbiddenResponse(requestId)
      deps.reportError({ requestId, fincaId, error })
      return Response.json(
        apiError("Error interno", null, "No fue posible procesar las preferencias", requestId),
        { status: 500 },
      )
    }
  }
}

function forbiddenResponse(requestId: string): Response {
  return Response.json(apiError("Acceso denegado", null, "No autorizado", requestId), {
    status: 403,
  })
}
