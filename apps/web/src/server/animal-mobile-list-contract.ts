/**
 * HTTP contract for the mobile animal listing (RF-ANIM-LIST-M v1.1,
 * LM-020/LM-021/LM-023). Parser validation mirrors the desktop
 * `parseAnimalListadoQuery` style: first invalid param wins, actionable
 * `campo` + `motivo`, filters travel by key/id with grammar `in:<valor>`.
 * The read result is already DTO-shaped (see `AnimalMobileListReadResult`),
 * so no extra mapping layer is needed here.
 */
import type {
  AnimalMobileFilterKey,
  AnimalMobileListReadResult,
  AnimalMobileRow,
} from "@ganaweb/aplicacion"

export { apiError } from "./animal-list-contract.js"
export type { ApiErrorDto, IdLabel, KeyLabel } from "./animal-list-contract.js"

export type AnimalMobileRowDto = AnimalMobileRow
export type AnimalMobileListResponseDto = AnimalMobileListReadResult
export type MadreDto = AnimalMobileRow["madre"]

export interface NormalizedAnimalMobileFilter {
  readonly key: AnimalMobileFilterKey
  readonly value: string
}

export interface NormalizedAnimalMobileListRequest {
  readonly page: number
  readonly pageSize: 20 | 25 | 30
  readonly q: string | null
  readonly filters: readonly NormalizedAnimalMobileFilter[]
}

type ParseResult =
  | Readonly<{ ok: true; value: NormalizedAnimalMobileListRequest }>
  | Readonly<{ ok: false; error: Readonly<{ campo: string; motivo: string }> }>

const CATEGORIAS_REPRODUCTIVAS_VALIDAS = new Set<string>([
  "vacia",
  "servida",
  "prenada",
  "parida",
  "novilla",
  "no_aplica",
])

const MOBILE_FILTER_KEYS: ReadonlyMap<string, (value: string) => boolean> = new Map<
  string,
  (value: string) => boolean
>([
  ["categoriaReproductivaKey", (value) => CATEGORIAS_REPRODUCTIVAS_VALIDAS.has(value)],
  ["saludKey", (value) => value === "0" || value === "1"],
  ["propietarioId", (value) => value !== "" && !value.includes(",")],
])

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: each branch maps one bounded query grammar error.
export function parseAnimalMobileListQuery(search: URLSearchParams): ParseResult {
  const page = parsePositiveInteger(search.get("page") ?? "1")
  if (page === null) return invalid("page", "page debe ser un entero positivo")

  const rawPageSize = search.get("pageSize") ?? "25"
  const pageSize =
    rawPageSize === "20" || rawPageSize === "25" || rawPageSize === "30"
      ? Number(rawPageSize)
      : null
  if (pageSize === null) return invalid("pageSize", "pageSize debe ser 20, 25 o 30")

  const rawQ = search.get("q")
  if (rawQ !== null) {
    if (rawQ.trim() === "") return invalid("q", "q no puede estar vacío")
  }
  const q = rawQ === null ? null : rawQ.trim()

  const filters: NormalizedAnimalMobileFilter[] = []
  for (const [parameter, rawValue] of search.entries()) {
    if (!parameter.startsWith("f.")) continue
    const filterKey = parameter.slice(2)
    const isValidValue = MOBILE_FILTER_KEYS.get(filterKey)
    if (!isValidValue) return invalid(parameter, "Filtro no permitido")
    const separator = rawValue.indexOf(":")
    const grammar = rawValue.slice(0, separator)
    const value = rawValue.slice(separator + 1)
    if (separator < 1 || grammar !== "in" || !isValidValue(value)) {
      return invalid(parameter, "Valor de filtro no permitido")
    }
    filters.push({ key: filterKey as AnimalMobileFilterKey, value })
  }

  return { ok: true, value: { page, pageSize: pageSize as 20 | 25 | 30, q, filters } }
}

function parsePositiveInteger(raw: string): number | null {
  const value = Number(raw)
  return Number.isSafeInteger(value) && value > 0 ? value : null
}

function invalid(
  campo: string,
  motivo: string,
): Readonly<{ ok: false; error: Readonly<{ campo: string; motivo: string }> }> {
  return { ok: false, error: { campo, motivo } }
}
