/**
 * Entidades de dominio del agregado `Animal`.
 *
 * El dominio se modela en español siguiendo T-001/T-003. Los tipos son
 * readonly para empujar a los consumidores a producir nuevos valores en
 * lugar de mutar (alineado con Clean Architecture — el dominio es
 * inmutable desde la perspectiva de los casos de uso).
 *
 * El alcance de este PR es el subconjunto mínimo necesario para RN-001
 * (código único por finca); los campos adicionales del agregado se
 * completarán en PR futuros.
 */

export type Sexo = "macho" | "hembra" | "pajuela";

export type EstadoAnimal = "activo" | "vendido" | "muerto";

export type Salud = "sano" | "enfermo";

export interface AnimalResumen {
  readonly id: string;
  readonly fincaId: string;
  /** Único dentro de la misma finca (RN-001). */
  readonly codigo: string;
  readonly nombreAnimal?: string | null;
  readonly sexo: Sexo;
  readonly estadoActual: EstadoAnimal;
  readonly salud: Salud;
}
