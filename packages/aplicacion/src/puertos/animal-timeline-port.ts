/**
 * redesign-ficha-animal (slice 3): dominios canónicos del timeline.
 * Espejo estructural de `DominioEvento` en packages/ui — aplicacion no
 * depende de ui, así que la unión vive aquí y el mapper web las conecta.
 */
export type DominioEventoAnimal = "reproduccion" | "sanidad" | "produccion" | "manejo"

/**
 * Item del timeline del animal. Cada item carga el dominio y el tipo
 * derivados de su tabla de origen (spec animal-timeline: el mapeo NO
 * puede estar hardcodeado a un solo dominio); `detalle` lleva la columna
 * distintiva de la tabla y el título se compone en la capa web.
 */
export interface TimelineItemAnimalDto {
  readonly id: string
  readonly dominio: DominioEventoAnimal
  readonly tipo: string
  /** ISO date (YYYY-MM-DD) — todas las tablas de eventos la exigen. */
  readonly fecha: string
  readonly titulo?: string
  readonly detalle?: string
}

export interface TimelineAnimalPort {
  listarPagina(consulta: {
    readonly animalId: string
    readonly fincaId: string
    readonly cursor?: string
    /** Filtro de dominio para las tabs de la ficha (D2: lado servidor). */
    readonly dominio?: DominioEventoAnimal
    readonly limit: 20
  }): Promise<{ readonly items: readonly TimelineItemAnimalDto[]; readonly nextCursor?: string }>
}
