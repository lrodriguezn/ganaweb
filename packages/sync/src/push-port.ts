/**
 * `SyncPushPort` — contrato de subida de eventos al servidor.
 *
 * Una futura implementación (sync change) concretará este puerto con
 * un cliente HTTP/transport real. Este paquete define SOLO la forma
 * del contrato — sin I/O, sin red, sin lógica algorítmica (D6).
 *
 * El resultado discrimina por `aplicada` para que el caso de uso
 * consumidor (en `packages/aplicacion`) pueda bifurcar entre éxito
 * puro y conflicto sin filtrar detalles de transporte.
 */

/**
 * Forma canónica de un evento a empujar al servidor.
 *
 * Es el shape que `OutboxPort.append()` (en `packages/aplicacion`)
 * produce y que `SyncPushPort.push()` consume. Definirlo aquí
 * (en `sync`, no en `aplicacion`) respeta la dirección de capas
 * del diseño: `aplicacion` importa de `sync`, no al revés.
 * `aplicacion` lo re-exporta como `EventoOutbox` para su
 * nomenclatura interna — los nombres son alias estructuralmente
 * idénticos.
 */
export interface EntradaOutbox {
  readonly id: string
  readonly fincaId: string
  readonly tablaDestino: string
  readonly operacion: "INSERT" | "UPDATE" | "DELETE"
  readonly payload: unknown
  readonly createdAt: string
}

/**
 * Resultado por entrada enviada al push:
 *   - aplicada: true  → el servidor aceptó y persistió la entrada
 *   - aplicada: false → hubo conflicto (RN-061) y se devuelve el motivo
 *                      legible para que la UI muestre el detalle
 */
export type ResultadoEntradaPush =
  | { readonly aplicada: true; readonly id: string }
  | {
      readonly aplicada: false
      readonly conflicto: true
      readonly id: string
      readonly motivo: string
    }

export interface SyncPushPort {
  /**
   * Empuja un lote de entradas del outbox al servidor.
   * La implementación concreta es responsable de:
   *   - serialización
   *   - retries / backoff
   *   - manejo de transporte (HTTP, gRPC, etc.)
   *   - mapeo de errores a la forma `ResultadoEntradaPush`
   *
   * @param lote entradas del outbox, en el orden en que la app local las generó.
   * @returns un resultado por entrada, en el mismo orden que `lote`.
   */
  push(lote: ReadonlyArray<EntradaOutbox>): Promise<ReadonlyArray<ResultadoEntradaPush>>
}
