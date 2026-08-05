/**
 * Adaptador Drizzle (PostgreSQL) del catálogo de productos sanitarios
 * (Issue #209, RF-SANIDAD v0.2 §6).
 *
 * Implementa `CatalogoProductoSanitarioPort` (`@ganaweb/aplicacion`,
 * type-only — regla `db-to-aplicacion-runtime`).
 *
 * Reglas materializadas aquí:
 * - RN-041/KPI-10: `listar` une `productos_sanitarios` con la vista
 *   `inventario_sanitario` (migración 0007) — el stock NUNCA es un campo
 *   mutable; un producto sin movimientos tiene stock 0.
 * - RN-050/SAN-021: sin borrado físico — `cambiarEstado` es la única baja
 *   (inactivar/reactivar).
 * - SAN-023: el UNIQUE `uq_productos_sanitarios_finca_codigo` ganado en
 *   carrera se traduce a `conflicto` con campo `codigo`.
 * - T-001: `obtenerStockMinimoDosis` lee el parámetro `stock_minimo_dosis`
 *   de `config_parametros_finca`; devuelve null si la finca no lo tiene (el
 *   fallback documentado lo aplica el caso de uso, nunca el adaptador).
 * - CM-024: `obtenerPorId` NO filtra por finca; el scope lo revalida el
 *   caso de uso comparando `fincaId` (PE-002).
 * - IA-002: `productos_sanitarios` NO tiene `usuario_creado_por` — PE-006
 *   aplica a eventos (aplicaciones/entradas), no al catálogo.
 *
 * Driver único PostgreSQL (online-first, D3).
 */

import type {
  CatalogoProductoSanitarioPort,
  FilaProductoSanitarioListado,
  ProductoSanitarioReferencia,
  ProductoSanitarioValidado,
} from "@ganaweb/aplicacion"
import { and, eq } from "drizzle-orm"
import type { DbClient } from "./client.js"
import { configParametrosFinca, inventarioSanitario, productosSanitarios } from "./schema/index.js"

/** SAN-023: restricción UNIQUE de código por finca del catálogo. */
const RESTRICCION_CODIGO_PRODUCTO = "uq_productos_sanitarios_finca_codigo"

function esConflictoCodigoProducto(error: unknown): boolean {
  const causa = (error as { cause?: { constraint_name?: string } }).cause
  return causa?.constraint_name === RESTRICCION_CODIGO_PRODUCTO
}

function aNumero(valor: string | number | null | undefined): number | null {
  if (valor === null || valor === undefined) return null
  return Number(valor)
}

/** numeric(p,s) viaja como string en Postgres; null permanece null. */
function aNumericString(valor: number | null): string | null {
  return valor === null ? null : String(valor)
}

/** Código del parámetro en `config_parametros_finca` (seed v3, KPI-10). */
const CODIGO_PARAMETRO_STOCK_MINIMO = "stock_minimo_dosis"

export class DrizzleCatalogoProductoSanitarioAdapter implements CatalogoProductoSanitarioPort {
  constructor(private readonly db: DbClient) {}

  async obtenerPorId(id: string): Promise<ProductoSanitarioReferencia | null> {
    const filas = await this.db
      .select({
        id: productosSanitarios.id,
        fincaId: productosSanitarios.fincaId,
        codigo: productosSanitarios.codigo,
        descripcion: productosSanitarios.descripcion,
        tipoTratamiento: productosSanitarios.tipoTratamiento,
        precioDosis: productosSanitarios.precioDosis,
        mlMgPorDosis: productosSanitarios.mlMgPorDosis,
        activo: productosSanitarios.activo,
      })
      .from(productosSanitarios)
      .where(eq(productosSanitarios.id, id))
      .limit(1)
    const fila = filas[0]
    if (!fila) return null
    return {
      id: fila.id,
      fincaId: fila.fincaId,
      codigo: fila.codigo,
      descripcion: fila.descripcion,
      tipoTratamiento: fila.tipoTratamiento,
      precioDosis: aNumero(fila.precioDosis),
      mlMgPorDosis: aNumero(fila.mlMgPorDosis),
      activo: fila.activo === 1,
    }
  }

  async crear(
    fincaId: string,
    datos: ProductoSanitarioValidado,
  ): Promise<
    | { readonly tipo: "creado"; readonly id: string }
    | { readonly tipo: "conflicto"; readonly campo: string }
    | { readonly tipo: "error"; readonly detalle: string }
  > {
    const id = crypto.randomUUID()
    try {
      await this.db.insert(productosSanitarios).values({
        id,
        fincaId,
        codigo: datos.codigo,
        descripcion: datos.descripcion,
        mlMgPorDosis: aNumericString(datos.mlMgPorDosis),
        tipoTratamiento: datos.tipoTratamiento,
        precioDosis: aNumericString(datos.precioDosis),
        comentarios: datos.comentarios,
        activo: 1,
      })
      return { tipo: "creado", id }
    } catch (error) {
      if (esConflictoCodigoProducto(error)) return { tipo: "conflicto", campo: "codigo" }
      return { tipo: "error", detalle: "No se pudo crear el producto sanitario." }
    }
  }

