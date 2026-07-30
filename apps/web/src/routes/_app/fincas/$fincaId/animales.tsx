/**
 * Animals list route — #108 desktop wiring (PR 3).
 *
 * Data flow (design.md):
 * - loader ─> `getAnimalListadoVisualPermissionsAction(fincaId)` — fail-closed
 *   visual projection `{ canCreate, canExport }` (LA-RBAC-02/03, LA-RBAC-05).
 * - loader ─> legacy `listAnimalsAction` — MOBILE branch only (AnimalListMobile).
 * - view ─> GET `/api/fincas/{fincaId}/animales` (#107 authorization) through
 *   the typed route adapter -> `AnimalListadoDesktop` (DESKTOP branch only).
 *
 * Deviation note (documented in apply-progress): the #107 fetch runs in the
 * route view (client effect) rather than the loader because LA-040–043 —
 * retain the last valid model, strip invalid URL parameters, announce the
 * correction — is client-stateful by contract ("the frontend owns the visual
 * behavior and URL sanitization"). The loader keeps the projection and the
 * legacy mobile data exactly as designed.
 *
 * Rollback surface: revert this file to the legacy `AnimalDesktopScreen`
 * wiring (the component remains exported by `@ganaweb/ui`); #107, the
 * adapter, the projection, and the mobile branch stay untouched.
 * Boundaries: no filters/search/order (#109), pagination/selector/preferences
 * (#110), or export execution (#111 — `Exportar` stays inert).
 */
