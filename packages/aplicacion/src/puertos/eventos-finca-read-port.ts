/**
 * Issue #227 — Puerto de lectura unificada del read model de finca
 * (RF-EVENTOS v1.1, EV-UI-002..005, EV-INT-001).
 *
 * Contrato type-only (D6): la capa de aplicacion declara la forma del
 * resultado; la implementacion Drizzle vive en `packages/db`. El puerto
 * NO incluye SQL ni I/O.
 *
 * Tres capacidades:
 *  - `feedFinca`        — feed reciente, agrupando hijos grupales por
 *                          cabecera (un evento grupal aparece UNA vez).
 *  - `historialFinca`   — historial completo paginado (cada hijo
 *                          grupal aparece por separado).
 *  - `contadoresFinca`  — conteo mensual por dominio para el tablero.
 *
 * Reglas que el puerto obliga a la implementacion:
 *  - La finca activa del request es la unica fuente de verdad para
 *    derivar alcance. No se acepta `fincaId` distinto a `fincaActivaId`.
 *  - Las filas nunca cruzan de finca: el `animal_id` debe pertenecer
 *    a la finca activa o la cabecera grupal debe tener `finca_id =
 *    fincaActivaId`.
 *  - Los eventos anidados en un registro grupal anulado se excluyen
 *    (#181) — el read model reutiliza la exclusion vigente.
 *  - El orden estable es `fecha DESC, id DESC` (consistente con el
 *    timeline del animal, #183).
 *  - La paginacion es keyset opaco (`nextCursor`) — sin OFFSET.
 *  - La query es inmutable: SQL construido con `sql.join(parts, ...)`,
 *    sin callbacks mutables que persistan estado entre filas.
 */
import type { CategoriaFiltroFinca, DominioEvento, PermisoVerDominio } from "@ganaweb/dominio"

export interface EventosFincaReadRequest {
  readonly sesion: {
    readonly usuarioId: string
    readonly fincaActivaId: string
    readonly permisos: readonly { readonly modulo: string; readonly accion: string }[]
  }
  readonly fincaId: string
  /** Categoría opcional — "todos" o un dominio específico. */
  readonly categoria?: CategoriaFiltroFinca
  /** Tipo canónico opcional. La capa de aplicacion ya lo valida contra
   *  el dominio elegido y los permisos de la sesion. */
  readonly tipo?: string
  readonly fechaDesde?: string
  readonly fechaHasta?: string
  readonly cursor?: string
  readonly pageSize: 20 | 50
}

export interface FeedFincaItem {
  readonly id: string
  readonly dominio: DominioEvento
  readonly tipo: string
  readonly fecha: string
  readonly detalle: string | null
  /**
   * `true` cuando la fila representa la cabecera de un registro grupal
   * (EV-UI-003 — la fila del feed de finca muestra el alcance grupal,
   * no cada hijo). Ausente/`false` para eventos individuales.
   */
  readonly esCabeceraGrupal: boolean
  /** `null` para eventos individuales. Para cabeceras: id de la
   *  cabecera en `registros_grupales`. */
  readonly registroGrupalId: string | null
  /** Total de hijos efectivos en la cabecera (excluye los anulados). */
  readonly totalAnimales: number | null
  /** Codigo del animal (solo para eventos individuales). */
  readonly animalCodigo: string | null
  readonly animalNombre: string | null
  readonly anulado: boolean
  readonly anuladoEn: string | null
  readonly motivoAnulacion: string | null
}

export interface HistorialFincaItem {
  readonly id: string
  readonly dominio: DominioEvento
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

export interface EventosFincaPagina<TItem> {
  readonly items: readonly TItem[]
  readonly nextCursor?: string
  /** Eventos restantes bajo el MISMO filtro (#183), si la implementacion
   *  lo soporta. Ausente en la ultima pagina. */
  readonly pendientes?: number
}

export interface ContadoresEventosFinca {
  readonly mes: string
  /** `YYYY-MM-DD` inclusive. */
  readonly desde: string
  /** `YYYY-MM-DD` inclusive. */
  readonly hasta: string
  readonly porDominio: Readonly<Record<PermisoVerDominio, number>>
  readonly total: number
}

export interface EventosFincaReadPort {
  feedFinca(request: EventosFincaReadRequest): Promise<EventosFincaPagina<FeedFincaItem>>
  historialFinca(request: EventosFincaReadRequest): Promise<EventosFincaPagina<HistorialFincaItem>>
  contadoresFinca(input: {
    readonly sesion: EventosFincaReadRequest["sesion"]
    readonly fincaId: string
    /** Mes en formato `YYYY-MM`. Default: mes actual UTC. */
    readonly mes?: string
  }): Promise<ContadoresEventosFinca>
}
