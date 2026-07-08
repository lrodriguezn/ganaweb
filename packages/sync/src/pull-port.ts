/**
 * `SyncPullPort` — contrato de descarga incremental por finca.
 *
 * La pull opera por finca (`fincaId`) y usa un cursor estable
 * `(updated_at, id)` para que el cliente reanude desde el último
 * punto conocido sin re-recibir filas ya aplicadas. Este cursor
 * es la ÚNICA fuente de verdad de progreso — el cliente no
 * mantiene un offset propio.
 *
 * Paquete interfaces-only (D6): no hay I/O ni algoritmo aquí.
 */

export interface FilaCambiada {
  readonly id: string
  readonly fincaId: string
  readonly tablaDestino: string
  readonly operacion: "INSERT" | "UPDATE" | "DELETE"
  readonly payload: unknown
  readonly updatedAt: string
}

export type CursorPull = { readonly updatedAt: string; readonly id: string } | null

export interface ResultadoPull {
  readonly filas: ReadonlyArray<FilaCambiada>
  /** Cursor para la próxima invocación; null cuando no hay más cambios. */
  readonly cursorSiguiente: CursorPull
}

export interface SyncPullPort {
  /**
   * Trae cambios de la finca indicada a partir de `cursor` (o desde el
   * principio si `cursor === null`).
   *
   * @param fincaId  finca cuyos cambios se quieren descargar.
   * @param cursor   último cursor conocido por el cliente, o null.
   * @param limite   tamaño máximo del lote (opcional; la implementación decide el default).
   */
  pull(fincaId: string, cursor: CursorPull, limite?: number): Promise<ResultadoPull>
}
