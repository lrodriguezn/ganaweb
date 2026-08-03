import type { FamiliaMaestro, MaestroEscrituraPort } from "../../puertos/maestro-escritura-port.js"
import type { ResultadoCambiarEstadoMaestro } from "./resultados.js"

export interface CommandCambiarEstadoMaestro {
  readonly familia: FamiliaMaestro
  readonly fincaId: string
  readonly id: string
  readonly activo: boolean
}

/**
 * Activa/inactiva un maestro (issue #147, RF-CONFIG-MAESTROS).
 *
 * RN-050: ésta es la ÚNICA baja posible — no existe operación de borrado.
 * SCOPE PRIMERO (CM-024): un registro inexistente o de otra finca se
 * reporta como `no_encontrado` sin revelar su existencia. El resultado
 * `estado_actualizado` lleva el `activo` solicitado (booleano serializable,
 * CM-042), mientras el puerto recibe el flag 0|1 del esquema.
 *
 * No verifica permisos: la re-validación RBAC (PE-002,
 * configuracion:inactivar) la añade la capa de funciones de servidor
 * (issue #148).
 */
export function cambiarEstadoMaestro(port: MaestroEscrituraPort) {
  return async (cmd: CommandCambiarEstadoMaestro): Promise<ResultadoCambiarEstadoMaestro> => {
    const registro = await port.obtenerPorId(cmd.familia, cmd.id)
    if (registro === null || registro.fincaId !== cmd.fincaId) {
      return { tipo: "no_encontrado" }
    }

    const resultado = await port.cambiarEstado(cmd.familia, cmd.fincaId, cmd.id, cmd.activo ? 1 : 0)
    if (resultado.tipo === "estado_actualizado") {
      return { tipo: "estado_actualizado", activo: cmd.activo }
    }
    if (resultado.tipo === "no_encontrado") return { tipo: "no_encontrado" }
    return { tipo: "error", detalle: resultado.detalle }
  }
}
