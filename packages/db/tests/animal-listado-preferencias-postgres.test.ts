/**
 * #110 PR1 — Integration tests for DrizzleAnimalListadoPreferenciasRepository.
 *
 * Requires a running Postgres instance (DATABASE_URL). Covers:
 * - PE-001–003: authorized retrieval and storage
 * - Cross-scope denial (no membership → ForbiddenError)
 * - Last-write-wins upsert
 * - Default-on-miss (empty table → 29/25 defaults via empty cols + page_size 25)
 * - Failed save leaves prior row unchanged (constraint violation path)
 */
import { randomUUID } from "node:crypto"
import { sql } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
  AnimalListadoForbiddenError,
  DrizzleAnimalListadoPreferenciasRepository,
} from "../src/animal-infrastructure.js"
import { createClient } from "../src/client.js"

const databaseUrl = "postgresql://postgres:postgres@localhost:5432/ganaweb"
const db = createClient(process.env.DATABASE_URL ?? databaseUrl)

const fixture = `pref-${randomUUID().slice(0, 8)}`
const fincaA = `${fixture}-finca-a`
const fincaB = `${fixture}-finca-b`
const authorizedUser = `${fixture}-authorized`
const outsideUser = `${fixture}-outside`
const role = `${fixture}-role`

async function execute(statement: ReturnType<typeof sql>) {
  return db.execute(statement)
}

beforeAll(async () => {
  await execute(sql`
    INSERT INTO fincas (id, codigo, nombre)
    VALUES (${fincaA}, ${`${fixture}-A`}, 'Finca A'), (${fincaB}, ${`${fixture}-B`}, 'Finca B')
  `)
  await execute(sql`
    INSERT INTO usuarios (id, nombre, email, activo)
    VALUES
      (${authorizedUser}, 'Authorized', ${`${fixture}-authorized@example.test`}, 1),
      (${outsideUser}, 'Outside', ${`${fixture}-outside@example.test`}, 1)
  `)
  // Membership: authorizedUser → fincaA only.
  await execute(sql`
    INSERT INTO usuarios_fincas (id, usuario_id, finca_id, activo)
    VALUES (${`${fixture}-membership`}, ${authorizedUser}, ${fincaA}, 1)
  `)
  await execute(
    sql`INSERT INTO usuarios_roles (id, nombre, activo) VALUES (${role}, 'Animal reader', 1)`,
  )
  // Ensure the (animales:ver) permission exists. On a clean database (migrations only)
  // this inserts the fixture row; on a seeded database the natural key already exists, so
  // ON CONFLICT on uq_usuarios_permisos (modulo, accion) avoids a duplicate-key error.
  await execute(sql`
    INSERT INTO usuarios_permisos (id, modulo, accion, nombre, activo)
    VALUES (${`${fixture}-perm`}, 'animales', 'ver', 'Ver animales', 1)
    ON CONFLICT (modulo, accion) DO NOTHING
  `)
  // Link the role to whichever row owns (animales:ver): the fixture row on a clean
  // database, the canonical seed row on a seeded one. Mirrors animal-listado-postgres.test.ts.
  await execute(sql`
    INSERT INTO roles_permisos (id, rol_id, permiso_id, activo)
    SELECT ${`${fixture}-rp`}, ${role}, id, 1
    FROM usuarios_permisos
    WHERE modulo = 'animales' AND accion = 'ver'
  `)
  await execute(sql`
    INSERT INTO usuarios_roles_asignacion (id, usuario_id, rol_id, finca_id, activo)
    VALUES (${`${fixture}-assignment`}, ${authorizedUser}, ${role}, ${fincaA}, 1)
  `)
})

afterAll(async () => {
  await execute(sql`DELETE FROM animal_listado_preferencias WHERE usuario_id = ${authorizedUser}`)
  await execute(sql`DELETE FROM usuarios_roles_asignacion WHERE id = ${`${fixture}-assignment`}`)
  await execute(sql`DELETE FROM roles_permisos WHERE id = ${`${fixture}-rp`}`)
  // Removes the fixture permission on a clean database; no-op on a seeded one (the
  // canonical row owns the natural key and ${fixture}-perm was never inserted).
  await execute(sql`DELETE FROM usuarios_permisos WHERE id = ${`${fixture}-perm`}`)
  await execute(sql`DELETE FROM usuarios_roles WHERE id = ${role}`)
  await execute(sql`DELETE FROM usuarios_fincas WHERE id = ${`${fixture}-membership`}`)
  await execute(sql`DELETE FROM usuarios WHERE id IN (${authorizedUser}, ${outsideUser})`)
  await execute(sql`DELETE FROM fincas WHERE id IN (${fincaA}, ${fincaB})`)
})

