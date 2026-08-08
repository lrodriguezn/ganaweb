/**
 * Issue #228 — Tablero e Historial de Eventos (RF-EVENTOS v1.1 §3,
 * EV-UI-001..007, EV-CA-002/003).
 *
 * Ruta `/fincas/$fincaId/eventos` con dos vistas en el mismo archivo:
 *  - Tablero: por defecto (`?vista=tablero` o sin search).
 *  - Historial: `?vista=historial` (mismo contrato visual que el feed,
 *    paginado y filtrable, ver EV-UI-005).
 *
 * El loader entrega el primer paint en una sola pasada (loader fail-closed
 * por fuente — patrón #212): el feed y los contadores del mes en curso
 * para la finca activa. La paginación del historial se pide después con
 * `leerEventosFincaHistorialFn` (mismo patrón que `sanidad/historial.tsx`).
 *
 * RBAC por dominio (EV-SEC-002/004): el caso de uso `leerEventosFinca`
 * filtra por permisos; la vista solo renderiza las categorías autorizadas
 * (`categoriasVisibles` derivado de los permisos de la sesión).
 *
 * Wizard #229: la ruta NO duplica el shell de captura; expone
 * `onAbrirWizard` que la vista cablea al `<EventoWizard>` ya implementado.
 *
 * Composición:
 *  - `Route` — `createFileRoute(...)` con `validateSearch`, `beforeLoad`
 *    (sesión + RBAC) y `loader` (primer paint fail-closed).
 *  - `EventosRoute` — componente TanStack: usa hooks del router, monta
 *    el Outlet, y delega al `EventosRouteView` con los datos resolved.
 *  - `EventosRouteView` — presentacional puro (testable con props).
 */
import {
  type CategoriaEventoTablero as CategoriaEventoTableroUi,
  EventoWizard,
  type FiltrosEventosFinca,
  HistorialEventos,
  type PermisosEfectivosPorDominio,
  TableroEventos,
  crearPermisos,
  tienePermiso,
} from "@ganaweb/ui"
import {
  Outlet,
  createFileRoute,
  useNavigate,
  useRouter,
  useRouterState,
} from "@tanstack/react-router"
import { useCallback, useEffect, useState } from "react"
import { getCurrentSession } from "../../../../server/auth.js"
import {
  type ContadoresEventosFincaRespuesta,
  type EventoFeedItemDto,
  type EventoFeedRespuesta,
  type EventoHistorialItemDto,
  type EventoHistorialRespuesta,
  type LeerContadoresEventosFincaWebInput,
  type LeerEventosFincaWebInput,
  leerContadoresEventosFincaFn,
  leerEventosFincaHistorialFn,
  leerEventosFincaTableroFn,
} from "../../../../server/eventos-finca-read.js"
import {
  buscarAnimalPorCodigoFn,
  capturarEventoFn,
  listarAnimalesPorOrigenFn,
} from "../../../../server/eventos-wizard.js"

export type VistaEventos = "tablero" | "historial"

export interface EventosSearch {
  vista?: VistaEventos | undefined
  categoria?: CategoriaEventoTableroUi | undefined
  tipo?: string | undefined
  fechaDesde?: string | undefined
  fechaHasta?: string | undefined
  cursor?: string | undefined
  page?: number | undefined
}

/**
 * Construye un `EventosSearch` "limpio" sin campos `undefined` explícitos.
 * `exactOptionalPropertyTypes` rechaza `categoria: undefined` en campos
 * opcionales puros; este helper filtra los `undefined` para producir un
 * objeto serializable 1:1 al search params de TanStack Router.
 */
function construirSearch(base: {
  readonly vista?: VistaEventos | undefined
  readonly categoria?: CategoriaEventoTableroUi | undefined
  readonly tipo?: string | undefined
  readonly fechaDesde?: string | undefined
  readonly fechaHasta?: string | undefined
  readonly cursor?: string | undefined
  readonly page?: number | undefined
}): EventosSearch {
  const out: EventosSearch = {}
  if (base.vista !== undefined) out.vista = base.vista
  if (base.categoria !== undefined) out.categoria = base.categoria
  if (base.tipo !== undefined) out.tipo = base.tipo
  if (base.fechaDesde !== undefined) out.fechaDesde = base.fechaDesde
  if (base.fechaHasta !== undefined) out.fechaHasta = base.fechaHasta
  if (base.cursor !== undefined) out.cursor = base.cursor
  if (base.page !== undefined) out.page = base.page
  return out
}

