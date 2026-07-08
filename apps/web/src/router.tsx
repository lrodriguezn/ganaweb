/**
 * `router.tsx` — entry point del TanStack Router.
 *
 * Crea una instancia del router a partir del `routeTree` generado
 * por el plugin de TanStack Router (archivo `routeTree.gen.ts` que
 * el plugin crea en dev/build al escanear `src/routes/`).
 *
 * Exportamos `getRouter` (no `router`) para que TanStack Start pueda
 * crear una instancia nueva por request SSR — el estado del router
 * no debe compartirse entre requests.
 *
 * `scrollRestoration: true` restaura la posición del scroll al
 * navegar entre páginas (UX estándar SPA).
 */

import { createRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"

export function getRouter() {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
  })

  return router
}
