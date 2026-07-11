import { Moon, Sun, User } from "lucide-react"
import { useEffect, useState } from "react"

import { cn } from "../lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../primitives/dropdown-menu"
import { EstiloSwitcher } from "./estilo-switcher"
import type { UsuarioResumen } from "./types"

/**
 * AvatarMenu — dropdown de escritorio que abre el menú de usuario y
 * controles de apariencia.
 *
 * Spec: specs/avatar-menu.md (REQ-AM-001..007).
 * Design: design.md §D5.
 *
 * Reutiliza `DropdownMenu` (Radix) para focus trap, Escape, click-outside
 * y focus return gratis (REQ-AM-006, REQ-AM-007). El trigger es un botón
 * circular con las iniciales del usuario o un ícono User de fallback.
 *
 * La sección APARIENCIA compone `EstiloSwitcher` + dos botones de ícono
 * sun/moon (REQ-TTC-003, REQ-TTC-004). Los botones sun/moon están
 * inlineados para evitar acoplamiento con ThemeToggle (D5).
 */
export interface AvatarMenuProps {
  usuario: UsuarioResumen
  onCerrarSesion: () => void
  className?: string
}

export function AvatarMenu({ usuario, onCerrarSesion, className }: AvatarMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-haspopup="menu"
        className={cn(
          "size-9 rounded-full flex items-center justify-center",
          "bg-muted text-primary font-semibold text-[13px]",
          "hover:bg-muted/80 transition-colors duration-100",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "focus-visible:ring-offset-2",
          className,
        )}
      >
        {usuario.iniciales ? (
          <span aria-hidden="true">{usuario.iniciales}</span>
        ) : (
          <User aria-hidden="true" className="size-4" />
        )}
        <span className="sr-only">Menú de usuario: {usuario.nombre}</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-72 p-0">
        {/* User info header */}
        <div className="px-3 py-2.5">
          <p className="text-[13px] font-medium leading-tight">{usuario.nombre}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">{usuario.email}</p>
        </div>

        <DropdownMenuSeparator />

        {/* APARIENCIA section */}
        <div className="px-3 py-2">
          <DropdownMenuLabel className="px-0 py-1 text-[10px]">APARIENCIA</DropdownMenuLabel>

          {/* Estilo row */}
          <div className="flex items-center justify-between py-1.5">
            <span className="text-[12px] text-muted-foreground">Estilo</span>
            <EstiloSwitcher size="sm" />
          </div>

          {/* Modo row — sun/moon icon buttons (REQ-TTC-004) */}
          <div className="flex items-center justify-between py-1.5">
            <span className="text-[12px] text-muted-foreground">Modo</span>
            <ModoIconButtons />
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Placeholder items (PD-3) */}
        <DropdownMenuItem disabled className="cursor-default">
          <span className="flex-1">Mi cuenta</span>
          <span className="text-[9px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
            Próximamente
          </span>
        </DropdownMenuItem>

        <DropdownMenuItem disabled className="cursor-default">
          <span className="flex-1">Preferencias de notificación</span>
          <span className="text-[9px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
            Próximamente
          </span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Cerrar sesión */}
        <DropdownMenuItem
          onClick={onCerrarSesion}
          className="text-peligro-600 focus:text-peligro-600 focus:bg-peligro-600/10 font-medium"
        >
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * ModoIconButtons — botones de ícono sun/moon para alternar modo
 * oscuro/claro. Inlineados para evitar acoplamiento con ThemeToggle.
 *
 * Spec: REQ-TTC-004 — cada botón tiene `aria-pressed` + `aria-label`.
 * Design: D5 — comparte la lógica de ThemeToggle (toggle `dark` en
 * <html> + persistir `ganaweb-theme`), pero sin el wrapper button grande.
 */
function ModoIconButtons() {
  const [dark, setDark] = useState<boolean>(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  )

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
    try {
      localStorage.setItem("ganaweb-theme", dark ? "dark" : "light")
    } catch {
      /* private mode or quota error */
    }
  }, [dark])

  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => setDark(false)}
        aria-pressed={dark}
        aria-label="Cambiar a modo claro"
        className={cn(
          "size-7 rounded-lg flex items-center justify-center",
          "text-muted-foreground hover:bg-muted transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          !dark && "bg-muted text-primary",
        )}
      >
        <Sun aria-hidden="true" className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={() => setDark(true)}
        aria-pressed={!dark}
        aria-label="Cambiar a modo oscuro"
        className={cn(
          "size-7 rounded-lg flex items-center justify-center",
          "text-muted-foreground hover:bg-muted transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          dark && "bg-muted text-primary",
        )}
      >
        <Moon aria-hidden="true" className="size-3.5" />
      </button>
    </div>
  )
}
