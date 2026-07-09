import { cn } from "../lib/utils"
import type { DatoProduccion } from "./types"

/**
 * CardProduccion — "Producción 7 días" del Dashboard / Inicio.
 * Spec: `openspec/changes/dashboard-ganaweb-design/specs/dashboard.md`
 *       §CardProduccion.
 *
 * Reglas encapsuladas:
 * - Título fijo "Producción 7 días" + delta badge: `exito` si el delta es
 *   positivo, `peligro` si es negativo. Cero se trata como neutro
 *   (`text-muted-foreground`) — el spec exige éxito o peligro, pero un
 *   delta exacto de 0,0% no debe mentir con un color de logro.
 * - 7 barras CSS (flexbox puro, sin chart lib) en `bg-dom-produccion`
 *   (token de dominio, no semántico: la producción NO es un estado, es
 *   una categoría de evento — `ganaweb-design.md` §Principios 3).
 * - Altura de cada barra = `(valor / max) * 100%`. El max se calcula
 *   sobre el array completo. Si todos los valores son 0, todas las
 *   barras quedan al mínimo visible (4px) en vez de explotar el layout.
 * - Etiquetas de día bajo cada barra, 10px, `text-tierra-400` (token
 *   `text-muted` del design system v1.2). Las etiquetas YA VIENEN
 *   formateadas (`DatoProduccion.dia` es "Lun", "Mar", …).
 * - Formato es-CO para el delta: signo explícito, decimal con coma
 *   ("+4,2%" / "-1,8%"). El porcentaje se redondea a 1 decimal.
 */
export interface CardProduccionProps {
  /** Array de 7 entradas (Lun → Dom). Se acepta cualquier largo y la
   *  card degrada con menos barras, pero el layout asume 7. */
  datos: DatoProduccion[]
  /** Variación porcentual vs. semana anterior (ej: 4.2 → "+4,2%"). */
  deltaPct: number
  className?: string
}

export function CardProduccion({ datos, deltaPct, className }: CardProduccionProps) {
  const max = datos.reduce((acc, d) => (d.valor > acc ? d.valor : acc), 0)
  const tono = tonoDelta(deltaPct)
  return (
    <section
      className={cn("rounded-card border bg-card p-4 md:p-5 flex flex-col", className)}
      aria-label="Producción 7 días"
    >
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-section font-semibold text-foreground">Producción 7 días</h3>
        <span
          className={cn(
            "px-2 h-6 inline-flex items-center rounded-full",
            "text-caption font-semibold num",
            tono,
          )}
          aria-label={`Variación ${formatearDelta(deltaPct)}`}
        >
          {formatearDelta(deltaPct)}
        </span>
      </header>

      <div
        className="mt-4 grid grid-cols-7 gap-1.5 items-end h-32"
        role="img"
        aria-label={`Producción diaria: ${datos.map((d) => `${d.dia} ${d.valor} L`).join(", ")}`}
      >
        {datos.map((d) => {
          const alto = max > 0 ? Math.max((d.valor / max) * 100, 4) : 4
          return (
            <div key={d.dia} className="h-full flex flex-col justify-end items-stretch">
              <div
                className="w-full rounded-t-sm bg-dom-produccion"
                style={{ height: `${alto}%` }}
                aria-hidden="true"
              />
            </div>
          )
        })}
      </div>

      <div className="mt-1.5 grid grid-cols-7 gap-1.5" aria-hidden="true">
        {datos.map((d) => (
          <span
            key={d.dia}
            className="text-[10px] leading-none text-tierra-400 text-center truncate"
          >
            {d.dia}
          </span>
        ))}
      </div>
    </section>
  )
}

function formatearDelta(delta: number): string {
  if (delta === 0) return "0,0%"
  const signo = delta > 0 ? "+" : "−"
  const abs = Math.abs(delta).toFixed(1).replace(".", ",")
  return `${signo}${abs}%`
}

function tonoDelta(delta: number): string {
  if (delta > 0) return "bg-exito-100 text-exito-600"
  if (delta < 0) return "bg-peligro-100 text-peligro-600"
  return "bg-muted text-muted-foreground"
}
