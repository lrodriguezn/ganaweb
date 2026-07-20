/**
 * CatalogoFincaPort — port for finca-scoped animal master catalogs:
 * potrero, sector (PR-3), lote, grupo, lugarCompra (PR-4).
 *
 * ADR-001: Does NOT extend CatalogoAnimalMaestroPort or CatalogoGlobalPort.
 * ADR-002: One adapter per family, parameterized by tabla.
 * ADR-005: fincaId passed as parameter; adapter filters by finca_id.
 *
 * PR-4: lote, grupo, lugarCompra have NO `codigo` column (unlike potrero/sector).
 * LugarCompraOption exposes `direccion` (from schema `ubicacion` column).
 */

export interface CatalogoFincaOption {
  readonly id: string
  readonly nombre: string
  readonly codigo?: string
  readonly fincaId: string
  readonly activo: boolean
}

export interface PotreroOption extends CatalogoFincaOption {
  readonly codigo: string
  readonly areaHectareas: number | null
}

export interface SectorOption extends CatalogoFincaOption {
  readonly codigo: string
}

export interface LoteOption extends CatalogoFincaOption {}

export interface GrupoOption extends CatalogoFincaOption {}

export interface LugarCompraOption extends CatalogoFincaOption {
  readonly direccion?: string | null
}

export type TablaFinca = "potrero" | "sector" | "lote" | "grupo" | "lugarCompra"

export interface CatalogoFincaPort<
  TTabla extends string = TablaFinca,
  TOption extends CatalogoFincaOption = CatalogoFincaOption,
> {
  listarPorFinca(fincaId: string, tabla: TTabla): Promise<readonly TOption[]>
}
