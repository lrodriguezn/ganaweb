import {
  type AuthRepositoryPort,
  type AuthUseCaseDeps,
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

type AuthOperation =
  | "session"
  | "register"
  | "login"
  | "logout"
  | "pending-list"
  | "approval"
  | "switch-finca"

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

/**
 * Issue #144 — lectura de sesión con la última finca usada del navegador.
 * `fincaId` explícito (deep links) tiene prioridad y es filtro duro; la
 * cookie de última finca es solo una preferencia validada en el repositorio.
 */
async function leerDecisionSesionActual(fincaId?: string | null): Promise<DecisionAutorizacion> {
  const { getAuthDeps } = await import("./auth-deps.server.js")
  const { readFincaActivaCookie, readSessionToken } = await import("./session-cookie.server.js")
  const deps = getAuthDeps()
  return obtenerSesionActual(deps)(readSessionToken(), fincaId, readFincaActivaCookie())
}

export const getCurrentSession = createServerFn({ method: "GET" })
  .validator((data: { fincaId?: string | null }) => data)
  .handler(async ({ data }) => {
    try {
      const { getAnimalE2eSession, isAnimalE2eEnabled } = await import(
        "./e2e-animals-fixture.server.js"
      )
      if (isAnimalE2eEnabled())
        return { tipo: "autorizado" as const, sesion: getAnimalE2eSession() }

      const { readFincaActivaCookie, setFincaActivaCookie } = await import(
        "./session-cookie.server.js"
      )
      const fincaUltimoUso = readFincaActivaCookie()
      const decision = await leerDecisionSesionActual(data.fincaId)
      // Issue #144 — deep link / corrección de cookie stale: si la finca
      // resuelta difiere de la persistida, actualizarla. Fail-safe: escribir
      // la cookie nunca debe romper la lectura de la sesión.
      if (decision.tipo === "autorizado" && decision.sesion.fincaActivaId !== fincaUltimoUso) {
        try {
          setFincaActivaCookie(decision.sesion.fincaActivaId)
        } catch (cookieError) {
          logAuthFailure("session", cookieError)
        }
      }
      return decision
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
    const deps = getAuthDeps()
    const decision = await leerDecisionSesionActual()
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
      const deps = getAuthDeps()
      const decision = await leerDecisionSesionActual()
      return await approvePendingUserForDecision(decision, data, deps)
    } catch (error) {
      logAuthFailure("approval", error, { usuarioId: data.usuarioId, fincaId: data.fincaId })
      throw error
    }
  })

/**
 * Issue #144 — núcleo puro del cambio de finca activa (testeable sin
 * runtime HTTP). El `fincaId` destino se pasa como finca explícita: sin
 * membresía activa para esa finca la decisión se deniega (`sin_acceso`),
 * nunca se lanza.
 */
export type CambiarFincaResult =
  | Readonly<{ tipo: "autorizado"; sesion: SesionAutorizada }>
  | Readonly<{ tipo: "sin_acceso" }>

export async function cambiarFincaActiva(
  deps: AuthUseCaseDeps,
  input: {
    token: string | null
    fincaId: string
    persistirFincaActiva?: (fincaId: string) => void
  },
): Promise<CambiarFincaResult> {
  const decision = await obtenerSesionActual(deps)(input.token, input.fincaId)
  if (decision.tipo !== "autorizado") return { tipo: "sin_acceso" }
  try {
    input.persistirFincaActiva?.(decision.sesion.fincaActivaId)
  } catch {
    // La última finca es una preferencia: su persistencia nunca rompe el cambio.
  }
  return { tipo: "autorizado", sesion: decision.sesion }
}

export const switchFincaAction = createServerFn({ method: "POST" })
  .validator((data: { fincaId: string }) => data)
  .handler(async ({ data }) => {
    try {
      const { getAuthDeps } = await import("./auth-deps.server.js")
      const { readSessionToken, setFincaActivaCookie } = await import("./session-cookie.server.js")
      return await cambiarFincaActiva(getAuthDeps(), {
        token: readSessionToken(),
        fincaId: data.fincaId,
        persistirFincaActiva: setFincaActivaCookie,
      })
    } catch (error) {
      logAuthFailure("switch-finca", error, { fincaId: data.fincaId })
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
