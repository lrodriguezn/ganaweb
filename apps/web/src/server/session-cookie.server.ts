import { getRequestHeader, setResponseHeader } from "@tanstack/react-start/server"

const SESSION_COOKIE =
  process.env.NODE_ENV === "production" ? "__Host-ganaweb-session" : "ganaweb-session"
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

/**
 * Issue #144 — última finca activa del usuario en ESTE navegador.
 * Es una preferencia (nunca un permiso): el servidor SIEMPRE la valida
 * contra las membresías activas del usuario; si es inválida/stale se cae
 * a la primera membresía activa. Mismo esquema de nombre que la cookie
 * de sesión (__Host- en producción).
 */
const FINCA_ACTIVA_COOKIE =
  process.env.NODE_ENV === "production" ? "__Host-ganaweb_finca_activa" : "ganaweb_finca_activa"
const FINCA_ACTIVA_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

function readCookieValue(name: string): string | null {
  const header = getRequestHeader("cookie")
  if (!header) return null
  for (const part of header.split(/;\s*/)) {
    const separator = part.indexOf("=")
    if (separator === -1) continue
    if (part.slice(0, separator) === name) return part.slice(separator + 1)
  }
  return null
}

export function setSessionCookie(token: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : ""
  setResponseHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${token}; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  )
}

export function clearSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : ""
  setResponseHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=0`,
  )
}

export function readSessionToken(): string | null {
  return readCookieValue(SESSION_COOKIE)
}

export function setFincaActivaCookie(fincaId: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : ""
  setResponseHeader(
    "Set-Cookie",
    `${FINCA_ACTIVA_COOKIE}=${fincaId}; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=${FINCA_ACTIVA_MAX_AGE_SECONDS}`,
  )
}

export function readFincaActivaCookie(): string | null {
  return readCookieValue(FINCA_ACTIVA_COOKIE)
}

export function readRequestMetadata() {
  return {
    userAgent: getRequestHeader("user-agent") ?? null,
    ip: getRequestHeader("x-forwarded-for") ?? null,
  }
}
