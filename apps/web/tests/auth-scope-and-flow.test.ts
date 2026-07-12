/**
 * auth-scope-and-flow.test.ts — Focused runtime tests for remaining Strict TDD gaps.
 *
 * Covers:
 *  1. Registration route/component flow → /pendiente navigation + pending copy
 *  2. Logout action cookie-clearing behavior (both success and failure paths)
 *  3. Out-of-scope auth flows remain absent/inactive in routes and application exports
 *
 * Uses tsx (no vitest) to stay consistent with auth-flow.test.ts harness.
 */
import assert from "node:assert/strict"
import { readFile, readdir } from "node:fs/promises"
import { join } from "node:path"

const WEB_ROOT = join(import.meta.dirname, "..")
const ROUTES_DIR = join(WEB_ROOT, "src", "routes")
const SERVER_DIR = join(WEB_ROOT, "src", "server")
const APLICACION_SRC = join(WEB_ROOT, "..", "..", "packages", "aplicacion", "src")
const APLICACION_INDEX = join(APLICACION_SRC, "index.ts")
const APLICACION_USECASES_DIR = join(APLICACION_SRC, "casos-uso", "auth")

async function readFileText(path: string): Promise<string> {
  return readFile(path, "utf8")
}

async function listFilesRecursively(dir: string, ext: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const results: string[] = []
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...(await listFilesRecursively(fullPath, ext)))
    } else if (entry.name.endsWith(ext)) {
      results.push(fullPath)
    }
  }
  return results
}

// ────────────────────────────────────────────────────────────────
// 1. Registration route/component flow → /pendiente
// ────────────────────────────────────────────────────────────────

async function testRegistrationFlow() {
  const registro = await readFileText(join(ROUTES_DIR, "registro.tsx"))

  // The registration component must navigate to /pendiente after successful registration
  assert.ok(
    registro.includes('navigate({ to: "/pendiente" })') ||
      registro.includes("navigate({ to: '/pendiente' })"),
    "registro.tsx must navigate to /pendiente after successful registration",
  )

  // Must show the pending-copy explaining authorization is required
  assert.ok(
    registro.includes("espera la autorización") || registro.includes("pendiente"),
    "registro.tsx must show pending-copy about waiting for authorization",
  )

  // Must call registerAction
  assert.ok(
    registro.includes("registerAction"),
    "registro.tsx must call registerAction server function",
  )

  // Must handle duplicate rejection
  assert.ok(registro.includes("duplicado"), "registro.tsx must handle duplicate identity rejection")

  // Must have the "Registrarme" submit button
  assert.ok(
    registro.includes("Registrarme"),
    "registro.tsx must have a 'Registrarme' submit button",
  )

  // The pending page must exist and show the expected Spanish copy
  const pendiente = await readFileText(join(ROUTES_DIR, "pendiente.tsx"))
  assert.ok(
    pendiente.includes("Autorización pendiente"),
    "pendiente.tsx must show 'Autorización pendiente' heading",
  )
  assert.ok(
    pendiente.includes("Tu cuenta todavía no tiene acceso a la finca"),
    "pendiente.tsx must show 'Tu cuenta todavía no tiene acceso a la finca'",
  )
  assert.ok(
    pendiente.includes("Volver al ingreso"),
    "pendiente.tsx must have a 'Volver al ingreso' link back to login",
  )

  // The login route must link to /registro
  const login = await readFileText(join(ROUTES_DIR, "login.tsx"))
  assert.ok(
    login.includes('to="/registro"') || login.includes('to="/registro"'),
    "login.tsx must link to /registro for new users",
  )
  assert.ok(login.includes("Regístrate"), "login.tsx must show 'Regístrate' link text")

  // biome-ignore lint/suspicious/noConsole: test progress output
  console.log("  ✅ Registration flow → /pendiente navigation and Spanish copy verified")
}

// ────────────────────────────────────────────────────────────────
// 2. Logout server-action / cookie behavior
// ────────────────────────────────────────────────────────────────

