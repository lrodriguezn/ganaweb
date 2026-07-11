/**
 * `_app.tsx` — pathless layout route (TanStack Start v1).
 *
 * Spec: `openspec/changes/dashboard-ganaweb-design/specs/app-shell.md`
 *       §Responsive layout integration + `ganaweb-design.md` v1.2
 *       §Arquitectura de navegación.
 *       `openspec/changes/selector-estilo-apariencia/specs/`
 *       §REQ-MM-001 (BottomNav highlights active item) + §D9
 *       (activoId derivado del pathname) + §D14 (USUARIO_DEMO).
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
 * Datos demo (fincas, items, sync, usuario): hard-coded en este slice.
 * Cuando exista un server function de sesión, esta ruta lo lee y
 * propaga al shell — el shell no consulta nada por su cuenta.
 *
 * **activoId (D9, S2)**: se deriva del pathname actual vía
 * `useRouterState({ select: (s) => s.location.pathname })`. Mapeo
 * simple: `/` → "inicio", `/<segmento>` → `<segmento>`. Pasamos el id
 * a `Sidebar` Y `BottomNav` para que el item activo se resalte igual
 * en desktop y mobile.
 *
 * **USUARIO_DEMO (D14)**: constante exportada que el `AppHeader`
 * consume para pintar el `AvatarMenu` (desktop) y que `/_app/mas`
 * importa para mostrar el nombre/email y derivar `PERMISOS_DEMO`.
 * Una sola fuente de verdad en el shell: cambiar el flag `esAdmin`
 * cambia la UI en ambos lugares.
 *
 * **Cerrar sesión (D14)**: stub `console.warn`. La acción se propaga
 * a `AppHeader` (vía `onCerrarSesion`) y a `/_app/mas` (el handler
 * vive en `mas.tsx` para mantener el route autosuficiente). Cuando
 * llegue el server function real, se reemplaza UN solo punto.
 */

import {
  AppHeader,
  BottomNav,
  type EstadoSync,
  type FincaResumen,
  type ItemNav,
  Sidebar,
} from "@ganaweb/ui"
import { Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router"
import { Calendar, CheckSquare, Home, Menu, PawPrint } from "lucide-react"

export const Route = createFileRoute("/_app")({
  component: AppLayout,
})

/* ---- Datos demo del shell (vienen del server function en PR futuro) ---- */

const FINCAS_DEMO: FincaResumen[] = [
  {
    id: "finca-1",
    nombre: "La Esperanza",
    rol: "Administrador",
    esAdmin: true,
    sync: "sincronizado",
    tieneDatosLocales: true,
  },
  {
    id: "finca-2",
    nombre: "El Recreo",
    rol: "Operario de ordeño",
    sync: "pendiente",
    pendientes: 3,
    tieneDatosLocales: true,
  },
]

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

/**
 * USUARIO_DEMO — resumen del usuario activo para el shell.
 * Spec: D14. Cuando exista un server function de sesión real, este
 * literal se reemplaza por el loader result; el contrato de la
 * `interface UsuarioResumen` (packages/ui/src/ganado/types.ts) es
 * la superficie estable — `AppHeader` y `/_app/mas` no cambian.
 *
 * Se exporta para que `routes/_app/mas.tsx` (PR6 T-006.1) pueda
 * derivar `PERMISOS_DEMO` desde el MISMO `esAdmin`. Una sola fuente
 * de verdad para que cambiar el rol demo actualice las dos vistas.
 */
export const USUARIO_DEMO = {
  nombre: "Yuli Administradora",
  email: "admin@ganaweb.demo",
  iniciales: "YA",
  esAdmin: true,
} as const

/**
 * Stub de logout. Reemplaza por el server function de sesión cuando
 * exista; la firma `() => void` se mantiene — `AppHeader` y
 * `/_app/mas` siguen funcionando sin cambios.
 */
const onCerrarSesion = () => {
  // biome-ignore lint/suspicious/noConsole: stub — server function de sesión es trabajo de un PR futuro (D14).
  console.warn("[auth] logout no implementado")
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
  const navigate = useNavigate()
  // D9: el activo se deriva del pathname actual. `select` proyecta a
  // string para que la suscripción sea barata (un solo re-render cuando
  // cambia la ruta, no en cada tick del store del router).
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const activoId = deriveActivoId(pathname)

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
          fincas={FINCAS_DEMO}
          fincaActivaId="finca-1"
          offline={false}
          estadoSync={ESTADO_SYNC_DEMO}
          nombreUsuario={USUARIO_DEMO.nombre}
          emailUsuario={USUARIO_DEMO.email}
          inicialesUsuario={USUARIO_DEMO.iniciales}
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
