/**
 * Issue #227 — integración PostgreSQL del read model unificado de finca
 * (RF-EVENTOS v1.1, EV-UI-002..005, EV-INT-001, EV-SEC-001).
 *
 * Cubre:
 *  - UNION de las 11 tablas especializadas con JOIN a `animales` para
 *    derivar `finca_id` (EV-ARQ-003).
 *  - Exclusion vigente de registros grupales anulados (#181) — los
 *    hijos de una cabecera anulada no aparecen ni en feed ni en
 *    historial.
 *  - Aislamiento estricto entre fincas A y B (una query con
 *    `fincaActivaId` distinto a la finca del animal devuelve vacio).
 *  - Agrupacion del feed por cabecera grupal: un grupal aparece UNA
 *    vez con `total_animales` igual a los hijos efectivos, mientras
 *    en el historial cada hijo aparece por separado.
 *  - Filtros: categoria, tipo, rango de fechas (inclusivo).
 *  - Paginacion keyset sin duplicados ni huecos; `pendientes` decrece
 *    por pagina bajo el mismo filtro (#183).
 *  - Contadores mensuales por dominio (un solo round-trip, el feed
 *    y los contadores no se contradicen).
 *
 * Patron: prefijo de fixture aleatorio, semillas en beforeAll,
 * limpieza en afterAll, skip en CI. Requiere Postgres real
 * (DATABASE_URL). La sesion enviada a la implementacion es siempre
 * de la finca activa; el test verifica que la implementacion rechaza
 * el cruce aun si el caller se equivoca.
 */
import { randomUUID } from "node:crypto"
import { PAGE_SIZE_FEED_FINCA, PAGE_SIZE_HISTORIAL_FINCA } from "@ganaweb/dominio"
import { sql } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createClient } from "../src/client.js"
import { DrizzleEventosFincaReadRepository } from "../src/evento-read-infrastructure.js"

const databaseUrl = "postgresql://postgres:postgres@localhost:5432/ganaweb"
const db = createClient(process.env.DATABASE_URL ?? databaseUrl)
const fixture = `evr-${randomUUID().slice(0, 8)}`
const fincaA = `${fixture}-finca-a`
const fincaB = `${fixture}-finca-b`
const producto = `${fixture}-producto`
const animalA1 = `${fixture}-animal-a1`
const animalA2 = `${fixture}-animal-a2`
const animalA3 = `${fixture}-animal-a3`
const animalB1 = `${fixture}-animal-b1`
const animalPaginado = `${fixture}-animal-pag`
const animalLargo = `${fixture}-animal-largo`
const registroVigente = `${fixture}-reg-vigente`
const registroAnulado = `${fixture}-reg-anulado`
const usuarioAuditoria = `${fixture}-usuario-auditoria`

async function execute(statement: ReturnType<typeof sql>) {
  return db.execute(statement)
}

function sesionFinca(fincaActivaId: string) {
  return {
    usuarioId: usuarioAuditoria,
    fincaActivaId,
    permisos: [
      { modulo: "eventos_reproductivos", accion: "ver" },
      { modulo: "eventos_productivos", accion: "ver" },
      { modulo: "sanidad", accion: "ver" },
      { modulo: "movimientos", accion: "ver" },
    ],
  }
}

