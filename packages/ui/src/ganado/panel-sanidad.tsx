/**
 * PanelSanidad — panel de control desktop del módulo Sanidad (Issue #212,
 * RF-SANIDAD v0.2 §4, SAN-001..SAN-006).
 *
 * Componente presentacional: las fuentes de datos llegan ya resueltas del
 * loader de la ruta (una server function por card). La degradación es por
 * card: una fuente caída se renderiza como aviso local sin tumbar el resto
 * (el `null` modela la card degradada).
 *
 * Reglas encapsuladas:
 * - SAN-001: título "Sanidad" + subtítulo "Panel de control · {finca}".
 * - SAN-002: 4 MetricCards; las de stock navegables cuando se provee
 *   `onVerStock` (llevan al listado filtrado).
 * - SAN-003/SAN-052: Próximas agrupadas en Esta semana / Próxima semana /
 *   Este mes; clic en una fila → `onRegistrarAplicacion(productoId)` con el
 *   producto precargado.
 * - SAN-004: últimas 4 registradas + enlace "Ver historial →".
 * - SAN-005: hasta 4 alertas de stock con badge por estado (el estado llega
 *   calculado del servidor con el umbral real — T-001; nunca se recalcula aquí).
 * - SAN-006/D-007: Accesos con el copy confirmado ("Entradas y stock").
 * - PE-001/SAN-061: los botones de acción se gatean por PERMISO
 *   (`tienePermiso`), nunca por nombre de rol.
 * - SAN-080/SAN-081: theming por tokens; sin variantes de modo oscuro (T-004).
 */

import { ChevronRight, Plus, Syringe } from "lucide-react"

import { cn } from "../lib/utils"
import { Button } from "../primitives/button"
import { MetricCard } from "./metric-card"
import { PageHeader } from "./page-header"
import { type PermisosUsuario, tienePermiso } from "./types"

/** SAN-002: métricas del panel (contados). */
export interface MetricasPanelSanidad {
  readonly aplicacionesEstaSemana: number
  readonly animalesEnTratamiento: number
  readonly stockCritico: number
  readonly productosAgotados: number
}

/** SAN-003: fila de refuerzo pendiente ya agrupada por producto/período. */
export interface RefuerzoPendientePanelVista {
  readonly productoId: string
  readonly codigo: string
  readonly descripcion: string
  readonly proposito: string
  readonly cantidadAnimales: number
  /** ISO YYYY-MM-DD. */
  readonly venceFecha: string
}

/** SAN-052: los tres períodos de la semana natural. */
export interface PeriodosRefuerzosPanelVista {
  readonly estaSemana: readonly RefuerzoPendientePanelVista[]
  readonly proximaSemana: readonly RefuerzoPendientePanelVista[]
  readonly esteMes: readonly RefuerzoPendientePanelVista[]
}

/** SAN-004: última aplicación registrada. */
export interface UltimaAplicacionPanelVista {
  readonly id: string
  /** ISO YYYY-MM-DD. */
  readonly fecha: string
  readonly productoDescripcion: string
  readonly objetivo: "animal" | "lote"
  readonly cantidadAnimales: number
  readonly responsable: string | null
}

/** SAN-005/KPI-10: alerta de stock con el estado ya calculado. */
export interface AlertaStockPanelVista {
  readonly productoId: string
  readonly codigo: string
  readonly descripcion: string
  readonly dosisDisponibles: number
  readonly estado: "agotado" | "bajo" | "ok"
}

/** SAN-006: destinos de la card Accesos. */
export type AccesoPanelSanidadDestino = "catalogo" | "historial" | "almacen" | "diagnosticos"

export interface PanelSanidadProps {
  readonly fincaNombre: string
  /** PE-001: permisos efectivos de la finca activa (gateo por permiso). */
  readonly permisos: PermisosUsuario
  /** null = card degradada (la fuente cayó). */
  readonly metricas: MetricasPanelSanidad | null
  readonly proximas: PeriodosRefuerzosPanelVista | null
  readonly ultimas: readonly UltimaAplicacionPanelVista[] | null
  readonly stock: readonly AlertaStockPanelVista[] | null
  /** SAN-003: abre el registro de aplicación con el producto precargado. */
  readonly onRegistrarAplicacion: (productoId: string) => void
  /** SAN-014/#210: abre la entrada de almacén. */
  readonly onEntradaAlmacen: () => void
  /** SAN-004: href real del historial (enlace accesible); onVerHistorial navega. */
  readonly hrefHistorial: string
  readonly onVerHistorial: () => void
  readonly onNavegarAcceso: (destino: AccesoPanelSanidadDestino) => void
  /** SAN-002: navegación de las métricas de stock al listado filtrado. */
  readonly onVerStock?: () => void
}

const CARD = "rounded-card border bg-card p-4 md:p-5 flex flex-col"
const CARD_TITULO = "text-section font-semibold text-foreground"
const AVISO_DEGRADACION = "mt-3 text-support text-muted-foreground"

function AvisoDegradacion({ mensaje }: { readonly mensaje: string }) {
  return <p className={AVISO_DEGRADACION}>{mensaje}</p>
}

