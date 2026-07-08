/**
 * `ConflictResolverPort` — contrato de resolución de conflictos (RN-061).
 *
 * Reglas RN-061 (citadas en el spec `sync-port-stub.md` Req 4):
 *   - Last-Write-Wins (LWW) por `timestampEvento` del cambio remoto/local.
 *   - Si los timestamps empatan, gana el de mayor severidad de ciclo de vida:
 *       MUERTO > VENDIDO > EN_FINCA
 *
 * Esta interfaz está parametrizada con `T` (el tipo de estado a resolver)
 * para ser reutilizable más allá del agregado Animal. El uso concreto
 * (con `EstadoVital` o con cualquier otro union) lo decide el caso de uso
 * que la consume en `packages/aplicacion`.
 *
 * Interfaces-only (D6): no hay algoritmo aquí; la implementación vive
 * en un PR futuro de sync y debe llegar con sus pruebas unitarias.
 */

import type { EstadoVital } from "./estado-vital.js"

export type { EstadoVital }

/** Severidad de ciclo de vida: mayor número = más "terminal" = gana. */
export const SEVERIDAD_ESTADO_VITAL: Readonly<Record<EstadoVital, number>> = {
  en_finca: 1,
  vendido: 2,
  muerto: 3,
}

export interface SnapshotConflicto<T> {
  readonly estado: T
  readonly timestampEvento: string // ISO 8601
}

export interface ResultadoConflito<T> {
  /** Quién aporta el estado ganador tras aplicar RN-061. */
  readonly ganador: "local" | "remoto"
  readonly estado: T
}

export interface ConflictResolverPort<T> {
  /**
   * Resuelve un conflicto entre un estado local y un estado remoto
   * siguiendo RN-061 (LWW por timestamp, severidad de ciclo de vida
   * como tiebreaker). El genérico `T` permite usar la interfaz con
   * cualquier tipo de estado que el agregado defina.
   */
  resolver(local: SnapshotConflicto<T>, remoto: SnapshotConflicto<T>): ResultadoConflito<T>
}
