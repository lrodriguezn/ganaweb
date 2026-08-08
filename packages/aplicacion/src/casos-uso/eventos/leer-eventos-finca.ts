/**
 * Issue #227 — caso de uso de lectura unificada del read model de finca
 * (RF-EVENTOS v1.1, EV-UI-002..005, EV-INT-001).
 *
 * Encapsula la validacion de RBAC server-side y la expansion del filtro
 * contra los permisos de la sesion. La capa de aplicacion es la unica
 * autorizada para emitir el read model: la web solo llama este caso de
 * uso y mapea la respuesta a su representacion de UI.
 *
 * Reglas de oro (issue #226 + #227):
 *  - Fail-closed: sin autorizacion o sin finca activa, el read model
 *    responde con un resultado vacio tipado (`{ tipo: "no_autorizado" }`).
 *  - La pagina de feed (`feedFinca`) agrupa por cabecera grupal; un
 *    evento grupal aparece UNA vez con `totalAnimales` poblado.
 *  - El historial (`historialFinca`) lista cada hijo grupal por
 *    separado, con su `animalId`/`animalCodigo` resolvido.
 *  - Los contadores mensuales respetan los mismos filtros de RBAC y
 *    muestran el total por dominio del mes en curso.
 */
import {
  type CategoriaFiltroFinca,
  EventoReadForbiddenError,
  EventoReadInvalidError,
  PAGE_SIZE_FEED_FINCA,
  PAGE_SIZE_HISTORIAL_FINCA,
  type PermisoVerDominio,
  dominiosAutorizadosParaSesion,
  normalizarFiltroEventosFinca,
  validarAlcanceFincaRead,
} from "@ganaweb/dominio"
import type {
  ContadoresEventosFinca,
  EventosFincaPagina,
  EventosFincaReadPort,
  EventosFincaReadRequest,
  FeedFincaItem,
  HistorialFincaItem,
} from "../../puertos/eventos-finca-read-port.js"

export interface SesionEventosFinca {
  readonly usuarioId: string
  readonly fincaActivaId: string
  readonly permisos: readonly { readonly modulo: string; readonly accion: string }[]
}

export type ResultadoEventosFinca<TItem> =
  | Readonly<{ tipo: "ok"; pagina: EventosFincaPagina<TItem> }>
  | Readonly<{ tipo: "no_autorizado"; permiso?: string }>
  | Readonly<{ tipo: "filtro_invalido"; campo: string }>

export type ResultadoContadoresEventosFinca =
  | Readonly<{ tipo: "ok"; contadores: ContadoresEventosFinca }>
  | Readonly<{ tipo: "no_autorizado"; permiso?: string }>
  | Readonly<{ tipo: "filtro_invalido"; campo: string }>

export interface LeerEventosFincaInput {
  readonly sesion: SesionEventosFinca
  readonly fincaId: string
  readonly categoria?: CategoriaFiltroFinca
  readonly tipo?: string
  readonly fechaDesde?: string
  readonly fechaHasta?: string
  readonly cursor?: string
  readonly pageSize: 20 | 50
  readonly dominiosPermitidos: readonly PermisoVerDominio[]
}

export interface LeerContadoresEventosFincaInput {
  readonly sesion: SesionEventosFinca
  readonly fincaId: string
  readonly mes?: string
  readonly dominiosPermitidos: readonly PermisoVerDominio[]
}

export interface LeerEventosFincaDeps {
  readonly port: EventosFincaReadPort
}

export interface LeerEventosFinca {
  feedFinca(input: LeerEventosFincaInput): Promise<ResultadoEventosFinca<FeedFincaItem>>
  historialFinca(input: LeerEventosFincaInput): Promise<ResultadoEventosFinca<HistorialFincaItem>>
  contadoresFinca(input: LeerContadoresEventosFincaInput): Promise<ResultadoContadoresEventosFinca>
  /**
   * Atajo publico para que la web pueda conocer la lista efectiva de
   * dominios visibles segun los permisos de la sesion — util para
   * pintar la navegacion por categoria con permisos parciales.
   */
  dominiosVisibles(sesion: SesionEventosFinca): readonly PermisoVerDominio[]
}

type ResultadoLectura<T> =
  | Readonly<{ tipo: "ok"; valor: T }>
  | Readonly<{ tipo: "no_autorizado"; permiso?: string }>
  | Readonly<{ tipo: "filtro_invalido"; campo: string }>

function mapearErrorLectura(
  error: unknown,
):
  | { readonly tipo: "no_autorizado"; readonly permiso?: string }
  | { readonly tipo: "filtro_invalido"; readonly campo: string } {
  if (error instanceof EventoReadInvalidError) {
    return { tipo: "filtro_invalido", campo: error.campo }
  }
  if (error instanceof EventoReadForbiddenError) {
    return error.permiso
      ? { tipo: "no_autorizado", permiso: error.permiso }
      : { tipo: "no_autorizado" }
  }
  throw error
}

async function ejecutarLectura<T>(trabajo: () => Promise<T>): Promise<ResultadoLectura<T>> {
  try {
    const valor = await trabajo()
    return { tipo: "ok", valor }
  } catch (error) {
    return mapearErrorLectura(error)
  }
}

