/**
 * `AnimalRepositoryPort` — contrato de persistencia del agregado Animal.
 *
 * Las operaciones declaradas son las mínimas necesarias para soportar
 * el caso de uso `CrearAnimal` (verificación de RN-001) y `ObtenerAnimal`.
 * Las implementaciones concretas (`packages/db`, que implementa los
 * puertos vía Drizzle) viven en otro PR; este archivo es un contrato
 * type-only (D6).
 *
 * El shape de `AnimalResumen` viene de `@ganaweb/dominio` (la entidad
 * canónica) — `aplicacion` re-exporta este tipo para que los casos de
 * uso no necesiten importar de `dominio` directamente. Esto mantiene
 * la regla de capas: `apps/web` y `db` consumen `AnimalResumen` desde
 * `aplicacion`, no desde `dominio` (regla `web-to-dominio-direct`).
 */

import type { AnimalResumen, EstadoAnimal } from "@ganaweb/dominio"

export type { AnimalResumen }

export interface AnimalRegistro {
  readonly id: string
  readonly fincaId: string
  readonly codigo: string
  readonly nombre: string
  readonly sexoKey: 0 | 1 | 2
  readonly version: number
  readonly activo: boolean
  readonly estadoActual?: EstadoAnimal
  readonly salud?: string
  readonly potreroId?: string
  readonly loteId?: string
  readonly usuarioCreadoPor: string
  readonly creadoEn: Date
  /** epoch seconds (UTC) — null si no aplica. PR Slice D2: persistencia. */
  readonly fechaNacimiento?: number | null
  readonly fechaCompra?: number | null
}

export interface AnimalRepositoryPort {
  /**
   * Busca un animal por su código dentro de la finca indicada.
   *
   * @returns el animal si existe, `null` si no.
   *   La unicidad por (fincaId, codigo) está garantizada por el unique
   *   index `uq_animales_finca_codigo` en `packages/db/schema/animales.ts`.
   */
  buscarPorCodigoYFinca(codigo: string, fincaId: string): Promise<AnimalResumen | null>

  obtenerPorIdYFinca?(animalId: string, fincaId: string): Promise<AnimalRegistro | null>

  /**
   * Persiste un animal (insert o update según el caso de uso).
   * La idempotencia y las reglas de duplicado las enforce la DB
   * (unique index) — el caso de uso consumidor valida primero con
   * `validarCodigoUnicoPorFinca` (RN-001) para evitar round-trips
   * innecesarios.
   */
  guardar(animal: AnimalResumen): Promise<void>

  actualizar?(
    animalId: string,
    fincaId: string,
    cambios: { readonly codigo?: string; readonly versionLeida: number },
  ): Promise<void>

  inactivar?(animalId: string, fincaId: string): Promise<void>

  reactivar?(animalId: string, fincaId: string, codigo: string): Promise<void>

  eliminarFisico?(animalId: string, fincaId: string): Promise<void>
}
