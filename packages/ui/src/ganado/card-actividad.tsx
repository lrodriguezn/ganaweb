import { ChevronDown } from "lucide-react"

import { cn } from "../lib/utils"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../primitives/collapsible"
import type { ActividadReciente } from "./types"

/**
 * CardActividad — "Actividad reciente" del Dashboard / Inicio.
 * Spec: `openspec/changes/dashboard-ganaweb-design/specs/dashboard.md`
 *       §CardActividad.
 *
 * Reglas encapsuladas:
 * - Título fijo "Actividad reciente".
 * - Filas: descripción (izquierda, truncable) + timestamp (derecha,
 *   `text-tierra-400` = token `text-muted` v1.2). El timestamp NO
 *   se trunca — la fecha corta es contrato del backend (ej. "Hace 2 h",
 *   "Ayer"). Si se vuelve largo en alguna locale, el ancho del bloque
 *   derecho se congela y la descripción absorbe.
 * - Filas separadas por 1px divider (`bg-tierra-200`, NO `border` —
 *   border-top en cada <li> mete doble línea en el primero).
 * - Ellipsis en la descripción cuando excede el ancho — el bloque
 *   izquierdo es `min-w-0` para que `truncate` funcione dentro del flex.
 * - Si la lista viene vacía, copy muted consistente con CardAccion.
 *
 * v1.2 (PR3): modo `accordion`. En mobile (< 768px) el título se vuelve
 * un botón disclosure con chevron; en desktop (≥ 768px) se renderiza
 * como `<h3>` plano y la lista siempre visible. El CSS es el que decide
 * qué variante se ve — el JS (Radix Collapsible) solo controla la
 * visibilidad del contenido en mobile. En desktop el trigger está
 * oculto y por tanto el estado del Collapsible no cambia.
 */
export interface CardActividadProps {
  actividades: ActividadReciente[]
  /** v1.2 (PR3): true → disclosure en mobile, expandido en desktop. */
  accordion?: boolean
  className?: string
}

export function CardActividad({ actividades, accordion = false, className }: CardActividadProps) {
  const list = actividades.length === 0 ? (
    <p className="mt-3 text-support text-tierra-400">Sin actividad reciente.</p>
  ) : (
    <ul className="mt-2 -mx-1">
      {actividades.map((act, idx) => {
        const esUltima = idx === actividades.length - 1
        return (
          <li key={act.id} className="px-1">
            <div className="flex items-center gap-3 py-3 min-w-0">
              <span className="flex-1 min-w-0 text-support text-foreground truncate">
                {act.descripcion}
              </span>
              <span className="shrink-0 text-caption text-tierra-400 whitespace-nowrap num">
                {act.tiempo}
              </span>
            </div>
            {!esUltima && <div className="h-px bg-tierra-200" aria-hidden="true" />}
          </li>
        )
      })}
    </ul>
  )

  if (!accordion) {
    return (
      <section
        className={cn("rounded-card border bg-card p-4 md:p-5 flex flex-col", className)}
        aria-label="Actividad reciente"
      >
        <h3 className="text-section font-semibold text-foreground">Actividad reciente</h3>
        {list}
      </section>
    )
  }

  return (
    <section
      className={cn("rounded-card border bg-card p-4 md:p-5 flex flex-col", className)}
      aria-label="Actividad reciente"
    >
      <Collapsible defaultOpen>
        {/* Mobile (< md): trigger como botón con chevron. Desktop (md+):
           trigger OCULTO y h3 plano — el botón no es interactivo y el
           estado del Collapsible queda en `open` (defaultOpen + sin
           trigger visible que pueda cerrarlo). */}
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              "md:hidden -mx-1 px-1 py-1 flex w-full items-center justify-between gap-2",
              "rounded-md focus-visible:outline-none focus-visible:ring-2",
              "focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
            aria-label="Mostrar u ocultar actividad reciente"
          >
            <h3 className="text-section font-semibold text-foreground text-left">
              Actividad reciente
            </h3>
            <ChevronDown
              aria-hidden="true"
              className="size-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180"
            />
          </button>
        </CollapsibleTrigger>
        <h3 className="hidden md:block text-section font-semibold text-foreground">
          Actividad reciente
        </h3>
        <CollapsibleContent>{list}</CollapsibleContent>
      </Collapsible>
    </section>
  )
}
