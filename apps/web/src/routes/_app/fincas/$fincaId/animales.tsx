import type { AnimalMobileListReadResult, AnimalMobileRow } from "@ganaweb/aplicacion"
/**
 * Animals list route — #108 desktop wiring (PR 3) + #156/#157/#158 mobile wiring.
 *
 * Data flow (design.md):
 * - loader ─> `getAnimalListadoVisualPermissionsAction(fincaId)` — fail-closed
 *   visual projection `{ canCreate, canExport }` (LA-RBAC-02/03, LA-RBAC-05).
 * - loader ─> `getAnimalMobileListAction(fincaId)` — MOBILE branch only
 *   (AnimalListMobile): first page of the #155 mobile contract resolved
 *   server-side through the read model (issue #156; no self-fetch to the HTTP
 *   endpoint). Fail-closed `permiso_denegado` on denial/failure.
 * - view ─> GET `/api/fincas/{fincaId}/animales` (#107 authorization) through
 *   the typed route adapter -> `AnimalListadoDesktop` (DESKTOP branch only).
 *
 * Deviation note (documented in apply-progress): the #107 fetch runs in the
 * route view (client effect) rather than the loader because LA-040–043 —
 * retain the last valid model, strip invalid URL parameters, announce the
 * correction — is client-stateful by contract ("the frontend owns the visual
 * behavior and URL sanitization"). The loader keeps the projection and the
 * mobile first page exactly as designed.
 *
 * Mobile state machine (#158, LM-030/LM-009/LM-023): the SSR first page seeds
 * the accumulation; filter changes refetch page 1 (replacing it); the
 * IntersectionObserver sentinel appends page N+1 while `hayMas`; 400 sanitizes
 * the offending filter + toast + retains the list + refetches page 1; 403
 * clears the data to the denied state; 500/timeout/network enters the
 * retriable error state (never a silent empty list).
 *
 * LM-011 (offline, future — gate `no-sqlite`): when the local replica exists,
 * the same mobile use case runs against SQLite WASM; the client adapter
 * (`cargarListadoMobile`) is the seam that swaps transport for replica, so
 * this route wiring stays unchanged. No offline code today — the gate forbids it.
 *
 * Rollback surface: revert this file to the legacy `AnimalDesktopScreen`
 * wiring (the component remains exported by `@ganaweb/ui`); #107, the
 * adapter, the projection, and the mobile branch stay untouched.
 * Boundaries: no filters/search/order (#109) or pagination/selector/preferences
 * (#110). Since #111 the desktop `Exportar` button opens `AnimalExportacionDialog`,
 * whose transport reuses the active query through `exportarListadoDesktop`.
 * Mobile chips/search/propietario (#157) plus infinite scroll and the
 * distinguishable states (#158) run client-side through the
 * `cargarListadoMobile` adapter against the #155 contract.
 */
import {
  AnimalExportacionDialog,
  type AnimalExportacionTransporte,
  AnimalListMobile,
  type AnimalListMobileEstado,
  AnimalListadoDesktop,
  type AnimalListadoDesktopRow,
  type ResultadoExportacionDialog,
  Toaster,
  toast,
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
  type ChipListadoMobile,
  type FiltrosListadoMobile,
  type ResultadoListadoMobileCliente,
  cargarListadoMobile,
  sanitizarFiltrosMobilePorCampo,
} from "../../../../features/animales-mobile/animal-mobile-list-adapter.js"
import {
  type AnimalCatalogs,
  type ResultadoListadoMobileServer,
  getAnimalCatalogsAction,
  getAnimalListadoPreferenciasAction,
  getAnimalListadoVisualPermissionsAction,
  getAnimalMobileListAction,
} from "../../../../server/animal-actions.js"
import type { ResultadoPreferenciasListadoServer } from "../../../../server/animal-list-preferences.server.js"

const PERMISOS_VISUALES_DENEGADOS: AnimalListadoVisualPermissions = {
  canCreate: false,
  canExport: false,
}

/** Fail-closed mobile first page — mirrors the visual projection catch. */
const LISTADO_MOBILE_DENEGADO: ResultadoListadoMobileServer = { tipo: "permiso_denegado" }

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

