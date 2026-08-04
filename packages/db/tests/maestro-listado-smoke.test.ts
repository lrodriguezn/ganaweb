/**
 * Smoke test de listado de maestros y catálogos globales para
 * Configuración (issue #148, RF-CONFIG-MAESTROS v1.0,
 * CM-034/CM-040/CM-053/CM-054/CM-014) contra Postgres REAL.
 *
 * Sigue el patrón de `duplicate-insert.test.ts` /
 * `maestro-escritura-smoke.test.ts`: `describe.skipIf(!dbSmoke)` con
 * `DB_SMOKE=true` + `DATABASE_URL`, fixtures creados en beforeAll y
 * limpiados en afterAll. El ILIKE case-insensitive, el orden real por
 * nombre y el count de la paginación viven en el motor SQL — solo una
 * query real los prueba.
 *
 * La BD de CI está recién migrada SIN seed; la local puede tener seed.
 * Por eso: los listados de maestros se siembran en fincas propias con
 * ids únicos (aisladas del seed), las búsquedas de catálogos globales
 * usan un prefijo único que solo coincide con los fixtures, y los
 * conteos globales se afirman contra una línea base leída antes de
 * sembrar (baseline + fixtures).
 *
 * Ejecución local:
 *   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ganaweb \
 *   DB_SMOKE=true pnpm --filter @ganaweb/db exec vitest run \
 *     tests/maestro-listado-smoke.test.ts
 */

import { eq, inArray, sql } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { DrizzleCatalogoAnimalMaestroAdapter } from "../src/catalogo-animal-maestro-infrastructure.js"
import { createClient } from "../src/client.js"
import { DrizzleConteosMaestrosAdapter } from "../src/conteos-maestros-infrastructure.js"
import { DrizzleMaestroListadoAdapter } from "../src/maestro-listado-infrastructure.js"
import {
  configCalidadAnimal,
  configRazas,
  configTiposExplotacion,
  fincas,
  grupos,
  potreros,
  propietarios,
  veterinarios,
} from "../src/schema/index.js"

const dbSmoke = process.env.DB_SMOKE === "true"

