/**
 * HistorialEventos — vista "Ver todo" del Tablero (Issue #228,
 * RF-EVENTOS v1.1 §3, EV-UI-005). Paginado y filtrable, mismo
 * contrato visual que el feed pero con todas las filas y paginación.
 *
 * Sin duplicación de formularios/redux/reducer (D6): es presentacional puro,
 * recibe loader data por props y emite callbacks. El loader + server fn ya
 * paginan keyset (#227 / #183) — acá solo se renderiza y se navega.
 *
 * Empty-states consistentes con `TableroEventos`:
 *  - Vacío inicial (sin filtros): CTA "Registrar evento" con icono Plus.
 *  - Vacío por filtro: acción "Limpiar filtros".
 *  - Error: reintento.
 *  - Loading: skeleton.
 */
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"

import { cn } from "../../lib/utils"
import { Button } from "../../primitives/button"
import { EmptyState } from "../empty-state"
import type {
  CategoriaEventoTablero,
  ContadoresEventosFinca,
  EventoHistorialItem,
  FiltrosEventosFinca,
} from "./types.js"

export interface HistorialEventosProps {
  readonly feed: readonly EventoHistorialItem[]
  readonly categoria: CategoriaEventoTablero | undefined
  readonly contadores: ContadoresEventosFinca
  readonly filtros: FiltrosEventosFinca
  readonly cargando: boolean
  readonly error: boolean
  /** Cursor siguiente del feed actual (keyset, ver #227 / #183). */
  readonly nextCursor?: string
  readonly pendientes?: number
  readonly paginaActual: number
  readonly onAplicarFiltros: (filtros: FiltrosEventosFinca) => void
  readonly onLimpiarFiltros: () => void
  readonly onPaginaSiguiente: () => void
  readonly onPaginaAnterior: () => void
  readonly onReintentar: () => void
  readonly onRegistrar: () => void
  readonly puedeAnular?: boolean | ((dominio: CategoriaEventoTablero) => boolean)
  readonly onAnular?: (evento: EventoHistorialItem) => void
  readonly onCorregir?: (evento: EventoHistorialItem) => void
}

const _TAMANO_PAGINA = 20

export function HistorialEventos({
  feed,
  categoria,
  contadores,
  filtros,
  cargando,
  error,
  nextCursor,
  pendientes,
  paginaActual,
  onAplicarFiltros,
  onLimpiarFiltros,
  onPaginaSiguiente,
  onPaginaAnterior,
  onReintentar,
  onRegistrar,
  puedeAnular = false,
  onAnular = () => {},
  onCorregir = () => {},
}: HistorialEventosProps) {
  const hayFiltrosAplicados = Boolean(
    filtros.categoria || filtros.tipo || filtros.fechaDesde || filtros.fechaHasta,
  )
  const vacio = !cargando && !error && feed.length === 0
  const vacioPorFiltro = vacio && hayFiltrosAplicados
  const haySiguiente = Boolean(nextCursor) || (pendientes !== undefined && pendientes > 0)
  const hayAnterior = paginaActual > 1

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <header className="space-y-1">
        <h1 className="text-title font-semibold text-foreground">Historial de eventos</h1>
        <p className="text-support text-muted-foreground">
          Todas las filas, filtrables y paginadas. {contadores.total} eventos en el mes en curso.
        </p>
      </header>

      <FiltrosEventos
        filtros={filtros}
        categoriaActual={categoria}
        onAplicar={onAplicarFiltros}
        onLimpiar={onLimpiarFiltros}
      />

      <section
        aria-label="Listado de eventos"
        className="rounded-card border bg-card p-4 space-y-3"
      >
        {cargando ? (
          <HistorialSkeleton />
        ) : error ? (
          <HistorialError onReintentar={onReintentar} />
        ) : vacio ? (
          <HistorialVacio
            vacioPorFiltro={vacioPorFiltro}
            onLimpiar={onLimpiarFiltros}
            onRegistrar={onRegistrar}
          />
        ) : (
          <>
            <ul className="-mx-1 divide-y divide-tierra-200" data-testid="eventos-historial-lista">
              {feed.map((item) => (
                <li key={item.id} className="px-1 py-3">
                  <FilaHistorialEvento
                    item={item}
                    puedeAnular={
                      typeof puedeAnular === "function" ? puedeAnular(item.dominio) : puedeAnular
                    }
                    onAnular={onAnular}
                    onCorregir={onCorregir}
                  />
                </li>
              ))}
            </ul>
            <nav
              aria-label="Paginación"
              className="flex items-center justify-between pt-2"
              data-testid="eventos-historial-paginacion"
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={onPaginaAnterior}
                disabled={!hayAnterior}
                data-testid="eventos-pagina-anterior"
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
                Anterior
              </Button>
              <span className="text-caption text-muted-foreground">Página {paginaActual}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onPaginaSiguiente}
                disabled={!haySiguiente}
                data-testid="eventos-pagina-siguiente"
              >
                Siguiente
                <ChevronRight aria-hidden="true" className="size-4" />
              </Button>
            </nav>
          </>
        )}
      </section>
    </div>
  )
}

