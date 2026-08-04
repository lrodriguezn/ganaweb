/**
 * `apps/web/src/routes/_app/mas.tsx` — ruta `/_app/mas` (TanStack Start v1).
 *
 * Spec: `openspec/changes/selector-estilo-apariencia/specs/mas-mobile.md`
 *       §REQ-MM-001..005 (header "Más", AparienciaCard, user info,
 *       Configuración gated by permission, placeholders, Cerrar sesión).
 * Design: `design.md` §D7 (route composition) + session-derived user data.
 *
 * Es la pantalla mobile de "Más" — el BottomNav ya tenía el slot
 * "Más" apuntando a `/mas` desde PR3 (T-003.2), pero el destino era
 * 404 hasta que este archivo aterrizó. PR6 cierra ese gap.
 *
 * **Permisos (REQ-MM-004, D14)**: `Configuración` solo se muestra si
 * el usuario activo tiene `configuracion:ver` (los admins de la finca
 * activa). Usamos `tienePermiso(perms, "configuracion", "ver")` del
 * helper exportado por `@ganaweb/ui`. Los permisos se derivan en este
 * archivo desde la sesión autorizada que llega al AppHeader vía _app.tsx.
 *
 * **Issue #149 (CM-002)**: el botón Configuración navega al hub de
 * Maestros `/fincas/{fincaActivaId}/configuracion`. La vista está
 * extraída en `MasView` (patrón de la casa: rutas cableadas + vista
 * testeable con props, como `AnimalsListRouteView`).
 *
 * **Cerrar sesión (PD-8)**: llama el server function real y vuelve a `/login`.
 *
 * **Sin dark:, sin theme-b: (T-004)**: ningún variant condicional.
 * Los tokens hacen todo el trabajo via `<html class="dark|theme-b">`.
 *
 * **i18n es-CO (T-003)**: "Más", "Cerrar sesión", "Configuración",
 * "Mi cuenta", "Preferencias de notificación", "Próximamente".
 */

import {
  AparienciaCard,
  type Permiso,
  type PermisosUsuario,
  crearPermisos,
  tienePermiso,
} from "@ganaweb/ui"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { LogOut, Settings, User } from "lucide-react"

import { initials, logoutAction } from "../../server/auth.js"
import { Route as AppRoute } from "../_app"

export const Route = createFileRoute("/_app/mas")({
  component: Mas,
})

export interface MasViewProps {
  readonly nombre: string
  readonly email: string
  readonly fincaActivaId: string
  readonly permisos: readonly Permiso[]
  readonly onNavegarAConfiguracion: (ruta: string) => void
  readonly onCerrarSesion: () => void
}

/**
 * Vista presente de "Más" (issue #149): recibe la identidad y los permisos
 * por props para ser testeable sin runtime de TanStack Router.
 */
export function MasView({
  nombre,
  email,
  fincaActivaId,
  permisos,
  onNavegarAConfiguracion,
  onCerrarSesion,
}: MasViewProps) {
  const permisosUsuario: PermisosUsuario = crearPermisos([...permisos])
  const puedeConfigurar = tienePermiso(permisosUsuario, "configuracion", "ver")

  return (
    <div className="mx-auto max-w-6xl space-y-4 md:space-y-6">
      {/* ---- Header: "Más" (REQ-MM-001) ---- */}
      <header>
        <h1 className="text-title font-semibold text-foreground">Más</h1>
      </header>

      {/* ---- AparienciaCard (REQ-MM-002) — Estilo + Modo + hints ---- */}
      <AparienciaCard />

      {/* ---- User info card (REQ-MM-003) ---- */}
      <section className="rounded-card bg-card border p-4" aria-label="Información del usuario">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="size-10 rounded-full bg-muted text-primary font-semibold text-[14px] grid place-items-center shrink-0"
          >
            {initials(nombre) || <User className="size-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium leading-tight truncate">{nombre}</p>
            <p className="text-[12px] text-muted-foreground leading-tight truncate">{email}</p>
          </div>
        </div>
      </section>

      {/* ---- Configuración (REQ-MM-004, CM-002) — gated by tienePermiso ---- */}
      {puedeConfigurar && (
        <nav aria-label="Configuración y cuenta" className="space-y-1">
          <button
            type="button"
            onClick={() => onNavegarAConfiguracion(`/fincas/${fincaActivaId}/configuracion`)}
            className="w-full min-h-[--h-touch] px-3 flex items-center gap-3 rounded-lg bg-card border text-support font-medium text-foreground hover:bg-muted/60 transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Settings aria-hidden="true" className="size-4 shrink-0" />
            <span className="flex-1 text-left">Configuración</span>
          </button>
        </nav>
      )}

      {/* ---- Placeholder items (REQ-MM-005, PD-3) — non-clickable ---- */}
      <nav aria-label="Cuenta" className="space-y-1">
        <PlaceholderItem label="Mi cuenta" />
        <PlaceholderItem label="Preferencias de notificación" />
      </nav>

      {/* ---- Cerrar sesión (REQ-MM-005, PD-8) — danger style, functional ---- */}
      <nav aria-label="Sesión" className="pt-2">
        <button
          type="button"
          onClick={onCerrarSesion}
          className="w-full min-h-[--h-touch] px-3 flex items-center gap-3 rounded-lg bg-card border text-support font-medium text-peligro-600 hover:bg-peligro-600/10 transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <LogOut aria-hidden="true" className="size-4 shrink-0" />
          <span className="flex-1 text-left">Cerrar sesión</span>
        </button>
      </nav>
    </div>
  )
}

function Mas() {
  const { sesion } = AppRoute.useRouteContext()
  const navigate = useNavigate()

  async function onCerrarSesion() {
    await logoutAction()
    void navigate({ to: "/login" })
  }

  return (
    <MasView
      nombre={sesion.nombre}
      email={sesion.email}
      fincaActivaId={sesion.fincaActivaId}
      permisos={sesion.permisos}
      onNavegarAConfiguracion={(ruta) => void navigate({ to: ruta })}
      onCerrarSesion={() => void onCerrarSesion()}
    />
  )
}

/**
 * PlaceholderItem — fila no-clickable con badge "Próximamente"
 * (REQ-MM-005 + PD-3). Usamos `<button disabled>` con `aria-disabled`
 * para que el cursor cambie, los lectores de pantalla anuncien el
 * estado, y ningún handler se dispare.
 */
function PlaceholderItem({ label }: { label: string }) {
  return (
    <div className="w-full min-h-[--h-touch] px-3 flex items-center gap-3 rounded-lg bg-card border text-support font-medium text-muted-foreground">
      <span className="flex-1 text-left">{label}</span>
      <span
        className="text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-0.5"
        data-placeholder-badge="proximamente"
      >
        Próximamente
      </span>
    </div>
  )
}
