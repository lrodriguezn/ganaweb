/**
 * redesign-ficha-animal (slice 2, task 2.6) — integración Postgres del
 * modelo de lectura de la ficha enriquecida (`DrizzleAnimalFichaReadModel`).
 *
 * Patrón de `animal-listado-postgres.test.ts`: prefijo de fixture aleatorio,
 * semillas en beforeAll, limpieza en afterAll, skip en CI. Requiere
 * Postgres real (DATABASE_URL).
 */
import { randomUUID } from "node:crypto"
import { sql } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { DrizzleAnimalFichaReadModel } from "../src/animal-infrastructure.js"
import { createClient } from "../src/client.js"

const databaseUrl = "postgresql://postgres:postgres@localhost:5432/ganaweb"
const db = createClient(process.env.DATABASE_URL ?? databaseUrl)
const fixture = `af-${randomUUID().slice(0, 8)}`
const fincaA = `${fixture}-finca-a`
const fincaB = `${fixture}-finca-b`
const raza = `${fixture}-raza`
const color = `${fixture}-color`
const condicion = `${fixture}-condicion`
const potrero = `${fixture}-potrero`
const sector = `${fixture}-sector`
const lote = `${fixture}-lote`
const grupo = `${fixture}-grupo`
const animalFull = `${fixture}-animal-full`
const animalEmpty = `${fixture}-animal-empty`
const animalOther = `${fixture}-animal-other`
const registroAnulado = `${fixture}-registro-anulado`

async function execute(statement: ReturnType<typeof sql>) {
  return db.execute(statement)
}

beforeAll(async () => {
  await execute(sql`
    INSERT INTO fincas (id, codigo, nombre)
    VALUES (${fincaA}, ${`${fixture}-A`}, 'Finca A'), (${fincaB}, ${`${fixture}-B`}, 'Finca B')
  `)
  await execute(sql`
    INSERT INTO config_razas (id, nombre) VALUES (${raza}, 'Holstein')
  `)
  await execute(sql`
    INSERT INTO config_colores (id, nombre) VALUES (${color}, 'Blanco y negro')
  `)
  await execute(sql`
    INSERT INTO config_condiciones_corporales (id, nombre) VALUES (${condicion}, 'Ideal')
  `)
  await execute(sql`
    INSERT INTO potreros (id, finca_id, codigo, nombre) VALUES (${potrero}, ${fincaA}, 'PN-1', 'Potrero Norte')
  `)
  await execute(sql`
    INSERT INTO sectores (id, finca_id, codigo, nombre) VALUES (${sector}, ${fincaA}, 'SC-1', 'Sector Cría')
  `)
  await execute(sql`
    INSERT INTO lotes (id, finca_id, nombre) VALUES (${lote}, ${fincaA}, 'Lote A')
  `)
  await execute(sql`
    INSERT INTO grupos (id, finca_id, nombre) VALUES (${grupo}, ${fincaA}, 'Grupo Vientres')
  `)
  await execute(sql`
    INSERT INTO animales (id, finca_id, codigo, nombre, sexo_key, activo, raza_id, color_id, potrero_id, sector_id, lote_id, grupo_id)
    VALUES
      (${animalFull}, ${fincaA}, ${`${fixture}-F1`}, 'Lucera', 1, 1, ${raza}, ${color}, ${potrero}, ${sector}, ${lote}, ${grupo}),
      (${animalEmpty}, ${fincaA}, ${`${fixture}-F2`}, 'Sin Historia', 1, 1, NULL, NULL, NULL, NULL, NULL, NULL)
  `)
  await execute(sql`
    INSERT INTO animales (id, finca_id, codigo, nombre, sexo_key, activo)
    VALUES (${animalOther}, ${fincaB}, ${`${fixture}-F3`}, 'Otra Finca', 1, 1)
  `)
  await execute(sql`
    INSERT INTO registros_grupales (id, finca_id, tipo_evento, total_animales, anulado_en)
    VALUES (${registroAnulado}, ${fincaA}, 'pesaje', 1, now())
  `)
  await execute(sql`
    INSERT INTO pesos (id, animal_id, fecha, peso_kg)
    VALUES
      (${`${fixture}-peso-1`}, ${animalFull}, '2026-06-01', '380.00'),
      (${`${fixture}-peso-2`}, ${animalFull}, '2026-07-01', '410.00')
  `)
  // Anulled group weighing — must stay out of the projection.
  await execute(sql`
    INSERT INTO pesos (id, animal_id, fecha, peso_kg, registro_grupal_id)
    VALUES (${`${fixture}-peso-3`}, ${animalFull}, '2026-07-10', '430.00', ${registroAnulado})
  `)
  await execute(sql`
    INSERT INTO servicios (id, animal_id, fecha, tipo, efectivo)
    VALUES
      (${`${fixture}-servicio-1`}, ${animalFull}, '2025-05-01', 'inseminacion', 1),
      (${`${fixture}-servicio-2`}, ${animalFull}, '2026-06-20', 'inseminacion', NULL)
  `)
  await execute(sql`
    INSERT INTO palpaciones (id, animal_id, fecha, resultado, dias_gestacion)
    VALUES (${`${fixture}-palpacion-1`}, ${animalFull}, '2026-07-15', 'prenada', 45)
  `)
  await execute(sql`
    INSERT INTO partos (id, animal_id, fecha, tipo_parto)
    VALUES
      (${`${fixture}-parto-1`}, ${animalFull}, '2024-03-01', 'normal'),
      (${`${fixture}-parto-2`}, ${animalFull}, '2024-10-01', 'aborto'),
      (${`${fixture}-parto-3`}, ${animalFull}, '2025-03-01', 'normal')
  `)
  await execute(sql`
    INSERT INTO animales_condicion_corporal (id, animal_id, condicion_id, puntaje, fecha)
    VALUES
      (${`${fixture}-condicion-1`}, ${animalFull}, ${condicion}, '3.5', '2026-07-20'),
      (${`${fixture}-condicion-2`}, ${animalFull}, NULL, '3.0', '2026-05-10')
  `)
})

