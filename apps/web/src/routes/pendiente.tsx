import { Link, createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/pendiente")({
  component: PendientePage,
})

function PendientePage() {
  return (
    <main className="min-h-screen bg-background grid place-items-center px-4 py-8">
      <section className="w-full max-w-lg rounded-card border bg-card p-6 shadow-sm space-y-4 text-center">
        <p className="text-support font-semibold text-primary">Autorización pendiente</p>
        <h1 className="text-title font-bold text-foreground">
          Tu cuenta todavía no tiene acceso a la finca
        </h1>
        <p className="text-support text-muted-foreground">
          Ya recibimos tu registro. Para proteger la información ganadera, un administrador de la
          finca debe autorizar tu acceso antes de entrar a GanaWeb.
        </p>
        <p className="text-support text-muted-foreground">
          Si ya te autorizaron, vuelve a iniciar sesión.
        </p>
        <Link
          to="/login"
          className="inline-flex min-h-[--h-touch] items-center justify-center rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground"
        >
          Volver al ingreso
        </Link>
      </section>
    </main>
  )
}
