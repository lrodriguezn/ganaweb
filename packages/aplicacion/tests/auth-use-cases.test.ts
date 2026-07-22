import { describe, expect, it, vi } from "vitest"
import {
  type AuthRepositoryPort,
  type PasswordHasherPort,
  type SessionTokenPort,
  autorizarUsuarioFinca,
  cerrarSesion,
  iniciarSesion,
  obtenerSesionActual,
  registrarUsuario,
} from "../src/index.js"

function createDeps(overrides: Partial<AuthRepositoryPort> = {}) {
  const repo: AuthRepositoryPort = {
    buscarUsuarioPorIdentidad: vi.fn(async () => null),
    crearUsuarioPendiente: vi.fn(async () => ({ usuarioId: "usuario-1", fincaId: "finca-1" })),
    obtenerCredencialesPorEmail: vi.fn(async () => null),
    guardarIntentoLogin: vi.fn(async () => {}),
    crearSesion: vi.fn(async () => ({ id: "sesion-1", fechaExpiracion: new Date("2030-01-01") })),
    obtenerSesionPorTokenHash: vi.fn(async () => null),
    revocarSesion: vi.fn(async () => {}),
    obtenerAutorizacionUsuario: vi.fn(async () => ({ tipo: "no_autenticado" })),
    autorizarUsuarioFinca: vi.fn(async () => {}),
    listarUsuariosPendientes: vi.fn(async () => []),
    ...overrides,
  }
  const passwordHasher: PasswordHasherPort = {
    hash: vi.fn(async () => "hash-seguro"),
    verify: vi.fn(async () => true),
  }
  const tokens: SessionTokenPort = {
    crearToken: vi.fn(() => "token-claro"),
    hashToken: vi.fn((token) => `hash:${token}`),
  }
  return { repo, passwordHasher, tokens }
}

describe("auth use cases", () => {
  it("rejects duplicate registration without creating a second account", async () => {
    const deps = createDeps({
      buscarUsuarioPorIdentidad: vi.fn(async () => ({ id: "existente", email: "ana@test.com" })),
    })

    const result = await registrarUsuario(deps)({
      nombre: "Ana Pérez",
      email: "ana@test.com",
      password: "Clave-segura-123",
      fincaCodigo: "F001",
    })

    expect(result).toEqual({ tipo: "duplicado" })
    expect(deps.repo.crearUsuarioPendiente).not.toHaveBeenCalled()
  })

  it("registers a new account as pending authorization", async () => {
    const deps = createDeps()

    const result = await registrarUsuario(deps)({
      nombre: "Ana Pérez",
      email: "ana@test.com",
      password: "Clave-segura-123",
      fincaCodigo: "F001",
    })

    expect(result).toEqual({ tipo: "pendiente", usuarioId: "usuario-1", fincaId: "finca-1" })
    expect(deps.passwordHasher.hash).toHaveBeenCalledWith("Clave-segura-123")
  })

  it("returns an authorized session for approved login", async () => {
    const deps = createDeps({
      obtenerCredencialesPorEmail: vi.fn(async () => ({
        usuarioId: "usuario-1",
        email: "ana@test.com",
        nombre: "Ana Pérez",
        contrasenaHash: "hash",
        activo: true,
      })),
      obtenerAutorizacionUsuario: vi.fn(async () => ({
        tipo: "autorizado",
        sesion: {
          usuarioId: "usuario-1",
          nombre: "Ana Pérez",
          email: "ana@test.com",
          fincaActivaId: "finca-1",
          fincaActivaNombre: "Finca 1",
          rol: "Administrador",
          permisos: [{ modulo: "usuarios", accion: "aprobar" }],
        },
      })),
    })

    const result = await iniciarSesion(deps)({ email: "ana@test.com", password: "ok" })

    expect(result.tipo).toBe("autorizado")
    expect(result).toMatchObject({ token: "token-claro", sesionId: "sesion-1" })
    if (result.tipo === "autorizado") {
      expect(result.sesion.fincaActivaNombre).toBe("Finca 1")
    }
    expect(deps.repo.guardarIntentoLogin).toHaveBeenCalledWith(
      expect.objectContaining({ usuarioId: "usuario-1", exitoso: true }),
    )
  })

  it("keeps valid pending users outside the protected app", async () => {
    const deps = createDeps({
      obtenerCredencialesPorEmail: vi.fn(async () => ({
        usuarioId: "usuario-1",
        email: "ana@test.com",
        nombre: "Ana Pérez",
        contrasenaHash: "hash",
        activo: true,
      })),
      obtenerAutorizacionUsuario: vi.fn(async () => ({
        tipo: "pendiente",
        usuarioId: "usuario-1",
        nombre: "Ana Pérez",
        email: "ana@test.com",
      })),
    })

    const result = await iniciarSesion(deps)({ email: "ana@test.com", password: "ok" })

    expect(result).toMatchObject({ tipo: "pendiente", token: "token-claro" })
  })

  it("revokes logout so the same token no longer grants app access", async () => {
    const sesiones = new Map([
      ["hash:token-claro", { usuarioId: "usuario-1", sesionId: "sesion-1" }],
    ])
    const deps = createDeps({
      obtenerSesionPorTokenHash: vi.fn(async (hash) => sesiones.get(hash) ?? null),
      revocarSesion: vi.fn(async (sesionId) => {
        for (const [hash, sesion] of sesiones.entries()) {
          if (sesion.sesionId === sesionId) sesiones.delete(hash)
        }
      }),
      obtenerAutorizacionUsuario: vi.fn(async () => ({
        tipo: "pendiente",
        usuarioId: "usuario-1",
        nombre: "Ana",
        email: "a@test.com",
      })),
    })

    await expect(obtenerSesionActual(deps)("token-claro")).resolves.toEqual({
      tipo: "pendiente",
      usuarioId: "usuario-1",
      nombre: "Ana",
      email: "a@test.com",
    })

    await expect(cerrarSesion(deps)("token-claro")).resolves.toEqual({ tipo: "cerrada" })
    await expect(obtenerSesionActual(deps)("token-claro")).resolves.toEqual({
      tipo: "no_autenticado",
    })
    await expect(obtenerSesionActual(deps)(null)).resolves.toEqual({ tipo: "no_autenticado" })
  })

  it("rejects finca approval when the actor lacks admin permission", async () => {
    const deps = createDeps({
      obtenerAutorizacionUsuario: vi.fn(async () => ({
        tipo: "autorizado",
        sesion: {
          usuarioId: "actor-1",
          nombre: "Operario",
          email: "op@test.com",
          fincaActivaId: "finca-1",
          fincaActivaNombre: "Finca 1",
          rol: "Operario",
          permisos: [{ modulo: "animales", accion: "leer" }],
        },
      })),
    })

    const result = await autorizarUsuarioFinca(deps)({
      actorUsuarioId: "actor-1",
      usuarioId: "usuario-1",
      fincaId: "finca-1",
    })

    expect(result).toEqual({ tipo: "no_autorizado" })
    expect(deps.repo.autorizarUsuarioFinca).not.toHaveBeenCalled()
  })
})