const CATEGORIAS_TODAS: readonly CategoriaEventoTableroUi[] = [
  "reproductivo",
  "sanidad",
  "productivo",
  "movimientos",
]

interface SesionParaEventos {
  readonly usuarioId: string
  readonly fincaActivaId: string
  readonly fincaActivaNombre: string
  readonly permisos: readonly { readonly modulo: string; readonly accion: string }[]
}

export interface EventosFincaLoaderData {
  readonly fincaNombre: string
  readonly fincaId: string
  readonly categoriasVisibles: readonly CategoriaEventoTableroUi[]
  readonly permisosEfectivos: PermisosEfectivosPorDominio
  readonly feed: EventoFeedRespuesta
  readonly contadores: ContadoresEventosFincaRespuesta
  readonly sesion: SesionParaEventos
}

const PERMISOS_VER_POR_DOMINIO: Readonly<
  Record<CategoriaEventoTableroUi, readonly [string, string]>
> = {
  reproductivo: ["eventos_reproductivos", "ver"],
  sanidad: ["sanidad", "ver"],
  productivo: ["eventos_productivos", "ver"],
  movimientos: ["movimientos", "ver"],
}

const PERMISOS_CREAR_POR_DOMINIO: Readonly<
  Record<CategoriaEventoTableroUi, readonly [string, string]>
> = {
  reproductivo: ["eventos_reproductivos", "crear"],
  sanidad: ["sanidad", "crear"],
  productivo: ["eventos_productivos", "crear"],
  movimientos: ["movimientos", "crear"],
}

const PERMISOS_EFECTIVOS_FALSOS: PermisosEfectivosPorDominio = {
  reproductivo: false,
  sanidad: false,
  productivo: false,
  movimientos: false,
}

function categoriasVisiblesDesdeSesion(
  sesion: SesionParaEventos,
): readonly CategoriaEventoTableroUi[] {
  const setPermisos = crearPermisos(
    sesion.permisos.map((p) => ({ modulo: p.modulo, accion: p.accion })),
  )
  return CATEGORIAS_TODAS.filter((cat) => {
    const [modulo, accion] = PERMISOS_VER_POR_DOMINIO[cat]
    return tienePermiso(setPermisos, modulo, accion)
  })
}

function permisosEfectivosDesdeSesion(sesion: SesionParaEventos): PermisosEfectivosPorDominio {
  const setPermisos = crearPermisos(
    sesion.permisos.map((p) => ({ modulo: p.modulo, accion: p.accion })),
  )
  return {
    reproductivo: tienePermiso(setPermisos, ...PERMISOS_CREAR_POR_DOMINIO.reproductivo),
    sanidad: tienePermiso(setPermisos, ...PERMISOS_CREAR_POR_DOMINIO.sanidad),
    productivo: tienePermiso(setPermisos, ...PERMISOS_CREAR_POR_DOMINIO.productivo),
    movimientos: tienePermiso(setPermisos, ...PERMISOS_CREAR_POR_DOMINIO.movimientos),
  }
}

function contadoresVacios(): ContadoresEventosFincaRespuesta {
  return {
    tipo: "ok",
    contadores: {
      mes: "",
      desde: "",
      hasta: "",
      porDominio: { reproductivo: 0, sanidad: 0, productivo: 0, movimientos: 0 },
      total: 0,
    },
  }
}

function feedVacio(): EventoFeedRespuesta {
  return { tipo: "ok", items: [] }
}

