export interface CatalogoRaw {
  readonly id: string
  readonly key: string
  readonly value: string | null
}

export interface CatalogoGlobalPort {
  listarActivos(opcion: "sexo"): Promise<readonly CatalogoRaw[]>
}
