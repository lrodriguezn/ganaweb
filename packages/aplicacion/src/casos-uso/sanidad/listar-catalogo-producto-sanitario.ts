import { STOCK_MINIMO_DOSIS_DEFAULT, estadoStockSanidad } from "@ganaweb/dominio"
import type { CatalogoProductoSanitarioPort } from "../../puertos/catalogo-producto-sanitario-port.js"
import type {
  FilaCatalogoProductoSanitario,
  ResultadoListarCatalogoProductoSanitario,
} from "./resultados-producto-sanitario.js"

export interface CommandListarCatalogoProductoSanitario {
  readonly fincaId: string
  /**
   * SAN-021: true para selects de captura (los inactivos desaparecen);
   * false para históricos y panel (los inactivos siguen visibles).
   */
  readonly soloActivos: boolean
}

/**
 * Lista el catálogo de productos sanitarios de la finca con stock calculado
 * y semáforo KPI-10 (Issue #209, SAN-022).
 *
 * - RN-041: el stock de cada fila viene del puerto (vista
 *   `inventario_sanitario`); la capa de aplicación NO lo recalca ni lo
 *   almacena — nunca un campo mutable.
 * - T-001: el umbral del semáforo se lee de `config_parametros_finca` vía
 *   `obtenerStockMinimoDosis`; sólo cuando la finca NO tiene el parámetro
 *   se aplica el fallback documentado `STOCK_MINIMO_DOSIS_DEFAULT` (20).
 *   Jamás un umbral hardcodeado en la cadena de consulta.
 * - KPI-10: agotado ≤ 0 · bajo < umbral · ok (regla pura del dominio).
 *
 * No verifica permisos: la re-validación RBAC (PE-002, sanidad:ver) la
 * añade la capa de funciones de servidor.
 */
export function listarCatalogoProductoSanitario(port: CatalogoProductoSanitarioPort) {
  return async (
    cmd: CommandListarCatalogoProductoSanitario,
  ): Promise<ResultadoListarCatalogoProductoSanitario> => {
    const [filas, umbralConfigurado] = await Promise.all([
      port.listar(cmd.fincaId, { soloActivos: cmd.soloActivos }),
      port.obtenerStockMinimoDosis(cmd.fincaId),
    ])

    const stockMinimoDosis = umbralConfigurado ?? STOCK_MINIMO_DOSIS_DEFAULT
    const filasConEstado: readonly FilaCatalogoProductoSanitario[] = filas.map((fila) => ({
      ...fila,
      estadoStock: estadoStockSanidad(fila.stockDisponible, stockMinimoDosis),
    }))

    return { tipo: "catalogo", filas: filasConEstado, stockMinimoDosis }
  }
}