afterAll(async () => {
  await execute(sql`DELETE FROM animales_condicion_corporal WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM partos WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM palpaciones WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM servicios WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM pesos WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM animales WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM registros_grupales WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM potreros WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM sectores WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM lotes WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM grupos WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM config_condiciones_corporales WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM config_colores WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM config_razas WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM fincas WHERE id LIKE ${`${fixture}%`}`)
})

describe.skipIf(process.env.CI === "true")("DrizzleAnimalFichaReadModel (PostgreSQL)", () => {
  it("resolves names, latest weighings, reproductive sequence and condition for a full history", async () => {
    const readModel = new DrizzleAnimalFichaReadModel(db)

    const bruto = await readModel.obtener(animalFull, fincaA)

    expect(bruto).toEqual({
      raza: "Holstein",
      color: "Blanco y negro",
      potrero: "Potrero Norte",
      sector: "Sector Cría",
      lote: "Lote A",
      grupo: "Grupo Vientres",
      // Descending by fecha; the anulled group weighing (2026-07-10) is excluded.
      pesajes: [
        { fecha: "2026-07-01", pesoKg: 410 },
        { fecha: "2026-06-01", pesoKg: 380 },
      ],
      servicios: [
        { fecha: "2026-06-20", tipo: "inseminacion", efectivo: null },
        { fecha: "2025-05-01", tipo: "inseminacion", efectivo: true },
      ],
      palpaciones: [{ fecha: "2026-07-15", resultado: "prenada", diasGestacion: 45 }],
      partos: [
        { fecha: "2025-03-01", tipoParto: "normal" },
        { fecha: "2024-10-01", tipoParto: "aborto" },
        { fecha: "2024-03-01", tipoParto: "normal" },
      ],
      condicionCorporal: { valor: 3.5, etiqueta: "Ideal", fecha: "2026-07-20" },
    })
  })

  it("returns empty collections and null names for an animal without history", async () => {
    const readModel = new DrizzleAnimalFichaReadModel(db)

    const bruto = await readModel.obtener(animalEmpty, fincaA)

    expect(bruto).toEqual({
      raza: null,
      color: null,
      potrero: null,
      sector: null,
      lote: null,
      grupo: null,
      pesajes: [],
      servicios: [],
      palpaciones: [],
      partos: [],
      condicionCorporal: null,
    })
  })

  it("never crosses finca boundaries", async () => {
    const readModel = new DrizzleAnimalFichaReadModel(db)

    expect(await readModel.obtener(animalFull, fincaB)).toBeNull()
    expect(await readModel.obtener(animalOther, fincaA)).toBeNull()
    expect(await readModel.obtener(`${fixture}-inexistente`, fincaA)).toBeNull()
  })
})