async function testLogoutCookieBehavior() {
  const auth = await readFileText(join(SERVER_DIR, "auth.ts"))

  // logoutAction must call clearSessionCookie() in the success path (after cerrarSesion)
  // and also in the catch path (when server invalidation fails)
  const clearCookieMatches = auth.match(/clearSessionCookie\(\)/g)
  assert.ok(
    clearCookieMatches && clearCookieMatches.length >= 2,
    "logoutAction must call clearSessionCookie() in both success and failure paths",
  )

  // The failure path must return invalidacionServidor: "fallida"
  assert.ok(
    auth.includes('invalidacionServidor: "fallida"'),
    "logoutAction must return invalidacionServidor: 'fallida' when server invalidation fails",
  )

  // The success path must return tipo: "cerrada"
  assert.ok(auth.includes('tipo: "cerrada"'), "logoutAction must return tipo: 'cerrada' on success")

  // session-cookie.server.ts must clear the cookie with Max-Age=0
  const cookieServer = await readFileText(join(SERVER_DIR, "session-cookie.server.ts"))
  assert.ok(
    cookieServer.includes("Max-Age=0"),
    "clearSessionCookie must set Max-Age=0 to expire the cookie",
  )
  assert.ok(
    cookieServer.includes("__Host-ganaweb-session"),
    "session cookie must use __Host- prefix for security",
  )
  assert.ok(cookieServer.includes("HttpOnly"), "session cookie must be HttpOnly")
  assert.ok(cookieServer.includes("SameSite=Lax"), "session cookie must use SameSite=Lax")

  // The shell (_app.tsx) must call logoutAction and redirect to /login
  const appShell = await readFileText(join(ROUTES_DIR, "_app.tsx"))
  assert.ok(
    appShell.includes("logoutAction"),
    "_app.tsx shell must call logoutAction for Cerrar sesión",
  )
  assert.ok(appShell.includes('"/login"'), "_app.tsx must redirect to /login after logout")

  // The mas.tsx page must also call logoutAction
  const mas = await readFileText(join(ROUTES_DIR, "_app", "mas.tsx"))
  assert.ok(mas.includes("logoutAction"), "mas.tsx must call logoutAction for Cerrar sesión")

  // biome-ignore lint/suspicious/noConsole: test progress output
  console.log("  ✅ Logout cookie-clearing behavior verified (both success and failure paths)")
}

// ────────────────────────────────────────────────────────────────
// 3. Out-of-scope auth flows remain absent/inactive
// ────────────────────────────────────────────────────────────────

