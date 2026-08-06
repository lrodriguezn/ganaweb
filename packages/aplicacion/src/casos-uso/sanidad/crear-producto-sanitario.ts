import {
  datosProductoSanitarioDesdeRecord,
  validarCodigoUnicoProductoSanitario,
  validarDatosProductoSanitario,
} from "@ganaweb/dominio"
import type { CatalogoProductoSanitarioPort } from "../../puertos/catalogo-producto-sanitario-port.js"
import type { ResultadoCrearProductoSanitario } from "./resultados-producto-sanitario.js"

export interface CommandCrearProductoSanitario {
  readonly fincaId: string
  readonly datos: Readonly<Record<string, unknown>>
}

/**
 * Crea un producto sanitario del catálogo de la finca (Issue #209, SAN-020).
 *
 * Flujo:
 * 1. Validación de dominio estilo CM-026 (SAN-020) → `validacion` 1:1.
 * 2. Código único entre registros ACTIVOS de la finca, case-insensitive
 *    (SAN-023/CM-041) — el UNIQUE del esquema puede ganarse en carrera y el
 *    adaptador lo traduce a `conflicto`.
 * 3. Persistencia con mapeo 1:1 del resultado del puerto.
 *
 * No verifica permisos: la re-validación RBAC (PE-002, sanidad:crear) la
 * añade la capa de funciones de servidor (patrón de maestros, issue #148).
 */
export function crearProductoSanitario(port: CatalogoProductoSanitarioPort) {
  return async (cmd: CommandCrearProductoSanitario): Promise<ResultadoCrearProductoSanitario> => {
    const validacion = validarDatosProductoSanitario(datosProductoSanitarioDesdeRecord(cmd.datos))
    if (!validacion.valido) return { tipo: "validacion", errores: validacion.errores }

    const codigosActivos = await port.listarCodigosActivos(cmd.fincaId)
    const unicidad = validarCodigoUnicoProductoSanitario(validacion.valores.codigo, codigosActivos)
    if (!unicidad.valido) return { tipo: "validacion", errores: [unicidad.error] }

    return await port.crear(cmd.fincaId, validacion.valores)
  }
}
