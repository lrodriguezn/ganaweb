/**
 * Export HTTP handler for `GET /api/fincas/{fincaId}/animales/exportar`
 * (LA-070/071/072). Mirrors `animal-list-http.ts`: a factory receives its
 * dependencies and returns a `{ request, fincaId } → Response` handler.
 *
 * Pipeline: parse → authorize → resolve limits → generate → stream.
 *   1. `parseAnimalListadoQuery` (shared with the list endpoint) plus
 *      export-specific `format`/`scope` validation → 400 naming the `campo`
 *      (LA-040).
 *   2. `getUsuarioId` resolves the session; the route wiring re-validates
 *      `animales:ver` + `reportes:exportar` + per-finca membership and returns
 *      `null` on any failure → 403 with no data (LA-041, LA-RBAC-04/05/075).
 *      The read port re-validates `animales:ver` + membership again via its
 *      fail-closed authz CTE (defense in depth).
 *   3. `leerLimites` resolves the config-driven `maxFilas`/`timeoutSegundos`
 *      (no hardcoded thresholds — LA-072); `maxFilas` is injected into the port
 *      request and `timeoutSegundos` into the abort signal.
 *   4. The port returns the full filtered set; overflow → 413, an aborted
 *      signal → a specific timeout 500, any other failure → a sanitized 500
 *      that carries a `requestId` and never leaks driver/stack detail (LA-043).
 *   5. On success the matching generator streams the bytes with the per-format
 *      `Content-Type` and `Content-Disposition: attachment; filename=
 *      "animales_{vista|todas}_{yyyyMMdd-HHmmss}.{ext}"`.
 *
 * Server-only: this module (through the exportadores barrel) pulls exceljs +
 * pdfkit, so it MUST stay out of the client bundle — only the export route
 * consumes it.
 */
import type { AnimalExportacionReadPort, AnimalListadoRow } from "@ganaweb/aplicacion"
import type { AnimalListadoColumn } from "../features/animal-listado/animal-listado-route-adapter.js"
import { apiError, parseAnimalListadoQuery } from "./animal-list-contract.js"
import { type AlcanceExportacion, resolverColumnasExportacion } from "./exportadores/index.js"

export type FormatoExportacion = "xlsx" | "csv" | "pdf"

type GeneradorExportacion = (
  filas: readonly AnimalListadoRow[],
  columnas: readonly AnimalListadoColumn[],
) => Promise<Uint8Array>

type HandlerInput = Readonly<{ request: Request; fincaId: string }>

/** Structural mirror of db `LimitesExportacion`; keeps the handler decoupled. */
export interface AnimalExportacionLimites {
  readonly maxFilas: number
  readonly timeoutSegundos: number
}

export interface AnimalExportacionHttpDependencies {
  readonly getUsuarioId: (fincaId: string) => Promise<string | null>
  readonly readPort: AnimalExportacionReadPort
  readonly leerLimites: (fincaId: string) => Promise<AnimalExportacionLimites>
  readonly generadores: Readonly<Record<FormatoExportacion, GeneradorExportacion>>
  readonly isForbidden: (error: unknown) => boolean
  readonly isOverflow: (error: unknown) => boolean
  readonly crearSenal: (timeoutMs: number) => AbortSignal
  readonly requestId: () => string
  readonly now: () => Date
  readonly reportError: (
    details: Readonly<{ requestId: string; fincaId: string; error: unknown }>,
  ) => void
}

const CONTENT_TYPES: Readonly<Record<FormatoExportacion, string>> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv; charset=utf-8",
  pdf: "application/pdf",
}

export function createAnimalExportacionHttpHandler(deps: AnimalExportacionHttpDependencies) {
  return async ({ request, fincaId }: HandlerInput): Promise<Response> => {
    const requestId = deps.requestId()
    const search = new URL(request.url).searchParams

    const formato = parseFormato(search.get("format"))
    if (!formato.ok) return invalidResponse(requestId, "format", formato.motivo)
    const alcance = parseAlcance(search.get("scope"))
    if (!alcance.ok) return invalidResponse(requestId, "scope", alcance.motivo)

    const parsed = parseAnimalListadoQuery(search)
    if (!parsed.ok) return invalidResponse(requestId, parsed.error.campo, parsed.error.motivo)

    try {
      const usuarioId = await deps.getUsuarioId(fincaId)
      if (!usuarioId) return forbiddenResponse(requestId)

      const limites = await deps.leerLimites(fincaId)
      const columnas = resolverColumnasExportacion(alcance.value, parsed.value.cols)
      const senal = deps.crearSenal(limites.timeoutSegundos * 1000)

      const filas = await conSenal(
        deps.readPort.exportar({
          usuarioId,
          fincaId,
          sort: parsed.value.sort,
          q: parsed.value.q,
          filters: parsed.value.filters,
          columnas: columnas.map((columna) => columna.id),
          maxFilas: limites.maxFilas,
        }),
        senal,
      )
      const bytes = await conSenal(deps.generadores[formato.value](filas, columnas), senal)

      return successResponse(formato.value, alcance.value, bytes, deps.now())
    } catch (error) {
      return manejarErrorExportacion(error, deps, requestId, fincaId)
    }
  }
}

