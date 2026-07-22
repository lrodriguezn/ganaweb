import { getTableName } from "drizzle-orm"
import { describe, expect, it } from "vitest"
import { DrizzleAuthRepository } from "../src/auth-repository.js"
import { usuariosFincas, usuariosRolesAsignacion } from "../src/schema/index.js"

function conditionContains(condition: unknown, columnName: string, value: unknown): boolean {
  if (!condition || typeof condition !== "object") return false
  const chunks = (condition as { queryChunks?: unknown[] }).queryChunks ?? []
  return chunks.some((chunk, index) => {
    if (conditionContains(chunk, columnName, value)) return true
    const maybeColumn = chunk as { name?: string }
    if (maybeColumn.name !== columnName) return false
    return chunks.slice(index + 1).some((next) => (next as { value?: unknown }).value === value)
  })
}

class SelectQuery {
  private tableName = ""
  private condition: unknown

  constructor(private readonly data: AuthRepositoryData) {}

  from(table: unknown) {
    this.tableName = getTableName(table as never)
    return this
  }

  innerJoin() {
    return this
  }

  where(condition: unknown) {
    this.condition = condition
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
      const fincaId = this.data.memberships.find((membership) => membership.activo === 1)?.fincaId
      this.data.roleWhereScopedToActiveFinca = conditionContains(
        this.condition,
        "finca_id",
        fincaId,
      )
      if (!this.data.roleWhereScopedToActiveFinca) return this.data.roles
      return this.data.roles
        .filter((role) => role.fincaId === fincaId)
        .map(({ fincaId: _fincaId, ...role }) => role)
    }
    return []
  }
}

type AuthRepositoryData = {
  usuario: { id: string; nombre: string; email: string }
  memberships: { fincaId: string; fincaNombre: string; activo: number; createdAt: Date }[]
  roles: { fincaId: string; rol: string; modulo: string; accion: string }[]
  roleWhereScopedToActiveFinca: boolean
}

function fakeDb(data: AuthRepositoryData) {
  return {
    select: () => new SelectQuery(data),
  }
}

describe("DrizzleAuthRepository authorization contract", () => {
  it("executes finca-scoped role permission lookup for the active membership", async () => {
    const data: AuthRepositoryData = {
      usuario: { id: "usuario-1", nombre: "Usuario Uno", email: "uno@ganaweb.test" },
      memberships: [
        {
          fincaId: "finca-1",
          fincaNombre: "Finca Uno",
          activo: 1,
          createdAt: new Date("2026-01-02"),
        },
        {
          fincaId: "finca-2",
          fincaNombre: "Finca Dos",
          activo: 1,
          createdAt: new Date("2026-01-01"),
        },
      ],
      roles: [
        { fincaId: "finca-1", rol: "Operario", modulo: "animales", accion: "ver" },
        { fincaId: "finca-2", rol: "Admin Externo", modulo: "usuarios", accion: "aprobar" },
      ],
      roleWhereScopedToActiveFinca: false,
    }
    const repository = new DrizzleAuthRepository(fakeDb(data) as never)

    const decision = await repository.obtenerAutorizacionUsuario("usuario-1", "finca-1")

    expect(data.roleWhereScopedToActiveFinca).toBe(true)
    expect(decision).toMatchObject({
      tipo: "autorizado",
      sesion: {
        fincaActivaId: "finca-1",
        fincaActivaNombre: "Finca Uno",
        permisos: [{ modulo: "animales", accion: "ver" }],
      },
    })
    if (decision.tipo === "autorizado") {
      expect(decision.sesion.permisos).not.toContainEqual({ modulo: "usuarios", accion: "aprobar" })
    }
  })
})
