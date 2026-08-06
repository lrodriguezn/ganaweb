/**
 * Tests unitarios del adaptador del read model del panel de sanidad
 * (Issue #212) con una db FALSA (sin Postgres): verifican el scope de las
 * queries (SAN-063), las ventanas de fecha (SAN-002/D-002/KPI-09), la
 * exclusión de grupos anulados (RN-051), el umbral T-001 desde
 * `config_parametros_finca`, el mapeo serializable (CM-042) y la
 * paginación del historial (D-005). El comportamiento real contra
 * Postgres vive en los smoke tests con DB_SMOKE.
 *
 * Reglas cubiertas (TS-001):
 * - SAN-002: aplicaciones de la semana natural actual; animales distintos
 *   en tratamiento (tipo ≠ vacuna, últimos 30 días — D-002).
 * - KPI-10/T-001: stock crítico < umbral y agotados ≤ 0 desde
 *   `inventario_sanitario`; umbral leído de `config_parametros_finca`
 *   (fallback del dominio cuando no hay parámetro).
 * - KPI-09/SAN-050: refuerzos pendientes — última aplicación por
 *   animal/producto, ventana hoy+30, solo EN_FINCA, excluidas filas de
 *   grupos anulados (RN-051).
 * - SAN-004: últimas 4 aplicaciones (objetivo animal|lote + N animales,
 *   responsable).
 * - SAN-005: hasta 4 alertas de stock ordenadas por criticidad.
 * - D-005: historial paginado con filtros producto/fecha/animal-lote.
 */
import { getTableName } from "drizzle-orm"
import { describe, expect, it } from "vitest"
import { DrizzlePanelSanidadAdapter } from "../src/sanidad-panel-infrastructure.js"

type Operacion = {
  readonly tipo: "select"
  readonly tabla: string
  readonly joins: readonly string[]
  readonly condicion: unknown
  readonly limite: number | null
}

function conditionContains(condition: unknown, column: string, value: unknown): boolean {
  if (!condition || typeof condition !== "object") return false
  const chunks = (condition as { queryChunks?: unknown[] }).queryChunks ?? []
  return chunks.some(
    (chunk, index) =>
      conditionContains(chunk, column, value) ||
      ((chunk as { name?: string }).name === column &&
        chunks
          .slice(index + 1)
          .some((next) => next === value || (next as { value?: unknown }).value === value)),
  )
}

function conditionHasColumn(condition: unknown, column: string): boolean {
  if (!condition || typeof condition !== "object") return false
  const chunks = (condition as { queryChunks?: unknown[] }).queryChunks ?? []
  return chunks.some(
    (chunk) =>
      conditionHasColumn(chunk, column) || (chunk as { name?: string }).name === column,
  )
}

/**
 * Nombre de la tabla o vista: `getTableName` no resuelve vistas `.existing()`
 * (el nombre vive en el símbolo `drizzle:ViewBaseConfig`).
 */
function nombreTabla(tabla: unknown): string {
  const nombre = getTableName(tabla as never)
  if (nombre !== undefined) return nombre
  for (const simbolo of Object.getOwnPropertySymbols(tabla)) {
    if (!simbolo.description?.includes("ViewBaseConfig")) continue
    const config = (tabla as Record<symbol, unknown>)[simbolo]
    if (config && typeof config === "object" && typeof (config as { name?: unknown }).name === "string") {
      return (config as { name: string }).name
    }
  }
  return ""
}

/**
 * Db falsa por cola de respuestas: cada `select().from(...)` consume la
 * siguiente respuesta configurada (simula lo que Postgres devolvería para
 * ESA query) y registra la tabla, los joins, la condición y el límite.
 */
function fakeDb(respuestas: readonly (readonly Record<string, unknown>[])[]) {
  const operaciones: Operacion[] = []
  let indice = 0

  const resolver = (tabla: string, joins: readonly string[], condicion: unknown) => {
    const filas = respuestas[indice] ?? []
    indice += 1
    const operacion: { -readonly [K in keyof Operacion]: Operacion[K] } = {
      tipo: "select",
      tabla,
      joins,
      condicion,
      limite: null,
    }
    operaciones.push(operacion)
    const base = Promise.resolve(filas)
    return Object.assign(base, {
      limit: (n: number) => {
        operacion.limite = n
        return Promise.resolve(filas.slice(0, n))
      },
      orderBy: () =>
        Object.assign(Promise.resolve(filas), {
          limit: (n: number) => {
            operacion.limite = n
            return Promise.resolve(filas.slice(0, n))
          },
        }),
    })
  }

  const db = {
    select: () => ({
      from: (tabla: unknown) => {
        const nombre = nombreTabla(tabla)
        const joins: string[] = []
        const builder = {
          innerJoin: (otra: unknown) => {
            joins.push(nombreTabla(otra))
            return builder
          },
          leftJoin: (otra: unknown) => {
            joins.push(nombreTabla(otra))
            return builder
          },
          where: (condicion: unknown) => resolver(nombre, [...joins], condicion),
        }
        return builder
      },
    }),
  }

  return { db, operaciones }
}

