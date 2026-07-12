import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useState } from "react"
import {
  type PendingUser,
  approvePendingUserAction,
  listPendingUsersAction,
} from "../../../server/auth.js"

export const Route = createFileRoute("/_app/admin/usuarios-pendientes")({
  loader: () => listPendingUsersAction(),
  component: UsuariosPendientesPage,
})

function UsuariosPendientesPage() {
  const router = useRouter()
  const pendientes = Route.useLoaderData()
  const [error, setError] = useState<string | null>(null)

  async function aprobar(usuarioId: string, fincaId: string | null) {
    if (!fincaId) return
    const result = await approvePendingUserAction({ data: { usuarioId, fincaId } })
    if (result.tipo === "no_autorizado") {
      setError("No tienes permiso para autorizar usuarios en esta finca.")
      return
    }
    await router.invalidate()
  }

  return (
    <div className="mx-auto max-w-4xl px-4 md:px-6 py-4 md:py-6 space-y-4">
      <header className="space-y-1">
        <h1 className="text-title font-semibold text-foreground">Usuarios pendientes</h1>
        <p className="text-support text-muted-foreground">
          Autoriza únicamente a las personas que deben entrar a tu finca.
        </p>
      </header>

      {error && (
        <p className="rounded-lg bg-peligro-600/10 px-3 py-2 text-support text-peligro-600">
          {error}
        </p>
      )}

      <section className="rounded-card border bg-card divide-y">
        {pendientes.length === 0 ? (
          <p className="p-4 text-support text-muted-foreground">
            No hay usuarios pendientes por autorizar.
          </p>
        ) : (
          pendientes.map((usuario: PendingUser) => (
            <article
              key={`${usuario.usuarioId}-${usuario.fincaId ?? "sin-finca"}`}
              className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <h2 className="font-semibold text-foreground">{usuario.nombre}</h2>
                <p className="text-support text-muted-foreground">{usuario.email}</p>
                <p className="text-support text-muted-foreground">
                  Finca: {usuario.fincaNombre ?? "Sin finca asociada"}
                </p>
              </div>
              <button
                type="button"
                disabled={!usuario.fincaId}
                onClick={() => aprobar(usuario.usuarioId, usuario.fincaId)}
                className="min-h-[--h-touch] rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-60"
              >
                Autorizar
              </button>
            </article>
          ))
        )}
      </section>
    </div>
  )
}
