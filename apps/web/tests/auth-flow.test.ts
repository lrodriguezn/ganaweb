import assert from "node:assert/strict"
import type {
  AuthRepositoryPort,
  DecisionAutorizacion,
  SesionAutorizada,
} from "@ganaweb/aplicacion"
import {
  approvePendingUserForDecision,
  canApproveUsers,
  listPendingUsersForDecision,
  protectedRouteRedirect,
} from "../src/server/auth.js"

function authorizedSession(overrides: Partial<SesionAutorizada> = {}): SesionAutorizada {
  return {
    usuarioId: "usuario-admin",
    nombre: "Admin GanaWeb",
    email: "admin@ganaweb.test",
    fincaActivaId: "finca-1",
    rol: "Administrador",
    permisos: [{ modulo: "usuarios", accion: "aprobar" }],
    ...overrides,
  }
}

function authorizedDecision(overrides: Partial<SesionAutorizada> = {}): DecisionAutorizacion {
  return { tipo: "autorizado", sesion: authorizedSession(overrides) }
}

async function run() {
  assert.equal(protectedRouteRedirect({ tipo: "no_autenticado" }), "/login")
  assert.equal(
    protectedRouteRedirect({
      tipo: "pendiente",
      usuarioId: "u",
      nombre: "Pendiente",
      email: "p@ganaweb.test",
    }),
    "/pendiente",
  )
  assert.equal(protectedRouteRedirect(authorizedDecision()), null)

  assert.equal(canApproveUsers(authorizedSession(), "finca-1"), true)
  assert.equal(canApproveUsers(authorizedSession(), "finca-2"), false)
  assert.equal(
    canApproveUsers(
      authorizedSession({ permisos: [{ modulo: "lectura", accion: "ver" }] }),
      "finca-1",
    ),
    false,
  )

  let listedFincaId: string | null = null
  const repo = {
    async listarUsuariosPendientes(fincaId: string) {
      listedFincaId = fincaId
      return [
        {
          usuarioId: "usuario-pendiente",
          nombre: "Usuario Pendiente",
          email: "pendiente@ganaweb.test",
          fincaId,
          fincaNombre: "Finca Prueba",
        },
      ]
    },
  } satisfies Pick<AuthRepositoryPort, "listarUsuariosPendientes">

  const pendingUsers = await listPendingUsersForDecision(authorizedDecision(), repo)
  assert.equal(listedFincaId, "finca-1")
  assert.equal(pendingUsers[0]?.usuarioId, "usuario-pendiente")

  listedFincaId = null
  assert.deepEqual(
    await listPendingUsersForDecision(authorizedDecision({ permisos: [] }), repo),
    [],
  )
  assert.equal(listedFincaId, null)

  const approvals: unknown[] = []
  const deps = {
    repo: {
      async obtenerAutorizacionUsuario(usuarioId: string, fincaId?: string | null) {
        assert.equal(usuarioId, "usuario-admin")
        assert.equal(fincaId, "finca-1")
        return authorizedDecision()
      },
      async autorizarUsuarioFinca(input: {
        usuarioId: string
        fincaId: string
        actorUsuarioId: string
      }) {
        approvals.push(input)
      },
    },
    passwordHasher: {
      async hash() {
        return "unused"
      },
      async verify() {
        return false
      },
    },
    tokens: {
      crearToken: () => "unused",
      hashToken: () => "unused",
    },
  } as Parameters<typeof approvePendingUserForDecision>[2]

  assert.deepEqual(
    await approvePendingUserForDecision(
      authorizedDecision(),
      { usuarioId: "usuario-pendiente", fincaId: "finca-1" },
      deps,
    ),
    { tipo: "autorizado" },
  )
  assert.deepEqual(approvals, [
    { actorUsuarioId: "usuario-admin", usuarioId: "usuario-pendiente", fincaId: "finca-1" },
  ])

  assert.deepEqual(
    await approvePendingUserForDecision(
      { tipo: "no_autenticado" },
      { usuarioId: "usuario-pendiente", fincaId: "finca-1" },
      deps,
    ),
    { tipo: "no_autorizado" },
  )
}

await run()