const FINCA = "finca-esperanza"
const HOY = "2026-08-05" // miércoles; semana natural: 2026-08-03..2026-08-09

function adaptadorCon(respuestas: readonly (readonly Record<string, unknown>[])[]) {
  const fake = fakeDb(respuestas)
  return { fake, adaptador: new DrizzlePanelSanidadAdapter(fake.db as never) }
}

describe("Issue #212 panel — SAN-002: métricas", () => {
  it("aplicaciones de la semana actual (SAN-002) con scope de finca y semana natural", async () => {
    // Cola: 1) umbral config, 2) semana, 3) tratamiento, 4) inventario.
    const { fake, adaptador } = adaptadorCon([
      [{ valor: "30" }],
      [{ id: "apl-1" }, { id: "apl-2" }, { id: "apl-3" }],
      [],
      [],
    ])

    const metricas = await adaptador.obtenerMetricas(FINCA, HOY)

    expect(metricas.aplicacionesEstaSemana).toBe(3)
    const querySemana = fake.operaciones[1]
    expect(querySemana?.tabla).toBe("aplicaciones_sanitarias")
    expect(querySemana?.joins).toContain("productos_sanitarios")
    // RN-051: las filas de grupos anulados se excluyen.
    expect(querySemana?.joins).toContain("registros_grupales")
    expect(conditionHasColumn(querySemana?.condicion, "anulado_en")).toBe(true)
    // SAN-063: scope por finca vía el join con productos_sanitarios.
    expect(conditionContains(querySemana?.condicion, "finca_id", FINCA)).toBe(true)
    // SAN-052: ventana de la semana natural (lunes..domingo).
    expect(conditionContains(querySemana?.condicion, "fecha", "2026-08-03")).toBe(true)
    expect(conditionContains(querySemana?.condicion, "fecha", "2026-08-09")).toBe(true)
  })

  it("D-002: animales DISTINTOS con tratamiento (≠ vacuna) en los últimos 30 días", async () => {
    const { fake, adaptador } = adaptadorCon([
      [{ valor: "30" }],
      [],
      [
        { animalId: "animal-1", tipoTratamiento: "no_reproductivo", fecha: "2026-08-01" },
        // mismo animal, dos tratamientos → cuenta 1
        { animalId: "animal-1", tipoTratamiento: "reproductivo", fecha: "2026-07-30" },
        { animalId: "animal-2", tipoTratamiento: "no_reproductivo", fecha: "2026-07-20" },
      ],
      [],
    ])

    const metricas = await adaptador.obtenerMetricas(FINCA, HOY)

    expect(metricas.animalesEnTratamiento).toBe(2)
    const queryTratamiento = fake.operaciones[2]
    // D-002: el filtro de vacuna viaja en la query.
    expect(conditionContains(queryTratamiento?.condicion, "tipo_tratamiento", "vacuna")).toBe(true)
    // Ventana últimos 30 días (HOY-30 = 2026-07-06).
    expect(conditionContains(queryTratamiento?.condicion, "fecha", "2026-07-06")).toBe(true)
  })

  it("KPI-10/T-001: stock crítico < umbral y agotados ≤ 0 desde inventario_sanitario", async () => {
    const { fake, adaptador } = adaptadorCon([
      [{ valor: "30" }], // umbral configurado (T-001: no hardcodeado)
      [],
      [],
      [
        { productoId: "p1", dosisDisponibles: "0" }, // agotado y crítico
        { productoId: "p2", dosisDisponibles: "10" }, // crítico (< 30)
        { productoId: "p3", dosisDisponibles: "29" }, // crítico (< 30)
        { productoId: "p4", dosisDisponibles: "30" }, // ok (= umbral)
        { productoId: "p5", dosisDisponibles: "120" }, // ok
      ],
    ])

    const metricas = await adaptador.obtenerMetricas(FINCA, HOY)

    expect(metricas.stockCritico).toBe(3)
    expect(metricas.productosAgotados).toBe(1)
    const queryInventario = fake.operaciones[3]
    expect(queryInventario?.tabla).toBe("inventario_sanitario")
    expect(conditionContains(queryInventario?.condicion, "finca_id", FINCA)).toBe(true)
  })

  it("T-001: sin parámetro configurado aplica el fallback del dominio (20)", async () => {
    const { adaptador } = adaptadorCon([
      [], // sin fila en config_parametros_finca
      [],
      [],
      [
        { productoId: "p1", dosisDisponibles: "15" }, // < 20 → crítico
        { productoId: "p2", dosisDisponibles: "25" }, // ok con fallback 20
      ],
    ])

    const metricas = await adaptador.obtenerMetricas(FINCA, HOY)

    expect(metricas.stockCritico).toBe(1)
    expect(metricas.productosAgotados).toBe(0)
  })
})

