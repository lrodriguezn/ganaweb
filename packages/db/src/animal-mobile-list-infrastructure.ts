/**
 * Read model for the mobile animal listing (RF-ANIM-LIST-M v1.1,
 * LM-020/LM-021/LM-010). Mirrors the desktop `DrizzleAnimalListadoReadModel`
 * pattern: fail-closed authz CTE + three bounded statements (filtered count,
 * page, unfiltered count) and server-side text resolution via joins (no N+1).
 *
 * DB trap (verified): in `config_key_values` the options `sexo` and
 * `salud_animal` store the TEXT label in column `key` and the NUMBER in
 * column `value` (sexo: Macho/0, Hembra/1, Pajuela/2; salud_animal:
 * Sano/0, Enfermo/1). The joins therefore match on `value = a.<col>::text`
 * and select `.key` as the label.
 */
import type {
  AnimalMobileFilterKey,
  AnimalMobileListReadPort,
  AnimalMobileListReadRequest,
  AnimalMobileListReadResult,
  AnimalMobileMadre,
  AnimalMobileRow,
} from "@ganaweb/aplicacion"
import { type SQL, sql } from "drizzle-orm"
import { AnimalListadoForbiddenError } from "./animal-infrastructure.js"
import type { DbClient } from "./client.js"

export { AnimalListadoForbiddenError }

type AnimalMobileListDbRow = Record<string, unknown>

/**
 * Static domain label map for `categoria_reproductiva` (LM-021). No
 * `config_key_values` rows exist for this enum (verified in DB), so labels
 * match the UI map (`packages/ui/src/ganado/estado-badge.tsx`). `no_aplica`,
 * NULL and unknown values resolve to `categoriaReproductiva: null`.
 */
export const ETIQUETAS_CATEGORIA_REPRODUCTIVA: Readonly<Record<string, string>> = {
  vacia: "Vacía",
  servida: "Servida",
  prenada: "Preñada",
  parida: "Parida",
  novilla: "Novilla",
}

const mobileFilterColumns: Record<AnimalMobileFilterKey, SQL> = {
  categoriaReproductivaKey: sql`a.categoria_reproductiva`,
  saludKey: sql`a.salud_animal_key`,
  propietarioId: sql`a.propietario_id`,
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null
}

function idLabel(id: unknown, label: unknown) {
  const validId = nullableString(id)
  return validId
    ? { id: validId, label: nullableString(label) ?? `Desconocido (${validId})` }
    : null
}

function escapeLikeLiteral(value: string): string {
  return value.replaceAll("!", "!!").replaceAll("%", "!%").replaceAll("_", "!_")
}

function normalizedContains(column: SQL, value: string): SQL {
  const pattern = `%${escapeLikeLiteral(value)}%`
  return sql`public.unaccent(pg_catalog.lower(${column})) LIKE public.unaccent(pg_catalog.lower(${pattern})) ESCAPE '!'`
}

// Accent/case-insensitive contains over the four LM-014 fields
// (same predicate shape as the desktop buildSearchPredicate).
function buildMobileSearchPredicate(q: string): SQL {
  return sql`(${normalizedContains(sql`a.codigo`, q)} OR ${normalizedContains(sql`a.nombre`, q)} OR ${normalizedContains(sql`a.codigo_arete`, q)} OR ${normalizedContains(sql`a.codigo_rfid`, q)})`
}

function buildMobileWhere(request: AnimalMobileListReadRequest): SQL {
  const predicates: SQL[] = [sql`a.estado_animal_key = 0`]
  if (request.q) predicates.push(buildMobileSearchPredicate(request.q))
  for (const filter of request.filters) {
    const column = mobileFilterColumns[filter.key]
    if (!column) throw new Error(`Unsupported animal-mobile-list filter: ${filter.key}`)
    predicates.push(sql`${column} = ${filter.value}`)
  }
  return sql`WHERE a.finca_id = ${request.fincaId} AND a.activo = 1 AND ${sql.join(predicates, sql` AND `)}`
}

function resolverMadre(row: AnimalMobileListDbRow): AnimalMobileMadre | null {
  const madreId = nullableString(row.madre_id)
  const madreCodigoJoin = nullableString(row.madre_codigo_join)
  if (madreId && madreCodigoJoin) {
    return { codigo: madreCodigoJoin, nombre: nullableString(row.madre_nombre_join) }
  }
  const codigoMadre = nullableString(row.codigo_madre)
  if (codigoMadre) return { codigo: codigoMadre, nombre: null }
  return null
}

