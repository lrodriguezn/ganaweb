/**
 * Issue #157/#158 — typed client adapter for the #155 mobile endpoint
 * (`GET /api/fincas/{fincaId}/animales/mobile`). Mobile equivalent of the
 * desktop `cargarListadoDesktop` transport (animal-listado-route-adapter.ts):
 * a pure URL builder from the filter state plus a typed fetch with an
 * injectable `fetchImpl` seam and an AbortSignal timeout budget.
 *
 * Grammar (RF-ANIM-LIST-M v1.1 §4): filters travel by key/id with grammar
 * `in:<valor>` — NEVER labels (LA-001/CA-UI-001). Every chip/propietario/
 * search change requests `page=1` (LM-009); #158 requests `page=N` through
 * the `pagina` option for infinite-scroll accumulation.
 *
 * Failure policy (LM-023, mirrors the desktop transport): a 400 maps to
 * `consulta_invalida` carrying the parsed `ApiErrorDto` — the route sanitizes
 * the offending filter by `campo`, toasts, retains the last valid list, and
 * refetches page 1; a 403 maps to `sin_acceso`; any other non-200 (500), an
 * unparseable body, a network failure, or a timeout abort maps to
 * `error_servidor` — the route shows the retriable error state, never a
 * silent empty list.
 *
 * LM-011 (offline, future — gate `no-sqlite`): when the local replica
 * exists, the same use case runs against SQLite WASM with no contract
 * change — this adapter is the online transport; the offline path swaps
 * `fetchImpl` for the replica-backed port and keeps the
 * `ResultadoListadoMobileCliente` mapping intact.
 */
import type { AnimalMobileListReadResult } from "@ganaweb/aplicacion"

import type {
  AnimalMobileListResponseDto,
  ApiErrorDto,
} from "../../server/animal-mobile-list-contract.js"

export type ChipListadoMobile = "todas" | "prenadas" | "enfermas"

export interface FiltrosListadoMobile {
  readonly chip: ChipListadoMobile
  /** Id del propietario seleccionado; `null` = todos los propietarios. */
  readonly propietarioId: string | null
  readonly q: string
}

export type ResultadoListadoMobileCliente =
  | { readonly tipo: "listo"; readonly resultado: AnimalMobileListResponseDto }
  | { readonly tipo: "consulta_invalida"; readonly error: ApiErrorDto }
  | { readonly tipo: "sin_acceso" }
  | { readonly tipo: "error_servidor" }

export interface OpcionesCargaListadoMobile {
  /** Injectable transport seam (tests); defaults to the global `fetch`. */
  readonly fetchImpl?: typeof fetch
  /** Request budget in milliseconds; aborts map to `error_servidor`. */
  readonly timeoutMs?: number
  /** LM-009: page requested (infinite-scroll accumulation); defaults to 1. */
  readonly pagina?: number
}

export const LISTADO_MOBILE_TIMEOUT_MS = 15_000
export const PAGE_SIZE_LISTADO_MOBILE = 25

/**
 * Builds the #155 query from the filter state. LM-009: `page` defaults to 1
 * and the route passes `page=N` for accumulation; LM-006: chip + propietario
 * combine with AND; LM-014: an empty/whitespace `q` omits the parameter.
 * Keys/ids only — never labels.
 */
export function construirConsultaListadoMobile(filtros: FiltrosListadoMobile, pagina = 1): string {
  const parametros = new URLSearchParams()
  parametros.set("page", String(pagina))
  parametros.set("pageSize", String(PAGE_SIZE_LISTADO_MOBILE))
  const q = filtros.q.trim()
  if (q !== "") parametros.set("q", q)
  if (filtros.chip === "prenadas") parametros.set("f.categoriaReproductivaKey", "in:prenada")
  if (filtros.chip === "enfermas") parametros.set("f.saludKey", "in:1")
  if (filtros.propietarioId !== null && filtros.propietarioId !== "") {
    parametros.set("f.propietarioId", `in:${filtros.propietarioId}`)
  }
  return parametros.toString()
}

/**
 * LM-023 (400): removes the offending filter reported by `ApiErrorDto.campo`
 * so the route can reset to `page=1`, toast, retain the last valid list, and
 * refetch. Transport-only fields (`page`/`pageSize`) leave the filters
 * unchanged; an unknown/absent `campo` also leaves them unchanged (the route
 * decides whether that is still retryable).
 */
export function sanitizarFiltrosMobilePorCampo(
  filtros: FiltrosListadoMobile,
  campo: string | null,
): FiltrosListadoMobile {
  switch (campo) {
    case "q":
      return { ...filtros, q: "" }
    case "f.categoriaReproductivaKey":
    case "f.saludKey":
      return { ...filtros, chip: "todas" }
    case "f.propietarioId":
      return { ...filtros, propietarioId: null }
    default:
      return filtros
  }
}

async function leerErrorApiMobile(respuesta: Response): Promise<ApiErrorDto | null> {
  try {
    return (await respuesta.json()) as ApiErrorDto
  } catch {
    return null
  }
}

export async function cargarListadoMobile(
  fincaId: string,
  filtros: FiltrosListadoMobile,
  opciones: OpcionesCargaListadoMobile = {},
): Promise<ResultadoListadoMobileCliente> {
  const fetchImpl = opciones.fetchImpl ?? fetch
  const timeoutMs = opciones.timeoutMs ?? LISTADO_MOBILE_TIMEOUT_MS
  const pagina = opciones.pagina ?? 1
  const señal =
    typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(timeoutMs) : undefined
  try {
    const respuesta = await fetchImpl(
      `/api/fincas/${fincaId}/animales/mobile?${construirConsultaListadoMobile(filtros, pagina)}`,
      {
        headers: { Accept: "application/json" },
        ...(señal ? { signal: señal } : {}),
      },
    )
    if (respuesta.status === 200) {
      try {
        const resultado = (await respuesta.json()) as AnimalMobileListReadResult
        return { tipo: "listo", resultado }
      } catch {
        return { tipo: "error_servidor" }
      }
    }
    if (respuesta.status === 400) {
      const error = await leerErrorApiMobile(respuesta)
      if (error !== null) return { tipo: "consulta_invalida", error }
      return { tipo: "error_servidor" }
    }
    if (respuesta.status === 403) return { tipo: "sin_acceso" }
    return { tipo: "error_servidor" }
  } catch {
    // Network failure or timeout abort — the route shows the retriable error
    // state (LM-023), never a silent empty list.
    return { tipo: "error_servidor" }
  }
}
