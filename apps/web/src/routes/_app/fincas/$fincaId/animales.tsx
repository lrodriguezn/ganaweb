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
 * Boundaries: no filters/search/order (#109) or pagination/selector/preferences
 * (#110). Since #111 the desktop `Exportar` button opens `AnimalExportacionDialog`,
 * whose transport reuses the active query through `exportarListadoDesktop`.
 */
import {
  AnimalExportacionDialog,
  type AnimalExportacionTransporte,
  AnimalListMobile,
  AnimalListadoDesktop,
  type AnimalListadoDesktopRow,
  type ResultadoExportacionDialog,
  Toaster,
} from "@ganaweb/ui"
import { Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router"
import { Calendar, CheckSquare, Home, Menu, PawPrint } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import {
  ANIMAL_LISTADO_DEFAULT_COLUMNS,
  type AnimalListadoDesktopModel,
  type AnimalListadoToastPayload,
  type AnimalListadoVisualPermissions,
  PAGE_SIZE_OPTIONS_LISTADO,
  type PageSizeListado,
  type PreferenciasListado,
  type ResultadoCargaPreferencias,
  type ResultadoExportacionDesktop,
  aplicarFiltroListado,
  cambiarColsListado,
  cambiarPageSizeListado,
  cambiarPaginaListado,
  cargarListadoDesktop,
  cargarPreferenciasListado,
  construirModeloListadoDesktop,
  crearChipsListado,
  crearModelosFiltroListado,
  crearSelectorColumnasListado,
  eliminarChipListado,
  esPreferenciaDefectoListado,
  exportarListadoDesktop,
  finalizarConsultaListado,
  formatearCeldaListado,
  guardarPreferenciasListado,
  limpiarFiltrosListado,
  mezclarPreferenciasListado,
  normalizarColsListado,
  normalizarPageSizeListado,
  resolverColsListado,
  resolverPageSizeListado,
  sanitizarListadoBadRequest,
  siguienteOrdenListado,
} from "../../../../features/animal-listado/animal-listado-route-adapter.js"
import {
  type AnimalCatalogs,
  getAnimalCatalogsAction,
  getAnimalListadoPreferenciasAction,
  getAnimalListadoVisualPermissionsAction,
  listAnimalsAction,
} from "../../../../server/animal-actions.js"
import type { ResultadoPreferenciasListadoServer } from "../../../../server/animal-list-preferences.server.js"

const PERMISOS_VISUALES_DENEGADOS: AnimalListadoVisualPermissions = {
  canCreate: false,
  canExport: false,
}

/**
 * Projects the web export transport's rich result (it carries the #107
 * `ApiErrorDto`/filename) onto the ui dialog's slimmer contract. The dialog
 * never sees web/network types; the route owns this adaptation so the
 * LA-RBAC-03 gate stays single-owned by the `canExport` projection and the
 * dialog never recomputes authorization.
 */
function aResultadoExportacionDialog(
  resultado: ResultadoExportacionDesktop,
): ResultadoExportacionDialog {
  switch (resultado.tipo) {
    case "exito":
      return { tipo: "exito" }
    case "consulta_invalida":
      // LA-040: the dialog announces the correction with the server's motivo.
      return { tipo: "consulta_invalida", motivo: resultado.error.motivo }
    case "sin_acceso":
      return { tipo: "sin_acceso" }
    case "demasiados_resultados":
      return { tipo: "demasiados_resultados" }
    case "timeout":
      return { tipo: "timeout" }
    case "error_servidor":
      return { tipo: "error_servidor" }
  }
}

/** Legacy mobile list result — the desktop branch never consumes it. */
export type AnimalsLegadoData = Awaited<ReturnType<typeof listAnimalsAction>>

export const Route = createFileRoute("/_app/fincas/$fincaId/animales")({
  loader: async ({ params }) => {
    const [permissions, legado, catalogs, preferencias] = await Promise.all([
      // Fail closed: an RPC failure never produces a false grant (LA-RBAC-05).
      getAnimalListadoVisualPermissionsAction({ data: { fincaId: params.fincaId } }).catch(
        () => PERMISOS_VISUALES_DENEGADOS,
      ),
      listAnimalsAction({ data: { fincaId: params.fincaId } }),
      getAnimalCatalogsAction({ data: { fincaId: params.fincaId } }),
      // #110: best-effort SSR preference load; a failure maps to `error` and the
      // view falls back to 29/25 defaults with a retryable warning (PE-001–003).
      getAnimalListadoPreferenciasAction({ data: { fincaId: params.fincaId } }).catch(() => ({
        tipo: "error" as const,
      })),
    ])
    return { permissions, legado, catalogs, preferencias }
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

/** #110: preference saves debounce so rapid column toggles coalesce (LWW). */
const GUARDADO_PREFERENCIAS_DEBOUNCE_MS = 500

const MENSAJE_AVISO_CARGA_PREFERENCIAS =
  "No se pudieron cargar tus preferencias; se muestran los valores por defecto."
const MENSAJE_AVISO_GUARDADO_PREFERENCIAS =
  "No se pudieron guardar tus preferencias. Intenta de nuevo."

/**
 * Adapts the loader's serializable preference result onto the adapter's typed
 * `ResultadoCargaPreferencias`. An `undefined` prop (e.g. the view mounted
 * directly in tests) resolves to silent 29/25 defaults — NOT a warning — so the
 * retryable warning only appears for a real loader failure (`{ tipo: "error" }`).
 */
function aResultadoCargaPreferencias(
  preferencias: ResultadoPreferenciasListadoServer | undefined,
): ResultadoCargaPreferencias {
  if (preferencias === undefined) {
    return { tipo: "listo", preferencias: { cols: normalizarColsListado([]), pageSize: 25 } }
  }
  if (preferencias.tipo !== "listo") return { tipo: "error" }
  return {
    tipo: "listo",
    preferencias: {
      cols: normalizarColsListado(preferencias.preferencias.cols),
      pageSize: normalizarPageSizeListado(preferencias.preferencias.pageSize),
    },
  }
}

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
  /** #110: SSR-loaded preferences; `undefined` resolves to silent defaults. */
  readonly preferencias?: ResultadoPreferenciasListadoServer | undefined
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
  preferencias,
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
  // #111: the export dialog's open state; the desktop Exportar button opens it.
  const [exportarAbierto, setExportarAbierto] = useState(false)
  const ultimoModelo = useRef<AnimalListadoDesktopModel | null>(null)
  // Callback ref: keeps the effect deps stable across route re-renders.
  const sanearRef = useRef(onSanearUrl)
  sanearRef.current = onSanearUrl

  // #110: preference lifecycle. The SSR load seeds the state; a failed load is
  // retryable through the client transport. `falloGuardado` flags a failed save
  // so the session selection is retained with a retryable warning (LWW).
  const [cargaPreferencias, setCargaPreferencias] = useState<ResultadoCargaPreferencias>(() =>
    aResultadoCargaPreferencias(preferencias),
  )
  const [falloGuardado, setFalloGuardado] = useState(false)
  const guardadoTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const guardadoChainRef = useRef<Promise<void>>(Promise.resolve())

  const consultaActual = new URLSearchParams(consulta)
  const urlPageSize = resolverPageSizeListado(consultaActual)
  const urlCols = resolverColsListado(consultaActual)
  const mezcla = mezclarPreferenciasListado(consultaActual, cargaPreferencias)
  // Effective #107 request query: the URL owns explicit values; prefs-derived
  // values are injected only when the URL lacks them AND differ from the #107
  // server defaults (25 / 29 base cols), so a default selection keeps a clean
  // URL and a customized one rides along to the read model.
  const consultaRequest = new URLSearchParams(consultaActual)
  if (urlPageSize === null && mezcla.efectivas.pageSize !== 25) {
    consultaRequest.set("pageSize", String(mezcla.efectivas.pageSize))
  }
  if (
    urlCols === null &&
    !esPreferenciaDefectoListado({ cols: mezcla.efectivas.cols, pageSize: 25 })
  ) {
    consultaRequest.set("cols", mezcla.efectivas.cols.join(","))
  }
  const consultaListado = consultaRequest.toString()

  // biome-ignore lint/correctness/useExhaustiveDependencies: onSanearUrl is read through sanearRef so route-provided callbacks never retrigger the #107 fetch.
  useEffect(() => {
    let activo = true
    setEstado({ tipo: "cargando" })
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: each branch maps one bounded #107 outcome onto the LA-040–063 state machine.
    void cargarListadoDesktop(fincaId, permissions, { consulta: consultaListado }).then(
      (resultado) => {
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
      },
    )
    return () => {
      activo = false
    }
  }, [fincaId, permissions, consultaListado, intento])

  const animales = legado.tipo === "lista" ? [...legado.animales] : []
  const canCreateLegado = legado.tipo === "lista" && legado.permissions.canCreate
  const goNew = () => {
    if (canCreateLegado) onIrANuevo()
  }

  const modelo = estado.tipo === "listo" ? estado.modelo : null
  // #111 export transport (LA-070/076): reuses the active listado query —
  // canonicalized through the read-only #111 seam — so a confirmed export and
  // any `Reintentar` preserve the active filters; the dialog adds scope/format.
  // The closure is recreated each render, so the dialog always sees the latest
  // filters even across a retry.
  const transportarExportacion: AnimalExportacionTransporte = async (seleccion) =>
    aResultadoExportacionDialog(
      await exportarListadoDesktop(fincaId, seleccion, {
        consulta: finalizarConsultaListado(consultaActual).searchParams,
      }),
    )
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

  // #110: preference lifecycle wiring. Saves are debounced and serialized so a
  // burst of column toggles coalesces and later writes win (LWW). A failed save
  // keeps the URL/session selection and flags a retryable warning.
  const guardarAhora = (prefs: PreferenciasListado) => {
    guardadoChainRef.current = guardadoChainRef.current.then(async () => {
      const resultado = await guardarPreferenciasListado(fincaId, prefs)
      setFalloGuardado(resultado.tipo === "error")
    })
  }
  const programarGuardado = (prefs: PreferenciasListado) => {
    if (guardadoTimerRef.current !== undefined) clearTimeout(guardadoTimerRef.current)
    guardadoTimerRef.current = setTimeout(
      () => guardarAhora(prefs),
      GUARDADO_PREFERENCIAS_DEBOUNCE_MS,
    )
  }
  const onCambiarPagina = (pagina: number) =>
    onNavegarConsulta({ consulta: cambiarPaginaListado(consultaActual, pagina), replace: false })
  const onCambiarPageSize = (pageSize: number) => {
    const tamaño = normalizarPageSizeListado(pageSize)
    onNavegarConsulta({ consulta: cambiarPageSizeListado(consultaActual, tamaño), replace: false })
    programarGuardado({ cols: mezcla.efectivas.cols, pageSize: tamaño })
  }
  const onCambiarColumnas = (ids: readonly string[]) => {
    const cols = normalizarColsListado(ids)
    onNavegarConsulta({ consulta: cambiarColsListado(consultaActual, cols), replace: false })
    programarGuardado({ cols, pageSize: mezcla.efectivas.pageSize })
  }
  const onResetPreferencias = () => {
    const defecto: PreferenciasListado = { cols: normalizarColsListado([]), pageSize: 25 }
    setCargaPreferencias({ tipo: "listo", preferencias: defecto })
    setFalloGuardado(false)
    const siguiente = new URLSearchParams(consultaActual)
    siguiente.delete("pageSize")
    siguiente.delete("cols")
    siguiente.delete("page")
    onNavegarConsulta({ consulta: siguiente, replace: false })
    programarGuardado(defecto)
  }
  const onReintentarPreferencias = () => {
    if (mezcla.avisoCarga) {
      void cargarPreferenciasListado(fincaId).then(setCargaPreferencias)
    } else if (falloGuardado) {
      guardarAhora(mezcla.efectivas)
    }
  }

  const paginaActual = Math.max(1, Number.parseInt(consultaActual.get("page") ?? "1", 10) || 1)
  const totalPaginas =
    modelo !== null ? Math.max(1, Math.ceil(modelo.total / mezcla.efectivas.pageSize)) : 1
  const avisoPreferencias = mezcla.avisoCarga
    ? { mensaje: MENSAJE_AVISO_CARGA_PREFERENCIAS }
    : falloGuardado
      ? { mensaje: MENSAJE_AVISO_GUARDADO_PREFERENCIAS }
      : null
  const puedeResetear =
    !esPreferenciaDefectoListado(mezcla.efectivas) || urlPageSize !== null || urlCols !== null

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
          onExportar={() => setExportarAbierto(true)}
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
          paginacion={{
            pagina: paginaActual,
            totalPaginas,
            pageSize: mezcla.efectivas.pageSize,
            pageSizes: PAGE_SIZE_OPTIONS_LISTADO,
            onCambiarPagina,
            onCambiarPageSize,
          }}
          selectorColumnas={{
            columnas: crearSelectorColumnasListado(mezcla.efectivas.cols),
            onCambiar: onCambiarColumnas,
          }}
          onResetPreferencias={onResetPreferencias}
          puedeResetear={puedeResetear}
          avisoPreferencias={avisoPreferencias}
          onReintentarPreferencias={onReintentarPreferencias}
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
      {/* #111: the export dialog (LA-070/074) opens from the desktop Exportar
          button; it portals to <body>, so it is unaffected by the desktop-only
          branch above. The Toaster renders the dialog's success/400 toasts. */}
      <AnimalExportacionDialog
        open={exportarAbierto}
        onOpenChange={setExportarAbierto}
        exportar={transportarExportacion}
      />
      <Toaster />
    </div>
  )
}

function AnimalsListRoute() {
  const { permissions, legado, catalogs, preferencias } = Route.useLoaderData()
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
      preferencias={preferencias}
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
