/**
 * `server.ts` — server entry point para TanStack Start.
 *
 * Delega al handler por defecto (`@tanstack/react-start/server-entry`)
 * que se encarga de resolver server routes, server functions, y SSR
 * de páginas. Este archivo existe para que el runtime de Vinxi/Nitro
 * tenga un entry universal compatible con fetch (Cloudflare Workers,
 * Node.js, Bun, Deno, etc.).
 */

import handler, { createServerEntry } from "@tanstack/react-start/server-entry"

export default createServerEntry({
  fetch(request) {
    return handler.fetch(request)
  },
})