import { AnimalListMobile, AnimalListadoDesktop, type AnimalListadoDesktopRow } from "@ganaweb/ui"
import { Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router"
import { Calendar, CheckSquare, Home, Menu, PawPrint } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import {
  ANIMAL_LISTADO_DEFAULT_COLUMNS,
  type AnimalListadoDesktopModel,
  type AnimalListadoToastPayload,
  type AnimalListadoVisualPermissions,
  aplicarFiltroListado,
  cargarListadoDesktop,
  construirModeloListadoDesktop,
  crearChipsListado,
  crearModelosFiltroListado,
  eliminarChipListado,
  formatearCeldaListado,
  limpiarFiltrosListado,
  sanitizarListadoBadRequest,
  siguienteOrdenListado,
} from "../../../../features/animal-listado/animal-listado-route-adapter.js"
import {
  type AnimalCatalogs,
  getAnimalCatalogsAction,
  getAnimalListadoVisualPermissionsAction,
  listAnimalsAction,
} from "../../../../server/animal-actions.js"

const PERMISOS_VISUALES_DENEGADOS: AnimalListadoVisualPermissions = {
  canCreate: false,
  canExport: false,
}

/** Legacy mobile list result — the desktop branch never consumes it. */
export type AnimalsLegadoData = Awaited<ReturnType<typeof listAnimalsAction>>

export const Route = createFileRoute("/_app/fincas/$fincaId/animales")({
  loader: async ({ params }) => {
    const [permissions, legado, catalogs] = await Promise.all([
      // Fail closed: an RPC failure never produces a false grant (LA-RBAC-05).
      getAnimalListadoVisualPermissionsAction({ data: { fincaId: params.fincaId } }).catch(
        () => PERMISOS_VISUALES_DENEGADOS,
      ),
      listAnimalsAction({ data: { fincaId: params.fincaId } }),
      getAnimalCatalogsAction({ data: { fincaId: params.fincaId } }),
    ])
    return { permissions, legado, catalogs }
  },
  component: AnimalsListRoute,
})

const bottomNavItems = [
  { id: "inicio", label: "Inicio", icon: Home, href: "/" },
  { id: "animales", label: "Animales", icon: PawPrint, href: "/animales" },
  { id: "tareas", label: "Tareas", icon: CheckSquare, href: "/tareas" },
  { id: "mas", label: "Más", icon: Menu, href: "/mas" },
]

const BUSQUEDA_DEBOUNCE_MS = 300

export type AnimalListadoQueryNavigation = Readonly<{
  consulta: URLSearchParams
  replace: boolean
}>

/**
 * Route-owned query mutations. The desktop UI receives these callbacks in Unit
 * 3; this controller deliberately owns URL intentions, never fetches or
 * navigates on its own. Each render creates it from the committed URL so
 * Back/Forward replay cannot retain superseded control state.
 */
export function crearControladorConsultaListado(
  consulta: URLSearchParams,
  navegar: (intencion: AnimalListadoQueryNavigation) => void,
) {
  let temporizador: ReturnType<typeof setTimeout> | undefined
  const push = (siguiente: URLSearchParams) => {
    if (temporizador !== undefined) clearTimeout(temporizador)
    navegar({ consulta: siguiente, replace: false })
  }
  return {
    buscar(valor: string) {
      if (temporizador !== undefined) clearTimeout(temporizador)
      temporizador = setTimeout(() => {
        const siguiente = new URLSearchParams(consulta)
        siguiente.delete("page")
        if (valor === "") siguiente.delete("q")
        else siguiente.set("q", valor)
        navegar({ consulta: siguiente, replace: true })
      }, BUSQUEDA_DEBOUNCE_MS)
    },
    filtrar(commit: Parameters<typeof aplicarFiltroListado>[1]) {
      push(aplicarFiltroListado(consulta, commit))
    },
    eliminarChip(queryKey: Parameters<typeof eliminarChipListado>[1]) {
      push(eliminarChipListado(consulta, queryKey))
    },
    limpiar() {
      push(limpiarFiltrosListado(consulta))
    },
    ordenar(columnId: Parameters<typeof siguienteOrdenListado>[1]) {
      push(siguienteOrdenListado(consulta, columnId))
    },
    cancelarBusqueda() {
      if (temporizador !== undefined) clearTimeout(temporizador)
    },
  }
}

export interface AnimalsListRouteViewProps {
  readonly fincaId: string
  readonly permissions: AnimalListadoVisualPermissions
  readonly legado: AnimalsLegadoData
  readonly catalogs: AnimalCatalogs
  /** Current URL search string — drives LA-040 sanitization reactivity. */
  readonly consulta?: string | undefined
  /** LA-091: opens the animal ficha (the route maps it to navigation). */
  readonly onAbrirFicha: (animalId: string) => void
  readonly onIrANuevo: () => void
  /** LA-041: safe return from the 403 state. */
  readonly onVolver: () => void
  /** LA-040: replace the URL with the sanitized query. */
  readonly onSanearUrl?: ((consultaSanitizada: URLSearchParams) => void) | undefined
  readonly onNavegarConsulta?: ((intencion: AnimalListadoQueryNavigation) => void) | undefined
}

type EstadoVistaListado =
  | { readonly tipo: "cargando" }
  | { readonly tipo: "listo"; readonly modelo: AnimalListadoDesktopModel }
  | { readonly tipo: "sin-acceso" }
  | { readonly tipo: "error" }

/** Canonical empty model so LA-040 sanitization works before the first 200. */
function modeloVacioListado(
  permissions: AnimalListadoVisualPermissions,
): AnimalListadoDesktopModel {
  return construirModeloListadoDesktop(
    { data: [], page: 1, pageSize: 25, total: 0, totalSinFiltro: 0, sort: "codigo:asc", cols: [] },
    permissions,
  )
}

export function AnimalsListRouteView({
  fincaId,
  permissions,
  legado,
  catalogs,
  consulta = "",
  onAbrirFicha,
  onIrANuevo,
  onVolver,
  onSanearUrl,
  onNavegarConsulta = () => undefined,
}: AnimalsListRouteViewProps) {
  const [estado, setEstado] = useState<EstadoVistaListado>({ tipo: "cargando" })
  const [aviso, setAviso] = useState<AnimalListadoToastPayload | null>(null)
  const [intento, setIntento] = useState(0)
  const ultimoModelo = useRef<AnimalListadoDesktopModel | null>(null)
  // Callback ref: keeps the effect deps stable across route re-renders.
  const sanearRef = useRef(onSanearUrl)
  sanearRef.current = onSanearUrl

  // biome-ignore lint/correctness/useExhaustiveDependencies: onSanearUrl is read through sanearRef so route-provided callbacks never retrigger the #107 fetch.
  useEffect(() => {
    let activo = true
    setEstado({ tipo: "cargando" })
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: each branch maps one bounded #107 outcome onto the LA-040–063 state machine.
    void cargarListadoDesktop(fincaId, permissions, { consulta }).then((resultado) => {
      if (!activo) return
      switch (resultado.tipo) {
        case "listo": {
          ultimoModelo.current = resultado.modelo
          setAviso(null)
          setEstado({ tipo: "listo", modelo: resultado.modelo })
          return
        }
        case "sin_acceso": {
          ultimoModelo.current = null // LA-041: 403 clears the data.
          setEstado({ tipo: "sin-acceso" })
          return
        }
        case "error_servidor": {
          setEstado({ tipo: "error" })
          return
        }
        case "consulta_invalida": {
          // LA-040–043: retain the last valid table, strip the reported
          // parameter (resetting the page when the dataset changes), and
          // announce the correction. #109 owns general filter mutation.
          const retenido = ultimoModelo.current
          const saneado = sanitizarListadoBadRequest(
            resultado.error,
            retenido ?? modeloVacioListado(permissions),
            new URLSearchParams(consulta),
          )
          setAviso(saneado.toast)
          if (saneado.removedParams.length > 0) sanearRef.current?.(saneado.sanitizedQuery)
          if (retenido !== null) {
            setEstado({ tipo: "listo", modelo: retenido })
          } else if (saneado.removedParams.length === 0) {
            setEstado({ tipo: "error" }) // nothing to retain nor to sanitize
          }
          // Otherwise the sanitized URL re-runs this effect and reloads.
          return
        }
      }
    })
    return () => {
      activo = false
    }
  }, [fincaId, permissions, consulta, intento])

  const animales = legado.tipo === "lista" ? [...legado.animales] : []
  const canCreateLegado = legado.tipo === "lista" && legado.permissions.canCreate
  const goNew = () => {
    if (canCreateLegado) onIrANuevo()
  }

  const modelo = estado.tipo === "listo" ? estado.modelo : null
  const consultaActual = new URLSearchParams(consulta)
  const filtros = crearModelosFiltroListado(consultaActual, {
    sexoKey: catalogs.sexo.options,
    razaId: catalogs.raza.options,
    colorId: catalogs.color.options,
    propietarioId: catalogs.propietario.options,
    hierroId: catalogs.hierro.options,
    calidadAnimalId: catalogs.calidad.options,
    potreroId: catalogs.potrero.options,
    sectorId: catalogs.sector.options,
    loteId: catalogs.lote.options,
    grupoId: catalogs.grupo.options,
    tipoExplotacionId: catalogs.tipoExplotacion.options,
  })
  const chips = crearChipsListado(consultaActual, filtros)
  const controlador = crearControladorConsultaListado(consultaActual, onNavegarConsulta)
  const columnasOrdenables = (modelo?.columns ?? ANIMAL_LISTADO_DEFAULT_COLUMNS).filter((columna) =>
    siguienteOrdenListado(new URLSearchParams(), columna.id).has("sort"),
  )
  const columnas = (modelo?.columns ?? ANIMAL_LISTADO_DEFAULT_COLUMNS).map((columna) => ({
    id: columna.id,
    label: columna.label,
  }))
  const filas: readonly AnimalListadoDesktopRow[] =
    modelo?.rows.map((fila) => ({
      id: fila.id,
      cells: modelo.columns.map((columna) => formatearCeldaListado(columna, fila)),
    })) ?? []
  const propsListo =
    modelo !== null
      ? {
          rows: filas,
          total: modelo.total,
          totalSinFiltro: modelo.totalSinFiltro,
          orden: modelo.orden,
        }
      : {}

  return (
    <div className="space-y-4">
      <div className="hidden md:block">
        <AnimalListadoDesktop
          columns={columnas}
          estado={estado.tipo}
          {...propsListo}
          permissions={permissions}
          onAbrirFicha={onAbrirFicha}
          onNuevoAnimal={onIrANuevo}
          onVolver={onVolver}
          onReintentar={() => {
            setAviso(null)
            setIntento((actual) => actual + 1)
          }}
          busqueda={consultaActual.get("q") ?? ""}
          filtros={filtros.filter((filtro) => filtro.options.length > 0)}
          chips={chips}
          columnasOrdenables={columnasOrdenables.map((columna) => columna.id)}
          onBuscar={controlador.buscar}
          onFiltrar={(commit) => {
            const filtro = filtros.find(
              (candidate) =>
                candidate.filterKey === commit.filterKey && candidate.grammar === commit.grammar,
            )
            if (filtro) controlador.filtrar({ ...filtro, value: commit.value })
          }}
          onEliminarChip={(queryKey) => {
            const chip = chips.find((candidate) => candidate.queryKey === queryKey)
            if (chip) controlador.eliminarChip(chip.queryKey)
          }}
          onLimpiarTodo={controlador.limpiar}
          onOrdenar={(columnId) => {
            const columna = columnasOrdenables.find((candidate) => candidate.id === columnId)
            if (columna) controlador.ordenar(columna.id)
          }}
        />
        {aviso !== null && (
          // <output> implies role="status" — the LA-040 correction is announced.
          <output className="block text-support text-muted-foreground">
            {aviso.titulo}: {aviso.mensaje}
          </output>
        )}
      </div>
      <div className="md:hidden">
        <AnimalListMobile
          animales={animales}
          canCreate={canCreateLegado}
          onPressAnimal={(animal) => onAbrirFicha(animal.id)}
          onNuevoAnimal={goNew}
          bottomNavItems={bottomNavItems}
        />
      </div>
      {legado.tipo === "permiso_denegado" && (
        <p className="text-support text-muted-foreground">No tienes permiso para ver animales.</p>
      )}
      <span className="sr-only">{Calendar.displayName}</span>
    </div>
  )
}

function AnimalsListRoute() {
  const { permissions, legado, catalogs } = Route.useLoaderData()
  const { fincaId } = Route.useParams()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const consulta = useRouterState({ select: (state) => state.location.searchStr })
  if (pathname !== `/fincas/${fincaId}/animales`) return <Outlet />

  return (
    <AnimalsListRouteView
      fincaId={fincaId}
      permissions={permissions}
      legado={legado}
      catalogs={catalogs}
      consulta={consulta}
      onAbrirFicha={(animalId) => void navigate({ to: `/fincas/${fincaId}/animales/${animalId}` })}
      onIrANuevo={() => void navigate({ to: `/fincas/${fincaId}/animales/nuevo` })}
      onVolver={() => void navigate({ to: "/" })}
      onSanearUrl={(consultaSaneada) =>
        void navigate({
          // The route declares no `validateSearch`, so TanStack types the
          // search params as `never`; the LA-040 sanitized query is a plain
          // string map that replaces the current search wholesale.
          search: () => Object.fromEntries(consultaSaneada) as never,
          replace: true,
        })
      }
      onNavegarConsulta={({ consulta: siguiente, replace }) =>
        void navigate({ search: () => Object.fromEntries(siguiente) as never, replace })
      }
    />
  )
}
