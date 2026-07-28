import { randomUUID } from "node:crypto"
import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
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
const accentSearchAnimal = `${fixture}-animal-accent-search`
const accentedParent = `${fixture}-animal-accent-parent`
const accentedFather = `${fixture}-animal-accent-father`
const literalAnimal = `${fixture}-animal-literal`
const unaccentedEquivalentAnimal = `${fixture}-animal-unaccented-equivalent`
const literalSearch = "LIT%_!-' OR 1=1 --"

function accentEquivalents(value: string) {
  return [value, value.toLocaleLowerCase(), value.normalize("NFD").replace(/\p{Diacritic}/gu, "")]
}

const qCases = [
  { value: "CÓDIGOÁÉÍÓÚÑ", expectedId: accentSearchAnimal },
  { value: "NÓMBREÁÉÍÓÚÑ", expectedId: accentSearchAnimal },
  { value: "ARETÉÁÉÍÓÚÑ", expectedId: accentSearchAnimal },
  { value: "RFÍDÁÉÍÓÚÑ", expectedId: accentSearchAnimal },
] as const

const containsCases = [
  { key: "codigo", value: "CÓDIGOÁÉÍÓÚÑ" },
  { key: "nombre", value: "NÓMBREÁÉÍÓÚÑ" },
  { key: "codigoMadre", value: "MADREÁÉÍÓÚÑ" },
  { key: "nombreMadre", value: "NOMBREMADREÁÉÍÓÚÑ" },
  { key: "codigoPadre", value: "PADREÁÉÍÓÚÑ" },
  { key: "nombrePadre", value: "NOMBREPADREÁÉÍÓÚÑ" },
  { key: "codigoArete", value: "ARETÉÁÉÍÓÚÑ" },
  { key: "codigoRfid", value: "RFÍDÁÉÍÓÚÑ" },
  { key: "comentarios", value: "COMENTÁRIOÁÉÍÓÚÑ" },
  { key: "codigoQr", value: "QRÁÉÍÓÚÑ" },
] as const

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
    INSERT INTO animales (id, finca_id, codigo, nombre, sexo_key, tipo_ingreso_id, activo, fecha_nacimiento)
    VALUES
      (${`${fixture}-animal-1`}, ${fincaA}, 'AA-001', 'Alpha', 1, 9, 1, 1577836800),
      (${`${fixture}-animal-2`}, ${fincaA}, 'AA-002', 'Bravo', 0, NULL, 1, 1615507200),
      (${`${fixture}-animal-3`}, ${fincaA}, 'AA-003', 'Charlie', 1, 1, 1, 1735689600),
       (${`${fixture}-animal-other`}, ${fincaB}, 'AA-001', 'Other finca', 1, 1, 1, NULL)
  `)
  await execute(sql`
    INSERT INTO animales (id, finca_id, codigo, nombre, sexo_key, activo)
    VALUES
      (${accentedParent}, ${fincaA}, 'PARENT-Á', 'NOMBREMADREÁÉÍÓÚÑ', 1, 1),
      (${accentedFather}, ${fincaA}, 'FATHER-Á', 'NOMBREPADREÁÉÍÓÚÑ', 1, 1),
      (${accentSearchAnimal}, ${fincaA}, 'CÓDIGOÁÉÍÓÚÑ', 'NÓMBREÁÉÍÓÚÑ', 1, 1),
      (${unaccentedEquivalentAnimal}, ${fincaA}, 'CODIGOINVERSOAEIOUN', 'NOMBREINVERSOAEIOUN', 1, 1),
      (${literalAnimal}, ${fincaA}, ${literalSearch}, 'Literal token', 1, 1)
  `)
  await execute(sql`
    UPDATE animales
    SET
      codigo_madre = 'MADREÁÉÍÓÚÑ',
      madre_id = ${accentedParent},
      codigo_padre = 'PADREÁÉÍÓÚÑ',
      padre_id = ${accentedFather},
      codigo_arete = 'ARETÉÁÉÍÓÚÑ',
      codigo_rfid = 'RFÍDÁÉÍÓÚÑ',
      comentarios = 'COMENTÁRIOÁÉÍÓÚÑ',
      codigo_qr = 'QRÁÉÍÓÚÑ'
    WHERE id = ${accentSearchAnimal}
  `)
  await execute(sql`
    INSERT INTO animales (id, finca_id, codigo, nombre, sexo_key, activo, es_de_monta)
    VALUES
      (${`${fixture}-animal-bool`}, ${fincaA}, 'BOOL-001', 'BoolTest', 2, 1, 1)
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

    expect(firstPage.data.map((animal) => animal.id)).toEqual(
      expect.arrayContaining([`${fixture}-animal-1`, `${fixture}-animal-3`]),
    )
    expect(firstPage.total).toBe(7)
    expect(firstPage.totalSinFiltro).toBe(9)
    expect(pageOne.data.map((animal) => animal.id)).not.toContain(`${fixture}-animal-other`)
    expect(new Set([...pageOne.data, ...pageTwo.data].map((animal) => animal.id)).size).toBe(9)
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
    const statements: string[] = []
    const client = postgres(process.env.DATABASE_URL ?? databaseUrl, {
      max: 1,
      debug: (_connection, query) => statements.push(query),
    })
    const readModel = new DrizzleAnimalListadoReadModel(
      drizzle(client) as unknown as ReturnType<typeof createClient>,
    )
    try {
      await client`SELECT 1`
      statements.length = 0
      const result = await readModel.listar(request({ pageSize: 50 }))

      expect(result.data).toHaveLength(9)
      expect(statements).toHaveLength(3)
      expect(statements[0]).toMatch(/^with "?authz"? as/iu)
      expect(statements[0]).toMatch(/select count\(\*\).*authorized/isu)
      expect(statements[1]).toMatch(/^with "?pagina"? as/iu)
      expect(statements[2]).toMatch(/^select count\(\*\)/iu)

      statements.length = 0
      await expect(
        readModel.listar(request({ usuarioId: unprivilegedUser })),
      ).rejects.toBeInstanceOf(AnimalListadoForbiddenError)
      expect(statements).toHaveLength(1)
      expect(statements[0]).not.toMatch(/with "?pagina"? as/iu)
    } finally {
      await client.end({ timeout: 5 })
    }
  })

  it.each(qCases)(
    "matches q accent, case, and unaccented equivalents for $value",
    async ({ value, expectedId }) => {
      const readModel = new DrizzleAnimalListadoReadModel(db)

      for (const equivalent of accentEquivalents(value)) {
        const result = await readModel.listar(request({ q: equivalent }))
        expect(result.data.map((animal) => animal.id)).toContain(expectedId)
      }
    },
  )

  it.each(containsCases)(
    "matches contains $key across accent, case, and unaccented equivalents",
    async ({ key, value }) => {
      const readModel = new DrizzleAnimalListadoReadModel(db)

      for (const equivalent of accentEquivalents(value)) {
        const result = await readModel.listar(
          request({ filters: [{ key, grammar: "contains", value: equivalent }] }),
        )
        expect(result.data.map((animal) => animal.id)).toEqual([accentSearchAnimal])
      }
    },
  )

  it("sorts by a parent label without moving the parent join into the page CTE", async () => {
    const readModel = new DrizzleAnimalListadoReadModel(db)
    const result = await readModel.listar(request({ sort: "nombreMadre:asc" }))

    expect(
      result.data.findIndex((animal) => animal.id === accentSearchAnimal),
    ).toBeGreaterThanOrEqual(0)
    expect(result.data.find((animal) => animal.id === accentSearchAnimal)?.nombreMadre).toBe(
      "NOMBREMADREÁÉÍÓÚÑ",
    )
    expect(readModel.lastStatementCount).toBe(3)
  })

  it("matches accented q and contains queries against an unaccented stored counterpart", async () => {
    const readModel = new DrizzleAnimalListadoReadModel(db)
    const qResult = await readModel.listar(request({ q: "NÓMBRÉÍNVÉRSÓÁÉÍÓÚÑ" }))
    const containsResult = await readModel.listar(
      request({ filters: [{ key: "codigo", grammar: "contains", value: "CÓDÍGÓÍNVÉRSÓÁÉÍÓÚÑ" }] }),
    )

    expect(qResult.data.map((animal) => animal.id)).toEqual([unaccentedEquivalentAnimal])
    expect(containsResult.data.map((animal) => animal.id)).toEqual([unaccentedEquivalentAnimal])
  })

  it("treats wildcard, escape, and SQL-like search input as bound literals", async () => {
    const readModel = new DrizzleAnimalListadoReadModel(db)
    const qResult = await readModel.listar(request({ q: literalSearch }))
    const containsResult = await readModel.listar(
      request({ filters: [{ key: "codigo", grammar: "contains", value: literalSearch }] }),
    )

    expect(qResult.data.map((animal) => animal.id)).toEqual([literalAnimal])
    expect(containsResult.data.map((animal) => animal.id)).toEqual([literalAnimal])
  })

  it("maps epoch columns to ISO fechaNacimiento and edadAnios", async () => {
    const readModel = new DrizzleAnimalListadoReadModel(db)
    const result = await readModel.listar(request())
    const alpha = result.data.find((animal) => animal.id === `${fixture}-animal-1`)
    const bravo = result.data.find((animal) => animal.id === `${fixture}-animal-2`)
    const charlie = result.data.find((animal) => animal.id === `${fixture}-animal-3`)
    // accentSearchAnimal is on fincaA with no fecha_nacimiento (NULL)
    const nullDateAnimal = result.data.find((animal) => animal.id === accentSearchAnimal)

    // Epoch seconds map to ISO date
    expect(alpha?.fechaNacimiento).toBe("2020-01-01")
    expect(bravo?.fechaNacimiento).toBe("2021-03-12")
    expect(charlie?.fechaNacimiento).toBe("2025-01-01")

    // Null epoch maps to null
    expect(nullDateAnimal).toBeDefined()
    expect(nullDateAnimal?.fechaNacimiento).toBeNull()
    expect(nullDateAnimal?.edadAnios).toBeNull()

    // edadAnios is computed from fechaNacimiento (positive number for past dates)
    expect(alpha?.edadAnios).toBeGreaterThan(0)
    expect(typeof alpha?.edadAnios).toBe("number")
  })

  it("bool filter on esDeMonta returns matching rows without 500", async () => {
    const readModel = new DrizzleAnimalListadoReadModel(db)
    const result = await readModel.listar(
      request({ filters: [{ key: "esDeMonta", grammar: "bool", value: "true" }] }),
    )

    // No 500 crash; matching row returned
    expect(result.data.map((animal) => animal.id)).toContain(`${fixture}-animal-bool`)
    expect(result.data.every((animal) => animal.esDeMonta === true)).toBe(true)
    expect(result.total).toBeGreaterThanOrEqual(1)
  })

  it("drange filter on fechaNacimiento returns matching rows", async () => {
    const readModel = new DrizzleAnimalListadoReadModel(db)
    const result = await readModel.listar(
      request({
        filters: [{ key: "fechaNacimiento", grammar: "drange", value: "2021-03-12,2021-03-20" }],
      }),
    )

    // Only animal-2 (epoch 1615507200 = 2021-03-12) should match
    expect(result.data.map((animal) => animal.id)).toEqual([`${fixture}-animal-2`])
    expect(result.data.map((animal) => animal.id)).not.toContain(`${fixture}-animal-1`)
    expect(result.data.map((animal) => animal.id)).not.toContain(`${fixture}-animal-3`)
  })

  it("keeps normalized filters finca-scoped across real stable tied pages", async () => {
    const readModel = new DrizzleAnimalListadoReadModel(db)
    const sharedName = "EmpáteÁ"
    const expectedIds = Array.from(
      { length: 26 },
      (_, index) => `${fixture}-animal-tie-${String(index).padStart(2, "0")}`,
    )
    for (const [index, id] of expectedIds.entries()) {
      await execute(sql`
        INSERT INTO animales (id, finca_id, codigo, nombre, sexo_key, activo)
        VALUES (${id}, ${fincaA}, ${`TIE-${index}`}, ${sharedName}, 1, 1)
      `)
    }
    await execute(sql`
      INSERT INTO animales (id, finca_id, codigo, nombre, sexo_key, activo)
      VALUES (${`${fixture}-animal-tie-other`}, ${fincaB}, 'TIE-OTHER', ${sharedName}, 1, 1)
    `)
    const filter = { q: "empatea", sort: "nombre:asc" as const, pageSize: 25 as const }

    const first = await readModel.listar(request(filter))
    const repeatedFirst = await readModel.listar(request(filter))
    const second = await readModel.listar(request({ ...filter, page: 2 }))
    const repeatedSecond = await readModel.listar(request({ ...filter, page: 2 }))

    expect(first.data.map((animal) => animal.id)).toEqual(expectedIds.slice(0, 25))
    expect(second.data.map((animal) => animal.id)).toEqual(expectedIds.slice(25))
    expect(repeatedFirst.data.map((animal) => animal.id)).toEqual(
      first.data.map((animal) => animal.id),
    )
    expect(repeatedSecond.data.map((animal) => animal.id)).toEqual(
      second.data.map((animal) => animal.id),
    )
    expect(new Set([...first.data, ...second.data].map((animal) => animal.id))).toEqual(
      new Set(expectedIds),
    )
    expect(first.total).toBe(26)
    expect(second.total).toBe(26)
    expect(first.totalSinFiltro).toBe(35)
    expect(second.totalSinFiltro).toBe(35)
    expect(first.data.map((animal) => animal.id)).not.toContain(`${fixture}-animal-tie-other`)
    expect(readModel.lastStatementCount).toBeLessThanOrEqual(3)
  })
})