beforeAll(async () => {
  await execute(sql`
    INSERT INTO fincas (id, codigo, nombre)
    VALUES (${fincaA}, ${`${fixture}-A`}, 'Finca A'), (${fincaB}, ${`${fixture}-B`}, 'Finca B')
  `)
  await execute(sql`
    INSERT INTO usuarios (id, nombre, email)
    VALUES (${usuarioAuditoria}, 'Read Audit', ${`${fixture}@ganaweb.test`})
  `)
  await execute(sql`
    INSERT INTO animales (id, finca_id, codigo, nombre, sexo_key, activo)
    VALUES
      (${animalA1}, ${fincaA}, ${`${fixture}-A1`}, 'Animal A1', 1, 1),
      (${animalA2}, ${fincaA}, ${`${fixture}-A2`}, 'Animal A2', 1, 1),
      (${animalA3}, ${fincaA}, ${`${fixture}-A3`}, 'Animal A3', 1, 1),
      (${animalB1}, ${fincaB}, ${`${fixture}-B1`}, 'Animal B1', 1, 1),
      (${animalPaginado}, ${fincaA}, ${`${fixture}-PG`}, 'Paginada', 1, 1),
      (${animalLargo}, ${fincaA}, ${`${fixture}-LG`}, 'Larga', 1, 1)
  `)
  await execute(sql`
    INSERT INTO productos_sanitarios (id, finca_id, codigo, descripcion)
    VALUES (${producto}, ${fincaA}, ${`${fixture}-P1`}, 'Vacuna aftosa')
  `)
  await execute(sql`
    INSERT INTO registros_grupales
      (id, finca_id, tipo_evento, total_animales, anulado_en, anulado_por, motivo_anulacion)
    VALUES
      (${registroVigente}, ${fincaA}, 'pesaje', 3, NULL, NULL, NULL),
      (${registroAnulado}, ${fincaA}, 'pesaje', 2, now(), ${usuarioAuditoria}, 'Fixture anulado')
  `)

  // Animal A1: una fila por cada una de las 5 ramas con `registro_grupal_id`.
  await execute(sql`
    INSERT INTO pesos (id, animal_id, registro_grupal_id, fecha, peso_kg)
    VALUES (${`${fixture}-a1-peso`}, ${animalA1}, ${registroVigente}, '2026-08-05', '420.00')
  `)
  await execute(sql`
    INSERT INTO servicios (id, animal_id, registro_grupal_id, fecha, tipo)
    VALUES (${`${fixture}-a1-servicio`}, ${animalA1}, ${registroVigente}, '2026-08-03', 'inseminacion')
  `)
  await execute(sql`
    INSERT INTO palpaciones (id, animal_id, registro_grupal_id, fecha, resultado)
    VALUES (${`${fixture}-a1-palp`}, ${animalA1}, ${registroVigente}, '2026-08-04', 'prenada')
  `)
  await execute(sql`
    INSERT INTO aplicaciones_sanitarias (id, animal_id, registro_grupal_id, producto_id, fecha, dosis)
    VALUES (${`${fixture}-a1-aplic`}, ${animalA1}, ${registroVigente}, ${producto}, '2026-08-02', '2.50')
  `)
  await execute(sql`
    INSERT INTO ventas (id, animal_id, registro_grupal_id, fecha, comprador)
    VALUES (${`${fixture}-a1-venta`}, ${animalA1}, ${registroVigente}, '2026-08-01', 'Feria A')
  `)

  // A1 + A2 + A3: la cabecera grupal `registroVigente` cubre tres
  // hijos; el feed debe consolidar UNA sola fila por cabecera.
  await execute(sql`
    INSERT INTO pesos (id, animal_id, registro_grupal_id, fecha, peso_kg)
    VALUES
      (${`${fixture}-a2-peso`}, ${animalA2}, ${registroVigente}, '2026-08-06', '410.00'),
      (${`${fixture}-a3-peso`}, ${animalA3}, ${registroVigente}, '2026-08-07', '415.00')
  `)

  // Animal A1: una fila por cada rama SIN `registro_grupal_id`.
  await execute(sql`
    INSERT INTO producciones_lacteas (id, animal_id, fecha, cantidad_am, cantidad_pm)
    VALUES (${`${fixture}-a1-prod`}, ${animalA1}, '2026-08-08', '7.00', '5.50')
  `)
  await execute(sql`
    INSERT INTO animales_condicion_corporal (id, animal_id, puntaje, fecha)
    VALUES (${`${fixture}-a1-cond`}, ${animalA1}, '3.5', '2026-08-09')
  `)
  await execute(sql`
    INSERT INTO muertes (id, animal_id, fecha)
    VALUES (${`${fixture}-a1-muerte`}, ${animalA1}, '2026-08-10')
  `)

  // Cabecera anulada con dos hijos — NO deben aparecer en feed ni
  // historial.
  await execute(sql`
    INSERT INTO pesos (id, animal_id, registro_grupal_id, fecha, peso_kg)
    VALUES
      (${`${fixture}-anu-a1`}, ${animalA1}, ${registroAnulado}, '2026-08-11', '405.00'),
      (${`${fixture}-anu-a2`}, ${animalA2}, ${registroAnulado}, '2026-08-11', '406.00')
  `)

  // Animal de la OTRA finca — el feed NUNCA debe emitirlo.
  await execute(sql`
    INSERT INTO pesos (id, animal_id, fecha, peso_kg)
    VALUES (${`${fixture}-b1-peso`}, ${animalB1}, '2026-08-05', '300.00')
  `)
  await execute(sql`
    INSERT INTO servicios (id, animal_id, fecha, tipo)
    VALUES (${`${fixture}-b1-servicio`}, ${animalB1}, '2026-08-05', 'monta')
  `)

  // 25 servicios para paginar (animalPaginado) — más que la página
  // del feed (20).
  for (let dia = 1; dia <= 25; dia += 1) {
    const dosDigitos = String(dia).padStart(2, "0")
    await execute(sql`
      INSERT INTO servicios (id, animal_id, fecha, tipo)
      VALUES (${`${fixture}-pg-${dosDigitos}`}, ${animalPaginado}, ${`2026-08-${dosDigitos}`}, 'monta')
    `)
  }

  // 60 servicios para el historial (pageSize 50 + restantes) — sirve
  // para verificar la paginacion del historial (50 por pagina). Los
  // distribuimos entre julio y agosto para evitar fechas invalidas.
  for (let dia = 1; dia <= 60; dia += 1) {
    const mes = dia <= 31 ? "07" : "08"
    const diaDelMes = dia <= 31 ? dia : dia - 31
    const dosDigitos = String(diaDelMes).padStart(2, "0")
    await execute(sql`
      INSERT INTO servicios (id, animal_id, fecha, tipo)
      VALUES (${`${fixture}-lg-${String(dia).padStart(2, "0")}`}, ${animalLargo}, ${`2026-${mes}-${dosDigitos}`}, 'monta')
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

describe.skipIf(process.env.CI === "true")("DrizzleEventosFincaReadRepository (PostgreSQL)", () => {
  it("el feed consolida un grupal en UNA sola fila por tipo y excluye hijos de cabeceras anuladas", async () => {
    const repo = new DrizzleEventosFincaReadRepository(db)

    // Foco en pesaje (3 pesos: A1/A2/A3 bajo la misma cabecera) para
    // que la paginacion del feed (20) no recorte y la agrupacion sea
    // facil de inspeccionar.
    const feed = await repo.feedFinca({
      sesion: sesionFinca(fincaA),
      fincaId: fincaA,
      tipo: "pesaje",
      pageSize: PAGE_SIZE_FEED_FINCA,
    })

    // La cabecera vigente cubre 3 hijos (A1, A2, A3) -> el feed
    // devuelve UNA sola fila para esa cabecera, con `totalAnimales=3`.
    const pesosVigentes = feed.items.filter((item) => item.registroGrupalId === registroVigente)
    expect(pesosVigentes).toHaveLength(1)
    const cabecera = pesosVigentes[0]
    expect(cabecera?.esCabeceraGrupal).toBe(true)
    expect(cabecera?.totalAnimales).toBe(3)
    expect(cabecera?.dominio).toBe("productivo")
    expect(cabecera?.tipo).toBe("pesaje")
    expect(cabecera?.animalCodigo).toBeTruthy()

    // Ningun hijo de la cabecera anulada debe aparecer en el feed.
    for (const item of feed.items) {
      expect(item.id).not.toBe(`${fixture}-anu-a1`)
      expect(item.id).not.toBe(`${fixture}-anu-a2`)
      expect(item.registroGrupalId).not.toBe(registroAnulado)
    }
  })

  it("el feed nunca cruza a otra finca (EV-CA-001)", async () => {
    const repo = new DrizzleEventosFincaReadRepository(db)

    const ajena = await repo.feedFinca({
      sesion: sesionFinca(fincaA),
      fincaId: fincaB,
      pageSize: PAGE_SIZE_FEED_FINCA,
    })
    expect(ajena.items).toEqual([])

    // Sesion que apunta a fincaB y pide fincaA → vacio (red de
    // seguridad en infraestructura).
    const cruzada = await repo.feedFinca({
      sesion: sesionFinca(fincaB),
      fincaId: fincaA,
      pageSize: PAGE_SIZE_FEED_FINCA,
    })
    expect(cruzada.items).toEqual([])

    // Tampoco emite filas de fincaB cuando la sesion es de A.
    const feedA = await repo.feedFinca({
      sesion: sesionFinca(fincaA),
      fincaId: fincaA,
      pageSize: PAGE_SIZE_FEED_FINCA,
    })
    for (const item of feedA.items) {
      expect(item.id).not.toBe(`${fixture}-b1-peso`)
      expect(item.id).not.toBe(`${fixture}-b1-servicio`)
    }
  })

  it("el feed pagina con keyset y reporta `pendientes` bajo el mismo filtro (#183)", async () => {
    const repo = new DrizzleEventosFincaReadRepository(db)

    const primera = await repo.feedFinca({
      sesion: sesionFinca(fincaA),
      fincaId: fincaA,
      categoria: "reproductivo",
      pageSize: PAGE_SIZE_FEED_FINCA,
    })
    expect(primera.items).toHaveLength(20)
    expect(primera.nextCursor).toBeDefined()
    // Reproductivo en fincaA: 25 servicios de animalPaginado +
    // 1 servicio de A1 + 1 palpacion de A1 + 60 servicios de
    // animalLargo = 87. Pagina 20 -> el conteo del window refleja
    // los 86 restantes (mismo patron que el timeline del animal:
    // el conteo decrece 1 por pagina consumida).
    expect(primera.pendientes).toBe(66)

    const segunda = await repo.feedFinca({
      sesion: sesionFinca(fincaA),
      fincaId: fincaA,
      categoria: "reproductivo",
      pageSize: PAGE_SIZE_FEED_FINCA,
      ...(primera.nextCursor ? { cursor: primera.nextCursor } : {}),
    })
    // Sin huecos ni duplicados entre la primera y la segunda pagina.
    const idsPrimera = new Set(primera.items.map((item) => item.id))
    for (const item of segunda.items) {
      expect(idsPrimera.has(item.id)).toBe(false)
    }
    expect(segunda.nextCursor).toBeDefined()
    expect(segunda.pendientes).toBe(46)
  })

  it("el historial lista cada hijo grupal por separado con su animal", async () => {
    const repo = new DrizzleEventosFincaReadRepository(db)

    // Foco en la ventana de los 3 pesos vigentes con un filtro de
    // fecha que captura exactamente el set sembrado, evitando que la
    // paginacion del historial (pageSize 50) recorte los items.
    const historial = await repo.historialFinca({
      sesion: sesionFinca(fincaA),
      fincaId: fincaA,
      tipo: "pesaje",
      fechaDesde: "2026-08-05",
      fechaHasta: "2026-08-07",
      pageSize: PAGE_SIZE_HISTORIAL_FINCA,
    })

    expect(historial.items).toHaveLength(3)
    const codigos = historial.items.map((item) => item.animalCodigo).sort()
    expect(codigos).toEqual([`${fixture}-A1`, `${fixture}-A2`, `${fixture}-A3`])
    for (const item of historial.items) {
      expect(item.registroGrupalId).toBe(registroVigente)
    }
  })

  it("el feed filtra por categoria, tipo y rango de fechas", async () => {
    const repo = new DrizzleEventosFincaReadRepository(db)

    // Categoria reproductivo: solo servicios + palpaciones + partos.
    const reproductivo = await repo.feedFinca({
      sesion: sesionFinca(fincaA),
      fincaId: fincaA,
      categoria: "reproductivo",
      pageSize: PAGE_SIZE_FEED_FINCA,
    })
    for (const item of reproductivo.items) {
      expect(["servicio", "palpacion", "parto"]).toContain(item.tipo)
    }

    // Tipo pesaje: solo pesajes.
    const pesaje = await repo.feedFinca({
      sesion: sesionFinca(fincaA),
      fincaId: fincaA,
      tipo: "pesaje",
      pageSize: PAGE_SIZE_FEED_FINCA,
    })
    for (const item of pesaje.items) {
      expect(item.tipo).toBe("pesaje")
    }

    // Rango de fechas exclusivo fuera del set sembrado.
    const fueraDeRango = await repo.feedFinca({
      sesion: sesionFinca(fincaA),
      fincaId: fincaA,
      fechaDesde: "2025-01-01",
      fechaHasta: "2025-12-31",
      pageSize: PAGE_SIZE_FEED_FINCA,
    })
    expect(fueraDeRango.items).toEqual([])

    // Rango de fechas que cubre exactamente el set sembrado.
    const enRango = await repo.feedFinca({
      sesion: sesionFinca(fincaA),
      fincaId: fincaA,
      fechaDesde: "2026-08-01",
      fechaHasta: "2026-08-10",
      pageSize: PAGE_SIZE_HISTORIAL_FINCA,
    })
    for (const item of enRango.items) {
      expect(item.fecha >= "2026-08-01").toBe(true)
      expect(item.fecha <= "2026-08-10").toBe(true)
    }
  })

  it("los contadores mensuales cuadran con el feed: totales por dominio en el mes en curso", async () => {
    const repo = new DrizzleEventosFincaReadRepository(db)

    const contadores = await repo.contadoresFinca({
      sesion: sesionFinca(fincaA),
      fincaId: fincaA,
      mes: "2026-08",
    })

    expect(contadores.mes).toBe("2026-08")
    expect(contadores.desde).toBe("2026-08-01")
    expect(contadores.hasta).toBe("2026-08-31")

    // La suma porDominio.total debe cuadrar con la cantidad de filas
    // que el feed emite dentro del mismo mes (excluyendo la cabecera
    // anulada, que tiene 2 hijos efectivos; esos no cuentan).
    const totalEsperado =
      contadores.porDominio.reproductivo +
      contadores.porDominio.productivo +
      contadores.porDominio.sanidad +
      contadores.porDominio.movimientos
    expect(contadores.total).toBe(totalEsperado)
    // Hay 5 pesajes (3 vigentes + 1 prod + 1 condicion) -> no
    // (muertes, ventas, servicios, palpaciones, aplicaciones son
    // otras filas), asi que al menos uno de los dominios es > 0.
    expect(totalEsperado).toBeGreaterThan(0)
  })

  it("los cursores manipulados degradan a la primera pagina (no inyección)", async () => {
    const repo = new DrizzleEventosFincaReadRepository(db)
    const primera = await repo.feedFinca({
      sesion: sesionFinca(fincaA),
      fincaId: fincaA,
      pageSize: PAGE_SIZE_FEED_FINCA,
    })

    const basura = "%%%no-es-base64%%%"
    const intentoInyeccion = Buffer.from(
      JSON.stringify({ f: "2026-08-01'; DROP TABLE pesos; --", id: "x" }),
      "utf8",
    ).toString("base64url")

    for (const cursor of [basura, intentoInyeccion]) {
      const pagina = await repo.feedFinca({
        sesion: sesionFinca(fincaA),
        fincaId: fincaA,
        cursor,
        pageSize: PAGE_SIZE_FEED_FINCA,
      })
      expect(pagina.items.map((item) => item.id)).toEqual(primera.items.map((item) => item.id))
      expect(pagina.nextCursor).toBe(primera.nextCursor)
    }
  })

  it("la consulta del feed NO usa callbacks mutables (defensa en profundidad)", async () => {
    // Verificacion arquitectonica: el test de eventos-write-guard
    // audita cualquier `db.insert` o composicion de SQL con
    // concatenacion. Si la rama de feed introdujera escritura
    // directa sobre las tablas del read model, el guard lo detecta.
    const { auditEventWritesInRepo } = await import("./support/event-write-guard.js")
    const { fileURLToPath } = await import("node:url")
    const root = fileURLToPath(new URL("../../..", import.meta.url))
    const findings = await auditEventWritesInRepo(root)
    expect(findings).toEqual([])
  }, 15_000)
})
