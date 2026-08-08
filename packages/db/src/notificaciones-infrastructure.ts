/**
 * Adaptador Drizzle (PostgreSQL) de notificaciones (Issue #214, SAN-051/RN-042).
 *
 * Implementa `NotificacionesLecturaPort` y `NotificacionesEscrituraPort`
 * (`@ganaweb/aplicacion`, type-only — regla `db-to-aplicacion-runtime`).
 *
 * D1 server-first: `insertarNotificacionesEnTx` recibe la transacción externa
 * para que las notificaciones se inserten en la MISMA transacción que las filas
 * de aplicación y el outbox (T-002/RN-060). Si la inserción falla, se hace
 * rollback de TODO (atomicidad).
 *
 * Driver único PostgreSQL (online-first, D3). El contrato queda listo para el
 * driver de la réplica local offline cuando llegue el MVP de sync.
 */

import type {
  NotificacionNueva,
  NotificacionSanidad,
  NotificacionesEscrituraPort,
  NotificacionesLecturaPort,
  PreferenciaNotificacion,
} from "@ganaweb/aplicacion"
import { and, eq, gte, isNull } from "drizzle-orm"
import type { DbClient } from "./client.js"
import { notificaciones, notificacionesPreferencias } from "./schema/index.js"

export class DrizzleNotificacionesAdapter
  implements NotificacionesLecturaPort, NotificacionesEscrituraPort
{
  constructor(private readonly db: DbClient) {}

  async listarPendientes(
    fincaId: string,
    _usuarioId: string,
    hoy: number,
  ): Promise<readonly NotificacionSanidad[]> {
    const filas = await this.db
      .select({
        id: notificaciones.id,
        fincaId: notificaciones.fincaId,
        tipo: notificaciones.tipo,
        titulo: notificaciones.titulo,
        mensaje: notificaciones.mensaje,
        entidadTipo: notificaciones.entidadTipo,
        entidadId: notificaciones.entidadId,
        leida: notificaciones.leida,
        fechaEvento: notificaciones.fechaEvento,
      })
      .from(notificaciones)
      .where(
        and(
          eq(notificaciones.fincaId, fincaId),
          eq(notificaciones.activo, 1),
          eq(notificaciones.leida, 0),
          gte(notificaciones.fechaEvento, hoy),
        ),
      )
      .orderBy(notificaciones.fechaEvento)

    return filas.map((fila) => ({
      id: fila.id,
      fincaId: fila.fincaId,
      tipo: fila.tipo,
      titulo: fila.titulo,
      mensaje: fila.mensaje,
      entidadTipo: fila.entidadTipo,
      entidadId: fila.entidadId,
      leida: fila.leida ?? 0,
      fechaEvento: fila.fechaEvento ?? 0,
    }))
  }

  async listarPreferencias(usuarioId: string): Promise<readonly PreferenciaNotificacion[]> {
    const filas = await this.db
      .select({
        usuarioId: notificacionesPreferencias.usuarioId,
        tipo: notificacionesPreferencias.tipo,
        canalInapp: notificacionesPreferencias.canalInapp,
        canalEmail: notificacionesPreferencias.canalEmail,
        canalPush: notificacionesPreferencias.canalPush,
        diasAnticipacion: notificacionesPreferencias.diasAnticipacion,
        activo: notificacionesPreferencias.activo,
      })
      .from(notificacionesPreferencias)
      .where(eq(notificacionesPreferencias.usuarioId, usuarioId))

    return filas.map((fila) => ({
      usuarioId: fila.usuarioId,
      tipo: fila.tipo,
      canalInapp: fila.canalInapp ?? 1,
      canalEmail: fila.canalEmail ?? 1,
      canalPush: fila.canalPush ?? 0,
      diasAnticipacion: fila.diasAnticipacion ?? 7,
      activo: fila.activo ?? 1,
    }))
  }

  async obtenerPreferencia(
    usuarioId: string,
    tipo: string,
  ): Promise<PreferenciaNotificacion | null> {
    const filas = await this.db
      .select({
        usuarioId: notificacionesPreferencias.usuarioId,
        tipo: notificacionesPreferencias.tipo,
        canalInapp: notificacionesPreferencias.canalInapp,
        canalEmail: notificacionesPreferencias.canalEmail,
        canalPush: notificacionesPreferencias.canalPush,
        diasAnticipacion: notificacionesPreferencias.diasAnticipacion,
        activo: notificacionesPreferencias.activo,
      })
      .from(notificacionesPreferencias)
      .where(
        and(
          eq(notificacionesPreferencias.usuarioId, usuarioId),
          eq(notificacionesPreferencias.tipo, tipo),
        ),
      )
      .limit(1)

    const fila = filas[0]
    if (!fila) return null
    return {
      usuarioId: fila.usuarioId,
      tipo: fila.tipo,
      canalInapp: fila.canalInapp ?? 1,
      canalEmail: fila.canalEmail ?? 1,
      canalPush: fila.canalPush ?? 0,
      diasAnticipacion: fila.diasAnticipacion ?? 7,
      activo: fila.activo ?? 1,
    }
  }

  async marcarLeida(notificacionId: string): Promise<void> {
    await this.db
      .update(notificaciones)
      .set({ leida: 1 })
      .where(eq(notificaciones.id, notificacionId))
  }

  /**
   * D1 server-first: inserta notificaciones dentro de la transacción externa
   * para atomicidad con la aplicación y el outbox (T-002/RN-060).
   */
  async insertarNotificacionesEnTx(
    tx: unknown,
    notificacionesNuevas: readonly NotificacionNueva[],
  ): Promise<void> {
    if (notificacionesNuevas.length === 0) return
    const txClient = tx as DbClient
    await txClient.insert(notificaciones).values(
      notificacionesNuevas.map((n) => ({
        id: crypto.randomUUID(),
        fincaId: n.fincaId,
        usuarioId: n.usuarioId,
        tipo: n.tipo,
        titulo: n.titulo,
        mensaje: n.mensaje,
        entidadTipo: n.entidadTipo,
        entidadId: n.entidadId,
        leida: 0,
        fechaEvento: n.fechaEvento,
        activo: 1,
      })),
    )
  }
}