describe("Issue #212 panel — KPI-09/SAN-050: refuerzos pendientes", () => {
  it("solo la ÚLTIMA aplicación por animal/producto puede estar pendiente", async () => {
    const { adaptador } = adaptadorCon([
      [
        // (animal-1, prod-a): la más reciente tiene próxima dosis dentro de la ventana.
        {
          animalId: "animal-1",
          productoId: "prod-a",
          fecha: "2026-07-01",
          proximaDosis: "2026-08-10",
          codigo: "VAC-A",
          descripcion: "Vacuna A",
          tipoTratamiento: "vacuna",
        },
        // Misma pareja, más antigua: NO cuenta (hay aplicación posterior).
        {
          animalId: "animal-1",
          productoId: "prod-a",
          fecha: "2026-06-01",
          proximaDosis: "2026-08-08",
          codigo: "VAC-A",
          descripcion: "Vacuna A",
          tipoTratamiento: "vacuna",
        },
      ],
    ])

    const filas = await adaptador.listarRefuerzosPendientes(FINCA, HOY)

    expect(filas).toHaveLength(1)
    expect(filas[0]).toEqual({
      productoId: "prod-a",
      codigo: "VAC-A",
      descripcion: "Vacuna A",
      tipoTratamiento: "vacuna",
      animalId: "animal-1",
      proximaDosis: "2026-08-10",
    })
  })

  it("SAN-046: si la última aplicación no tiene próxima dosis, el refuerzo está completado", async () => {
    const { adaptador } = adaptadorCon([
      [
        {
          animalId: "animal-1",
          productoId: "prod-a",
          fecha: "2026-06-01",
          proximaDosis: "2026-08-08",
          codigo: "VAC-A",
          descripcion: "Vacuna A",
          tipoTratamiento: "vacuna",
        },
        // Última de la pareja: sin proxima_dosis → auto-completado (RN-042).
        {
          animalId: "animal-1",
          productoId: "prod-a",
          fecha: "2026-07-15",
          proximaDosis: null,
          codigo: "VAC-A",
          descripcion: "Vacuna A",
          tipoTratamiento: "vacuna",
        },
      ],
    ])

    const filas = await adaptador.listarRefuerzosPendientes(FINCA, HOY)

    expect(filas).toHaveLength(0)
  })

  it("KPI-09: fuera de la ventana hoy+30 no está pendiente", async () => {
    const { adaptador } = adaptadorCon([
      [
        {
          animalId: "animal-1",
          productoId: "prod-a",
          fecha: "2026-07-20",
          proximaDosis: "2026-09-05", // HOY+31
          codigo: "VAC-A",
          descripcion: "Vacuna A",
          tipoTratamiento: "vacuna",
        },
        {
          animalId: "animal-2",
          productoId: "prod-b",
          fecha: "2026-07-25",
          proximaDosis: "2026-09-04", // HOY+30: límite incluido
          codigo: "TRAT-B",
          descripcion: "Tratamiento B",
          tipoTratamiento: "no_reproductivo",
        },
      ],
    ])

    const filas = await adaptador.listarRefuerzosPendientes(FINCA, HOY)

    expect(filas).toHaveLength(1)
    expect(filas[0]?.animalId).toBe("animal-2")
    expect(filas[0]?.proximaDosis).toBe("2026-09-04")
  })

  it("SAN-050/RN-051: la query acota EN_FINCA y excluye grupos anulados", async () => {
    const { fake, adaptador } = adaptadorCon([[]])

    await adaptador.listarRefuerzosPendientes(FINCA, HOY)

    const query = fake.operaciones[0]
    expect(query?.tabla).toBe("aplicaciones_sanitarias")
    expect(query?.joins).toContain("animales")
    expect(query?.joins).toContain("productos_sanitarios")
    expect(query?.joins).toContain("registros_grupales")
    // Solo animales EN_FINCA (estado_animal_key = 0).
    expect(conditionContains(query?.condicion, "estado_animal_key", 0)).toBe(true)
    // RN-051: exclusión de filas de grupos anulados.
    expect(conditionHasColumn(query?.condicion, "anulado_en")).toBe(true)
    // SAN-063: scope de finca.
    expect(conditionContains(query?.condicion, "finca_id", FINCA)).toBe(true)
  })
})

