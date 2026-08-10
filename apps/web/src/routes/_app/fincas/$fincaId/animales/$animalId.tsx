"use client"

import {
  AnimalDeleteDialogCopy,
  AnimalFichaDesktopScreen,
  AnimalFichaMobileScreen,
  type AnimalFichaResumen,
  type AnimalListItem,
  type AnimalTimelineItem,
  type DominioEvento,
  EventoWizard,
  type PermisosEfectivosPorDominio,
  type ResultadoCapturaEvento,
} from "@ganaweb/ui"
import {
  Outlet,
  createFileRoute,
  useNavigate,
  useRouter,
  useRouterState,
} from "@tanstack/react-router"
import { CheckSquare, Home, Menu, PawPrint } from "lucide-react"
import { useState } from "react"
import type * as React from "react"
import {
  deleteAnimalAction,
  getAnimalFichaAction,
  reactivateAnimalAction,
} from "../../../../../server/animal-actions.js"
import {
  buscarAnimalPorCodigoFn,
  capturarEventoFn,
  listarAnimalesPorOrigenFn,
  listarCatalogosAlcanceFn,
  revisarMembresiaActualFn,
} from "../../../../../server/eventos-wizard.js"

export const Route = createFileRoute("/_app/fincas/$fincaId/animales/$animalId")({
  loader: async ({ params }) => {
    return getAnimalFichaAction({ data: { fincaId: params.fincaId, animalId: params.animalId } })
  },
  component: AnimalFichaRoute,
})

const bottomNavItems = [
  { id: "inicio", label: "Inicio", icon: Home, href: "/" },
  { id: "animales", label: "Animales", icon: PawPrint, href: "/animales" },
  { id: "tareas", label: "Tareas", icon: CheckSquare, href: "/tareas" },
  { id: "mas", label: "Más", icon: Menu, href: "/mas" },
]

/**
 * Loader shape consumed by the ficha view (narrowed to the `ficha` branch).
 * Structural on purpose: the view is testable without the TanStack Start
 * runtime (same pattern as `AnimalsListRouteView`).
 */
export interface AnimalFichaRouteViewData {
  readonly tipo: "ficha"
  readonly animal: AnimalListItem
  /**
   * redesign-ficha-animal (slice 2): proyección enriquecida (raza/color,
   * edad, último peso + GDP, resumen reproductivo, condición corporal).
   * Ausente cuando el modelo de lectura no tiene datos — la UI tolera
   * nulos con estados vacíos estructurados.
   */
  readonly resumen?: AnimalFichaResumen
  readonly timeline: {
    readonly items: readonly AnimalTimelineItem[]
    readonly nextCursor?: string
    /** Issue #183: conteo pendiente bajo el filtro activo ("Ver N eventos más"). */
    readonly eventosPendientes?: number
  }
  readonly permissions: {
    /** Issue #202: gatea visualmente el botón Editar (`animales:editar`). */
    readonly canEdit: boolean
    readonly canInactivate: boolean
    readonly eventos: PermisosEfectivosPorDominio
  }
}

export interface AnimalFichaRouteViewProps {
  readonly data: AnimalFichaRouteViewData
  /** Finca de la ruta — la usan las llamadas de tab/paginación del timeline. */
  readonly fincaId: string
  readonly onVolverAListado?: () => void
  readonly onEditar?: () => void
  readonly onEliminar?: (event: React.FormEvent<HTMLFormElement>) => void
  readonly onReactivar?: () => void
  /** Issue #229: el wizard de eventos invoca este callback al guardar. */
  readonly onCapturaExitosa?: () => void
}

/** Estado interactivo del timeline (slice 3): el loader solo trae la página
 * inicial; los tabs y "Ver más eventos" piden páginas nuevas al servidor. */
interface EstadoTimelineFicha {
  readonly items: readonly AnimalTimelineItem[]
  readonly nextCursor?: string
  readonly dominio?: DominioEvento
  /** Issue #183: conteo pendiente bajo el filtro activo, si el servidor lo reporta. */
  readonly eventosPendientes?: number
}

/**
 * Presentational composition of the animal ficha route (desktop + mobile
 * screens, EventDrawer wiring and delete/reactivate controls). The route
 * component binds router hooks and server actions; the view stays testable
 * with pinned loader data.
 *
 * redesign-ficha-animal (slice 1): "+ Registrar evento" opens the existing
 * EventDrawer with the ficha animal preselected; closing it returns to the
 * ficha without navigation. Event form submission is out of scope for this
 * slice (proposal assumption: TODO drawer forms remain follow-up).
 *
 * Slice 3 (D2/Q2): tab switch resets pagination and fetches the domain page
 * from the server; "Ver más eventos" appends the next cursor page. Both use
 * the same `getAnimalFichaAction` server function with `tabTimeline` and
 * `cursorTimeline`.
 */
