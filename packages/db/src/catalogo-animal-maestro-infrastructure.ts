import type {
  CalidadOption,
  CatalogoAnimalMaestroPort,
  CatalogoGlobalConfiguracion,
  CatalogoGlobalConfiguracionPort,
  CatalogoMaestroOption,
  ColorOption,
  FilaCatalogoGlobalConfiguracion,
  RazaOption,
  TablaMaestro,
  TipoExplotacionOption,
} from "@ganaweb/aplicacion"
import { and, eq, ilike } from "drizzle-orm"
import type { DbClient } from "./client.js"
import { escaparBusquedaIlike } from "./maestro-listado-infrastructure.js"
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
 *
 * Issue #148 (CM-053/CM-054): also implements
 * CatalogoGlobalConfiguracionPort on the SAME class (CM-061: extend
 * existing adapters, don't duplicate) — read-only lists of activo=1
 * records with optional case-insensitive search over nombre.
 */
export class DrizzleCatalogoAnimalMaestroAdapter
  implements
    CatalogoAnimalMaestroPort<TablaMaestro, CatalogoMaestroOption>,
    CatalogoGlobalConfiguracionPort
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

  /**
   * CM-053/CM-054: lista solo lectura de registros activo=1 con búsqueda
   * opcional (ILIKE case-insensitive) sobre nombre, orden nombre asc.
   * `origen`/`tipoProduccion` solo existen en razas.
   */
  async listarParaConfiguracion(
    catalogo: CatalogoGlobalConfiguracion,
    opciones?: { readonly busqueda?: string },
  ): Promise<readonly FilaCatalogoGlobalConfiguracion[]> {
    const busqueda = opciones?.busqueda?.trim()

    switch (catalogo) {
      case "razas": {
        const filas = await this.db
          .select({
            id: configRazas.id,
            nombre: configRazas.nombre,
            descripcion: configRazas.descripcion,
            origen: configRazas.origen,
            tipoProduccion: configRazas.tipoProduccion,
          })
          .from(configRazas)
          .where(
            and(
              eq(configRazas.activo, 1),
              busqueda
                ? ilike(configRazas.nombre, `%${escaparBusquedaIlike(busqueda)}%`)
                : undefined,
            ),
          )
          .orderBy(configRazas.nombre)
        return filas.map((fila) => ({
          id: fila.id,
          nombre: fila.nombre,
          descripcion: fila.descripcion,
          origen: fila.origen,
          tipoProduccion: fila.tipoProduccion,
        }))
      }
      case "tiposExplotacion": {
        const filas = await this.db
          .select({
            id: configTiposExplotacion.id,
            nombre: configTiposExplotacion.nombre,
            descripcion: configTiposExplotacion.descripcion,
          })
          .from(configTiposExplotacion)
          .where(
            and(
              eq(configTiposExplotacion.activo, 1),
              busqueda
                ? ilike(configTiposExplotacion.nombre, `%${escaparBusquedaIlike(busqueda)}%`)
                : undefined,
            ),
          )
          .orderBy(configTiposExplotacion.nombre)
        return filas.map((fila) => ({
          id: fila.id,
          nombre: fila.nombre,
          descripcion: fila.descripcion,
        }))
      }
      case "calidades": {
        const filas = await this.db
          .select({
            id: configCalidadAnimal.id,
            nombre: configCalidadAnimal.nombre,
            descripcion: configCalidadAnimal.descripcion,
          })
          .from(configCalidadAnimal)
          .where(
            and(
              eq(configCalidadAnimal.activo, 1),
              busqueda
                ? ilike(configCalidadAnimal.nombre, `%${escaparBusquedaIlike(busqueda)}%`)
                : undefined,
            ),
          )
          .orderBy(configCalidadAnimal.nombre)
        return filas.map((fila) => ({
          id: fila.id,
          nombre: fila.nombre,
          descripcion: fila.descripcion,
        }))
      }
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
