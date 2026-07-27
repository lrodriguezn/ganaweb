export type IdLabel = Readonly<{ id: string; label: string }>
export type KeyLabel = Readonly<{ key: string; label: string }>
export type PesoUltimo = Readonly<{ pesoKg: number; fecha: string }>

export interface AnimalListadoRowDto {
  readonly id: string
  readonly codigo: string
  readonly nombre: string
  readonly sexo: KeyLabel
  readonly raza: IdLabel | null
  readonly fechaNacimiento: string | null
  readonly edadAnios: number | null
  readonly color: IdLabel | null
  readonly origen: IdLabel | null
  readonly codigoMadre: string | null
  readonly nombreMadre: string | null
  readonly codigoPadre: string | null
  readonly nombrePadre: string | null
  readonly propietario: IdLabel | null
  readonly hierro: IdLabel | null
  readonly numeroPezones: number | null
  readonly calidad: IdLabel | null
  readonly codigoArete: string | null
  readonly fechaCompra: string | null
  readonly precioCompra: number | null
  readonly pesoCompraKg: number | null
  readonly tatuado: boolean
  readonly herrado: boolean
  readonly descornado: boolean
  readonly codigoRfid: string | null
  readonly potrero: IdLabel | null
  readonly sector: IdLabel | null
  readonly lote: IdLabel | null
  readonly grupo: IdLabel | null
  readonly comentarios: string | null
  readonly salud: KeyLabel | null
  readonly categoriaReproductiva: KeyLabel | null
  readonly estado: KeyLabel | null
  readonly pesoUltimo: PesoUltimo | null
  readonly codigoQr: string | null
  readonly esDeMonta: boolean
  readonly tipoExplotacion: IdLabel | null
}

export interface AnimalListadoResponseDto {
  readonly data: readonly AnimalListadoRowDto[]
  readonly page: number
  readonly pageSize: 25 | 50 | 100
  readonly total: number
  readonly totalSinFiltro: number
  readonly sort: string
  readonly cols: readonly AnimalListColumnId[]
}

export interface ApiErrorDto {
  readonly error: string
  readonly campo: string | null
  readonly motivo: string
  readonly requestId: string
}

type FilterGrammar = "contains" | "in" | "range" | "drange" | "bool"

export const ANIMAL_LIST_COLUMNS = [
  ["codigo", "codigo", "codigo", "codigo", "contains"],
  ["nombre", "nombre", "nombre", "nombre", "contains"],
  ["sexo", "sexo", "sexoKey", "sexoKey", "in"],
  ["raza", "raza", "razaId", "razaLabel", "in"],
  ["fechaNacimiento", "fechaNacimiento", "fechaNacimiento", "fechaNacimiento", "drange"],
  ["edad", "edadAnios", "edadAnios", "edadAnios", "range"],
  ["color", "color", "colorId", "colorLabel", "in"],
  ["origen", "origen", "tipoIngresoId", "tipoIngresoId", "in"],
  ["codigoMadre", "codigoMadre", "codigoMadre", "codigoMadre", "contains"],
  ["nombreMadre", "nombreMadre", "nombreMadre", "nombreMadre", "contains"],
  ["codigoPadre", "codigoPadre", "codigoPadre", "codigoPadre", "contains"],
  ["nombrePadre", "nombrePadre", "nombrePadre", "nombrePadre", "contains"],
  ["propietario", "propietario", "propietarioId", "propietarioLabel", "in"],
  ["hierro", "hierro", "hierroId", "hierroLabel", "in"],
  ["numeroPezones", "numeroPezones", "numeroPezones", "numeroPezones", "range"],
  ["calidad", "calidad", "calidadAnimalId", "calidadLabel", "in"],
  ["arete", "codigoArete", "codigoArete", "codigoArete", "contains"],
  ["fechaCompra", "fechaCompra", "fechaCompra", "fechaCompra", "drange"],
  ["precioCompra", "precioCompra", "precioCompra", "precioCompra", "range"],
  ["pesoCompra", "pesoCompraKg", "pesoCompraKg", "pesoCompraKg", "range"],
  ["tatuado", "tatuado", "tatuado", "tatuado", "bool"],
  ["herrado", "herrado", "herrado", "herrado", "bool"],
  ["descornado", "descornado", "descornado", "descornado", "bool"],
  ["rfid", "codigoRfid", "codigoRfid", "codigoRfid", "contains"],
  ["potrero", "potrero", "potreroId", "potreroLabel", "in"],
  ["sector", "sector", "sectorId", "sectorLabel", "in"],
  ["lote", "lote", "loteId", "loteLabel", "in"],
  ["grupo", "grupo", "grupoId", "grupoLabel", "in"],
  ["comentarios", "comentarios", "comentarios", null, "contains"],
  ["salud", "salud", "saludKey", "saludKey", "in"],
  [
    "categoriaReproductiva",
    "categoriaReproductiva",
    "categoriaReproductivaKey",
    "categoriaReproductivaKey",
    "in",
  ],
  ["estado", "estado", "estadoKey", "estadoKey", "in"],
  ["pesoUltimo", "pesoUltimo", "pesoUltimoKg", "pesoUltimoKg", "range"],
  ["qr", "codigoQr", "codigoQr", "codigoQr", "contains"],
  ["esDeMonta", "esDeMonta", "esDeMonta", "esDeMonta", "bool"],
  ["tipoExplotacion", "tipoExplotacion", "tipoExplotacionId", "tipoExplotacionLabel", "in"],
] as const satisfies readonly (readonly [string, string, string, string | null, FilterGrammar])[]

