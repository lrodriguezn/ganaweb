import { cn } from "../lib/utils"
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
 */
export interface CardActividadProps {
  actividades: ActividadReciente[]
  className?: string
}

export function CardActividad({ actividades, className }: CardActividadProps) {
  return (
    <section
      className={cn("rounded-card border bg-card p-4 md:p-5 flex flex-col", className)}
      aria-label="Actividad reciente"
    >
      <h3 className="text-section font-semibold text-foreground">Actividad reciente</h3>

      {actividades.length === 0 ? (
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
      )}
    </section>
  )
}
