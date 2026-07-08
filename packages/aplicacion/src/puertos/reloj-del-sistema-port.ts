/**
 * `RelojDelSistemaPort` — contrato de reloj para casos de uso testeables.
 *
 * `Date.now()` y `new Date()` son dependencias globales del entorno
 * que rompen la determinismo de los tests. Todos los casos de uso
 * que necesiten la hora actual deben depender de este puerto y
 * recibir su implementación por inyección (DIP).
 *
 * Las implementaciones concretas:
 *   - Producción: `RelojDelSistemaReal` (envuelve `new Date()`).
 *   - Tests: `RelojDelSistemaFalso` (devuelve una fecha fija).
 *
 * Interfaces-only (D6): este archivo es un contrato type-only.
 */

export interface RelojDelSistemaPort {
  /** Devuelve la fecha/hora actual en la zona horaria del sistema. */
  ahora(): Date
}
