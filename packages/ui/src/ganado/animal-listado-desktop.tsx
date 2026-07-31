import { useState } from "react"
import type * as React from "react"

import { cn } from "../lib/utils"
import { Button } from "../primitives/button"
import { Input } from "../primitives/input"

/**
 * AnimalListadoDesktop — presentational #107-backed table for issue #108.
 *
 * Contract source: the typed route adapter
 * `apps/web/src/features/animal-listado/animal-listado-route-adapter.ts`
 * (built on #107 `AnimalListadoResponseDto`, RF-ANIM-LIST v2.1). The adapter
 * owns 36-column recognition, canonical 29 ordering, and null-safe cell
 * formatting (`-` / `Sin registrar`); this component consumes display-ready
 * columns + rows through structural prop types so `packages/ui` never depends
 * on `apps/web` (dependency-cruiser boundary).
 *
 * Wiring (#108 PR 3): `apps/web/src/routes/_app/fincas/$fincaId/animales.tsx`
 * (`AnimalsListRouteView`) fetches the #107 endpoint, pre-formats cells with
 * `formatearCeldaListado`, mirrors the #107 sort as `orden`, and drives the
 * `estado` machine from the adapter's `ResultadoListadoDesktop`.
 *
 * Boundaries (non-goals of #108):
 * - No filter controls or general filter URL mutation — #109 (only LA-040
 *   sanitization lives upstream). `Limpiar filtros` is a #109-owned slot:
 *   this component renders the supplied action without owning its behavior.
 * - No pagination, column selector, or preference persistence — #110.
 * - Export execution lives in the route (#111): this component only renders
 *   the `Exportar` entry point (LA-RBAC-03) and invokes `onExportar`; the
 *   route owns the dialog, the download transport, and the network detail.
 *
 * Theming: CSS tokens only — zero Tailwind dark-mode variants (T-004).
 * All ten appearances re-skin this exact markup through the token cascade.
 */

export interface AnimalListadoDesktopColumn {
  readonly id: string
  readonly label: string
}

export interface AnimalListadoDesktopRow {
  readonly id: string
  /** Display text aligned 1:1 with `columns`; null coalesces to `-`. */
  readonly cells: readonly (string | null)[]
}

export interface AnimalListadoDesktopPermissions {
  readonly canCreate: boolean // animales:crear
  readonly canExport: boolean // animales:ver && reportes:exportar
}

/** Data/failure state machine (LA-060–063, LA-041/042). */
export type AnimalListadoDesktopEstado = "cargando" | "listo" | "sin-acceso" | "error"

export interface AnimalListadoDesktopOrden {
  /** Column id the response is sorted by. */
  readonly campo: string
  readonly direccion: "asc" | "desc"
}

/** Route-supplied query-control values. The UI never derives URL grammar. */
export interface AnimalListadoDesktopFiltro {
  readonly filterKey: string
  readonly grammar: string
  readonly label: string
  readonly committedValue: string | null
  readonly options: readonly Readonly<{ value: string; label: string }>[]
}

export interface AnimalListadoDesktopChip {
  readonly queryKey: string
  readonly label: string
  readonly valueLabel: string
}

