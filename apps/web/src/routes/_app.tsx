/**
 * `_app.tsx` — pathless layout route (TanStack Start v1).
 *
 * Spec: `openspec/changes/dashboard-ganaweb-design/specs/app-shell.md`
 *       §Responsive layout integration + `ganaweb-design.md` v1.2
 *       §Arquitectura de navegación.
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
 * Datos demo (fincas, items, sync): hard-coded en este slice. Cuando
 * exista un server function de sesión, esta ruta lo lee y propaga al
 * shell — el shell no consulta nada por su cuenta.
 */

import {
  AppHeader,
  BottomNav,
  type EstadoSync,
  type FincaResumen,
  type ItemNav,
  Sidebar,
} from "@ganaweb/ui"
import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router"
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

function AppLayout() {
  const navigate = useNavigate()

  const navegar = (item: ItemNav) => {
    // biome-ignore lint/suspicious/noConsole: pendiente de cablear a router real
    console.log("[shell] navigate:", item.href)
    void navigate({ to: item.href })
  }

  return (
    <div className="min-h-screen md:h-screen md:grid md:grid-cols-[240px_1fr]">
      <Sidebar
        items={ITEMS_SIDEBAR}
        activoId="inicio"
        onNavigate={navegar}
        puedeConfigurar
        onConfigurar={() => navigate({ to: "/configuracion" })}
      />

      <div className="flex flex-col min-h-screen md:min-h-0">
        <AppHeader
          fincas={FINCAS_DEMO}
          fincaActivaId="finca-1"
          offline={false}
          estadoSync={ESTADO_SYNC_DEMO}
          onBuscar={() => navigate({ to: "/buscar" })}
          onSync={() => navigate({ to: "/sync" })}
          onCambiarFinca={(f) => {
            // biome-ignore lint/suspicious/noConsole: pendiente de cablear a server fn
            console.log("[shell] cambiar finca:", f.id)
            void navigate({ to: "/", search: { finca: f.id } })
          }}
        />

        <main className="flex-1 overflow-y-auto pb-[calc(var(--h-bottomnav)+env(safe-area-inset-bottom))] md:pb-4">
          <Outlet />
        </main>
      </div>

      <BottomNav
        items={ITEMS_BOTTOM}
        activoId="inicio"
        onNavigate={navegar}
        onFab={() => navigate({ to: "/eventos/nuevo" })}
      />
    </div>
  )
}
