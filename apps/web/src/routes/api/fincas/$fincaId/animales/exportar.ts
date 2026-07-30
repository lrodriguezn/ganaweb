import "@tanstack/react-start"

import { AnimalExportacionOverflowError, obtenerSesionActual } from "@ganaweb/aplicacion"
import {
  AnimalListadoForbiddenError,
  DrizzleAnimalListadoReadModel,
  leerLimitesExportacion,
} from "@ganaweb/db/animal-infrastructure"
import { db } from "@ganaweb/db/client"
import { createFileRoute } from "@tanstack/react-router"
import { createAnimalExportacionHttpHandler } from "../../../../../server/animal-exportacion-http.js"
import { proyectarPermisosVisualesListado } from "../../../../../server/animal-listado-permissions.server.js"
import { getAuthDeps } from "../../../../../server/auth-deps.server.js"
import { generarCsv, generarPdf, generarXlsx } from "../../../../../server/exportadores/index.js"
import { readSessionToken } from "../../../../../server/session-cookie.server.js"

const handler = createAnimalExportacionHttpHandler({
  // Server-side RBAC re-validation (LA-RBAC-04/05/075, fail-closed): the session
  // must be authorized for this finca AND hold animales:ver + reportes:exportar.
  // The projection is the single owner of that rule; any denial resolves null →
  // 403. The read port re-validates animales:ver + membership again (authz CTE).
  getUsuarioId: async (fincaId) => {
    const decision = await obtenerSesionActual(getAuthDeps())(readSessionToken(), fincaId)
    if (decision.tipo !== "autorizado") return null
    const { canExport } = proyectarPermisosVisualesListado(decision, fincaId)
    return canExport ? decision.sesion.usuarioId : null
  },
  readPort: {
    exportar: (request) => new DrizzleAnimalListadoReadModel(db).exportar(request),
  },
  leerLimites: (fincaId) => leerLimitesExportacion(db, fincaId),
  generadores: { xlsx: generarXlsx, csv: generarCsv, pdf: generarPdf },
  isForbidden: (error) => error instanceof AnimalListadoForbiddenError,
  isOverflow: (error) => error instanceof AnimalExportacionOverflowError,
  crearSenal: (timeoutMs) => AbortSignal.timeout(timeoutMs),
  requestId: () => crypto.randomUUID(),
  now: () => new Date(),
  reportError: ({ requestId, fincaId, error }) => {
    // biome-ignore lint/suspicious/noConsole: runtime failures require correlated server logs.
    console.error("animal-export request failed", {
      requestId,
      fincaId,
      errorClass: error instanceof Error ? error.name : "UnknownError",
    })
  },
})

export const Route = createFileRoute("/api/fincas/$fincaId/animales/exportar")({
  server: {
    handlers: {
      GET: ({ request, params }) => handler({ request, fincaId: params.fincaId }),
    },
  },
})
