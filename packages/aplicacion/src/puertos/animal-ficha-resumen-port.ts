/**
 * `AnimalFichaResumenPort` — contrato del modelo de lectura de la ficha
 * animal enriquecida (redesign-ficha-animal, slice 2).
 *
 * D5: proyección NUEVA (`FichaAnimalResumen`) separada de `AnimalResumen`,
 * que sigue siendo el contrato del listado — sin blast radius en la lista.
 *
 * El puerto devuelve datos crudos resueltos (nombres de raza/color,
 * ubicaciones, últimos pesajes, secuencia reproductiva, última condición
 * corporal); las derivaciones (edad, GDP, IEP, días abiertos, gestación)
 * viven en `@ganaweb/dominio` (D4) y las compone `obtenerFichaAnimal`.
 * Los valores no disponibles son null/vacíos — nunca se fabrican.
 */

import type {
  PalpacionEventoFicha,
  PartoEventoFicha,
  PesajeFicha,
  ResumenReproductivoFicha,
  ServicioEventoFicha,
} from "@ganaweb/dominio"

export interface CondicionCorporalFicha {
  readonly valor: number | null
  /** Etiqueta de la escala (config_condiciones_corporales): "Ideal", … */
  readonly etiqueta: string | null
  readonly fecha: string | null // ISO YYYY-MM-DD
}

/**
 * Proyección cruda que devuelve la infraestructura. Eventos ordenados por
 * fecha descendente; sin historia las colecciones son vacías y los nombres
 * sin resolver son null.
 */
export interface FichaResumenBruto {
  readonly raza: string | null
  readonly color: string | null
  readonly potrero: string | null
  readonly sector: string | null
  readonly lote: string | null
  readonly grupo: string | null
  /** Últimos dos pesajes (fecha descendente); menos si hay menos historia. */
  readonly pesajes: readonly PesajeFicha[]
  readonly servicios: readonly ServicioEventoFicha[]
  readonly palpaciones: readonly PalpacionEventoFicha[]
  readonly partos: readonly PartoEventoFicha[]
  readonly condicionCorporal: CondicionCorporalFicha | null
}

/**
 * Proyección enriquecida final que agrega `obtenerFichaAnimal` al resultado
 * de la ficha (spec `animal-ficha-read-model`). Todos los campos pueden ser
 * null: la UI tolera ausencias con estados vacíos estructurados.
 */
export interface FichaAnimalResumen {
  readonly raza: string | null
  readonly color: string | null
  readonly potrero: string | null
  /** Issue #201: nombre del sector actual (lo precarga la edición). */
  readonly sector: string | null
  readonly lote: string | null
  readonly grupo: string | null
  /** Edad en meses derivada de fechaNacimiento (dominio: calcularEdadMeses). */
  readonly edadMeses: number | null
  /** Último pesaje con GDP contra el pesaje anterior (null con uno solo). */
  readonly ultimoPeso: {
    readonly fecha: string
    readonly pesoKg: number
    readonly gdpKgDia: number | null
  } | null
  /** Derivado de eventos (TR-014); null para machos/pajuelas (TR-013). */
  readonly reproduccion: ResumenReproductivoFicha | null
  readonly condicionCorporal: CondicionCorporalFicha | null
}

export interface AnimalFichaResumenPort {
  /**
   * @returns la proyección cruda del animal, o `null` si el animal no
   *   existe en la finca indicada (scope por finca — nunca cruza fincas).
   */
  obtener(animalId: string, fincaId: string): Promise<FichaResumenBruto | null>
}
