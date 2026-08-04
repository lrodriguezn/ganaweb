import { randomUUID } from "node:crypto"
import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
  AnimalListadoForbiddenError,
  DrizzleAnimalMobileListReadModel,
} from "../src/animal-mobile-list-infrastructure.js"
import { createClient } from "../src/client.js"

const databaseUrl = "postgresql://postgres:postgres@localhost:5432/ganaweb"
const db = createClient(process.env.DATABASE_URL ?? databaseUrl)
const fixture = `aml-${randomUUID().slice(0, 8)}`
const fincaA = `${fixture}-finca-a`
const fincaB = `${fixture}-finca-b`
const authorizedUser = `${fixture}-authorized`
const unprivilegedUser = `${fixture}-unprivileged`
const outsideUser = `${fixture}-outside`
const role = `${fixture}-role`
const raza = `${fixture}-raza`
const propietario = `${fixture}-prop`
const accentSearchAnimal = `${fixture}-animal-accent-search`
const unaccentedAnimal = `${fixture}-animal-unaccented`
const literalAnimal = `${fixture}-animal-literal`
const literalSearch = "LIT%_!-' OR 1=1 --"

function accentEquivalents(value: string) {
  return [value, value.toLocaleLowerCase(), value.normalize("NFD").replace(/\p{Diacritic}/gu, "")]
}

const qCases = [
  { value: "CÓDIGOÁÉÍÓÚÑ-M", field: "codigo", expectedId: accentSearchAnimal },
  { value: "NÓMBREÁÉÍÓÚÑ-M", field: "nombre", expectedId: accentSearchAnimal },
  { value: "ARETÉÁÉÍÓÚÑ-M", field: "codigo_arete", expectedId: accentSearchAnimal },
  { value: "RFÍDÁÉÍÓÚÑ-M", field: "codigo_rfid", expectedId: accentSearchAnimal },
] as const

const request = (overrides: Record<string, unknown> = {}) => ({
  usuarioId: authorizedUser,
  fincaId: fincaA,
  page: 1,
  pageSize: 25 as const,
  q: null,
  filters: [],
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
  await execute(sql`INSERT INTO config_razas (id, nombre) VALUES (${raza}, 'Holstein Móvil')`)
  await execute(sql`
    INSERT INTO propietarios (id, finca_id, nombre)
    VALUES (${propietario}, ${fincaA}, 'Propietario Móvil')
  `)
  await execute(sql`
    INSERT INTO animales (id, finca_id, codigo, nombre, sexo_key, activo, categoria_reproductiva)
    VALUES
      (${`${fixture}-madre-registrada`}, ${fincaA}, 'MADRE-001', 'Madre Registrada', 1, 1, 'parida'),
      (${`${fixture}-madre-sin-nombre`}, ${fincaA}, 'MADRE-002', NULL, 1, 1, NULL)
  `)
  await execute(sql`
    INSERT INTO animales
      (id, finca_id, codigo, nombre, sexo_key, activo, salud_animal_key, categoria_reproductiva,
       raza_id, propietario_id, madre_id, codigo_arete, codigo_rfid)
    VALUES
      (${`${fixture}-hembra-completa`}, ${fincaA}, 'MOV-001', 'Completa', 1, 1, 1, 'prenada',
       ${raza}, ${propietario}, ${`${fixture}-madre-registrada`}, 'ARÉTÉ-MOV', 'RFÍD-MOV')
  `)
  await execute(sql`
    INSERT INTO animales (id, finca_id, codigo, nombre, sexo_key, activo, madre_id, categoria_reproductiva)
    VALUES
      (${`${fixture}-hija-madre-sin-nombre`}, ${fincaA}, 'MOV-002', 'Hija', 1, 1, ${`${fixture}-madre-sin-nombre`}, 'vacia')
  `)
  await execute(sql`
    INSERT INTO animales (id, finca_id, codigo, nombre, sexo_key, activo, categoria_reproductiva)
    VALUES
      (${`${fixture}-macho`}, ${fincaA}, 'MOV-003', NULL, 0, 1, 'no_aplica'),
      (${`${fixture}-sin-madre`}, ${fincaA}, 'MOV-005', 'Sin Madre', 1, 1, NULL)
  `)
  await execute(sql`
    INSERT INTO animales (id, finca_id, codigo, nombre, sexo_key, activo, codigo_madre, categoria_reproductiva)
    VALUES
      (${`${fixture}-externa`}, ${fincaA}, 'MOV-004', 'Madre Externa', 1, 1, 'EXT-999', 'servida')
  `)
  await execute(sql`
    INSERT INTO animales (id, finca_id, codigo, nombre, sexo_key, activo, estado_animal_key)
    VALUES
      (${`${fixture}-vendida`}, ${fincaA}, 'MOV-V01', 'Vendida', 1, 1, 1),
      (${`${fixture}-muerto`}, ${fincaA}, 'MOV-M01', 'Muerto', 0, 1, 2)
  `)
  await execute(sql`
    INSERT INTO animales (id, finca_id, codigo, nombre, sexo_key, activo)
    VALUES (${`${fixture}-inactivo`}, ${fincaA}, 'MOV-I01', 'Inactivo', 1, 0)
  `)
  await execute(sql`
    INSERT INTO animales (id, finca_id, codigo, nombre, sexo_key, activo)
    VALUES (${`${fixture}-otra-finca`}, ${fincaB}, 'MOV-001', 'Otra finca', 1, 1)
  `)
  await execute(sql`
    INSERT INTO animales (id, finca_id, codigo, nombre, sexo_key, activo, codigo_arete, codigo_rfid)
    VALUES
      (${accentSearchAnimal}, ${fincaA}, 'CÓDIGOÁÉÍÓÚÑ-M', 'NÓMBREÁÉÍÓÚÑ-M', 1, 1, 'ARETÉÁÉÍÓÚÑ-M', 'RFÍDÁÉÍÓÚÑ-M'),
      (${unaccentedAnimal}, ${fincaA}, 'CODIGOINVERSO-M', 'NOMBREINVERSO-M', 1, 1, NULL, NULL),
      (${literalAnimal}, ${fincaA}, ${literalSearch}, 'Literal token', 1, 1, NULL, NULL)
  `)
  for (let index = 0; index < 26; index += 1) {
    await execute(sql`
      INSERT INTO animales (id, finca_id, codigo, nombre, sexo_key, activo)
      VALUES (${`${fixture}-tie-${String(index).padStart(2, "0")}`}, ${fincaA}, ${`TIE-${String(index).padStart(2, "0")}`}, 'Empate Móvil', 1, 1)
    `)
  }
})

