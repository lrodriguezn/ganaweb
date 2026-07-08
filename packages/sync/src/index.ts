/**
 * `@ganaweb/sync` — surface pública.
 *
 * Paquete interfaces-only (D6): solo se re-exportan tipos y contratos
 * de puertos. Las futuras implementaciones viven en otro paquete o en
 * un PR posterior; este barrel NO exporta cuerpos de función, ni
 * lógica de transporte, ni I/O.
 *
 * Consumidores:
 *   - `packages/aplicacion` importa `SyncPushPort` y los DTOs
 *     (`EntradaOutbox`, `FilaCambiada`, `CursorPull`) para declarar
 *     puertos de aplicación.
 *   - El futuro cliente de sync (aún no implementado) implementará
 *     estos puertos contra el transporte real.
 */

export type { SyncPushPort, ResultadoEntradaPush, EntradaOutbox } from "./push-port.js"
export type { SyncPullPort, ResultadoPull, CursorPull, FilaCambiada } from "./pull-port.js"
export type {
  ConflictResolverPort,
  ResultadoConflito,
  SnapshotConflicto,
} from "./conflict-resolver-port.js"
export type { EstadoVital } from "./estado-vital.js"
export { SEVERIDAD_ESTADO_VITAL } from "./conflict-resolver-port.js"