export interface AnimalListadoDesktopProps {
  /** Visible columns in render order (canonical 29 by default; any
   * recognized subset — including optional columns — renders as supplied). */
  readonly columns: readonly AnimalListadoDesktopColumn[]
  readonly estado: AnimalListadoDesktopEstado
  /** Display-ready rows; meaningful only when `estado` is `listo`. */
  readonly rows?: readonly AnimalListadoDesktopRow[]
  readonly total?: number
  readonly totalSinFiltro?: number
  readonly permissions: AnimalListadoDesktopPermissions
  /** Current sort, mirrored from the #107 response (`aria-sort`). */
  readonly orden?: AnimalListadoDesktopOrden | null | undefined
  /** LA-091: row click / Enter outside a control opens the animal ficha. */
  readonly onAbrirFicha: (animalId: string) => void
  /** LA-RBAC-02: rendered only with `canCreate`. */
  readonly onNuevoAnimal?: () => void
  /** LA-RBAC-03: rendered only with `canExport`; opens the #111 export dialog. */
  readonly onExportar?: () => void
  /** LA-061: finca-empty registration action (respects `canCreate`). */
  readonly onVolver?: () => void
  /** LA-042: 500/timeout retry. */
  readonly onReintentar?: () => void
  /** #109-owned action slot for the no-results state. */
  readonly onLimpiarFiltros?: () => void
  /** #109 route-owned, committed global-search value. */
  readonly busqueda?: string
  /** #109 route-supplied controls; options carry stable IDs/keys. */
  readonly filtros?: readonly AnimalListadoDesktopFiltro[]
  readonly chips?: readonly AnimalListadoDesktopChip[]
  /** Only route-supplied sortable column IDs expose a sort control. */
  readonly columnasOrdenables?: readonly string[]
  readonly onBuscar?: (value: string) => void
  readonly onFiltrar?: (commit: {
    filterKey: string
    grammar: string
    value: string | null
  }) => void
  readonly onEliminarChip?: (queryKey: string) => void
  readonly onLimpiarTodo?: () => void
  readonly onOrdenar?: (columnId: string) => void
  /** #110: route-supplied pagination model; the UI never owns the URL. */
  readonly paginacion?: AnimalListadoDesktopPaginacion
  /** #110: route-supplied column-selector model (36 columns, mandatory frozen). */
  readonly selectorColumnas?: AnimalListadoDesktopSelectorColumnas
  /** #110: reset to 29 base columns + page size 25 (route owns the mutation). */
  readonly onResetPreferencias?: () => void
  /** #110: render the reset control only when the selection is non-default. */
  readonly puedeResetear?: boolean
  /** #110: retryable preference load/save warning; null when healthy. */
  readonly avisoPreferencias?: AnimalListadoDesktopAvisoPreferencias | null
  readonly onReintentarPreferencias?: () => void
  readonly className?: string
}

/** #110 presentational pagination model — the route owns URL ownership. */
export interface AnimalListadoDesktopPaginacion {
  readonly pagina: number
  readonly totalPaginas: number
  readonly pageSize: number
  readonly pageSizes: readonly number[]
  readonly onCambiarPagina: (pagina: number) => void
  readonly onCambiarPageSize: (pageSize: number) => void
}

/** #110 presentational column-selector model. */
export interface AnimalListadoDesktopSelectorColumnas {
  readonly columnas: readonly AnimalListadoDesktopColumnaOpcion[]
  readonly onCambiar: (ids: readonly string[]) => void
}

export interface AnimalListadoDesktopColumnaOpcion {
  readonly id: string
  readonly label: string
  readonly seleccionado: boolean
  /** Mandatory columns (`Código`/`Nombre`) cannot be deselected. */
  readonly inmutable: boolean
}

/** #110 retryable preference warning model. */
export interface AnimalListadoDesktopAvisoPreferencias {
  readonly mensaje: string
}

/** Skeleton rows shown while loading (LA-060). */
const FILAS_SKELETON = 8

/** Frozen columns (LA-080): `Código` and `Nombre` stay visible on
 * horizontal scroll. Widths are fixed so the sticky offsets are stable. */
const COLUMNA_CODIGO = "codigo"
const COLUMNA_NOMBRE = "nombre"
const ANCHO_CODIGO_PX = 120

/** Horizontal sticky offset for a frozen column; null when not frozen. */
function desplazamientoCongelado(columna: AnimalListadoDesktopColumn): {
  left: number
  zIndex: number
} | null {
  if (columna.id === COLUMNA_CODIGO) return { left: 0, zIndex: 10 }
  if (columna.id === COLUMNA_NOMBRE) return { left: ANCHO_CODIGO_PX, zIndex: 10 }
  return null
}

/** Sticky header (LA-081); frozen corners stack above scrolling cells. */
function estiloEncabezado(columna: AnimalListadoDesktopColumn): React.CSSProperties {
  const congelado = desplazamientoCongelado(columna)
  return congelado
    ? { position: "sticky", top: 0, left: congelado.left, zIndex: 30 }
    : { position: "sticky", top: 0, zIndex: 20 }
}

