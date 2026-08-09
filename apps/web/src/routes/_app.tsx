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
 *   - Desktop ≥ 768px: flex-row — Sidebar 240px (shrink-0) +
 *     columna derecha con AppHeader 56px + Outlet scrollable.
 *     `min-w-0` en el wrapper de contenido y `<main>` previene que
 *     contenido ancho (tablas, grid interno) fuerce el colapso del
 *     flex item durante transiciones de ruta (BUG-LAYOUT-001).
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

import type { FincaUsuarioResumen, PermisoUsuario } from "@ganaweb/aplicacion"
import {
  AppHeader,
  BottomNav,
  type EstadoSync,
  type FincaResumen,
  type ItemNav,
  Sidebar,
  crearPermisos,
  tienePermiso,
} from "@ganaweb/ui"
import {
  Outlet,
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
  useRouterState,
} from "@tanstack/react-router"
import { Calendar, CheckSquare, Home, Menu, PawPrint } from "lucide-react"
import {
  getCurrentSession,
  initials,
  logoutAction,
  protectedRouteRedirect,
  switchFincaAction,
} from "../server/auth.js"

/** Issue #144 (deep links): finca presente en la URL, si la hay. */
const RUTA_FINCA = /^\/fincas\/([^/]+)/

function extraerFincaIdDeRuta(pathname: string): string | null {
  return pathname.match(RUTA_FINCA)?.[1] ?? null
}

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ location }) => {
    // Issue #144: si la URL apunta a una finca concreta, se pasa a la sesión
    // para activarla automáticamente (solo si hay membresía activa; sin
    // acceso la decisión se deniega como antes).
    const decision = await getCurrentSession({
      data: { fincaId: extraerFincaIdDeRuta(location.pathname) },
    })
    const redirectTo = protectedRouteRedirect(decision)
    if (redirectTo) throw redirect({ to: redirectTo })
    if (decision.tipo !== "autorizado") throw redirect({ to: "/login" })
    return { sesion: decision.sesion }
  },
  staleTime: 60_000,
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

