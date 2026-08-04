import { validarDatosFinca } from "@ganaweb/dominio"
import type { FincaEscrituraPort } from "../../puertos/maestro-escritura-port.js"
import type { ResultadoEditarFinca } from "./resultados.js"

export interface CommandEditarFinca {
  readonly fincaId: string
  readonly datos: Readonly<Record<string, unknown>>
}

/**
 * Edita los datos básicos de la finca (CM-050, issue #147).
 *
 * Flujo: validación/normalización de dominio (CM-050) → `validacion` con
 * los errores 1:1; si es válida, persistencia con mapeo 1:1 del resultado
 * del puerto (actualizado/no_encontrado/error).
 *
 * No verifica permisos: la re-validación RBAC (PE-002, configuracion:editar)
 * la añade la capa de funciones de servidor (issue #148).
 */
export function editarFinca(port: FincaEscrituraPort) {
  return async (cmd: CommandEditarFinca): Promise<ResultadoEditarFinca> => {
    const validacion = validarDatosFinca(cmd.datos)
    if (!validacion.valido) return { tipo: "validacion", errores: validacion.errores }
    return await port.actualizarDatosBasicos(cmd.fincaId, validacion.valores)
  }
}