describe("Issue #212 panel — SAN-004: últimas aplicaciones registradas", () => {
  it("mapea objetivo animal|lote, N animales y responsable; límite 4", async () => {
    const { fake, adaptador } = adaptadorCon([
      [
        {
          id: "apl-1",
          fecha: "2026-08-04",
          registroGrupalId: null,
          productoCodigo: "VAC-A",
          productoDescripcion: "Vacuna A",
          responsableNombre: "María",
          totalAnimales: null,
        },
        {
          id: "apl-2",
          fecha: "2026-08-03",
          registroGrupalId: "grupo-1",
          productoCodigo: "TRAT-B",
          productoDescripcion: "Tratamiento B",
          responsableNombre: null,
          totalAnimales: 18,
        },
      ],
    ])

    const ultimas = await adaptador.listarUltimasAplicaciones(FINCA)

    expect(ultimas).toEqual([
      {
        id: "apl-1",
        fecha: "2026-08-04",
        productoCodigo: "VAC-A",
        productoDescripcion: "Vacuna A",
        objetivo: "animal",
        cantidadAnimales: 1,
        responsable: "María",
      },
      {
        id: "apl-2",
        fecha: "2026-08-03",
        productoCodigo: "TRAT-B",
        productoDescripcion: "Tratamiento B",
        objetivo: "lote",
        cantidadAnimales: 18,
        responsable: null,
      },
    ])

    const query = fake.operaciones[0]
    expect(query?.limite).toBe(4)
    expect(query?.joins).toContain("usuarios")
    expect(query?.joins).toContain("registros_grupales")
    expect(conditionContains(query?.condicion, "finca_id", FINCA)).toBe(true)
    expect(conditionHasColumn(query?.condicion, "anulado_en")).toBe(true)
  })

  it("sin aplicaciones devuelve lista vacía (finca nueva)", async () => {
    const { adaptador } = adaptadorCon([[]])

    const ultimas = await adaptador.listarUltimasAplicaciones(FINCA)

    expect(ultimas).toEqual([])
  })
})

describe("Issue #212 panel — SAN-005/KPI-10: alertas de stock", () => {
  it("hasta 4 productos ordenados por criticidad (agotado → bajo → ok)", async () => {
    const { adaptador } = adaptadorCon([
      [{ valor: "10" }], // umbral
      [
        { productoId: "p-ok-1", codigo: "C1", descripcion: "Ok 1", dosisDisponibles: "40" },
        { productoId: "p-agotado", codigo: "C2", descripcion: "Agotado", dosisDisponibles: "0" },
        { productoId: "p-bajo", codigo: "C3", descripcion: "Bajo", dosisDisponibles: "5" },
        { productoId: "p-ok-2", codigo: "C4", descripcion: "Ok 2", dosisDisponibles: "60" },
        { productoId: "p-ok-3", codigo: "C5", descripcion: "Ok 3", dosisDisponibles: "80" },
      ],
    ])

    const alertas = await adaptador.listarAlertasStock(FINCA)

    expect(alertas).toHaveLength(4)
    expect(alertas.map((alerta) => alerta.estado)).toEqual(["agotado", "bajo", "ok", "ok"])
    expect(alertas[0]?.productoId).toBe("p-agotado")
    expect(alertas[1]?.productoId).toBe("p-bajo")
    // Los ok se ordenan por stock ascendente (el más cercano al umbral primero).
    expect(alertas[2]?.productoId).toBe("p-ok-1")
    expect(alertas[3]?.productoId).toBe("p-ok-2")
  })

  it("el estado usa el umbral configurado, nunca hardcodeado (T-001)", async () => {
    const { adaptador } = adaptadorCon([
      [{ valor: "50" }],
      [
        // Con umbral 50 este producto está BAJO; con el default 20 estaría ok.
        { productoId: "p1", codigo: "C1", descripcion: "D 1", dosisDisponibles: "30" },
      ],
    ])

    const alertas = await adaptador.listarAlertasStock(FINCA)

    expect(alertas).toHaveLength(1)
    expect(alertas[0]?.estado).toBe("bajo")
    expect(alertas[0]?.dosisDisponibles).toBe(30)
  })
})