export type AnimalListColumnId = (typeof ANIMAL_LIST_COLUMNS)[number][0]
export type AnimalListResponseKey = (typeof ANIMAL_LIST_COLUMNS)[number][1]
export type AnimalListFilterKey = (typeof ANIMAL_LIST_COLUMNS)[number][2]
export type AnimalListSortKey = Exclude<(typeof ANIMAL_LIST_COLUMNS)[number][3], null>

export interface NormalizedAnimalListadoFilter {
  readonly key: AnimalListFilterKey
  readonly grammar: FilterGrammar
  readonly value: string
}

export interface NormalizedAnimalListadoRequest {
  readonly fincaId: string
  readonly page: number
  readonly pageSize: 25 | 50 | 100
  readonly sort: `${AnimalListSortKey}:${"asc" | "desc"}`
  readonly q: string | null
  readonly filters: readonly NormalizedAnimalListadoFilter[]
  readonly cols: readonly AnimalListColumnId[]
}

type ParseResult =
  | Readonly<{ ok: true; value: Omit<NormalizedAnimalListadoRequest, "fincaId"> }>
  | Readonly<{ ok: false; error: Readonly<{ campo: string; motivo: string }> }>

const columnById = new Map<string, (typeof ANIMAL_LIST_COLUMNS)[number]>(
  ANIMAL_LIST_COLUMNS.map((column) => [column[0], column]),
)
const columnByFilterKey = new Map<string, (typeof ANIMAL_LIST_COLUMNS)[number]>(
  ANIMAL_LIST_COLUMNS.map((column) => [column[2], column]),
)
const validSortKeys = new Set<string>(
  ANIMAL_LIST_COLUMNS.flatMap((column) => (column[3] === null ? [] : [column[3]])),
)

