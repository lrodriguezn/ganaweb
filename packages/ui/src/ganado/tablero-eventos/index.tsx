/**
 * TableroEventos — ruta `/fincas/$fincaId/eventos` (Issue #228,
 * RF-EVENTOS v1.1 §3, EV-UI-001..006).
 *
 * Componente presentacional puro: recibe loader data, callbacks y delegates.
 * No toca el server ni TanStack Router — se testea con loader data pineada
 * (mismo patrón que `SanidadRouteView` y `AnimalsListRouteView`).
 *
 * Layout responsive (sin temas nuevos, sin variante de oscuridad):
 *  - mobile (< 768px):  1 columna para tarjetas + 1 columna para feed.
 *  - tablet (768–1023): 2 columnas para tarjetas + 1 columna para feed.
 *  - desktop (≥ 1024):  4 columnas para tarjetas + 1 columna para feed.
 *
 * Reglas de composición:
 *  - Cero formularios/redux/reducer (D6 + consistencia con #212).
 *  - Cero duplicación con el wizard de #229: el botón "Registrar evento"
 *    solo dispara el callback `onAbrirWizard`; el wizard vive en la ruta.
 *  - Atajos "Registrar →" por tarjeta filtran al wizard por categoría
 *    (`onAbrirWizardConCategoria`).
 *  - Vacío inicial ≠ vacío por filtro (EV-UI-006): copy + acción distintos.
 *  - RBAC: la vista solo renderiza categorías/feed que el loader resolvió
 *    (no infiere del nombre del rol; ya viene filtrado del caso de uso).
 */
import { Baby, ChevronRight, Heart, Milk, Plus, Stethoscope, Truck } from "lucide-react"

import { cn } from "../../lib/utils"
import { Button } from "../../primitives/button"
import { EmptyState } from "../empty-state"
import { PageHeader } from "../page-header"
import type {
  CategoriaEventoMeta,
  CategoriaEventoTablero,
  ContadoresEventosFinca,
  EventoFeedItem,
  FiltrosEventosFinca,
} from "./types.js"

const CATEGORIAS: readonly CategoriaEventoMeta[] = [
  {
    id: "reproductivo",
    label: "Reproductivo",
    descripcion: "Servicios, palpaciones y partos",
    icon: Heart,
    domClass: "text-dom-repro bg-dom-repro-bg",
  },
  {
    id: "sanidad",
    label: "Sanidad",
    descripcion: "Aplicaciones y revisiones veterinarias",
    icon: Stethoscope,
    domClass: "text-dom-sanidad bg-dom-sanidad-bg",
  },
  {
    id: "productivo",
    label: "Productivo",
    descripcion: "Pesajes, producción y condición corporal",
    icon: Milk,
    domClass: "text-dom-produccion bg-dom-produccion-bg",
  },
  {
    id: "movimientos",
    label: "Movimientos",
    descripcion: "Ventas, muertes y traslados",
    icon: Truck,
    domClass: "text-dom-manejo bg-dom-manejo-bg",
  },
] as const

const FORMATEAR_ETIQUETA_MES = (mesYYYYMM: string): string => {
  // "2026-08" → "agosto 2026" (es-CO, sin dependencias extra).
  const [anioStr, mesStr] = mesYYYYMM.split("-")
  if (!anioStr || !mesStr) return mesYYYYMM
  const anio = Number(anioStr)
  const mes = Number(mesStr)
  if (Number.isNaN(anio) || Number.isNaN(mes)) return mesYYYYMM
  const nombres = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ]
  const idx = mes - 1
  if (idx < 0 || idx >= nombres.length) return mesYYYYMM
  return `${nombres[idx]} ${anio}`
}

export interface TableroEventosProps {
  readonly fincaNombre: string
  /** Categorías que la sesión puede ver (RBAC ya aplicado en el loader). */
  readonly categoriasVisibles: readonly CategoriaEventoTablero[]
  /** Categoría actualmente filtrada (undefined = "Todos"). */
  readonly categoriaSeleccionada: CategoriaEventoTablero | undefined
  readonly contadores: ContadoresEventosFinca
  readonly feed: readonly EventoFeedItem[]
  readonly filtros: FiltrosEventosFinca
  /** true = la primera página del feed aún no resolvió. */
  readonly cargandoFeed: boolean
  readonly errorFeed: boolean
  readonly onAbrirWizard: () => void
  readonly onAbrirWizardConCategoria: (categoria: CategoriaEventoTablero) => void
  readonly onSeleccionarCategoria: (categoria: CategoriaEventoTablero | undefined) => void
  readonly onLimpiarFiltros: () => void
  readonly onReintentar: () => void
  readonly onVerHistorial: () => void
}

/**
 * Decide el copy del estado vacío del feed: vacío inicial (sin filtros,
 * sin datos) vs vacío por filtro (datos existen pero el filtro los ocultó).
 */
