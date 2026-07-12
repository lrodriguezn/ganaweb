/**
 * `_app.tsx` — pathless layout route (TanStack Start v1).
 *
 * Spec: `openspec/changes/dashboard-ganaweb-design/specs/app-shell.md`
 *       §Responsive layout integration + `ganaweb-design.md` v1.2
 *       §Arquitectura de navegación.
 *       `openspec/changes/selector-estilo-apariencia/specs/`
 *       §REQ-MM-001 (BottomNav highlights active item) + §D9
 *       (activoId derivado del pathname).
 *
 * Es el **app chrome**: sidebar/header/bottom-nav + `<Outlet/>`.
 * El shell de documento (`<html>/<head>/<body>`) sigue viviendo en
 * `__root.tsx`; acá solo se monta la decoración.
 *
 * Convención de TanStack Router: un archivo `_app.tsx` (con underscore
 * en el SEGMENTO) es pathless — la URL NO cambia, pero el componente
 * se vuelve un layout que envuelve a sus hijos. Los hijos viven bajo
 * `routes/_app/...`. Por eso `routes/index.tsx` (que renderiza en `/`)
 * se mueve a `routes/_app/index.tsx`: queremos que el dashboard
 * SIEMPRE herede el shell.
 *
 * Reglas de layout (no son decorativas, son contrato del spec):
 *   - Desktop ≥ 768px: grid 2 cols `[240px_1fr]` — Sidebar 240px +
 *     columna derecha con AppHeader 56px + Outlet scrollable.
 *   - Mobile < 768px: flex-col — AppHeader 56px arriba + Outlet
 *     scrollable + BottomNav 64px fijo al fondo (el BottomNav ya
 *     es `position: fixed` y trae su propio `pb-safe`).
 *   - El padding-bottom del `<main>` en mobile reserva los 64px del
 *     BottomNav para que el contenido no quede tapado.
 *   - Toda la conmutación es CSS (`md:`), nunca JS: cero riesgo de
 *     hydration mismatch entre SSR y cliente.
 *
 * Datos estáticos de navegación/sync: hard-coded en este slice. La identidad
 * del usuario se deriva de la sesión del server function.
 *
 * **activoId (D9, S2)**: se deriva del pathname actual vía
 * `useRouterState({ select: (s) => s.location.pathname })`. Mapeo
 * simple: `/` → "inicio", `/<segmento>` → `<segmento>`. Pasamos el id
 * a `Sidebar` Y `BottomNav` para que el item activo se resalte igual
 * en desktop y mobile.
 *
 * **Cerrar sesión**: usa el server function real y luego vuelve a `/login`.
 */

import type { PermisoUsuario } from "@ganaweb/aplicacion"
import {
  AppHeader,
  BottomNav,
  type EstadoSync,
  type FincaResumen,
  type ItemNav,
  Sidebar,
} from "@ganaweb/ui"
import {
  Outlet,
  createFileRoute,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router"
import { Calendar, CheckSquare, Home, Menu, PawPrint } from "lucide-react"
import {
  getCurrentSession,
  initials,
  logoutAction,
  protectedRouteRedirect,
} from "../server/auth.js"

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const decision = await getCurrentSession()
    const redirectTo = protectedRouteRedirect(decision)
    if (redirectTo) throw redirect({ to: redirectTo })
    if (decision.tipo !== "autorizado") throw redirect({ to: "/login" })
    return { sesion: decision.sesion }
  },
  component: AppLayout,
})

/* ---- Datos estáticos del shell; la identidad viene de la sesión ---- */

const ESTADO_SYNC_DEMO: EstadoSync = "sincronizado"

const ITEMS_SIDEBAR: ItemNav[] = [
  { id: "inicio", label: "Inicio", icon: Home, href: "/" },
  { id: "animales", label: "Animales", icon: PawPrint, href: "/animales" },
  { id: "eventos", label: "Eventos", icon: Calendar, href: "/eventos" },
  { id: "sanidad", label: "Sanidad", icon: PawPrint, href: "/sanidad" },
  { id: "reportes", label: "Reportes", icon: Menu, href: "/reportes" },
  { id: "tareas", label: "Tareas", icon: CheckSquare, href: "/tareas" },
]