describe("DrizzleAnimalListadoPreferenciasRepository", () => {
  it("PE-001: returns 29/25 defaults when no row exists (empty cols, page_size 25)", async () => {
    const repo = new DrizzleAnimalListadoPreferenciasRepository(db)
    const result = await repo.obtener({ usuarioId: authorizedUser, fincaId: fincaA })
    // No row yet → repository returns empty cols + page_size 25 (web layer normalizes to 29).
    expect(result.cols).toEqual([])
    expect(result.pageSize).toBe(25)
  })

  it("PE-002: authorized user can save and retrieve preferences", async () => {
    const repo = new DrizzleAnimalListadoPreferenciasRepository(db)
    await repo.guardar({
      usuarioId: authorizedUser,
      fincaId: fincaA,
      cols: ["codigo", "nombre", "raza"],
      pageSize: 50,
    })
    const result = await repo.obtener({ usuarioId: authorizedUser, fincaId: fincaA })
    expect(result.cols).toEqual(["codigo", "nombre", "raza"])
    expect(result.pageSize).toBe(50)
  })

  it("PE-003: user without membership is denied (ForbiddenError on obtener)", async () => {
    const repo = new DrizzleAnimalListadoPreferenciasRepository(db)
    await expect(repo.obtener({ usuarioId: outsideUser, fincaId: fincaA })).rejects.toThrow(
      AnimalListadoForbiddenError,
    )
  })

  it("PE-003: user without membership is denied (ForbiddenError on guardar)", async () => {
    const repo = new DrizzleAnimalListadoPreferenciasRepository(db)
    await expect(
      repo.guardar({
        usuarioId: outsideUser,
        fincaId: fincaA,
        cols: ["codigo"],
        pageSize: 25,
      }),
    ).rejects.toThrow(AnimalListadoForbiddenError)
  })

  it("cross-scope: authorized user for fincaA is denied for fincaB", async () => {
    const repo = new DrizzleAnimalListadoPreferenciasRepository(db)
    await expect(repo.obtener({ usuarioId: authorizedUser, fincaId: fincaB })).rejects.toThrow(
      AnimalListadoForbiddenError,
    )
  })

  it("LWW upsert: later save overwrites earlier save for the same scope", async () => {
    const repo = new DrizzleAnimalListadoPreferenciasRepository(db)
    await repo.guardar({
      usuarioId: authorizedUser,
      fincaId: fincaA,
      cols: ["codigo", "nombre"],
      pageSize: 25,
    })
    await repo.guardar({
      usuarioId: authorizedUser,
      fincaId: fincaA,
      cols: ["codigo", "nombre", "sexo", "raza"],
      pageSize: 100,
    })
    const result = await repo.obtener({ usuarioId: authorizedUser, fincaId: fincaA })
    expect(result.cols).toEqual(["codigo", "nombre", "sexo", "raza"])
    expect(result.pageSize).toBe(100)
  })

  it("failed save leaves prior row unchanged (constraint violation path)", async () => {
    const repo = new DrizzleAnimalListadoPreferenciasRepository(db)
    // Establish a known-good row.
    await repo.guardar({
      usuarioId: authorizedUser,
      fincaId: fincaA,
      cols: ["codigo", "nombre"],
      pageSize: 25,
    })
    // Force a DB error: page_size 99999 overflows smallint (max 32767).
    await expect(
      repo.guardar({
        usuarioId: authorizedUser,
        fincaId: fincaA,
        cols: ["codigo", "nombre", "raza"],
        // biome-ignore lint/suspicious/noExplicitAny: deliberate overflow to trigger DB error.
        pageSize: 99999 as any,
      }),
    ).rejects.toThrow()
    // Prior row must be unchanged.
    const result = await repo.obtener({ usuarioId: authorizedUser, fincaId: fincaA })
    expect(result.cols).toEqual(["codigo", "nombre"])
    expect(result.pageSize).toBe(25)
  })
})
