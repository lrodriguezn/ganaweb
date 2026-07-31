/**
 * Errores de dominio compartidos entre capas.
 *
 * `AnimalExportacionOverflowError` vivía en `aplicacion` pero `db`
 * la necesitaba en runtime, violando la regla `db-to-aplicacion-runtime`
 * del dependency-cruiser (issue #134). Al moverla a `dominio`:
 *   - `db → dominio` queda como warning tolerado (not-in-allowed).
 *   - `aplicacion → dominio` está permitido y la re-exporta.
 */

export class AnimalExportacionOverflowError extends Error {
  readonly maxFilas: number

  constructor(maxFilas: number) {
    super(`Animal export exceeds the maximum of ${maxFilas} rows`)
    this.name = "AnimalExportacionOverflowError"
    this.maxFilas = maxFilas
  }
}