// BottomNav: 4 slots (1, 2, 4, 5); el 3 es la FAB. No incluye "Más" de Configuración.
const ITEMS_BOTTOM: ItemNav[] = [
  { id: "inicio", label: "Inicio", icon: Home, href: "/" },
  { id: "animales", label: "Animales", icon: PawPrint, href: "/animales" },
  { id: "tareas", label: "Tareas", icon: CheckSquare, href: "/tareas" },
  { id: "mas", label: "Más", icon: Menu, href: "/mas" },
]

const onCerrarSesion = async () => {
  await logoutAction()
  window.location.assign("/login")
}

/**
 * deriveActivoId — mapea el pathname actual al `id` del item de
 * navegación correspondiente. Reglas:
 *   - `/`         → "inicio"  (la raíz mapea a "inicio", no a "")
 *   - `/<seg>`    → "<seg>"   (primer segmento, p.ej. "/mas" → "mas")
 *   - cualquier otro caso (pathname vacío, segment vacío) → "inicio"
 *
 * Mantener la lista de ids en sync con `ITEMS_SIDEBAR` / `ITEMS_BOTTOM`
 * es responsabilidad del consumidor: el id del item ES el segmento
 * de la URL por convención.
 */
function deriveActivoId(pathname: string): string {
  if (pathname === "/" || pathname === "") return "inicio"
  const segment = pathname.split("/")[1] ?? ""
  return segment || "inicio"
}

function AppLayout() {
  const { sesion } = Route.useRouteContext()
  const navigate = useNavigate()
  // D9: el activo se deriva del pathname actual. `select` proyecta a
  // string para que la suscripción sea barata (un solo re-render cuando
  // cambia la ruta, no en cada tick del store del router).
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const activoId = deriveActivoId(pathname)
  const fincaActiva: FincaResumen = {
    id: sesion.fincaActivaId,
    nombre: `Finca ${sesion.fincaActivaId}`,
    rol: sesion.rol,
    esAdmin: sesion.permisos.some(
      (permiso: PermisoUsuario) =>
        (permiso.modulo === "usuarios" && permiso.accion === "aprobar") ||
        (permiso.modulo === "configuracion" && permiso.accion === "administrar"),
    ),
    sync: "sincronizado",
    tieneDatosLocales: true,
  }

  const navegar = (item: ItemNav) => {
    // biome-ignore lint/suspicious/noConsole: pendiente de cablear a router real
    console.log("[shell] navigate:", item.href)
    void navigate({ to: item.href })
  }

  return (
    <div className="flex flex-col min-h-screen md:grid md:grid-cols-[240px_1fr] md:h-screen">
      <Sidebar
        items={ITEMS_SIDEBAR}
        activoId={activoId}
        onNavigate={navegar}
        puedeConfigurar
        onConfigurar={() => navigate({ to: "/configuracion" })}
      />

      <div className="flex flex-col flex-1 min-h-0">
        <AppHeader
          fincas={[fincaActiva]}
          fincaActivaId={sesion.fincaActivaId}
          offline={false}
          estadoSync={ESTADO_SYNC_DEMO}
          nombreUsuario={sesion.nombre}
          emailUsuario={sesion.email}
          inicialesUsuario={initials(sesion.nombre)}
          onCerrarSesion={onCerrarSesion}
          onBuscar={() => navigate({ to: "/buscar" })}
          onSync={() => navigate({ to: "/sync" })}
          onCambiarFinca={(f) => {
            // biome-ignore lint/suspicious/noConsole: pendiente de cablear a server fn
            console.log("[shell] cambiar finca:", f.id)
            void navigate({ to: "/", search: { finca: f.id } })
          }}
        />

        <main className="flex-1 min-h-0 overflow-y-auto pb-[calc(var(--h-bottomnav)+env(safe-area-inset-bottom))] md:pb-0">
          <Outlet />
        </main>
      </div>

      <BottomNav
        items={ITEMS_BOTTOM}
        activoId={activoId}
        onNavigate={navegar}
        onFab={() => navigate({ to: "/eventos/nuevo" })}
      />
    </div>
  )
}
