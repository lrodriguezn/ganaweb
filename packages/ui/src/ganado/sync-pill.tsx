import { CloudOff } from "lucide-react"

import { cn } from "../lib/utils"
import type { EstadoSync } from "./types"

/**
 * SyncPill — indicador global de sincronización, siempre visible en el header.
 * Spec: especificaciones_diseno_css.md §6.4
 * Reglas: nunca modal bloqueante; offline es estado normal, no error.
 * El tap abre el panel de sincronización (Popover en desktop, Drawer en mobile)
 * — ese panel se conecta desde fuera vía onClick.
 */
export interface SyncPillProps {
  estado: EstadoSync
  /** Cantidad de registros en la cola local (solo estado "pendiente") */
  pendientes?: number
  /** Oculta el texto y deja solo el indicador (header mobile) */
  compact?: boolean
  onClick?: () => void
  className?: string
}

export function SyncPill({
  estado,
  pendientes = 0,
  compact = false,
  onClick,
  className,
}: SyncPillProps) {
  const base = cn(
    "inline-flex items-center gap-1.5 rounded-full text-caption font-medium",
    "min-h-[--h-touch] md:min-h-0 px-2.5 py-1",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    className,
  )

  if (estado === "sincronizado") {
    return (
      <button type="button" onClick={onClick} className={cn(base, "text-exito-600")}>
        <span aria-hidden="true" className="size-2 rounded-full bg-exito-600" />
        {compact ? <span className="sr-only">Sincronizado</span> : "Sincronizado"}
      </button>
    )
  }

  if (estado === "pendiente") {
    return (
      <button type="button" onClick={onClick} className={cn(base, "bg-alerta-100 text-alerta-600")}>
        <span className="num">{pendientes}</span>
        {compact ? (
          <span className="sr-only">registros pendientes de sincronizar</span>
        ) : (
          "pendientes"
        )}
      </button>
    )
  }

  return (
    <button type="button" onClick={onClick} className={cn(base, "text-muted-foreground")}>
      <CloudOff aria-hidden="true" className="size-3.5" />
      {compact ? <span className="sr-only">Sin conexión</span> : "Offline"}
    </button>
  )
}
