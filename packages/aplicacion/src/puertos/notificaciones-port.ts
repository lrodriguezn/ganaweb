/**
 * Puerto de notificaciones (Issue #214, SAN-051/RN-042).
 *
 * Contratos type-only de la capa de aplicación (D6) para las notificaciones
 * de refuerzo de sanidad. El adaptador Drizzle vive en `packages/db`
 * (`notificaciones-infrastructure.ts`); las server functions de `apps/web`
 * revalidan sesión/finca/permiso antes de llamarlo (PE-002).
 *
 * D1 server-first: `insertarNotificacionesEnTx` recibe la transacción externa
 * para que las notificaciones se inserten en la MISMA transacción que la
 * aplicación y el outbox (T-002/RN-060).
 *
 * Todas las filas son serializables (CM-042): fechas como texto ISO
 * YYYY-MM-DD o número entero (epoch segundos), sin Date ni BigInt.
 * Nombres en español (T-003).
 */

/**
 * Fila de `notificaciones` por leer — forma serializable del feed de Inicio.
 * `fechaEvento` es epoch segundos (columna INTEGER del esquema).
 */
export type NotificacionSanidad = {
  readonly id: string
  readonly fincaId: string
  readonly tipo: string
  readonly titulo: string
  readonly mensaje: string
  readonly entidadTipo: string | null
  readonly entidadId: string | null
  readonly leida: number
  /** Epoch segundos (columna INTEGER del esquema). */
  readonly fechaEvento: number
}

/**
 * Preferencia de notificación del usuario (left-join con defaults del dominio).
 * `diasAnticipacion` default 7 del dominio cuando no existe fila en la tabla.
 */
export type PreferenciaNotificacion = {
  readonly usuarioId: string
  readonly tipo: string
  readonly canalInapp: number
  readonly canalEmail: number
  readonly canalPush: number
  readonly diasAnticipacion: number
  readonly activo: number
}

/**
 * Fila de notificación por insertar (dentro de una transacción externa — D1).
 * `fechaEvento` es epoch segundos para consistencia con el esquema.
 */
export type NotificacionNueva = {
  readonly fincaId: string
  readonly tipo: string
  readonly titulo: string
  readonly mensaje: string
  readonly entidadTipo: string
  readonly entidadId: string
  /** Epoch segundos. */
  readonly fechaEvento: number
  readonly usuarioId: string | null
}

/**
 * Lecturas del feed de notificaciones (SAN-051).
 *
 * Todas las lecturas están acotadas a la finca (SAN-063): el adaptador
 * recibe el `fincaId` ya revalidado por la server function contra la
 * sesión activa — jamás de la URL.
 */
export interface NotificacionesLecturaPort {
  /**
   * Notificaciones activas no leídas de la finca, con fecha_evento >= hoy.
   * Orden: fecha_evento ASC.
   */
  listarPendientes(
    fincaId: string,
    usuarioId: string,
    hoy: number,
  ): Promise<readonly NotificacionSanidad[]>

  /** Preferencias del usuario (left-join con defaults del dominio). */
  listarPreferencias(usuarioId: string): Promise<readonly PreferenciaNotificacion[]>

  /** Preferencia específica de un usuario para un tipo. Null si no existe. */
  obtenerPreferencia(usuarioId: string, tipo: string): Promise<PreferenciaNotificacion | null>

  /** Marca una notificación como leída. */
  marcarLeida(notificacionId: string): Promise<void>
}

/**
 * Escritura de notificaciones — D1 server-first.
 *
 * `insertarNotificacionesEnTx` recibe la transacción externa para que las
 * notificaciones se inserten en la MISMA transacción que las filas de
 * aplicación y el outbox (T-002/RN-060). Si la inserción falla, se hace
 * rollback de TODO (atomicidad).
 */
export interface NotificacionesEscrituraPort {
  insertarNotificacionesEnTx(
    tx: unknown,
    notificaciones: readonly NotificacionNueva[],
  ): Promise<void>
}
