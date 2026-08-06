/**
 * Puerto del catálogo de productos sanitarios (Issue #209, RF-SANIDAD v0.2 §6).
 *
 * Contrato type-only de la capa de aplicación para el CRUD del catálogo
 * (SAN-020..SAN-024) y la consulta con stock calculado (RN-041/KPI-10). El
 * adaptador Drizzle vive en `packages/db`
 * (`catalogo-producto-sanitario-infrastructure.ts`).
 *
 * Decisiones de contrato:
 * - `obtenerPorId` NO filtra por finca: el scope lo revalida el caso de uso
 *   comparando `fincaId` (patrón CM-024, PE-002).
 * - `listar` devuelve el stock por fila desde la vista `inventario_sanitario`
 *   (RN-041: el stock NUNCA es un campo mutable); el semáforo KPI-10 lo
 *   calcula el caso de uso con el umbral de `obtenerStockMinimoDosis`.
 * - `obtenerStockMinimoDosis` devuelve null cuando la finca NO tiene el
 *   parámetro `stock_minimo_dosis` en `config_parametros_finca`; el caso de
 *   uso aplica entonces el fallback documentado `STOCK_MINIMO_DOSIS_DEFAULT`
 *   (T-001: el umbral efectivo jamás se hardcodea).
 * - Sin operación de borrado: RN-050 — la única baja es
 *   `cambiarEstado(false)` (SAN-021, patrón CM-045).
 * - PE-006 no aplica al catálogo: `productos_sanitarios` no tiene
 *   `usuario_creado_por` (el esquema v3 manda, IA-002).
 *
 * Nombres en español (T-003).
 */

import type { ProductoSanitarioValidado } from "@ganaweb/dominio"
import type { ProductoSanitarioReferencia } from "./sanidad-port.js"

export type { ProductoSanitarioReferencia, ProductoSanitarioValidado }

/**
 * Fila del listado del catálogo con stock calculado (RN-041). El adaptador
 * une `productos_sanitarios` con la vista `inventario_sanitario`; un
 * producto sin movimientos tiene stock 0.
 */
export type FilaProductoSanitarioListado = {
  readonly id: string
  readonly codigo: string
  readonly descripcion: string
  readonly mlMgPorDosis: number | null
  readonly tipoTratamiento: string
  readonly precioDosis: number | null
  readonly comentarios: string | null
  readonly activo: boolean
  /** RN-041: Σ entradas.dosis − Σ aplicaciones.dosis (puede ser negativo). */
  readonly stockDisponible: number
}

export interface CatalogoProductoSanitarioPort {
  /** Null si el producto no existe. SIN filtro de finca (CM-024). */
  obtenerPorId(id: string): Promise<ProductoSanitarioReferencia | null>

  /**
   * SAN-023: el UNIQUE (finca_id, codigo) puede ganarse en carrera; el
   * adaptador lo traduce a `conflicto` con campo `codigo`.
   */
  crear(
    fincaId: string,
    datos: ProductoSanitarioValidado,
  ): Promise<
    | { readonly tipo: "creado"; readonly id: string }
    | { readonly tipo: "conflicto"; readonly campo: string }
    | { readonly tipo: "error"; readonly detalle: string }
  >

  editar(
    fincaId: string,
    id: string,
    datos: ProductoSanitarioValidado,
  ): Promise<
    | { readonly tipo: "actualizado" }
    | { readonly tipo: "no_encontrado" }
    | { readonly tipo: "conflicto"; readonly campo: string }
    | { readonly tipo: "error"; readonly detalle: string }
  >

  /** SAN-021 / RN-050: inactivar/reactivar; jamás borrado físico. */
  cambiarEstado(
    fincaId: string,
    id: string,
    activo: boolean,
  ): Promise<
    | { readonly tipo: "estado_actualizado" }
    | { readonly tipo: "no_encontrado" }
    | { readonly tipo: "error"; readonly detalle: string }
  >

  /**
   * SAN-021: con `soloActivos: true` el listado alimenta selects de captura
   * (los inactivos desaparecen); con false, históricos y panel.
   */
  listar(
    fincaId: string,
    opciones: { readonly soloActivos: boolean },
  ): Promise<readonly FilaProductoSanitarioListado[]>

  /**
   * Códigos de registros ACTIVOS de la finca (SAN-023/CM-041): los
   * inactivos no reservan código. El id permite excluir el propio registro
   * en edición.
   */
  listarCodigosActivos(
    fincaId: string,
  ): Promise<readonly { readonly id: string; readonly codigo: string }[]>

  /**
   * T-001: umbral `stock_minimo_dosis` de `config_parametros_finca`.
   * null si la finca no tiene el parámetro (el caso de uso aplica el
   * fallback documentado del dominio).
   */
  obtenerStockMinimoDosis(fincaId: string): Promise<number | null>
}
