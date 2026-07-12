import { getRequestHeader, setResponseHeader } from "@tanstack/react-start/server"

const SESSION_COOKIE = "__Host-ganaweb-session"
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

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
  const header = getRequestHeader("cookie")
  if (!header) return null
  for (const part of header.split(/;\s*/)) {
    const separator = part.indexOf("=")
    if (separator === -1) continue
    if (part.slice(0, separator) === SESSION_COOKIE) return part.slice(separator + 1)
  }
  return null
}

export function readRequestMetadata() {
  return {
    userAgent: getRequestHeader("user-agent") ?? null,
    ip: getRequestHeader("x-forwarded-for") ?? null,
  }
}
