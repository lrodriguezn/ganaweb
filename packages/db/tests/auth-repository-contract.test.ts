import { getTableName } from "drizzle-orm"
import { describe, expect, it } from "vitest"
import { DrizzleAuthRepository } from "../src/auth-repository.js"
import { usuariosFincas, usuariosRolesAsignacion } from "../src/schema/index.js"

class SelectQuery {
  private tableName = ""

  constructor(private readonly data: AuthRepositoryData) {}

  from(table: unknown) {
    this.tableName = getTableName(table as never)
    return this
  }

  innerJoin() {
    return this
  }

  where() {
    return this
  }

  orderBy() {
    return this.resolve()
  }

  limit() {
    return this
  }

  // biome-ignore lint/suspicious/noThenProperty: this test double must behave like Drizzle's awaitable query builder.
  then<TResult1 = unknown[], TResult2 = never>(
    onfulfilled?: ((value: unknown[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve(this.resolve()).then(onfulfilled, onrejected)
  }

  private resolve() {
    if (this.tableName === "usuarios") return [this.data.usuario]
    if (this.tableName === getTableName(usuariosFincas)) return this.data.memberships
    if (this.tableName === getTableName(usuariosRolesAsignacion)) {
      this.data.roleQueryCount += 1
      return this.data.roles
    }
    return []
  }
}

type AuthRepositoryData = {
  usuario: { id: string; nombre: string; email: string }
  memberships: { fincaId: string; fincaNombre: string; activo: number; createdAt: Date }[]
  roles: { fincaId: string | null; rol: string; modulo: string; accion: string }[]
  roleQueryCount: number
}

function fakeDb(data: AuthRepositoryData) {
  return {
    select: () => new SelectQuery(data),
  }
}

/** Espejo del seed demo: admin con dos fincas activas + una membresía pendiente. */
function multiFincaData(): AuthRepositoryData {
  return {
    usuario: { id: "usuario-admin", nombre: "Admin GanaWeb", email: "admin@ganaweb.test" },
    memberships: [
      {
        fincaId: "finca-esperanza",
        fincaNombre: "La Esperanza",
        activo: 1,
        createdAt: new Date("2026-01-02"),
      },
      {
        fincaId: "finca-roble",
        fincaNombre: "Hacienda El Roble",
        activo: 1,
        createdAt: new Date("2026-01-01"),
      },
      {
        fincaId: "finca-nueva",
        fincaNombre: "Finca Nueva",
        activo: 0,
        createdAt: new Date("2026-01-03"),
      },
    ],
    roles: [
      { fincaId: "finca-esperanza", rol: "Administrador", modulo: "usuarios", accion: "aprobar" },
      { fincaId: "finca-esperanza", rol: "Administrador", modulo: "animales", accion: "crear" },
      { fincaId: "finca-esperanza", rol: "Administrador", modulo: "animales", accion: "editar" },
      { fincaId: "finca-roble", rol: "Solo lectura", modulo: "animales", accion: "ver" },
    ],
    roleQueryCount: 0,
  }
}

describe("DrizzleAuthRepository multi-finca authorization contract (issue #144)", () => {
  it("exposes every membership with per-finca rol, activo and permisos (CE-1)", async () => {
    const data = multiFincaData()
    const repository = new DrizzleAuthRepository(fakeDb(data) as never)

    const decision = await repository.obtenerAutorizacionUsuario("usuario-admin", "finca-esperanza")

    expect(decision.tipo).toBe("autorizado")
    if (decision.tipo !== "autorizado") return
    expect(decision.sesion.fincaActivaId).toBe("finca-esperanza")
    expect(decision.sesion.rol).toBe("Administrador")
    expect(decision.sesion.fincas).toEqual([
      {
        fincaId: "finca-esperanza",
        nombre: "La Esperanza",
        rol: "Administrador",
        activo: true,
        permisos: [
          { modulo: "usuarios", accion: "aprobar" },
          { modulo: "animales", accion: "crear" },
          { modulo: "animales", accion: "editar" },
        ],
      },
      {
        fincaId: "finca-roble",
        nombre: "Hacienda El Roble",
        rol: "Solo lectura",
        activo: true,
        permisos: [{ modulo: "animales", accion: "ver" }],
      },
      {
        fincaId: "finca-nueva",
        nombre: "Finca Nueva",
        rol: "Autorizado",
        activo: false,
        permisos: [],
      },
    ])
    // Una única consulta agrupada de roles/permisos (sin N+1).
    expect(data.roleQueryCount).toBe(1)
  })

  it("keeps the active session scoped to the active finca permissions (CE-2)", async () => {
    const data = multiFincaData()
    const repository = new DrizzleAuthRepository(fakeDb(data) as never)

    const decision = await repository.obtenerAutorizacionUsuario("usuario-admin", "finca-roble")

    expect(decision.tipo).toBe("autorizado")
    if (decision.tipo !== "autorizado") return
    expect(decision.sesion.fincaActivaId).toBe("finca-roble")
    expect(decision.sesion.fincaActivaNombre).toBe("Hacienda El Roble")
    expect(decision.sesion.rol).toBe("Solo lectura")
    expect(decision.sesion.permisos).toEqual([{ modulo: "animales", accion: "ver" }])
    expect(decision.sesion.permisos).not.toContainEqual({ modulo: "animales", accion: "crear" })
    expect(decision.sesion.permisos).not.toContainEqual({ modulo: "animales", accion: "editar" })
    expect(decision.sesion.permisos).not.toContainEqual({ modulo: "usuarios", accion: "aprobar" })
  })

  it("resolves explicit finca over last-used finca (prioridad a > b)", async () => {
    const repository = new DrizzleAuthRepository(fakeDb(multiFincaData()) as never)

    const decision = await repository.obtenerAutorizacionUsuario(
      "usuario-admin",
      "finca-roble",
      "finca-esperanza",
    )

    expect(decision.tipo).toBe("autorizado")
    if (decision.tipo !== "autorizado") return
    expect(decision.sesion.fincaActivaId).toBe("finca-roble")
  })

  it("resolves last-used finca over the first active membership (prioridad b > c)", async () => {
    const repository = new DrizzleAuthRepository(fakeDb(multiFincaData()) as never)

    const decision = await repository.obtenerAutorizacionUsuario(
      "usuario-admin",
      null,
      "finca-roble",
    )

    expect(decision.tipo).toBe("autorizado")
    if (decision.tipo !== "autorizado") return
    // Sin última finca usada ganaría finca-esperanza (createdAt más reciente).
    expect(decision.sesion.fincaActivaId).toBe("finca-roble")
  })

  it("falls back to the first active membership when last-used is stale", async () => {
    const repository = new DrizzleAuthRepository(fakeDb(multiFincaData()) as never)

    const decision = await repository.obtenerAutorizacionUsuario(
      "usuario-admin",
      null,
      "finca-inexistente",
    )

    expect(decision.tipo).toBe("autorizado")
    if (decision.tipo !== "autorizado") return
    expect(decision.sesion.fincaActivaId).toBe("finca-esperanza")
  })

  it("falls back to the first active membership when last-used points at a pending membership", async () => {
    const repository = new DrizzleAuthRepository(fakeDb(multiFincaData()) as never)

    const decision = await repository.obtenerAutorizacionUsuario(
      "usuario-admin",
      null,
      "finca-nueva",
    )

    expect(decision.tipo).toBe("autorizado")
    if (decision.tipo !== "autorizado") return
    expect(decision.sesion.fincaActivaId).toBe("finca-esperanza")
  })

  it("denies an explicit finca without active membership (deep link sin acceso)", async () => {
    const repository = new DrizzleAuthRepository(fakeDb(multiFincaData()) as never)

    // Membresía pendiente (activo=0): el deep link se deniega como antes.
    await expect(
      repository.obtenerAutorizacionUsuario("usuario-admin", "finca-nueva"),
    ).resolves.toEqual({
      tipo: "pendiente",
      usuarioId: "usuario-admin",
      nombre: "Admin GanaWeb",
      email: "admin@ganaweb.test",
    })
    // Finca sin membresía alguna: mismo rechazo.
    await expect(
      repository.obtenerAutorizacionUsuario("usuario-admin", "finca-ajena"),
    ).resolves.toMatchObject({ tipo: "pendiente" })
  })

  it("keeps the pending decision when the user has no active membership at all", async () => {
    const data = multiFincaData()
    data.memberships = [
      {
        fincaId: "finca-nueva",
        fincaNombre: "Finca Nueva",
        activo: 0,
        createdAt: new Date("2026-01-03"),
      },
    ]
    const repository = new DrizzleAuthRepository(fakeDb(data) as never)

    await expect(repository.obtenerAutorizacionUsuario("usuario-admin")).resolves.toEqual({
      tipo: "pendiente",
      usuarioId: "usuario-admin",
      nombre: "Admin GanaWeb",
      email: "admin@ganaweb.test",
    })
  })
})
