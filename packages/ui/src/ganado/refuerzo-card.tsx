/**
 * RefuerzoCard — card de refuerzo pendiente del tab Refuerzos
 * (Issue #213, RF-SANIDAD v0.2 §5, SAN-011).
 *
 * Reglas encapsuladas:
 * - SAN-011: producto · propósito en la línea principal; "N animales · vence
 *   {fecha}" debajo; botón "Registrar aplicación" que dispara la precarga
 *   del drawer (producto + animalIds). Tap en la card = mismo callback
 *   ("de alerta a registro masivo en 2 taps").
 * - SAN-080: target táctil mínimo 44px (button con min-h-[44px] + clases
 *   de touch del sistema).
 * - SAN-081 (T-004): tokens semánticos del diseño; theming por tokens, sin
 *   variantes de modo oscuro en className.
 */

import { Syringe } from "lucide-react"

import { cn } from "../lib/utils"
import { Button } from "../primitives/button"

export interface RefuerzoCardItem {
  readonly productoId: string
  readonly codigo: string
  readonly descripcion: string
  readonly proposito: string
  readonly cantidadAnimales: number
  /** ISO YYYY-MM-DD. */
  readonly venceFecha: string
  /** SAN-011: animales del grupo; se entregan al callback para la precarga. */
  readonly animalIds: readonly string[]
}

export interface RefuerzoCardProps {
  readonly refuerzo: RefuerzoCardItem
  readonly onRegistrarAplicacion: (productoId: string, animalIds: readonly string[]) => void
}

export function RefuerzoCard({ refuerzo, onRegistrarAplicacion }: RefuerzoCardProps) {
  const emitir = () => onRegistrarAplicacion(refuerzo.productoId, [...refuerzo.animalIds])
  const animalesLabel = `${refuerzo.cantidadAnimales} ${
    refuerzo.cantidadAnimales === 1 ? "animal" : "animales"
  }`
  return (
    <div className={cn("rounded-card border border-border bg-card p-4", "flex flex-col gap-3")}>
      <button
        type="button"
        onClick={emitir}
        aria-label={`${refuerzo.descripcion} · ${refuerzo.proposito} — ${animalesLabel}, vence ${refuerzo.venceFecha}`}
        className={cn(
          "flex flex-col items-start gap-1 text-left rounded-md -m-1 p-1",
          "hover:bg-muted/40 active:bg-muted transition-colors duration-100",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
      >
        <span className="text-support font-medium text-foreground">
          {refuerzo.descripcion} · {refuerzo.proposito}
        </span>
        <span className="text-caption text-muted-foreground num">
          {`${animalesLabel} · vence ${refuerzo.venceFecha}`}
        </span>
      </button>
      <Button
        type="button"
        variant="outline"
        onClick={emitir}
        className="min-h-[--h-touch] self-start"
      >
        <Syringe aria-hidden="true" className="size-4" />
        Registrar aplicación
      </Button>
    </div>
  )
}
