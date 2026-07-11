import { Plus } from "lucide-react"

import { cn } from "../lib/utils"

/**
 * Fab — botón flotante de acción primaria (48px círculo verde).
 * Spec: `specs/app-shell.md` §Floating action button.
 *
 * Es la MISMA pieza visual que la FAB central del `BottomNav`, expuesta
 * como componente standalone para que un route pueda montarla fuera
 * del shell (ej. vista de detalle con FAB de "agregar nota"). El
 * BottomNav la usa internamente sin importar este componente — está
 * aquí para reuso.
 *
 * Token: bg-primary + text-primary-foreground (que mapea a `--on-primary`
 * = #FFFFFF light / #171512 dark; el oscuro da contraste sobre el verde
 * más claro del dark mode). Sin variantes `dark:`.
 *
 * v1.3 (T-003.3, D12, REQ-BVA-004): la FAB siempre lleva `bg-primary-gradient`
 * además de `bg-primary`. En A --primary-gradient es `none` y solo se ve
 * el color sólido; en B la capa del gradiente (definida en T-001.2) se
 * pinta sobre el mismo primary. La disciplina de gradiente (REQ-BVA-004)
 * dice que solo la FAB + el hero metric + el CTA primario fuera del
 * dashboard pueden tener este marker — la FAB de este componente y la
 * FAB interna de BottomNav lo cumplen.
 */
export interface FabProps {
  onClick?: () => void
  /** Obligatorio: la FAB es siempre un action target identificado. */
  ariaLabel: string
  className?: string
}

export function Fab({ onClick, ariaLabel, className }: FabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "size-12 rounded-full bg-primary text-primary-foreground",
        "bg-primary-gradient",
        "grid place-items-center shrink-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      <Plus aria-hidden="true" className="size-5" />
    </button>
  )
}
