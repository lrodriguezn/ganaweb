/**
 * RN-001 — código único por finca.
 *
 * Regla de negocio: dentro de una misma `fincaId` no puede existir más de
 * un animal con el mismo `codigo`. El mismo `codigo` SÍ se permite entre
 * fincas distintas (el código se scope-a por finca).
 *
 * Diseño D4: el resultado es una tagged union (discriminated union con
 * `valido` como discriminador). Esto permite a los consumidores manejar
 * el caso inválido de forma exhaustiva sin lanzar excepciones, y deja
 * espacio a un campo `detalle` estructurado que cite la regla violada
 * o el motivo del rechazo.
 *
 * Es una función pura: sin I/O, sin estado global, sin efectos
 * secundarios — testeable con fixtures en memoria (TS-003).
 */

export type ResultadoValidacion =
  | { readonly valido: true }
  | {
      readonly valido: false
      /** Identifica la regla de negocio violada o la guarda de entrada que rechazó. */
      readonly regla: "RN-001"
      /** Mensaje legible para el consumidor; no se usa para branching, sólo para mostrar. */
      readonly detalle: string
    }

/** Subconjunto mínimo de `AnimalResumen` que la validación necesita leer. */
export interface ReferenciaAnimal {
  readonly fincaId: string
  readonly codigo: string
}

/**
 * Valida que `codigo` sea único dentro de la finca indicada.
 *
 * @param codigo  código propuesto para un nuevo animal; se normaliza con
 *                `trim()` antes de comparar.
 * @param fincaId  identificador de la finca donde se pretende registrar.
 * @param animalesExistentes  animales ya registrados (sólo se leen
 *                `fincaId` y `codigo`).
 * @returns `{ valido: true }` si el código es único (o si la lista está
 *                vacía); `{ valido: false, regla: "RN-001", detalle }` en
 *                caso de duplicado o de entrada inválida (código vacío o
 *                sólo espacios en blanco).
 */
export function validarCodigoUnicoPorFinca(
  codigo: string,
  fincaId: string,
  animalesExistentes: ReadonlyArray<ReferenciaAnimal>,
): ResultadoValidacion {
  const codigoNormalizado = codigo.trim()
  if (codigoNormalizado.length === 0) {
    return {
      valido: false,
      regla: "RN-001",
      detalle: "El código del animal no puede estar vacío ni contener solo espacios.",
    }
  }

  const duplicado = animalesExistentes.some(
    (animal) => animal.fincaId === fincaId && animal.codigo === codigoNormalizado,
  )
  if (duplicado) {
    return {
      valido: false,
      regla: "RN-001",
      detalle: `El código "${codigoNormalizado}" ya está registrado en la finca ${fincaId}.`,
    }
  }

  return { valido: true }
}