function copyVacioFeed(
  vacioPorFiltro: boolean,
  categoria: CategoriaEventoTablero | undefined,
): {
  title: string
  description: string
  actionLabel?: string
  actionIcon?: typeof Plus
  onAction?: () => void
} {
  if (vacioPorFiltro) {
    return {
      title: "Sin eventos con este filtro",
      description:
        "No hay eventos que coincidan con la categoría, tipo o rango seleccionados. Ajusta los filtros o limpia la búsqueda.",
      actionLabel: "Limpiar filtros",
    }
  }
  const sufijo = categoria ? ` de ${etiquetaCategoria(categoria).toLowerCase()}` : ""
  return {
    title: `Aún no hay eventos${sufijo}`,
    description:
      "Cuando registres servicios, pesajes, aplicaciones o movimientos, aparecerán aquí en orden cronológico.",
    actionLabel: "Registrar evento",
    actionIcon: Plus,
  }
}

function etiquetaCategoria(id: CategoriaEventoTablero): string {
  return CATEGORIAS.find((c) => c.id === id)?.label ?? id
}

export function TableroEventos({
  fincaNombre,
  categoriasVisibles,
  categoriaSeleccionada,
  contadores,
  feed,
  filtros,
  cargandoFeed,
  errorFeed,
  onAbrirWizard,
  onAbrirWizardConCategoria,
  onSeleccionarCategoria,
  onLimpiarFiltros,
  onReintentar,
  onVerHistorial,
}: TableroEventosProps) {
  const hayFiltrosAplicados = Boolean(
    filtros.categoria || filtros.tipo || filtros.fechaDesde || filtros.fechaHasta,
  )
  const feedVacio = !cargandoFeed && !errorFeed && feed.length === 0
  const vacioPorFiltro = feedVacio && hayFiltrosAplicados

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        titulo="Eventos"
        subtitulo={`Tablero · ${fincaNombre}`}
        acciones={
          <Button onClick={onAbrirWizard} data-testid="eventos-registrar-cta">
            <Plus aria-hidden="true" className="size-4" />
            Registrar evento
          </Button>
        }
      />

      <div
        data-testid="eventos-tarjetas-categoria"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        {CATEGORIAS.filter((c) => categoriasVisibles.includes(c.id)).map((cat) => (
          <TarjetaCategoriaEvento
            key={cat.id}
            categoria={cat}
            contador={contadores.porDominio[cat.id] ?? 0}
            etiquetaMes={FORMATEAR_ETIQUETA_MES(contadores.mes)}
            seleccionada={categoriaSeleccionada === cat.id}
            onSeleccionar={() =>
              onSeleccionarCategoria(categoriaSeleccionada === cat.id ? undefined : cat.id)
            }
            onRegistrar={() => onAbrirWizardConCategoria(cat.id)}
          />
        ))}
      </div>

      <section aria-label="Eventos recientes" className="rounded-card border bg-card p-4 space-y-3">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-section font-semibold text-foreground">Eventos recientes</h2>
            <p className="text-caption text-muted-foreground">
              Mezcla de los 4 dominios autorizados para tu rol.
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={onVerHistorial}
            data-testid="eventos-ver-todo"
            className="self-start"
          >
            Ver todo
            <ChevronRight aria-hidden="true" className="size-4" />
          </Button>
        </header>

        {cargandoFeed ? (
          <FeedSkeleton />
        ) : errorFeed ? (
          <EstadoError onReintentar={onReintentar} />
        ) : feedVacio ? (
          <FeedVacio
            copy={copyVacioFeed(vacioPorFiltro, filtros.categoria)}
            onLimpiar={onLimpiarFiltros}
            onRegistrar={onAbrirWizard}
          />
        ) : (
          <ul className="-mx-1 divide-y divide-tierra-200" data-testid="eventos-feed-lista">
            {feed.map((item) => (
              <li key={item.id} className="px-1 py-3">
                <FilaFeedEvento item={item} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

interface TarjetaCategoriaEventoProps {
  readonly categoria: CategoriaEventoMeta
  readonly contador: number
  readonly etiquetaMes: string
  readonly seleccionada: boolean
  readonly onSeleccionar: () => void
  readonly onRegistrar: () => void
}

function TarjetaCategoriaEvento({
  categoria,
  contador,
  etiquetaMes,
  seleccionada,
  onSeleccionar,
  onRegistrar,
}: TarjetaCategoriaEventoProps) {
  const Icon = categoria.icon
  return (
    <div
      data-testid={`eventos-tarjeta-${categoria.id}`}
      className={cn(
        "rounded-card border bg-card p-4 flex flex-col gap-2 transition-colors duration-100",
        seleccionada ? "border-pasto-500 bg-pasto-100/30" : "border-border",
      )}
    >
      <button
        type="button"
        onClick={onSeleccionar}
        className={cn(
          "flex items-center gap-2 text-left min-h-[--h-touch] rounded-md",
          "hover:bg-muted/40 active:bg-muted transition-colors duration-100",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "-mx-2 px-2",
        )}
        aria-pressed={seleccionada}
      >
        <span
          className={cn(
            "size-9 rounded-full flex items-center justify-center shrink-0",
            categoria.domClass,
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-support font-semibold text-foreground truncate">
            {categoria.label}
          </span>
          <span className="block text-caption text-muted-foreground truncate">
            {categoria.descripcion}
          </span>
        </span>
      </button>

      <p
        className="text-metric num text-foreground"
        data-testid={`eventos-contador-${categoria.id}`}
      >
        {contador}
        <span className="text-support font-normal text-muted-foreground ms-1.5">
          · {etiquetaMes}
        </span>
      </p>

      <Button
        variant="ghost"
        size="sm"
        onClick={onRegistrar}
        data-testid={`eventos-registrar-${categoria.id}`}
        className="self-start text-pasto-600"
      >
        <Plus aria-hidden="true" className="size-4" />
        Registrar {categoria.label.toLowerCase()}
      </Button>
    </div>
  )
}

interface FilaFeedEventoProps {
  readonly item: EventoFeedItem
}

function FilaFeedEvento({ item }: FilaFeedEventoProps) {
  const titulo = item.esCabeceraGrupal
    ? `Registro grupal · ${item.totalAnimales ?? 0} animales`
    : item.animalCodigo
      ? `${item.animalCodigo}${item.animalNombre ? ` · ${item.animalNombre}` : ""}`
      : item.tipo
  return (
    <div className="flex flex-col gap-0.5">
      <span className="block text-support font-medium text-foreground">{titulo}</span>
      <span className="block text-caption text-muted-foreground">
        {etiquetaCategoria(item.dominio)} · {etiquetaTipoLegible(item.tipo)}
        {item.detalle ? ` · ${item.detalle}` : ""}
      </span>
      <span className="block text-caption text-muted-foreground num">
        {formatearFechaCorta(item.fecha)}
      </span>
    </div>
  )
}

function etiquetaTipoLegible(tipo: string): string {
  return tipo
    .split("_")
    .map((parte, i) => (i === 0 ? parte : parte))
    .join(" ")
    .replace(/^./, (letra) => letra.toUpperCase())
}

function formatearFechaCorta(fecha: string): string {
  // ISO YYYY-MM-DD → "5 ago 2026" (es-CO, sin dependencias extra).
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha)
  if (!match) return fecha
  const [, anioStr, mesStr, diaStr] = match
  const anio = Number(anioStr)
  const mes = Number(mesStr)
  const dia = Number(diaStr)
  if (Number.isNaN(anio) || Number.isNaN(mes) || Number.isNaN(dia)) return fecha
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
  return `${dia} ${meses[mes - 1] ?? mes} ${anio}`
}

function FeedSkeleton() {
  return (
    <ul
      className="-mx-1 divide-y divide-tierra-200"
      aria-busy="true"
      data-testid="eventos-feed-skeleton"
    >
      {[0, 1, 2].map((i) => (
        <li key={i} className="px-1 py-3 space-y-2">
          <div className="h-3 w-40 rounded bg-muted animate-pulse" />
          <div className="h-3 w-24 rounded bg-muted animate-pulse" />
        </li>
      ))}
    </ul>
  )
}

interface EstadoErrorProps {
  readonly onReintentar: () => void
}

function EstadoError({ onReintentar }: EstadoErrorProps) {
  return (
    <div className="py-6" role="alert" data-testid="eventos-feed-error">
      <p className="text-support text-peligro-600">No pudimos cargar los eventos recientes.</p>
      <Button variant="secondary" onClick={onReintentar} className="mt-2 min-h-[--h-touch]">
        Reintentar
      </Button>
    </div>
  )
}

interface FeedVacioProps {
  readonly copy: {
    readonly title: string
    readonly description: string
    readonly actionLabel?: string
    readonly actionIcon?: typeof Plus
  }
  readonly onLimpiar: () => void
  readonly onRegistrar: () => void
}

function FeedVacio({ copy, onLimpiar, onRegistrar }: FeedVacioProps) {
  const esLimpiar = copy.actionLabel === "Limpiar filtros"
  return (
    <EmptyState
      icon={Baby}
      title={copy.title}
      description={copy.description}
      {...(copy.actionLabel ? { actionLabel: copy.actionLabel } : {})}
      {...(copy.actionIcon ? { actionIcon: copy.actionIcon } : {})}
      onAction={esLimpiar ? onLimpiar : onRegistrar}
    />
  )
}
