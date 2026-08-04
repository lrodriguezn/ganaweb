/**
 * Adaptador Drizzle de conteos del hub de Configuración · Maestros
 * (issue #147, RF-CONFIG-MAESTROS v1.0).
 *
 * CM-061: los conteos del hub se resuelven en UNA única consulta agregada
 * (UNION ALL de subselects) en vez de 15 consultas separadas — el volumen
 * de maestros por finca es bajo y los índices existentes bastan (CM-062).
 *
 * La consulta devuelve filas `{ clave, cantidad }`:
 * - 11 conteos por familia: registros activo=1 de la finca.
 * - `inseminadores` (CM-040): veterinarios activo=1 AND es_inseminador=1.
 * - `finca_completa` (CM-007): 1 si la finca tiene nombre no blank Y
 *   departamento o municipio no blank (vereda sola NO cuenta); 0 en otro
 *   caso (incluida finca inexistente).
 * - `razas` / `tipos_explotacion` / `calidades`: catálogos globales
 *   (config_razas, config_tipos_explotacion, config_calidad_animal) activo=1.
 *
 * Clave faltante en el resultado → 0 / false (nunca falla por fila ausente).
 *
 * CM-014: `contarPorFamilia` / `contarCatalogoGlobal` resuelven conteos
 * individuales (queries pequeñas) para la degradación por card del hub
 * cuando `contarTodo` falla; nunca lanzan — devuelven `null` en error.
 */

import type {
  ConteoCatalogoGlobalClave,
  ConteoFamiliaClave,
  ConteosMaestrosPort,
  ConteosMaestrosResultado,
  FamiliaMaestro,
} from "@ganaweb/aplicacion"
import { type SQL, sql } from "drizzle-orm"
import type { DbClient } from "./client.js"

/** Clave del resultado por familia → nombre SQL de su tabla. */
const CONTEOS_FAMILIAS: ReadonlyArray<readonly [FamiliaMaestro, string]> = [
  ["veterinarios", "veterinarios"],
  ["propietarios", "propietarios"],
  ["potreros", "potreros"],
  ["sectores", "sectores"],
  ["lotes", "lotes"],
  ["grupos", "grupos"],
  ["hierros", "hierros"],
  ["diagnosticos", "diagnosticos_veterinarios"],
  ["motivos_ventas", "motivos_ventas"],
  ["causas_muerte", "causas_muerte"],
  ["lugares_compras", "lugares_compras"],
]

const FAMILIAS_EN_CERO: Readonly<Record<FamiliaMaestro, number>> = {
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
}

/** CM-014: catálogo global → nombre SQL de su tabla. */
const TABLAS_CATALOGOS_GLOBALES: Readonly<Record<ConteoCatalogoGlobalClave, string>> = {
  razas: "config_razas",
  tiposExplotacion: "config_tipos_explotacion",
  calidades: "config_calidad_animal",
}

const TABLA_POR_FAMILIA: ReadonlyMap<FamiliaMaestro, string> = new Map(CONTEOS_FAMILIAS)

/**
 * CM-007: misma condición de completitud que `contarTodo` — nombre no
 * blank Y (departamento o municipio no blank; vereda sola no cuenta).
 */
const CONDICION_FINCA_COMPLETA = sql`nombre IS NOT NULL AND trim(nombre) <> ''
  AND ((departamento IS NOT NULL AND trim(departamento) <> '')
    OR (municipio IS NOT NULL AND trim(municipio) <> ''))`

export class DrizzleConteosMaestrosAdapter implements ConteosMaestrosPort {
  constructor(private readonly db: DbClient) {}

