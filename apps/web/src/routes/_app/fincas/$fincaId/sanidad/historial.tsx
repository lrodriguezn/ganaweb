/**
 * Historial de aplicaciones sanitarias (Issue #212, D-005/SAN-004).
 *
 * Hijo de `sanidad.tsx`: `/fincas/$fincaId/sanidad/historial`. Los filtros
 * (producto / fecha desde-hasta / animal-lote) y la paginación viven en la
 * URL (`validateSearch`); la vista es presentacional y reporta los cambios,
 * que la ruta traduce a navegación (D-005: listado filtrable reutilizable).
 *
 * La carga es reactiva a la URL (patrón de `animales.tsx`): cada cambio de
 * filtro/página re-ejecuta la server function del historial. Fail-closed: el
 * fallo se degrada a un estado de error local; la autorización de fondo la
 * revalida la server function (PE-002/SAN-063).
 */

import type { FiltrosHistorialSanidad, HistorialSanidadPagina } from "@ganaweb/aplicacion"
import { type FiltrosHistorialSanidadVista, HistorialAplicacionesSanidad } from "@ganaweb/ui"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { listarCatalogoSanidadFn } from "../../../../../server/sanidad-catalogo-actions.js"
import { listarHistorialPanelSanidadFn } from "../../../../../server/sanidad-panel.js"

const TAMANO_PAGINA = 20

/** Filtros del historial en la URL (todos opcionales). */
export interface HistorialSanidadSearch {
  producto?: string
  desde?: string
  hasta?: string
  animalOLote?: string
  page?: number
}

export const Route = createFileRoute("/_app/fincas/$fincaId/sanidad/historial")({
  validateSearch: (search: Record<string, unknown>): HistorialSanidadSearch => {
    const resultado: HistorialSanidadSearch = {}
    if (typeof search.producto === "string" && search.producto !== "")
      resultado.producto = search.producto
    if (typeof search.desde === "string" && search.desde !== "") resultado.desde = search.desde
    if (typeof search.hasta === "string" && search.hasta !== "") resultado.hasta = search.hasta
    if (typeof search.animalOLote === "string" && search.animalOLote !== "") {
      resultado.animalOLote = search.animalOLote
    }
    if (typeof search.page === "number" && search.page >= 1) resultado.page = search.page
    return resultado
  },
  component: HistorialSanidadRoute,
})

type EstadoHistorial =
  | { readonly tipo: "cargando" }
  | { readonly tipo: "error" }
  | {
      readonly tipo: "listo"
      readonly pagina: HistorialSanidadPagina
      readonly productos: readonly { id: string; codigo: string; descripcion: string }[]
    }

function HistorialSanidadRoute() {
  const search = Route.useSearch()
  const { fincaId } = Route.useParams()
  const navigate = useNavigate()
  const [estado, setEstado] = useState<EstadoHistorial>({ tipo: "cargando" })

  // Campos individuales de la búsqueda: la carga se re-ejecuta en cada cambio.
  const productoBuscado = search.producto
  const desdeBuscado = search.desde
  const hastaBuscado = search.hasta
  const animalOLoteBuscado = search.animalOLote
  const paginaBuscada = search.page

  useEffect(() => {
    let activo = true
    setEstado({ tipo: "cargando" })
    const filtros: FiltrosHistorialSanidad = {
      productoId: productoBuscado ?? null,
      desde: desdeBuscado ?? null,
      hasta: hastaBuscado ?? null,
      animalOLote: animalOLoteBuscado ?? null,
      pagina: paginaBuscada ?? 1,
      tamanoPagina: TAMANO_PAGINA,
    }
    void Promise.all([
      listarHistorialPanelSanidadFn({ data: { fincaId, filtros } }).catch(() => null),
      listarCatalogoSanidadFn({ data: { fincaId, soloActivos: false } }).catch(() => null),
    ]).then(([historial, catalogo]) => {
      if (!activo) return
      if (historial === null || historial.tipo !== "ok") {
        setEstado({ tipo: "error" })
        return
      }
      const filasCatalogo = catalogo !== null && catalogo.tipo === "catalogo" ? catalogo.filas : []
      setEstado({
        tipo: "listo",
        pagina: historial.pagina,
        productos: filasCatalogo.map((fila) => ({
          id: fila.id,
          codigo: fila.codigo,
          descripcion: fila.descripcion,
        })),
      })
    })
    return () => {
      activo = false
    }
  }, [fincaId, productoBuscado, desdeBuscado, hastaBuscado, animalOLoteBuscado, paginaBuscada])

  const navegarConSearch = (siguiente: HistorialSanidadSearch) =>
    void navigate({ to: `/fincas/${fincaId}/sanidad/historial`, search: siguiente })

  const filtrosActuales: FiltrosHistorialSanidadVista = {
    productoId: search.producto ?? "",
    desde: search.desde ?? "",
    hasta: search.hasta ?? "",
    animalOLote: search.animalOLote ?? "",
  }

  const cambiarFiltros = (filtros: FiltrosHistorialSanidadVista) => {
    const siguiente: HistorialSanidadSearch = {}
    if (filtros.productoId !== "") siguiente.producto = filtros.productoId
    if (filtros.desde !== "") siguiente.desde = filtros.desde
    if (filtros.hasta !== "") siguiente.hasta = filtros.hasta
    if (filtros.animalOLote !== "") siguiente.animalOLote = filtros.animalOLote
    // Cambiar un filtro vuelve a la página 1 (no se conserva `page`).
    navegarConSearch(siguiente)
  }

  const cambiarPagina = (pagina: number) => {
    const siguiente: HistorialSanidadSearch = { ...search, page: pagina }
    navegarConSearch(siguiente)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-title font-semibold text-foreground">Historial de aplicaciones</h1>
        <p className="text-support text-muted-foreground">Registro completo por animal</p>
      </div>

      {estado.tipo === "cargando" ? (
        <p
          className="rounded-card border bg-card p-4 text-support text-muted-foreground"
          aria-busy="true"
        >
          Cargando historial…
        </p>
      ) : estado.tipo === "error" ? (
        <p className="rounded-card border bg-card p-4 text-support text-muted-foreground">
          No se pudo cargar el historial. Intenta de nuevo.
        </p>
      ) : (
        <HistorialAplicacionesSanidad
          filas={estado.pagina.filas}
          total={estado.pagina.total}
          pagina={estado.pagina.pagina}
          tamanoPagina={estado.pagina.tamanoPagina}
          productos={estado.productos}
          filtros={filtrosActuales}
          onCambiarFiltros={cambiarFiltros}
          onCambiarPagina={cambiarPagina}
        />
      )}
    </div>
  )
}
