import { validarDatosMaestro, validarNombreUnicoMaestro } from "@ganaweb/dominio"
import type {
  DatosMaestroNormalizados,
  FamiliaMaestro,
  MaestroEscrituraPort,
} from "../../puertos/maestro-escritura-port.js"
import type { ResultadoCrearMaestro } from "./resultados.js"

export interface CommandCrearMaestro {
  readonly familia: FamiliaMaestro
  readonly fincaId: string
  readonly datos: Readonly<Record<string, unknown>>
  /** CM-040: "inseminadores" fuerza es_inseminador=1 (sólo con familia "veterinarios"). */
  readonly origen?: "veterinarios" | "inseminadores"
}

/**
 * Crea un maestro de cualquier familia (issue #147, RF-CONFIG-MAESTROS).
 *
 * Flujo:
 * 1. Validación de dominio (CM-026) → `validacion` con los errores 1:1.
 * 2. CM-040: con `origen` "inseminadores" y familia "veterinarios" fuerza
 *    `es_inseminador = 1` (sobrescribe el recibido); con otra familia es un
 *    uso interno incorrecto y devuelve `error`.
 * 3. Nombre único entre registros activos de la finca (R-D1/CM-041).
 * 4. Persistencia, mapeando el resultado del puerto 1:1
 *    (creado/conflicto/error).
 *
 * No verifica permisos: la re-validación RBAC (PE-002, configuracion:crear)
 * la añade la capa de funciones de servidor (issue #148).
 */
export function crearMaestro(port: MaestroEscrituraPort) {
  return async (cmd: CommandCrearMaestro): Promise<ResultadoCrearMaestro> => {
    const validacion = validarDatosMaestro(cmd.familia, cmd.datos)
    if (!validacion.valido) return { tipo: "validacion", errores: validacion.errores }

    let valores: DatosMaestroNormalizados = validacion.valores
    if (cmd.origen === "inseminadores") {
      if (cmd.familia !== "veterinarios") {
        return {
          tipo: "error",
          detalle: "El origen inseminadores sólo aplica a la familia veterinarios.",
        }
      }
      valores = { ...valores, es_inseminador: 1 }
    }

    const nombresActivos = await port.listarNombresActivos(cmd.familia, cmd.fincaId)
    // `nombre` es requerido en las 11 familias: tras validación válida es string.
    const unicidad = validarNombreUnicoMaestro(valores.nombre as string, nombresActivos)
    if (!unicidad.valido) return { tipo: "validacion", errores: [unicidad.error] }

    return await port.crear(cmd.familia, cmd.fincaId, valores)
  }
}