describe("Issue #212 panel — D-005: historial paginado con filtros", () => {
  function filaHistorial(id: string, overrides: Record<string, unknown> = {}) {
    return {
      id,
      fecha: "2026-08-01",
      registroGrupalId: null,
      productoCodigo: "VAC-A",
      productoDescripcion: "Vacuna A",
      animalCodigo: `AN-${id}`,
      grupoDescripcion: null,
      totalAnimales: null,
      dosis: "2",
      responsableNombre: "María",
      ...overrides,
    }
  }

  it("pagina en el servidor: página 2 de 5 sobre 12 filas", async () => {
    const filas = Array.from({ length: 12 }, (_, i) => filaHistorial(`apl-${i + 1}`))
    const { adaptador } = adaptadorCon([filas])

    const pagina = await adaptador.listarHistorial(FINCA, { pagina: 2, tamanoPagina: 5 })

    expect(pagina.total).toBe(12)
    expect(pagina.pagina).toBe(2)
    expect(pagina.tamanoPagina).toBe(5)
    expect(pagina.filas.map((fila) => fila.id)).toEqual([
      "apl-6",
      "apl-7",
      "apl-8",
      "apl-9",
      "apl-10",
    ])
  })

  it("mapea filas serializables: objetivo, N animales, dosis numérica, responsable", async () => {
    const { adaptador } = adaptadorCon([
      [
        filaHistorial("apl-1", { dosis: "1.5" }),
        filaHistorial("apl-2", {
          registroGrupalId: "grupo-1",
          grupoDescripcion: "Lote 4",
          totalAnimales: 18,
          animalCodigo: null,
        }),
      ],
    ])

    const pagina = await adaptador.listarHistorial(FINCA, { pagina: 1, tamanoPagina: 10 })

    expect(pagina.filas[0]).toEqual({
      id: "apl-1",
      fecha: "2026-08-01",
      productoCodigo: "VAC-A",
      productoDescripcion: "Vacuna A",
      objetivo: "animal",
      cantidadAnimales: 1,
      animalCodigo: "AN-apl-1",
      loteDescripcion: null,
      dosis: 1.5,
      responsable: "María",
    })
    expect(pagina.filas[1]?.objetivo).toBe("lote")
    expect(pagina.filas[1]?.cantidadAnimales).toBe(18)
    expect(pagina.filas[1]?.loteDescripcion).toBe("Lote 4")
  })

  it("los filtros producto/fecha/animal-lote viajan en la query (D-005)", async () => {
    const { fake, adaptador } = adaptadorCon([[]])

    await adaptador.listarHistorial(FINCA, {
      productoId: "prod-a",
      desde: "2026-07-01",
      hasta: "2026-08-01",
      animalOLote: "lote 4",
      pagina: 1,
      tamanoPagina: 10,
    })

    const query = fake.operaciones[0]
    expect(conditionContains(query?.condicion, "producto_id", "prod-a")).toBe(true)
    expect(conditionContains(query?.condicion, "fecha", "2026-07-01")).toBe(true)
    expect(conditionContains(query?.condicion, "fecha", "2026-08-01")).toBe(true)
    // animal/lote: texto libre acotado por código de animal o grupo.
    expect(conditionContains(query?.condicion, "codigo", "%lote 4%")).toBe(true)
    expect(conditionContains(query?.condicion, "descripcion", "%lote 4%")).toBe(true)
  })

  it("sin filtros opcionales la query no lleva condiciones de filtro", async () => {
    const { fake, adaptador } = adaptadorCon([[]])

    await adaptador.listarHistorial(FINCA, { pagina: 1, tamanoPagina: 10 })

    const query = fake.operaciones[0]
    expect(conditionContains(query?.condicion, "producto_id", "prod-a")).toBe(false)
    expect(conditionContains(query?.condicion, "codigo", "%lote 4%")).toBe(false)
    expect(conditionContains(query?.condicion, "finca_id", FINCA)).toBe(true)
  })

  it("página fuera de rango devuelve filas vacías con el total intacto", async () => {
    const filas = Array.from({ length: 3 }, (_, i) => filaHistorial(`apl-${i + 1}`))
    const { adaptador } = adaptadorCon([filas])

    const pagina = await adaptador.listarHistorial(FINCA, { pagina: 5, tamanoPagina: 10 })

    expect(pagina.filas).toEqual([])
    expect(pagina.total).toBe(3)
  })
})