/**
 * Convierte la lista efectiva de dominios normalizados al campo
 * `categoria` del request de infraestructura. Si la lista cubre
 * todos los dominios posibles del filtro, se envia `undefined` (sin
 * categoria) para que la DB emita el UNION completo; si la lista es
 * un subset, se envia la categoria que el port pueda usar para
 * restringir las ramas (el port es responsable de su semantica).
 */
function filtroComoCategoria(dominios: readonly PermisoVerDominio[]): {
  readonly categoria?: CategoriaFiltroFinca
} {
  if (dominios.length === 0) return {}
  if (dominios.length === 1) {
    return { categoria: dominios[0] as CategoriaFiltroFinca }
  }
  return { categoria: "todos" as CategoriaFiltroFinca }
}

function construirFiltroNormalizado(input: LeerEventosFincaInput): {
  readonly categoria?: CategoriaFiltroFinca
  readonly tipo?: string
  readonly fechaDesde?: string
  readonly fechaHasta?: string
} {
  return {
    ...(input.categoria ? { categoria: input.categoria } : {}),
    ...(input.tipo ? { tipo: input.tipo } : {}),
    ...(input.fechaDesde ? { fechaDesde: input.fechaDesde } : {}),
    ...(input.fechaHasta ? { fechaHasta: input.fechaHasta } : {}),
  }
}

function ejecutarValidacionAlcance(input: {
  readonly sesionFincaActivaId: string
  readonly fincaId: string
  readonly dominiosPermitidos: readonly PermisoVerDominio[]
}): void {
  validarAlcanceFincaRead({
    sesionFincaActivaId: input.sesionFincaActivaId,
    fincaSolicitadaId: input.fincaId,
    dominiosAutorizados: input.dominiosPermitidos,
  })
}

/**
 * Factory: `leerEventosFinca({ port })` devuelve un servicio listo para
 * ser consumido por `apps/web`. Mantiene el contrato del caso de uso
 * sin estado entre invocaciones (la pagina, los filtros y el cursor
 * viajan siempre por parametro).
 */
export function leerEventosFinca(deps: LeerEventosFincaDeps): LeerEventosFinca {
  return {
    dominiosVisibles(sesion) {
      return dominiosAutorizadosParaSesion(sesion.permisos)
    },

    async feedFinca(input) {
      if (input.pageSize !== PAGE_SIZE_FEED_FINCA) {
        return { tipo: "filtro_invalido", campo: "pageSize" }
      }
      const resultado = await ejecutarLectura(() =>
        ejecutarLecturaFinca(input, deps.port.feedFinca),
      )
      if (resultado.tipo !== "ok") return resultado
      return { tipo: "ok", pagina: resultado.valor }
    },

    async historialFinca(input) {
      if (input.pageSize !== PAGE_SIZE_HISTORIAL_FINCA) {
        return { tipo: "filtro_invalido", campo: "pageSize" }
      }
      const resultado = await ejecutarLectura(() =>
        ejecutarLecturaFinca(input, deps.port.historialFinca),
      )
      if (resultado.tipo !== "ok") return resultado
      return { tipo: "ok", pagina: resultado.valor }
    },

    async contadoresFinca(input) {
      const resultado = await ejecutarLectura(async () => {
        ejecutarValidacionAlcance({
          sesionFincaActivaId: input.sesion.fincaActivaId,
          fincaId: input.fincaId,
          dominiosPermitidos: input.dominiosPermitidos,
        })
        return deps.port.contadoresFinca({
          sesion: {
            usuarioId: input.sesion.usuarioId,
            fincaActivaId: input.sesion.fincaActivaId,
            permisos: input.sesion.permisos,
          },
          fincaId: input.fincaId,
          ...(input.mes ? { mes: input.mes } : {}),
        })
      })
      if (resultado.tipo !== "ok") return resultado
      return { tipo: "ok", contadores: resultado.valor }
    },
  }
}

async function ejecutarLecturaFinca<T>(
  input: LeerEventosFincaInput,
  portCall: (request: EventosFincaReadRequest) => Promise<EventosFincaPagina<T>>,
): Promise<EventosFincaPagina<T>> {
  ejecutarValidacionAlcance({
    sesionFincaActivaId: input.sesion.fincaActivaId,
    fincaId: input.fincaId,
    dominiosPermitidos: input.dominiosPermitidos,
  })
  const filtroNormalizado = normalizarFiltroEventosFinca({
    filtro: {
      ...construirFiltroNormalizado(input),
      pageSize: input.pageSize,
    },
    dominiosAutorizados: input.dominiosPermitidos,
  })
  return portCall({
    sesion: {
      usuarioId: input.sesion.usuarioId,
      fincaActivaId: input.sesion.fincaActivaId,
      permisos: input.sesion.permisos,
    },
    fincaId: input.fincaId,
    ...filtroComoCategoria(filtroNormalizado),
    ...(input.tipo ? { tipo: input.tipo } : {}),
    ...(input.fechaDesde ? { fechaDesde: input.fechaDesde } : {}),
    ...(input.fechaHasta ? { fechaHasta: input.fechaHasta } : {}),
    ...(input.cursor ? { cursor: input.cursor } : {}),
    pageSize: input.pageSize,
  })
}
