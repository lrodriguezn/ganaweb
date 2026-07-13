export interface TimelineItemAnimalDto {
  readonly id: string
  readonly fecha?: string
  readonly titulo?: string
}

export interface TimelineAnimalPort {
  listarPagina(consulta: {
    readonly animalId: string
    readonly fincaId: string
    readonly cursor?: string
    readonly limit: 20
  }): Promise<{ readonly items: readonly TimelineItemAnimalDto[]; readonly nextCursor?: string }>
}
