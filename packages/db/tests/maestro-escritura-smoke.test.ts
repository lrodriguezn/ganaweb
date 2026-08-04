/**
 * Smoke test de escritura y conteos de maestros (issue #147,
 * RF-CONFIG-MAESTROS v1.0) contra Postgres REAL.
 *
 * Sigue el patrón de `duplicate-insert.test.ts`: `describe.skipIf(!dbSmoke)`
 * con `DB_SMOKE=true` + `DATABASE_URL`, fixtures creados en beforeAll y
 * limpiados en afterAll. La invariante UNIQUE (CM-032) y el rowCount real
 * viven en el schema SQL — solo un INSERT/UPDATE contra Postgres los prueba.
 *
 * La BD de CI está recién migrada SIN seed; la local puede tener seed. Por
 * eso los conteos de catálogos globales se afirman contra una línea base
 * leída antes de sembrar los fixtures (baseline + fixtures), y funcionan en
 * ambos entornos.
 *
 * Ejecución local:
 *   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ganaweb \
 *   DB_SMOKE=true pnpm --filter @ganaweb/db exec vitest run \
 *     tests/maestro-escritura-smoke.test.ts
 */

import type { FamiliaMaestro } from "@ganaweb/aplicacion"
import { eq, inArray, sql } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createClient } from "../src/client.js"
import { DrizzleConteosMaestrosAdapter } from "../src/conteos-maestros-infrastructure.js"
import { DrizzleMaestroEscrituraAdapter } from "../src/maestro-escritura-infrastructure.js"
import {
  causasMuerte,
  configCalidadAnimal,
  configRazas,
  configTiposExplotacion,
  diagnosticosVeterinarios,
  fincas,
  grupos,
  hierros,
  lotes,
  lugaresCompras,
  motivosVentas,
  potreros,
  propietarios,
  sectores,
  veterinarios,
} from "../src/schema/index.js"

const dbSmoke = process.env.DB_SMOKE === "true"