export function AnimalFichaRouteView({
  data,
  fincaId,
  onVolverAListado,
  onEditar,
  onEliminar,
  onReactivar,
  onCapturaExitosa,
}: AnimalFichaRouteViewProps) {
  const [drawerEventoAbierto, setDrawerEventoAbierto] = useState(false)
  const [estadoTimeline, setEstadoTimeline] = useState<EstadoTimelineFicha>({
    items: data.timeline.items,
    ...(data.timeline.nextCursor ? { nextCursor: data.timeline.nextCursor } : {}),
    ...(data.timeline.eventosPendientes != null
      ? { eventosPendientes: data.timeline.eventosPendientes }
      : {}),
  })

  const cambiarTabTimeline = async (dominio?: DominioEvento) => {
    const resultado = await getAnimalFichaAction({
      data: {
        fincaId,
        animalId: data.animal.id,
        ...(dominio ? { tabTimeline: dominio } : {}),
      },
    })
    if (resultado?.tipo !== "ficha") return
    setEstadoTimeline({
      items: resultado.timeline.items,
      ...(resultado.timeline.nextCursor ? { nextCursor: resultado.timeline.nextCursor } : {}),
      ...(dominio ? { dominio } : {}),
      ...(resultado.timeline.eventosPendientes != null
        ? { eventosPendientes: resultado.timeline.eventosPendientes }
        : {}),
    })
  }

  const cargarMasTimeline = async () => {
    if (!estadoTimeline.nextCursor) return
    const resultado = await getAnimalFichaAction({
      data: {
        fincaId,
        animalId: data.animal.id,
        cursorTimeline: estadoTimeline.nextCursor,
        ...(estadoTimeline.dominio ? { tabTimeline: estadoTimeline.dominio } : {}),
      },
    })
    if (resultado?.tipo !== "ficha") return
    setEstadoTimeline({
      items: [...estadoTimeline.items, ...resultado.timeline.items],
      ...(resultado.timeline.nextCursor ? { nextCursor: resultado.timeline.nextCursor } : {}),
      ...(estadoTimeline.dominio ? { dominio: estadoTimeline.dominio } : {}),
      ...(resultado.timeline.eventosPendientes != null
        ? { eventosPendientes: resultado.timeline.eventosPendientes }
        : {}),
    })
  }

  return (
    <div className="space-y-4">
      <div className="hidden md:block">
        <AnimalFichaDesktopScreen
          animal={data.animal}
          timeline={[...estadoTimeline.items]}
          canEdit={data.permissions.canEdit}
          {...(data.resumen ? { resumen: data.resumen } : {})}
          {...(estadoTimeline.nextCursor ? { nextCursor: estadoTimeline.nextCursor } : {})}
          {...(estadoTimeline.eventosPendientes != null
            ? { eventosPendientes: estadoTimeline.eventosPendientes }
            : {})}
          {...(estadoTimeline.dominio ? { dominioActivo: estadoTimeline.dominio } : {})}
          {...(onVolverAListado ? { onVolverAListado } : {})}
          {...(onEditar ? { onEdit: onEditar } : {})}
          onRegistrarEvento={() => setDrawerEventoAbierto(true)}
          onTabChange={cambiarTabTimeline}
          onLoadMore={cargarMasTimeline}
        />
      </div>
      <div className="md:hidden">
        <AnimalFichaMobileScreen
          animal={data.animal}
          timeline={[...estadoTimeline.items]}
          bottomNavItems={bottomNavItems}
          onRegistrarEvento={() => setDrawerEventoAbierto(true)}
          canEdit={data.permissions.canEdit}
          {...(onEditar ? { onEdit: onEditar } : {})}
        />
      </div>
      <EventoWizard
        open={drawerEventoAbierto}
        onOpenChange={setDrawerEventoAbierto}
        fincaId={fincaId}
        animalPreseleccionado={data.animal}
        permisosEfectivos={data.permissions.eventos}
        catalogos={CATALOGOS_PARA_ALCANCE_VACIOS}
        cargarAnimalesPorOrigen={(origen, id) => cargarAnimalesPorOrigenEnRuta(fincaId, origen, id)}
        buscarAnimalPorCodigo={(codigo) => buscarAnimalPorCodigoEnRuta(fincaId, codigo)}
        onEnviar={(captura) => enviarCapturaEnRuta(fincaId, captura)}
        tiposSensibles={["aplicacion_sanitaria", "venta", "traslado"]}
        revisarMembresiaActual={(origen, id, snapshotIds) =>
          revisarMembresiaEnRuta(fincaId, origen, id, snapshotIds)
        }
        onCapturado={(resultado) => {
          // Issue #221: invalidar solo en la ruta de éxito para que la ficha
          // relea el timeline con la nueva fila.
          if (resultado.tipo === "capturado") {
            onCapturaExitosa?.()
          }
        }}
      />
      <section className="mx-auto max-w-6xl pb-6" aria-label="Acciones de ficha">
        {data.permissions.canInactivate && onEliminar && (
          <form onSubmit={onEliminar} className="inline">
            <button type="submit" className="min-h-[--h-touch] underline">
              Eliminar animal
            </button>
          </form>
        )}
        {data.permissions.canInactivate && onReactivar && (
          <button type="button" onClick={onReactivar} className="ms-4 min-h-[--h-touch] underline">
            Reactivar animal
          </button>
        )}
        <AnimalDeleteDialogCopy events={estadoTimeline.items.length > 0 ? 1 : 0} />
      </section>
    </div>
  )
}

