/**
 * Smoke test del adaptador de Sanidad (Issue #208) contra Postgres REAL.
 *
 * Sigue el patrón de `maestro-escritura-smoke.test.ts`:
 * `describe.skipIf(!dbSmoke)` con `DB_SMOKE=true` + `DATABASE_URL`, fixtures
 * creados en beforeAll y limpiados en afterAll.
 *
 * Prueba lo que sólo vive en el SQL real:
 * - Vista `inventario_sanitario` (migración 0007): stock calculado RN-041 y
 *   exclusión de filas de grupos anulados (RN-051).
 * - Transacción de escritura: cabecera `registros_grupales` + filas hijas
 *   (RN-052) y snapshot de precio (RN-040).
 * - Anulación grupal en una transacción (RN-051).
 * - Mapeo de estado/fechas del animal para RN-002/RN-003 (epoch → ISO).
 *
 * La BD de CI está recién migrada SIN seed; los fixtures son autocontenidos
 * con ids aleatorios.
 *
 * Ejecución local (la vista 0007 debe estar aplicada):
 *   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ganaweb \
 *   DB_SMOKE=true pnpm --filter @ganaweb/db exec vitest run \
 *     tests/sanidad-postgres.test.ts
 */
import { and, desc, eq, inArray } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createClient } from "../src/client.js"
import { DrizzleSanidadAdapter } from "../src/sanidad-infrastructure.js"
import {
  almacenEntradas,
  animales,
  aplicacionesSanitarias,
  fincas,
  muertes,
  notificaciones,
  productosSanitarios,
  registrosGrupales,
  syncOutbox,
  usuarios,
  ventas,
} from "../src/schema/index.js"

const dbSmoke = process.env.DB_SMOKE === "true"