async function testOutOfScopeAuthFlows() {
  // Collect all route files and server files for scanning
  const routeFiles = await listFilesRecursively(ROUTES_DIR, ".tsx")
  const serverFiles = await listFilesRecursively(SERVER_DIR, ".ts")

  // Read all route and server source code
  const allWebSource = await Promise.all([
    ...routeFiles.map(readFileText),
    ...serverFiles.map(readFileText),
  ]).then((contents) => contents.join("\n"))

  // --- Password recovery must not exist ---
  assert.ok(
    !allWebSource.includes("recuperar") &&
      !allWebSource.includes("recuperación") &&
      !allWebSource.includes("forgot-password") &&
      !allWebSource.includes("reset-password") &&
      !allWebSource.includes("forgotPassword") &&
      !allWebSource.includes("resetPassword"),
    "Password recovery flow must not exist in web routes or server actions (out of scope)",
  )

  // --- 2FA / two-factor must not exist ---
  assert.ok(
    !allWebSource.includes("2fa") &&
      !allWebSource.includes("2FA") &&
      !allWebSource.includes("two-factor") &&
      !allWebSource.includes("twoFactor") &&
      !allWebSource.includes("verificacion-codigo") &&
      !allWebSource.includes("verificar-codigo"),
    "2FA / two-factor auth flow must not exist in web routes or server actions (out of scope)",
  )

  // --- Social login must not exist ---
  assert.ok(
    !allWebSource.includes("social-login") &&
      !allWebSource.includes("socialLogin") &&
      !allWebSource.includes("google-login") &&
      !allWebSource.includes("googleLogin") &&
      !allWebSource.includes("github-login") &&
      !allWebSource.includes("oauth") &&
      !allWebSource.includes("OAuth"),
    "Social login / OAuth flow must not exist in web routes or server actions (out of scope)",
  )

  // --- Account deletion must not exist ---
  assert.ok(
    !allWebSource.includes("eliminar-cuenta") &&
      !allWebSource.includes("eliminarCuenta") &&
      !allWebSource.includes("delete-account") &&
      !allWebSource.includes("deleteAccount") &&
      !allWebSource.includes("borrar-cuenta"),
    "Account deletion flow must not exist in web routes or server actions (out of scope)",
  )

  // --- Full RBAC admin UI must not exist (only minimal usuarios-pendientes) ---
  // The only admin route should be usuarios-pendientes
  const adminRoutes = routeFiles.filter((f) => f.includes("/admin/"))
  assert.equal(
    adminRoutes.length,
    1,
    "Only one admin route (usuarios-pendientes) should exist — no full RBAC admin UI",
  )
  assert.ok(
    adminRoutes[0]?.includes("usuarios-pendientes"),
    "The sole admin route must be usuarios-pendientes, not a full RBAC console",
  )

  // --- Offline auth/session sync must not exist ---
  assert.ok(
    !allWebSource.includes("offline-auth") &&
      !allWebSource.includes("offlineAuth") &&
      !allWebSource.includes("session-sync") &&
      !allWebSource.includes("sessionSync") &&
      !allWebSource.includes("sync-auth"),
    "Offline auth / session sync flow must not exist in web routes or server actions (out of scope)",
  )

  // Now verify absence in application package exports
  const aplicacionIndex = await readFileText(APLICACION_INDEX)
  const useCaseFiles = await listFilesRecursively(APLICACION_USECASES_DIR, ".ts")

  // The application must only export: registrarUsuario, iniciarSesion, cerrarSesion, obtenerSesionActual, autorizarUsuarioFinca
  assert.ok(
    !aplicacionIndex.includes("recuperar") &&
      !aplicacionIndex.includes("recuperación") &&
      !aplicacionIndex.includes("forgotPassword") &&
      !aplicacionIndex.includes("resetPassword"),
    "Password recovery must not be exported from @ganaweb/aplicacion (out of scope)",
  )
  assert.ok(
    !aplicacionIndex.includes("2fa") &&
      !aplicacionIndex.includes("2FA") &&
      !aplicacionIndex.includes("twoFactor") &&
      !aplicacionIndex.includes("verificarCodigo"),
    "2FA must not be exported from @ganaweb/aplicacion (out of scope)",
  )
  assert.ok(
    !aplicacionIndex.includes("socialLogin") &&
      !aplicacionIndex.includes("oauth") &&
      !aplicacionIndex.includes("OAuth"),
    "Social login must not be exported from @ganaweb/aplicacion (out of scope)",
  )
  assert.ok(
    !aplicacionIndex.includes("eliminarCuenta") && !aplicacionIndex.includes("deleteAccount"),
    "Account deletion must not be exported from @ganaweb/aplicacion (out of scope)",
  )
  assert.ok(
    !aplicacionIndex.includes("offline") && !aplicacionIndex.includes("sessionSync"),
    "Offline auth / session sync must not be exported from @ganaweb/aplicacion (out of scope)",
  )

  // Verify only the expected auth use case files exist
  const expectedUseCases = [
    "registrar-usuario.ts",
    "iniciar-sesion.ts",
    "sesiones.ts",
    "autorizar-usuario-finca.ts",
    "index.ts",
  ]
  const actualUseCaseNames = useCaseFiles.map((f) => f.split("/").pop() ?? "")
  assert.deepEqual(
    actualUseCaseNames.sort(),
    expectedUseCases.sort(),
    "Application auth use case files must match the expected first-slice set exactly",
  )

  // Verify the auth use case source files don't contain out-of-scope logic
  const useCaseContents = await Promise.all(useCaseFiles.map(readFileText))
  const allUseCaseSource = useCaseContents.join("\n")

  assert.ok(
    !allUseCaseSource.includes("recuperar") &&
      !allUseCaseSource.includes("forgotPassword") &&
      !allUseCaseSource.includes("resetPassword"),
    "No password recovery logic in application auth use cases",
  )
  assert.ok(
    !allUseCaseSource.includes("2fa") && !allUseCaseSource.includes("twoFactor"),
    "No 2FA logic in application auth use cases",
  )
  assert.ok(
    !allUseCaseSource.includes("socialLogin") && !allUseCaseSource.includes("oauth"),
    "No social login logic in application auth use cases",
  )
  assert.ok(
    !allUseCaseSource.includes("eliminarCuenta") && !allUseCaseSource.includes("deleteAccount"),
    "No account deletion logic in application auth use cases",
  )
  assert.ok(
    !allUseCaseSource.includes("offline") && !allUseCaseSource.includes("sessionSync"),
    "No offline auth / session sync logic in application auth use cases",
  )

  // biome-ignore lint/suspicious/noConsole: test progress output
  console.log(
    "  ✅ Out-of-scope auth flows (recovery, 2FA, social, delete, full RBAC, offline) confirmed absent",
  )
}

// ────────────────────────────────────────────────────────────────
// Runner
// ────────────────────────────────────────────────────────────────

async function run() {
  // biome-ignore lint/suspicious/noConsole: test progress output
  console.log("\n🔍 auth-scope-and-flow.test.ts — Strict TDD gap coverage\n")

  // biome-ignore lint/suspicious/noConsole: test progress output
  console.log("1. Registration route/component flow → /pendiente")
  await testRegistrationFlow()

  // biome-ignore lint/suspicious/noConsole: test progress output
  console.log("\n2. Logout server-action / cookie behavior")
  await testLogoutCookieBehavior()

  // biome-ignore lint/suspicious/noConsole: test progress output
  console.log("\n3. Out-of-scope auth flows absent/inactive")
  await testOutOfScopeAuthFlows()

  // biome-ignore lint/suspicious/noConsole: test progress output
  console.log("\n✅ All Strict TDD gap tests passed.\n")
}

await run()
