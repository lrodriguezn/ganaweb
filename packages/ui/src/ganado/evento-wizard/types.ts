import type { LucideIcon } from "lucide-react"

/**
 * Tipos compartidos del shell de captura de eventos (Issue #229, §4 EV-CAP-001..005/007).
 *
 * El shell vive en `packages/ui` y NO importa `@ganaweb/dominio` (regla
 * `ui-to-dominio` de dependency-cruiser): el catálogo y la autorización
 * llegan como props desde la ruta, que sí puede tocar dominio vía aplicación.
 * El server de `apps/web` hace el mapping real a los `EVENTOS_CANONICOS`.
 */

export type TipoEventoWizard =
  | "servicio"
  | "palpacion"
  | "parto"
  | "aplicacion_sanitaria"
  | "revision_veterinaria"
  | "pesaje"
  | "produccion_lactea"
  | "condicion_corporal"
  | "venta"
  | "muerte"
  | "traslado"

export type DominioEventoWizard = "reproductivo" | "sanidad" | "productivo" | "movimientos"

export type OrigenSeleccionGrupal = "manual" | "lote" | "potrero" | "grupo"

export interface TipoEventoMeta {
  readonly id: TipoEventoWizard
  readonly label: string
  readonly dominio: DominioEventoWizard
  readonly categoria: DominioEventoWizard
  readonly icon: LucideIcon
  readonly domClass: string
  /**
   * EV-CAP-002: el tipo admite alcance grupal. `false` en parto (EV-CAP-007)
   * y en muerte/condición corporal hasta migrar `registro_grupal_id` (matriz §2).
   */
  readonly grupal: boolean
}

export interface CategoriaMeta {
  readonly id: DominioEventoWizard
  readonly label: string
}

export type SeleccionIndividual = {
  readonly tipo: "individual"
  readonly animalId: string
}

export type SeleccionGrupal = {
  readonly tipo: "grupal"
  readonly origen: OrigenSeleccionGrupal
  readonly loteId?: string | null
  readonly potreroId?: string | null
  readonly grupoId?: string | null
  /** IDs efectivos tras exclusiones (EV-CAP-002/004). */
  readonly animalIdsEfectivos: readonly string[]
  /** Available members explicitly excluded from the current snapshot. */
  readonly animalIdsExcluidos?: readonly string[]
  /** Total = animalIdsEfectivos.length (EV-CAP-005). */
  readonly totalAnimales: number
  /** UI metadata for visible exception labels; never persisted by the server. */
  readonly animales?: readonly { readonly id: string; readonly codigoAnimal: string }[]
  /** Sparse fields that differ from the common data, keyed by animal id. */
  readonly excepciones?: Readonly<Record<string, Readonly<Record<string, string | number | null>>>>
}

export type Seleccion = SeleccionIndividual | SeleccionGrupal

export interface CapturaEvento {
  readonly tipo: TipoEventoWizard
  readonly seleccion: Seleccion
  /** Datos capturados por el formulario del dominio (delegado a EV-CAP-006/008). */
  readonly datos: Readonly<Record<string, string | number | null>>
  /** ISO YYYY-MM-DD; si falta la hereda el formulario del dominio. */
  readonly fecha?: string
  readonly corrigeAId?: string
}

export interface BorradorEvento {
  readonly tipo?: TipoEventoWizard
  readonly modo?: Seleccion["tipo"]
  readonly seleccion?: Seleccion
  readonly datosComunes: Readonly<Record<string, string | number | null>>
  /** Compatible state shape for #273; this wizard does not persist it remotely. */
  readonly excepciones: Readonly<Record<string, Readonly<Record<string, string | number | null>>>>
}

export interface EventoWizardPoliticaRiesgo {
  /** Event types selected by product policy as requiring explicit review. */
  readonly tiposSensibles: readonly TipoEventoWizard[]
  /** Optional large-group threshold; omitted means this trigger is disabled. */
  readonly umbralGrupoGrande?: number
}

export type CargaAnimalesPorOrigen = (
  origen: OrigenSeleccionGrupal,
  id: string,
) => Promise<readonly { readonly id: string; readonly codigoAnimal: string }[]>

export interface ResultadoMembresiaActual {
  readonly estado: "coincide" | "cambio" | "desconocido"
  readonly animales?: readonly { readonly id: string; readonly codigoAnimal: string }[]
  readonly agregados?: readonly { readonly id: string; readonly codigoAnimal: string }[]
  /** Removed members are absent from the current query, so their code may be unavailable. */
  readonly retirados?: readonly { readonly id: string; readonly codigoAnimal?: string }[]
}

export type RevisarMembresiaActual = (
  origen: Exclude<OrigenSeleccionGrupal, "manual">,
  id: string,
  snapshotIds: readonly string[],
) => Promise<ResultadoMembresiaActual>

export type BuscarAnimalPorCodigo = (
  codigo: string,
) => Promise<{ readonly id: string; readonly codigoAnimal: string } | null>

/** Permiso de creación efectivo por dominio (server ya lo validó). */
export type PermisosEfectivosPorDominio = Readonly<Record<DominioEventoWizard, boolean>>

export interface OpcionCatalogoFinca {
  readonly id: string
  readonly nombre: string
}

export interface CatalogosParaAlcance {
  readonly lotes: readonly OpcionCatalogoFinca[]
  readonly potreros: readonly OpcionCatalogoFinca[]
  readonly grupos: readonly OpcionCatalogoFinca[]
  readonly sectores?: readonly OpcionCatalogoFinca[]
  readonly padres?: readonly OpcionCatalogoEvento[]
  readonly pajuelas?: readonly OpcionCatalogoEvento[]
  readonly inseminadores?: readonly OpcionCatalogoEvento[]
  readonly veterinarios?: readonly OpcionCatalogoEvento[]
  readonly diagnosticos?: readonly OpcionCatalogoEvento[]
  readonly productosSanitarios?: readonly OpcionCatalogoEvento[]
  readonly motivosVenta?: readonly OpcionCatalogoEvento[]
  readonly lugaresVenta?: readonly OpcionCatalogoEvento[]
  readonly causasMuerte?: readonly OpcionCatalogoEvento[]
}

export interface OpcionCatalogoEvento {
  readonly id: string
  readonly nombre: string
  readonly codigo?: string
}
