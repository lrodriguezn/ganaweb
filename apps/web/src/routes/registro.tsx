import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { type FormEvent, useState } from "react"
import { registerAction } from "../server/auth.js"

export const Route = createFileRoute("/registro")({
  component: RegistroPage,
})

function RegistroPage() {
  const navigate = useNavigate()
  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fincaCodigo, setFincaCodigo] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const result = await registerAction({
      data: { nombre, email, password, fincaCodigo: fincaCodigo || null },
    })
    if (result.tipo === "duplicado") {
      setError("Ya existe una cuenta con ese correo electrónico.")
      return
    }
    await navigate({ to: "/pendiente" })
  }

  return (
    <main className="min-h-screen bg-background grid place-items-center px-4 py-8">
      <section className="w-full max-w-md rounded-card border bg-card p-6 shadow-sm space-y-6">
        <header className="space-y-2">
          <p className="text-support text-primary font-semibold">GanaWeb</p>
          <h1 className="text-title font-bold text-foreground">Crea tu cuenta</h1>
          <p className="text-support text-muted-foreground">
            Regístrate y espera la autorización del administrador de la finca.
          </p>
        </header>

        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block space-y-1 text-support font-medium">
            <span>Nombre completo</span>
            <input
              className="w-full rounded-lg border bg-background px-3 py-2"
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              required
              autoComplete="name"
            />
          </label>
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
              autoComplete="new-password"
              minLength={8}
            />
          </label>
          <label className="block space-y-1 text-support font-medium">
            <span>Código de finca (opcional)</span>
            <input
              className="w-full rounded-lg border bg-background px-3 py-2"
              value={fincaCodigo}
              onChange={(event) => setFincaCodigo(event.target.value)}
            />
          </label>
          {error && (
            <p className="rounded-lg bg-peligro-600/10 px-3 py-2 text-support text-peligro-600">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="w-full min-h-[--h-touch] rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground"
          >
            Registrarme
          </button>
        </form>

        <p className="text-support text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="font-semibold text-primary">
            Inicia sesión
          </Link>
        </p>
      </section>
    </main>
  )
}