export const Route = createFileRoute("/_app/fincas/$fincaId/eventos")({
  validateSearch: (search: Record<string, unknown>): EventosSearch => {
    const resultado: EventosSearch = {}
    if (search.vista === "tablero" || search.vista === "historial") {
      resultado.vista = search.vista
    }
    if (
      search.categoria === "reproductivo" ||
      search.categoria === "sanidad" ||
      search.categoria === "productivo" ||
      search.categoria === "movimientos"
    ) {
      resultado.categoria = search.categoria
    }
    if (typeof search.tipo === "string" && search.tipo !== "") resultado.tipo = search.tipo
    if (typeof search.fechaDesde === "string" && search.fechaDesde !== "")
      resultado.fechaDesde = search.fechaDesde
    if (typeof search.fechaHasta === "string" && search.fechaHasta !== "")
      resultado.fechaHasta = search.fechaHasta
    if (typeof search.cursor === "string" && search.cursor !== "") resultado.cursor = search.cursor
    if (typeof search.page === "number" && search.page >= 1) resultado.page = search.page
    return resultado
  },
  beforeLoad: async ({ params }) => {
    const decision = await getCurrentSession({ data: { fincaId: params.fincaId } })
    if (decision.tipo !== "autorizado") {
      return {
        sesion: null as SesionParaEventos | null,
        categoriasVisibles: [] as readonly CategoriaEventoTableroUi[],
        permisosEfectivos: PERMISOS_EFECTIVOS_FALSOS,
      }
    }
    if (decision.sesion.fincaActivaId !== params.fincaId) {
      return {
        sesion: null as SesionParaEventos | null,
        categoriasVisibles: [] as readonly CategoriaEventoTableroUi[],
        permisosEfectivos: PERMISOS_EFECTIVOS_FALSOS,
      }
    }
    const sesion: SesionParaEventos = {
      usuarioId: decision.sesion.usuarioId,
      fincaActivaId: decision.sesion.fincaActivaId,
      fincaActivaNombre: decision.sesion.fincaActivaNombre,
      permisos: decision.sesion.permisos,
    }
    return {
      sesion,
      categoriasVisibles: categoriasVisiblesDesdeSesion(sesion),
      permisosEfectivos: permisosEfectivosDesdeSesion(sesion),
    }
  },
  loader: async ({ params, context }): Promise<EventosFincaLoaderData> => {
    const ctx = context as {
      sesion: SesionParaEventos | null
      categoriasVisibles: readonly CategoriaEventoTableroUi[]
      permisosEfectivos: PermisosEfectivosPorDominio
    }
    if (!ctx.sesion) {
      return {
        fincaNombre: "",
        fincaId: params.fincaId,
        categoriasVisibles: [],
        permisosEfectivos: PERMISOS_EFECTIVOS_FALSOS,
        feed: feedVacio(),
        contadores: contadoresVacios(),
        sesion: {
          usuarioId: "",
          fincaActivaId: params.fincaId,
          fincaActivaNombre: "",
          permisos: [],
        },
      }
    }
    const inputFeed: LeerEventosFincaWebInput = { fincaId: params.fincaId }
    const inputContadores: LeerContadoresEventosFincaWebInput = { fincaId: params.fincaId }
    const [feed, contadores] = await Promise.all([
      leerEventosFincaTableroFn({ data: inputFeed }).catch(() => null),
      leerContadoresEventosFincaFn({ data: inputContadores }).catch(() => null),
    ])

    return {
      fincaNombre: ctx.sesion.fincaActivaNombre,
      fincaId: params.fincaId,
      categoriasVisibles: ctx.categoriasVisibles,
      permisosEfectivos: ctx.permisosEfectivos,
      feed: feed && feed.tipo === "ok" ? feed : feedVacio(),
      contadores: contadores && contadores.tipo === "ok" ? contadores : contadoresVacios(),
      sesion: ctx.sesion,
    }
  },
  component: EventosRoute,
})

type EstadoHistorial =
  | { readonly tipo: "cargando" }
  | { readonly tipo: "error" }
  | {
      readonly tipo: "listo"
      readonly items: readonly EventoHistorialItemDto[]
      readonly nextCursor?: string
      readonly pendientes?: number
    }

const CATALOGOS_VACIOS = { lotes: [], potreros: [], grupos: [] } as const

/* -------------------------------------------------------------------------- */
/* Componente presentacional puro (testable con loader data pineada).          */
/* -------------------------------------------------------------------------- */

