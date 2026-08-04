import { AlertCircle, ChevronRight } from "lucide-react"

import { cn } from "../lib/utils"
import type { MaestroResumen } from "./types"

/**
 * MaestroCard / MaestroGrid / MaestrosProgreso — índice de Configuración.
 * Spec: ganaweb-design.md v1.1 §Configuración/Maestros + issue #149
 * (RF-CONFIG-MAESTROS v1.0, CM-003..CM-014, decisiones S-1/S-3).
 *
 * Reglas encapsuladas:
 * - Card con conteo de registros; si está vacío Y bloquea un proceso,
 *   alerta danger: "Vacío · requerido para {proceso}". Vacío no bloqueante:
 *   alerta "Vacío" en color alerta (frame-20073).
 * - CM-014: item degradado muestra "—" en el conteo, sin alerta de vacío;
 *   el hub sigue renderizando.
 * - CM-006/CM-008: `registrosSecundario` renderiza el doble conteo "N · M"
 *   (card Lotes · Grupos).
 * - `variante="fila"` (issue #149): fila mobile de 56px con chevron visible
 *   (frame-20188); `variante="card"` es la card desktop de 64px.
 * - Agrupación fija: Personas / Ubicación / Clasificación y Comerciales.
 */

export type MaestroCardVariante = "card" | "fila"

function textoConteo(maestro: MaestroResumen): string {
  if (maestro.registrosSecundario !== undefined) {
    return `${maestro.registros} · ${maestro.registrosSecundario}`
  }
  return `${maestro.registros} ${maestro.registros === 1 ? "registro" : "registros"}`
}

const CLASES_INTERACCION = [
  "flex items-center gap-3 hover:bg-muted/40 active:bg-muted",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
].join(" ")

export function MaestroCard({
  maestro,
  onPress,
  variante = "card",
  className,
}: {
  maestro: MaestroResumen
  onPress: (m: MaestroResumen) => void
  /** CM-009 (issue #149): "fila" = fila mobile 56px; "card" = card desktop. */
  variante?: MaestroCardVariante
  className?: string
}) {
  const vacio = maestro.registros === 0 && !maestro.degradado
  const bloqueante = vacio && Boolean(maestro.requeridoPara)
  const esFila = variante === "fila"
  return (
    <button
      type="button"
      onClick={() => onPress(maestro)}
      className={cn(
        "rounded-card border bg-card text-left w-full",
        esFila ? "min-h-[56px] px-4 py-2" : "min-h-[64px] p-3.5",
        CLASES_INTERACCION,
        className,
      )}
    >
      <span className="flex-1 min-w-0">
        <span className="block text-support font-medium truncate">{maestro.nombre}</span>
        {bloqueante ? (
          <span className="flex items-center gap-1 text-caption text-peligro-600 mt-0.5">
            <AlertCircle aria-hidden="true" className="size-3 shrink-0" />
            Vacío · requerido para {maestro.requeridoPara}
          </span>
        ) : maestro.degradado ? (
          <span
            className="block text-caption text-muted-foreground mt-0.5 num"
            aria-label={`Conteo de ${maestro.nombre} no disponible`}
          >
            —
          </span>
        ) : vacio ? (
          <span className="flex items-center gap-1 text-caption text-alerta-600 mt-0.5">
            <AlertCircle aria-hidden="true" className="size-3 shrink-0" />
            Vacío
          </span>
        ) : (
          <span className="block text-caption text-muted-foreground mt-0.5 num">
            {textoConteo(maestro)}
          </span>
        )}
      </span>
      <ChevronRight
        aria-hidden="true"
        className={cn("size-4 text-muted-foreground shrink-0", !esFila && "md:hidden")}
      />
    </button>
  )
}

/**
 * S-1 (issue #149, CM-009): fila consolidada mobile — UNA fila con label
 * compuesto y conteo construido de los miembros ("1 · 8 · 4"), que abre el
 * sub-menú del grupo. Mismo alto/estilo que `MaestroCard variante="fila"`.
 */
export function MaestroFilaConsolidada({
  label,
  conteo,
  onPress,
  className,
}: {
  label: string
  /** Conteo compuesto de los miembros; los degradados aportan "—". */
  conteo: string
  onPress: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={cn(
        "rounded-card border bg-card text-left w-full min-h-[56px] px-4 py-2",
        CLASES_INTERACCION,
        className,
      )}
    >
      <span className="flex-1 min-w-0">
        <span className="block text-support font-medium truncate">{label}</span>
        <span className="block text-caption text-muted-foreground mt-0.5 num">{conteo}</span>
      </span>
      <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground shrink-0" />
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
  variante = "card",
}: {
  maestros: MaestroResumen[]
  onPress: (m: MaestroResumen) => void
  /** "fila" (issue #149): lista apilada sin encabezados de grupo. */
  variante?: MaestroCardVariante
}) {
  if (variante === "fila") {
    return (
      <div className="flex flex-col gap-2">
        {maestros.map((m) => (
          <MaestroCard key={m.id} maestro={m} onPress={onPress} variante="fila" />
        ))}
      </div>
    )
  }
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

/**
 * CM-011 + S-3 (issue #149): "N de 8 requeridos completos".
 * El total son SÓLO los items con `requeridoPara` (los 8 fijos del
 * requisito §3.3); los no requeridos con registros no alteran el total.
 * Los degradados no cuentan como completos. Al completarse, desaparece.
 */
export function MaestrosProgreso({ maestros }: { maestros: MaestroResumen[] }) {
  const requeridos = maestros.filter((m) => Boolean(m.requeridoPara))
  const total = requeridos.length
  const completos = requeridos.filter((m) => m.registros > 0 && !m.degradado).length
  if (completos === total) return null
  return (
    <span className="inline-flex items-center rounded-full bg-alerta-100 text-alerta-600 px-2.5 py-0.5 text-caption font-medium num">
      {completos} de {total} requeridos completos
    </span>
  )
}