const TIPO_FILTRO_OPCIONES: ReadonlyArray<{
  readonly categoria: CategoriaEventoTablero
  readonly tipos: readonly string[]
}> = [
  { categoria: "reproductivo", tipos: ["servicio", "palpacion", "parto"] },
  { categoria: "sanidad", tipos: ["aplicacion_sanitaria", "revision_veterinaria"] },
  { categoria: "productivo", tipos: ["pesaje", "produccion_lactea", "condicion_corporal"] },
  { categoria: "movimientos", tipos: ["venta", "muerte", "traslado"] },
]

interface FiltrosEventosProps {
  readonly filtros: FiltrosEventosFinca
  readonly categoriaActual: CategoriaEventoTablero | undefined
  readonly onAplicar: (filtros: FiltrosEventosFinca) => void
  readonly onLimpiar: () => void
}

function FiltrosEventos({ filtros, categoriaActual, onAplicar, onLimpiar }: FiltrosEventosProps) {
  const opcionesTipo = categoriaActual
    ? (TIPO_FILTRO_OPCIONES.find((g) => g.categoria === categoriaActual)?.tipos ?? [])
    : TIPO_FILTRO_OPCIONES.flatMap((g) => g.tipos)

  return (
    <form
      data-testid="eventos-filtros"
      className="rounded-card border bg-card p-3 grid grid-cols-1 gap-3 md:grid-cols-4"
      onSubmit={(evento) => {
        evento.preventDefault()
        const data = new FormData(evento.currentTarget)
        const categoria = (data.get("categoria") as string) || undefined
        const tipo = (data.get("tipo") as string) || undefined
        const fechaDesde = (data.get("fechaDesde") as string) || undefined
        const fechaHasta = (data.get("fechaHasta") as string) || undefined
        onAplicar({
          ...(categoria ? { categoria: categoria as CategoriaEventoTablero } : {}),
          ...(tipo ? { tipo } : {}),
          ...(fechaDesde ? { fechaDesde } : {}),
          ...(fechaHasta ? { fechaHasta } : {}),
        })
      }}
    >
      <label className="flex flex-col gap-1 text-caption font-medium text-muted-foreground">
        Categoría
        <select
          name="categoria"
          defaultValue={filtros.categoria ?? ""}
          className="h-10 rounded-md border border-input bg-card px-3 text-support text-foreground"
        >
          <option value="">Todos ▾</option>
          <option value="reproductivo">Reproductivo</option>
          <option value="sanidad">Sanidad</option>
          <option value="productivo">Productivo</option>
          <option value="movimientos">Movimientos</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-caption font-medium text-muted-foreground">
        Tipo
        <select
          name="tipo"
          defaultValue={filtros.tipo ?? ""}
          className="h-10 rounded-md border border-input bg-card px-3 text-support text-foreground"
        >
          <option value="">Todos ▾</option>
          {opcionesTipo.map((t) => (
            <option key={t} value={t}>
              {legible(t)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-caption font-medium text-muted-foreground">
        Desde
        <input
          name="fechaDesde"
          type="date"
          defaultValue={filtros.fechaDesde ?? ""}
          className="h-10 rounded-md border border-input bg-card px-3 text-support text-foreground"
        />
      </label>
      <label className="flex flex-col gap-1 text-caption font-medium text-muted-foreground">
        Hasta
        <input
          name="fechaHasta"
          type="date"
          defaultValue={filtros.fechaHasta ?? ""}
          className="h-10 rounded-md border border-input bg-card px-3 text-support text-foreground"
        />
      </label>
      <div className="md:col-span-4 flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onLimpiar}
          data-testid="eventos-filtros-limpiar"
        >
          Limpiar
        </Button>
        <Button type="submit" data-testid="eventos-filtros-aplicar">
          Aplicar filtros
        </Button>
      </div>
    </form>
  )
}

function legible(tipo: string): string {
  return tipo
    .split("_")
    .map((p) => p)
    .join(" ")
    .replace(/^./, (l) => l.toUpperCase())
}

interface FilaHistorialEventoProps {
  readonly item: EventoHistorialItem
  readonly puedeAnular: boolean
  readonly onAnular: (evento: EventoHistorialItem) => void
  readonly onCorregir: (evento: EventoHistorialItem) => void
}

function FilaHistorialEvento({
  item,
  puedeAnular,
  onAnular,
  onCorregir,
}: FilaHistorialEventoProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="block text-support font-medium text-foreground">
        {item.animalCodigo}
        {item.animalNombre ? ` · ${item.animalNombre}` : ""}
      </span>
      <span className="block text-caption text-muted-foreground">
        {etiquetaCategoria(item.dominio)} · {legible(item.tipo)}
        {item.detalle ? ` · ${item.detalle}` : ""}
      </span>
      <span className="block text-caption text-muted-foreground num">
        {item.fecha}
        {item.registroGrupalId ? " · Grupal" : ""}
        {item.anulado ? " · Anulado" : ""}
      </span>
      {puedeAnular && !item.anulado && (
        <Button size="sm" variant="ghost" onClick={() => onAnular(item)}>
          Anular
        </Button>
      )}
      {item.anulado && (
        <Button size="sm" variant="ghost" onClick={() => onCorregir(item)}>
          Registrar corrección
        </Button>
      )}
    </div>
  )
}

function etiquetaCategoria(id: CategoriaEventoTablero): string {
  switch (id) {
    case "reproductivo":
      return "Reproductivo"
    case "sanidad":
      return "Sanidad"
    case "productivo":
      return "Productivo"
    case "movimientos":
      return "Movimientos"
  }
}

function HistorialSkeleton() {
  return (
    <ul
      className="-mx-1 divide-y divide-tierra-200"
      aria-busy="true"
      data-testid="eventos-historial-skeleton"
    >
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className={cn("px-1 py-3 space-y-2")}>
          <div className="h-3 w-48 rounded bg-muted animate-pulse" />
          <div className="h-3 w-32 rounded bg-muted animate-pulse" />
        </li>
      ))}
    </ul>
  )
}