function AnimalFichaRoute() {
  const data = Route.useLoaderData()
  const params = Route.useParams()
  const navigate = useNavigate()
  const router = useRouter()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  if (pathname !== `/fincas/${params.fincaId}/animales/${params.animalId}`) return <Outlet />

  if (data.tipo !== "ficha") {
    return <p className="p-4 text-support text-muted-foreground">No se pudo cargar la ficha.</p>
  }

  const deleteOrInactivate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const resultado = await deleteAnimalAction({
      data: { fincaId: params.fincaId, animalId: params.animalId, online: true },
    })
    // Issue #221: invalidar la caché del router solo tras una mutación
    // exitosa para que el listado relea del servidor (con staleTime 60s
    // seguía mostrando el animal eliminado/inactivado).
    if (resultado?.tipo === "eliminado" || resultado?.tipo === "inactivado") {
      void router.invalidate()
    }
    void navigate({ to: `/fincas/${params.fincaId}/animales` })
  }
  const reactivate = async () => {
    const resultado = await reactivateAnimalAction({
      data: {
        fincaId: params.fincaId,
        animalId: params.animalId,
        codigo: data.animal.codigoAnimal,
      },
    })
    // Issue #221: invalidar solo en la ruta de éxito para que la ficha relea
    // el estado reactivado del servidor.
    if (resultado?.tipo === "reactivado") {
      void router.invalidate()
    }
  }

  return (
    <AnimalFichaRouteView
      data={data}
      fincaId={params.fincaId}
      onVolverAListado={() => navigate({ to: `/fincas/${params.fincaId}/animales` })}
      onEditar={() =>
        navigate({ to: `/fincas/${params.fincaId}/animales/${params.animalId}/editar` })
      }
      onEliminar={deleteOrInactivate}
      onReactivar={reactivate}
      onCapturaExitosa={() => router.invalidate()}
    />
  )
}

const CATALOGOS_PARA_ALCANCE_VACIOS = {
  lotes: [],
  potreros: [],
  grupos: [],
} as const

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

async function revisarMembresiaEnRuta(
  fincaId: string,
  origen: "lote" | "potrero" | "grupo",
  id: string,
  snapshotIds: readonly string[],
) {
  return revisarMembresiaActualFn({ data: { fincaId, origen, id, snapshotIds } })
}

async function cargarAnimalesPorOrigenEnRuta(
  fincaId: string,
  origen: "manual" | "lote" | "potrero" | "grupo",
  id: string,
): Promise<ReadonlyArray<{ id: string; codigoAnimal: string }>> {
  const resultado = await listarAnimalesPorOrigenFn({ data: { fincaId, origen, id } })
  if (resultado.tipo === "lista") return resultado.animales ?? []
  return []
}

async function enviarCapturaEnRuta(
  fincaId: string,
  captura: import("@ganaweb/ui").CapturaEvento,
): Promise<ResultadoCapturaEvento> {
  const alcance = construirAlcanceCaptura(captura)
  try {
    const response = await capturarEventoFn({
      data: {
        fincaId,
        tipo: captura.tipo,
        alcance,
        datos: captura.datos,
      },
    })
    const body = (await response.json()) as ResultadoCapturaEvento
    return body
  } catch (error) {
    return {
      tipo: "error",
      detalle: error instanceof Error ? error.message : "Fallo desconocido",
    }
  }
}

export function construirAlcanceCaptura(captura: import("@ganaweb/ui").CapturaEvento) {
  return captura.seleccion.tipo === "individual"
    ? { tipo: "individual" as const, animalId: captura.seleccion.animalId }
    : {
        tipo: "grupal" as const,
        origen: captura.seleccion.origen,
        ...(captura.seleccion.loteId ? { loteId: captura.seleccion.loteId } : {}),
        ...(captura.seleccion.potreroId ? { potreroId: captura.seleccion.potreroId } : {}),
        ...(captura.seleccion.grupoId ? { grupoId: captura.seleccion.grupoId } : {}),
        animalIdsEfectivos: captura.seleccion.animalIdsEfectivos,
        ...(captura.seleccion.excepciones ? { excepciones: captura.seleccion.excepciones } : {}),
      }
}
