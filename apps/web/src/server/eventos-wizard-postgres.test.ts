import { sql } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { SesionAutorizada } from "@ganaweb/aplicacion"
import { type DbClient, createClient } from "@ganaweb/db/client"
import { persistirEventosInternos } from "@ganaweb/db/evento-write-infrastructure"

import {
  type EventoWizardWebInput,
  createEventoWizardActionHarness,
  validarReferenciasCatalogo,
} from "./eventos-wizard.server.js"

const run = process.env.DATABASE_URL ? describe : describe.skip

run("EventoWizard boundary against real PostgreSQL", () => {
  const suffix = crypto.randomUUID().slice(0, 8)
  const fincaId = `i288-finca-${suffix}`
  const fincaAjenaId = `i288-ajena-${suffix}`
  const usuarioId = `i288-user-${suffix}`
  const loteId = `i288-lote-${suffix}`
  const animalUnoId = `i288-animal-1-${suffix}`
  const animalDosId = `i288-animal-2-${suffix}`
  const missingAnimalId = `i288-missing-${suffix}`
  const prefix = `i288-${suffix}`
  const fechaExito = "2098-01-02"
  const fechaRollback = "2098-02-03"
  const reloj = () => new Date("2098-01-02T04:05:06Z")

  let db: DbClient

  const session: SesionAutorizada = {
    usuarioId,
    nombre: "EventoWizard PostgreSQL",
    email: `${usuarioId}@ganaweb.test`,
    fincaActivaId: fincaId,
    fincaActivaNombre: "Finca de integración #288",
    rol: "Operario",
    permisos: [
      { modulo: "eventos_productivos", accion: "crear" },
      { modulo: "movimientos", accion: "crear" },
    ],
    fincas: [],
  }

  function harness() {
    return createEventoWizardActionHarness({
      getSession: async () => session,
      reloj,
      validarReferencias: validarReferenciasCatalogo,
      persistirLote: (commands, contexto) => persistirEventosInternos(db, commands, contexto),
    })
  }

  async function count(sqlQuery: ReturnType<typeof sql>) {
    const rows = (await db.execute(sqlQuery)) as unknown as readonly [{ count: string }]
    return Number(rows[0]?.count ?? 0)
  }

  async function expectPgCode(operation: Promise<unknown>, code: string) {
    try {
      await operation
      throw new Error(`Expected PostgreSQL error ${code}`)
    } catch (error) {
      const candidate = error as { code?: string; cause?: { code?: string } }
      expect(candidate.code ?? candidate.cause?.code).toBe(code)
    }
  }

  const groupedPesaje = (animalIds: readonly string[], fecha: string): EventoWizardWebInput => ({
    fincaId,
    tipo: "pesaje",
    alcance: {
      tipo: "grupal",
      origen: "manual",
      animalIdsEfectivos: animalIds,
    },
    datos: { fecha, pesoKg: 410, tipoPeso: "control" },
  })

  beforeAll(async () => {
    db = createClient(process.env.DATABASE_URL)
    await db.execute(sql`INSERT INTO fincas (id, codigo, nombre) VALUES
      (${fincaId}, ${prefix}, 'Finca #288'),
      (${fincaAjenaId}, ${`${prefix}-other`}, 'Finca ajena #288')`)
    await db.execute(sql`INSERT INTO usuarios (id, nombre, email)
      VALUES (${usuarioId}, 'Usuario #288', ${`${usuarioId}@ganaweb.test`})`)
    await db.execute(sql`INSERT INTO lotes (id, finca_id, nombre)
      VALUES (${loteId}, ${fincaId}, 'Lote #288')`)
    await db.execute(sql`INSERT INTO animales (id, finca_id, codigo, nombre)
      VALUES
        (${animalUnoId}, ${fincaId}, ${`${prefix}-A1`}, 'Animal 1'),
        (${animalDosId}, ${fincaId}, ${`${prefix}-A2`}, 'Animal 2')`)
  })

  afterAll(async () => {
    if (!db) return
    await db.execute(sql`DELETE FROM pesos
      WHERE animal_id IN (${sql.join(
        [sql`${animalUnoId}`, sql`${animalDosId}`],
        sql`, `,
      )}) AND fecha >= '2098-01-01'`)
    await db.execute(sql`DELETE FROM registros_grupales
      WHERE finca_id = ${fincaId} AND fecha >= '2098-01-01'`)
    await db.execute(
      sql`DELETE FROM animales WHERE id IN (${sql.join(
        [sql`${animalUnoId}`, sql`${animalDosId}`],
        sql`, `,
      )})`,
    )
    await db.execute(sql`DELETE FROM lotes WHERE id = ${loteId}`)
    await db.execute(sql`DELETE FROM usuarios WHERE id = ${usuarioId}`)
    await db.execute(
      sql`DELETE FROM fincas WHERE id IN (${sql.join(
        [sql`${fincaId}`, sql`${fincaAjenaId}`],
        sql`, `,
      )})`,
    )
  })

  it("persists one real header, exactly N children, and total N", async () => {
    const result = await harness().capturar(groupedPesaje([animalUnoId, animalDosId], fechaExito))

    expect(result.tipo).toBe("capturado")
    if (result.tipo !== "capturado") return
    expect(result.ids.cabeceraId).toMatch(/^rg-/)
    expect(result.ids.hijosIds).toHaveLength(2)

    const headers = await db.execute(
      sql`SELECT id, total_animales FROM registros_grupales
          WHERE finca_id = ${fincaId} AND tipo_evento = 'pesaje'
            AND fecha::date = ${fechaExito}`,
    )
    const children = await db.execute(
      sql`SELECT animal_id, peso_kg FROM pesos
          WHERE registro_grupal_id = ${result.ids.cabeceraId}`,
    )
    expect(headers).toHaveLength(1)
    expect(headers[0]).toMatchObject({ id: result.ids.cabeceraId, total_animales: 2 })
    expect(children).toHaveLength(2)
    expect(children.map((row) => row.animal_id).sort()).toEqual([animalDosId, animalUnoId].sort())
  })

  it("enforces PostgreSQL foreign keys and group origin checks", async () => {
    await expectPgCode(
      db.execute(sql`INSERT INTO pesos (id, animal_id, fecha, peso_kg)
        VALUES (${`${prefix}-bad-fk`}, ${missingAnimalId}, ${fechaExito}, 400)`),
      "23503",
    )
    await expectPgCode(
      db.execute(sql`INSERT INTO registros_grupales
        (id, finca_id, tipo_evento, origen_seleccion, lote_id, total_animales)
        VALUES (${`${prefix}-bad-check`}, ${fincaId}, 'pesaje', 'grupo', ${loteId}, 1)`),
      "23514",
    )
  })

  it("rejects invalid catalog references before the real adapter writes", async () => {
    const before = await count(
      sql`SELECT count(*) FROM animales_ubicacion_historico WHERE animal_id = ${animalUnoId}`,
    )
    const result = await harness().capturar({
      fincaId,
      tipo: "traslado",
      alcance: { tipo: "individual", animalId: animalUnoId },
      datos: {
        fecha: "2098-03-04",
        loteId: missingAnimalId,
        motivo: "Referencia inexistente",
      },
    })

    expect(result).toEqual({
      tipo: "validacion",
      errores: [
        {
          campo: "loteId",
          detalle: "La referencia debe existir, estar activa y pertenecer a la finca.",
        },
      ],
    })
    expect(
      await count(
        sql`SELECT count(*) FROM animales_ubicacion_historico WHERE animal_id = ${animalUnoId}`,
      ),
    ).toBe(before)
  })

  it("rolls back the header and prior children when a later child is invalid", async () => {
    const beforeHeaders = await count(
      sql`SELECT count(*) FROM registros_grupales
          WHERE finca_id = ${fincaId} AND tipo_evento = 'pesaje' AND fecha::date = ${fechaRollback}`,
    )
    const beforeChildren = await count(
      sql`SELECT count(*) FROM pesos WHERE animal_id = ${animalUnoId} AND fecha = ${fechaRollback}`,
    )
    const result = await harness().capturar(
      groupedPesaje([animalUnoId, missingAnimalId], fechaRollback),
    )

    expect(result).toEqual({ tipo: "alcance_invalido" })
    expect(
      await count(
        sql`SELECT count(*) FROM registros_grupales
            WHERE finca_id = ${fincaId} AND tipo_evento = 'pesaje' AND fecha::date = ${fechaRollback}`,
      ),
    ).toBe(beforeHeaders)
    expect(
      await count(
        sql`SELECT count(*) FROM pesos WHERE animal_id = ${animalUnoId} AND fecha = ${fechaRollback}`,
      ),
    ).toBe(beforeChildren)
  })

  it("keeps empty scope, missing criteria, forbidden group type, and unknown fields side-effect free", async () => {
    const before = await count(
      sql`SELECT count(*) FROM registros_grupales WHERE finca_id = ${fincaId}`,
    )
    const cases: EventoWizardWebInput[] = [
      {
        fincaId,
        tipo: "pesaje",
        alcance: { tipo: "grupal", origen: "manual", animalIdsEfectivos: [] },
        datos: { fecha: "2098-04-01", pesoKg: 400, tipoPeso: "control" },
      },
      {
        fincaId,
        tipo: "pesaje",
        alcance: { tipo: "grupal", origen: "lote", animalIdsEfectivos: [animalUnoId] },
        datos: { fecha: "2098-04-02", pesoKg: 400, tipoPeso: "control" },
      },
      {
        fincaId,
        tipo: "parto",
        alcance: { tipo: "grupal", origen: "manual", animalIdsEfectivos: [animalUnoId] },
        datos: { fecha: "2098-04-03", tipoParto: "normal" },
      },
      {
        fincaId,
        tipo: "pesaje",
        alcance: { tipo: "individual", animalId: animalUnoId },
        datos: { fecha: "2098-04-04", pesoKg: 400, tipoPeso: "control", campoInventado: "no" },
      },
    ]

    expect(
      (await Promise.all(cases.map((input) => harness().capturar(input)))).every(
        (r) => r.tipo === "validacion",
      ),
    ).toBe(true)
    expect(
      await count(sql`SELECT count(*) FROM registros_grupales WHERE finca_id = ${fincaId}`),
    ).toBe(before)
  })
})
