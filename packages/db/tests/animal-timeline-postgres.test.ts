/**
 * redesign-ficha-animal (slice 3, tasks 3.2 + 3.3) — integración Postgres
 * del timeline real del animal (`DrizzleAnimalTimelineRepository`).
 *
 * Spec animal-timeline: cobertura de la unión de las 11 tablas de eventos,
 * mapeo dominio/tipo por tabla, orden cronológico descendente (RN-002),
 * paginación keyset que compone con el filtro de dominio de las tabs, y
 * higiene del cursor manipulado (threat matrix: decodificar, validar,
 * bind — nunca lanzar ni inyectar).
 *
 * #181: paridad con el read-model del resumen — los eventos anidados en un
 * registro grupal anulado se excluyen del timeline (y reaparecen si el
 * registro vuelve a estar vigente).
 *
 * Patrón de `animal-ficha-postgres.test.ts`: prefijo de fixture aleatorio,
 * semillas en beforeAll, limpieza en afterAll, skip en CI. Requiere
 * Postgres real (DATABASE_URL).
 */
import { randomUUID } from "node:crypto"
import { sql } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { DrizzleAnimalTimelineRepository } from "../src/animal-infrastructure.js"
import { createClient } from "../src/client.js"

const databaseUrl = "postgresql://postgres:postgres@localhost:5432/ganaweb"
const db = createClient(process.env.DATABASE_URL ?? databaseUrl)
const fixture = `tl-${randomUUID().slice(0, 8)}`
const fincaA = `${fixture}-finca-a`
const fincaB = `${fixture}-finca-b`
const producto = `${fixture}-producto`
const animalFull = `${fixture}-animal-full`
const animalEmpty = `${fixture}-animal-empty`
const animalPaginado = `${fixture}-animal-paginado`
const animalLargo = `${fixture}-animal-largo`
const animalOther = `${fixture}-animal-other`
const animalAnulados = `${fixture}-animal-anulados`
const animalReactivado = `${fixture}-animal-reactivado`
const registroAnulado = `${fixture}-reg-anulado`
const registroVigente = `${fixture}-reg-vigente`
const registroReactivado = `${fixture}-reg-reactivado`
const usuarioAuditoria = `${fixture}-usuario-auditoria`

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
    VALUES (${usuarioAuditoria}, 'Timeline Audit', ${`${fixture}@ganaweb.test`})
  `)
  await execute(sql`
    INSERT INTO animales (id, finca_id, codigo, nombre, sexo_key, activo)
    VALUES
      (${animalFull}, ${fincaA}, ${`${fixture}-T1`}, 'Lucera', 1, 1),
      (${animalEmpty}, ${fincaA}, ${`${fixture}-T2`}, 'Sin Eventos', 1, 1),
      (${animalPaginado}, ${fincaA}, ${`${fixture}-T3`}, 'Paginada', 1, 1),
      (${animalLargo}, ${fincaA}, ${`${fixture}-T7`}, 'Larga', 1, 1)
  `)
  await execute(sql`
    INSERT INTO animales (id, finca_id, codigo, nombre, sexo_key, activo)
    VALUES (${animalOther}, ${fincaB}, ${`${fixture}-T4`}, 'Otra Finca', 1, 1)
  `)
  await execute(sql`
    INSERT INTO productos_sanitarios (id, finca_id, codigo, descripcion)
    VALUES (${producto}, ${fincaA}, ${`${fixture}-P1`}, 'Vacuna aftosa')
  `)

  // Animal con un evento por cada tabla de la unión (11 fuentes).
  await execute(sql`
    INSERT INTO pesos (id, animal_id, fecha, peso_kg)
    VALUES (${`${fixture}-peso-1`}, ${animalFull}, '2026-06-28', '410.50')
  `)
  await execute(sql`
    INSERT INTO producciones_lacteas (id, animal_id, fecha, cantidad_am, cantidad_pm)
    VALUES (${`${fixture}-produccion-1`}, ${animalFull}, '2026-06-01', '7.25', '5.75')
  `)
  await execute(sql`
    INSERT INTO animales_condicion_corporal (id, animal_id, puntaje, fecha)
    VALUES (${`${fixture}-condicion-1`}, ${animalFull}, '3.5', '2026-06-15')
  `)
  await execute(sql`
    INSERT INTO servicios (id, animal_id, fecha, tipo)
    VALUES (${`${fixture}-servicio-1`}, ${animalFull}, '2026-04-02', 'inseminacion')
  `)
  await execute(sql`
    INSERT INTO palpaciones (id, animal_id, fecha, resultado)
    VALUES (${`${fixture}-palpacion-1`}, ${animalFull}, '2026-05-01', 'prenada')
  `)
  await execute(sql`
    INSERT INTO partos (id, animal_id, fecha, tipo_parto)
    VALUES (${`${fixture}-parto-1`}, ${animalFull}, '2024-03-01', 'normal')
  `)
  await execute(sql`
    INSERT INTO aplicaciones_sanitarias (id, animal_id, producto_id, fecha, dosis)
    VALUES (${`${fixture}-aplicacion-1`}, ${animalFull}, ${producto}, '2026-05-15', '2.50')
  `)
  await execute(sql`
    INSERT INTO revisiones_veterinarias (id, animal_id, fecha, tipo_diagnostico)
    VALUES (${`${fixture}-revision-1`}, ${animalFull}, '2026-02-10', 'vitaminas')
  `)
  await execute(sql`
    INSERT INTO ventas (id, animal_id, fecha, comprador)
    VALUES (${`${fixture}-venta-1`}, ${animalFull}, '2025-11-30', 'Feria de Ganado')
  `)
  await execute(sql`
    INSERT INTO muertes (id, animal_id, fecha)
    VALUES (${`${fixture}-muerte-1`}, ${animalFull}, '2025-01-05')
  `)
  await execute(sql`
    INSERT INTO animales_ubicacion_historico (id, animal_id, fecha, motivo)
    VALUES (${`${fixture}-reubicacion-1`}, ${animalFull}, '2026-03-20T14:30:00Z', 'Rotación de potrero')
  `)

  // Animal con más eventos que una página: 25 servicios (reproducción)
  // intercalados con 3 pesajes (producción) para probar la composición
  // del filtro de dominio con la paginación.
  for (let dia = 1; dia <= 25; dia += 1) {
    const dosDigitos = String(dia).padStart(2, "0")
    await execute(sql`
      INSERT INTO servicios (id, animal_id, fecha, tipo)
      VALUES (${`${fixture}-srv-${dosDigitos}`}, ${animalPaginado}, ${`2026-01-${dosDigitos}`}, 'monta')
    `)
  }
  await execute(sql`
    INSERT INTO pesos (id, animal_id, fecha, peso_kg)
    VALUES
      (${`${fixture}-peso-p1`}, ${animalPaginado}, '2026-02-01', '300.00'),
      (${`${fixture}-peso-p2`}, ${animalPaginado}, '2026-02-02', '302.00'),
      (${`${fixture}-peso-p3`}, ${animalPaginado}, '2026-02-03', '304.00')
  `)

  // #181 — registros grupales: uno anulado, uno vigente y uno que se
  // reactiva durante la prueba; animales dedicados para no alterar las
  // cuentas de las pruebas existentes.
  await execute(sql`
    INSERT INTO animales (id, finca_id, codigo, nombre, sexo_key, activo)
    VALUES
      (${animalAnulados}, ${fincaA}, ${`${fixture}-T5`}, 'Anulados', 1, 1),
      (${animalReactivado}, ${fincaA}, ${`${fixture}-T6`}, 'Reactivado', 1, 1)
  `)
  await execute(sql`
    INSERT INTO registros_grupales
      (id, finca_id, tipo_evento, total_animales, anulado_en, anulado_por, motivo_anulacion)
    VALUES
      (${registroAnulado}, ${fincaA}, 'pesaje', 1, now(), ${usuarioAuditoria}, 'Fixture anulado'),
      (${registroVigente}, ${fincaA}, 'pesaje', 1, NULL, NULL, NULL),
      (${registroReactivado}, ${fincaA}, 'pesaje', 1, now(), ${usuarioAuditoria}, 'Fixture reactivado')
  `)
  // Un evento por cada tabla con registro_grupal_id (9 fuentes), anidado en
  // el registro anulado y en el vigente.
  await execute(sql`
    INSERT INTO pesos (id, animal_id, registro_grupal_id, fecha, peso_kg)
    VALUES
      (${`${fixture}-anu-peso`}, ${animalAnulados}, ${registroAnulado}, '2026-07-11', '400.00'),
      (${`${fixture}-vig-peso`}, ${animalAnulados}, ${registroVigente}, '2026-07-01', '390.00')
  `)
  await execute(sql`
    INSERT INTO producciones_lacteas (id, animal_id, registro_grupal_id, fecha, cantidad_am, cantidad_pm)
    VALUES
      (${`${fixture}-anu-produccion`}, ${animalAnulados}, ${registroAnulado}, '2026-07-12', '6.00', '5.00'),
      (${`${fixture}-vig-produccion`}, ${animalAnulados}, ${registroVigente}, '2026-07-02', '6.00', '5.00')
  `)
  await execute(sql`
    INSERT INTO servicios (id, animal_id, registro_grupal_id, fecha, tipo)
    VALUES
      (${`${fixture}-anu-servicio`}, ${animalAnulados}, ${registroAnulado}, '2026-07-13', 'monta'),
      (${`${fixture}-vig-servicio`}, ${animalAnulados}, ${registroVigente}, '2026-07-03', 'monta')
  `)
  await execute(sql`
    INSERT INTO palpaciones (id, animal_id, registro_grupal_id, fecha, resultado)
    VALUES
      (${`${fixture}-anu-palpacion`}, ${animalAnulados}, ${registroAnulado}, '2026-07-14', 'vacia'),
      (${`${fixture}-vig-palpacion`}, ${animalAnulados}, ${registroVigente}, '2026-07-04', 'vacia')
  `)
  await execute(sql`
    INSERT INTO partos (id, animal_id, registro_grupal_id, fecha, tipo_parto)
    VALUES
      (${`${fixture}-anu-parto`}, ${animalAnulados}, ${registroAnulado}, '2026-07-15', 'normal'),
      (${`${fixture}-vig-parto`}, ${animalAnulados}, ${registroVigente}, '2026-07-05', 'normal')
  `)
  await execute(sql`
    INSERT INTO aplicaciones_sanitarias (id, animal_id, registro_grupal_id, producto_id, fecha, dosis)
    VALUES
      (${`${fixture}-anu-aplicacion`}, ${animalAnulados}, ${registroAnulado}, ${producto}, '2026-07-16', '1.00'),
      (${`${fixture}-vig-aplicacion`}, ${animalAnulados}, ${registroVigente}, ${producto}, '2026-07-06', '1.00')
  `)
  await execute(sql`
    INSERT INTO revisiones_veterinarias (id, animal_id, registro_grupal_id, fecha, tipo_diagnostico)
    VALUES
      (${`${fixture}-anu-revision`}, ${animalAnulados}, ${registroAnulado}, '2026-07-17', 'vitaminas'),
      (${`${fixture}-vig-revision`}, ${animalAnulados}, ${registroVigente}, '2026-07-07', 'vitaminas')
  `)
  await execute(sql`
    INSERT INTO ventas (id, animal_id, registro_grupal_id, fecha, comprador)
    VALUES
      (${`${fixture}-anu-venta`}, ${animalAnulados}, ${registroAnulado}, '2026-07-18', 'Subasta'),
      (${`${fixture}-vig-venta`}, ${animalAnulados}, ${registroVigente}, '2026-07-08', 'Subasta')
  `)
  await execute(sql`
    INSERT INTO animales_ubicacion_historico (id, animal_id, registro_grupal_id, fecha, motivo)
    VALUES
      (${`${fixture}-anu-reubicacion`}, ${animalAnulados}, ${registroAnulado}, '2026-07-19T10:00:00Z', 'Traslado'),
      (${`${fixture}-vig-reubicacion`}, ${animalAnulados}, ${registroVigente}, '2026-07-09T10:00:00Z', 'Traslado')
  `)
  // Evento del registro que se reactiva durante la prueba.
  await execute(sql`
    INSERT INTO pesos (id, animal_id, registro_grupal_id, fecha, peso_kg)
    VALUES (${`${fixture}-react-peso`}, ${animalReactivado}, ${registroReactivado}, '2026-07-21', '350.00')
  `)

  // Issue #183: animal con tres páginas de un solo dominio (45 servicios)
  // para verificar que el conteo pendiente decrece al consumir páginas.
  for (let dia = 1; dia <= 45; dia += 1) {
    const fecha = new Date(Date.UTC(2025, 0, dia)).toISOString().slice(0, 10)
    await execute(sql`
      INSERT INTO servicios (id, animal_id, fecha, tipo)
      VALUES (${`${fixture}-lng-${String(dia).padStart(2, "0")}`}, ${animalLargo}, ${fecha}, 'monta')
    `)
  }
})

afterAll(async () => {
  await execute(sql`DELETE FROM animales_ubicacion_historico WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM muertes WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM ventas WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM revisiones_veterinarias WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM aplicaciones_sanitarias WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM partos WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM palpaciones WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM servicios WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM animales_condicion_corporal WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM producciones_lacteas WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM pesos WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM registros_grupales WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM productos_sanitarios WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM animales WHERE id LIKE ${`${fixture}%`}`)
  await execute(sql`DELETE FROM usuarios WHERE id = ${usuarioAuditoria}`)
  await execute(sql`DELETE FROM fincas WHERE id LIKE ${`${fixture}%`}`)
})

describe.skipIf(process.env.CI === "true")("DrizzleAnimalTimelineRepository (PostgreSQL)", () => {
  it("unions the 11 event tables with per-table dominio/tipo mapping", async () => {
    const repo = new DrizzleAnimalTimelineRepository(db)

    const pagina = await repo.listarPagina({ animalId: animalFull, fincaId: fincaA, limit: 20 })

    expect(pagina.items).toHaveLength(11)
    const porId = new Map(pagina.items.map((item) => [item.id, item]))
    expect(porId.get(`${fixture}-peso-1`)).toMatchObject({
      dominio: "produccion",
      tipo: "pesaje",
      fecha: "2026-06-28",
      detalle: "410.50 kg",
    })
    expect(porId.get(`${fixture}-produccion-1`)).toMatchObject({
      dominio: "produccion",
      tipo: "produccion",
      fecha: "2026-06-01",
      detalle: "13.00 L",
    })
    expect(porId.get(`${fixture}-condicion-1`)).toMatchObject({
      dominio: "produccion",
      tipo: "condicion",
      fecha: "2026-06-15",
      detalle: "3.5",
    })
    expect(porId.get(`${fixture}-servicio-1`)).toMatchObject({
      dominio: "reproduccion",
      tipo: "servicio",
      fecha: "2026-04-02",
      detalle: "inseminacion",
    })
    expect(porId.get(`${fixture}-palpacion-1`)).toMatchObject({
      dominio: "reproduccion",
      tipo: "palpacion",
      fecha: "2026-05-01",
      detalle: "prenada",
    })
    expect(porId.get(`${fixture}-parto-1`)).toMatchObject({
      dominio: "reproduccion",
      tipo: "parto",
      fecha: "2024-03-01",
      detalle: "normal",
    })
    expect(porId.get(`${fixture}-aplicacion-1`)).toMatchObject({
      dominio: "sanidad",
      tipo: "vacunacion",
      fecha: "2026-05-15",
      detalle: "2.50",
    })
    expect(porId.get(`${fixture}-revision-1`)).toMatchObject({
      dominio: "sanidad",
      tipo: "revision",
      fecha: "2026-02-10",
      detalle: "vitaminas",
    })
    expect(porId.get(`${fixture}-venta-1`)).toMatchObject({
      dominio: "manejo",
      tipo: "venta",
      fecha: "2025-11-30",
      detalle: "Feria de Ganado",
    })
    expect(porId.get(`${fixture}-muerte-1`)).toMatchObject({
      dominio: "manejo",
      tipo: "muerte",
      fecha: "2025-01-05",
    })
    expect(porId.get(`${fixture}-reubicacion-1`)).toMatchObject({
      dominio: "manejo",
      tipo: "reubicacion",
      fecha: "2026-03-20",
      detalle: "Rotación de potrero",
    })
    // Sin más eventos que los de la página: el cursor queda ausente.
    expect(pagina.nextCursor).toBeUndefined()
    // Issue #183: sin cursor no hay conteo pendiente.
    expect(pagina.pendientes).toBeUndefined()
  })

  it("orders events newest-first across tables (RN-002)", async () => {
    const repo = new DrizzleAnimalTimelineRepository(db)

    const pagina = await repo.listarPagina({ animalId: animalFull, fincaId: fincaA, limit: 20 })

    const fechas = pagina.items.map((item) => item.fecha)
    const esperado = [...fechas].sort((a, b) => b.localeCompare(a))
    expect(fechas).toEqual(esperado)
    // El trío del escenario spec: 28 jun, 2 abr, 20 mar en ese orden.
    expect(fechas.indexOf("2026-06-28")).toBeLessThan(fechas.indexOf("2026-04-02"))
    expect(fechas.indexOf("2026-04-02")).toBeLessThan(fechas.indexOf("2026-03-20"))
  })

  it("returns an empty page without synthetic events for an animal without history", async () => {
    const repo = new DrizzleAnimalTimelineRepository(db)

    const pagina = await repo.listarPagina({ animalId: animalEmpty, fincaId: fincaA, limit: 20 })

    expect(pagina.items).toEqual([])
    expect(pagina.nextCursor).toBeUndefined()
  })

  it("paginates with keyset cursor: resume without duplicates or gaps, last page omits cursor", async () => {
    const repo = new DrizzleAnimalTimelineRepository(db)

    const primera = await repo.listarPagina({
      animalId: animalPaginado,
      fincaId: fincaA,
      limit: 20,
    })
    expect(primera.items).toHaveLength(20)
    expect(primera.nextCursor).toBeDefined()
    // La página mezcla dominios y arranca con lo más reciente (pesajes de febrero).
    expect(primera.items[0]).toMatchObject({ id: `${fixture}-peso-p3`, dominio: "produccion" })

    const segunda = await repo.listarPagina({
      animalId: animalPaginado,
      fincaId: fincaA,
      ...(primera.nextCursor ? { cursor: primera.nextCursor } : {}),
      limit: 20,
    })
    expect(segunda.items).toHaveLength(8)
    expect(segunda.nextCursor).toBeUndefined()

    const idsPrimera = new Set(primera.items.map((item) => item.id))
    const idsSegunda = segunda.items.map((item) => item.id)
    // Sin repetidos ni huecos: la segunda página continúa exactamente donde
    // terminó la primera.
    for (const id of idsSegunda) expect(idsPrimera.has(id)).toBe(false)
    const concatenados = [...primera.items, ...segunda.items]
    expect(new Set(concatenados.map((item) => item.id))).toHaveLength(28)
    const fechas = concatenados.map((item) => item.fecha)
    expect(fechas).toEqual([...fechas].sort((a, b) => b.localeCompare(a)))
  })

  it("composes the domain filter with pagination (ficha tabs)", async () => {
    const repo = new DrizzleAnimalTimelineRepository(db)

    const primera = await repo.listarPagina({
      animalId: animalPaginado,
      fincaId: fincaA,
      dominio: "reproduccion",
      limit: 20,
    })
    expect(primera.items).toHaveLength(20)
    expect(primera.nextCursor).toBeDefined()
    for (const item of primera.items) expect(item.dominio).toBe("reproduccion")
    expect(primera.items[0]).toMatchObject({ id: `${fixture}-srv-25`, tipo: "servicio" })

    const segunda = await repo.listarPagina({
      animalId: animalPaginado,
      fincaId: fincaA,
      dominio: "reproduccion",
      ...(primera.nextCursor ? { cursor: primera.nextCursor } : {}),
      limit: 20,
    })
    expect(segunda.items).toHaveLength(5)
    expect(segunda.nextCursor).toBeUndefined()
    for (const item of segunda.items) expect(item.dominio).toBe("reproduccion")
    // Continúa tras el último servicio de la primera página (srv-06 → srv-05..01).
    expect(segunda.items.map((item) => item.id)).toEqual([
      `${fixture}-srv-05`,
      `${fixture}-srv-04`,
      `${fixture}-srv-03`,
      `${fixture}-srv-02`,
      `${fixture}-srv-01`,
    ])

    // Un dominio sin eventos produce página vacía (tab Sanidad de este animal).
    const vacia = await repo.listarPagina({
      animalId: animalPaginado,
      fincaId: fincaA,
      dominio: "sanidad",
      limit: 20,
    })
    expect(vacia.items).toEqual([])
    expect(vacia.nextCursor).toBeUndefined()
  })

  it("returns the pending count consistent with the active domain filter (#183)", async () => {
    const repo = new DrizzleAnimalTimelineRepository(db)

    // Resumen (sin filtro): 28 eventos, página de 20 → 8 pendientes.
    const resumen = await repo.listarPagina({
      animalId: animalPaginado,
      fincaId: fincaA,
      limit: 20,
    })
    expect(resumen.nextCursor).toBeDefined()
    expect(resumen.pendientes).toBe(8)

    // Tab Reproducción: solo cuenta sus 25 servicios → 5 pendientes (no 8).
    const reproduccion = await repo.listarPagina({
      animalId: animalPaginado,
      fincaId: fincaA,
      dominio: "reproduccion",
      limit: 20,
    })
    expect(reproduccion.nextCursor).toBeDefined()
    expect(reproduccion.pendientes).toBe(5)

    // Tab Producción: 3 pesajes caben en una página → sin cursor ni conteo.
    const produccion = await repo.listarPagina({
      animalId: animalPaginado,
      fincaId: fincaA,
      dominio: "produccion",
      limit: 20,
    })
    expect(produccion.nextCursor).toBeUndefined()
    expect(produccion.pendientes).toBeUndefined()
  })

  it("pending count decreases as pages are consumed (#183)", async () => {
    const repo = new DrizzleAnimalTimelineRepository(db)

    const primera = await repo.listarPagina({
      animalId: animalLargo,
      fincaId: fincaA,
      limit: 20,
    })
    expect(primera.items).toHaveLength(20)
    expect(primera.pendientes).toBe(25)

    const segunda = await repo.listarPagina({
      animalId: animalLargo,
      fincaId: fincaA,
      ...(primera.nextCursor ? { cursor: primera.nextCursor } : {}),
      limit: 20,
    })
    expect(segunda.items).toHaveLength(20)
    expect(segunda.pendientes).toBe(5)

    // Última página: sin cursor y sin conteo pendiente.
    const tercera = await repo.listarPagina({
      animalId: animalLargo,
      fincaId: fincaA,
      ...(segunda.nextCursor ? { cursor: segunda.nextCursor } : {}),
      limit: 20,
    })
    expect(tercera.items).toHaveLength(5)
    expect(tercera.nextCursor).toBeUndefined()
    expect(tercera.pendientes).toBeUndefined()
  })

  it("ignores tampered or garbage cursors and returns the first page (no throw, no injection)", async () => {
    const repo = new DrizzleAnimalTimelineRepository(db)
    const primera = await repo.listarPagina({
      animalId: animalPaginado,
      fincaId: fincaA,
      limit: 20,
    })

    const basura = "%%%no-es-base64%%%"
    const jsonInvalido = Buffer.from('{"f": 123, "id": null}', "utf8").toString("base64url")
    const fechaInvalida = Buffer.from(
      JSON.stringify({ f: "2026-13-45", id: `${fixture}-srv-25` }),
      "utf8",
    ).toString("base64url")
    const intentoInyeccion = Buffer.from(
      JSON.stringify({ f: "2026-01-25'; DROP TABLE servicios; --", id: "x" }),
      "utf8",
    ).toString("base64url")

    for (const cursor of [basura, jsonInvalido, fechaInvalida, intentoInyeccion]) {
      const pagina = await repo.listarPagina({
        animalId: animalPaginado,
        fincaId: fincaA,
        cursor,
        limit: 20,
      })
      expect(pagina.items.map((item) => item.id)).toEqual(primera.items.map((item) => item.id))
      expect(pagina.nextCursor).toBe(primera.nextCursor)
      expect(pagina.pendientes).toBe(primera.pendientes)
    }
  })

  it("never crosses finca boundaries", async () => {
    const repo = new DrizzleAnimalTimelineRepository(db)

    const ajena = await repo.listarPagina({ animalId: animalOther, fincaId: fincaA, limit: 20 })
    expect(ajena.items).toEqual([])
    const inexistente = await repo.listarPagina({
      animalId: `${fixture}-fantasma`,
      fincaId: fincaA,
      limit: 20,
    })
    expect(inexistente.items).toEqual([])
  })

  it("excludes events nested in annulled group records across every group-derived branch (#181)", async () => {
    const repo = new DrizzleAnimalTimelineRepository(db)

    const pagina = await repo.listarPagina({
      animalId: animalAnulados,
      fincaId: fincaA,
      limit: 20,
    })

    // Solo los 9 eventos del registro vigente; ninguno del anulado.
    expect(pagina.items.map((item) => item.id).sort()).toEqual(
      [
        `${fixture}-vig-peso`,
        `${fixture}-vig-produccion`,
        `${fixture}-vig-servicio`,
        `${fixture}-vig-palpacion`,
        `${fixture}-vig-parto`,
        `${fixture}-vig-aplicacion`,
        `${fixture}-vig-revision`,
        `${fixture}-vig-venta`,
        `${fixture}-vig-reubicacion`,
      ].sort(),
    )
    for (const item of pagina.items) {
      expect(item.id).not.toContain("-anu-")
    }
    expect(pagina.nextCursor).toBeUndefined()
  })

  it("shows the event again when the group record is no longer annulled (#181)", async () => {
    const repo = new DrizzleAnimalTimelineRepository(db)

    const anulado = await repo.listarPagina({
      animalId: animalReactivado,
      fincaId: fincaA,
      limit: 20,
    })
    expect(anulado.items).toEqual([])

    await execute(sql`
      UPDATE registros_grupales
      SET anulado_en = NULL, anulado_por = NULL, motivo_anulacion = NULL, updated_at = now()
      WHERE id = ${registroReactivado}
    `)

    const vigente = await repo.listarPagina({
      animalId: animalReactivado,
      fincaId: fincaA,
      limit: 20,
    })
    expect(vigente.items).toHaveLength(1)
    expect(vigente.items[0]).toMatchObject({
      id: `${fixture}-react-peso`,
      dominio: "produccion",
      tipo: "pesaje",
      fecha: "2026-07-21",
      detalle: "350.00 kg",
    })
  })
})
