import { randomUUID } from "node:crypto"
import { sql } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
  AnimalListadoForbiddenError,
  DrizzleAnimalListadoReadModel,
} from "../src/animal-infrastructure.js"
import { createClient } from "../src/client.js"

const databaseUrl = "postgresql://postgres:postgres@localhost:5432/ganaweb"
const db = createClient(process.env.DATABASE_URL ?? databaseUrl)
const fixture = `al-${randomUUID().slice(0, 8)}`
const fincaA = `${fixture}-finca-a`
const fincaB = `${fixture}-finca-b`
const authorizedUser = `${fixture}-authorized`
const unprivilegedUser = `${fixture}-unprivileged`
const outsideUser = `${fixture}-outside`
const role = `${fixture}-role`

const request = (overrides: Record<string, unknown> = {}) => ({
  usuarioId: authorizedUser,
  fincaId: fincaA,
  page: 1,
  pageSize: 25 as const,
  sort: "codigo:asc" as const,
  q: null,
  filters: [],
  cols: [],
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
  await execute(sql`
    INSERT INTO animales (id, finca_id, codigo, nombre, sexo_key, tipo_ingreso_id, activo)
    VALUES
      (${`${fixture}-animal-1`}, ${fincaA}, 'AA-001', 'Alpha', 1, 9, 1),
      (${`${fixture}-animal-2`}, ${fincaA}, 'AA-002', 'Bravo', 0, NULL, 1),
      (${`${fixture}-animal-3`}, ${fincaA}, 'AA-003', 'Charlie', 1, 1, 1),
      (${`${fixture}-animal-other`}, ${fincaB}, 'AA-001', 'Other finca', 1, 1, 1)
  `)
  await execute(sql`
    INSERT INTO pesos (id, animal_id, fecha, peso_kg)
    VALUES
      (${`${fixture}-weight-a`}, ${`${fixture}-animal-1`}, '2026-01-01', 410),
      (${`${fixture}-weight-b`}, ${`${fixture}-animal-1`}, '2026-01-01', 425)
  `)
})

afterAll(async () => {
  await execute(sql`DELETE FROM pesos WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM animales WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM usuarios_roles_asignacion WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM roles_permisos WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM usuarios_roles WHERE id = ${role}`)
  await execute(sql`DELETE FROM usuarios_fincas WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM usuarios WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM fincas WHERE id LIKE ${`${fixture}%`}`)
})

describe("DrizzleAnimalListadoReadModel (PostgreSQL)", () => {
  it("returns the same forbidden error for missing permission and cross-farm access", async () => {
    const readModel = new DrizzleAnimalListadoReadModel(db)

    const missingPermission = await readModel
      .listar(request({ usuarioId: unprivilegedUser }))
      .catch((error: unknown) => error)
    const crossFarm = await readModel
      .listar(request({ usuarioId: outsideUser, fincaId: fincaB }))
      .catch((error: unknown) => error)

    expect(missingPermission).toBeInstanceOf(AnimalListadoForbiddenError)
    expect(crossFarm).toBeInstanceOf(AnimalListadoForbiddenError)
    expect((missingPermission as Error).message).toBe((crossFarm as Error).message)
  })

  it("filters inside the requested finca, returns both counts, and keeps pages stable", async () => {
    const readModel = new DrizzleAnimalListadoReadModel(db)
    const firstPage = await readModel.listar(
      request({ pageSize: 50, q: "a", filters: [{ key: "sexoKey", grammar: "in", value: "1" }] }),
    )
    const pageOne = await readModel.listar(request({ pageSize: 25, sort: "codigo:asc" }))
    const pageTwo = await readModel.listar(request({ page: 2, pageSize: 25, sort: "codigo:asc" }))

    expect(firstPage.data.map((animal) => animal.id)).toEqual([
      `${fixture}-animal-1`,
      `${fixture}-animal-3`,
    ])
    expect(firstPage.total).toBe(2)
    expect(firstPage.totalSinFiltro).toBe(3)
    expect(pageOne.data.map((animal) => animal.id)).not.toContain(`${fixture}-animal-other`)
    expect(new Set([...pageOne.data, ...pageTwo.data].map((animal) => animal.id)).size).toBe(3)
  })

  it("uses greatest weight id on a latest-date tie and preserves null origen fallback", async () => {
    const readModel = new DrizzleAnimalListadoReadModel(db)
    const result = await readModel.listar(request())
    const alpha = result.data.find((animal) => animal.id === `${fixture}-animal-1`)
    const bravo = result.data.find((animal) => animal.id === `${fixture}-animal-2`)

    expect(alpha?.pesoUltimo).toEqual({ pesoKg: 425, fecha: "2026-01-01" })
    expect(alpha?.origen).toEqual({ id: "9", label: "Desconocido (9)" })
    expect(bravo?.origen).toBeNull()
  })

  it("executes a fixed bounded statement set for pages with multiple rows", async () => {
    const readModel = new DrizzleAnimalListadoReadModel(db)
    const result = await readModel.listar(request({ pageSize: 50 }))

    expect(result.data).toHaveLength(3)
    expect(readModel.lastStatementCount).toBeLessThanOrEqual(6)
  })
})
