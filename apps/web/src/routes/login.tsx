import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { type FormEvent, useState } from "react"
import { loginAction } from "../server/auth.js"

export const Route = createFileRoute("/login")({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    const result = await loginAction({ data: { email, password } })
    setSubmitting(false)

    if (result.tipo === "credenciales_invalidas") {
      setError("El correo o la contraseña no son válidos.")
      return
    }
    if (result.tipo === "pendiente") {
      await navigate({ to: "/pendiente" })
      return
    }
    await navigate({ to: "/" })
  }

  return (
    <main className="min-h-screen bg-background grid place-items-center px-4 py-8">
      <section className="w-full max-w-md rounded-card border bg-card p-6 shadow-sm space-y-6">
        <header className="space-y-2">
          <p className="text-support text-primary font-semibold">GanaWeb</p>
          <h1 className="text-title font-bold text-foreground">Inicia sesión</h1>
          <p className="text-support text-muted-foreground">
            Entra para gestionar tu finca ganadera.
          </p>
        </header>

        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block space-y-1 text-support font-medium">
            <span>Correo electrónico</span>
            <input
              className="w-full rounded-lg border bg-background px-3 py-2"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label className="block space-y-1 text-support font-medium">
            <span>Contraseña</span>
            <input
              className="w-full rounded-lg border bg-background px-3 py-2"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          {error && (
            <p className="rounded-lg bg-peligro-600/10 px-3 py-2 text-support text-peligro-600">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[--h-touch] rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-60"
          >
            {submitting ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <p className="text-support text-muted-foreground">
          ¿Aún no tienes cuenta?{" "}
          <Link to="/registro" className="font-semibold text-primary">
            Regístrate
          </Link>
        </p>
      </section>
    </main>
  )
}