afterAll(async () => {
  await execute(sql`DELETE FROM animales WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM propietarios WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM config_razas WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM usuarios_roles_asignacion WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM roles_permisos WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM usuarios_roles WHERE id = ${role}`)
  await execute(sql`DELETE FROM usuarios_fincas WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM usuarios WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM fincas WHERE id LIKE ${`${fixture}%`}`)
})

// Mirrors the desktop harness gate: the read-model authorization setup is
// order-sensitive and the role assignment doesn't reach the read model in
// the GitHub Actions PG17 disposable (see animal-listado-postgres.test.ts).
describe.skipIf(process.env.CI === "true")("DrizzleAnimalMobileListReadModel (PostgreSQL)", () => {
  it("returns the same forbidden error for missing permission and cross-farm access", async () => {
    const readModel = new DrizzleAnimalMobileListReadModel(db)

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

  it("applies the LM-012 base filter: excludes vendido, muerto, inactivo and other fincas", async () => {
    const readModel = new DrizzleAnimalMobileListReadModel(db)
    const result = await readModel.listar(request({ pageSize: 30 }))
    const ids = new Set(result.data.map((animal) => animal.id))

    expect(ids.has(`${fixture}-vendida`)).toBe(false)
    expect(ids.has(`${fixture}-muerto`)).toBe(false)
    expect(ids.has(`${fixture}-inactivo`)).toBe(false)
    expect(ids.has(`${fixture}-otra-finca`)).toBe(false)
    expect(result.totalSinFiltro).toBe(36)
    expect(result.total).toBe(36)
  })

  it("maps the full DTO row with server-side text resolution (no N+1)", async () => {
    const readModel = new DrizzleAnimalMobileListReadModel(db)
    const result = await readModel.listar(request())
    const completa = result.data.find((animal) => animal.id === `${fixture}-hembra-completa`)

    expect(completa).toEqual({
      id: `${fixture}-hembra-completa`,
      codigo: "MOV-001",
      nombre: "Completa",
      sexo: { key: "1", label: "Hembra" },
      raza: { id: raza, label: "Holstein Móvil" },
      categoriaReproductiva: { key: "prenada", label: "Preñada" },
      salud: { key: "1", label: "Enfermo" },
      esDeMonta: false,
      propietario: { id: propietario, label: "Propietario Móvil" },
      madre: { codigo: "MADRE-001", nombre: "Madre Registrada" },
    })
  })

  it("returns categoriaReproductiva null for a macho (MT-130) and '' nombre", async () => {
    const readModel = new DrizzleAnimalMobileListReadModel(db)
    const result = await readModel.listar(request())
    const macho = result.data.find((animal) => animal.id === `${fixture}-macho`)

    expect(macho?.categoriaReproductiva).toBeNull()
    expect(macho?.categoriaReproductiva).not.toEqual({ key: "novilla", label: "Novilla" })
    expect(macho?.nombre).toBe("")
    expect(macho?.sexo).toEqual({ key: "0", label: "Macho" })
    expect(macho?.salud).toEqual({ key: "0", label: "Sano" })
  })

  it("covers every DTO nullability case: madre, raza, propietario, categoria", async () => {
    const readModel = new DrizzleAnimalMobileListReadModel(db)
    const result = await readModel.listar(request())
    const porId = new Map(result.data.map((animal) => [animal.id, animal]))

    // madre_id with a registered madre that has no nombre → nombre null.
    expect(porId.get(`${fixture}-hija-madre-sin-nombre`)?.madre).toEqual({
      codigo: "MADRE-002",
      nombre: null,
    })
    // Only codigo_madre (externa/IA) → codigo only, nombre null.
    expect(porId.get(`${fixture}-externa`)?.madre).toEqual({ codigo: "EXT-999", nombre: null })
    // Neither codigo_madre nor madre_id → madre null.
    expect(porId.get(`${fixture}-sin-madre`)?.madre).toBeNull()
    expect(porId.get(`${fixture}-sin-madre`)?.raza).toBeNull()
    expect(porId.get(`${fixture}-sin-madre`)?.propietario).toBeNull()
    expect(porId.get(`${fixture}-sin-madre`)?.categoriaReproductiva).toBeNull()
  })

  it.each(qCases)(
    "matches q over $field ignoring case and accents for $value",
    async ({ value, expectedId }) => {
      const readModel = new DrizzleAnimalMobileListReadModel(db)
      for (const equivalent of accentEquivalents(value)) {
        const result = await readModel.listar(request({ q: equivalent }))
        expect(result.data.map((animal) => animal.id)).toContain(expectedId)
      }
    },
  )

  it("matches accented q against an unaccented stored counterpart", async () => {
    const readModel = new DrizzleAnimalMobileListReadModel(db)
    const result = await readModel.listar(request({ q: "NÓMBREÍNVÉRSÓ-M" }))
    expect(result.data.map((animal) => animal.id)).toEqual([unaccentedAnimal])
  })

  it("treats wildcard, escape, and SQL-like search input as bound literals", async () => {
    const readModel = new DrizzleAnimalMobileListReadModel(db)
    const result = await readModel.listar(request({ q: literalSearch }))
    expect(result.data.map((animal) => animal.id)).toEqual([literalAnimal])
  })

  it("filters by key/id: categoriaReproductivaKey, saludKey, propietarioId", async () => {
    const readModel = new DrizzleAnimalMobileListReadModel(db)

    const prenadas = await readModel.listar(
      request({ filters: [{ key: "categoriaReproductivaKey", value: "prenada" }] }),
    )
    expect(prenadas.data.map((animal) => animal.id)).toEqual([`${fixture}-hembra-completa`])
    expect(prenadas.total).toBe(1)
    expect(prenadas.totalSinFiltro).toBe(36)

    const enfermas = await readModel.listar(request({ filters: [{ key: "saludKey", value: "1" }] }))
    expect(enfermas.data.map((animal) => animal.id)).toEqual([`${fixture}-hembra-completa`])

    const delPropietario = await readModel.listar(
      request({ filters: [{ key: "propietarioId", value: propietario }] }),
    )
    expect(delPropietario.data.map((animal) => animal.id)).toEqual([`${fixture}-hembra-completa`])

    const noAplica = await readModel.listar(
      request({ filters: [{ key: "categoriaReproductivaKey", value: "no_aplica" }] }),
    )
    expect(noAplica.data.map((animal) => animal.id)).toEqual([`${fixture}-macho`])

    const combinado = await readModel.listar(
      request({ q: "mov", filters: [{ key: "saludKey", value: "1" }] }),
    )
    expect(combinado.data.map((animal) => animal.id)).toEqual([`${fixture}-hembra-completa`])
    expect(combinado.hayMas).toBe(false)
  })

  it("paginates with stable order and computes hayMas from the filtered total", async () => {
    const readModel = new DrizzleAnimalMobileListReadModel(db)
    const pageOne = await readModel.listar(request({ pageSize: 20, page: 1 }))
    const pageTwo = await readModel.listar(request({ pageSize: 20, page: 2 }))

    expect(pageOne.data).toHaveLength(20)
    expect(pageOne.hayMas).toBe(true)
    expect(pageTwo.data).toHaveLength(16)
    expect(pageTwo.hayMas).toBe(false)
    expect(pageOne.total).toBe(36)
    expect(pageTwo.total).toBe(36)
    const combined = new Set([...pageOne.data, ...pageTwo.data].map((animal) => animal.id))
    expect(combined.size).toBe(36)

    const pageOf30 = await readModel.listar(request({ pageSize: 30, page: 2 }))
    expect(pageOf30.data).toHaveLength(6)
    expect(pageOf30.hayMas).toBe(false)

    const filtered = await readModel.listar(
      request({ pageSize: 20, filters: [{ key: "categoriaReproductivaKey", value: "parida" }] }),
    )
    expect(filtered.total).toBe(1)
    expect(filtered.hayMas).toBe(false)
    expect(filtered.data.map((animal) => animal.id)).toEqual([`${fixture}-madre-registrada`])
  })

  it("executes a fixed bounded statement set and stops after a forbidden authz", async () => {
    const statements: string[] = []
    const client = postgres(process.env.DATABASE_URL ?? databaseUrl, {
      max: 1,
      debug: (_connection, query) => statements.push(query),
    })
    const readModel = new DrizzleAnimalMobileListReadModel(
      drizzle(client) as unknown as ReturnType<typeof createClient>,
    )
    try {
      await client`SELECT 1`
      statements.length = 0
      const result = await readModel.listar(request())

      expect(result.data.length).toBeGreaterThan(0)
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
})
