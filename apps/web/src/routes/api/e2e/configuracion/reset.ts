/**
 * Reset E2E de Configuración · Maestros (issue #152).
 *
 * Endpoint de limpieza determinista para `tests/e2e/configuracion.spec.ts`:
 * borra los maestros de `finca-1` y restaura los datos canónicos de la
 * finca en la BD real. Sólo existe con el modo E2E activo
 * (`GANAWEB_E2E_ANIMALS=1` + runtime de test); en cualquier otro entorno
 * responde 404 (fail-closed, sin tocar datos).
 */

import "@tanstack/react-start"

import { createFileRoute } from "@tanstack/react-router"
import { isAnimalE2eEnabled } from "../../../../server/e2e-animals-fixture.server.js"
import { resetConfiguracionE2eData } from "../../../../server/e2e-configuracion-fixture.server.js"

export const Route = createFileRoute("/api/e2e/configuracion/reset")({
  server: {
    handlers: {
      POST: async () => {
        if (!isAnimalE2eEnabled()) return new Response("Not Found", { status: 404 })
        await resetConfiguracionE2eData()
        return Response.json({ tipo: "reset", fincaId: "finca-1" })
      },
    },
  },
})
