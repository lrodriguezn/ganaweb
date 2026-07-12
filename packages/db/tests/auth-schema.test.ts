import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { getTableName } from "drizzle-orm"
import { describe, expect, it } from "vitest"
import {
  rolesPermisos,
  usuarios,
  usuariosContrasena,
  usuariosFincas,
  usuariosLogin,
  usuariosPermisos,
  usuariosRoles,
  usuariosRolesAsignacion,
  usuariosSesiones,
} from "../src/schema/index.js"

const testDir = dirname(fileURLToPath(import.meta.url))
const packageRoot = resolve(testDir, "..")

describe("auth schema exports", () => {
  it("exports first-slice auth tables with typed runtime names", () => {
    expect(getTableName(usuarios)).toBe("usuarios")
    expect(getTableName(usuariosContrasena)).toBe("usuarios_contrasena")
    expect(getTableName(usuariosLogin)).toBe("usuarios_login")
    expect(getTableName(usuariosSesiones)).toBe("usuarios_sesiones")
    expect(getTableName(usuariosFincas)).toBe("usuarios_fincas")
  })

  it("exports permission tables needed by finca-admin approval without recovery or 2FA flows", () => {
    expect(getTableName(usuariosRoles)).toBe("usuarios_roles")
    expect(getTableName(usuariosPermisos)).toBe("usuarios_permisos")
    expect(getTableName(rolesPermisos)).toBe("roles_permisos")
    expect(getTableName(usuariosRolesAsignacion)).toBe("usuarios_roles_asignacion")
  })

  it("commits migration DDL for every first-slice auth table", () => {
    const migration = readFileSync(resolve(packageRoot, "migrations/0000_initial.sql"), "utf8")

    for (const table of [
      "usuarios",
      "usuarios_contrasena",
      "usuarios_login",
      "usuarios_sesiones",
      "usuarios_fincas",
      "usuarios_roles",
      "usuarios_permisos",
      "roles_permisos",
      "usuarios_roles_asignacion",
    ]) {
      expect(migration).toContain(`CREATE TABLE "${table}"`)
    }
  })
})
