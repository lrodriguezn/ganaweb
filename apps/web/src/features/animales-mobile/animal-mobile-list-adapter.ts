/**
 * Issue #157 — typed client adapter for the #155 mobile endpoint
 * (`GET /api/fincas/{fincaId}/animales/mobile`). Mobile equivalent of the
 * desktop `cargarListadoDesktop` transport (animal-listado-route-adapter.ts):
 * a pure URL builder from the filter state plus a typed fetch with an
 * injectable `fetchImpl` seam and an AbortSignal timeout budget.
 *
 * Grammar (RF-ANIM-LIST-M v1.1 §4): filters travel by key/id with grammar
 * `in:<valor>` — NEVER labels (LA-001/CA-UI-001). Every chip/propietario/
 * search change requests `page=1` (LM-009); #158 owns the infinite-scroll
 * accumulation, so this adapter always replaces page 1.
 *
 * Failure policy mirrors the desktop transport: a 403 maps to `sin_acceso`;
 * any other non-200 (400/500), an unparseable body, a network failure, or a
 * timeout abort maps to `error_servidor` — the route retains the last valid
 * list and never crashes (the client only emits server-valid filter state).
 */
import type { AnimalMobileListReadResult } from "@ganaweb/aplicacion"

import type { AnimalMobileListResponseDto } from "../../server/animal-mobile-list-contract.js"

export type ChipListadoMobile = "todas" | "prenadas" | "enfermas"

export interface FiltrosListadoMobile {
  readonly chip: ChipListadoMobile
  /** Id del propietario seleccionado; `null` = todos los propietarios. */
  readonly propietarioId: string | null
  readonly q: string
}

export type ResultadoListadoMobileCliente =
  | { readonly tipo: "listo"; readonly resultado: AnimalMobileListResponseDto }
  | { readonly tipo: "sin_acceso" }
  | { readonly tipo: "error_servidor" }

export interface OpcionesCargaListadoMobile {
  /** Injectable transport seam (tests); defaults to the global `fetch`. */
  readonly fetchImpl?: typeof fetch
  /** Request budget in milliseconds; aborts map to `error_servidor`. */
  readonly timeoutMs?: number
}

export const LISTADO_MOBILE_TIMEOUT_MS = 15_000
export const PAGE_SIZE_LISTADO_MOBILE = 25

/**
 * Builds the #155 query from the filter state. LM-009: always `page=1`;
 * LM-006: chip + propietario combine with AND; LM-014: an empty/whitespace
 * `q` omits the parameter. Keys/ids only — never labels.
 */
export function construirConsultaListadoMobile(filtros: FiltrosListadoMobile): string {
  const parametros = new URLSearchParams()
  parametros.set("page", "1")
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

export async function cargarListadoMobile(
  fincaId: string,
  filtros: FiltrosListadoMobile,
  opciones: OpcionesCargaListadoMobile = {},
): Promise<ResultadoListadoMobileCliente> {
  const fetchImpl = opciones.fetchImpl ?? fetch
  const timeoutMs = opciones.timeoutMs ?? LISTADO_MOBILE_TIMEOUT_MS
  const señal =
    typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(timeoutMs) : undefined
  try {
    const respuesta = await fetchImpl(
      `/api/fincas/${fincaId}/animales/mobile?${construirConsultaListadoMobile(filtros)}`,
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
    if (respuesta.status === 403) return { tipo: "sin_acceso" }
    return { tipo: "error_servidor" }
  } catch {
    // Network failure or timeout abort — retain the last valid list upstream.
    return { tipo: "error_servidor" }
  }
}
