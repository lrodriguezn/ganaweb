/**
 * #110 PR1 — Normalization and validation for animal-list preferences.
 *
 * Normalization (lenient, used on GET): filters to registered columns,
 * dedupes, injects mandatory `codigo`/`nombre`, sorts by canonical registry
 * order, and falls back to the 29 base columns / page size 25 on any miss.
 *
 * Validation (strict, used on PUT): rejects unregistered columns, duplicate
 * entries, and non-whitelisted page sizes with a structured field error so
 * the HTTP handler can return a 400.
 */
import {
  ANIMAL_LIST_DEFAULT_COLUMNS,
  type AnimalListColumnId,
  animalListColumnOrdinal,
  isRegisteredAnimalListColumn,
} from "./animal-list-contract.js"

export type PreferenciasPageSize = 25 | 50 | 100

export interface AnimalListadoPreferenciasNormalizadas {
  readonly cols: readonly AnimalListColumnId[]
  readonly pageSize: PreferenciasPageSize
}

const PAGE_SIZE_WHITELIST: readonly number[] = [25, 50, 100]
const DEFAULT_PAGE_SIZE: PreferenciasPageSize = 25
const MANDATORY_COLS: readonly AnimalListColumnId[] = ["codigo", "nombre"]

/** The 29 base columns — re-exported from the shared contract registry. */
export const PREFERENCIAS_DEFAULT_COLS: readonly AnimalListColumnId[] = ANIMAL_LIST_DEFAULT_COLUMNS

export function normalizePreferenciasPageSize(
  rawPageSize: number | null | undefined,
): PreferenciasPageSize {
  if (
    rawPageSize !== null &&
    rawPageSize !== undefined &&
    PAGE_SIZE_WHITELIST.includes(rawPageSize)
  ) {
    return rawPageSize as PreferenciasPageSize
  }
  return DEFAULT_PAGE_SIZE
}

export function normalizePreferenciasCols(
  rawCols: readonly string[] | null | undefined,
): readonly AnimalListColumnId[] {
  if (!rawCols || rawCols.length === 0) return PREFERENCIAS_DEFAULT_COLS

  // Registered-only + dedupe (first occurrence wins).
  const seen = new Set<string>()
  const registered: string[] = []
  for (const col of rawCols) {
    if (isRegisteredAnimalListColumn(col) && !seen.has(col)) {
      seen.add(col)
      registered.push(col)
    }
  }

  // Nothing valid survived filtering → fall back to the 29 base columns.
  if (registered.length === 0) return PREFERENCIAS_DEFAULT_COLS

  // Inject mandatory columns if absent.
  for (const mandatory of MANDATORY_COLS) {
    if (!seen.has(mandatory)) {
      seen.add(mandatory)
      registered.push(mandatory)
    }
  }

  // Sort by canonical registry ordinal.
  return registered.sort(
    (a, b) => animalListColumnOrdinal(a) - animalListColumnOrdinal(b),
  ) as AnimalListColumnId[]
}

export function normalizePreferencias(input: {
  cols?: readonly string[] | null
  pageSize?: number | null
}): AnimalListadoPreferenciasNormalizadas {
  return {
    cols: normalizePreferenciasCols(input.cols),
    pageSize: normalizePreferenciasPageSize(input.pageSize),
  }
}

export type ValidatePreferenciasResult =
  | { readonly ok: true; readonly value: AnimalListadoPreferenciasNormalizadas }
  | { readonly ok: false; readonly error: Readonly<{ campo: string; motivo: string }> }

/**
 * Strict PUT-body validation. Rejects unregistered columns, duplicates,
 * non-whitelisted page sizes, and malformed shapes with a field-level error.
 * On success the value is already normalized (mandatory cols added, sorted).
 */
export function validatePreferenciasBody(body: unknown): ValidatePreferenciasResult {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: { campo: "body", motivo: "Cuerpo de solicitud inválido" } }
  }

  const record = body as Record<string, unknown>

  if (!Array.isArray(record.cols)) {
    return { ok: false, error: { campo: "cols", motivo: "cols debe ser un arreglo" } }
  }

  const rawCols = record.cols as unknown[]
  if (!rawCols.every((col): col is string => typeof col === "string")) {
    return { ok: false, error: { campo: "cols", motivo: "cols debe contener solo strings" } }
  }

  const stringCols = rawCols as string[]

  // Reject duplicates — the PUT contract requires a clean set.
  if (new Set(stringCols).size !== stringCols.length) {
    return { ok: false, error: { campo: "cols", motivo: "cols no puede contener valores repetidos" } }
  }

  const unregistered = stringCols.filter((col) => !isRegisteredAnimalListColumn(col))
  if (unregistered.length > 0) {
    return { ok: false, error: { campo: "cols", motivo: "cols contiene una columna no permitida" } }
  }

  if (record.pageSize === undefined || record.pageSize === null) {
    return { ok: false, error: { campo: "pageSize", motivo: "pageSize es requerido" } }
  }

  if (typeof record.pageSize !== "number" || !PAGE_SIZE_WHITELIST.includes(record.pageSize)) {
    return { ok: false, error: { campo: "pageSize", motivo: "pageSize debe ser 25, 50 o 100" } }
  }

  return {
    ok: true,
    value: normalizePreferencias({ cols: stringCols, pageSize: record.pageSize }),
  }
}
