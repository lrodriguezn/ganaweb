import type { CatalogoProductoSanitarioPort } from "../../puertos/catalogo-producto-sanitario-port.js"
import type { ResultadoCambiarEstadoProductoSanitario } from "./resultados-producto-sanitario.js"

export interface CommandCambiarEstadoProductoSanitario {
  readonly fincaId: string
  readonly id: string
  readonly activo: boolean
}

/**
 * Inactiva/reactiva un producto sanitario (Issue #209, SAN-021).
 *
 * RN-050: ésta es la ÚNICA baja posible — no existe operación de borrado
 * (patrón CM-045). Un producto referenciado por aplicaciones se conserva;
 * inactivo desaparece de selects de captura y sigue en históricos (SAN-021).
 *
 * SCOPE PRIMERO (CM-024): un producto inexistente o de otra finca se
 * reporta como `no_encontrado` sin revelar su existencia. El resultado
 * `estado_actualizado` lleva el `activo` solicitado (booleano serializable,
 * CM-042).
 *
 * No verifica permisos: la re-validación RBAC (PE-002, sanidad:anular —
 * SAN-060 no define acción "inactivar") la añade la capa de funciones de
 * servidor.
 */
export function cambiarEstadoProductoSanitario(port: CatalogoProductoSanitarioPort) {
  return async (
    cmd: CommandCambiarEstadoProductoSanitario,
  ): Promise<ResultadoCambiarEstadoProductoSanitario> => {
    const registro = await port.obtenerPorId(cmd.id)
    if (registro === null || registro.fincaId !== cmd.fincaId) {
      return { tipo: "no_encontrado" }
    }

    const resultado = await port.cambiarEstado(cmd.fincaId, cmd.id, cmd.activo)
    if (resultado.tipo === "estado_actualizado") {
      return { tipo: "estado_actualizado", activo: cmd.activo }
    }
    if (resultado.tipo === "no_encontrado") return { tipo: "no_encontrado" }
    return { tipo: "error", detalle: resultado.detalle }
  }
}
