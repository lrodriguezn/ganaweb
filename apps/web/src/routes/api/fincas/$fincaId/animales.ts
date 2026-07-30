import "@tanstack/react-start"

import { obtenerSesionActual } from "@ganaweb/aplicacion"
import {
  AnimalListadoForbiddenError,
  DrizzleAnimalListadoReadModel,
} from "@ganaweb/db/animal-infrastructure"
import { db } from "@ganaweb/db/client"
import { createFileRoute } from "@tanstack/react-router"
import { createAnimalListadoHttpHandler } from "../../../../server/animal-list-http.js"
import { getAuthDeps } from "../../../../server/auth-deps.server.js"
import {
  createAnimalE2eListadoReadPort,
  getAnimalE2eSession,
  isAnimalE2eEnabled,
} from "../../../../server/e2e-animals-fixture.server.js"
import { readSessionToken } from "../../../../server/session-cookie.server.js"

const handler = createAnimalListadoHttpHandler({
  getUsuarioId: async (fincaId) => {
    if (isAnimalE2eEnabled()) {
      const session = getAnimalE2eSession()
      return session.fincaActivaId === fincaId ? session.usuarioId : null
    }
    const decision = await obtenerSesionActual(getAuthDeps())(readSessionToken(), fincaId)
    return decision.tipo === "autorizado" ? decision.sesion.usuarioId : null
  },
  readPort: {
    listar: (request) =>
      isAnimalE2eEnabled()
        ? createAnimalE2eListadoReadPort().listar(request)
        : new DrizzleAnimalListadoReadModel(db).listar(request),
  },
  isForbidden: (error) => error instanceof AnimalListadoForbiddenError,
  requestId: () => crypto.randomUUID(),
  reportError: ({ requestId, fincaId, error }) => {
    // biome-ignore lint/suspicious/noConsole: runtime failures require correlated server logs.
    console.error("animal-list request failed", {
      requestId,
      fincaId,
      errorClass: error instanceof Error ? error.name : "UnknownError",
    })
  },
})

export const Route = createFileRoute("/api/fincas/$fincaId/animales")({
  server: {
    handlers: {
      GET: ({ request, params }) => handler({ request, fincaId: params.fincaId }),
    },
  },
})