describe.skipIf(!dbSmoke)("Issue #147: escritura y conteos de maestros (smoke Postgres)", () => {
  const testFincaId = `finca-test-${crypto.randomUUID()}`
  const otraFincaId = `finca-test-otra-${crypto.randomUUID()}`
  const fincaConteosId = `finca-test-conteos-${crypto.randomUUID()}`
  const fincasTest = [testFincaId, otraFincaId, fincaConteosId]

  const fixtureRazaIds = [`raza-test-${crypto.randomUUID()}`, `raza-test-${crypto.randomUUID()}`]
  const fixtureTipoExplotacionId = `tipo-exp-test-${crypto.randomUUID()}`
  const fixtureCalidadIds = [
    `calidad-test-${crypto.randomUUID()}`,
    `calidad-test-${crypto.randomUUID()}`,
  ]

  let db: ReturnType<typeof createClient>
  let adapter: DrizzleMaestroEscrituraAdapter
  let conteos: DrizzleConteosMaestrosAdapter
  let baselineRazas = 0
  let baselineTiposExplotacion = 0
  let baselineCalidades = 0

  beforeAll(async () => {
    db = createClient(process.env.DATABASE_URL)
    adapter = new DrizzleMaestroEscrituraAdapter(db)
    conteos = new DrizzleConteosMaestrosAdapter(db)

    // Línea base de catálogos globales (la BD local puede tener seed).
    const [filaRazas] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(configRazas)
      .where(eq(configRazas.activo, 1))
    const [filaTipos] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(configTiposExplotacion)
      .where(eq(configTiposExplotacion.activo, 1))
    const [filaCalidades] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(configCalidadAnimal)
      .where(eq(configCalidadAnimal.activo, 1))
    baselineRazas = filaRazas?.n ?? 0
    baselineTiposExplotacion = filaTipos?.n ?? 0
    baselineCalidades = filaCalidades?.n ?? 0

    // Fixtures: fincas de prueba (tipo_explotacion_id null) + catálogos
    // globales (la BD de CI está recién migrada SIN seed).
    await db.insert(fincas).values([
      {
        id: testFincaId,
        codigo: `TST${testFincaId.slice(-6).toUpperCase()}`,
        nombre: "Finca Prueba Maestros",
        departamento: "Antioquia",
      },
      {
        id: otraFincaId,
        codigo: `TST${otraFincaId.slice(-6).toUpperCase()}`,
        nombre: "Finca Prueba Otra",
      },
      {
        id: fincaConteosId,
        codigo: `TST${fincaConteosId.slice(-6).toUpperCase()}`,
        nombre: "Finca Prueba Conteos",
        departamento: "Antioquia",
      },
    ])
    await db
      .insert(configRazas)
      .values(fixtureRazaIds.map((id, indice) => ({ id, nombre: `Raza Test ${indice}` })))
    await db.insert(configTiposExplotacion).values({
      id: fixtureTipoExplotacionId,
      nombre: "Tipo Explotación Test",
    })
    await db
      .insert(configCalidadAnimal)
      .values(fixtureCalidadIds.map((id, indice) => ({ id, nombre: `Calidad Test ${indice}` })))
  })

  afterAll(async () => {
    // Guard: si beforeAll falló (ej. DATABASE_URL ausente), db es undefined.
    if (!db) return

    // Limpieza de fixtures: RN-050 (nunca borrado físico) aplica al
    // producto, no a los fixtures de test. Primero los maestros (FK hacia
    // fincas), luego las fincas y por último los catálogos globales.
    const tablasMaestros = [
      veterinarios,
      propietarios,
      potreros,
      sectores,
      lotes,
      grupos,
      hierros,
      diagnosticosVeterinarios,
      motivosVentas,
      causasMuerte,
      lugaresCompras,
    ] as const
    for (const tabla of tablasMaestros) {
      await db.delete(tabla).where(inArray(tabla.fincaId, fincasTest))
    }
    await db.delete(fincas).where(inArray(fincas.id, fincasTest))
    await db.delete(configRazas).where(inArray(configRazas.id, fixtureRazaIds))
    await db
      .delete(configTiposExplotacion)
      .where(eq(configTiposExplotacion.id, fixtureTipoExplotacionId))
    await db.delete(configCalidadAnimal).where(inArray(configCalidadAnimal.id, fixtureCalidadIds))

    await db.$client.end()
  })

  it("ciclo completo potreros: crear → obtenerPorId → editar → cambiarEstado → listarNombresActivos", async () => {
    const creado = await adapter.crear("potreros", testFincaId, {
      codigo: "P-CICLO",
      nombre: "Potrero Ciclo",
      area_hectareas: 10.5,
    })
    expect(creado.tipo).toBe("creado")
    if (creado.tipo !== "creado") return

    const registro = await adapter.obtenerPorId("potreros", creado.id)
    expect(registro).toEqual({ id: creado.id, fincaId: testFincaId })

    const editado = await adapter.editar("potreros", testFincaId, creado.id, {
      nombre: "Potrero Ciclo Editado",
    })
    expect(editado.tipo).toBe("actualizado")
    const [filaEditada] = await db
      .select({ nombre: potreros.nombre, area: potreros.areaHectareas })
      .from(potreros)
      .where(eq(potreros.id, creado.id))
    expect(filaEditada?.nombre).toBe("Potrero Ciclo Editado")
    expect(filaEditada?.area).toBe(10.5)

    const inactivado = await adapter.cambiarEstado("potreros", testFincaId, creado.id, 0)
    expect(inactivado.tipo).toBe("estado_actualizado")
    const nombresInactivo = await adapter.listarNombresActivos("potreros", testFincaId)
    expect(nombresInactivo.some((registro) => registro.id === creado.id)).toBe(false)

    const reactivado = await adapter.cambiarEstado("potreros", testFincaId, creado.id, 1)
    expect(reactivado.tipo).toBe("estado_actualizado")
    const nombresActivo = await adapter.listarNombresActivos("potreros", testFincaId)
    expect(nombresActivo.some((registro) => registro.id === creado.id)).toBe(true)
  })

  it("conflicto UNIQUE: mismo codigo en la misma finca (CM-032)", async () => {
    const primero = await adapter.crear("potreros", testFincaId, {
      codigo: "P-DUP",
      nombre: "Potrero Dup A",
    })
    expect(primero.tipo).toBe("creado")

    const duplicado = await adapter.crear("potreros", testFincaId, {
      codigo: "P-DUP",
      nombre: "Potrero Dup B",
    })
    expect(duplicado).toEqual({ tipo: "conflicto", campo: "codigo" })
  })

  it("permite el mismo codigo en otra finca (la UNIQUE es por (finca_id, codigo))", async () => {
    const creado = await adapter.crear("potreros", otraFincaId, {
      codigo: "P-DUP",
      nombre: "Potrero Dup Otra Finca",
    })
    expect(creado.tipo).toBe("creado")
  })

  it("scope en el adaptador: editar/cambiarEstado con fincaId equivocado → no_encontrado", async () => {
    const creado = await adapter.crear("potreros", testFincaId, {
      codigo: "P-SCOPE",
      nombre: "Potrero Scope",
    })
    expect(creado.tipo).toBe("creado")
    if (creado.tipo !== "creado") return

    const editarOtraFinca = await adapter.editar("potreros", otraFincaId, creado.id, {
      nombre: "No debe cambiar",
    })
    expect(editarOtraFinca).toEqual({ tipo: "no_encontrado" })

    const estadoOtraFinca = await adapter.cambiarEstado("potreros", otraFincaId, creado.id, 0)
    expect(estadoOtraFinca).toEqual({ tipo: "no_encontrado" })

    const [fila] = await db
      .select({ nombre: potreros.nombre, activo: potreros.activo })
      .from(potreros)
      .where(eq(potreros.id, creado.id))
    expect(fila?.nombre).toBe("Potrero Scope")
    expect(fila?.activo).toBe(1)
  })

  it("veterinarios: es_inseminador persiste al crear y no se toca al editar sin el campo (CM-040)", async () => {
    const creado = await adapter.crear("veterinarios", testFincaId, {
      nombre: "Vet Inseminador",
      es_inseminador: 1,
    })
    expect(creado.tipo).toBe("creado")
    if (creado.tipo !== "creado") return

    const [filaCreada] = await db
      .select({ flag: veterinarios.esInseminador })
      .from(veterinarios)
      .where(eq(veterinarios.id, creado.id))
    expect(filaCreada?.flag).toBe(1)

    const editado = await adapter.editar("veterinarios", testFincaId, creado.id, {
      telefono: "3001234567",
    })
    expect(editado.tipo).toBe("actualizado")
    const [filaEditada] = await db
      .select({ flag: veterinarios.esInseminador, telefono: veterinarios.telefono })
      .from(veterinarios)
      .where(eq(veterinarios.id, creado.id))
    expect(filaEditada?.flag).toBe(1)
    expect(filaEditada?.telefono).toBe("3001234567")
  })

  it("crear funciona para las 11 familias (loop data-driven)", async () => {
    const datosPorFamilia: Readonly<Record<FamiliaMaestro, Record<string, string>>> = {
      veterinarios: { nombre: "Vet Loop" },
      propietarios: { nombre: "Propietario Loop" },
      potreros: { codigo: "P-LOOP", nombre: "Potrero Loop" },
      sectores: { codigo: "S-LOOP", nombre: "Sector Loop" },
      lotes: { nombre: "Lote Loop" },
      grupos: { nombre: "Grupo Loop" },
      hierros: { nombre: "Hierro Loop" },
      diagnosticos: { nombre: "Diagnóstico Loop" },
      motivos_ventas: { nombre: "Motivo Loop" },
      causas_muerte: { nombre: "Causa Loop" },
      lugares_compras: { nombre: "Lugar Loop" },
    }

    for (const familia of Object.keys(datosPorFamilia) as FamiliaMaestro[]) {
      const datos = datosPorFamilia[familia]
      if (!datos) throw new Error(`datos ausentes para ${familia}`)
      const resultado = await adapter.crear(familia, testFincaId, datos)
      expect(resultado, `familia ${familia}`).toEqual(expect.objectContaining({ tipo: "creado" }))
    }
  })

  it("actualizarDatosBasicos cambia nombre/area/tipo y detecta finca inexistente (CM-050)", async () => {
    const resultado = await adapter.actualizarDatosBasicos(testFincaId, {
      nombre: "Finca Prueba Editada",
      area_hectareas: 42.5,
      tipo_explotacion_id: fixtureTipoExplotacionId,
    })
    expect(resultado.tipo).toBe("actualizado")

    const [fila] = await db
      .select({
        nombre: fincas.nombre,
        area: fincas.areaHectareas,
        tipoExplotacionId: fincas.tipoExplotacionId,
      })
      .from(fincas)
      .where(eq(fincas.id, testFincaId))
    expect(fila?.nombre).toBe("Finca Prueba Editada")
    expect(fila?.area).toBe(42.5)
    expect(fila?.tipoExplotacionId).toBe(fixtureTipoExplotacionId)

    const inexistente = await adapter.actualizarDatosBasicos(
      `finca-inexistente-${crypto.randomUUID()}`,
      { nombre: "No existe" },
    )
    expect(inexistente).toEqual({ tipo: "no_encontrado" })
  })

  it("obtenerDatosBasicos lee la finca y refleja la edición (CM-050, issue #151)", async () => {
    // Finca dedicada: no mutar otraFincaId (el test CM-007 posterior la
    // necesita sin ubicación).
    const fincaLecturaId = `finca-test-lectura-${crypto.randomUUID()}`
    await db.insert(fincas).values({
      id: fincaLecturaId,
      codigo: `TST${fincaLecturaId.slice(-6).toUpperCase()}`,
      nombre: "Finca Prueba Lectura",
    })
    try {
      const inicial = await adapter.obtenerDatosBasicos(fincaLecturaId)
      expect(inicial).toEqual({
        codigo: expect.stringMatching(/^TST/),
        nombre: "Finca Prueba Lectura",
        departamento: null,
        municipio: null,
        vereda: null,
        areaHectareas: 0,
        capacidadMaxima: 0,
        tipoExplotacionId: null,
      })

      const editado = await adapter.actualizarDatosBasicos(fincaLecturaId, {
        municipio: "Yarumal",
        area_hectareas: 12.5,
        tipo_explotacion_id: fixtureTipoExplotacionId,
      })
      expect(editado.tipo).toBe("actualizado")

      const actualizado = await adapter.obtenerDatosBasicos(fincaLecturaId)
      expect(actualizado).toMatchObject({
        nombre: "Finca Prueba Lectura",
        municipio: "Yarumal",
        areaHectareas: 12.5,
        tipoExplotacionId: fixtureTipoExplotacionId,
      })
    } finally {
      await db.delete(fincas).where(eq(fincas.id, fincaLecturaId))
    }

    expect(await adapter.obtenerDatosBasicos(`finca-inexistente-${crypto.randomUUID()}`)).toBeNull()
  })

  it("CM-061: conteos agregados reflejan las cantidades sembradas", async () => {
    // Cantidades conocidas: 2 potreros activos + 1 inactivo, 1 veterinario
    // inseminador + 1 sin flag, 1 grupo. Finca con nombre + departamento.
    const potreroA = await adapter.crear("potreros", fincaConteosId, {
      codigo: "P-C1",
      nombre: "Conteo P1",
    })
    expect(potreroA.tipo).toBe("creado")
    const potreroB = await adapter.crear("potreros", fincaConteosId, {
      codigo: "P-C2",
      nombre: "Conteo P2",
    })
    expect(potreroB.tipo).toBe("creado")
    const potreroInactivo = await adapter.crear("potreros", fincaConteosId, {
      codigo: "P-C3",
      nombre: "Conteo P3",
    })
    if (potreroInactivo.tipo !== "creado") throw new Error("esperaba creado")
    await adapter.cambiarEstado("potreros", fincaConteosId, potreroInactivo.id, 0)

    const vetConFlag = await adapter.crear("veterinarios", fincaConteosId, {
      nombre: "Vet Con Flag",
      es_inseminador: 1,
    })
    expect(vetConFlag.tipo).toBe("creado")
    const vetSinFlag = await adapter.crear("veterinarios", fincaConteosId, {
      nombre: "Vet Sin Flag",
    })
    expect(vetSinFlag.tipo).toBe("creado")

    const grupo = await adapter.crear("grupos", fincaConteosId, { nombre: "Grupo Conteo" })
    expect(grupo.tipo).toBe("creado")

    const resultado = await conteos.contarTodo(fincaConteosId)

    expect(resultado.porMaestro).toEqual({
      veterinarios: 2,
      propietarios: 0,
      potreros: 2,
      sectores: 0,
      lotes: 0,
      grupos: 1,
      hierros: 0,
      diagnosticos: 0,
      motivos_ventas: 0,
      causas_muerte: 0,
      lugares_compras: 0,
    })
    expect(resultado.inseminadores).toBe(1)
    expect(resultado.fincaCompleta).toBe(true)
    expect(resultado.catalogosGlobales).toEqual({
      razas: baselineRazas + fixtureRazaIds.length,
      tiposExplotacion: baselineTiposExplotacion + 1,
      calidades: baselineCalidades + fixtureCalidadIds.length,
    })
  })

  it("CM-007: fincaCompleta es false para una finca sin ubicacion", async () => {
    const resultado = await conteos.contarTodo(otraFincaId)
    expect(resultado.fincaCompleta).toBe(false)
  })

  it("conteos de una finca inexistente devuelven ceros y fincaCompleta false", async () => {
    const resultado = await conteos.contarTodo(`finca-inexistente-${crypto.randomUUID()}`)
    expect(resultado.porMaestro).toEqual({
      veterinarios: 0,
      propietarios: 0,
      potreros: 0,
      sectores: 0,
      lotes: 0,
      grupos: 0,
      hierros: 0,
      diagnosticos: 0,
      motivos_ventas: 0,
      causas_muerte: 0,
      lugares_compras: 0,
    })
    expect(resultado.inseminadores).toBe(0)
    expect(resultado.fincaCompleta).toBe(false)
    expect(resultado.catalogosGlobales).toEqual({
      razas: baselineRazas + fixtureRazaIds.length,
      tiposExplotacion: baselineTiposExplotacion + 1,
      calidades: baselineCalidades + fixtureCalidadIds.length,
    })
  })
})
