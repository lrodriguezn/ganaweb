/**
 * Issue #227 — Boundary HTTP del read model de finca (RF-EVENTOS v1.1,
 * EV-UI-002..005, EV-INT-001, EV-SEC-001).
 *
 * Compone la sesion activa + el caso de uso `leerEventosFinca` y mapea
 * los resultados tipados a respuestas HTTP para TanStack Start
 * (`createServerFn`). Misma forma que `eventos-contract.server.ts`
 * (boundary de escritura, #226): el caso de uso nunca lanza — los
 * errores llegan como `{ tipo: "no_autorizado" | "filtro_invalido" }`
 * y este modulo los traduce a status codes.
 *
 * El boundary NO aplica RBAC por si mismo: ya viene filtrado por la
 * capa de aplicacion. Mantenerlo asi evita duplicar la matriz de
 * permisos y respetar la regla de capas (D6).
 */
import {
  type CategoriaFiltroFinca,
  type LeerContadoresEventosFincaInput,
  type LeerEventosFincaDeps,
  type LeerEventosFincaInput,
  PAGE_SIZE_FEED_FINCA,
  PAGE_SIZE_HISTORIAL_FINCA,
  type ResultadoContadoresEventosFinca,
  type ResultadoEventosFinca,
  type SesionEventosFinca,
  leerEventosFinca,
} from "@ganaweb/aplicacion"
import { db } from "@ganaweb/db/client"
import { DrizzleEventosFincaReadRepository } from "@ganaweb/db/evento-read-infrastructure"

let cachedDeps: LeerEventosFincaDeps | null = null

function getDeps(): LeerEventosFincaDeps {
  if (!cachedDeps) {
    cachedDeps = { port: new DrizzleEventosFincaReadRepository(db) }
  }
  return cachedDeps
}

/** Solo para tests: inyecta un port mockeado. */
export function configureEventosFincaReadDeps(deps: LeerEventosFincaDeps | null): void {
  cachedDeps = deps
}

export class EventosFincaReadHttpError extends Error {
  constructor(
    readonly status: number,
    readonly motivo: string,
    readonly detalle?: string,
  ) {
    super(`EventosFinca read HTTP ${status}: ${motivo}${detalle ? ` (${detalle})` : ""}`)
    this.name = "EventosFincaReadHttpError"
  }
}

interface RespuestaFeed {
  readonly tipo: "ok"
  readonly items: unknown
  readonly nextCursor?: string
  readonly pendientes?: number
}

function respuesta<T>(resultado: ResultadoEventosFinca<T>): RespuestaFeed {
  if (resultado.tipo === "no_autorizado") {
    throw new EventosFincaReadHttpError(403, resultado.permiso ?? "permiso_denegado")
  }
  if (resultado.tipo === "filtro_invalido") {
    throw new EventosFincaReadHttpError(400, "filtro_invalido", resultado.campo)
  }
  const out: {
    tipo: "ok"
    items: unknown
    nextCursor?: string
    pendientes?: number
  } = { tipo: "ok", items: resultado.pagina.items }
  if (resultado.pagina.nextCursor !== undefined) {
    out.nextCursor = resultado.pagina.nextCursor
  }
  if (resultado.pagina.pendientes !== undefined) {
    out.pendientes = resultado.pagina.pendientes
  }
  return out
}

function respuestaContadores(resultado: ResultadoContadoresEventosFinca) {
  if (resultado.tipo === "no_autorizado") {
    throw new EventosFincaReadHttpError(403, resultado.permiso ?? "permiso_denegado")
  }
  if (resultado.tipo === "filtro_invalido") {
    throw new EventosFincaReadHttpError(400, "filtro_invalido", resultado.campo)
  }
  return { tipo: "ok" as const, contadores: resultado.contadores }
}

/**
 * Handler compartido: dado un input del boundary, delega al caso de uso.
 * Se exporta para que los tests del boundary HTTP lo puedan invocar
 * sin montar el server fn de TanStack.
 */
export async function ejecutarFeedFinca(input: {
  readonly sesion: SesionEventosFinca
  readonly fincaId: string
  readonly categoria?: CategoriaFiltroFinca
  readonly tipo?: string
  readonly fechaDesde?: string
  readonly fechaHasta?: string
  readonly cursor?: string
}) {
  const caso = leerEventosFinca(getDeps())
  const resultado = await caso.feedFinca({
    sesion: input.sesion,
    fincaId: input.fincaId,
    ...(input.categoria ? { categoria: input.categoria } : {}),
    ...(input.tipo ? { tipo: input.tipo } : {}),
    ...(input.fechaDesde ? { fechaDesde: input.fechaDesde } : {}),
    ...(input.fechaHasta ? { fechaHasta: input.fechaHasta } : {}),
    ...(input.cursor ? { cursor: input.cursor } : {}),
    pageSize: PAGE_SIZE_FEED_FINCA,
    dominiosPermitidos: caso.dominiosVisibles(input.sesion),
  } satisfies LeerEventosFincaInput)
  return respuesta(resultado)
}

export async function ejecutarHistorialFinca(input: {
  readonly sesion: SesionEventosFinca
  readonly fincaId: string
  readonly categoria?: CategoriaFiltroFinca
  readonly tipo?: string
  readonly fechaDesde?: string
  readonly fechaHasta?: string
  readonly cursor?: string
}) {
  const caso = leerEventosFinca(getDeps())
  const resultado = await caso.historialFinca({
    sesion: input.sesion,
    fincaId: input.fincaId,
    ...(input.categoria ? { categoria: input.categoria } : {}),
    ...(input.tipo ? { tipo: input.tipo } : {}),
    ...(input.fechaDesde ? { fechaDesde: input.fechaDesde } : {}),
    ...(input.fechaHasta ? { fechaHasta: input.fechaHasta } : {}),
    ...(input.cursor ? { cursor: input.cursor } : {}),
    pageSize: PAGE_SIZE_HISTORIAL_FINCA,
    dominiosPermitidos: caso.dominiosVisibles(input.sesion),
  } satisfies LeerEventosFincaInput)
  return respuesta(resultado)
}

export async function ejecutarContadoresFinca(input: {
  readonly sesion: SesionEventosFinca
  readonly fincaId: string
  readonly mes?: string
}) {
  const caso = leerEventosFinca(getDeps())
  const resultado = await caso.contadoresFinca({
    sesion: input.sesion,
    fincaId: input.fincaId,
    ...(input.mes ? { mes: input.mes } : {}),
    dominiosPermitidos: caso.dominiosVisibles(input.sesion),
  } satisfies LeerContadoresEventosFincaInput)
  return respuestaContadores(resultado)
}

/**
 * Mapea `EventosFincaReadHttpError` (y cualquier error inesperado) a
 * `Response`. Misma forma que `mapEventoBoundaryToHttp` (#226).
 */
export async function mapEventosFincaReadToHttp<T>(work: () => Promise<T>): Promise<Response> {
  try {
    const result = await work()
    return Response.json(result, { status: 200 })
  } catch (error) {
    if (error instanceof EventosFincaReadHttpError) {
      return Response.json(
        { tipo: error.motivo, ...(error.detalle ? { campo: error.detalle } : {}) },
        { status: error.status },
      )
    }
    throw error
  }
}