const logPendingNavigation = (target: string) => {
  // biome-ignore lint/suspicious/noConsole: placeholder navigation until route exists
  console.warn(`[shell] ruta pendiente: ${target}`)
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
export function deriveActivoId(pathname: string): string {
  if (pathname === "/" || pathname === "") return "inicio"
  if (pathname.includes("/animales")) return "animales"
  // Issue #212 (SAN-001/D-006): la ruta de sanidad vive bajo /fincas/$fincaId.
  if (pathname.includes("/sanidad")) return "sanidad"
  if (pathname.includes("/eventos")) return "eventos"
  const segment = pathname.split("/")[1] ?? ""
  return segment || "inicio"
}

/**
 * Issue #144 — misma regla de esAdmin que se usaba para la finca única:
 * aprobar usuarios o administrar configuración.
 */
function tienePermisoAdministrador(permisos: readonly PermisoUsuario[]): boolean {
  return permisos.some(
    (permiso: PermisoUsuario) =>
      (permiso.modulo === "usuarios" && permiso.accion === "aprobar") ||
      (permiso.modulo === "configuracion" && permiso.accion === "administrar"),
  )
}

function aFincaResumen(finca: FincaUsuarioResumen): FincaResumen {
  return {
    id: finca.fincaId,
    nombre: finca.nombre,
    rol: finca.rol,
    esAdmin: tienePermisoAdministrador(finca.permisos),
    pendiente: !finca.activo,
    // Non-goal #144: sin estado offline por finca; se mantiene el
    // comportamiento actual (sincronizado, con datos locales).
    sync: "sincronizado",
    tieneDatosLocales: true,
  }
}

function AppLayout() {
  const { sesion } = Route.useRouteContext()
  const navigate = useNavigate()
  const router = useRouter()
  // D9: el activo se deriva del pathname actual. `select` proyecta a
  // string para que la suscripción sea barata (un solo re-render cuando
  // cambia la ruta, no en cada tick del store del router).
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const activoId = deriveActivoId(pathname)
  const fincas: FincaResumen[] = sesion.fincas.map(aFincaResumen)
  // CM-002/CM-021 (issue #149): la entrada Configuración del sidebar se
  // gatea por `configuracion:ver` de la sesión de la finca activa.
  const puedeConfigurar = tienePermiso(crearPermisos([...sesion.permisos]), "configuracion", "ver")
  const itemsSidebar = ITEMS_SIDEBAR.map((item) =>
    item.id === "animales"
      ? { ...item, href: `/fincas/${sesion.fincaActivaId}/animales` }
      : item.id === "sanidad"
        ? { ...item, href: `/fincas/${sesion.fincaActivaId}/sanidad` }
        : item.id === "eventos"
          ? { ...item, href: `/fincas/${sesion.fincaActivaId}/eventos` }
          : item,
  )
  const itemsBottom = ITEMS_BOTTOM.map((item) =>
    item.id === "animales"
      ? { ...item, href: `/fincas/${sesion.fincaActivaId}/animales` }
      : item.id === "sanidad"
        ? { ...item, href: `/fincas/${sesion.fincaActivaId}/sanidad` }
        : item,
  )

  const navegar = (item: ItemNav) => {
    // biome-ignore lint/suspicious/noConsole: pendiente de cablear a router real
    console.log("[shell] navigate:", item.href)
    void navigate({ to: item.href })
  }

  // Issue #144 — cambio de finca activa sin reautenticarse:
  // 1) el server function valida la membresía y persiste la última finca;
  // 2) se navega a la página equivalente de la nueva finca;
  // 3) se invalida el router para que el shell relea la sesión (RBAC por
  //    finca recalculado) con la nueva finca activa.
  const cambiarFinca = async (finca: FincaResumen) => {
    if (finca.pendiente || finca.id === sesion.fincaActivaId) return
    const resultado = await switchFincaAction({ data: { fincaId: finca.id } })
    if (resultado.tipo !== "autorizado") return
    const fincaAnterior = sesion.fincaActivaId
    const destino = pathname.includes(`/fincas/${fincaAnterior}`)
      ? pathname.replace(`/fincas/${fincaAnterior}`, `/fincas/${finca.id}`)
      : "/"
    await navigate({ to: destino })
    await router.invalidate()
  }

  return (
    <div className="flex flex-col min-h-screen md:flex-row md:h-screen">
      <Sidebar
        items={itemsSidebar}
        activoId={activoId}
        onNavigate={navegar}
        puedeConfigurar={puedeConfigurar}
        onConfigurar={() => {
          // CM-002 (issue #149): hub de Maestros scoped a la finca activa.
          void navigate({ to: `/fincas/${sesion.fincaActivaId}/configuracion` })
        }}
      />

      <div className="flex flex-col flex-1 min-h-0 min-w-0">
        <AppHeader
          fincas={fincas}
          fincaActivaId={sesion.fincaActivaId}
          offline={false}
          estadoSync={ESTADO_SYNC_DEMO}
          nombreUsuario={sesion.nombre}
          emailUsuario={sesion.email}
          inicialesUsuario={initials(sesion.nombre)}
          onCerrarSesion={onCerrarSesion}
          onBuscar={() => logPendingNavigation("/buscar")}
          onSync={() => logPendingNavigation("/sync")}
          onCambiarFinca={cambiarFinca}
        />

        <main className="relative flex-1 min-h-0 min-w-0 overflow-y-auto px-4 py-5 md:px-6 md:py-6 pb-[calc(var(--h-bottomnav)+env(safe-area-inset-bottom))] md:pb-0">
          <Outlet />
        </main>
      </div>

      <BottomNav
        items={itemsBottom}
        activoId={activoId}
        onNavigate={navegar}
        onFab={() => logPendingNavigation("/eventos/nuevo")}
      />
    </div>
  )
}