interface HistorialErrorProps {
  readonly onReintentar: () => void
}

function HistorialError({ onReintentar }: HistorialErrorProps) {
  return (
    <div className="py-6" role="alert" data-testid="eventos-historial-error">
      <p className="text-support text-peligro-600">No pudimos cargar el historial.</p>
      <Button variant="secondary" onClick={onReintentar} className="mt-2 min-h-[--h-touch]">
        Reintentar
      </Button>
    </div>
  )
}

interface HistorialVacioProps {
  readonly vacioPorFiltro: boolean
  readonly onLimpiar: () => void
  readonly onRegistrar: () => void
}

function HistorialVacio({ vacioPorFiltro, onLimpiar, onRegistrar }: HistorialVacioProps) {
  if (vacioPorFiltro) {
    return (
      <EmptyState
        icon={ChevronRight}
        title="Sin eventos con este filtro"
        description="Ajusta los filtros para ver más resultados o limpia la búsqueda."
        actionLabel="Limpiar filtros"
        onAction={onLimpiar}
      />
    )
  }
  return (
    <EmptyState
      icon={ChevronRight}
      title="Aún no hay eventos registrados"
      description="Cuando registres servicios, pesajes, aplicaciones o movimientos, aparecerán aquí."
      actionLabel="Registrar evento"
      actionIcon={Plus}
      onAction={onRegistrar}
    />
  )
}
