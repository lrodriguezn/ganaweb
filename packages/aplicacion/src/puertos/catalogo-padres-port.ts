/**
 * CatalogoPadresPort — port for madre/padre combobox options.
 *
 * Queries the `animales` table (not a master config table), so it is
 * separate from CatalogoFincaPort / CatalogoAnimalMaestroPort.
 *
 * ParentComboboxOption exposes {id, codigo, nombre} — the UI ComboboxBuscable
 * renders `codigo · nombre` itself (CA-CRE-003). nombre MAY be null when the
 * animal has no name; consumers should coerce to "".
 *
 * ADR: excludedIds is a readonly string[] (not optional) — callers always
 * pass an array (possibly empty). The adapter is responsible for filtering.
 */

export interface ParentComboboxOption {
  readonly id: string
  readonly codigo: string
  readonly nombre: string | null
}

export interface CatalogoPadresPort {
  listarMadres(
    fincaId: string,
    excludedIds: readonly string[],
  ): Promise<readonly ParentComboboxOption[]>
  listarPadres(
    fincaId: string,
    excludedIds: readonly string[],
  ): Promise<readonly ParentComboboxOption[]>
}
