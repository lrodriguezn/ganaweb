import { Search } from "lucide-react"

import { cn } from "../lib/utils"
import { AvatarMenu } from "./avatar-menu"
import { FincaSwitcher } from "./finca-switcher"
import { SyncPill } from "./sync-pill"
import { ThemeToggle } from "./theme-toggle"
import type { EstadoSync, FincaResumen } from "./types"

/**
 * AppHeader — barra superior de 56px del shell, responsive.
 * Spec: `specs/app-shell.md` §AppHeader + `ganaweb-design.md` v1.1 §Header.
 * Design: §D8 (avatar replaces standalone ThemeToggle when user props present).
 *
 * Desktop (≥ 768px) — 3 regiones:
 *   [ FincaSwitcher ]          [ SearchTrigger ]          [ SyncPill · AvatarMenu|ThemeToggle ]
 *
 * Mobile (< 768px) — versión simplificada:
 *   [ Finca · Subtítulo de sync ]
 *   (sin búsqueda, sin SyncPill, sin ThemeToggle: el BottomNav ya
 *    tiene la FAB; el toggle de tema vive en Configuración)
 *
 * Reglas encapsuladas:
 * - Reutiliza `FincaSwitcher`, `SyncPill` y `ThemeToggle` existentes.
 * - Cuando se proveen props de usuario (nombreUsuario, etc.), reemplaza
 *   `ThemeToggle` standalone por `AvatarMenu` (D8).
 * - El SearchTrigger es un BOTÓN (no un input real) que dispara
 *   `onBuscar` — la paleta de comandos es trabajo del route, no del shell.
 * - Subtítulo de sync en mobile: "Sincronizado" / "N pendientes" / "Offline"
 *   en `text-caption text-muted-foreground` (10px / 12px en realidad;
 *   design.md v1.2 marca el caption como 12px / 500).
 * - Añade `glass-shell` al `<header>` (D8).
 */
export interface AppHeaderProps {
  fincas: FincaResumen[]
  fincaActivaId: string
  offline: boolean
  estadoSync: EstadoSync
  pendientes?: number
  onBuscar: () => void
  onSync: () => void
  onCambiarFinca: (finca: FincaResumen) => void
  className?: string
  /** Props de usuario para AvatarMenu (D8). Ausentes = sin avatar (backward compat). */
  nombreUsuario?: string
  emailUsuario?: string
  inicialesUsuario?: string
  onCerrarSesion?: () => void
}

export function AppHeader({
  fincas,
  fincaActivaId,
  offline,
  estadoSync,
  pendientes = 0,
  onBuscar,
  onSync,
  onCambiarFinca,
  className,
  nombreUsuario,
  emailUsuario,
  inicialesUsuario,
  onCerrarSesion,
}: AppHeaderProps) {
  const activa = fincas.find((f) => f.id === fincaActivaId)
  const hasUser = Boolean(nombreUsuario && onCerrarSesion)

  return (
    <header
      className={cn(
        "h-14 border-b bg-card flex items-center px-3 md:px-4 gap-2 md:gap-4 glass-shell",
        className,
      )}
    >
      {/* ---- Mobile (< md): finca name + sync subtitle ---- */}
      <div className="flex md:hidden flex-1 min-w-0 items-center">
        <div className="min-w-0">
          <p className="text-[15px] font-medium leading-tight truncate">
            {activa ? activa.nombre : "GanaWeb"}
          </p>
          <p className="text-caption text-muted-foreground leading-tight">
            {subtituloSync(estadoSync, pendientes, offline)}
          </p>
        </div>
      </div>

      {/* ---- Desktop (md+): FincaSwitcher (left) ---- */}
      <FincaSwitcher
        fincas={fincas}
        fincaActivaId={fincaActivaId}
        offline={offline}
        onSeleccionar={onCambiarFinca}
        className="hidden md:inline-flex shrink-0"
      />

      {/* ---- Desktop (md+): SearchTrigger (center) ---- */}
      <button
        type="button"
        onClick={onBuscar}
        className={cn(
          "hidden md:flex flex-1 max-w-[480px] mx-auto h-9 items-center gap-2",
          "rounded-lg bg-muted px-3 text-support text-muted-foreground",
          "hover:bg-muted/80 transition-colors duration-100",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
        aria-label="Abrir búsqueda"
      >
        <Search aria-hidden="true" className="size-4 shrink-0" />
        <span className="flex-1 text-left">Buscar animal…</span>
        <kbd className="hidden lg:inline-flex h-5 items-center rounded bg-background border px-1.5 text-caption text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      {/* ---- Desktop (md+): SyncPill + AvatarMenu|ThemeToggle (right) ---- */}
      <div className="hidden md:flex items-center gap-1 ml-auto shrink-0">
        <SyncPill estado={estadoSync} pendientes={pendientes} onClick={onSync} />
        {hasUser ? (
          <AvatarMenu
            usuario={{
              nombre: nombreUsuario ?? "",
              email: emailUsuario ?? "",
              iniciales: inicialesUsuario ?? "",
              esAdmin: false,
            }}
            onCerrarSesion={onCerrarSesion ?? (() => {})}
          />
        ) : (
          <ThemeToggle />
        )}
      </div>
    </header>
  )
}

function subtituloSync(estado: EstadoSync, pendientes: number, offline: boolean): string {
  if (estado === "pendiente") return `${pendientes} pendientes de sincronizar`
  if (estado === "offline" || offline) return "Offline · se sincronizará al recuperar señal"
  return "Sincronizado"
}
