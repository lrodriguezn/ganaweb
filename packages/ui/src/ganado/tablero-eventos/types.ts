/**
 * Tipos del Tablero e Historial de Eventos (Issue #228, RF-EVENTOS v1.1 §3,
 * EV-UI-001..007). Coexisten con `evento-wizard/types.ts` (#229) — la familia
 * de tipos del wizard describe el contrato de captura; acá describimos el
 * contrato de LECTURA de la ruta `/fincas/$fincaId/eventos`.
 *
 * Los DTOs reproducen la forma serializada que entrega el boundary HTTP de
 * #227 (`eventos-finca-read.server.ts` → `eventos-finca-read.ts`). El
 * componente no toca la capa de aplicación — recibe todo por props para
 * mantenerlo testeable y compatible con SSR/CSR.
 *
 * Reglas de nomenclatura (alineadas con `ganado/types.ts`):
 *  - `Categoria`  = dominio del evento ("reproductivo", "sanidad", ...).
 *  - `Tipo`       = tipo canónico (servicio, pesaje, aplicacion_sanitaria, ...).
 *  - `OrigenCabecera` = "individual" | "grupal" (matriz §2 del requisito).
 */
import type { LucideIcon } from "lucide-react"

/** Categoría del tablero = dominio del evento (RBAC por dominio, #227/§5). */
export type CategoriaEventoTablero = "reproductivo" | "sanidad" | "productivo" | "movimientos"

export const CATEGORIAS_EVENTO_TABLERO = [
  "reproductivo",
  "sanidad",
  "productivo",
  "movimientos",
] as const satisfies readonly CategoriaEventoTablero[]

export interface CategoriaEventoMeta {
  readonly id: CategoriaEventoTablero
  readonly label: string
  readonly icon: LucideIcon
  readonly descripcion: string
  readonly domClass: string
}

/** Item del feed reciente (ver `FeedFincaItem` del puerto #227). */
export interface EventoFeedItem {
  readonly id: string
  readonly dominio: CategoriaEventoTablero
  readonly tipo: string
  readonly fecha: string
  readonly detalle: string | null
  readonly esCabeceraGrupal: boolean
  readonly registroGrupalId: string | null
  readonly totalAnimales: number | null
  readonly animalCodigo: string | null
  readonly animalNombre: string | null
  readonly anulado: boolean
  readonly anuladoEn: string | null
  readonly motivoAnulacion: string | null
}

/** Item del historial (ver `HistorialFincaItem` del puerto #227). */
export interface EventoHistorialItem {
  readonly id: string
  readonly dominio: CategoriaEventoTablero
  readonly tipo: string
  readonly fecha: string
  readonly detalle: string | null
  readonly animalId: string
  readonly animalCodigo: string
  readonly animalNombre: string | null
  readonly registroGrupalId: string | null
  readonly anulado: boolean
  readonly anuladoEn: string | null
  readonly motivoAnulacion: string | null
}

/** Contadores mensuales del tablero (ver `ContadoresEventosFinca` del puerto). */
export interface ContadoresEventosFinca {
  readonly mes: string
  readonly desde: string
  readonly hasta: string
  readonly porDominio: Readonly<Record<CategoriaEventoTablero, number>>
  readonly total: number
}

/** Filtros del feed e historial — se serializan en la URL (ver `eventos.tsx`). */
export interface FiltrosEventosFinca {
  readonly categoria?: CategoriaEventoTablero
  readonly tipo?: string
  readonly fechaDesde?: string
  readonly fechaHasta?: string
}

/** Estado de carga coherente con el patrón de sanidad (#212). */
export type EstadoCargaEventos<T> =
  | { readonly tipo: "cargando" }
  | { readonly tipo: "error" }
  | { readonly tipo: "listo"; readonly datos: T }
