"use client"

import {
  AnimalDeleteDialogCopy,
  AnimalFichaDesktopScreen,
  AnimalFichaMobileScreen,
  type AnimalFichaResumen,
  type AnimalListItem,
  type AnimalTimelineItem,
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
  readonly onVolverAListado?: () => void
  readonly onEliminar?: (event: React.FormEvent<HTMLFormElement>) => void
  readonly onReactivar?: () => void
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
 */
export function AnimalFichaRouteView({
  data,
  onVolverAListado,
  onEliminar,
  onReactivar,
}: AnimalFichaRouteViewProps) {
  const [drawerEventoAbierto, setDrawerEventoAbierto] = useState(false)
  return (
    <div className="space-y-4">
      <div className="hidden md:block">
        <AnimalFichaDesktopScreen
          animal={data.animal}
          timeline={[...data.timeline.items]}
          {...(data.resumen ? { resumen: data.resumen } : {})}
          {...(data.timeline.nextCursor ? { nextCursor: data.timeline.nextCursor } : {})}
          {...(onVolverAListado ? { onVolverAListado } : {})}
          onRegistrarEvento={() => setDrawerEventoAbierto(true)}
        />
      </div>
      <div className="md:hidden">
        <AnimalFichaMobileScreen
          animal={data.animal}
          timeline={[...data.timeline.items]}
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
        {data.timeline.nextCursor && (
          <p className="mb-3 text-support text-muted-foreground">
            La ficha tiene más eventos disponibles. Cargar más: {data.timeline.nextCursor}
          </p>
        )}
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
        <AnimalDeleteDialogCopy events={data.timeline.items.length > 0 ? 1 : 0} />
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
      onVolverAListado={() => navigate({ to: `/fincas/${params.fincaId}/animales` })}
      onEliminar={deleteOrInactivate}
      onReactivar={reactivate}
    />
  )
}