function claseAncho(columna: AnimalListadoDesktopColumn): string {
  // Literal classes — Tailwind's scanner cannot see runtime-built strings.
  if (columna.id === COLUMNA_CODIGO) return "w-[120px] min-w-[120px]"
  if (columna.id === COLUMNA_NOMBRE) return "w-[160px] min-w-[160px]"
  return "min-w-32"
}

/** Interactive descendants that own their events (LA-091 guard). */
const SELECTOR_CONTROLES =
  "a, button, input, select, textarea, [role='button'], [role='link'], [role='checkbox'], [role='radio'], [role='switch'], [role='combobox'], [role='option'], [role='menuitem']"

function esEventoDesdeControl(evento: React.SyntheticEvent): boolean {
  const objetivo = evento.target
  return objetivo instanceof Element && objetivo.closest(SELECTOR_CONTROLES) !== null
}

function textoCelda(valor: string | null | undefined): string {
  return valor ?? "-"
}

function CeldaListado({
  columna,
  valor,
}: {
  columna: AnimalListadoDesktopColumn
  valor: string | null | undefined
}) {
  const congelado = desplazamientoCongelado(columna)
  return (
    <td
      style={
        congelado
          ? { position: "sticky", left: congelado.left, zIndex: congelado.zIndex }
          : undefined
      }
      className={cn(
        "h-10 whitespace-nowrap px-3",
        claseAncho(columna),
        congelado && "border-r bg-card",
      )}
    >
      {textoCelda(valor)}
    </td>
  )
}

function FilaListado({
  fila,
  columns,
  onAbrirFicha,
}: {
  fila: AnimalListadoDesktopRow
  columns: readonly AnimalListadoDesktopColumn[]
  onAbrirFicha: (animalId: string) => void
}) {
  return (
    <tr
      tabIndex={0}
      className="h-10 cursor-pointer border-t transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      onClick={(evento) => {
        if (!esEventoDesdeControl(evento)) onAbrirFicha(fila.id)
      }}
      onKeyDown={(evento) => {
        if (evento.key === "Enter" && !esEventoDesdeControl(evento)) {
          evento.preventDefault()
          onAbrirFicha(fila.id)
        }
      }}
    >
      {columns.map((columna, indice) => (
        <CeldaListado key={columna.id} columna={columna} valor={fila.cells[indice]} />
      ))}
    </tr>
  )
}

