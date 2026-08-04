/**
 * Puerto de lectura del listado mobile de animales (RF-ANIM-LIST-M v1.1,
 * LM-020/LM-021). Contrato dedicado: SOLO los campos de la card (LM-010)
 * + paginación de scroll infinito. El resultado ya tiene la forma del DTO
 * de transporte (como `AnimalListadoReadResult` del listado desktop).
 *
 * Reglas que viajan en el request:
 * - Filtro base LM-012 aplicado SIEMPRE en la infraestructura:
 *   `finca_id = fincaId AND activo = 1 AND estado_animal_key = 0`.
 * - Filtros por key/id (LA-001, CA-UI-001), nunca por label, gramática `in`.
 * - RBAC fail-closed (LM-RBAC-01/02): sin sesión autorizada con
 *   `animales:ver` para la finca, la implementación lanza
 *   `AnimalListadoForbiddenError` (reutilizada del listado desktop).
 */

export type AnimalMobileFilterKey = "categoriaReproductivaKey" | "saludKey" | "propietarioId"

export interface AnimalMobileListReadFilter {
  readonly key: AnimalMobileFilterKey
  readonly value: string
}

export interface AnimalMobileListReadRequest {
  readonly usuarioId: string
  readonly fincaId: string
  readonly page: number
  readonly pageSize: 20 | 25 | 30
  readonly q: string | null
  readonly filters: readonly AnimalMobileListReadFilter[]
}

export interface AnimalMobileKeyLabel {
  readonly key: string
  readonly label: string
}

export interface AnimalMobileIdLabel {
  readonly id: string
  readonly label: string
}

export interface AnimalMobileMadre {
  readonly codigo: string
  readonly nombre: string | null
}

export interface AnimalMobileRow {
  readonly id: string
  readonly codigo: string
  /** `''` si el animal no tiene nombre registrado. */
  readonly nombre: string
  readonly sexo: AnimalMobileKeyLabel
  readonly raza: AnimalMobileIdLabel | null
  /** `null` cuando el valor almacenado es `no_aplica`, nulo o desconocido. */
  readonly categoriaReproductiva: AnimalMobileKeyLabel | null
  /** Siempre presente (LM-021). */
  readonly salud: AnimalMobileKeyLabel
  readonly esDeMonta: boolean
  readonly propietario: AnimalMobileIdLabel | null
  /** `null` solo si no hay `codigo_madre` ni `madre_id`. */
  readonly madre: AnimalMobileMadre | null
}

export interface AnimalMobileListReadResult {
  readonly data: readonly AnimalMobileRow[]
  readonly page: number
  readonly pageSize: 20 | 25 | 30
  /** Total CON filtros aplicados (filtro base incluido). */
  readonly total: number
  /** Total de la finca solo con el filtro base (LM-012) — guía el estado vacío. */
  readonly totalSinFiltro: number
  /** `true` si hay página siguiente: `page * pageSize < total` (LM-009). */
  readonly hayMas: boolean
}

export interface AnimalMobileListReadPort {
  listar(request: AnimalMobileListReadRequest): Promise<AnimalMobileListReadResult>
}
