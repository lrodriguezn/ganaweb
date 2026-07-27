export type AnimalListadoFilterGrammar = "contains" | "in" | "range" | "drange" | "bool"

export interface AnimalListadoReadFilter {
  readonly key: string
  readonly grammar: AnimalListadoFilterGrammar
  readonly value: string
}

export interface AnimalListadoReadRequest {
  readonly usuarioId: string
  readonly fincaId: string
  readonly page: number
  readonly pageSize: 25 | 50 | 100
  readonly sort: `${string}:${"asc" | "desc"}`
  readonly q: string | null
  readonly filters: readonly AnimalListadoReadFilter[]
  readonly cols: readonly string[]
}

export interface AnimalListadoKeyLabel {
  readonly key: string
  readonly label: string
}

export interface AnimalListadoIdLabel {
  readonly id: string
  readonly label: string
}

export interface AnimalListadoRow {
  readonly id: string
  readonly codigo: string
  readonly nombre: string
  readonly sexo: AnimalListadoKeyLabel
  readonly raza: AnimalListadoIdLabel | null
  readonly fechaNacimiento: string | null
  readonly edadAnios: number | null
  readonly color: AnimalListadoIdLabel | null
  readonly origen: AnimalListadoIdLabel | null
  readonly codigoMadre: string | null
  readonly nombreMadre: string | null
  readonly codigoPadre: string | null
  readonly nombrePadre: string | null
  readonly propietario: AnimalListadoIdLabel | null
  readonly hierro: AnimalListadoIdLabel | null
  readonly numeroPezones: number | null
  readonly calidad: AnimalListadoIdLabel | null
  readonly codigoArete: string | null
  readonly fechaCompra: string | null
  readonly precioCompra: number | null
  readonly pesoCompraKg: number | null
  readonly tatuado: boolean
  readonly herrado: boolean
  readonly descornado: boolean
  readonly codigoRfid: string | null
  readonly potrero: AnimalListadoIdLabel | null
  readonly sector: AnimalListadoIdLabel | null
  readonly lote: AnimalListadoIdLabel | null
  readonly grupo: AnimalListadoIdLabel | null
  readonly comentarios: string | null
  readonly salud: AnimalListadoKeyLabel | null
  readonly categoriaReproductiva: AnimalListadoKeyLabel | null
  readonly estado: AnimalListadoKeyLabel | null
  readonly pesoUltimo: Readonly<{ pesoKg: number; fecha: string }> | null
  readonly codigoQr: string | null
  readonly esDeMonta: boolean
  readonly tipoExplotacion: AnimalListadoIdLabel | null
}

export interface AnimalListadoReadResult {
  readonly data: readonly AnimalListadoRow[]
  readonly page: number
  readonly pageSize: 25 | 50 | 100
  readonly total: number
  readonly totalSinFiltro: number
  readonly sort: string
  readonly cols: readonly string[]
}

export interface AnimalListadoReadPort {
  listar(request: AnimalListadoReadRequest): Promise<AnimalListadoReadResult>
}
