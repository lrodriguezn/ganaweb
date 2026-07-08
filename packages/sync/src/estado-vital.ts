/**
 * `EstadoVital` — tri-state del ciclo de vida relevante para RN-061.
 *
 * Es el conjunto de valores que el `ConflictResolverPort` entiende
 * como tiebreaker de severidad: `muerto` (3) > `vendido` (2) >
 * `en_finca` (1). La asignación numérica concreta vive en la
 * implementación futura de sync (este paquete es interfaces-only por
 * D6); ver `conflict-resolver-port.ts` para el contrato de orden.
 *
 * Es un type-only declaration — no se importa de `packages/dominio`
 * directamente: las reglas de capas (`ui-to-dominio` ya prohibido,
 * `sync-to-db` prohibido) no necesitan cruzar el dominio para
 * declarar este conjunto de literales.
 */

export type EstadoVital = "en_finca" | "vendido" | "muerto"