export function mapAnimalMobileListDbRow(row: AnimalMobileListDbRow): AnimalMobileRow {
  const sexoKey = Number(row.sexo_key ?? 0)
  const saludKey = Number(row.salud_animal_key ?? 0)
  const categoriaCruda = nullableString(row.categoria_reproductiva)?.trim() || null
  const etiquetaCategoria = categoriaCruda
    ? ETIQUETAS_CATEGORIA_REPRODUCTIVA[categoriaCruda]
    : undefined
  return {
    id: String(row.id),
    codigo: String(row.codigo),
    nombre: String(row.nombre ?? ""),
    sexo: {
      key: String(sexoKey),
      label: nullableString(row.sexo_label) ?? `Desconocido (${sexoKey})`,
    },
    raza: idLabel(row.raza_id, row.raza_nombre),
    categoriaReproductiva:
      categoriaCruda && etiquetaCategoria
        ? { key: categoriaCruda, label: etiquetaCategoria }
        : null,
    salud: {
      key: String(saludKey),
      label: nullableString(row.salud_label) ?? `Desconocido (${saludKey})`,
    },
    esDeMonta: Number(row.es_de_monta ?? 0) === 1,
    propietario: idLabel(row.propietario_id, row.propietario_nombre),
    madre: resolverMadre(row),
  }
}

export class DrizzleAnimalMobileListReadModel implements AnimalMobileListReadPort {
  lastStatementCount = 0
  constructor(private readonly db: DbClient) {}

  async listar(request: AnimalMobileListReadRequest): Promise<AnimalMobileListReadResult> {
    const where = buildMobileWhere(request)
    this.lastStatementCount = 0
    const filtered = await this.db.execute(
      sql`WITH authz AS (SELECT EXISTS (SELECT 1 FROM usuarios u JOIN usuarios_fincas uf ON uf.usuario_id = u.id JOIN usuarios_roles_asignacion ura ON ura.usuario_id = u.id AND ura.finca_id = uf.finca_id JOIN usuarios_roles ur ON ur.id = ura.rol_id JOIN roles_permisos rp ON rp.rol_id = ur.id JOIN usuarios_permisos up ON up.id = rp.permiso_id WHERE u.id = ${request.usuarioId} AND u.activo = 1 AND uf.finca_id = ${request.fincaId} AND uf.activo = 1 AND ura.activo = 1 AND ur.activo = 1 AND rp.activo = 1 AND up.activo = 1 AND up.modulo = 'animales' AND up.accion = 'ver') AS authorized) SELECT CASE WHEN authorized THEN (SELECT count(*)::int FROM animales a ${where}) ELSE 0 END AS count, authorized FROM authz`,
    )
    this.lastStatementCount += 1
    const filteredRows = filtered as Array<Record<string, unknown>>
    if (filteredRows[0]?.authorized !== true) throw new AnimalListadoForbiddenError()
    const total = Number(filteredRows[0]?.count ?? 0)
    const page = await this.db.execute(
      sql`WITH pagina AS (SELECT a.id FROM animales a ${where} ORDER BY a.codigo ASC, a.id ASC LIMIT ${request.pageSize} OFFSET ${(request.page - 1) * request.pageSize}) SELECT a.id, a.codigo, a.nombre, a.sexo_key, a.salud_animal_key, a.categoria_reproductiva, a.es_de_monta, a.raza_id, raza.nombre AS raza_nombre, a.propietario_id, propietario.nombre AS propietario_nombre, a.madre_id, a.codigo_madre, madre.codigo AS madre_codigo_join, madre.nombre AS madre_nombre_join, sexo_catalogo.key AS sexo_label, salud_catalogo.key AS salud_label FROM pagina p JOIN animales a ON a.id = p.id LEFT JOIN config_razas raza ON raza.id = a.raza_id LEFT JOIN propietarios propietario ON propietario.id = a.propietario_id LEFT JOIN animales madre ON madre.id = a.madre_id LEFT JOIN config_key_values sexo_catalogo ON sexo_catalogo.opcion = 'sexo' AND sexo_catalogo.value = a.sexo_key::text LEFT JOIN config_key_values salud_catalogo ON salud_catalogo.opcion = 'salud_animal' AND salud_catalogo.value = a.salud_animal_key::text ORDER BY a.codigo ASC, a.id ASC`,
    )
    this.lastStatementCount += 1
    const unfiltered = await this.db.execute(
      sql`SELECT count(*)::int AS count FROM animales WHERE finca_id = ${request.fincaId} AND activo = 1 AND estado_animal_key = 0`,
    )
    this.lastStatementCount += 1
    const pageRows = page as AnimalMobileListDbRow[]
    const unfilteredRows = unfiltered as Array<Record<string, unknown>>
    return {
      data: pageRows.map(mapAnimalMobileListDbRow),
      page: request.page,
      pageSize: request.pageSize,
      total,
      totalSinFiltro: Number(unfilteredRows[0]?.count ?? 0),
      hayMas: request.page * request.pageSize < total,
    }
  }
}
