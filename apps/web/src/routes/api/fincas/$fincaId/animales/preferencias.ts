import "@tanstack/react-start"

import { obtenerSesionActual } from "@ganaweb/aplicacion"
import {
  AnimalListadoForbiddenError,
  DrizzleAnimalListadoPreferenciasRepository,
} from "@ganaweb/db/animal-infrastructure"
import { db } from "@ganaweb/db/client"
import { createFileRoute } from "@tanstack/react-router"
import { createAnimalListadoPreferenciasHttpHandler } from "../../../../../server/animal-list-preferences-http.js"
import { getAuthDeps } from "../../../../../server/auth-deps.server.js"
import { readSessionToken } from "../../../../../server/session-cookie.server.js"

const handler = createAnimalListadoPreferenciasHttpHandler({
  getUsuarioId: async (fincaId) => {
    const decision = await obtenerSesionActual(getAuthDeps())(readSessionToken(), fincaId)
    return decision.tipo === "autorizado" ? decision.sesion.usuarioId : null
  },
  port: new DrizzleAnimalListadoPreferenciasRepository(db),
  isForbidden: (error) => error instanceof AnimalListadoForbiddenError,
  requestId: () => crypto.randomUUID(),
  reportError: ({ requestId, fincaId, error }) => {
    // biome-ignore lint/suspicious/noConsole: runtime failures require correlated server logs.
    console.error("animal-list-preferences request failed", {
      requestId,
      fincaId,
      errorClass: error instanceof Error ? error.name : "UnknownError",
    })
  },
})

export const Route = createFileRoute("/api/fincas/$fincaId/animales/preferencias")({
  server: {
    handlers: {
      GET: ({ request, params }) => handler({ request, fincaId: params.fincaId, method: "GET" }),
      PUT: ({ request, params }) => handler({ request, fincaId: params.fincaId, method: "PUT" }),
    },
  },
})