describe.skipIf(!dbSmoke)(
  "Issue #148: listado de maestros para configuración (smoke Postgres)",
  () => {
    const testFincaId = `finca-test-${crypto.randomUUID()}`
    const otraFincaId = `finca-test-otra-${crypto.randomUUID()}`
    const fincasTest = [testFincaId, otraFincaId]

    const fixtureRazaIds = [
      `raza-cfg-${crypto.randomUUID()}`,
      `raza-cfg-${crypto.randomUUID()}`,
      `raza-cfg-${crypto.randomUUID()}`,
    ] as const
    const fixtureTipoExplotacionIds = [
      `tipo-cfg-${crypto.randomUUID()}`,
      `tipo-cfg-${crypto.randomUUID()}`,
      `tipo-cfg-${crypto.randomUUID()}`,
    ] as const
    const fixtureCalidadIds = [
      `calidad-cfg-${crypto.randomUUID()}`,
      `calidad-cfg-${crypto.randomUUID()}`,
    ] as const

    let db: ReturnType<typeof createClient>
    let listado: DrizzleMaestroListadoAdapter
    let catalogos: DrizzleCatalogoAnimalMaestroAdapter
    let conteos: DrizzleConteosMaestrosAdapter
    let baselineRazas = 0
    let baselineTiposExplotacion = 0
    let baselineCalidades = 0

    beforeAll(async () => {
      db = createClient(process.env.DATABASE_URL)
      listado = new DrizzleMaestroListadoAdapter(db)
      catalogos = new DrizzleCatalogoAnimalMaestroAdapter(db)
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

      // Fixtures: fincas de prueba. testFincaId tiene nombre + departamento
      // (fincaCompleta); otraFincaId solo nombre.
      await db.insert(fincas).values([
        {
          id: testFincaId,
          codigo: `TST${testFincaId.slice(-6).toUpperCase()}`,
          nombre: "Finca Prueba Listado",
          departamento: "Antioquia",
        },
        {
          id: otraFincaId,
          codigo: `TST${otraFincaId.slice(-6).toUpperCase()}`,
          nombre: "Finca Prueba Otra Listado",
        },
      ])

      // Veterinarios: 4 activos (dos con flag) + 2 inactivos, nombres con
      // mayúsculas y acentos; uno duplicado en otra finca (scope).
      await db.insert(veterinarios).values([
        {
          id: crypto.randomUUID(),
          fincaId: testFincaId,
          nombre: "Ana Veterinaria",
          esInseminador: 0,
        },
        {
          id: crypto.randomUUID(),
          fincaId: testFincaId,
          nombre: "Beatriz Veterinaria",
          esInseminador: 1,
          telefono: "3001112233",
        },
        {
          id: crypto.randomUUID(),
          fincaId: testFincaId,
          nombre: "Carlos Veterinario",
          esInseminador: 1,
        },
        { id: crypto.randomUUID(), fincaId: testFincaId, nombre: "María Gómez", esInseminador: 0 },
        {
          id: crypto.randomUUID(),
          fincaId: testFincaId,
          nombre: "Diana Inactiva",
          esInseminador: 1,
          activo: 0,
        },
        {
          id: crypto.randomUUID(),
          fincaId: testFincaId,
          nombre: "Elias Inactivo Sin Flag",
          esInseminador: 0,
          activo: 0,
        },
        {
          id: crypto.randomUUID(),
          fincaId: otraFincaId,
          nombre: "Ana Veterinaria",
          esInseminador: 0,
        },
      ])

      // Potreros: codigos para la búsqueda por codigo (CM-034).
      await db.insert(potreros).values([
        {
          id: crypto.randomUUID(),
          fincaId: testFincaId,
          codigo: "PL-01",
          nombre: "Potrero Listado Uno",
          areaHectareas: 10.5,
          tipoPasto: "Kikuyo",
        },
        {
          id: crypto.randomUUID(),
          fincaId: testFincaId,
          codigo: "PL-02",
          nombre: "Potrero Listado Dos",
        },
        {
          id: crypto.randomUUID(),
          fincaId: testFincaId,
          codigo: "PL-03",
          nombre: "Potrero Inactivo",
          activo: 0,
        },
      ])

      // Propietarios: numero_documento para la búsqueda por documento (CM-034).
      await db.insert(propietarios).values([
        {
          id: crypto.randomUUID(),
          fincaId: testFincaId,
          nombre: "Propietario Uno",
          tipoDocumento: "CC",
          numeroDocumento: "12345678",
        },
        {
          id: crypto.randomUUID(),
          fincaId: testFincaId,
          nombre: "Propietaria Dos",
          numeroDocumento: "87654321",
        },
        {
          id: crypto.randomUUID(),
          fincaId: testFincaId,
          nombre: "Propietario Inactivo",
          numeroDocumento: "11111111",
          activo: 0,
        },
      ])

      // Grupos: 27 filas activas para la paginación (pageSize 25 → 2 páginas).
      await db.insert(grupos).values(
        Array.from({ length: 27 }, (_, indice) => ({
          id: crypto.randomUUID(),
          fincaId: testFincaId,
          nombre: `Grupo Paginado ${String(indice + 1).padStart(2, "0")}`,
        })),
      )

      // Catálogos globales: prefijo único para aislar los fixtures del seed.
      const razasFixture: (typeof configRazas.$inferInsert)[] = [
        {
          id: fixtureRazaIds[0],
          nombre: "RazaCfgListado Cebú",
          descripcion: "Raza índica",
          origen: "India",
          tipoProduccion: "Carne",
        },
        {
          id: fixtureRazaIds[1],
          nombre: "RazaCfgListado Holstein",
          descripcion: "Raza lechera",
          origen: "Europa",
          tipoProduccion: "Leche",
        },
        { id: fixtureRazaIds[2], nombre: "RazaCfgListado Inactiva", activo: 0 },
      ]
      await db.insert(configRazas).values(razasFixture)
      const tiposFixture: (typeof configTiposExplotacion.$inferInsert)[] = [
        { id: fixtureTipoExplotacionIds[0], nombre: "TipoCfgListado A", descripcion: "Tipo A" },
        { id: fixtureTipoExplotacionIds[1], nombre: "TipoCfgListado B" },
        { id: fixtureTipoExplotacionIds[2], nombre: "TipoCfgListado Inactivo", activo: 0 },
      ]
      await db.insert(configTiposExplotacion).values(tiposFixture)
      const calidadesFixture: (typeof configCalidadAnimal.$inferInsert)[] = [
        { id: fixtureCalidadIds[0], nombre: "CalidadCfgListado A", descripcion: "Calidad A" },
        { id: fixtureCalidadIds[1], nombre: "CalidadCfgListado B", activo: 0 },
      ]
      await db.insert(configCalidadAnimal).values(calidadesFixture)
    })

    afterAll(async () => {
      // Guard: si beforeAll falló (ej. DATABASE_URL ausente), db es undefined.
      if (!db) return

      // Limpieza de fixtures: RN-050 (nunca borrado físico) aplica al
      // producto, no a los fixtures de test. Primero los maestros (FK hacia
      // fincas), luego las fincas y por último los catálogos globales.
      await db.delete(veterinarios).where(inArray(veterinarios.fincaId, fincasTest))
      await db.delete(potreros).where(inArray(potreros.fincaId, fincasTest))
      await db.delete(propietarios).where(inArray(propietarios.fincaId, fincasTest))
      await db.delete(grupos).where(inArray(grupos.fincaId, fincasTest))
      await db.delete(fincas).where(inArray(fincas.id, fincasTest))
      await db.delete(configRazas).where(inArray(configRazas.id, fixtureRazaIds))
      await db
        .delete(configTiposExplotacion)
        .where(inArray(configTiposExplotacion.id, fixtureTipoExplotacionIds))
      await db.delete(configCalidadAnimal).where(inArray(configCalidadAnimal.id, fixtureCalidadIds))

      await db.$client.end()
    })

    it("CM-034: lista solo activos por defecto, orden nombre asc, scope por finca", async () => {
      const resultado = await listado.listar("veterinarios", testFincaId)

      expect(resultado.filas.map((fila) => fila.nombre)).toEqual([
        "Ana Veterinaria",
        "Beatriz Veterinaria",
        "Carlos Veterinario",
        "María Gómez",
      ])
      expect(resultado.total).toBe(4)
      expect(resultado.pagina).toBe(1)
      expect(resultado.pageSize).toBe(25)
    })

    it("CM-034: incluirInactivos muestra activos e inactivos", async () => {
      const resultado = await listado.listar("veterinarios", testFincaId, {
        incluirInactivos: true,
      })

      expect(resultado.filas.map((fila) => fila.nombre)).toEqual([
        "Ana Veterinaria",
        "Beatriz Veterinaria",
        "Carlos Veterinario",
        "Diana Inactiva",
        "Elias Inactivo Sin Flag",
        "María Gómez",
      ])
      expect(resultado.total).toBe(6)
    })

    it("CM-034: búsqueda case-insensitive por nombre (mayúsculas y acentos)", async () => {
      const minusculas = await listado.listar("veterinarios", testFincaId, { busqueda: "beatriz" })
      expect(minusculas.filas.map((fila) => fila.nombre)).toEqual(["Beatriz Veterinaria"])

      const acento = await listado.listar("veterinarios", testFincaId, { busqueda: "maría" })
      expect(acento.filas.map((fila) => fila.nombre)).toEqual(["María Gómez"])

      const espacios = await listado.listar("veterinarios", testFincaId, {
        busqueda: "  carlos  ",
      })
      expect(espacios.filas.map((fila) => fila.nombre)).toEqual(["Carlos Veterinario"])
    })

    it("CM-034: potreros — búsqueda por codigo y por nombre, filtro de activos", async () => {
      const porCodigo = await listado.listar("potreros", testFincaId, { busqueda: "pl-01" })
      expect(porCodigo.filas.map((fila) => fila.nombre)).toEqual(["Potrero Listado Uno"])
      expect(porCodigo.filas[0]?.codigo).toBe("PL-01")

      const porNombre = await listado.listar("potreros", testFincaId, { busqueda: "listado" })
      expect(porNombre.total).toBe(2)

      const activos = await listado.listar("potreros", testFincaId)
      expect(activos.total).toBe(2)

      const todos = await listado.listar("potreros", testFincaId, { incluirInactivos: true })
      expect(todos.total).toBe(3)
    })

    it("CM-034: propietarios — búsqueda por numero_documento", async () => {
      const porDocumento = await listado.listar("propietarios", testFincaId, {
        busqueda: "12345678",
      })
      expect(porDocumento.filas.map((fila) => fila.nombre)).toEqual(["Propietario Uno"])

      const activos = await listado.listar("propietarios", testFincaId)
      expect(activos.total).toBe(2)
    })

    it("CM-040: inseminadores lista solo veterinarios con es_inseminador=1", async () => {
      const activos = await listado.listar("inseminadores", testFincaId)
      expect(activos.filas.map((fila) => fila.nombre)).toEqual([
        "Beatriz Veterinaria",
        "Carlos Veterinario",
      ])
      expect(activos.total).toBe(2)

      const todos = await listado.listar("inseminadores", testFincaId, { incluirInactivos: true })
      expect(todos.filas.map((fila) => fila.nombre)).toEqual([
        "Beatriz Veterinaria",
        "Carlos Veterinario",
        "Diana Inactiva",
      ])
    })

    it("CM-034: la fila mapea todas las columnas a claves snake_case con NULL → null", async () => {
      const resultado = await listado.listar("veterinarios", testFincaId, { busqueda: "beatriz" })
      const fila = resultado.filas[0]
      if (!fila) throw new Error("esperaba una fila")

      expect(Object.keys(fila).sort()).toEqual([
        "activo",
        "direccion",
        "email",
        "es_inseminador",
        "especialidad",
        "id",
        "nombre",
        "numero_registro",
        "telefono",
      ])
      expect(fila).toMatchObject({
        activo: 1,
        nombre: "Beatriz Veterinaria",
        telefono: "3001112233",
        email: null,
        direccion: null,
        numero_registro: null,
        especialidad: null,
        es_inseminador: 1,
      })
      expect(typeof fila.id).toBe("string")
    })

    it("CM-034: paginación — pageSize 25 con 27 filas devuelve pagina 2 con el resto", async () => {
      const pagina1 = await listado.listar("grupos", testFincaId, { pageSize: 25 })
      expect(pagina1.filas.length).toBe(25)
      expect(pagina1.total).toBe(27)
      expect(pagina1.pagina).toBe(1)
      expect(pagina1.filas[0]?.nombre).toBe("Grupo Paginado 01")
      expect(pagina1.filas[24]?.nombre).toBe("Grupo Paginado 25")

      const pagina2 = await listado.listar("grupos", testFincaId, { pageSize: 25, pagina: 2 })
      expect(pagina2.filas.map((fila) => fila.nombre)).toEqual([
        "Grupo Paginado 26",
        "Grupo Paginado 27",
      ])
      expect(pagina2.total).toBe(27)
      expect(pagina2.pagina).toBe(2)
    })

    it("CM-053/CM-054: razas para configuración con origen/tipo_produccion, solo activos, búsqueda y orden", async () => {
      const resultado = await catalogos.listarParaConfiguracion("razas", {
        busqueda: "RazaCfgListado",
      })

      expect(resultado.map((fila) => fila.nombre)).toEqual([
        "RazaCfgListado Cebú",
        "RazaCfgListado Holstein",
      ])
      const holstein = resultado[1]
      expect(holstein).toEqual({
        id: fixtureRazaIds[1],
        nombre: "RazaCfgListado Holstein",
        descripcion: "Raza lechera",
        origen: "Europa",
        tipoProduccion: "Leche",
      })

      const minusculas = await catalogos.listarParaConfiguracion("razas", {
        busqueda: "razacfglistado",
      })
      expect(minusculas.length).toBe(2)
    })

    it("CM-053: tipos de explotación y calidades con nombre/descripcion, sin origen", async () => {
      const tipos = await catalogos.listarParaConfiguracion("tiposExplotacion", {
        busqueda: "TipoCfgListado",
      })
      expect(tipos.map((fila) => fila.nombre)).toEqual(["TipoCfgListado A", "TipoCfgListado B"])
      expect(tipos[0]?.descripcion).toBe("Tipo A")
      expect(tipos[1]?.descripcion).toBeNull()
      for (const fila of tipos) {
        expect("origen" in fila).toBe(false)
        expect("tipoProduccion" in fila).toBe(false)
      }

      const calidades = await catalogos.listarParaConfiguracion("calidades", {
        busqueda: "CalidadCfgListado",
      })
      expect(calidades.map((fila) => fila.nombre)).toEqual(["CalidadCfgListado A"])
      expect(calidades[0]?.descripcion).toBe("Calidad A")
    })

    it("CM-053: sin búsqueda incluye los fixtures junto al seed existente", async () => {
      const razas = await catalogos.listarParaConfiguracion("razas")
      expect(razas.length).toBeGreaterThanOrEqual(baselineRazas + 2)
      expect(razas.some((fila) => fila.nombre === "RazaCfgListado Holstein")).toBe(true)
      expect(razas.some((fila) => fila.nombre === "RazaCfgListado Inactiva")).toBe(false)
    })

    it("CM-014: contarPorFamilia devuelve los valores correctos sin lanzar", async () => {
      expect(await conteos.contarPorFamilia(testFincaId, "veterinarios")).toBe(4)
      expect(await conteos.contarPorFamilia(testFincaId, "inseminadores")).toBe(2)
      expect(await conteos.contarPorFamilia(testFincaId, "potreros")).toBe(2)
      expect(await conteos.contarPorFamilia(testFincaId, "grupos")).toBe(27)
      expect(await conteos.contarPorFamilia(testFincaId, "fincaCompleta")).toBe(1)
      expect(await conteos.contarPorFamilia(otraFincaId, "fincaCompleta")).toBe(0)
    })

    it("CM-014: contarCatalogoGlobal devuelve baseline + fixtures sin lanzar", async () => {
      expect(await conteos.contarCatalogoGlobal("razas")).toBe(baselineRazas + 2)
      expect(await conteos.contarCatalogoGlobal("tiposExplotacion")).toBe(
        baselineTiposExplotacion + 2,
      )
      expect(await conteos.contarCatalogoGlobal("calidades")).toBe(baselineCalidades + 1)
    })
  },
)
