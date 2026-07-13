import { AnimalDesktopScreen, AnimalListMobile } from "@ganaweb/ui"
import { Outlet, createFileRoute, useRouterState } from "@tanstack/react-router"
import { Calendar, CheckSquare, Home, Menu, PawPrint } from "lucide-react"
import { listAnimalsAction } from "../../../../server/animal-actions.js"

export const Route = createFileRoute("/_app/fincas/$fincaId/animales")({
  loader: ({ params }) => listAnimalsAction({ data: { fincaId: params.fincaId } }),
  component: AnimalsListRoute,
})

const bottomNavItems = [
  { id: "inicio", label: "Inicio", icon: Home, href: "/" },
  { id: "animales", label: "Animales", icon: PawPrint, href: "/animales" },
  { id: "tareas", label: "Tareas", icon: CheckSquare, href: "/tareas" },
  { id: "mas", label: "Más", icon: Menu, href: "/mas" },
]

function AnimalsListRoute() {
  const data = Route.useLoaderData()
  const { fincaId } = Route.useParams()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  if (pathname !== `/fincas/${fincaId}/animales`) return <Outlet />

  const animales = data.tipo === "lista" ? [...data.animales] : []
  const canCreate = data.tipo === "lista" && data.permissions.canCreate
  const goNew = () => {
    if (canCreate) window.location.assign(`${window.location.pathname}/nuevo`)
  }

  return (
    <div className="space-y-4">
      <div className="hidden md:block">
        <AnimalDesktopScreen animales={animales} canCreate={canCreate} onNuevoAnimal={goNew} />
      </div>
      <div className="md:hidden">
        <AnimalListMobile
          animales={animales}
          canCreate={canCreate}
          onPressAnimal={(animal) =>
            window.location.assign(`${window.location.pathname}/${animal.id}`)
          }
          onNuevoAnimal={goNew}
          bottomNavItems={bottomNavItems}
        />
      </div>
      {data.tipo === "permiso_denegado" && (
        <p className="text-support text-muted-foreground">No tienes permiso para ver animales.</p>
      )}
      <span className="sr-only">{Calendar.displayName}</span>
    </div>
  )
}
