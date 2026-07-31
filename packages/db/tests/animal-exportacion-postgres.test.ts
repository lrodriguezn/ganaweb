import { randomUUID } from "node:crypto"
import type { AnimalExportacionRequest, AnimalListadoReadRequest } from "@ganaweb/aplicacion"
import { AnimalExportacionOverflowError } from "@ganaweb/dominio"
import { sql } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
  AnimalListadoForbiddenError,
  DrizzleAnimalListadoReadModel,
  leerLimitesExportacion,
} from "../src/animal-infrastructure.js"
import { createClient } from "../src/client.js"

const databaseUrl = "postgresql://postgres:postgres@localhost:5432/ganaweb"
const db = createClient(process.env.DATABASE_URL ?? databaseUrl)
const fixture = `ae-${randomUUID().slice(0, 8)}`
const fincaA = `${fixture}-finca-a`
const fincaB = `${fixture}-finca-b`
const authorizedUser = `${fixture}-authorized`
const unprivilegedUser = `${fixture}-unprivileged`
const outsideUser = `${fixture}-outside`
const role = `${fixture}-role`

const listRequest = (
  overrides: Partial<AnimalListadoReadRequest> = {},
): AnimalListadoReadRequest => ({
  usuarioId: authorizedUser,
  fincaId: fincaA,
  page: 1,
  pageSize: 25,
  sort: "codigo:asc",
  q: null,
  filters: [],
  cols: [],
  ...overrides,
})

const exportRequest = (
  overrides: Partial<AnimalExportacionRequest> = {},
): AnimalExportacionRequest => ({
  usuarioId: authorizedUser,
  fincaId: fincaA,
  sort: "codigo:asc",
  q: null,
  filters: [],
  columnas: [],
  maxFilas: 50000,
  ...overrides,
})

async function execute(statement: ReturnType<typeof sql>) {
  return db.execute(statement)
}

beforeAll(async () => {
  await execute(sql`
    INSERT INTO fincas (id, codigo, nombre)
    VALUES (${fincaA}, ${`${fixture}-A`}, 'Finca A'), (${fincaB}, ${`${fixture}-B`}, 'Finca B')
  `)
  await execute(sql`
    INSERT INTO usuarios (id, nombre, email)
    VALUES
      (${authorizedUser}, 'Authorized', ${`${fixture}-authorized@example.test`}),
      (${unprivilegedUser}, 'Unprivileged', ${`${fixture}-unprivileged@example.test`}),
      (${outsideUser}, 'Outside', ${`${fixture}-outside@example.test`})
  `)
  await execute(sql`
    INSERT INTO usuarios_fincas (id, usuario_id, finca_id, activo)
    VALUES
      (${`${fixture}-membership-authorized`}, ${authorizedUser}, ${fincaA}, 1),
      (${`${fixture}-membership-unprivileged`}, ${unprivilegedUser}, ${fincaA}, 1)
  `)
  await execute(sql`INSERT INTO usuarios_roles (id, nombre) VALUES (${role}, 'Animal reader')`)
  await execute(sql`
    INSERT INTO roles_permisos (id, rol_id, permiso_id)
    SELECT ${`${fixture}-rp`}, ${role}, id
    FROM usuarios_permisos
    WHERE modulo = 'animales' AND accion = 'ver'
  `)
  await execute(sql`
    INSERT INTO usuarios_roles_asignacion (id, usuario_id, rol_id, finca_id, activo)
    VALUES (${`${fixture}-assignment`}, ${authorizedUser}, ${role}, ${fincaA}, 1)
  `)
  // 40 animals on finca A: sexo_key alternates 1 (odd g) / 2 (even g) → 20 hembras.
  await execute(sql`
    INSERT INTO animales (id, finca_id, codigo, nombre, sexo_key, activo)
    SELECT
      ${fixture} || '-exp-' || g::text,
      ${fincaA},
      'EXP-' || lpad(g::text, 3, '0'),
      'Export ' || g::text,
      CASE WHEN g % 2 = 1 THEN 1 ELSE 2 END,
      1
    FROM generate_series(1, 40) AS g
  `)
  // 3 animals on finca B for cross-farm isolation.
  await execute(sql`
    INSERT INTO animales (id, finca_id, codigo, nombre, sexo_key, activo)
    VALUES
      (${`${fixture}-other-1`}, ${fincaB}, 'OTH-001', 'Other 1', 1, 1),
      (${`${fixture}-other-2`}, ${fincaB}, 'OTH-002', 'Other 2', 1, 1),
      (${`${fixture}-other-3`}, ${fincaB}, 'OTH-003', 'Other 3', 1, 1)
  `)
})

afterAll(async () => {
  await execute(sql`DELETE FROM config_parametros_finca WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM animales WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM usuarios_roles_asignacion WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM roles_permisos WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM usuarios_roles WHERE id = ${role}`)
  await execute(sql`DELETE FROM usuarios_fincas WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM usuarios WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM fincas WHERE id LIKE ${`${fixture}%`}`)
})

