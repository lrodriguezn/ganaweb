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

import type { AnimalResumen } from "@ganaweb/dominio"

export type { AnimalResumen }

export interface AnimalRepositoryPort {
  /**
   * Busca un animal por su código dentro de la finca indicada.
   *
   * @returns el animal si existe, `null` si no.
   *   La unicidad por (fincaId, codigo) está garantizada por el unique
   *   index `uq_animales_finca_codigo` en `packages/db/schema/animales.ts`.
   */
  buscarPorCodigoYFinca(codigo: string, fincaId: string): Promise<AnimalResumen | null>

  /**
   * Persiste un animal (insert o update según el caso de uso).
   * La idempotencia y las reglas de duplicado las enforce la DB
   * (unique index) — el caso de uso consumidor valida primero con
   * `validarCodigoUnicoPorFinca` (RN-001) para evitar round-trips
   * innecesarios.
   */
  guardar(animal: AnimalResumen): Promise<void>
}
