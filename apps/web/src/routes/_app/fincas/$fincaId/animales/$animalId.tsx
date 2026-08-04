"use client"

import {
  AnimalDeleteDialogCopy,
  AnimalFichaDesktopScreen,
  AnimalFichaMobileScreen,
  type AnimalFichaResumen,
  type AnimalListItem,
  type AnimalTimelineItem,
  type DominioEvento,
  EventDrawer,
} from "@ganaweb/ui"
import { Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router"
import { CheckSquare, Home, Menu, PawPrint } from "lucide-react"
import { useState } from "react"
import type * as React from "react"
import {
  deleteAnimalAction,
  getAnimalFichaAction,
  reactivateAnimalAction,
} from "../../../../../server/animal-actions.js"

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
  }
  readonly permissions: { readonly canInactivate: boolean }
}

export interface AnimalFichaRouteViewProps {
  readonly data: AnimalFichaRouteViewData
  /** Finca de la ruta — la usan las llamadas de tab/paginación del timeline. */
  readonly fincaId: string
  readonly onVolverAListado?: () => void
  readonly onEditar?: () => void
  readonly onEliminar?: (event: React.FormEvent<HTMLFormElement>) => void
  readonly onReactivar?: () => void
}

/** Estado interactivo del timeline (slice 3): el loader solo trae la página
 * inicial; los tabs y "Ver más eventos" piden páginas nuevas al servidor. */
interface EstadoTimelineFicha {
  readonly items: readonly AnimalTimelineItem[]
  readonly nextCursor?: string
  readonly dominio?: DominioEvento
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
}: AnimalFichaRouteViewProps) {
  const [drawerEventoAbierto, setDrawerEventoAbierto] = useState(false)
  const [estadoTimeline, setEstadoTimeline] = useState<EstadoTimelineFicha>({
    items: data.timeline.items,
    ...(data.timeline.nextCursor ? { nextCursor: data.timeline.nextCursor } : {}),
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
    })
  }

  return (
    <div className="space-y-4">
      <div className="hidden md:block">
        <AnimalFichaDesktopScreen
          animal={data.animal}
          timeline={[...estadoTimeline.items]}
          {...(data.resumen ? { resumen: data.resumen } : {})}
          {...(estadoTimeline.nextCursor ? { nextCursor: estadoTimeline.nextCursor } : {})}
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
        />
      </div>
      <EventDrawer
        open={drawerEventoAbierto}
        onOpenChange={setDrawerEventoAbierto}
        animalesPreseleccionados={[data.animal]}
        onGuardar={async () => {
          // Slice 1 wires open/close only; event form submission lands with
          // the event-form follow-up.
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
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  if (pathname !== `/fincas/${params.fincaId}/animales/${params.animalId}`) return <Outlet />

  if (data.tipo !== "ficha") {
    return <p className="p-4 text-support text-muted-foreground">No se pudo cargar la ficha.</p>
  }

  const deleteOrInactivate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await deleteAnimalAction({
      data: { fincaId: params.fincaId, animalId: params.animalId, online: true },
    })
    void navigate({ to: `/fincas/${params.fincaId}/animales` })
  }
  const reactivate = () =>
    reactivateAnimalAction({
      data: {
        fincaId: params.fincaId,
        animalId: params.animalId,
        codigo: data.animal.codigoAnimal,
      },
    })

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
    />
  )
}
