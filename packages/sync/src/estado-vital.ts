/**
 * `EstadoVital` — tri-state del ciclo de vida relevante para RN-061.
 *
 * Es el conjunto de valores que el `ConflictResolverPort` entiende
 * como tiebreaker de severidad: `muerto` > `vendido` > `en_finca`
 * (exportado en `conflict-resolver-port.ts` con su `SEVERIDAD_ESTADO_VITAL`).
 *
 * Es un type-only declaration — no se importa de `packages/dominio`
 * directamente: las reglas de capas (`ui-to-dominio` ya prohibido,
 * `sync-to-db` prohibido) no necesitan cruzar el dominio para
 * declarar este conjunto de literales.
 */

export type EstadoVital = "en_finca" | "vendido" | "muerto"