  async contarTodo(fincaId: string): Promise<ConteosMaestrosResultado> {
    const porFamilia = sql.join(
      CONTEOS_FAMILIAS.map(
        ([clave, tabla]) => sql`SELECT ${sql.raw(`'${clave}'`)} AS clave, count(*)::int AS cantidad
          FROM ${sql.raw(tabla)} WHERE finca_id = ${fincaId} AND activo = 1`,
      ),
      sql` UNION ALL `,
    )
    const statement = sql`${porFamilia}
      UNION ALL SELECT 'inseminadores' AS clave, count(*)::int AS cantidad
        FROM veterinarios WHERE finca_id = ${fincaId} AND activo = 1 AND es_inseminador = 1
      UNION ALL SELECT 'finca_completa' AS clave, count(*)::int AS cantidad
        FROM fincas WHERE id = ${fincaId} AND ${CONDICION_FINCA_COMPLETA}
      UNION ALL SELECT 'razas' AS clave, count(*)::int AS cantidad
        FROM config_razas WHERE activo = 1
      UNION ALL SELECT 'tipos_explotacion' AS clave, count(*)::int AS cantidad
        FROM config_tipos_explotacion WHERE activo = 1
      UNION ALL SELECT 'calidades' AS clave, count(*)::int AS cantidad
        FROM config_calidad_animal WHERE activo = 1`

    const filas = (await this.db.execute(statement)) as { clave: string; cantidad: number }[]

    const porMaestro: Record<FamiliaMaestro, number> = { ...FAMILIAS_EN_CERO }
    let inseminadores = 0
    let fincaCompleta = false
    const catalogosGlobales = { razas: 0, tiposExplotacion: 0, calidades: 0 }

    for (const fila of filas) {
      const cantidad = Number(fila.cantidad)
      switch (fila.clave) {
        case "inseminadores":
          inseminadores = cantidad
          break
        case "finca_completa":
          fincaCompleta = cantidad > 0
          break
        case "razas":
          catalogosGlobales.razas = cantidad
          break
        case "tipos_explotacion":
          catalogosGlobales.tiposExplotacion = cantidad
          break
        case "calidades":
          catalogosGlobales.calidades = cantidad
          break
        default:
          if (Object.hasOwn(porMaestro, fila.clave)) {
            porMaestro[fila.clave as FamiliaMaestro] = cantidad
          }
      }
    }

    return { porMaestro, inseminadores, fincaCompleta, catalogosGlobales }
  }

  /**
   * CM-014: conteo individual para la degradación por card del hub cuando
   * `contarTodo` falla. Query pequeña por familia; NUNCA lanza — devuelve
   * `null` en cualquier error. `fincaCompleta` devuelve 1/0 con la misma
   * condición de completitud que `contarTodo` (CM-007).
   */
  async contarPorFamilia(fincaId: string, familia: ConteoFamiliaClave): Promise<number | null> {
    try {
      let statement: SQL
      if (familia === "fincaCompleta") {
        statement = sql`SELECT count(*)::int AS cantidad
          FROM fincas WHERE id = ${fincaId} AND ${CONDICION_FINCA_COMPLETA}`
      } else if (familia === "inseminadores") {
        statement = sql`SELECT count(*)::int AS cantidad
          FROM veterinarios WHERE finca_id = ${fincaId} AND activo = 1 AND es_inseminador = 1`
      } else {
        const tabla = TABLA_POR_FAMILIA.get(familia)
        if (tabla === undefined) return null
        statement = sql`SELECT count(*)::int AS cantidad
          FROM ${sql.raw(tabla)} WHERE finca_id = ${fincaId} AND activo = 1`
      }
      const filas = (await this.db.execute(statement)) as { cantidad: number }[]
      const cantidad = Number(filas[0]?.cantidad ?? 0)
      return familia === "fincaCompleta" ? (cantidad > 0 ? 1 : 0) : cantidad
    } catch {
      return null
    }
  }

  /** CM-014: conteo individual de un catálogo global. Nunca lanza. */
  async contarCatalogoGlobal(catalogo: ConteoCatalogoGlobalClave): Promise<number | null> {
    try {
      const tabla = TABLAS_CATALOGOS_GLOBALES[catalogo]
      const statement = sql`SELECT count(*)::int AS cantidad
        FROM ${sql.raw(tabla)} WHERE activo = 1`
      const filas = (await this.db.execute(statement)) as { cantidad: number }[]
      return Number(filas[0]?.cantidad ?? 0)
    } catch {
      return null
    }
  }
}