const defaultColumns = ANIMAL_LIST_COLUMNS.filter((_, index) => index < 29).map(
  (column) => column[0],
) as AnimalListColumnId[]

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: each branch maps one bounded query grammar error.
export function parseAnimalListadoQuery(search: URLSearchParams): ParseResult {
  const page = parsePositiveInteger(search.get("page") ?? "1")
  if (page === null) return invalid("page", "page debe ser un entero positivo")

  const rawPageSize = search.get("pageSize") ?? "25"
  const pageSize =
    rawPageSize === "25" || rawPageSize === "50" || rawPageSize === "100"
      ? Number(rawPageSize)
      : null
  if (pageSize === null) return invalid("pageSize", "pageSize debe ser 25, 50 o 100")

  const rawSort = search.get("sort") ?? "codigo:asc"
  const [sortKey = "", direction = "", extra] = rawSort.split(":")
  if (extra || (direction !== "asc" && direction !== "desc") || !validSortKeys.has(sortKey)) {
    return invalid("sort", "sort no permitido")
  }

  const cols = normalizeCols(search.get("cols"))
  if (!cols.ok) return cols

  const filters: NormalizedAnimalListadoFilter[] = []
  for (const [parameter, rawValue] of search.entries()) {
    if (!parameter.startsWith("f.")) continue
    const filterKey = parameter.slice(2)
    const column = columnByFilterKey.get(filterKey)
    if (!column) return invalid(parameter, "Filtro no permitido")
    const separator = rawValue.indexOf(":")
    const grammar = rawValue.slice(0, separator) as FilterGrammar
    const value = rawValue.slice(separator + 1)
    if (separator < 1 || grammar !== column[4] || !isValidFilterValue(grammar, value)) {
      return invalid(parameter, "Valor de filtro no permitido")
    }
    filters.push({ key: filterKey as AnimalListFilterKey, grammar, value })
  }

  const q = search.get("q")?.trim() || null
  return {
    ok: true,
    value: {
      page,
      pageSize: pageSize as 25 | 50 | 100,
      sort: `${sortKey}:${direction}` as `${AnimalListSortKey}:${"asc" | "desc"}`,
      q,
      filters,
      cols: cols.value,
    },
  }
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: explicit nullability preserves the 36-field transport contract.
export function mapAnimalListadoRow(
  row: Partial<AnimalListadoRowDto> &
    Pick<AnimalListadoRowDto, "id" | "codigo" | "nombre" | "sexo">,
): AnimalListadoRowDto {
  return {
    id: row.id,
    codigo: row.codigo,
    nombre: row.nombre,
    sexo: row.sexo,
    raza: row.raza ?? null,
    fechaNacimiento: row.fechaNacimiento ?? null,
    edadAnios: row.edadAnios ?? null,
    color: row.color ?? null,
    origen: row.origen ?? null,
    codigoMadre: row.codigoMadre ?? null,
    nombreMadre: row.nombreMadre ?? null,
    codigoPadre: row.codigoPadre ?? null,
    nombrePadre: row.nombrePadre ?? null,
    propietario: row.propietario ?? null,
    hierro: row.hierro ?? null,
    numeroPezones: row.numeroPezones ?? null,
    calidad: row.calidad ?? null,
    codigoArete: row.codigoArete ?? null,
    fechaCompra: row.fechaCompra ?? null,
    precioCompra: row.precioCompra ?? null,
    pesoCompraKg: row.pesoCompraKg ?? null,
    tatuado: row.tatuado ?? false,
    herrado: row.herrado ?? false,
    descornado: row.descornado ?? false,
    codigoRfid: row.codigoRfid ?? null,
    potrero: row.potrero ?? null,
    sector: row.sector ?? null,
    lote: row.lote ?? null,
    grupo: row.grupo ?? null,
    comentarios: row.comentarios ?? null,
    salud: row.salud ?? null,
    categoriaReproductiva: row.categoriaReproductiva ?? null,
    estado: row.estado ?? null,
    pesoUltimo: row.pesoUltimo ?? null,
    codigoQr: row.codigoQr ?? null,
    esDeMonta: row.esDeMonta ?? false,
    tipoExplotacion: row.tipoExplotacion ?? null,
  }
}

export function apiError(
  error: string,
  campo: string | null,
  motivo: string,
  requestId: string,
): ApiErrorDto {
  return { error, campo, motivo, requestId }
}

function normalizeCols(
  rawCols: string | null,
):
  | Readonly<{ ok: true; value: readonly AnimalListColumnId[] }>
  | Readonly<{ ok: false; error: Readonly<{ campo: string; motivo: string }> }> {
  if (!rawCols) return { ok: true, value: defaultColumns }
  const values = rawCols.split(",")
  if (new Set(values).size !== values.length)
    return invalid("cols", "cols no puede contener valores repetidos")
  if (values.some((value) => !columnById.has(value)))
    return invalid("cols", "cols contiene una columna no permitida")
  return {
    ok: true,
    value: [...values].sort(
      (left, right) =>
        ANIMAL_LIST_COLUMNS.findIndex((column) => column[0] === left) -
        ANIMAL_LIST_COLUMNS.findIndex((column) => column[0] === right),
    ) as AnimalListColumnId[],
  }
}

function parsePositiveInteger(raw: string): number | null {
  const value = Number(raw)
  return Number.isSafeInteger(value) && value > 0 ? value : null
}

function isValidFilterValue(grammar: FilterGrammar, value: string): boolean {
  if (!value) return false
  if (grammar === "contains") return true
  if (grammar === "in") return value.split(",").every(Boolean)
  if (grammar === "bool") return value === "true" || value === "false"
  if (grammar === "range")
    return value.split(",").length === 2 && value.split(",").every(isFiniteNumber)
  return value.split(",").length === 2 && value.split(",").every(isIsoDate)
}

function isFiniteNumber(value: string): boolean {
  return value.trim() !== "" && Number.isFinite(Number(value))
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

function invalid(
  campo: string,
  motivo: string,
): Readonly<{ ok: false; error: Readonly<{ campo: string; motivo: string }> }> {
  return { ok: false, error: { campo, motivo } }
}