describe.skipIf(!dbSmoke)("Issue #208: sanidad (smoke Postgres)", () => {
  const sufijo = crypto.randomUUID().slice(0, 8)
  const fincaId = `finca-san-${sufijo}`
  const productoAftosaId = `prod-aftosa-${sufijo}`
  const productoIvermId = `prod-iverm-${sufijo}`
  const animalEnFincaId = `animal-enfinca-${sufijo}`
  const animalVendidoId = `animal-vendido-${sufijo}`
  const animalCompraId = `animal-compra-${sufijo}`
  const entradaAftosaId = `ent-aftosa-${sufijo}`
  const usuarioId = `user-san-${sufijo}`

  let db: ReturnType<typeof createClient>
  let adaptador: DrizzleSanidadAdapter

  beforeAll(async () => {
    db = createClient(process.env.DATABASE_URL)
    adaptador = new DrizzleSanidadAdapter(db)

    await db.insert(fincas).values({
      id: fincaId,
      codigo: `SAN-${sufijo.toUpperCase()}`,
      nombre: "Finca Sanidad Test",
      activo: 1,
    })

    // PE-006: todo insert de evento lleva usuario_creado_por.
    await db.insert(usuarios).values({
      id: usuarioId,
      nombre: "Usuario Sanidad Test",
      email: `sanidad-${sufijo}@ganaweb.test`,
    })

    await db.insert(productosSanitarios).values([
      {
        id: productoAftosaId,
        fincaId,
        codigo: "VAC-AFTOSA",
        descripcion: "Vacuna fiebre aftosa",
        mlMgPorDosis: "2",
        tipoTratamiento: "vacuna",
        precioDosis: "3500",
        activo: 1,
      },
      {
        id: productoIvermId,
        fincaId,
        codigo: "IVERMECTINA",
        descripcion: "Ivermectina 1%",
        mlMgPorDosis: "1",
        tipoTratamiento: "no_reproductivo",
        precioDosis: "1800",
        activo: 1,
      },
    ])

    await db.insert(animales).values([
      {
        id: animalEnFincaId,
        fincaId,
        codigo: `SAN-001-${sufijo}`,
        fechaNacimiento: 1615507200, // 2021-03-12 (epoch segundos, UTC)
        estadoAnimalKey: 0,
      },
      {
        id: animalVendidoId,
        fincaId,
        codigo: `SAN-002-${sufijo}`,
        fechaNacimiento: 1615507200,
        estadoAnimalKey: 1,
      },
      {
        id: animalCompraId,
        fincaId,
        codigo: `SAN-003-${sufijo}`,
        fechaCompra: 1755648000, // 2025-08-20
        tipoIngresoId: 1,
        estadoAnimalKey: 0,
      },
    ])

    await db.insert(ventas).values({
      id: `venta-${sufijo}`,
      animalId: animalVendidoId,
      fecha: "2026-07-10",
    })

    await db.insert(almacenEntradas).values({
      id: entradaAftosaId,
      productoId: productoAftosaId,
      fecha: "2026-06-01",
      dosis: 150,
      precioPorDosis: "3500",
      usuarioCreadoPor: usuarioId,
    })
  })

  afterAll(async () => {
    await db
      .delete(aplicacionesSanitarias)
      .where(inArray(aplicacionesSanitarias.productoId, [productoAftosaId, productoIvermId]))
    await db.delete(registrosGrupales).where(eq(registrosGrupales.fincaId, fincaId))
    // Issue #211: registrarAplicaciones ahora escribe filas sync_outbox.
    await db.delete(syncOutbox).where(eq(syncOutbox.fincaId, fincaId))
    await db.delete(almacenEntradas).where(eq(almacenEntradas.id, entradaAftosaId))
    await db.delete(ventas).where(eq(ventas.animalId, animalVendidoId))
    await db.delete(animales).where(eq(animales.fincaId, fincaId))
    await db.delete(productosSanitarios).where(eq(productosSanitarios.fincaId, fincaId))
    await db.delete(fincas).where(eq(fincas.id, fincaId))
    await db.delete(usuarios).where(eq(usuarios.id, usuarioId))
    await db.$client.end()
  })

  it("RN-041: obtenerStockDisponible lee la vista inventario_sanitario (Σ entradas − Σ aplicaciones)", async () => {
    expect(await adaptador.obtenerStockDisponible(productoAftosaId)).toBe(150)
    expect(await adaptador.obtenerStockDisponible(productoIvermId)).toBe(0)
    expect(await adaptador.obtenerStockDisponible("prod-inexistente")).toBe(0)
  })

  it("RN-040/RN-052: registro individual guarda snapshot de precio y sin cabecera", async () => {
    const resultado = await adaptador.registrarAplicaciones({
      fincaId,
      registroGrupal: null,
      aplicaciones: [
        {
          animalId: animalEnFincaId,
          productoId: productoAftosaId,
          fecha: "2026-06-05",
          dosis: 2,
          precioDosis: 3500,
          proximaDosis: "2026-12-05",
          comentarios: null,
          registroGrupalId: null,
        },
      ],
      usuarioCreadoPor: usuarioId,
    })

    expect(resultado.tipo).toBe("aplicado")
    if (resultado.tipo === "aplicado") {
      expect(resultado.aplicacionIds).toHaveLength(1)
    }

    expect(await adaptador.obtenerStockDisponible(productoAftosaId)).toBe(148)

    const filas = await db
      .select()
      .from(aplicacionesSanitarias)
      .where(eq(aplicacionesSanitarias.productoId, productoAftosaId))
    expect(filas).toHaveLength(1)
    // numeric(14,2): Postgres normaliza el snapshot a escala 2.
    expect(filas[0]?.precioDosis).toBe("3500.00")
    expect(filas[0]?.registroGrupalId).toBeNull()
  })

  it("RN-052: registro grupal crea cabecera tratamiento + N hijas en una transacción", async () => {
    const grupoId = `rg-san-${sufijo}`
    const resultado = await adaptador.registrarAplicaciones({
      fincaId,
      registroGrupal: {
        id: grupoId,
        fincaId,
        tipoEvento: "tratamiento",
        totalAnimales: 2,
        fecha: new Date("2026-06-20T09:00:00-05:00"),
        usuarioCreadoPor: usuarioId,
        descripcion: "Vacunación lote",
      },
      aplicaciones: [animalEnFincaId, animalCompraId].map((animalId) => ({
        animalId,
        productoId: productoAftosaId,
        fecha: "2026-06-20",
        dosis: 2,
        precioDosis: 3500,
        proximaDosis: "2026-12-20",
        comentarios: "Vacunación lote",
        registroGrupalId: grupoId,
      })),
      usuarioCreadoPor: usuarioId,
    })

    expect(resultado.tipo).toBe("aplicado")
    if (resultado.tipo === "aplicado") {
      expect(resultado.aplicacionIds).toHaveLength(2)
    }

    const [cabecera] = await db
      .select()
      .from(registrosGrupales)
      .where(eq(registrosGrupales.id, grupoId))
    expect(cabecera?.tipoEvento).toBe("tratamiento")
    expect(cabecera?.totalAnimales).toBe(2)
    expect(cabecera?.anuladoEn).toBeNull()

    // 1 individual + 2 grupales = 3 aplicaciones → 150 − 6 = 144.
    expect(await adaptador.obtenerStockDisponible(productoAftosaId)).toBe(144)
  })

  it("RN-042: listarAplicacionesPrevias devuelve las aplicaciones no anuladas del producto", async () => {
    const previas = await adaptador.listarAplicacionesPrevias(productoAftosaId, [
      animalEnFincaId,
      animalCompraId,
    ])

    expect(previas.length).toBe(3)
    for (const previa of previas) {
      expect(previa.proximaDosis).not.toBeNull()
    }
  })

  it("RN-051: anular el grupo excluye sus filas del stock y de las previas, en una transacción", async () => {
    const grupoId = `rg-san-${sufijo}`

    const resultado = await adaptador.anularRegistroGrupal(
      grupoId,
      fincaId,
      new Date(),
      usuarioId,
      "Captura errada",
    )
    expect(resultado.tipo).toBe("anulado")

    const [cabecera] = await db
      .select()
      .from(registrosGrupales)
      .where(eq(registrosGrupales.id, grupoId))
    expect(cabecera?.anuladoEn).not.toBeNull()

    // Las 2 dosis×2 del grupo anulado salen del stock: 144 + 4 = 148.
    expect(await adaptador.obtenerStockDisponible(productoAftosaId)).toBe(148)

    const previas = await adaptador.listarAplicacionesPrevias(productoAftosaId, [
      animalEnFincaId,
      animalCompraId,
    ])
    expect(previas.length).toBe(1)
    expect(previas[0]?.animalId).toBe(animalEnFincaId)
  })

  it("RN-051: anular dos veces el mismo grupo devuelve conflicto; otra finca → no_encontrado", async () => {
    const grupoId = `rg-san-${sufijo}`

    const repetido = await adaptador.anularRegistroGrupal(
      grupoId,
      fincaId,
      new Date(),
      usuarioId,
      "Captura errada",
    )
    expect(repetido.tipo).toBe("conflicto")

    const ajeno = await adaptador.anularRegistroGrupal(
      grupoId,
      "finca-ajena",
      new Date(),
      usuarioId,
      "Captura errada",
    )
    expect(ajeno.tipo).toBe("no_encontrado")

    const inexistente = await adaptador.anularRegistroGrupal(
      "rg-no-existe",
      fincaId,
      new Date(),
      usuarioId,
      "Captura errada",
    )
    expect(inexistente.tipo).toBe("no_encontrado")
  })

  it("RN-002/RN-003: obtenerAnimales mapea epoch→ISO y fecha de salida del animal vendido", async () => {
    const animalesEvento = await adaptador.obtenerAnimales([
      animalEnFincaId,
      animalVendidoId,
      animalCompraId,
      "animal-inexistente",
    ])

    expect(animalesEvento).toHaveLength(3)
    const porId = new Map(animalesEvento.map((animal) => [animal.id, animal]))

    const enFinca = porId.get(animalEnFincaId)
    expect(enFinca?.estadoActual).toBe("en_finca")
    expect(enFinca?.fechaNacimiento).toBe("2021-03-12")
    expect(enFinca?.fechaSalida).toBeNull()

    const vendido = porId.get(animalVendidoId)
    expect(vendido?.estadoActual).toBe("vendido")
    expect(vendido?.fechaSalida).toBe("2026-07-10")

    const comprado = porId.get(animalCompraId)
    expect(comprado?.fechaCompra).toBe("2025-08-20")
    expect(comprado?.fechaNacimiento).toBeNull()
  })

  it("conflicto: registrar una aplicación con FK inexistente no escribe nada", async () => {
    const resultado = await adaptador.registrarAplicaciones({
      fincaId,
      registroGrupal: null,
      aplicaciones: [
        {
          animalId: "animal-inexistente",
          productoId: productoAftosaId,
          fecha: "2026-06-05",
          dosis: 1,
          precioDosis: 3500,
          proximaDosis: null,
          comentarios: null,
          registroGrupalId: null,
        },
      ],
      usuarioCreadoPor: usuarioId,
    })

    expect(resultado.tipo).toBe("conflicto")
    expect(await adaptador.obtenerStockDisponible(productoAftosaId)).toBe(148)
  })
})

