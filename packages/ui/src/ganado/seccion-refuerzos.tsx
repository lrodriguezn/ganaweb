/**
 * SeccionRefuerzos — cuerpo del tab Refuerzos en mobile (Issue #213,
 * RF-SANIDAD v0.2 §5, SAN-011/SAN-012).
 *
 * Reglas encapsuladas:
 * - D10: 2 periodos en mobile ("ESTA SEMANA" / "PRÓXIMA SEMANA"). El
 *   contador entre paréntesis se calcula del array, no se recibe por prop.
 * - SAN-011: cada refuerzo se renderiza con `RefuerzoCard`; el callback
 *   entrega producto + animalIds para la precarga del drawer.
 * - SAN-012/KPI-10: STOCK CRÍTICO con hasta 4 productos; badge
 *   `Agotado` (estado agotado) o `N dosis` (estado bajo). Sin productos
 *   críticos → "Sin productos críticos.".
 * - PE-001: la sección STOCK CRÍTICO se gatea por permiso `sanidad:ver`.
 *   Los períodos de refuerzos se muestran siempre que la sección se
 *   monte (el caller decide si pasa los datos).
 * - SAN-080/SAN-081: tokens semánticos; theming por tokens, sin variantes
 *   de modo oscuro en className.
 */

import { AlertTriangle } from "lucide-react"

import { cn } from "../lib/utils"
import { RefuerzoCard, type RefuerzoCardItem } from "./refuerzo-card"
import { type PermisosUsuario, tienePermiso } from "./types"

export interface AlertaStockRefuerzoMovil {
  readonly productoId: string
  readonly descripcion: string
  readonly estado: "agotado" | "bajo" | "ok"
  /** Sólo cuando `estado === "bajo"`; UI muestra `${dosis} dosis`. */
  readonly dosis?: number
}

export interface SeccionRefuerzosProps {
  readonly permisos: PermisosUsuario
  readonly estaSemana: readonly RefuerzoCardItem[]
  readonly proximaSemana: readonly RefuerzoCardItem[]
  readonly stock: readonly AlertaStockRefuerzoMovil[]
  readonly onRegistrarAplicacion: (productoId: string, animalIds: readonly string[]) => void
}

const MAX_STOCK_CRITICO = 4

function tituloPeriodo(nombre: string, cantidad: number): string {
  return `${nombre} (${cantidad})`
}

function BadgeStock({ alerta }: { readonly alerta: AlertaStockRefuerzoMovil }) {
  if (alerta.estado === "agotado") {
    return (
      <span className="inline-flex items-center rounded-full bg-peligro-100 px-2.5 py-0.5 text-caption font-medium text-peligro-600">
        Agotado
      </span>
    )
  }
  if (alerta.estado === "bajo") {
    return (
      <span className="inline-flex items-center rounded-full bg-alerta-100 px-2.5 py-0.5 text-caption font-medium num text-alerta-600">
        {`${alerta.dosis ?? 0} dosis`}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-exito-100 px-2.5 py-0.5 text-caption font-medium text-exito-600">
      OK
    </span>
  )
}

function Periodo({
  nombre,
  refuerzos,
  onRegistrar,
}: {
  readonly nombre: string
  readonly refuerzos: readonly RefuerzoCardItem[]
  readonly onRegistrar: (productoId: string, animalIds: readonly string[]) => void
}) {
  return (
    <section aria-label={nombre} className="flex flex-col gap-2">
      <h3 className="text-caption font-semibold tracking-wide text-muted-foreground">
        {tituloPeriodo(nombre, refuerzos.length).toUpperCase()}
      </h3>
      {refuerzos.length === 0 ? null : (
        <ul className="flex flex-col gap-2">
          {refuerzos.map((refuerzo) => (
            <li key={`${refuerzo.productoId}-${refuerzo.venceFecha}`}>
              <RefuerzoCard refuerzo={refuerzo} onRegistrarAplicacion={onRegistrar} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function StockCritico({
  stock,
}: {
  readonly stock: readonly AlertaStockRefuerzoMovil[]
}) {
  const visibles = stock.slice(0, MAX_STOCK_CRITICO)
  return (
    <section
      aria-label="Stock crítico"
      className={cn("rounded-card border border-border bg-card p-4", "flex flex-col gap-2")}
    >
      <h3 className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wide text-muted-foreground">
        <AlertTriangle aria-hidden="true" className="size-3.5 text-peligro-600" />
        Stock crítico
      </h3>
      {visibles.length === 0 ? (
        <p className="text-support text-muted-foreground">Sin productos críticos.</p>
      ) : (
        <ul className="flex flex-col">
          {visibles.map((alerta) => (
            <li
              key={alerta.productoId}
              className="flex items-center gap-3 border-t border-tierra-200 py-3 first:border-t-0 first:pt-0"
            >
              <span className="flex-1 min-w-0">
                <span className="block text-support font-medium text-foreground truncate">
                  {alerta.descripcion}
                </span>
              </span>
              <BadgeStock alerta={alerta} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function SeccionRefuerzos({
  permisos,
  estaSemana,
  proximaSemana,
  stock,
  onRegistrarAplicacion,
}: SeccionRefuerzosProps) {
  const puedeVerStock = tienePermiso(permisos, "sanidad", "ver")
  return (
    <div className="flex flex-col gap-6">
      <Periodo nombre="Esta semana" refuerzos={estaSemana} onRegistrar={onRegistrarAplicacion} />
      <Periodo
        nombre="Próxima semana"
        refuerzos={proximaSemana}
        onRegistrar={onRegistrarAplicacion}
      />
      {puedeVerStock ? <StockCritico stock={stock} /> : null}
    </div>
  )
}
