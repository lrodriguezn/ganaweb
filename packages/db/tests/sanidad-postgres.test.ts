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
import { eq, inArray } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createClient } from "../src/client.js"
import { DrizzleSanidadAdapter } from "../src/sanidad-infrastructure.js"
import {
  almacenEntradas,
  animales,
  aplicacionesSanitarias,
  fincas,
  productosSanitarios,
  registrosGrupales,
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

    const resultado = await adaptador.anularRegistroGrupal(grupoId, fincaId, new Date())
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

    const repetido = await adaptador.anularRegistroGrupal(grupoId, fincaId, new Date())
    expect(repetido.tipo).toBe("conflicto")

    const ajeno = await adaptador.anularRegistroGrupal(grupoId, "finca-ajena", new Date())
    expect(ajeno.tipo).toBe("no_encontrado")

    const inexistente = await adaptador.anularRegistroGrupal("rg-no-existe", fincaId, new Date())
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
