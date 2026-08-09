/**
 * Issue #228 — Server functions públicas del Tablero e Historial de Eventos
 * (RF-EVENTOS v1.1 §3, EV-UI-001..007).
 *
 * Bridge cliente → server para el read model de finca (#227). Esta capa
 * delega al boundary `eventos-finca-read.server.ts` (`ejecutarFeedFinca` /
 * `ejecutarHistorialFinca` / `ejecutarContadoresFinca`) — NO reimplementa el
 * caso de uso ni la inyección de deps (D6: single source of truth).
 *
 * Patrón equivalente a `eventos-wizard.ts` (#229) y `sanidad-panel.js` (#212):
 *  - el módulo público re-exporta los `createServerFn` y los tipos
 *    serializables; el módulo `.server` queda restringido al runtime server
 *    (regla `*.server.*` del plugin de import-protection de TanStack Start).
 *  - el handler hace un dynamic import del `.server` para evitar que la DB
 *    y el harness transaccional entren en el bundle del cliente.
 *
 * RBAC por dominio y alcance de finca: ya viene filtrado por la capa
 * de aplicación. Esta capa NO aplica reglas adicionales — duplicaría
 * la matriz de permisos (D6) y violaría "single source of truth".
 *
 * Forma de respuesta: los server fn devuelven el valor tipado directamente
 * (igual que `listarAnimalesPorOrigenFn` de #229). En errores esperados
 * (`no_autorizado`, `filtro_invalido`) el boundary ya devolvió
 * `EventosFincaReadHttpError` con `status` HTTP; este archivo lo
 * convierte a error tipado para que el cliente distinga el resultado.
 * Los errores inesperados se propagan (el runtime de TanStack los reporta).
 */
import type { SesionAutorizada } from "@ganaweb/aplicacion"
import { createServerFn } from "@tanstack/react-start"

import { EventosFincaReadHttpError } from "./eventos-finca-read.server.js"

/* -------------------------------------------------------------------------- */
/* Inputs serializables que cruzan la frontera cliente → server.              */
/* -------------------------------------------------------------------------- */

export type CategoriaEventoTablero = "reproductivo" | "sanidad" | "productivo" | "movimientos"

export interface LeerEventosFincaWebInput {
  readonly fincaId: string
  readonly categoria?: CategoriaEventoTablero
  readonly tipo?: string
  readonly fechaDesde?: string
  readonly fechaHasta?: string
  readonly cursor?: string
}

export interface LeerContadoresEventosFincaWebInput {
  readonly fincaId: string
  readonly mes?: string
}

/* -------------------------------------------------------------------------- */
/* Tipos de respuesta (mapean 1:1 al boundary del read model #227).          */
/* -------------------------------------------------------------------------- */

export interface EventoFeedItemDto {
  readonly id: string
  readonly dominio: CategoriaEventoTablero
  readonly tipo: string
  readonly fecha: string
  readonly detalle: string | null
  readonly esCabeceraGrupal: boolean
  readonly registroGrupalId: string | null
  readonly totalAnimales: number | null
  readonly animalCodigo: string | null
  readonly animalNombre: string | null
  readonly anulado: boolean
  readonly anuladoEn: string | null
  readonly motivoAnulacion: string | null
}

export interface EventoHistorialItemDto {
  readonly id: string
  readonly dominio: CategoriaEventoTablero
  readonly tipo: string
  readonly fecha: string
  readonly detalle: string | null
  readonly animalId: string
  readonly animalCodigo: string
  readonly animalNombre: string | null
  readonly registroGrupalId: string | null
  readonly anulado: boolean
  readonly anuladoEn: string | null
  readonly motivoAnulacion: string | null
}

export interface EventoFeedRespuesta {
  readonly tipo: "ok"
  readonly items: readonly EventoFeedItemDto[]
  readonly nextCursor?: string
  readonly pendientes?: number
}

export interface EventoHistorialRespuesta {
  readonly tipo: "ok"
  readonly items: readonly EventoHistorialItemDto[]
  readonly nextCursor?: string
  readonly pendientes?: number
}

export interface ContadoresEventosFincaDto {
  readonly mes: string
  readonly desde: string
  readonly hasta: string
  readonly porDominio: Readonly<Record<CategoriaEventoTablero, number>>
  readonly total: number
}

export interface ContadoresEventosFincaRespuesta {
  readonly tipo: "ok"
  readonly contadores: ContadoresEventosFincaDto
}

/* -------------------------------------------------------------------------- */
/* Resolución de sesión (re-validada en server, fail-closed).                 */
/* -------------------------------------------------------------------------- */

async function resolverSesion(fincaId: string): Promise<SesionAutorizada | null> {
  const { getCurrentSession } = await import("./auth.js")
  const decision = await getCurrentSession({ data: { fincaId } })
  return decision.tipo === "autorizado" ? decision.sesion : null
}

/* -------------------------------------------------------------------------- */
/* Adaptadores: consumen el boundary de #227 sin reimplementar el caso de uso. */
/* -------------------------------------------------------------------------- */

