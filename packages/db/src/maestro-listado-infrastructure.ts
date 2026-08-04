/**
 * Adaptador Drizzle de listado de Configuración · Maestros (issue #148,
 * RF-CONFIG-MAESTROS v1.0, CM-034/CM-040).
 *
 * Data-driven sobre el MISMO registro `FAMILIAS` del adaptador de
 * escritura (CM-061: extender adaptadores existentes, no duplicar): tabla,
 * columnas id/finca_id/nombre/activo y el mapeo clave snake_case → columna
 * Drizzle se importan de `maestro-escritura-infrastructure.ts`.
 *
 * Reglas implementadas:
 * - CM-034: filtro base finca_id + activo=1 (sin filtro de activo con
 *   `incluirInactivos`), búsqueda case-insensitive (ILIKE) sobre `nombre`
 *   —+ `codigo` en potreros/sectores y + `numero_documento` en
 *   propietarios (OR entre columnas)—, orden nombre ASC con segunda
 *   ordenación estable por id ASC, y paginación LIMIT/OFFSET con `total`
 *   calculado con el mismo filtro (sin límite).
 * - CM-040: "inseminadores" es la tabla veterinarios con el filtro
 *   adicional es_inseminador=1 (activos por defecto; `incluirInactivos`
 *   muestra también inseminadores inactivos).
 * - Los comodines LIKE (%, _, \) del término de búsqueda se escapan para
 *   que se interpreten literalmente.
 * - Las filas mapean TODAS las columnas de la tabla a claves snake_case
 *   (las mismas de `DatosMaestroNormalizados`) + id + activo; NULL → null.
 * - RN-050: solo lectura — nunca borrado físico.
 */

import type {
  FamiliaMaestro,
  MaestroFila,
  MaestroListadoOpciones,
  MaestroListadoPort,
  MaestroListadoResultado,
} from "@ganaweb/aplicacion"
import { type SQL, and, asc, eq, ilike, or, sql } from "drizzle-orm"
import type { AnyPgColumn } from "drizzle-orm/pg-core"
import type { DbClient } from "./client.js"
import { type ConfigFamiliaMaestro, FAMILIAS } from "./maestro-escritura-infrastructure.js"
import { veterinarios } from "./schema/index.js"

const PAGINA_DEFAULT = 1
const PAGE_SIZE_DEFAULT = 25

/**
 * CM-034: columnas de búsqueda adicionales a `nombre` por familia.
 * "inseminadores" busca solo por nombre (veterinarios).
 */
const COLUMNAS_BUSQUEDA_EXTRA: Readonly<
  Partial<Record<FamiliaMaestro | "inseminadores", readonly string[]>>
> = {
  potreros: ["codigo"],
  sectores: ["codigo"],
  propietarios: ["numero_documento"],
}

/** CM-034: escapa los comodines LIKE del término para que sean literales. */
export function escaparBusquedaIlike(busqueda: string): string {
  return busqueda.replace(/[\\%_]/g, (caracter) => `\\${caracter}`)
}

/**
 * CM-034: condición ILIKE sobre `nombre` (+ columnas extra de la familia),
 * con el término ya recortado. Devuelve `undefined` si no hay búsqueda.
 */
function condicionBusqueda(
  maestro: FamiliaMaestro | "inseminadores",
  config: ConfigFamiliaMaestro,
  busqueda: string,
): SQL | undefined {
  const patron = `%${escaparBusquedaIlike(busqueda)}%`
  const columnasBusqueda: AnyPgColumn[] = [config.nombre]
  for (const clave of COLUMNAS_BUSQUEDA_EXTRA[maestro] ?? []) {
    const columna = config.columnas[clave]
    if (columna !== undefined) columnasBusqueda.push(columna)
  }
  const primera = columnasBusqueda[0]
  return columnasBusqueda.length === 1 && primera !== undefined
    ? ilike(primera, patron)
    : or(...columnasBusqueda.map((columna) => ilike(columna, patron)))
}

export class DrizzleMaestroListadoAdapter implements MaestroListadoPort {
  constructor(private readonly db: DbClient) {}

  async listar(
    maestro: FamiliaMaestro | "inseminadores",
    fincaId: string,
    opciones?: MaestroListadoOpciones,
  ): Promise<MaestroListadoResultado> {
    const soloInseminadores = maestro === "inseminadores"
    const config: ConfigFamiliaMaestro = soloInseminadores
      ? FAMILIAS.veterinarios
      : FAMILIAS[maestro]
    const pagina = Math.max(PAGINA_DEFAULT, Math.floor(opciones?.pagina ?? PAGINA_DEFAULT))
    const pageSize = opciones?.pageSize ?? PAGE_SIZE_DEFAULT

    const condiciones: SQL[] = [eq(config.fincaId, fincaId)]
    if (opciones?.incluirInactivos !== true) condiciones.push(eq(config.activo, 1))
    if (soloInseminadores) condiciones.push(eq(veterinarios.esInseminador, 1))

    const busqueda = opciones?.busqueda?.trim()
    if (busqueda) {
      const ilikeBusqueda = condicionBusqueda(maestro, config, busqueda)
      if (ilikeBusqueda !== undefined) condiciones.push(ilikeBusqueda)
    }

    const donde = and(...condiciones)
    const seleccion: Record<string, AnyPgColumn> = {
      id: config.id,
      activo: config.activo,
      ...config.columnas,
    }

    const filas = await this.db
      .select(seleccion)
      .from(config.tabla)
      .where(donde)
      .orderBy(asc(config.nombre), asc(config.id))
      .limit(pageSize)
      .offset((pagina - 1) * pageSize)

    const [filaTotal] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(config.tabla)
      .where(donde)

    return {
      filas: filas as MaestroFila[],
      total: Number(filaTotal?.total ?? 0),
      pagina,
      pageSize,
    }
  }
}