/** Mobile first page (#155 contract) — the desktop branch never consumes it. */
export type AnimalsListadoMobileData = ResultadoListadoMobileServer

export const Route = createFileRoute("/_app/fincas/$fincaId/animales")({
  loader: async ({ params }) => {
    const [permissions, listadoMobile, catalogs, preferencias] = await Promise.all([
      // Fail closed: an RPC failure never produces a false grant (LA-RBAC-05).
      getAnimalListadoVisualPermissionsAction({ data: { fincaId: params.fincaId } }).catch(
        () => PERMISOS_VISUALES_DENEGADOS,
      ),
      // Issue #156: the read model resolves the #155 first page server-side;
      // a denial/failure keeps the fail-closed denied state (LM-RBAC-01/02).
      getAnimalMobileListAction({ data: { fincaId: params.fincaId } }).catch(
        () => LISTADO_MOBILE_DENEGADO,
      ),
      getAnimalCatalogsAction({ data: { fincaId: params.fincaId } }),
      // #110: best-effort SSR preference load; a failure maps to `error` and the
      // view falls back to 29/25 defaults with a retryable warning (PE-001–003).
      getAnimalListadoPreferenciasAction({ data: { fincaId: params.fincaId } }).catch(() => ({
        tipo: "error" as const,
      })),
    ])
    return { permissions, listadoMobile, catalogs, preferencias }
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
  /** Issue #156: SSR first page of the #155 mobile contract (loader-resolved). */
  readonly listadoMobile: AnimalsListadoMobileData
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

interface ProcesarResultadoDeps {
  ultimoModelo: { current: AnimalListadoDesktopModel | null }
  setAviso: (aviso: AnimalListadoToastPayload | null) => void
  setEstado: (estado: EstadoVistaListado) => void
  permissions: AnimalListadoVisualPermissions
  consulta: string
  sanearRef: { current: ((consultaSanitizada: URLSearchParams) => void) | undefined }
}

function procesarResultadoListado(
  resultado: Awaited<ReturnType<typeof cargarListadoDesktop>>,
  deps: ProcesarResultadoDeps,
): void {
  switch (resultado.tipo) {
    case "listo": {
      deps.ultimoModelo.current = resultado.modelo
      deps.setAviso(null)
      deps.setEstado({ tipo: "listo", modelo: resultado.modelo })
      return
    }
    case "sin_acceso": {
      deps.ultimoModelo.current = null // LA-041: 403 clears the data.
      deps.setEstado({ tipo: "sin-acceso" })
      return
    }
    case "error_servidor": {
      deps.setEstado({ tipo: "error" })
      return
    }
    case "consulta_invalida": {
      // LA-040–043: retain the last valid table, strip the reported
      // parameter (resetting the page when the dataset changes), and
      // announce the correction. #109 owns general filter mutation.
      const retenido = deps.ultimoModelo.current
      const saneado = sanitizarListadoBadRequest(
        resultado.error,
        retenido ?? modeloVacioListado(deps.permissions),
        new URLSearchParams(deps.consulta),
      )
      deps.setAviso(saneado.toast)
      if (saneado.removedParams.length > 0) deps.sanearRef.current?.(saneado.sanitizedQuery)
      if (retenido !== null) {
        deps.setEstado({ tipo: "listo", modelo: retenido })
      } else if (saneado.removedParams.length === 0) {
        deps.setEstado({ tipo: "error" }) // nothing to retain nor to sanitize
      }
      // Otherwise the sanitized URL re-runs this effect and reloads.
      return
    }
  }
}

/**
 * #110: preference lifecycle hook. The SSR load seeds the state; a failed load
 * is retryable through the client transport. `falloGuardado` flags a failed save
 * so the session selection is retained with a retryable warning (LWW).
 *
 * Also owns the effective #107 request query: the URL owns explicit values;
 * prefs-derived values are injected only when the URL lacks them AND differ from
 * the #107 server defaults (25 / 29 base cols), so a default selection keeps a
 * clean URL and a customized one rides along to the read model.
 */
function usePreferenciasListado(
  fincaId: string,
  preferencias: ResultadoPreferenciasListadoServer | undefined,
  consulta: string,
  onNavegarConsulta: (intencion: AnimalListadoQueryNavigation) => void,
) {
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

  // Saves are debounced and serialized so a burst of column toggles coalesces
  // and later writes win (LWW). A failed save keeps the URL/session selection
  // and flags a retryable warning.
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

  const avisoPreferencias = mezcla.avisoCarga
    ? { mensaje: MENSAJE_AVISO_CARGA_PREFERENCIAS }
    : falloGuardado
      ? { mensaje: MENSAJE_AVISO_GUARDADO_PREFERENCIAS }
      : null
  const puedeResetear =
    !esPreferenciaDefectoListado(mezcla.efectivas) || urlPageSize !== null || urlCols !== null

  return {
    consultaActual,
    consultaListado,
    mezcla,
    onCambiarPagina,
    onCambiarPageSize,
    onCambiarColumnas,
    onResetPreferencias,
    onReintentarPreferencias,
    avisoPreferencias,
    puedeResetear,
  }
}

/** Infinite-scroll accumulation (#158, LM-009): pages 1..N of the #155 DTO. */
interface AcumuladoListadoMobile {
  readonly animales: readonly AnimalMobileRow[]
  readonly pagina: number
  readonly hayMas: boolean
  readonly total: number
  readonly totalSinFiltro: number
}

type VistaListadoMobile = "cargando_inicial" | "listo" | "sin_acceso" | "error"

/** LM-023 (400): transport-only fields retry as-is; anything else is a filter. */
function campoSaneableMobile(campo: string | null): boolean {
  return (
    campo === "q" ||
    campo === "f.categoriaReproductivaKey" ||
    campo === "f.saludKey" ||
    campo === "f.propietarioId" ||
    campo === "page" ||
    campo === "pageSize"
  )
}

function aAcumuladoListadoMobile(resultado: AnimalMobileListReadResult): AcumuladoListadoMobile {
  return {
    animales: resultado.data,
    pagina: resultado.page,
    hayMas: resultado.hayMas,
    total: resultado.total,
    totalSinFiltro: resultado.totalSinFiltro,
  }
}

/**
 * LM-009: page 1 replaces the accumulation; page N+1 appends to it. A stale
 * page (epoch-guarded upstream) can neither replace nor append.
 */
function acumularPaginaMobile(
  previo: AcumuladoListadoMobile | null,
  resultado: AnimalMobileListReadResult,
): AcumuladoListadoMobile {
  if (previo === null || resultado.page <= 1) return aAcumuladoListadoMobile(resultado)
  return {
    ...previo,
    animales: [...previo.animales, ...resultado.data],
    pagina: resultado.page,
    hayMas: resultado.hayMas,
    total: resultado.total,
    totalSinFiltro: resultado.totalSinFiltro,
  }
}

function sembrarListadoMobile(listadoMobile: AnimalsListadoMobileData): {
  acumulado: AcumuladoListadoMobile | null
  vista: VistaListadoMobile
} {
  if (listadoMobile.tipo === "permiso_denegado") return { acumulado: null, vista: "sin_acceso" }
  return { acumulado: aAcumuladoListadoMobile(listadoMobile.resultado), vista: "listo" }
}

/**
 * Issue #157/#158 (LM-005..009, LM-014, LM-015, LM-023, LM-030): client state
 * machine for the mobile list. The SSR first page seeds the accumulation
 * without fetching; every filter change requests page 1 (replacing the
 * accumulation); `cargarMas` appends page N+1 while `hayMas` (LM-009).
 * Error semantics (LM-023): 400 sanitizes the offending filter, toasts,
 * retains the last valid list and refetches page 1; 403 clears the data to
 * the denied state; 500/timeout/network enters the retriable error state —
 * never a silent empty list. The desktop branch never reads this state.
 */
function useFiltrosListadoMobile(fincaId: string, listadoMobile: AnimalsListadoMobileData) {
  const [chip, setChip] = useState<ChipListadoMobile>("todas")
  const [propietarioId, setPropietarioId] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState("")
  const [busquedaAplicada, setBusquedaAplicada] = useState("")

  const semilla = sembrarListadoMobile(listadoMobile)
  const [acumulado, setAcumulado] = useState<AcumuladoListadoMobile | null>(semilla.acumulado)
  const [vista, setVista] = useState<VistaListadoMobile>(semilla.vista)
  const [cargando, setCargando] = useState(false)
  const [cargandoMas, setCargandoMas] = useState(false)
  /** Failed request's page — `Reintentar` refetches exactly that request. */
  const [paginaFallida, setPaginaFallida] = useState<number | null>(null)
  const [intento, setIntento] = useState(0)
  const primeraRender = useRef(true)
  /** Epoch guard: a stale response never mutates the machine (LA-045 style). */
  const epocaRef = useRef(0)

  const filtrosActuales: FiltrosListadoMobile = { chip, propietarioId, q: busquedaAplicada }
  const filtrosRef = useRef(filtrosActuales)
  filtrosRef.current = filtrosActuales
  const acumuladoRef = useRef(acumulado)
  acumuladoRef.current = acumulado
  const vistaRef = useRef(vista)
  vistaRef.current = vista
  const cargandoRef = useRef(cargando)
  cargandoRef.current = cargando
  const cargandoMasRef = useRef(cargandoMas)
  cargandoMasRef.current = cargandoMas

  // LM-014: the search debounces 300 ms in the route layer; packages/ui stays
  // dumb. "Quitar filtro" applies the cleared input immediately so it issues
  // one request instead of two.
  useEffect(() => {
    const temporizador = setTimeout(() => setBusquedaAplicada(busqueda), BUSQUEDA_DEBOUNCE_MS)
    return () => clearTimeout(temporizador)
  }, [busqueda])

  const procesarResultadoMobile = (
    resultado: ResultadoListadoMobileCliente,
    contexto: { readonly filtros: FiltrosListadoMobile; readonly pagina: number },
  ) => {
    switch (resultado.tipo) {
      case "listo": {
        setCargando(false)
        setCargandoMas(false)
        setPaginaFallida(null)
        setAcumulado((previo) => acumularPaginaMobile(previo, resultado.resultado))
        setVista("listo")
        return
      }
      case "consulta_invalida": {
        // LM-023 (400): sanitize the offending filter, announce the
        // correction, retain the last valid list, and refetch page 1. An
        // unidentifiable campo is not safely correctable — error state.
        const campo = resultado.error.campo
        if (!campoSaneableMobile(campo)) {
          setCargando(false)
          setCargandoMas(false)
          setPaginaFallida(1)
          setVista("error")
          return
        }
        toast({
          title: "Parámetros de la consulta corregidos",
          description: resultado.error.motivo,
        })
        const saneado = sanitizarFiltrosMobilePorCampo(contexto.filtros, campo)
        setChip(saneado.chip)
        setPropietarioId(saneado.propietarioId)
        setBusqueda(saneado.q)
        setBusquedaAplicada(saneado.q)
        setCargandoMas(false)
        setCargando(acumuladoRef.current !== null && vistaRef.current === "listo")
        // The sanitized state (and/or `intento`) re-runs the page-1 effect.
        setIntento((actual) => actual + 1)
        return
      }
      case "sin_acceso": {
        // LM-030.5: denial clears any previous data.
        setCargando(false)
        setCargandoMas(false)
        setPaginaFallida(null)
        setAcumulado(null)
        setVista("sin_acceso")
        return
      }
      case "error_servidor": {
        // LM-023/LM-030.6: explicit retriable error — never a silent empty
        // list. The accumulation is retained for a page N+1 retry append.
        setCargando(false)
        setCargandoMas(false)
        setPaginaFallida(contexto.pagina)
        setVista("error")
        return
      }
    }
  }

  const ejecutarCargaPaginaSiguiente = (pagina: number, filtros: FiltrosListadoMobile) => {
    const epoca = ++epocaRef.current
    // Synchronous guard: repeated sentinel intersections before the re-render
    // must not dispatch duplicate requests (LM-009).
    cargandoMasRef.current = true
    setCargandoMas(true)
    setVista("listo")
    void cargarListadoMobile(fincaId, filtros, { pagina }).then((resultado) => {
      if (epocaRef.current !== epoca) return
      procesarResultadoMobile(resultado, { filtros, pagina })
    })
  }

  // LM-009: any chip/propietario/search change fetches page 1 and replaces
  // the accumulation; the initial render uses the SSR page without fetching.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the pre-fetch visible state is read through refs so retained data never re-triggers the fetch.
  useEffect(() => {
    if (primeraRender.current) {
      primeraRender.current = false
      return
    }
    const epoca = ++epocaRef.current
    // LM-030.1: skeletons only when there is no valid list to retain.
    if (acumuladoRef.current !== null && vistaRef.current === "listo") {
      setCargando(true)
      setCargandoMas(false)
    } else {
      setCargando(false)
      setCargandoMas(false)
      setVista("cargando_inicial")
    }
    void cargarListadoMobile(fincaId, { chip, propietarioId, q: busquedaAplicada }).then(
      (resultado) => {
        if (epocaRef.current !== epoca) return
        procesarResultadoMobile(resultado, {
          filtros: { chip, propietarioId, q: busquedaAplicada },
          pagina: 1,
        })
      },
    )
  }, [fincaId, chip, propietarioId, busquedaAplicada, intento])

  // A finca switch resets the machine back to the (new) SSR first page.
  const [fincaActual, setFincaActual] = useState(fincaId)
  if (fincaActual !== fincaId) {
    setFincaActual(fincaId)
    setChip("todas")
    setPropietarioId(null)
    setBusqueda("")
    setBusquedaAplicada("")
    const siguiente = sembrarListadoMobile(listadoMobile)
    setAcumulado(siguiente.acumulado)
    setVista(siguiente.vista)
    setCargando(false)
    setCargandoMas(false)
    setPaginaFallida(null)
    setIntento(0)
    primeraRender.current = true
    epocaRef.current += 1
  }

  const quitarFiltros = () => {
    setChip("todas")
    setPropietarioId(null)
    setBusqueda("")
    setBusquedaAplicada("")
  }

  /** LM-009: sentinel callback — guarded against duplicate in-flight loads. */
  const cargarMas = () => {
    const actual = acumuladoRef.current
    if (
      vistaRef.current !== "listo" ||
      actual === null ||
      !actual.hayMas ||
      cargandoRef.current ||
      cargandoMasRef.current
    ) {
      return
    }
    ejecutarCargaPaginaSiguiente(actual.pagina + 1, filtrosRef.current)
  }

  /** LM-030.6: Reintentar refetches exactly the failed request. */
  const reintentar = () => {
    if (vistaRef.current !== "error" || paginaFallida === null) return
    if (paginaFallida === 1) {
      // The page-1 effect owns the request; the filters are unchanged since the
      // failure (any filter change would have left the error state already).
      setIntento((actual) => actual + 1)
      return
    }
    ejecutarCargaPaginaSiguiente(paginaFallida, filtrosRef.current)
  }

  return {
    chip,
    setChip,
    propietarioId,
    setPropietarioId,
    busqueda,
    setBusqueda,
    quitarFiltros,
    vista,
    animales: acumulado?.animales ?? [],
    total: acumulado?.total ?? 0,
    totalSinFiltro: acumulado?.totalSinFiltro ?? 0,
    hayMas: acumulado?.hayMas ?? false,
    cargando,
    cargandoMas,
    onCargarMas: cargarMas,
    onReintentar: reintentar,
  }
}

export function AnimalsListRouteView({
  fincaId,
  permissions,
  listadoMobile,
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

  const {
    consultaActual,
    consultaListado,
    mezcla,
    onCambiarPagina,
    onCambiarPageSize,
    onCambiarColumnas,
    onResetPreferencias,
    onReintentarPreferencias,
    avisoPreferencias,
    puedeResetear,
  } = usePreferenciasListado(fincaId, preferencias, consulta, onNavegarConsulta)

  // biome-ignore lint/correctness/useExhaustiveDependencies: onSanearUrl is read through sanearRef so route-provided callbacks never retrigger the #107 fetch.
  useEffect(() => {
    let activo = true
    setEstado({ tipo: "cargando" })
    void cargarListadoDesktop(fincaId, permissions, { consulta: consultaListado }).then(
      (resultado) => {
        if (!activo) return
        procesarResultadoListado(resultado, {
          ultimoModelo,
          setAviso,
          setEstado,
          permissions,
          consulta,
          sanearRef,
        })
      },
    )
    return () => {
      activo = false
    }
  }, [fincaId, permissions, consultaListado, intento])

  // Issue #157/#158: mobile list client state machine (filters, infinite
  // scroll accumulation, and the LM-030 distinguishable states).
  const filtrosMobile = useFiltrosListadoMobile(fincaId, listadoMobile)

  // Issue #156: the mobile branch consumes the #155 contract resolved by the
  // loader; `canCreate` comes from the visual projection (LM-RBAC-03).
  const filasMobile = filtrosMobile.animales
  const estadoMobile: AnimalListMobileEstado = (() => {
    switch (filtrosMobile.vista) {
      case "cargando_inicial":
        return { tipo: "cargando_inicial" }
      case "listo":
        return { tipo: "listo" }
      case "sin_acceso":
        // LM-030.5: denial with safe back navigation (LA-041 seam).
        return { tipo: "sin_acceso", onVolver }
      case "error":
        return { tipo: "error", onReintentar: filtrosMobile.onReintentar }
    }
  })()
  const goNew = () => {
    if (permissions.canCreate) onIrANuevo()
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

  const paginaActual = Math.max(1, Number.parseInt(consultaActual.get("page") ?? "1", 10) || 1)
  const totalPaginas =
    modelo !== null ? Math.max(1, Math.ceil(modelo.total / mezcla.efectivas.pageSize)) : 1

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
          animales={filasMobile}
          canCreate={permissions.canCreate}
          onPressAnimal={(animal) => onAbrirFicha(animal.id)}
          onNuevoAnimal={goNew}
          bottomNavItems={bottomNavItems}
          estado={estadoMobile}
          totalSinFiltro={filtrosMobile.totalSinFiltro}
          {...(filtrosMobile.vista === "sin_acceso"
            ? {}
            : {
                filtros: {
                  chipActivo: filtrosMobile.chip,
                  onChip: filtrosMobile.setChip,
                  // LM-015/CA-UI-001: el catálogo SSR ya viene por finca y
                  // solo activos; el selector muestra el label y viaja el id.
                  propietarioOpciones: catalogs.propietario.options.map((opcion) => ({
                    id: opcion.value,
                    label: opcion.label,
                  })),
                  propietarioId: filtrosMobile.propietarioId,
                  onPropietario: filtrosMobile.setPropietarioId,
                  busqueda: filtrosMobile.busqueda,
                  onBuscar: filtrosMobile.setBusqueda,
                  total: filtrosMobile.total,
                  onQuitarFiltros: filtrosMobile.quitarFiltros,
                  cargando: filtrosMobile.cargando,
                },
              })}
          {...(filtrosMobile.vista === "listo"
            ? {
                // LM-009: infinite scroll — the sentinel appends page N+1.
                scrollInfinito: {
                  hayMas: filtrosMobile.hayMas,
                  cargandoMas: filtrosMobile.cargandoMas,
                  onCargarMas: filtrosMobile.onCargarMas,
                },
              }
            : {})}
        />
      </div>
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
  const { permissions, listadoMobile, catalogs, preferencias } = Route.useLoaderData()
  const { fincaId } = Route.useParams()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const consulta = useRouterState({ select: (state) => state.location.searchStr })
  if (pathname !== `/fincas/${fincaId}/animales`) return <Outlet />

  return (
    <AnimalsListRouteView
      fincaId={fincaId}
      permissions={permissions}
      listadoMobile={listadoMobile}
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