/**
 * Maps a failure to its HTTP response, fail-closed: a fired timeout signal is a
 * specific 500; overflow is 413; a forbidden classification is 403; anything
 * else is a sanitized 500 that reports once and never leaks driver/stack detail
 * (LA-043). Sanctioned operational limits (timeout/overflow) and authorization
 * denials (forbidden) do NOT report — only the unexpected failure does.
 */
function manejarErrorExportacion(
  error: unknown,
  deps: Pick<AnimalExportacionHttpDependencies, "isForbidden" | "isOverflow" | "reportError">,
  requestId: string,
  fincaId: string,
): Response {
  if (esTimeout(error)) return timeoutResponse(requestId)
  if (deps.isOverflow(error)) return overflowResponse(requestId)
  if (deps.isForbidden(error)) return forbiddenResponse(requestId)
  deps.reportError({ requestId, fincaId, error })
  return sanitizedErrorResponse(requestId)
}

/** Filename timestamp `yyyyMMdd-HHmmss` in UTC (deterministic across timezones). */
export function formatearMarcaTiempoExportacion(fecha: Date): string {
  const pad = (valor: number) => String(valor).padStart(2, "0")
  return `${fecha.getUTCFullYear()}${pad(fecha.getUTCMonth() + 1)}${pad(fecha.getUTCDate())}-${pad(fecha.getUTCHours())}${pad(fecha.getUTCMinutes())}${pad(fecha.getUTCSeconds())}`
}

function parseFormato(
  raw: string | null,
): Readonly<{ ok: true; value: FormatoExportacion }> | Readonly<{ ok: false; motivo: string }> {
  const valor = raw ?? "xlsx"
  if (valor === "xlsx" || valor === "csv" || valor === "pdf") return { ok: true, value: valor }
  return { ok: false, motivo: "format debe ser xlsx, csv o pdf" }
}

function parseAlcance(
  raw: string | null,
): Readonly<{ ok: true; value: AlcanceExportacion }> | Readonly<{ ok: false; motivo: string }> {
  const valor = raw ?? "vista"
  if (valor === "todas" || valor === "vista") return { ok: true, value: valor }
  return { ok: false, motivo: "scope debe ser todas o vista" }
}

/**
 * Races a unit of work against the abort signal so generation cannot exceed
 * `timeoutSegundos`. The listener is removed on settle to avoid leaks; an
 * already-aborted signal rejects synchronously with a `TimeoutError`.
 */
async function conSenal<T>(trabajo: Promise<T>, senal: AbortSignal): Promise<T> {
  if (senal.aborted) throw razonTimeout(senal)
  let onAbort: (() => void) | undefined
  const abortPromise = new Promise<never>((_, rechazar) => {
    onAbort = () => rechazar(razonTimeout(senal))
    senal.addEventListener("abort", onAbort, { once: true })
  })
  try {
    return await Promise.race([trabajo, abortPromise])
  } finally {
    if (onAbort) senal.removeEventListener("abort", onAbort)
  }
}

function razonTimeout(senal: AbortSignal): Error {
  const razon = senal.reason
  if (razon instanceof Error) return razon
  return new DOMException("The operation was aborted due to timeout", "TimeoutError")
}

function esTimeout(error: unknown): boolean {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")
}

function invalidResponse(requestId: string, campo: string, motivo: string): Response {
  return Response.json(apiError("Solicitud inválida", campo, motivo, requestId), { status: 400 })
}

function forbiddenResponse(requestId: string): Response {
  return Response.json(apiError("Acceso denegado", null, "No autorizado", requestId), {
    status: 403,
  })
}

function overflowResponse(requestId: string): Response {
  return Response.json(
    apiError(
      "Demasiados resultados",
      null,
      "Afina los filtros para reducir los animales",
      requestId,
    ),
    { status: 413 },
  )
}

function timeoutResponse(requestId: string): Response {
  return Response.json(
    apiError("La exportación tardó demasiado", null, "Reduce los filtros o el alcance", requestId),
    { status: 500 },
  )
}

function sanitizedErrorResponse(requestId: string): Response {
  return Response.json(
    apiError("Error interno", null, "No fue posible generar el archivo", requestId),
    {
      status: 500,
    },
  )
}

function successResponse(
  formato: FormatoExportacion,
  alcance: AlcanceExportacion,
  bytes: Uint8Array,
  ahora: Date,
): Response {
  const nombreArchivo = `animales_${alcance}_${formatearMarcaTiempoExportacion(ahora)}.${formato}`
  // Generators always return ArrayBuffer-backed bytes (TextEncoder / exceljs /
  // pdfkit); TS 5.7's lib types them conservatively as `ArrayBufferLike`, which
  // `BodyInit` rejects. Narrow at this single Response seam.
  const cuerpo = bytes as Uint8Array<ArrayBuffer>
  return new Response(cuerpo, {
    status: 200,
    headers: {
      "Content-Type": CONTENT_TYPES[formato],
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
    },
  })
}