/**
 * Issue #210: almacén de entradas append-only (SAN-030..SAN-032) contra
 * Postgres REAL. Mismo patrón `describe.skipIf(!dbSmoke)` que el bloque #208.
 *
 * Prueba lo que sólo vive en el SQL real:
 * - T-002: la entrada y su fila `sync_outbox` se escriben en la MISMA
 *   transacción (una FK inválida no deja escrita ninguna de las dos).
 * - RN-041/SAN-031: tras la entrada, el stock de la vista
 *   `inventario_sanitario` coincide.
 * - SAN-063/SAN-014: `listarEntradasAlmacen` acota por finca vía el join con
 *   `productos_sanitarios` (la tabla no tiene `finca_id`) y ordena por fecha.
 */
describe.skipIf(!dbSmoke)("Issue #210: almacén de entradas (smoke Postgres)", () => {
  const sufijo = crypto.randomUUID().slice(0, 8)
  const fincaId = `finca-alm-${sufijo}`
  const fincaAjenaId = `finca-ajena-alm-${sufijo}`
  const productoId = `prod-alm-${sufijo}`
  const productoAjenoId = `prod-ajeno-${sufijo}`
  const usuarioId = `user-alm-${sufijo}`

  let db: ReturnType<typeof createClient>
  let adaptador: DrizzleSanidadAdapter

  async function contarOutboxDeFinca(fid: string): Promise<number> {
    const filas = await db
      .select({ id: syncOutbox.id })
      .from(syncOutbox)
      .where(eq(syncOutbox.fincaId, fid))
    return filas.length
  }

  async function contarOutboxAlmacen(fid: string): Promise<number> {
    const filas = await db
      .select({ id: syncOutbox.id })
      .from(syncOutbox)
      .where(and(eq(syncOutbox.fincaId, fid), eq(syncOutbox.tablaDestino, "almacen_entradas")))
    return filas.length
  }

  beforeAll(async () => {
    db = createClient(process.env.DATABASE_URL)
    adaptador = new DrizzleSanidadAdapter(db)

    await db.insert(fincas).values([
      {
        id: fincaId,
        codigo: `ALM-${sufijo.toUpperCase()}`,
        nombre: "Finca Almacén Test",
        activo: 1,
      },
      { id: fincaAjenaId, codigo: `AJE-${sufijo.toUpperCase()}`, nombre: "Finca Ajena", activo: 1 },
    ])

    await db.insert(usuarios).values({
      id: usuarioId,
      nombre: "Usuario Almacén Test",
      email: `almacen-${sufijo}@ganaweb.test`,
    })

    await db.insert(productosSanitarios).values([
      {
        id: productoId,
        fincaId,
        codigo: "VAC-BRUCELOSIS",
        descripcion: "Vacuna brucelosis",
        mlMgPorDosis: "2",
        tipoTratamiento: "vacuna",
        precioDosis: "4200",
        activo: 1,
      },
      {
        id: productoAjenoId,
        fincaId: fincaAjenaId,
        codigo: "VAC-AJENA",
        descripcion: "Vacuna finca ajena",
        mlMgPorDosis: "1",
        tipoTratamiento: "vacuna",
        precioDosis: "1000",
        activo: 1,
      },
    ])
  })

  afterAll(async () => {
    await db.delete(syncOutbox).where(inArray(syncOutbox.fincaId, [fincaId, fincaAjenaId]))
    await db
      .delete(almacenEntradas)
      .where(inArray(almacenEntradas.productoId, [productoId, productoAjenoId]))
    await db
      .delete(productosSanitarios)
      .where(inArray(productosSanitarios.id, [productoId, productoAjenoId]))
    await db.delete(fincas).where(inArray(fincas.id, [fincaId, fincaAjenaId]))
    await db.delete(usuarios).where(eq(usuarios.id, usuarioId))
    await db.$client.end()
  })

  it("T-002/SAN-030: registrarEntradaAlmacen escribe la entrada + fila sync_outbox en la misma transacción", async () => {
    const outboxAntes = await contarOutboxAlmacen(fincaId)

    const resultado = await adaptador.registrarEntradaAlmacen({
      fincaId,
      productoId,
      fecha: "2026-08-01",
      dosis: 80,
      precioPorDosis: 4200,
      comentario: "Compra inicial",
      usuarioCreadoPor: usuarioId,
    })

    expect(resultado.tipo).toBe("registrada")
    if (resultado.tipo !== "registrada") return
    const entradaId = resultado.id

    const filasEntrada = await db
      .select()
      .from(almacenEntradas)
      .where(eq(almacenEntradas.id, entradaId))
    expect(filasEntrada).toHaveLength(1)
    expect(filasEntrada[0]?.productoId).toBe(productoId)
    expect(filasEntrada[0]?.fecha).toBe("2026-08-01")
    expect(filasEntrada[0]?.dosis).toBe(80)
    // numeric(14,2): Postgres normaliza el precio a escala 2.
    expect(filasEntrada[0]?.precioPorDosis).toBe("4200.00")
    expect(filasEntrada[0]?.comentario).toBe("Compra inicial")
    expect(filasEntrada[0]?.usuarioCreadoPor).toBe(usuarioId)

    // La fila sync_outbox de la entrada, en la misma finca y sin aplicar aún.
    const filasOutbox = await db
      .select()
      .from(syncOutbox)
      .where(and(eq(syncOutbox.fincaId, fincaId), eq(syncOutbox.tablaDestino, "almacen_entradas")))
    expect(filasOutbox.length).toBe(outboxAntes + 1)
    const filaOutbox = filasOutbox.find((fila) => {
      const payload = fila.payload as { id?: string }
      return payload.id === entradaId
    })
    expect(filaOutbox).toBeDefined()
    expect(filaOutbox?.operacion).toBe("INSERT")
    expect(filaOutbox?.aplicadoEn).toBeNull()
  })

  it("RN-041/SAN-031: tras la entrada, el stock de inventario_sanitario coincide", async () => {
    expect(await adaptador.obtenerStockDisponible(productoId)).toBe(80)

    await adaptador.registrarEntradaAlmacen({
      fincaId,
      productoId,
      fecha: "2026-08-02",
      dosis: 20,
      precioPorDosis: null,
      comentario: null,
      usuarioCreadoPor: usuarioId,
    })

    expect(await adaptador.obtenerStockDisponible(productoId)).toBe(100)
  })

  it("T-002: FK inexistente → conflicto, sin escribir entrada ni outbox", async () => {
    const outboxAntes = await contarOutboxDeFinca(fincaId)

    const resultado = await adaptador.registrarEntradaAlmacen({
      fincaId,
      productoId: "prod-no-existe",
      fecha: "2026-08-03",
      dosis: 5,
      precioPorDosis: null,
      comentario: null,
      usuarioCreadoPor: usuarioId,
    })

    expect(resultado.tipo).toBe("conflicto")

    const filasEntrada = await db
      .select()
      .from(almacenEntradas)
      .where(eq(almacenEntradas.productoId, "prod-no-existe"))
    expect(filasEntrada).toHaveLength(0)
    expect(await contarOutboxDeFinca(fincaId)).toBe(outboxAntes)
  })

  it("SAN-063/SAN-014: listarEntradasAlmacen acota por finca (join producto) y ordena por fecha descendente", async () => {
    // Entrada de la finca ajena: no debe aparecer en el listado de fincaId.
    await adaptador.registrarEntradaAlmacen({
      fincaId: fincaAjenaId,
      productoId: productoAjenoId,
      fecha: "2026-08-05",
      dosis: 999,
      precioPorDosis: null,
      comentario: "Entrada ajena",
      usuarioCreadoPor: usuarioId,
    })

    const listado = await adaptador.listarEntradasAlmacen(fincaId)

    // 2 entradas propias (80 + 20); la ajena queda fuera por el join.
    expect(listado).toHaveLength(2)
    for (const fila of listado) {
      expect(fila.productoId).toBe(productoId)
      expect(fila.productoCodigo).toBe("VAC-BRUCELOSIS")
      expect(fila.productoDescripcion).toBe("Vacuna brucelosis")
    }
    // Orden fecha descendente: la del 2026-08-02 primero.
    expect(listado[0]?.fecha).toBe("2026-08-02")
    expect(listado[0]?.dosis).toBe(20)
    expect(listado[1]?.fecha).toBe("2026-08-01")
    expect(listado[1]?.dosis).toBe(80)
    expect(listado[1]?.precioPorDosis).toBe(4200)
    expect(listado[1]?.comentario).toBe("Compra inicial")

    const listadoAjeno = await adaptador.listarEntradasAlmacen(fincaAjenaId)
    expect(listadoAjeno).toHaveLength(1)
    expect(listadoAjeno[0]?.productoId).toBe(productoAjenoId)
  })
})

