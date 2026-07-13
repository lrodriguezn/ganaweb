import type { ResumenReferenciasAnimal } from "@ganaweb/dominio"

export interface AnimalReferenceCheckerPort {
  summarize(animalId: string, fincaId: string): Promise<ResumenReferenciasAnimal>
}
