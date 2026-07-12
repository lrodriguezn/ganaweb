import {
  type AuthRepositoryPort,
  type DecisionAutorizacion,
  type SesionAutorizada,
  type UsuarioPendiente,
  autorizarUsuarioFinca,
  cerrarSesion,
  iniciarSesion,
  obtenerSesionActual,
  registrarUsuario,
} from "@ganaweb/aplicacion"
import { createServerFn } from "@tanstack/react-start"

type AuthOperation = "session" | "register" | "login" | "logout" | "pending-list" | "approval"

function logAuthFailure(
  operation: AuthOperation,
  error: unknown,
  context: Record<string, string | undefined> = {},
) {
  // biome-ignore lint/suspicious/noConsole: server-side auth failures must be visible until a logger port exists.
  console.error("[auth] runtime failure", { operation, ...context, error })
}

export function canApproveUsers(sesion: SesionAutorizada, fincaId: string) {
  if (sesion.fincaActivaId !== fincaId) return false
  return sesion.permisos.some(
    (permiso) =>
      (permiso.modulo === "usuarios" && permiso.accion === "aprobar") ||
      (permiso.modulo === "configuracion" && permiso.accion === "administrar") ||
      (permiso.modulo === "*" && permiso.accion === "*"),
  )
}

export function protectedRouteRedirect(
  decision: DecisionAutorizacion,
): "/login" | "/pendiente" | null {
  if (decision.tipo === "no_autenticado") return "/login"
  if (decision.tipo === "pendiente") return "/pendiente"
  return null
}

export async function listPendingUsersForDecision(
  decision: DecisionAutorizacion,
  repo: Pick<AuthRepositoryPort, "listarUsuariosPendientes">,
): Promise<readonly UsuarioPendiente[]> {
  if (decision.tipo !== "autorizado") return []
  if (!canApproveUsers(decision.sesion, decision.sesion.fincaActivaId)) return []
  return repo.listarUsuariosPendientes(decision.sesion.fincaActivaId)
}

export async function approvePendingUserForDecision(
  decision: DecisionAutorizacion,
  input: { usuarioId: string; fincaId: string },
  deps: Parameters<typeof autorizarUsuarioFinca>[0],
) {
  if (decision.tipo !== "autorizado") return { tipo: "no_autorizado" as const }
  return autorizarUsuarioFinca(deps)({
    actorUsuarioId: decision.sesion.usuarioId,
    usuarioId: input.usuarioId,
    fincaId: input.fincaId,
  })
}

export const getCurrentSession = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { getAuthDeps } = await import("./auth-deps.server.js")
    const { readSessionToken } = await import("./session-cookie.server.js")
    const deps = getAuthDeps()
    return await obtenerSesionActual(deps)(readSessionToken())
  } catch (error) {
    logAuthFailure("session", error)
    throw error
  }
})

export const registerAction = createServerFn({ method: "POST" })
  .validator(
    (data: { nombre: string; email: string; password: string; fincaCodigo?: string | null }) =>
      data,
  )
  .handler(async ({ data }) => {
    try {
      const { getAuthDeps } = await import("./auth-deps.server.js")
      return await registrarUsuario(getAuthDeps())(data)
    } catch (error) {
      logAuthFailure("register", error, { email: data.email })
      throw error
    }
  })

export const loginAction = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    try {
      const { getAuthDeps } = await import("./auth-deps.server.js")
      const { readRequestMetadata, setSessionCookie } = await import("./session-cookie.server.js")
      const deps = getAuthDeps()
      const metadata = readRequestMetadata()
      const result = await iniciarSesion(deps)({
        email: data.email,
        password: data.password,
        userAgent: metadata.userAgent,
        ip: metadata.ip,
      })
      if (result.tipo === "autorizado" || result.tipo === "pendiente")
        setSessionCookie(result.token)
      return result
    } catch (error) {
      logAuthFailure("login", error, { email: data.email })
      throw error
    }
  })

export const logoutAction = createServerFn({ method: "POST" }).handler(async () => {
  const { clearSessionCookie, readSessionToken } = await import("./session-cookie.server.js")
  try {
    const { getAuthDeps } = await import("./auth-deps.server.js")
    const deps = getAuthDeps()
    await cerrarSesion(deps)(readSessionToken())
  } catch (error) {
    logAuthFailure("logout", error)
    clearSessionCookie()
    return { tipo: "cerrada" as const, invalidacionServidor: "fallida" as const }
  }
  clearSessionCookie()
  return { tipo: "cerrada" as const }
})

export const listPendingUsersAction = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { getAuthDeps } = await import("./auth-deps.server.js")
    const { readSessionToken } = await import("./session-cookie.server.js")
    const deps = getAuthDeps()
    const decision = await obtenerSesionActual(deps)(readSessionToken())
    const pendingUsers = await listPendingUsersForDecision(decision, deps.repo)
    if (
      decision.tipo === "autorizado" &&
      pendingUsers.length === 0 &&
      !canApproveUsers(decision.sesion, decision.sesion.fincaActivaId)
    ) {
      logAuthFailure(
        "pending-list",
        new Error("authorized session lacks finca approval permission"),
        {
          usuarioId: decision.sesion.usuarioId,
          fincaId: decision.sesion.fincaActivaId,
        },
      )
    }
    return pendingUsers
  } catch (error) {
    logAuthFailure("pending-list", error)
    throw error
  }
})

export const approvePendingUserAction = createServerFn({ method: "POST" })
  .validator((data: { usuarioId: string; fincaId: string }) => data)
  .handler(async ({ data }) => {
    try {
      const { getAuthDeps } = await import("./auth-deps.server.js")
      const { readSessionToken } = await import("./session-cookie.server.js")
      const deps = getAuthDeps()
      const decision = await obtenerSesionActual(deps)(readSessionToken())
      return await approvePendingUserForDecision(decision, data, deps)
    } catch (error) {
      logAuthFailure("approval", error, { usuarioId: data.usuarioId, fincaId: data.fincaId })
      throw error
    }
  })

export function initials(nombre: string) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export type AppAuthContext = Readonly<{
  sesion: SesionAutorizada
}>

export type SessionDecision = DecisionAutorizacion
export type PendingUser = UsuarioPendiente