async function ejecutarFeedPorFinca(
  sesion: SesionAutorizada,
  input: LeerEventosFincaWebInput,
): Promise<EventoFeedRespuesta> {
  const { ejecutarFeedFinca } = await import("./eventos-finca-read.server.js")
  const caso = await ejecutarFeedFinca({
    sesion: {
      usuarioId: sesion.usuarioId,
      fincaActivaId: sesion.fincaActivaId,
      permisos: sesion.permisos,
    },
    fincaId: input.fincaId,
    ...(input.categoria ? { categoria: input.categoria } : {}),
    ...(input.tipo ? { tipo: input.tipo } : {}),
    ...(input.fechaDesde ? { fechaDesde: input.fechaDesde } : {}),
    ...(input.fechaHasta ? { fechaHasta: input.fechaHasta } : {}),
    ...(input.cursor ? { cursor: input.cursor } : {}),
  })
  const items = caso.items as readonly EventoFeedItemDto[]
  return {
    tipo: "ok",
    items: items.map((item) => ({ ...item })),
    ...(caso.nextCursor ? { nextCursor: caso.nextCursor } : {}),
    ...(caso.pendientes !== undefined ? { pendientes: caso.pendientes } : {}),
  }
}

async function ejecutarHistorialPorFinca(
  sesion: SesionAutorizada,
  input: LeerEventosFincaWebInput,
): Promise<EventoHistorialRespuesta> {
  const { ejecutarHistorialFinca } = await import("./eventos-finca-read.server.js")
  const caso = await ejecutarHistorialFinca({
    sesion: {
      usuarioId: sesion.usuarioId,
      fincaActivaId: sesion.fincaActivaId,
      permisos: sesion.permisos,
    },
    fincaId: input.fincaId,
    ...(input.categoria ? { categoria: input.categoria } : {}),
    ...(input.tipo ? { tipo: input.tipo } : {}),
    ...(input.fechaDesde ? { fechaDesde: input.fechaDesde } : {}),
    ...(input.fechaHasta ? { fechaHasta: input.fechaHasta } : {}),
    ...(input.cursor ? { cursor: input.cursor } : {}),
  })
  const items = caso.items as readonly EventoHistorialItemDto[]
  return {
    tipo: "ok",
    items: items.map((item) => ({ ...item })),
    ...(caso.nextCursor ? { nextCursor: caso.nextCursor } : {}),
    ...(caso.pendientes !== undefined ? { pendientes: caso.pendientes } : {}),
  }
}

async function ejecutarContadoresPorFinca(
  sesion: SesionAutorizada,
  input: LeerContadoresEventosFincaWebInput,
): Promise<ContadoresEventosFincaRespuesta> {
  const { ejecutarContadoresFinca } = await import("./eventos-finca-read.server.js")
  const caso = await ejecutarContadoresFinca({
    sesion: {
      usuarioId: sesion.usuarioId,
      fincaActivaId: sesion.fincaActivaId,
      permisos: sesion.permisos,
    },
    fincaId: input.fincaId,
    ...(input.mes ? { mes: input.mes } : {}),
  })
  return { tipo: "ok", contadores: caso.contadores }
}

/* -------------------------------------------------------------------------- */
/* Server functions (TanStack Start).                                         */
/* -------------------------------------------------------------------------- */

export const leerEventosFincaTableroFn = createServerFn({ method: "GET" })
  .validator((data: LeerEventosFincaWebInput) => data)
  .handler(async ({ data }) => {
    const sesion = await resolverSesion(data.fincaId)
    if (!sesion) {
      throw new EventosFincaReadHttpError(403, "permiso_denegado")
    }
    if (sesion.fincaActivaId !== data.fincaId) {
      throw new EventosFincaReadHttpError(403, "finca_no_autorizada")
    }
    return ejecutarFeedPorFinca(sesion, data)
  })

export const leerEventosFincaHistorialFn = createServerFn({ method: "GET" })
  .validator((data: LeerEventosFincaWebInput) => data)
  .handler(async ({ data }) => {
    const sesion = await resolverSesion(data.fincaId)
    if (!sesion) {
      throw new EventosFincaReadHttpError(403, "permiso_denegado")
    }
    if (sesion.fincaActivaId !== data.fincaId) {
      throw new EventosFincaReadHttpError(403, "finca_no_autorizada")
    }
    return ejecutarHistorialPorFinca(sesion, data)
  })

export const leerContadoresEventosFincaFn = createServerFn({ method: "GET" })
  .validator((data: LeerContadoresEventosFincaWebInput) => data)
  .handler(async ({ data }) => {
    const sesion = await resolverSesion(data.fincaId)
    if (!sesion) {
      throw new EventosFincaReadHttpError(403, "permiso_denegado")
    }
    if (sesion.fincaActivaId !== data.fincaId) {
      throw new EventosFincaReadHttpError(403, "finca_no_autorizada")
    }
    return ejecutarContadoresPorFinca(sesion, data)
  })