function FilaRefuerzo({
  refuerzo,
  onRegistrar,
}: {
  readonly refuerzo: RefuerzoPendientePanelVista
  readonly onRegistrar: (productoId: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onRegistrar(refuerzo.productoId)}
      className={cn(
        "w-full flex items-center gap-3 px-1 py-3 min-h-[--h-touch] rounded-md text-left",
        "hover:bg-muted/40 active:bg-muted transition-colors duration-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
    >
      <span className="flex-1 min-w-0">
        <span className="block text-support font-medium text-foreground truncate">
          {refuerzo.descripcion} · {refuerzo.proposito}
        </span>
        <span className="block text-caption text-muted-foreground num">
          {`${refuerzo.cantidadAnimales} ${refuerzo.cantidadAnimales === 1 ? "animal" : "animales"} · vence ${refuerzo.venceFecha}`}
        </span>
      </span>
      <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-tierra-400" />
    </button>
  )
}

function SeccionPeriodo({
  titulo,
  filas,
  onRegistrar,
}: {
  readonly titulo: string
  readonly filas: readonly RefuerzoPendientePanelVista[]
  readonly onRegistrar: (productoId: string) => void
}) {
  if (filas.length === 0) return null
  return (
    <div>
      <h4 className="text-caption font-medium text-muted-foreground uppercase tracking-wide">
        {titulo}
      </h4>
      <ul className="mt-1 -mx-1 divide-y divide-tierra-200">
        {filas.map((refuerzo) => (
          <li key={`${refuerzo.productoId}-${refuerzo.venceFecha}`}>
            <FilaRefuerzo refuerzo={refuerzo} onRegistrar={onRegistrar} />
          </li>
        ))}
      </ul>
    </div>
  )
}

const BADGE_ESTADO_STOCK: Record<
  AlertaStockPanelVista["estado"],
  { readonly clase: string; readonly texto: (alerta: AlertaStockPanelVista) => string }
> = {
  agotado: { clase: "bg-peligro-100 text-peligro-600", texto: () => "Agotado" },
  bajo: {
    clase: "bg-alerta-100 text-alerta-600",
    texto: (alerta) => `${alerta.dosisDisponibles} dosis`,
  },
  ok: { clase: "bg-exito-100 text-exito-600", texto: () => "OK" },
}

const ACCESOS: readonly {
  readonly destino: AccesoPanelSanidadDestino
  readonly titulo: string
  readonly descripcion: string
}[] = [
  {
    destino: "catalogo",
    titulo: "Catálogo de productos",
    descripcion: "Productos sanitarios y dosis",
  },
  {
    destino: "historial",
    titulo: "Historial de aplicaciones",
    descripcion: "Registro completo por animal",
  },
  // D-007: copy confirmado "Entradas y stock" (el esquema v3 no respalda vencimientos).
  { destino: "almacen", titulo: "Almacén e inventario", descripcion: "Entradas y stock" },
  {
    destino: "diagnosticos",
    titulo: "Diagnósticos veterinarios",
    descripcion: "Revisiones y tratamientos",
  },
]

/** SAN-003/SAN-052: cuerpo de la card Próximas (degradada / vacía / períodos). */
function ContenidoProximas({
  proximas,
  onRegistrar,
}: {
  readonly proximas: PeriodosRefuerzosPanelVista | null
  readonly onRegistrar: (productoId: string) => void
}) {
  if (proximas === null) {
    return <AvisoDegradacion mensaje="No se pudieron cargar las próximas aplicaciones." />
  }
  const sinRefuerzos =
    proximas.estaSemana.length === 0 &&
    proximas.proximaSemana.length === 0 &&
    proximas.esteMes.length === 0
  if (sinRefuerzos) {
    return <p className="mt-3 text-support text-muted-foreground">Sin refuerzos pendientes.</p>
  }
  return (
    <div className="mt-2 space-y-4">
      <SeccionPeriodo titulo="Esta semana" filas={proximas.estaSemana} onRegistrar={onRegistrar} />
      <SeccionPeriodo
        titulo="Próxima semana"
        filas={proximas.proximaSemana}
        onRegistrar={onRegistrar}
      />
      <SeccionPeriodo titulo="Este mes" filas={proximas.esteMes} onRegistrar={onRegistrar} />
    </div>
  )
}

export function PanelSanidad({
  fincaNombre,
  permisos,
  metricas,
  proximas,
  ultimas,
  stock,
  onRegistrarAplicacion,
  onEntradaAlmacen,
  hrefHistorial,
  onVerHistorial,
  onNavegarAcceso,
  onVerStock,
}: PanelSanidadProps) {
  // PE-001/SAN-061: las acciones de escritura se gatean por permiso.
  const puedeCrear = tienePermiso(permisos, "sanidad", "crear")

  return (
    <div className="space-y-4">
      <PageHeader
        titulo="Sanidad"
        subtitulo={`Panel de control · ${fincaNombre}`}
        acciones={
          puedeCrear ? (
            <>
              <Button variant="outline" onClick={onEntradaAlmacen}>
                <Plus aria-hidden="true" className="size-4" />+ Entrada almacén
              </Button>
              <Button onClick={() => onRegistrarAplicacion("")}>
                <Syringe aria-hidden="true" className="size-4" />
                Registrar aplicación
              </Button>
            </>
          ) : null
        }
      />

      {/* SAN-002: métricas */}
      {metricas === null ? (
        <AvisoDegradacion mensaje="No se pudo cargar las métricas." />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard label="Aplicaciones esta semana" value={metricas.aplicacionesEstaSemana} />
          <MetricCard label="Animales en tratamiento" value={metricas.animalesEnTratamiento} />
          <MetricCard
            label="Stock crítico"
            value={metricas.stockCritico}
            critical={metricas.stockCritico > 0}
            {...(onVerStock ? { onPress: onVerStock } : {})}
          />
          <MetricCard
            label="Productos agotados"
            value={metricas.productosAgotados}
            critical={metricas.productosAgotados > 0}
            {...(onVerStock ? { onPress: onVerStock } : {})}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* SAN-003/SAN-052: próximas aplicaciones */}
        <section aria-label="Próximas aplicaciones" className={CARD}>
          <h3 className={CARD_TITULO}>Próximas aplicaciones</h3>
          <ContenidoProximas proximas={proximas} onRegistrar={onRegistrarAplicacion} />
        </section>

        {/* SAN-004: últimas registradas */}
        <section aria-label="Últimas aplicaciones registradas" className={CARD}>
          <h3 className={CARD_TITULO}>Últimas aplicaciones registradas</h3>
          {ultimas === null ? (
            <AvisoDegradacion mensaje="No se pudieron cargar las últimas aplicaciones." />
          ) : ultimas.length === 0 ? (
            <p className="mt-3 text-support text-muted-foreground">Sin aplicaciones registradas.</p>
          ) : (
            <>
              <ul className="mt-2 -mx-1 divide-y divide-tierra-200">
                {ultimas.map((aplicacion) => (
                  <li key={aplicacion.id} className="px-1 py-3">
                    <span className="block text-support font-medium text-foreground">
                      {aplicacion.productoDescripcion}
                    </span>
                    <span className="block text-caption text-muted-foreground">
                      {aplicacion.objetivo === "lote" ? "Lote" : "Animal"} ·{" "}
                      {aplicacion.cantidadAnimales}{" "}
                      {aplicacion.cantidadAnimales === 1 ? "animal" : "animales"}
                    </span>
                    <span className="block text-caption text-muted-foreground num">
                      {aplicacion.fecha} · {aplicacion.responsable ?? "—"}
                    </span>
                  </li>
                ))}
              </ul>
              <a
                href={hrefHistorial}
                onClick={(evento) => {
                  evento.preventDefault()
                  onVerHistorial()
                }}
                className={cn(
                  "mt-3 self-start min-h-[--h-touch] px-3 -mx-1 inline-flex items-center gap-1",
                  "text-support font-medium text-pasto-600 rounded-md",
                  "hover:bg-pasto-100/60 active:bg-pasto-100 transition-colors duration-100",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                )}
              >
                Ver historial
                <ChevronRight aria-hidden="true" className="size-4" />
              </a>
            </>
          )}
        </section>

        {/* SAN-005: alertas de stock */}
        <section aria-label="Alertas de stock" className={CARD}>
          <h3 className={CARD_TITULO}>Alertas de stock</h3>
          {stock === null ? (
            <AvisoDegradacion mensaje="No se pudieron cargar las alertas de stock." />
          ) : stock.length === 0 ? (
            <p className="mt-3 text-support text-muted-foreground">
              Sin productos en el inventario.
            </p>
          ) : (
            <ul className="mt-2 -mx-1 divide-y divide-tierra-200">
              {stock.map((alerta) => {
                const badge = BADGE_ESTADO_STOCK[alerta.estado]
                return (
                  <li key={alerta.productoId} className="flex items-center gap-3 px-1 py-3">
                    <span className="flex-1 min-w-0">
                      <span className="block text-support font-medium text-foreground truncate">
                        {alerta.descripcion}
                      </span>
                      <span className="block text-caption text-muted-foreground">
                        {alerta.codigo}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-caption font-medium num",
                        badge.clase,
                      )}
                    >
                      {badge.texto(alerta)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* SAN-006/D-007: accesos */}
        <section aria-label="Accesos" className={CARD}>
          <h3 className={CARD_TITULO}>Accesos</h3>
          <ul className="mt-2 -mx-1 divide-y divide-tierra-200">
            {ACCESOS.map((acceso) => (
              <li key={acceso.destino}>
                <button
                  type="button"
                  onClick={() => onNavegarAcceso(acceso.destino)}
                  className={cn(
                    "w-full flex items-center gap-3 px-1 py-3 min-h-[--h-touch] rounded-md text-left",
                    "hover:bg-muted/40 active:bg-muted transition-colors duration-100",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  )}
                >
                  <span className="flex-1 min-w-0">
                    <span className="block text-support font-medium text-foreground">
                      {acceso.titulo}
                    </span>
                    <span className="block text-caption text-muted-foreground">
                      {acceso.descripcion}
                    </span>
                  </span>
                  <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-tierra-400" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
