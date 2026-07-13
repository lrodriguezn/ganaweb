"use client"

import {
  AnimalDeleteDialogCopy,
  AnimalFichaDesktopScreen,
  AnimalFichaMobileScreen,
} from "@ganaweb/ui"
import { Outlet, createFileRoute, useRouterState } from "@tanstack/react-router"
import { CheckSquare, Home, Menu, PawPrint } from "lucide-react"
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

function AnimalFichaRoute() {
  const data = Route.useLoaderData()
  const params = Route.useParams()
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
    window.location.reload()
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
    <div className="space-y-4">
      <div className="hidden md:block">
        <AnimalFichaDesktopScreen animal={data.animal} timeline={[...data.timeline.items]} />
      </div>
      <div className="md:hidden">
        <AnimalFichaMobileScreen
          animal={data.animal}
          timeline={[...data.timeline.items]}
          bottomNavItems={bottomNavItems}
          onRegistrarEvento={() => {}}
        />
      </div>
      <section className="mx-auto max-w-6xl px-4 pb-6" aria-label="Acciones de ficha">
        {data.timeline.nextCursor && (
          <p className="mb-3 text-support text-muted-foreground">
            La ficha tiene más eventos disponibles. Cargar más: {data.timeline.nextCursor}
          </p>
        )}
        {data.permissions.canInactivate && (
          <form onSubmit={deleteOrInactivate} className="inline">
            <button type="submit" className="min-h-[--h-touch] underline">
              Eliminar animal
            </button>
          </form>
        )}
        {data.permissions.canInactivate && (
          <button type="button" onClick={reactivate} className="ms-4 min-h-[--h-touch] underline">
            Reactivar animal
          </button>
        )}
        <AnimalDeleteDialogCopy events={data.timeline.items.length > 0 ? 1 : 0} />
      </section>
    </div>
  )
}