  async editar(
    fincaId: string,
    id: string,
    datos: ProductoSanitarioValidado,
  ): Promise<
    | { readonly tipo: "actualizado" }
    | { readonly tipo: "no_encontrado" }
    | { readonly tipo: "conflicto"; readonly campo: string }
    | { readonly tipo: "error"; readonly detalle: string }
  > {
    try {
      const resultado = await this.db
        .update(productosSanitarios)
        .set({
          codigo: datos.codigo,
          descripcion: datos.descripcion,
          mlMgPorDosis: aNumericString(datos.mlMgPorDosis),
          tipoTratamiento: datos.tipoTratamiento,
          precioDosis: aNumericString(datos.precioDosis),
          comentarios: datos.comentarios,
          updatedAt: new Date(),
        })
        .where(and(eq(productosSanitarios.id, id), eq(productosSanitarios.fincaId, fincaId)))
      return resultado.count === 0 ? { tipo: "no_encontrado" } : { tipo: "actualizado" }
    } catch (error) {
      if (esConflictoCodigoProducto(error)) return { tipo: "conflicto", campo: "codigo" }
      return { tipo: "error", detalle: "No se pudo actualizar el producto sanitario." }
    }
  }

  async cambiarEstado(
    fincaId: string,
    id: string,
    activo: boolean,
  ): Promise<
    | { readonly tipo: "estado_actualizado" }
    | { readonly tipo: "no_encontrado" }
    | { readonly tipo: "error"; readonly detalle: string }
  > {
    try {
      const resultado = await this.db
        .update(productosSanitarios)
        .set({ activo: activo ? 1 : 0, updatedAt: new Date() })
        .where(and(eq(productosSanitarios.id, id), eq(productosSanitarios.fincaId, fincaId)))
      return resultado.count === 0 ? { tipo: "no_encontrado" } : { tipo: "estado_actualizado" }
    } catch {
      return { tipo: "error", detalle: "No se pudo actualizar el estado del producto sanitario." }
    }
  }

  async listar(
    fincaId: string,
    opciones: { readonly soloActivos: boolean },
  ): Promise<readonly FilaProductoSanitarioListado[]> {
    const condicion = opciones.soloActivos
      ? and(eq(productosSanitarios.fincaId, fincaId), eq(productosSanitarios.activo, 1))
      : eq(productosSanitarios.fincaId, fincaId)
    const filas = await this.db
      .select({
        id: productosSanitarios.id,
        codigo: productosSanitarios.codigo,
        descripcion: productosSanitarios.descripcion,
        mlMgPorDosis: productosSanitarios.mlMgPorDosis,
        tipoTratamiento: productosSanitarios.tipoTratamiento,
        precioDosis: productosSanitarios.precioDosis,
        comentarios: productosSanitarios.comentarios,
        activo: productosSanitarios.activo,
        // RN-041: stock SIEMPRE calculado — vista inventario_sanitario.
        stockDisponible: inventarioSanitario.dosisDisponibles,
      })
      .from(productosSanitarios)
      .leftJoin(inventarioSanitario, eq(inventarioSanitario.productoId, productosSanitarios.id))
      .where(condicion)
      .orderBy(productosSanitarios.codigo)
    return filas.map((fila) => ({
      id: fila.id,
      codigo: fila.codigo,
      descripcion: fila.descripcion,
      mlMgPorDosis: aNumero(fila.mlMgPorDosis),
      tipoTratamiento: fila.tipoTratamiento,
      precioDosis: aNumero(fila.precioDosis),
      comentarios: fila.comentarios,
      activo: fila.activo === 1,
      stockDisponible: Number(fila.stockDisponible ?? 0),
    }))
  }

  async listarCodigosActivos(
    fincaId: string,
  ): Promise<readonly { readonly id: string; readonly codigo: string }[]> {
    const filas = await this.db
      .select({ id: productosSanitarios.id, codigo: productosSanitarios.codigo })
      .from(productosSanitarios)
      .where(and(eq(productosSanitarios.fincaId, fincaId), eq(productosSanitarios.activo, 1)))
    return filas.map((fila) => ({ id: fila.id, codigo: fila.codigo }))
  }

  async obtenerStockMinimoDosis(fincaId: string): Promise<number | null> {
    const filas = await this.db
      .select({ valor: configParametrosFinca.valor })
      .from(configParametrosFinca)
      .where(
        and(
          eq(configParametrosFinca.fincaId, fincaId),
          eq(configParametrosFinca.codigo, CODIGO_PARAMETRO_STOCK_MINIMO),
          eq(configParametrosFinca.activo, 1),
        ),
      )
      .limit(1)
    const fila = filas[0]
    if (!fila || fila.valor === null) return null
    const numero = Number(fila.valor)
    return Number.isFinite(numero) && numero >= 0 ? numero : null
  }
}
