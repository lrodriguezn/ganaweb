import { Moon, Sun } from "lucide-react"
import { useEffect, useState } from "react"

import { cn } from "../lib/utils"
import { EstiloSwitcher } from "./estilo-switcher"

/**
 * AparienciaCard — card de apariencia para la ruta /mas (mobile).
 *
 * Spec: specs/avatar-menu.md §REQ-AM-003 (APARIENCIA section parity).
 * Design: design.md §D6.
 *
 * Reutiliza `EstiloSwitcher` + botones de ícono sun/moon, los mismos
 * que `AvatarMenu` (REQ-TTC-003). No hay wrapper compartido — los dos
 * componentes primitivos son la superficie compartida (D6).
 */
export interface AparienciaCardProps {
  className?: string
}

const STYLE_HINTS = [
  "Campo: contraste máximo para trabajar al sol",
  "Moderna: SaaS esmeralda con gradiente",
  "Índigo: SaaS clásico con acento violeta",
  "Cielo: agro-tech azul confianza",
  "Grafito: premium sobrio con acento ámbar",
]

export function AparienciaCard({ className }: AparienciaCardProps) {
  return (
    <div className={cn("rounded-card bg-card border p-4 space-y-4", className)}>
      {/* APARIENCIA header */}
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
        APARIENCIA
      </p>

      {/* Estilo section */}
      <div className="space-y-2">
        <div>
          <span className="text-[12px] font-medium text-foreground">Estilo visual</span>
          <p className="text-[10px] text-muted-foreground">
            Cinco estilos, un mismo flujo de trabajo
          </p>
        </div>
        <EstiloSwitcher size="sm" />
      </div>

      {/* Modo row */}
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-muted-foreground">Modo oscuro</span>
        <AparienciaModoButtons />
      </div>

      {/* Hint lines */}
      <div className="space-y-1">
        {STYLE_HINTS.map((hint) => (
          <p key={hint} className="text-[10px] text-muted-foreground">
            {hint}
          </p>
        ))}
      </div>
    </div>
  )
}

/**
 * AparienciaModoButtons — sun/moon icon buttons for AparienciaCard.
 * Mirrors ModoIconButtons in AvatarMenu but standalone (D6).
 */
function AparienciaModoButtons() {
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
        aria-pressed={!dark}
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
        aria-pressed={dark}
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