/**
 * Issue #211 (RN-060/T-002, §13.3/§13.8): `registrarAplicaciones` delega en
 * `persistirEventosInternos` (Issue #244) para escribir la captura
 * (cabecera `registros_grupales` si N>1 + filas hijas
 * `aplicaciones_sanitarias`) en UNA transacción. La emisión del outbox para
 * estos eventos queda en manos del contrato canónico (gap documentado;
 * ver `evento-write-internal.ts`).
 *
 * Prueba lo que sólo vive en el SQL real:
 * - N>1: cabecera con `total_animales = filas hijas` y N filas hijas, todo
 *   atómico.
 * - N=1: sin cabecera → sólo la fila hija.
 * - Atomicidad T-002: una FK inválida (producto inexistente) no deja
 *   escritas ni la cabecera ni las hijas (rollback completo del contrato).
 * - SAN-043/RN-003: `listarAnimalesEnFinca` filtra por estado a la fecha.
 */
describe.skipIf(!dbSmoke)(
  "Issue #211: registro de aplicación — contrato canónico y lectura EN_FINCA (smoke Postgres)",
  () => {
    const sufijo = crypto.randomUUID().slice(0, 8)
    const fincaId = `finca-out-${sufijo}`
    const fincaAjenaId = `finca-ajena-out-${sufijo}`
    const productoId = `prod-out-${sufijo}`
    const animalUnoId = `animal-out-1-${sufijo}`
    const animalDosId = `animal-out-2-${sufijo}`
    const animalVendidoAntesId = `animal-out-va-${sufijo}`
    const animalVendidoDespuesId = `animal-out-vd-${sufijo}`
    const animalMuertoAntesId = `animal-out-ma-${sufijo}`
    const animalAjenoId = `animal-out-aj-${sufijo}`
    const usuarioId = `user-out-${sufijo}`

    let db: ReturnType<typeof createClient>
    let adaptador: DrizzleSanidadAdapter

    beforeAll(async () => {
      db = createClient(process.env.DATABASE_URL)
      adaptador = new DrizzleSanidadAdapter(db)

      await db.insert(fincas).values([
        {
          id: fincaId,
          codigo: `OUT-${sufijo.toUpperCase()}`,
          nombre: "Finca Outbox Test",
          activo: 1,
        },
        {
          id: fincaAjenaId,
          codigo: `OAJ-${sufijo.toUpperCase()}`,
          nombre: "Finca Ajena Outbox",
          activo: 1,
        },
      ])

      await db.insert(usuarios).values({
        id: usuarioId,
        nombre: "Usuario Outbox Test",
        email: `outbox-${sufijo}@ganaweb.test`,
      })

      await db.insert(productosSanitarios).values({
        id: productoId,
        fincaId,
        codigo: "VAC-CARBUNCO",
        descripcion: "Vacuna carbunco",
        mlMgPorDosis: "2",
        tipoTratamiento: "vacuna",
        precioDosis: "2900",
        activo: 1,
      })

      await db.insert(animales).values([
        {
          id: animalUnoId,
          fincaId,
          codigo: `OUT-001-${sufijo}`,
          nombre: "Luna",
          fechaNacimiento: 1615507200,
          estadoAnimalKey: 0,
        },
        {
          id: animalDosId,
          fincaId,
          codigo: `OUT-002-${sufijo}`,
          nombre: "Sol",
          fechaNacimiento: 1615507200,
          estadoAnimalKey: 0,
        },
        {
          // Vendido ANTES de la fecha del evento → excluido (RN-003).
          id: animalVendidoAntesId,
          fincaId,
          codigo: `OUT-003-${sufijo}`,
          fechaNacimiento: 1615507200,
          estadoAnimalKey: 1,
        },
        {
          // Vendido DESPUÉS de la fecha del evento → incluido (RN-003).
          id: animalVendidoDespuesId,
          fincaId,
          codigo: `OUT-004-${sufijo}`,
          fechaNacimiento: 1615507200,
          estadoAnimalKey: 1,
        },
        {
          // Muerto ANTES de la fecha del evento → excluido (RN-003).
          id: animalMuertoAntesId,
          fincaId,
          codigo: `OUT-005-${sufijo}`,
          fechaNacimiento: 1615507200,
          estadoAnimalKey: 2,
        },
        {
          // Animal de otra finca → nunca aparece (SAN-063).
          id: animalAjenoId,
          fincaId: fincaAjenaId,
          codigo: `OAJ-001-${sufijo}`,
          fechaNacimiento: 1615507200,
          estadoAnimalKey: 0,
        },
      ])

      await db.insert(ventas).values([
        { id: `venta-va-${sufijo}`, animalId: animalVendidoAntesId, fecha: "2026-07-01" },
        { id: `venta-vd-${sufijo}`, animalId: animalVendidoDespuesId, fecha: "2026-08-20" },
      ])

      await db.insert(muertes).values({
        id: `muerte-ma-${sufijo}`,
        animalId: animalMuertoAntesId,
        fecha: "2026-07-15",
      })
    })

    afterAll(async () => {
      await db
        .delete(aplicacionesSanitarias)
        .where(eq(aplicacionesSanitarias.productoId, productoId))
      await db.delete(registrosGrupales).where(eq(registrosGrupales.fincaId, fincaId))
      await db.delete(syncOutbox).where(eq(syncOutbox.fincaId, fincaId))
      await db.delete(muertes).where(eq(muertes.animalId, animalMuertoAntesId))
      await db
        .delete(ventas)
        .where(inArray(ventas.animalId, [animalVendidoAntesId, animalVendidoDespuesId]))
      await db.delete(animales).where(inArray(animales.fincaId, [fincaId, fincaAjenaId]))
      await db.delete(productosSanitarios).where(eq(productosSanitarios.fincaId, fincaId))
      await db.delete(fincas).where(inArray(fincas.id, [fincaId, fincaAjenaId]))
      await db.delete(usuarios).where(eq(usuarios.id, usuarioId))
      await db.$client.end()
    })

    it("RN-052: N>1 escribe cabecera (total_animales = hijas) + N hijas en la misma transacción", async () => {
      const grupoId = `rg-out-${sufijo}`

      const resultado = await adaptador.registrarAplicaciones({
        fincaId,
        registroGrupal: {
          id: grupoId,
          fincaId,
          tipoEvento: "tratamiento",
          totalAnimales: 2,
          fecha: new Date("2026-08-03T09:00:00-05:00"),
          usuarioCreadoPor: usuarioId,
          descripcion: "Vacunación lote outbox",
        },
        aplicaciones: [animalUnoId, animalDosId].map((animalId) => ({
          animalId,
          productoId,
          fecha: "2026-08-03",
          dosis: 2,
          precioDosis: 2900,
          proximaDosis: "2027-02-03",
          comentarios: "Vacunación lote outbox",
          registroGrupalId: grupoId,
        })),
        usuarioCreadoPor: usuarioId,
      })

      expect(resultado.tipo).toBe("aplicado")
      if (resultado.tipo !== "aplicado") return
      expect(resultado.aplicacionIds).toHaveLength(2)

      // Cabecera RN-052: total_animales = filas hijas.
      const [cabecera] = await db
        .select()
        .from(registrosGrupales)
        .where(eq(registrosGrupales.id, grupoId))
      expect(cabecera?.tipoEvento).toBe("tratamiento")
      expect(cabecera?.totalAnimales).toBe(2)
      expect(cabecera?.usuarioCreadoPor).toBe(usuarioId)

      const hijas = await db
        .select()
        .from(aplicacionesSanitarias)
        .where(eq(aplicacionesSanitarias.registroGrupalId, grupoId))
      expect(hijas).toHaveLength(2)
      const idsHijasOrdenadas = [...hijas.map((h) => h.id)].sort()
      expect(idsHijasOrdenadas).toEqual([...resultado.aplicacionIds].sort())
      for (const hija of hijas) {
        expect(hija.productoId).toBe(productoId)
        expect(hija.fecha).toBe("2026-08-03")
        expect(Number(hija.dosis)).toBe(2)
        expect(Number(hija.precioDosis)).toBe(2900)
        expect(hija.proximaDosis).toBe("2027-02-03")
        expect(hija.comentarios).toBe("Vacunación lote outbox")
        expect(hija.usuarioCreadoPor).toBe(usuarioId)
      }
    })

    it("T-002: FK inexistente (producto) → conflicto, sin cabecera ni hijas (rollback del contrato)", async () => {
      const grupoId = `rg-out-fk-${sufijo}`

      const resultado = await adaptador.registrarAplicaciones({
        fincaId,
        registroGrupal: {
          id: grupoId,
          fincaId,
          tipoEvento: "tratamiento",
          totalAnimales: 2,
          fecha: new Date("2026-08-04T09:00:00-05:00"),
          usuarioCreadoPor: usuarioId,
          descripcion: null,
        },
        aplicaciones: [animalUnoId, animalDosId].map((animalId) => ({
          animalId,
          productoId: "prod-no-existe",
          fecha: "2026-08-04",
          dosis: 1,
          precioDosis: null,
          proximaDosis: null,
          comentarios: null,
          registroGrupalId: grupoId,
        })),
        usuarioCreadoPor: usuarioId,
      })

      expect(resultado.tipo).toBe("conflicto")

      // Atomicidad: el contrato hace rollback completo, ni cabecera ni hijas.
      const hijas = await db
        .select()
        .from(aplicacionesSanitarias)
        .where(eq(aplicacionesSanitarias.productoId, "prod-no-existe"))
      expect(hijas).toHaveLength(0)
      const [cabecera] = await db
        .select()
        .from(registrosGrupales)
        .where(eq(registrosGrupales.id, grupoId))
      expect(cabecera).toBeUndefined()
    })

    it("RN-052: N=1 sin cabecera → sólo la fila hija", async () => {
      const resultado = await adaptador.registrarAplicaciones({
        fincaId,
        registroGrupal: null,
        aplicaciones: [
          {
            animalId: animalUnoId,
            productoId,
            fecha: "2026-08-05",
            dosis: 1,
            precioDosis: 2900,
            proximaDosis: null,
            comentarios: null,
            registroGrupalId: null,
          },
        ],
        usuarioCreadoPor: usuarioId,
      })

      expect(resultado.tipo).toBe("aplicado")
      if (resultado.tipo !== "aplicado") return
      expect(resultado.aplicacionIds).toHaveLength(1)

      // Sin cabecera: no hay fila en registros_grupales.
      const grupoIdAusente = await db
        .select()
        .from(registrosGrupales)
        .where(eq(registrosGrupales.id, `rg-out-${resultado.aplicacionIds[0]}`))
      expect(grupoIdAusente).toHaveLength(0)

      // La hija queda con su animalId, sin registroGrupalId.
      const [hija] = await db
        .select()
        .from(aplicacionesSanitarias)
        .where(eq(aplicacionesSanitarias.id, resultado.aplicacionIds[0] ?? ""))
      expect(hija?.animalId).toBe(animalUnoId)
      expect(hija?.productoId).toBe(productoId)
      expect(hija?.registroGrupalId).toBeNull()
    })

    it("SAN-043/RN-003: listarAnimalesEnFinca devuelve solo los EN_FINCA a la fecha, con fila serializable {id, codigo, nombre}", async () => {
      // A 2026-08-01: el vendido el 2026-07-01 y el muerto el 2026-07-15 ya
      // salieron; el vendido el 2026-08-20 todavía estaba en la finca.
      const listado = await adaptador.listarAnimalesEnFinca(fincaId, "2026-08-01")

      const ids = listado.map((animal) => animal.id).sort()
      expect(ids).toEqual([animalDosId, animalUnoId, animalVendidoDespuesId].sort())

      // CM-042: la fila es serializable y trae sólo lo que el drawer necesita.
      const luna = listado.find((animal) => animal.id === animalUnoId)
      expect(luna).toEqual({ id: animalUnoId, codigo: `OUT-001-${sufijo}`, nombre: "Luna" })
      const vendidoDespues = listado.find((animal) => animal.id === animalVendidoDespuesId)
      expect(vendidoDespues?.codigo).toBe(`OUT-004-${sufijo}`)

      // SAN-063: los animales de otra finca nunca aparecen.
      expect(listado.some((animal) => animal.id === animalAjenoId)).toBe(false)
    })

    it("SAN-043/RN-003: a una fecha anterior a las salidas, los vendidos/muertos siguen listados", async () => {
      // A 2026-06-15 ninguno había salido: los 5 de la finca estaban.
      const listado = await adaptador.listarAnimalesEnFinca(fincaId, "2026-06-15")

      const ids = listado.map((animal) => animal.id).sort()
      expect(ids).toEqual(
        [
          animalUnoId,
          animalDosId,
          animalVendidoAntesId,
          animalVendidoDespuesId,
          animalMuertoAntesId,
        ].sort(),
      )
    })
  },
)

