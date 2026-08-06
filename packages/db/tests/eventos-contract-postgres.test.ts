import { EventoCommandInvalidError, EventoForbiddenError } from "@ganaweb/aplicacion"
import { sql } from "drizzle-orm"
import { beforeAll, describe, expect, it } from "vitest"
import { createClient, type DbClient } from "../src/client.js"
import { createAuthorizedEventoWriter } from "../src/evento-write-authorized.js"

const run = process.env.DB_SMOKE === "true" ? describe : describe.skip
let db: DbClient

async function expectPgCode(operation: Promise<unknown>, code: string): Promise<void> {
  try {
    await operation
    throw new Error(`Expected PostgreSQL error ${code}`)
  } catch (error) {
    const actual = (error as { cause?: { code?: string } }).cause?.code
    expect(actual).toBe(code)
  }
}

run("eventos contract on PostgreSQL", () => {
  beforeAll(async () => {
    db = createClient(process.env.DATABASE_URL)
    await db.execute(sql`
      INSERT INTO fincas (id, codigo, nombre) VALUES
        ('eventos-f1', 'EV1', 'Eventos 1'),
        ('eventos-f2', 'EV2', 'Eventos 2');
      INSERT INTO usuarios (id, nombre, email) VALUES
        ('eventos-u1', 'Operaria', 'eventos-u1@ganaweb.test');
      INSERT INTO lotes (id, finca_id, nombre) VALUES
        ('eventos-l1', 'eventos-f1', 'Lote 1'),
        ('eventos-l2', 'eventos-f2', 'Lote 2');
      INSERT INTO grupos (id, finca_id, nombre) VALUES
        ('eventos-g1', 'eventos-f1', 'Grupo 1'),
        ('eventos-g2', 'eventos-f2', 'Grupo 2');
      INSERT INTO animales (id, finca_id, codigo) VALUES
        ('eventos-a1', 'eventos-f1', 'A1'),
        ('eventos-a2', 'eventos-f2', 'A2');
      INSERT INTO registros_grupales
        (id, finca_id, tipo_evento, origen_seleccion, lote_id, total_animales)
      VALUES
        ('eventos-rg1', 'eventos-f1', 'pesaje', 'lote', 'eventos-l1', 1),
        ('eventos-rg2', 'eventos-f2', 'pesaje', 'lote', 'eventos-l2', 1);
      INSERT INTO servicios (id, animal_id, fecha, tipo)
      VALUES ('eventos-s1', 'eventos-a1', '2026-08-01', 'inseminacion');
    `)
  })

  it("rejects invalid origin/criterion pairs", async () => {
    await expectPgCode(
      db.execute(sql`INSERT INTO registros_grupales
        (id, finca_id, tipo_evento, origen_seleccion, lote_id, total_animales)
        VALUES ('eventos-invalid-origin', 'eventos-f1', 'pesaje', 'grupo', 'eventos-l1', 1)`),
      "23514",
    )
  })

  it("requires complete annulment audit and accepts the complete set", async () => {
    await expectPgCode(
      db.execute(sql`INSERT INTO servicios
        (id, animal_id, fecha, tipo, anulado_en)
        VALUES ('eventos-incomplete-audit', 'eventos-a1', '2026-08-02', 'monta', now())`),
      "23514",
    )
    await expect(
      db.execute(sql`INSERT INTO servicios
        (id, animal_id, fecha, tipo, anulado_en, anulado_por, motivo_anulacion)
        VALUES ('eventos-complete-audit', 'eventos-a1', '2026-08-02', 'monta', now(), 'eventos-u1', 'Duplicado')`),
    ).resolves.toBeDefined()
    await expectPgCode(
      db.execute(sql`UPDATE registros_grupales
        SET anulado_en = now(), anulado_por = 'eventos-u1'
        WHERE id = 'eventos-rg1'`),
      "23514",
    )
    await expect(
      db.execute(sql`UPDATE registros_grupales
        SET anulado_en = now(), anulado_por = 'eventos-u1', motivo_anulacion = 'Captura errada'
        WHERE id = 'eventos-rg1'`),
    ).resolves.toBeDefined()
  })

  it("rejects individual audit fields on grouped children", async () => {
    await expectPgCode(
      db.execute(sql`INSERT INTO pesos
        (id, animal_id, registro_grupal_id, fecha, peso_kg, anulado_en, anulado_por, motivo_anulacion)
        VALUES ('eventos-group-audit', 'eventos-a1', 'eventos-rg1', '2026-08-04', 410, now(), 'eventos-u1', 'No permitido')`),
      "23514",
    )
    await expect(
      db.execute(sql`INSERT INTO pesos
        (id, animal_id, registro_grupal_id, fecha, peso_kg)
        VALUES ('eventos-group-valid', 'eventos-a1', 'eventos-rg1', '2026-08-04', 410)`),
    ).resolves.toBeDefined()
  })

  it("creates the group, child and correction lookup indexes", async () => {
    const result = await db.execute(sql`SELECT indexname FROM pg_indexes WHERE indexname IN (
      'idx_reg_grupales_grupo',
      'idx_muertes_registro_grupal',
      'idx_condicion_corporal_registro_grupal',
      'idx_servicios_corrige_a'
    )`)
    expect(
      (result as unknown as Array<{ indexname: string }>).map((row) => row.indexname).sort(),
    ).toEqual([
      "idx_condicion_corporal_registro_grupal",
      "idx_muertes_registro_grupal",
      "idx_reg_grupales_grupo",
      "idx_servicios_corrige_a",
    ])
  })

  it("enforces same-table correction integrity", async () => {
    await expectPgCode(
      db.execute(sql`INSERT INTO servicios
        (id, animal_id, fecha, tipo, corrige_a_id)
        VALUES ('eventos-bad-correction', 'eventos-a1', '2026-08-03', 'monta', 'missing')`),
      "23503",
    )
    await expect(
      db.execute(sql`INSERT INTO servicios
        (id, animal_id, fecha, tipo, corrige_a_id)
        VALUES ('eventos-good-correction', 'eventos-a1', '2026-08-03', 'monta', 'eventos-s1')`),
    ).resolves.toBeDefined()
  })

  it("rejects cross-farm command references and persists only validated IDs", async () => {
    const writer = createAuthorizedEventoWriter(db)
    const sesion = {
      usuarioId: "eventos-u1",
      nombre: "Operaria",
      email: "eventos-u1@ganaweb.test",
      fincaActivaId: "eventos-f1",
      fincaActivaNombre: "Eventos 1",
      rol: "Operario",
      permisos: [
        { modulo: "eventos_productivos", accion: "crear" },
        { modulo: "eventos_reproductivos", accion: "crear" },
      ],
      fincas: [],
    }
    const persistir = (command: Parameters<typeof writer>[0]["command"]) =>
      writer({ sesion, command })
    const base = {
      fincaId: "eventos-f1",
      usuarioId: "eventos-u1",
    }
    await expect(
      persistir({
        ...base,
        fincaId: "eventos-f1",
        tipo: "crear_evento_individual",
        evento: "pesaje",
        id: "eventos-cross-animal",
        animalId: "eventos-a2",
        datos: { fecha: "2026-08-05", pesoKg: 400 },
      }),
    ).rejects.toBeInstanceOf(EventoForbiddenError)
    await expect(
      persistir({
        ...base,
        tipo: "crear_hijo_grupal",
        evento: "servicio",
        id: "eventos-header-type-mismatch",
        animalId: "eventos-a1",
        registroGrupalId: "eventos-rg1",
        datos: { fecha: "2026-08-05", tipo: "monta" },
      }),
    ).rejects.toBeInstanceOf(EventoForbiddenError)
    await expect(
      persistir({
        ...base,
        tipo: "crear_hijo_grupal",
        evento: "pesaje",
        id: "eventos-cross-header",
        animalId: "eventos-a1",
        registroGrupalId: "eventos-rg2",
        datos: { fecha: "2026-08-05", pesoKg: 400 },
      }),
    ).rejects.toBeInstanceOf(EventoForbiddenError)
    await expect(
      persistir({
        ...base,
        tipo: "crear_registro_grupal",
        evento: "pesaje",
        id: "eventos-cross-criterion",
        totalAnimales: 1,
        criterio: { origen: "lote", loteId: "eventos-l2" },
      }),
    ).rejects.toBeInstanceOf(EventoForbiddenError)
    await expect(
      writer({
        sesion: { ...sesion, fincaActivaId: "eventos-f2" },
        command: {
          ...base,
          fincaId: "eventos-f2",
          tipo: "crear_evento_individual",
          evento: "servicio",
          id: "eventos-cross-correction",
          animalId: "eventos-a2",
          corrigeAId: "eventos-s1",
          datos: { fecha: "2026-08-05", tipo: "monta" },
        },
      }),
    ).rejects.toBeInstanceOf(EventoForbiddenError)

    await expect(
      persistir({
        ...base,
        tipo: "crear_evento_individual",
        evento: "pesaje",
        id: "eventos-protected-id",
        animalId: "eventos-a1",
        datos: { fecha: "2026-08-05", pesoKg: 405, animalId: "eventos-a2" },
      }),
    ).rejects.toBeInstanceOf(EventoCommandInvalidError)

    const rejected = await db.execute(sql`SELECT id FROM pesos WHERE id IN (
      'eventos-cross-animal',
      'eventos-cross-header',
      'eventos-header-type-mismatch',
      'eventos-protected-id'
    )`)
    expect(rejected).toHaveLength(0)

    await expect(
      persistir({
        ...base,
        tipo: "crear_evento_individual",
        evento: "pesaje",
        id: "eventos-gateway-valid",
        animalId: "eventos-a1",
        datos: { fecha: "2026-08-05", pesoKg: 405 },
      }),
    ).resolves.toEqual({ id: "eventos-gateway-valid" })
    const rows = await db.execute(
      sql`SELECT animal_id, peso_kg FROM pesos WHERE id = 'eventos-gateway-valid'`,
    )
    expect(rows[0]).toMatchObject({ animal_id: "eventos-a1", peso_kg: "405.00" })
  })
})