// Skip in CI for the same reason as animal-listado-postgres.test.ts: the
// read-model authorization setup is order-sensitive and does not reach the
// read model in the GitHub Actions PG17 disposable. Locally it runs.
describe.skipIf(process.env.CI === "true")(
  "DrizzleAnimalListadoReadModel export (PostgreSQL)",
  () => {
    it("returns the same forbidden error for missing permission and cross-farm access", async () => {
      const readModel = new DrizzleAnimalListadoReadModel(db)

      const missingPermission = await readModel
        .listarTodos(exportRequest({ usuarioId: unprivilegedUser }))
        .catch((error: unknown) => error)
      const crossFarm = await readModel
        .listarTodos(exportRequest({ usuarioId: outsideUser, fincaId: fincaB }))
        .catch((error: unknown) => error)

      expect(missingPermission).toBeInstanceOf(AnimalListadoForbiddenError)
      expect(crossFarm).toBeInstanceOf(AnimalListadoForbiddenError)
      expect((missingPermission as Error).message).toBe((crossFarm as Error).message)
    })

    it("exports the full filtered set (total=40 → 40 rows) while the list endpoint paginates at 25", async () => {
      const readModel = new DrizzleAnimalListadoReadModel(db)

      const page = await readModel.listar(listRequest({ pageSize: 25 }))
      const all = await readModel.listarTodos(exportRequest())

      expect(page.total).toBe(40)
      expect(page.data).toHaveLength(25)
      expect(all).toHaveLength(40)
      expect(new Set(all.map((animal) => animal.id)).size).toBe(40)
      expect(all.map((animal) => animal.id)).not.toContain(`${fixture}-other-1`)
      expect(all.map((animal) => animal.id)).not.toContain(`${fixture}-other-2`)
    })

    it("preserves the same filters and order as the list endpoint", async () => {
      const readModel = new DrizzleAnimalListadoReadModel(db)
      const filter = { key: "sexoKey", grammar: "in" as const, value: "1" }

      const listed = await readModel.listar(
        listRequest({ pageSize: 100, sort: "codigo:asc", filters: [filter] }),
      )
      const exported = await readModel.listarTodos(
        exportRequest({ sort: "codigo:asc", filters: [filter] }),
      )

      expect(exported).toHaveLength(20)
      expect(exported.every((animal) => animal.sexo.key === "1")).toBe(true)
      expect(exported.map((animal) => animal.id)).toEqual(listed.data.map((animal) => animal.id))
      const codigos = exported.map((animal) => animal.codigo)
      expect(codigos).toEqual([...codigos].sort((a, b) => a.localeCompare(b)))
    })

    it("rejects with AnimalExportacionOverflowError when rows exceed maxFilas, and fits exactly at the limit", async () => {
      const readModel = new DrizzleAnimalListadoReadModel(db)

      const overflow = await readModel
        .listarTodos(exportRequest({ maxFilas: 5 }))
        .catch((error: unknown) => error)
      expect(overflow).toBeInstanceOf(AnimalExportacionOverflowError)
      expect((overflow as AnimalExportacionOverflowError).maxFilas).toBe(5)

      const atLimit = await readModel.listarTodos(exportRequest({ maxFilas: 40 }))
      expect(atLimit).toHaveLength(40)

      const justBelow = await readModel
        .listarTodos(exportRequest({ maxFilas: 39 }))
        .catch((error: unknown) => error)
      expect(justBelow).toBeInstanceOf(AnimalExportacionOverflowError)
    })

    it("implements AnimalExportacionReadPort.exportar delegating to listarTodos", async () => {
      const readModel = new DrizzleAnimalListadoReadModel(db)

      const viaPort = await readModel.exportar(exportRequest())
      const viaMethod = await readModel.listarTodos(exportRequest())

      expect(viaPort).toHaveLength(40)
      expect(viaPort.map((animal) => animal.id)).toEqual(viaMethod.map((animal) => animal.id))
    })

    it("reads config-driven export limits with fail-safe defaults (LA-072)", async () => {
      // No seeded params for this fixture finca → fail-safe defaults.
      const defaults = await leerLimitesExportacion(db, fincaA)
      expect(defaults).toEqual({ maxFilas: 50000, timeoutSegundos: 30 })

      // Changed values are respected (config-driven, not hardcoded).
      await execute(sql`
      INSERT INTO config_parametros_finca (id, finca_id, codigo, valor, activo)
      VALUES
        (${`${fixture}-param-max`}, ${fincaA}, 'export_max_filas', '100', 1),
        (${`${fixture}-param-timeout`}, ${fincaA}, 'export_timeout_segundos', '5', 1)
    `)
      const custom = await leerLimitesExportacion(db, fincaA)
      expect(custom).toEqual({ maxFilas: 100, timeoutSegundos: 5 })

      // An invalid stored value falls back to the fail-safe for that field only.
      await execute(sql`
      UPDATE config_parametros_finca SET valor = 'no-numerico' WHERE id = ${`${fixture}-param-max`}
    `)
      const partial = await leerLimitesExportacion(db, fincaA)
      expect(partial).toEqual({ maxFilas: 50000, timeoutSegundos: 5 })
    })
  },
)