/**
 * T-002/D1: Transaction identity and rollback for notification insertion.
 *
 * Proves:
 * 1. `insertarNotificacionesEnTx` receives the exact transaction used for
 *    application/outbox writes — the notification rows are visible within
 *    the same transaction boundary.
 * 2. When notification insertion fails, persisted application rows, group
 *    rows, and notification rows are ALL rolled back (atomicity).
 *
 * Uses the real `DrizzleSanidadAdapter.registrarAplicaciones` path with
 * `persistirLoteConTransaccion` under the hood.
 */
describe.skipIf(!dbSmoke)(
  "T-002/D1: transaction identity and rollback for notification insertion (smoke Postgres)",
  () => {
    const sufijo = crypto.randomUUID().slice(0, 8)
    const fincaId = `finca-txid-${sufijo}`
    const productoId = `prod-txid-${sufijo}`
    const animalId = `animal-txid-${sufijo}`
    const usuarioId = `user-txid-${sufijo}`

    let db: ReturnType<typeof createClient>
    let adaptador: DrizzleSanidadAdapter

    beforeAll(async () => {
      db = createClient(process.env.DATABASE_URL)
      adaptador = new DrizzleSanidadAdapter(db)

      await db.insert(fincas).values({
        id: fincaId,
        codigo: `TXID-${sufijo.toUpperCase()}`,
        nombre: "Finca TX Identity Test",
        activo: 1,
      })

      await db.insert(usuarios).values({
        id: usuarioId,
        nombre: "Usuario TX Identity Test",
        email: `txid-${sufijo}@ganaweb.test`,
      })

      await db.insert(productosSanitarios).values({
        id: productoId,
        fincaId,
        codigo: "VAC-TXID",
        descripcion: "Vacuna TX Identity Test",
        mlMgPorDosis: "2",
        tipoTratamiento: "vacuna",
        precioDosis: "3500",
        activo: 1,
      })

      await db.insert(animales).values({
        id: animalId,
        fincaId,
        codigo: `TXID-001-${sufijo}`,
        nombre: "Animal TX Identity",
        fechaNacimiento: 1615507200,
        estadoAnimalKey: 0,
      })
    })

    afterAll(async () => {
      if (!db) return
      await db.delete(notificaciones).where(eq(notificaciones.fincaId, fincaId))
      await db
        .delete(aplicacionesSanitarias)
        .where(eq(aplicacionesSanitarias.productoId, productoId))
      await db.delete(registrosGrupales).where(eq(registrosGrupales.fincaId, fincaId))
      await db.delete(syncOutbox).where(eq(syncOutbox.fincaId, fincaId))
      await db.delete(animales).where(eq(animales.id, animalId))
      await db.delete(productosSanitarios).where(eq(productosSanitarios.id, productoId))
      await db.delete(usuarios).where(eq(usuarios.id, usuarioId))
      await db.delete(fincas).where(eq(fincas.id, fincaId))
      await db.$client.end()
    })

    it("T-002/D1: notification insertion receives the exact tx used for application writes (identity)", async () => {
      const notifPort = {
        insertarNotificacionesEnTx: async (
          tx: unknown,
          notificacionesNuevas: ReadonlyArray<{ readonly tipo: string }>,
        ) => {
          // tx is the Drizzle transaction client — cast and use it directly
          // to prove it's the same transaction used for application writes.
          // If it were a different tx, the insert would either fail or not
          // see the application rows (different transaction snapshot).
          const txClient = tx as ReturnType<typeof createClient>
          // Insert a marker row into notificaciones using the received tx.
          // If tx is valid and in the same transaction, this will succeed.
          await txClient.insert(notificaciones).values(
            notificacionesNuevas.map((n) => ({
              id: crypto.randomUUID(),
              fincaId,
              usuarioId,
              tipo: n.tipo,
              titulo: "TX Identity Test",
              mensaje: "TX Identity Test",
              entidadTipo: "aplicacion_sanitaria",
              entidadId: "txid-test",
              leida: 0,
              fechaEvento: Math.floor(Date.now() / 1000),
              activo: 1,
            })),
          )
        },
      }

      const resultado = await adaptador.registrarAplicaciones({
        fincaId,
        registroGrupal: null,
        aplicaciones: [
          {
            animalId,
            productoId,
            fecha: "2026-08-05",
            dosis: 1,
            precioDosis: 3500,
            proximaDosis: "2027-02-05",
            comentarios: null,
            registroGrupalId: null,
          },
        ],
        usuarioCreadoPor: usuarioId,
        notificaciones: notifPort,
        crearNotificaciones: (ids) =>
          ids.map((id) => ({
            fincaId,
            tipo: "refuerzo_vacuna",
            titulo: "Refuerzo pendiente",
            mensaje: "Test",
            entidadTipo: "aplicacion_sanitaria",
            entidadId: id,
            fechaEvento: Math.floor(Date.now() / 1000) + 86400 * 10,
            usuarioId,
          })),
      })

      expect(resultado.tipo).toBe("aplicado")
      if (resultado.tipo !== "aplicado") return

      // Application row was written
      const apps = await db
        .select()
        .from(aplicacionesSanitarias)
        .where(eq(aplicacionesSanitarias.productoId, productoId))
      expect(apps).toHaveLength(1)
      expect(apps[0]?.id).toBe(resultado.aplicacionIds[0])

      // Notification row was written by the port using the received tx
      const notifs = await db
        .select()
        .from(notificaciones)
        .where(eq(notificaciones.fincaId, fincaId))
      expect(notifs.length).toBeGreaterThanOrEqual(1)
      const txTestNotif = notifs.find((n) => n.titulo === "TX Identity Test")
      expect(txTestNotif).toBeDefined()
      expect(txTestNotif?.tipo).toBe("refuerzo_vacuna")
    })

    it("T-002/D1: notification insertion failure rolls back application rows, group rows, and notification rows (atomicity)", async () => {
      const grupoId = `rg-txid-fail-${sufijo}`
      const notifPort = {
        insertarNotificacionesEnTx: async () => {
          throw new Error("Simulated notification insertion failure")
        },
      }

      const resultado = await adaptador.registrarAplicaciones({
        fincaId,
        registroGrupal: {
          id: grupoId,
          fincaId,
          tipoEvento: "tratamiento",
          totalAnimales: 1,
          fecha: new Date("2026-08-05T09:00:00-05:00"),
          usuarioCreadoPor: usuarioId,
          descripcion: "TX rollback test",
        },
        aplicaciones: [
          {
            animalId,
            productoId,
            fecha: "2026-08-05",
            dosis: 1,
            precioDosis: 3500,
            proximaDosis: "2027-02-05",
            comentarios: null,
            registroGrupalId: grupoId,
          },
        ],
        usuarioCreadoPor: usuarioId,
        notificaciones: notifPort,
        crearNotificaciones: (ids) =>
          ids.map((id) => ({
            fincaId,
            tipo: "refuerzo_vacuna",
            titulo: "Refuerzo rollback",
            mensaje: "Should be rolled back",
            entidadTipo: "aplicacion_sanitaria",
            entidadId: id,
            fechaEvento: Math.floor(Date.now() / 1000) + 86400 * 10,
            usuarioId,
          })),
      })

      // The adapter catches the error and returns "error"
      expect(resultado.tipo).toBe("error")

      // Atomicity: no group row (rollback of cabecera)
      const cabecera = await db
        .select()
        .from(registrosGrupales)
        .where(eq(registrosGrupales.id, grupoId))
      expect(cabecera).toHaveLength(0)

      // Atomicity: no application rows (rollback of hijas)
      const hijas = await db
        .select()
        .from(aplicacionesSanitarias)
        .where(eq(aplicacionesSanitarias.registroGrupalId, grupoId))
      expect(hijas).toHaveLength(0)

      // Atomicity: no notification rows with this grupo's marker
      const notifs = await db
        .select()
        .from(notificaciones)
        .where(eq(notificaciones.fincaId, fincaId))
      const rollbackNotifs = notifs.filter((n) => n.titulo === "Refuerzo rollback")
      expect(rollbackNotifs).toHaveLength(0)
    })
  },
)
