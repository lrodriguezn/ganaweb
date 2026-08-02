/**
 * `PageHeader` — reusable page-level heading with optional subtitle and
 * action slot.
 *
 * Replaces the duplicated "title + buttons" pattern that appeared in
 * `BarraAcciones` (animal-listado-desktop), `AnimalDesktopScreen`, and
 * `AnimalListMobile` (animal-crud). Centralizes typography, spacing,
 * and the `<h1>` semantic element.
 *
 * The `acciones` slot uses `flex-wrap` so actions wrap below the title
 * on narrow viewports instead of overflowing.
 *
 * Issue: #138 (R2 + R3).
 */

import type { ReactNode } from "react"
import { cn } from "../lib/utils"

export interface PageHeaderProps {
  /** Page title — rendered as `<h1>`. */
  readonly titulo: string
  /** Optional subtitle rendered below the title. */
  readonly subtitulo?: string
  /** Action slot (buttons, etc.) — wraps below title on narrow viewports. */
  readonly acciones?: ReactNode
  /** Additional classes for the outer wrapper. */
  readonly className?: string
}

export function PageHeader({ titulo, subtitulo, acciones, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-4", className)}>
      <div>
        <h1 className="text-title font-semibold">{titulo}</h1>
        {subtitulo && <p className="text-support text-muted-foreground">{subtitulo}</p>}
      </div>
      {acciones && <div className="flex items-center gap-2">{acciones}</div>}
    </div>
  )
}
