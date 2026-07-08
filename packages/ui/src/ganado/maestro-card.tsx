import { AlertCircle, ChevronRight } from "lucide-react"

import { cn } from "../lib/utils"
import type { MaestroResumen } from "./types"

/**
 * MaestroCard / MaestroGrid — índice de Configuración.
 * Spec: ganaweb-design.md v1.1 §Configuración/Maestros.
 *
 * Reglas encapsuladas:
 * - Card con conteo de registros; si está vacío Y bloquea un proceso,
 *   alerta en danger: "Vacío · requerido para {proceso}".
 * - Agrupación fija: Personas / Ubicación / Clasificación y Comerciales.
 */

export function MaestroCard({
  maestro,
  onPress,
  className,
}: {
  maestro: MaestroResumen
  onPress: (m: MaestroResumen) => void
  className?: string
}) {
  const vacio = maestro.registros === 0
  const bloqueante = vacio && Boolean(maestro.requeridoPara)
  return (
    <button
      type="button"
      onClick={() => onPress(maestro)}
      className={cn(
        "rounded-card border bg-card p-3.5 text-left w-full min-h-[64px]",
        "flex items-center gap-3 hover:bg-muted/40 active:bg-muted",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      <span className="flex-1 min-w-0">
        <span className="block text-support font-medium truncate">{maestro.nombre}</span>
        {bloqueante ? (
          <span className="flex items-center gap-1 text-caption text-peligro-600 mt-0.5">
            <AlertCircle aria-hidden="true" className="size-3" />
            Vacío · requerido para {maestro.requeridoPara}
          </span>
        ) : (
          <span className="block text-caption text-muted-foreground mt-0.5 num">
            {vacio
              ? "Vacío"
              : `${maestro.registros} ${maestro.registros === 1 ? "registro" : "registros"}`}
          </span>
        )}
      </span>
      <ChevronRight
        aria-hidden="true"
        className="size-4 text-muted-foreground shrink-0 md:hidden"
      />
    </button>
  )
}

const GRUPO_LABEL: Record<MaestroResumen["grupo"], string> = {
  personas: "Personas",
  ubicacion: "Ubicación",
  clasificacion: "Clasificación y comerciales",
}

export function MaestroGrid({
  maestros,
  onPress,
}: {
  maestros: MaestroResumen[]
  onPress: (m: MaestroResumen) => void
}) {
  const grupos: MaestroResumen["grupo"][] = ["personas", "ubicacion", "clasificacion"]
  return (
    <div className="space-y-6">
      {grupos.map((g) => {
        const items = maestros.filter((m) => m.grupo === g)
        if (!items.length) return null
        return (
          <section key={g}>
            <h2 className="text-caption font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {GRUPO_LABEL[g]}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {items.map((m) => (
                <MaestroCard key={m.id} maestro={m} onPress={onPress} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

/** Indicador global de preparación: "5 de 8 requeridos completos" */
export function MaestrosProgreso({ maestros }: { maestros: MaestroResumen[] }) {
  const conDependencia = maestros.filter((m) => Boolean(m.requeridoPara) || m.registros > 0)
  const total = conDependencia.length
  const completos = conDependencia.filter((m) => m.registros > 0).length
  if (completos === total) return null // al completarse, desaparece
  return (
    <span className="inline-flex items-center rounded-full bg-alerta-100 text-alerta-600 px-2.5 py-0.5 text-caption font-medium num">
      {completos} de {total} requeridos completos
    </span>
  )
}
