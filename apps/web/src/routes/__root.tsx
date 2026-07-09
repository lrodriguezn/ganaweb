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
  notFoundComponent: NotFound,
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

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-4xl font-bold text-foreground">404</h1>
      <p className="text-lg text-muted-foreground">Página no encontrada</p>
      <a
        href="/"
        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
      >
        Volver al inicio
      </a>
    </div>
  )
}
