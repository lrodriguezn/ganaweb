/**
 * CatalogoAnimalMaestroPort — port for global (non-finca-scoped) animal
 * master catalogs: raza (PR-1), color, calidad (PR-2).
 *
 * Mirrors CatalogoGlobalPort but typed for maestro tables with richer
 * DTOs (descripcion, origen, tipoProduccion for raza; meta.hex for color).
 *
 * ADR-001: Does NOT extend CatalogoGlobalPort.
 * ADR-002: One adapter per family, parameterized by tabla.
 * ADR-003: Standardized DTO with per-family extensions.
 */

export interface CatalogoMaestroOption {
  readonly id: string
  readonly nombre: string
  readonly activo: boolean
}

export interface RazaOption extends CatalogoMaestroOption {
  readonly descripcion: string | null
  readonly origen: string | null
  readonly tipoProduccion: string | null
}

export interface ColorOption extends CatalogoMaestroOption {
  readonly meta: { readonly hex: string }
}

export interface CalidadOption extends CatalogoMaestroOption {}

export type TablaMaestro = "raza" | "color" | "calidad"

export interface CatalogoAnimalMaestroPort<
  TTabla extends string = TablaMaestro,
  TOption extends CatalogoMaestroOption = CatalogoMaestroOption,
> {
  listarActivos(tabla: TTabla): Promise<readonly TOption[]>
}
