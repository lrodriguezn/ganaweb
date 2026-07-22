import type { CatalogoPadresPort, ParentComboboxOption } from "@ganaweb/aplicacion"
import { and, eq, inArray, notInArray } from "drizzle-orm"
import type { DbClient } from "./client.js"
import { animales } from "./schema/index.js"

/**
 * Drizzle adapter for madre/padre combobox catalogs.
 * Implements CatalogoPadresPort — queries the `animales` table.
 *
 * Madre: sexoKey = 1 (Hembra), all estados, ordered by codigo.
 * Padre: sexoKey IN (0, 2) (Macho ∪ Pajuela), all estados, ordered by codigo.
 * excludedIds: drops the current animal (edit mode self-parent prevention).
 *
 * CA-CRE-003: The UI ComboboxBuscable renders `codigo · nombre` itself.
 * This adapter returns raw {id, codigo, nombre} — nombre may be null.
 */
export class DrizzleCatalogoPadresAdapter implements CatalogoPadresPort {
  constructor(private readonly db: DbClient) {}

  async listarMadres(
    fincaId: string,
    excludedIds: readonly string[],
  ): Promise<readonly ParentComboboxOption[]> {
    const conditions = [eq(animales.fincaId, fincaId), eq(animales.sexoKey, 1)]
    if (excludedIds.length > 0) {
      conditions.push(notInArray(animales.id, [...excludedIds]))
    }
    const rows = await this.db
      .select({
        id: animales.id,
        codigo: animales.codigo,
        nombre: animales.nombre,
      })
      .from(animales)
      .where(and(...conditions))
      .orderBy(animales.codigo)

    return rows.map((row) => ({
      id: row.id,
      codigo: row.codigo,
      nombre: row.nombre ?? null,
    }))
  }

  async listarPadres(
    fincaId: string,
    excludedIds: readonly string[],
  ): Promise<readonly ParentComboboxOption[]> {
    const conditions = [eq(animales.fincaId, fincaId), inArray(animales.sexoKey, [0, 2])]
    if (excludedIds.length > 0) {
      conditions.push(notInArray(animales.id, [...excludedIds]))
    }
    const rows = await this.db
      .select({
        id: animales.id,
        codigo: animales.codigo,
        nombre: animales.nombre,
      })
      .from(animales)
      .where(and(...conditions))
      .orderBy(animales.codigo)

    return rows.map((row) => ({
      id: row.id,
      codigo: row.codigo,
      nombre: row.nombre ?? null,
    }))
  }
}
