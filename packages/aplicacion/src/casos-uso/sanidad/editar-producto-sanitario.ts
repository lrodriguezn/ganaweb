import {
  datosProductoSanitarioDesdeRecord,
  validarCodigoUnicoProductoSanitario,
  validarDatosProductoSanitario,
} from "@ganaweb/dominio"
import type { CatalogoProductoSanitarioPort } from "../../puertos/catalogo-producto-sanitario-port.js"
import type { ResultadoEditarProductoSanitario } from "./resultados-producto-sanitario.js"

export interface CommandEditarProductoSanitario {
  readonly fincaId: string
  readonly id: string
  readonly datos: Readonly<Record<string, unknown>>
}

/**
 * Edita un producto sanitario del catálogo de la finca (Issue #209, SAN-020).
 *
 * SCOPE PRIMERO (CM-024): si el producto no existe o pertenece a otra finca
 * devuelve `no_encontrado` sin revelar su existencia; sólo después valida
 * (CM-026), verifica el código único entre activos excluyendo el propio
 * registro (SAN-023/CM-041) y persiste con mapeo 1:1.
 *
 * No verifica permisos: la re-validación RBAC (PE-002, sanidad:editar) la
 * añade la capa de funciones de servidor.
 */
export function editarProductoSanitario(port: CatalogoProductoSanitarioPort) {
  return async (cmd: CommandEditarProductoSanitario): Promise<ResultadoEditarProductoSanitario> => {
    const registro = await port.obtenerPorId(cmd.id)
    if (registro === null || registro.fincaId !== cmd.fincaId) {
      return { tipo: "no_encontrado" }
    }

    const validacion = validarDatosProductoSanitario(datosProductoSanitarioDesdeRecord(cmd.datos))
    if (!validacion.valido) return { tipo: "validacion", errores: validacion.errores }

    const codigosActivos = await port.listarCodigosActivos(cmd.fincaId)
    const unicidad = validarCodigoUnicoProductoSanitario(
      validacion.valores.codigo,
      codigosActivos,
      cmd.id,
    )
    if (!unicidad.valido) return { tipo: "validacion", errores: [unicidad.error] }

    return await port.editar(cmd.fincaId, cmd.id, validacion.valores)
  }
}
