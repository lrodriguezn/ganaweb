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
 * Anti-flash (T-001.5, D13, REQ-AFS-001..005): a synchronous IIFE in
 * <head> BEFORE <HeadContent /> reads both `ganaweb-estilo` and
 * `ganaweb-theme` localStorage keys and applies the correct classes to
 * <html> before the first paint. Try/catch around localStorage so
 * private-mode browsers don't throw and bubble into the render path.
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

/**
 * Anti-flash IIFE (T-001.5, D13). MUST stay raw (no React, no
 * dependencies) so it executes synchronously before hydration and the
 * first paint. The `dangerouslySetInnerHTML` route is the canonical
 * way to inject a literal `<script>` in TanStack Start.
 *
 * Behavior (REQ-AFS-002..004):
 *   - ganaweb-estilo === "moderna" → adds "theme-b"
 *   - ganaweb-theme  === "dark"    → adds "dark"
 *   - missing / unrecognized values → A-light default (no classes added)
 *   - localStorage unavailable (private mode, blocked) → swallowed, A-light default
 */
const ANTI_FLASH_SCRIPT = `(function(){try{var e=localStorage.getItem("ganaweb-estilo");var t=localStorage.getItem("ganaweb-theme");var h=document.documentElement;if(e==="moderna")h.classList.add("theme-b");if(t==="dark")h.classList.add("dark")}catch(_){}})();`

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
        {/* T-001.5: anti-flash script BEFORE <HeadContent />. Raw IIFE
            runs synchronously and adds `theme-b` / `dark` to <html>
            before the first paint, preventing a flash of A-light.
            biome-ignore: this is the canonical TanStack Start way to
            inject a synchronous raw <script>; React doesn't escape the
            payload (we own the source string above) and the body never
            includes user-controlled data. */}
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: anti-flash IIFE (T-001.5); the body is a literal compile-time constant, never user input. */}
        <script dangerouslySetInnerHTML={{ __html: ANTI_FLASH_SCRIPT }} />
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
