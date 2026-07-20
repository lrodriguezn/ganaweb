import type {
  CatalogoFincaOption,
  CatalogoFincaPort,
  GrupoOption,
  LoteOption,
  LugarCompraOption,
  PotreroOption,
  SectorOption,
  TablaFinca,
} from "@ganaweb/aplicacion"
import { and, eq } from "drizzle-orm"
import type { DbClient } from "./client.js"
import { grupos, lotes, lugaresCompras, potreros, sectores } from "./schema/index.js"

/**
 * Drizzle adapter for finca-scoped animal master catalogs.
 * Implements CatalogoFincaPort — parameterized by tabla.
 *
 * ADR-002: One adapter per family (not per table).
 * ADR-005: fincaId passed as Drizzle parameter (safe binding).
 *
 * PR-3: "potrero" and "sector" (with codigo).
 * PR-4: adds "lote", "grupo", "lugarCompra" (no codigo column).
 *   lugarCompra maps schema `ubicacion` → DTO `direccion`.
 */
export class DrizzleCatalogoFincaAdapter
  implements CatalogoFincaPort<TablaFinca, CatalogoFincaOption>
{
  constructor(private readonly db: DbClient) {}

  async listarPorFinca(fincaId: string, tabla: "potrero"): Promise<readonly PotreroOption[]>
  async listarPorFinca(fincaId: string, tabla: "sector"): Promise<readonly SectorOption[]>
  async listarPorFinca(fincaId: string, tabla: "lote"): Promise<readonly LoteOption[]>
  async listarPorFinca(fincaId: string, tabla: "grupo"): Promise<readonly GrupoOption[]>
  async listarPorFinca(fincaId: string, tabla: "lugarCompra"): Promise<readonly LugarCompraOption[]>
  async listarPorFinca(
    fincaId: string,
    tabla: TablaFinca,
  ): Promise<readonly CatalogoFincaOption[]> {
    switch (tabla) {
      case "potrero":
        return this.listarPotreros(fincaId)
      case "sector":
        return this.listarSectores(fincaId)
      case "lote":
        return this.listarLotes(fincaId)
      case "grupo":
        return this.listarGrupos(fincaId)
      case "lugarCompra":
        return this.listarLugaresCompra(fincaId)
      default:
        return []
    }
  }

  private async listarPotreros(fincaId: string): Promise<readonly PotreroOption[]> {
    const rows = await this.db
      .select({
        id: potreros.id,
        fincaId: potreros.fincaId,
        codigo: potreros.codigo,
        nombre: potreros.nombre,
        areaHectareas: potreros.areaHectareas,
        activo: potreros.activo,
      })
      .from(potreros)
      .where(and(eq(potreros.activo, 1), eq(potreros.fincaId, fincaId)))
      .orderBy(potreros.nombre)

    return rows.map((row) => ({
      id: row.id,
      nombre: row.nombre,
      codigo: row.codigo,
      fincaId: row.fincaId,
      activo: row.activo === 1,
      areaHectareas: row.areaHectareas,
    }))
  }

  private async listarSectores(fincaId: string): Promise<readonly SectorOption[]> {
    const rows = await this.db
      .select({
        id: sectores.id,
        fincaId: sectores.fincaId,
        codigo: sectores.codigo,
        nombre: sectores.nombre,
        activo: sectores.activo,
      })
      .from(sectores)
      .where(and(eq(sectores.activo, 1), eq(sectores.fincaId, fincaId)))
      .orderBy(sectores.nombre)

    return rows.map((row) => ({
      id: row.id,
      nombre: row.nombre,
      codigo: row.codigo,
      fincaId: row.fincaId,
      activo: row.activo === 1,
    }))
  }

  private async listarLotes(fincaId: string): Promise<readonly LoteOption[]> {
    const rows = await this.db
      .select({
        id: lotes.id,
        fincaId: lotes.fincaId,
        nombre: lotes.nombre,
        activo: lotes.activo,
      })
      .from(lotes)
      .where(and(eq(lotes.activo, 1), eq(lotes.fincaId, fincaId)))
      .orderBy(lotes.nombre)

    return rows.map((row) => ({
      id: row.id,
      nombre: row.nombre,
      fincaId: row.fincaId,
      activo: row.activo === 1,
    }))
  }

  private async listarGrupos(fincaId: string): Promise<readonly GrupoOption[]> {
    const rows = await this.db
      .select({
        id: grupos.id,
        fincaId: grupos.fincaId,
        nombre: grupos.nombre,
        activo: grupos.activo,
      })
      .from(grupos)
      .where(and(eq(grupos.activo, 1), eq(grupos.fincaId, fincaId)))
      .orderBy(grupos.nombre)

    return rows.map((row) => ({
      id: row.id,
      nombre: row.nombre,
      fincaId: row.fincaId,
      activo: row.activo === 1,
    }))
  }

  private async listarLugaresCompra(fincaId: string): Promise<readonly LugarCompraOption[]> {
    const rows = await this.db
      .select({
        id: lugaresCompras.id,
        fincaId: lugaresCompras.fincaId,
        nombre: lugaresCompras.nombre,
        ubicacion: lugaresCompras.ubicacion,
        activo: lugaresCompras.activo,
      })
      .from(lugaresCompras)
      .where(and(eq(lugaresCompras.activo, 1), eq(lugaresCompras.fincaId, fincaId)))
      .orderBy(lugaresCompras.nombre)

    return rows.map((row) => ({
      id: row.id,
      nombre: row.nombre,
      fincaId: row.fincaId,
      activo: row.activo === 1,
      direccion: row.ubicacion,
    }))
  }
}
