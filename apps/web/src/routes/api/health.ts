/**
 * `GET /api/health` — health check con verificación de Postgres (D8).
 *
 * Spec: `web-app-bootstrap.md` Req 2 + Req 3.
 *   - 200 + `{ status: "ok", db: "ok" }` cuando Postgres responde al `SELECT 1`.
 *   - 503 + `{ status: "degraded", db: "error" }` cuando la DB no responde.
 *
 * Implementación:
 *   - `createFileRoute("/api/health")` (no `createServerFileRoute`, como
 *     decía el design original — la API estable de TanStack Start v1
 *     usa `server.handlers` dentro de `createFileRoute`).
 *   - `db.execute('SELECT 1')` del singleton lazy de `@ganaweb/db`.
 *     El Proxy lazy garantiza que NO abrimos un pool postgres en
 *     module-load (serverless-friendly); el `execute` falla rápido
 *     si la URL es inalcanzable y la respuesta sale como 503.
 *
 * Errores:
 *   - Cualquier excepción del driver (connection refused, timeout,
 *     unique-violation, etc.) se considera "db: error" y devuelve 503.
 *     No se filtra el mensaje al cliente para evitar exponer detalles
 *     internos de la DB.
 *
 * Contrato con Docker `HEALTHCHECK` (especificaciones_tecnicas.md §7):
 *   - 200 = healthy (Docker no reinicia el container).
 *   - 503 = unhealthy (Docker reinicia después de N intentos).
 */

// Side-effect import: el módulo `@tanstack/react-start` re-exporta
// `@tanstack/start-client-core`, que contiene la augmentación de
// tipos que agrega `server.handlers` a `FilebaseRouteOptionsInterface`.
// Sin este import, TypeScript no reconocería la propiedad `server`
// en `createFileRoute("/api/health")(...)` (verificado en
// @tanstack/start-client-core/dist/esm/serverRoute.d.ts).
import "@tanstack/react-start"

import { db } from "@ganaweb/db/client"
import { createFileRoute } from "@tanstack/react-router"
import { sql } from "drizzle-orm"

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await db.execute(sql`SELECT 1`)
          return Response.json({ status: "ok", db: "ok" }, { status: 200 })
        } catch (_error) {
          // No propagamos el error al cliente: 503 + db:"error" es el
          // contrato. El error real queda en los logs del runtime de
          // Nitro (stderr del server), que es donde el operador lo busca.
          return Response.json({ status: "degraded", db: "error" }, { status: 503 })
        }
      },
    },
  },
})
