import type {
  AuthUseCaseDeps,
  LoginInput,
  LoginResult,
} from "../../puertos/auth-repository-port.js"

const SESSION_DAYS = 30

export function iniciarSesion(deps: AuthUseCaseDeps) {
  return async (input: LoginInput): Promise<LoginResult> => {
    const email = input.email.trim().toLowerCase()
    const credenciales = await deps.repo.obtenerCredencialesPorEmail(email)
    if (!credenciales?.activo) return { tipo: "credenciales_invalidas" }

    const passwordValida = await deps.passwordHasher.verify(
      credenciales.contrasenaHash,
      input.password,
    )
    await deps.repo.guardarIntentoLogin({
      usuarioId: credenciales.usuarioId,
      exitoso: passwordValida,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
    })

    if (!passwordValida) return { tipo: "credenciales_invalidas" }

    const token = deps.tokens.crearToken()
    const refreshTokenHash = deps.tokens.hashToken(token)
    const now = deps.now?.() ?? new Date()
    const fechaExpiracion = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000)
    const sesionPersistida = await deps.repo.crearSesion({
      usuarioId: credenciales.usuarioId,
      refreshTokenHash,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      fechaExpiracion,
    })
    const decision = await deps.repo.obtenerAutorizacionUsuario(credenciales.usuarioId)

    if (decision.tipo === "autorizado") {
      return { tipo: "autorizado", token, sesionId: sesionPersistida.id, sesion: decision.sesion }
    }

    return {
      tipo: "pendiente",
      token,
      sesionId: sesionPersistida.id,
      usuarioId: credenciales.usuarioId,
      nombre: credenciales.nombre,
      email: credenciales.email,
    }
  }
}
