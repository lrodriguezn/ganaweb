export interface ImagenAnimalDto {
  readonly id: string
  readonly esPrincipal: boolean
  readonly estadoSubida: "pendiente" | "subida" | "error"
}

export interface ArchivoAnimalPort {
  listarImagenes(animalId: string, fincaId: string): Promise<readonly ImagenAnimalDto[]>
  vincularImagenPendiente?(entrada: {
    readonly id: string
    readonly fincaId: string
    readonly animalId: string
    readonly blobId: string
    readonly mimeType: string
    readonly bytes: number
    readonly esPrincipal: boolean
    readonly estadoSubida: "pendiente"
  }): Promise<void>
}

export interface ColaBinariosPort {
  encolar(entrada: {
    readonly id: string
    readonly fincaId: string
    readonly animalId: string
    readonly blobId: string
    readonly mimeType: string
    readonly bytes: number
  }): Promise<void>
}
