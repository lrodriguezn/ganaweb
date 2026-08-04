import type { AnimalMobileListReadPort } from "@ganaweb/aplicacion"
import { apiError } from "./animal-list-contract.js"
import { parseAnimalMobileListQuery } from "./animal-mobile-list-contract.js"

type HandlerInput = Readonly<{ request: Request; fincaId: string }>

export interface AnimalMobileListHttpDependencies {
  readonly getUsuarioId: (fincaId: string) => Promise<string | null>
  readonly readPort: AnimalMobileListReadPort
  readonly isForbidden: (error: unknown) => boolean
  readonly requestId: () => string
  readonly reportError: (
    details: Readonly<{ requestId: string; fincaId: string; error: unknown }>,
  ) => void
}

export function createAnimalMobileListHttpHandler(deps: AnimalMobileListHttpDependencies) {
  return async ({ request, fincaId }: HandlerInput): Promise<Response> => {
    const requestId = deps.requestId()
    const parsed = parseAnimalMobileListQuery(new URL(request.url).searchParams)
    if (!parsed.ok) {
      return Response.json(
        apiError("Solicitud inválida", parsed.error.campo, parsed.error.motivo, requestId),
        { status: 400 },
      )
    }

    try {
      const usuarioId = await deps.getUsuarioId(fincaId)
      if (!usuarioId) return forbiddenResponse(requestId)
      const result = await deps.readPort.listar({ ...parsed.value, fincaId, usuarioId })
      return Response.json(result)
    } catch (error) {
      if (deps.isForbidden(error)) return forbiddenResponse(requestId)
      deps.reportError({ requestId, fincaId, error })
      return Response.json(
        apiError("Error interno", null, "No fue posible consultar los animales", requestId),
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
