/**
 * `__root.tsx` — Root layout de la app GanaWeb (TanStack Start v1).
 *
 * Estructura:
 *   - `RootDocument` arma el shell HTML (`<html>`, `<head>`, `<body>`).
 *   - `RootComponent` envuelve las páginas hijas en `<Outlet />`.
 *   - `<HeadContent />` y `<Scripts />` son requeridos por TanStack
 *     Router para inyectar meta tags y el bundle del cliente.
 *
 * Tokens de diseño (T-004): las clases utilitarias (background, text,
 * font) apuntan a las CSS vars definidas en
 * `@ganaweb/ui/styles/globals.css`. No se usan variantes `dark:` —
 * el toggle de tema se hace con `<html class="dark">` (CSS puro).
 *
 * @ganaweb/ui — los componentes del dominio ganadero se re-exportan
 * desde el barrel de ese paquete; este layout NO los usa (la página
 * index.tsx sí los consume como prueba de integración).
 */

import "@ganaweb/ui/styles/globals.css"

import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router"
import type { ReactNode } from "react"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "GanaWeb — control ganadero" },
      {
        name: "description",
        content: "Control ganadero bovino (Colombia). Clean/Hexagonal monorepo.",
      },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