function EncabezadoColumna({
  columna,
  orden,
  ordenable = false,
  onOrdenar,
}: {
  columna: AnimalListadoDesktopColumn
  orden?: AnimalListadoDesktopOrden | null | undefined
  ordenable?: boolean
  onOrdenar?: ((columnId: string) => void) | undefined
}) {
  const ordenada = orden?.campo === columna.id
  const congelado = desplazamientoCongelado(columna)
  return (
    <th
      scope="col"
      aria-label={columna.label}
      aria-sort={ordenada ? (orden?.direccion === "asc" ? "ascending" : "descending") : undefined}
      style={estiloEncabezado(columna)}
      className={cn(
        "h-10 whitespace-nowrap border-b bg-muted px-3 text-left text-caption font-semibold text-muted-foreground",
        claseAncho(columna),
        congelado && "border-r",
      )}
    >
      {ordenable && onOrdenar ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Ordenar por ${columna.label}`}
          onClick={() => onOrdenar(columna.id)}
        >
          {columna.label}
        </Button>
      ) : (
        columna.label
      )}
    </th>
  )
}

function TablaListado({
  columns,
  orden,
  columnasOrdenables = [],
  onOrdenar,
  ariaBusy = false,
  children,
}: {
  columns: readonly AnimalListadoDesktopColumn[]
  orden?: AnimalListadoDesktopOrden | null | undefined
  columnasOrdenables?: readonly string[] | undefined
  onOrdenar?: ((columnId: string) => void) | undefined
  ariaBusy?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="overflow-auto rounded-card border bg-card">
      <table
        className="w-full border-collapse text-support"
        aria-label="Listado de animales"
        aria-busy={ariaBusy || undefined}
      >
        <thead>
          <tr>
            {columns.map((columna) => (
              <EncabezadoColumna
                key={columna.id}
                columna={columna}
                orden={orden}
                ordenable={columnasOrdenables.includes(columna.id)}
                onOrdenar={onOrdenar}
              />
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

function ControlesConsulta({
  busqueda,
  filtros = [],
  chips = [],
  onBuscar,
  onFiltrar,
  onEliminarChip,
  onLimpiarTodo,
}: Pick<
  AnimalListadoDesktopProps,
  "busqueda" | "filtros" | "chips" | "onBuscar" | "onFiltrar" | "onEliminarChip" | "onLimpiarTodo"
>) {
  if (busqueda === undefined && filtros.length === 0 && chips.length === 0) return null
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-card border bg-card p-3">
      {busqueda !== undefined && (
        <Input
          type="search"
          aria-label="Buscar animales"
          value={busqueda}
          onChange={(event) => onBuscar?.(event.target.value)}
        />
      )}
      {filtros.map((filtro) => (
        <label key={filtro.filterKey} className="grid gap-1 text-support">
          {filtro.label}
          <select
            aria-label={filtro.label}
            value={filtro.committedValue ?? ""}
            onChange={(event) =>
              onFiltrar?.({
                filterKey: filtro.filterKey,
                grammar: filtro.grammar,
                value: event.target.value === "" ? null : event.target.value,
              })
            }
          >
            <option value="">Todos</option>
            {filtro.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      {chips.map((chip) => (
        <Button
          key={chip.queryKey}
          type="button"
          variant="secondary"
          size="sm"
          aria-label={`Quitar filtro ${chip.label}: ${chip.valueLabel}`}
          onClick={() => onEliminarChip?.(chip.queryKey)}
        >
          {chip.label}: {chip.valueLabel}
        </Button>
      ))}
      {chips.length > 0 && onLimpiarTodo && (
        <Button type="button" variant="secondary" size="sm" onClick={onLimpiarTodo}>
          Limpiar todo
        </Button>
      )}
    </div>
  )
}

/** LA-060: 36–40 px skeleton row (`h-10` = 40 px) that retains the column
 * grid. The table's `aria-busy` already shields assistive technology. */
function FilaSkeleton({ columns }: { columns: readonly AnimalListadoDesktopColumn[] }) {
  return (
    <tr data-testid="animal-listado-skeleton-row" className="h-10 border-t">
      {columns.map((columna) => (
        <td key={columna.id} className="px-3">
          <div className="h-4 w-full max-w-24 animate-pulse rounded bg-muted" />
        </td>
      ))}
    </tr>
  )
}

function TablaCargando({
  columns,
  orden,
}: {
  columns: readonly AnimalListadoDesktopColumn[]
  orden?: AnimalListadoDesktopOrden | null | undefined
}) {
  return (
    <TablaListado columns={columns} orden={orden} ariaBusy>
      {Array.from({ length: FILAS_SKELETON }, (_, indice) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton slots are static placeholders
        <FilaSkeleton key={indice} columns={columns} />
      ))}
    </TablaListado>
  )
}

function PanelEstado({
  titulo,
  descripcion,
  children,
}: {
  titulo: string
  descripcion: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border bg-card px-6 py-16 text-center">
      <h2 className="text-title font-semibold">{titulo}</h2>
      <p className="mt-1 max-w-sm text-support text-muted-foreground">{descripcion}</p>
      {children ? <div className="mt-4 flex gap-2">{children}</div> : null}
    </div>
  )
}

function textoAnuncio(
  estado: AnimalListadoDesktopEstado,
  total: number,
  totalSinFiltro: number,
): string {
  switch (estado) {
    case "cargando":
      return "Cargando animales…"
    case "sin-acceso":
      return "No tienes acceso a esta finca"
    case "error":
      return "Error al cargar los animales"
    case "listo":
      if (totalSinFiltro === 0) return "Aún no hay animales en esta finca"
      if (total === 0) return "Sin resultados para los filtros actuales"
      return total === 1 ? "1 animal" : `${total} animales`
  }
}

/** LA-RBAC-02/03 toolbar: presence is permission-gated — server
 * enforcement stays authoritative. `Exportar` is active since #111: its
 * `onClick` invokes the route-supplied `onExportar`, which opens the export
 * dialog (the component owns no dialog/download/network detail). */
function BarraAcciones({
  permissions,
  onNuevoAnimal,
  onExportar,
}: {
  permissions: AnimalListadoDesktopPermissions
  onNuevoAnimal?: (() => void) | undefined
  onExportar?: (() => void) | undefined
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-title font-semibold">Animales</p>
      <div className="flex items-center gap-2">
        {permissions.canCreate && (
          <Button type="button" onClick={onNuevoAnimal}>
            Nuevo animal
          </Button>
        )}
        {permissions.canExport && (
          <Button type="button" variant="secondary" onClick={onExportar}>
            Exportar
          </Button>
        )}
      </div>
    </div>
  )
}

function ContenidoListo({
  columns,
  rows,
  total,
  totalSinFiltro,
  permissions,
  orden,
  onAbrirFicha,
  onNuevoAnimal,
  onLimpiarFiltros,
  columnasOrdenables,
  onOrdenar,
}: AnimalListadoDesktopProps) {
  // LA-061: `totalSinFiltro === 0` → the finca has no animals at all.
  if ((totalSinFiltro ?? 0) === 0) {
    return (
      <PanelEstado
        titulo="Aún no hay animales"
        descripcion="Registra el primer animal para empezar a llevar el control del hato."
      >
        {permissions.canCreate && (
          <Button type="button" onClick={onNuevoAnimal}>
            Registrar animal
          </Button>
        )}
      </PanelEstado>
    )
  }
  // LA-062: `total === 0` with animals in the finca → filter mismatch.
  if ((total ?? 0) === 0) {
    return (
      <PanelEstado
        titulo="Sin resultados"
        descripcion="Ningún animal coincide con los filtros aplicados."
      >
        {onLimpiarFiltros && (
          <Button type="button" variant="secondary" onClick={onLimpiarFiltros}>
            Limpiar filtros
          </Button>
        )}
      </PanelEstado>
    )
  }
  return (
    <TablaListado
      columns={columns}
      orden={orden}
      columnasOrdenables={columnasOrdenables}
      onOrdenar={onOrdenar}
    >
      {(rows ?? []).map((fila) => (
        <FilaListado key={fila.id} fila={fila} columns={columns} onAbrirFicha={onAbrirFicha} />
      ))}
    </TablaListado>
  )
}

function ContenidoPorEstado(props: AnimalListadoDesktopProps) {
  switch (props.estado) {
    case "cargando":
      return <TablaCargando columns={props.columns} orden={props.orden} />
    case "sin-acceso":
      // LA-041: data cleared, safe return offered.
      return (
        <PanelEstado
          titulo="No tienes acceso a esta finca"
          descripcion="Tu sesión no tiene permisos sobre esta finca. Regresa a un lugar seguro."
        >
          {props.onVolver && (
            <Button type="button" variant="secondary" onClick={props.onVolver}>
              Volver
            </Button>
          )}
        </PanelEstado>
      )
    case "error":
      // LA-042: explicit retriable failure — never a silent empty table.
      return (
        <PanelEstado
          titulo="Error al cargar los animales"
          descripcion="No se pudo cargar el listado. Intenta de nuevo en unos momentos."
        >
          {props.onReintentar && (
            <Button type="button" onClick={props.onReintentar}>
              Reintentar
            </Button>
          )}
        </PanelEstado>
      )
    case "listo":
      return <ContenidoListo {...props} />
  }
}

/**
 * #110: presentational column selector. Renders the route-supplied 36-column
 * model; mandatory columns stay checked and disabled. The UI only reports the
 * resulting selection — it never owns URL, persistence, or normalization.
 */
function SelectorColumnas({
  selectorColumnas,
}: {
  selectorColumnas: AnimalListadoDesktopSelectorColumnas
}) {
  const [abierto, setAbierto] = useState(false)
  const { columnas, onCambiar } = selectorColumnas
  const alternar = (id: string, marcado: boolean) => {
    const seleccionados = columnas.filter((columna) => columna.seleccionado).map((c) => c.id)
    onCambiar(marcado ? [...seleccionados, id] : seleccionados.filter((actual) => actual !== id))
  }
  return (
    <div className="relative">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        aria-expanded={abierto}
        onClick={() => setAbierto((valor) => !valor)}
      >
        Columnas
      </Button>
      {abierto && (
        <fieldset
          aria-label="Columnas visibles"
          className="absolute z-40 mt-1 grid max-h-72 w-56 gap-1 overflow-auto rounded-card border bg-card p-3 shadow-md"
        >
          {columnas.map((columna) => (
            <label key={columna.id} className="flex items-center gap-2 text-support">
              <input
                type="checkbox"
                aria-label={columna.label}
                checked={columna.seleccionado}
                disabled={columna.inmutable}
                onChange={(evento) => alternar(columna.id, evento.target.checked)}
              />
              {columna.label}
            </label>
          ))}
        </fieldset>
      )}
    </div>
  )
}

/** #110: presentational pagination + page-size control. */
function PaginacionListado({
  paginacion,
}: {
  paginacion: AnimalListadoDesktopPaginacion
}) {
  const { pagina, totalPaginas, pageSize, pageSizes, onCambiarPagina, onCambiarPageSize } =
    paginacion
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-label="Página anterior"
          disabled={pagina <= 1}
          onClick={() => onCambiarPagina(pagina - 1)}
        >
          Anterior
        </Button>
        <span className="text-support text-muted-foreground">
          Página {pagina} de {totalPaginas}
        </span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-label="Página siguiente"
          disabled={pagina >= totalPaginas}
          onClick={() => onCambiarPagina(pagina + 1)}
        >
          Siguiente
        </Button>
      </div>
      <label className="flex items-center gap-2 text-support">
        Filas por página
        <select
          aria-label="Filas por página"
          value={String(pageSize)}
          onChange={(evento) => onCambiarPageSize(Number(evento.target.value))}
        >
          {pageSizes.map((size) => (
            <option key={size} value={String(size)}>
              {size}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

/** #110: retryable preference warning. Preserves the table; retry is supplied. */
function AvisoPreferenciasBanner({
  aviso,
  onReintentar,
}: {
  aviso: AnimalListadoDesktopAvisoPreferencias
  onReintentar?: (() => void) | undefined
}) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-4 rounded-card border bg-card px-3 py-2"
    >
      <p className="text-support text-muted-foreground">{aviso.mensaje}</p>
      {onReintentar && (
        <Button type="button" variant="secondary" size="sm" onClick={onReintentar}>
          Reintentar
        </Button>
      )}
    </div>
  )
}

export function AnimalListadoDesktop(props: AnimalListadoDesktopProps) {
  const {
    className,
    estado,
    total,
    totalSinFiltro,
    permissions,
    onNuevoAnimal,
    onExportar,
    paginacion,
    selectorColumnas,
    onResetPreferencias,
    puedeResetear = false,
    avisoPreferencias,
    onReintentarPreferencias,
  } = props
  const listoConDatos = estado === "listo" && (totalSinFiltro ?? 0) > 0
  return (
    <section className={cn("space-y-4", className)}>
      {/* LA-090: persistent live region (<output> implies role="status") —
          state changes are announced. */}
      <output className="sr-only">{textoAnuncio(estado, total ?? 0, totalSinFiltro ?? 0)}</output>
      <BarraAcciones
        permissions={permissions}
        onNuevoAnimal={onNuevoAnimal}
        onExportar={onExportar}
      />
      {avisoPreferencias ? (
        <AvisoPreferenciasBanner
          aviso={avisoPreferencias}
          onReintentar={onReintentarPreferencias}
        />
      ) : null}
      {listoConDatos && (selectorColumnas || (puedeResetear && onResetPreferencias)) ? (
        <div className="flex flex-wrap items-center gap-2">
          {selectorColumnas && <SelectorColumnas selectorColumnas={selectorColumnas} />}
          {puedeResetear && onResetPreferencias && (
            <Button type="button" variant="secondary" size="sm" onClick={onResetPreferencias}>
              Restablecer preferencias
            </Button>
          )}
        </div>
      ) : null}
      <ControlesConsulta {...props} />
      <ContenidoPorEstado {...props} />
      {listoConDatos && paginacion && (total ?? 0) > 0 ? (
        <PaginacionListado paginacion={paginacion} />
      ) : null}
    </section>
  )
}