export interface EventosRouteViewProps {
  readonly data: EventosFincaLoaderData
  readonly search: EventosSearch
  readonly onNavegarSearch: (siguiente: EventosSearch) => void
  readonly onInvalidarRouter: () => void
  readonly recargarHistorial: (
    filtros: FiltrosEventosFinca,
    cursor: string | undefined,
    setEstado: (estado: EstadoHistorial) => void,
  ) => void
}

export function EventosRouteView({
  data,
  search,
  onNavegarSearch,
  onInvalidarRouter,
  recargarHistorial,
}: EventosRouteViewProps) {
  const [wizardAbierto, setWizardAbierto] = useState(false)
  const [categoriaPreseleccionada, setCategoriaPreseleccionada] = useState<
    CategoriaEventoTableroUi | undefined
  >(undefined)
  const [estadoHistorial, setEstadoHistorial] = useState<EstadoHistorial>({ tipo: "cargando" })
  const [paginaActual, setPaginaActual] = useState<number>(1)
  const [filtrosActivos, setFiltrosActivos] = useState<FiltrosEventosFinca>({})

  const vista: VistaEventos = search.vista === "historial" ? "historial" : "tablero"

  const onAbrirWizard = () => {
    setCategoriaPreseleccionada(undefined)
    setWizardAbierto(true)
  }
  const onAbrirWizardConCategoria = (cat: CategoriaEventoTableroUi) => {
    setCategoriaPreseleccionada(cat)
    setWizardAbierto(true)
  }

  const onSeleccionarCategoriaTablero = (cat: CategoriaEventoTableroUi | undefined) => {
    const siguiente: EventosSearch = construirSearch({ ...search, categoria: cat })
    onNavegarSearch(siguiente)
  }

  const onVerHistorial = () => {
    onNavegarSearch(construirSearch({ ...search, vista: "historial" }))
  }

  const onLimpiarFiltros = () => {
    const siguiente: EventosSearch = construirSearch({
      vista: vista === "historial" ? "historial" : undefined,
    })
    onNavegarSearch(siguiente)
    setFiltrosActivos({})
    setPaginaActual(1)
  }

  const onReintentarTablero = () => {
    onInvalidarRouter()
  }
  const onReintentarHistorial = () => {
    recargarHistorial(filtrosActivos, search.cursor, setEstadoHistorial)
  }

  const onAplicarFiltrosHistorial = (filtros: FiltrosEventosFinca) => {
    setFiltrosActivos(filtros)
    setPaginaActual(1)
    onNavegarSearch(
      construirSearch({
        ...search,
        vista: "historial",
        categoria: filtros.categoria,
        tipo: filtros.tipo,
        fechaDesde: filtros.fechaDesde,
        fechaHasta: filtros.fechaHasta,
        page: 1,
        cursor: undefined,
      }),
    )
  }

  const onPaginaSiguiente = () => {
    if (estadoHistorial.tipo !== "listo" || !estadoHistorial.nextCursor) return
    const siguiente = paginaActual + 1
    setPaginaActual(siguiente)
    onNavegarSearch(
      construirSearch({
        ...search,
        vista: "historial",
        page: siguiente,
        cursor: estadoHistorial.nextCursor,
      }),
    )
  }

  const onPaginaAnterior = () => {
    if (paginaActual <= 1) return
    const anterior = paginaActual - 1
    setPaginaActual(anterior)
    onNavegarSearch(
      construirSearch({
        ...search,
        vista: "historial",
        page: anterior,
      }),
    )
  }

  useEffect(() => {
    if (vista !== "historial") return
    const filtros: FiltrosEventosFinca = {
      ...(search.categoria ? { categoria: search.categoria } : {}),
      ...(search.tipo ? { tipo: search.tipo } : {}),
      ...(search.fechaDesde ? { fechaDesde: search.fechaDesde } : {}),
      ...(search.fechaHasta ? { fechaHasta: search.fechaHasta } : {}),
    }
    const pagina = search.page ?? 1
    setFiltrosActivos(filtros)
    setPaginaActual(pagina)
    recargarHistorial(filtros, search.cursor, setEstadoHistorial)
  }, [
    vista,
    search.categoria,
    search.tipo,
    search.fechaDesde,
    search.fechaHasta,
    search.page,
    search.cursor,
    recargarHistorial,
  ])

  if (data.categoriasVisibles.length === 0) {
    return (
      <div data-testid="eventos-sin-permisos" className="mx-auto max-w-2xl p-6 text-center">
        <h1 className="text-title font-semibold text-foreground">Eventos</h1>
        <p className="text-support text-muted-foreground mt-2">
          No tienes permisos para consultar eventos en esta finca. Habla con el administrador de la
          finca para habilitar los dominios que necesitas.
        </p>
      </div>
    )
  }

  const filtrosTablero: FiltrosEventosFinca = search.categoria
    ? { categoria: search.categoria }
    : {}
  const contadores =
    data.contadores.tipo === "ok" ? data.contadores.contadores : contadoresVacios().contadores
  const items: readonly EventoFeedItemDto[] = data.feed.tipo === "ok" ? data.feed.items : []

  return (
    <div className="space-y-4">
      {vista === "tablero" ? (
        <TableroEventos
          fincaNombre={data.fincaNombre}
          categoriasVisibles={data.categoriasVisibles}
          categoriaSeleccionada={search.categoria}
          contadores={contadores}
          feed={items}
          filtros={filtrosTablero}
          cargandoFeed={false}
          errorFeed={false}
          onAbrirWizard={onAbrirWizard}
          onAbrirWizardConCategoria={onAbrirWizardConCategoria}
          onSeleccionarCategoria={onSeleccionarCategoriaTablero}
          onLimpiarFiltros={onLimpiarFiltros}
          onReintentar={onReintentarTablero}
          onVerHistorial={onVerHistorial}
        />
      ) : (
        <HistorialEventos
          feed={estadoHistorial.tipo === "listo" ? estadoHistorial.items : []}
          categoria={search.categoria}
          contadores={contadores}
          filtros={filtrosActivos}
          cargando={estadoHistorial.tipo === "cargando"}
          error={estadoHistorial.tipo === "error"}
          {...(estadoHistorial.tipo === "listo" && estadoHistorial.nextCursor
            ? { nextCursor: estadoHistorial.nextCursor }
            : {})}
          {...(estadoHistorial.tipo === "listo" && estadoHistorial.pendientes !== undefined
            ? { pendientes: estadoHistorial.pendientes }
            : {})}
          paginaActual={paginaActual}
          onAplicarFiltros={onAplicarFiltrosHistorial}
          onLimpiarFiltros={onLimpiarFiltros}
          onPaginaSiguiente={onPaginaSiguiente}
          onPaginaAnterior={onPaginaAnterior}
          onReintentar={onReintentarHistorial}
          onRegistrar={onAbrirWizard}
        />
      )}

      <EventoWizard
        open={wizardAbierto}
        onOpenChange={setWizardAbierto}
        fincaId={data.fincaId}
        {...(categoriaPreseleccionada
          ? { tipoPreseleccionado: tipoPorCategoria(categoriaPreseleccionada) }
          : {})}
        permisosEfectivos={data.permisosEfectivos}
        catalogos={CATALOGOS_VACIOS}
        cargarAnimalesPorOrigen={(origen, id) =>
          cargarAnimalesPorOrigenEnRuta(data.fincaId, origen, id)
        }
        buscarAnimalPorCodigo={(codigo) => buscarAnimalPorCodigoEnRuta(data.fincaId, codigo)}
        onEnviar={(captura) => enviarCapturaEnRuta(data.fincaId, captura)}
        onCapturado={() => {
          onInvalidarRouter()
        }}
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Componente TanStack: ata hooks de router y delega a la vista.               */
/* -------------------------------------------------------------------------- */

function EventosRoute() {
  const data = Route.useLoaderData()
  const { fincaId } = Route.useParams()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const router = useRouter()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  if (pathname !== `/fincas/${fincaId}/eventos`) {
    return <Outlet />
  }

  const navegarConSearch = useCallback(
    (siguiente: EventosSearch) =>
      void navigate({ to: `/fincas/${fincaId}/eventos`, search: siguiente }),
    [navigate, fincaId],
  )
  const onInvalidarRouter = useCallback(() => {
    void router.invalidate()
  }, [router])
  const recargarHistorial = useCallback(
    (
      filtros: FiltrosEventosFinca,
      cursor: string | undefined,
      setEstado: (estado: EstadoHistorial) => void,
    ) => {
      void recargarHistorialImpl(fincaId, filtros, cursor, setEstado)
    },
    [fincaId],
  )

  return (
    <EventosRouteView
      data={data}
      search={search}
      onNavegarSearch={navegarConSearch}
      onInvalidarRouter={onInvalidarRouter}
      recargarHistorial={recargarHistorial}
    />
  )
}

async function recargarHistorialImpl(
  fincaId: string,
  filtros: FiltrosEventosFinca,
  cursor: string | undefined,
  setEstado: (estado: EstadoHistorial) => void,
): Promise<void> {
  setEstado({ tipo: "cargando" })
  try {
    const respuesta: EventoHistorialRespuesta = await leerEventosFincaHistorialFn({
      data: {
        fincaId,
        ...(filtros.categoria ? { categoria: filtros.categoria } : {}),
        ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
        ...(filtros.fechaDesde ? { fechaDesde: filtros.fechaDesde } : {}),
        ...(filtros.fechaHasta ? { fechaHasta: filtros.fechaHasta } : {}),
        ...(cursor ? { cursor } : {}),
      },
    })
    const next: EstadoHistorial = {
      tipo: "listo",
      items: respuesta.items,
      ...(respuesta.nextCursor ? { nextCursor: respuesta.nextCursor } : {}),
      ...(respuesta.pendientes !== undefined ? { pendientes: respuesta.pendientes } : {}),
    }
    setEstado(next)
  } catch {
    setEstado({ tipo: "error" })
  }
}

function tipoPorCategoria(
  cat: CategoriaEventoTableroUi,
): "servicio" | "aplicacion_sanitaria" | "pesaje" | "venta" {
  switch (cat) {
    case "reproductivo":
      return "servicio"
    case "sanidad":
      return "aplicacion_sanitaria"
    case "productivo":
      return "pesaje"
    case "movimientos":
      return "venta"
  }
}

async function cargarAnimalesPorOrigenEnRuta(
  fincaId: string,
  origen: "manual" | "lote" | "potrero" | "grupo",
  id: string,
): Promise<ReadonlyArray<{ id: string; codigoAnimal: string }>> {
  const resultado = await listarAnimalesPorOrigenFn({
    data: { fincaId, origen, id },
  })
  if (resultado.tipo === "lista") return resultado.animales ?? []
  return []
}

async function buscarAnimalPorCodigoEnRuta(
  fincaId: string,
  codigo: string,
): Promise<{ id: string; codigoAnimal: string } | null> {
  const resultado = await buscarAnimalPorCodigoFn({ data: { fincaId, codigo } })
  if (resultado.tipo === "encontrado") {
    return { id: resultado.id, codigoAnimal: resultado.codigoAnimal }
  }
  return null
}

async function enviarCapturaEnRuta(
  fincaId: string,
  captura: import("@ganaweb/ui").CapturaEvento,
): Promise<import("@ganaweb/ui").ResultadoCapturaEvento> {
  const alcance =
    captura.seleccion.tipo === "individual"
      ? { tipo: "individual" as const, animalId: captura.seleccion.animalId }
      : {
          tipo: "grupal" as const,
          origen: captura.seleccion.origen,
          ...(captura.seleccion.loteId ? { loteId: captura.seleccion.loteId } : {}),
          ...(captura.seleccion.potreroId ? { potreroId: captura.seleccion.potreroId } : {}),
          ...(captura.seleccion.grupoId ? { grupoId: captura.seleccion.grupoId } : {}),
          animalIdsEfectivos: captura.seleccion.animalIdsEfectivos,
        }
  try {
    const response = await capturarEventoFn({
      data: {
        fincaId,
        tipo: captura.tipo,
        alcance,
        datos: captura.datos,
      },
    })
    const body = (await response.json()) as import("@ganaweb/ui").ResultadoCapturaEvento
    return body
  } catch (error) {
    return {
      tipo: "error",
      detalle: error instanceof Error ? error.message : "Fallo desconocido",
    }
  }
}
