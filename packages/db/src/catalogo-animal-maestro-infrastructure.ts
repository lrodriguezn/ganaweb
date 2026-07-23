import type {
  CalidadOption,
  CatalogoAnimalMaestroPort,
  CatalogoMaestroOption,
  ColorOption,
  RazaOption,
  TablaMaestro,
  TipoExplotacionOption,
} from "@ganaweb/aplicacion"
import { eq } from "drizzle-orm"
import type { DbClient } from "./client.js"
import {
  configCalidadAnimal,
  configColores,
  configRazas,
  configTiposExplotacion,
} from "./schema/index.js"

/**
 * Drizzle adapter for global (non-finca-scoped) animal master catalogs.
 * Implements CatalogoAnimalMaestroPort — parameterized by tabla.
 *
 * ADR-002: One adapter per family (not per table).
 *
 * PR-1: "raza". PR-2: adds "color" and "calidad".
 */
export class DrizzleCatalogoAnimalMaestroAdapter
  implements CatalogoAnimalMaestroPort<TablaMaestro, CatalogoMaestroOption>
{
  constructor(private readonly db: DbClient) {}

  async listarActivos(tabla: "raza"): Promise<readonly RazaOption[]>
  async listarActivos(tabla: "color"): Promise<readonly ColorOption[]>
  async listarActivos(tabla: "calidad"): Promise<readonly CalidadOption[]>
  async listarActivos(tabla: "tipoExplotacion"): Promise<readonly TipoExplotacionOption[]>
  async listarActivos(tabla: TablaMaestro): Promise<readonly CatalogoMaestroOption[]> {
    switch (tabla) {
      case "raza":
        return this.listarRazas()
      case "color":
        return this.listarColores()
      case "calidad":
        return this.listarCalidades()
      case "tipoExplotacion":
        return this.listarTiposExplotacion()
      default:
        return []
    }
  }

  private async listarRazas(): Promise<readonly RazaOption[]> {
    const rows = await this.db
      .select({
        id: configRazas.id,
        nombre: configRazas.nombre,
        descripcion: configRazas.descripcion,
        origen: configRazas.origen,
        tipoProduccion: configRazas.tipoProduccion,
        activo: configRazas.activo,
      })
      .from(configRazas)
      .where(eq(configRazas.activo, 1))
      .orderBy(configRazas.nombre)

    return rows.map((row) => ({
      id: row.id,
      nombre: row.nombre,
      activo: row.activo === 1,
      descripcion: row.descripcion,
      origen: row.origen,
      tipoProduccion: row.tipoProduccion,
    }))
  }

  private async listarColores(): Promise<readonly ColorOption[]> {
    const rows = await this.db
      .select({
        id: configColores.id,
        nombre: configColores.nombre,
        codigo: configColores.codigo,
        activo: configColores.activo,
      })
      .from(configColores)
      .where(eq(configColores.activo, 1))
      .orderBy(configColores.nombre)

    return rows.map((row) => ({
      id: row.id,
      nombre: row.nombre,
      activo: row.activo === 1,
      meta: { hex: row.codigo ?? "" },
    }))
  }

  private async listarCalidades(): Promise<readonly CalidadOption[]> {
    const rows = await this.db
      .select({
        id: configCalidadAnimal.id,
        nombre: configCalidadAnimal.nombre,
        activo: configCalidadAnimal.activo,
      })
      .from(configCalidadAnimal)
      .where(eq(configCalidadAnimal.activo, 1))
      .orderBy(configCalidadAnimal.nombre)

    return rows.map((row) => ({
      id: row.id,
      nombre: row.nombre,
      activo: row.activo === 1,
    }))
  }

  private async listarTiposExplotacion(): Promise<readonly TipoExplotacionOption[]> {
    const rows = await this.db
      .select({
        id: configTiposExplotacion.id,
        nombre: configTiposExplotacion.nombre,
        activo: configTiposExplotacion.activo,
      })
      .from(configTiposExplotacion)
      .orderBy(configTiposExplotacion.nombre)

    return rows.map((row) => ({
      id: row.id,
      nombre: row.nombre,
      activo: row.activo === 1,
    }))
  }
}
