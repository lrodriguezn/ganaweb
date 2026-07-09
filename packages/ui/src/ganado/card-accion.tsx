import { ChevronRight } from "lucide-react"

import { cn } from "../lib/utils"
import type { AlertaAccion } from "./types"

/**
 * CardAccion — "Requiere acción" del Dashboard / Inicio.
 * Spec: `openspec/changes/dashboard-ganaweb-design/specs/dashboard.md`
 *       §CardAccion.
 *
 * Reglas encapsuladas:
 * - Título fijo "Requiere acción" (NO "atención" — el spec lo corrige
 *   sobre el primer borrador del design.md).
 * - Badge de conteo: `bg-peligro-100 text-peligro-600` (par danger/danger-bg
 *   del design system v1.2). El `count` es independiente del largo de
 *   `alertas` — el dashboard puede mostrar "5" y limitar la lista a 3 filas.
 * - Cada fila: dot coloreado por `severidad` (peligro → `bg-peligro-600`,
 *   alerta → `bg-alerta-600`) + texto + chevron, separadas por divisor
 *   de 1px (`border-tierra-200`).
 * - Si la alerta trae `href`, la fila es un <a> real (semántica link);
 *   si no, se renderiza como fila informativa (no interactiva) con
 *   chevron. Esto evita inflar la card de handlers cuando el destino
 *   ya vive en la URL (la ruta decide si navega o filtra).
 * - Estado vacío (count=0 o array vacío): copy muted, sin lista, sin
 *   divider fantasma.
 */
export interface CardAccionProps {
  /** Total real de alertas en backend; puede ser mayor al largo de `alertas`. */
  count: number
  /** Filas a mostrar en la card (típicamente truncadas). */
  alertas: AlertaAccion[]
  /** Abre la vista filtrada con TODAS las alertas. */
  onVerTodas?: () => void
  className?: string
}

export function CardAccion({ count, alertas, onVerTodas, className }: CardAccionProps) {
  return (
    <section
      className={cn("rounded-card border bg-card p-4 md:p-5 flex flex-col", className)}
      aria-label="Requiere acción"
    >
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-section font-semibold text-foreground">Requiere acción</h3>
        {count > 0 && (
          <span
            className={cn(
              "min-w-6 h-6 px-2 inline-flex items-center justify-center rounded-full",
              "bg-peligro-100 text-peligro-600 text-caption font-semibold num",
            )}
            aria-label={`${count} alertas`}
          >
            {count}
          </span>
        )}
      </header>

      {alertas.length === 0 ? (
        <p className="mt-3 text-support text-tierra-400">Sin alertas pendientes.</p>
      ) : (
        <ul className="mt-2 -mx-1">
          {alertas.map((alerta, idx) => {
            const esUltima = idx === alertas.length - 1
            return (
              <li key={alerta.id}>
                {alerta.href ? (
                  <a
                    href={alerta.href}
                    className={cn(
                      "flex items-center gap-3 px-1 py-3 min-h-[--h-touch] rounded-md",
                      "hover:bg-muted/40 active:bg-muted transition-colors duration-100",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    )}
                  >
                    <FilaContenido alerta={alerta} />
                  </a>
                ) : (
                  <div className="flex items-center gap-3 px-1 py-3 min-h-[--h-touch]">
                    <FilaContenido alerta={alerta} />
                  </div>
                )}
                {!esUltima && <div className="h-px bg-tierra-200" aria-hidden="true" />}
              </li>
            )
          })}
        </ul>
      )}

      {onVerTodas && alertas.length > 0 && (
        <button
          type="button"
          onClick={onVerTodas}
          className={cn(
            "mt-3 self-start min-h-[--h-touch] px-3 -mx-1 inline-flex items-center gap-1",
            "text-support font-medium text-pasto-600 rounded-md",
            "hover:bg-pasto-100/60 active:bg-pasto-100 transition-colors duration-100",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          )}
        >
          Ver todas
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
      )}
    </section>
  )
}

function FilaContenido({ alerta }: { alerta: AlertaAccion }) {
  const dotClass = alerta.severidad === "peligro" ? "bg-peligro-600" : "bg-alerta-600"
  return (
    <>
      <span aria-hidden="true" className={cn("size-2 rounded-full shrink-0", dotClass)} />
      <span className="flex-1 min-w-0 text-support text-foreground truncate">{alerta.texto}</span>
      <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-tierra-400" />
    </>
  )
}
