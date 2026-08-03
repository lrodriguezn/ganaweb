import { validarDatosMaestro, validarNombreUnicoMaestro } from "@ganaweb/dominio"
import type { FamiliaMaestro, MaestroEscrituraPort } from "../../puertos/maestro-escritura-port.js"
import type { ResultadoEditarMaestro } from "./resultados.js"

export interface CommandEditarMaestro {
  readonly familia: FamiliaMaestro
  readonly fincaId: string
  readonly id: string
  readonly datos: Readonly<Record<string, unknown>>
}

/**
 * Edita un maestro (issue #147, RF-CONFIG-MAESTROS).
 *
 * SCOPE PRIMERO (CM-024, criterio del issue): si el registro no existe o
 * pertenece a otra finca devuelve `no_encontrado` sin revelar su existencia;
 * sólo después valida (CM-026), verifica el nombre único entre activos
 * (CM-041, excluyendo el propio registro) y persiste con mapeo 1:1
 * (actualizado/conflicto/error).
 *
 * El puerto recibe exactamente las llaves de `valores` normalizados: todos
 * los campos de la especificación (opcionales ausentes → null) y
 * `es_inseminador` SÓLO si venía en `datos` (CM-040) — una vista que no
 * envía el flag preserva el valor almacenado.
 *
 * No verifica permisos: la re-validación RBAC (PE-002, configuracion:editar)
 * la añade la capa de funciones de servidor (issue #148).
 */
export function editarMaestro(port: MaestroEscrituraPort) {
  return async (cmd: CommandEditarMaestro): Promise<ResultadoEditarMaestro> => {
    const registro = await port.obtenerPorId(cmd.familia, cmd.id)
    if (registro === null || registro.fincaId !== cmd.fincaId) {
      return { tipo: "no_encontrado" }
    }

    const validacion = validarDatosMaestro(cmd.familia, cmd.datos)
    if (!validacion.valido) return { tipo: "validacion", errores: validacion.errores }

    const nombresActivos = await port.listarNombresActivos(cmd.familia, cmd.fincaId)
    // `nombre` es requerido en las 11 familias: tras validación válida es string.
    const unicidad = validarNombreUnicoMaestro(
      validacion.valores.nombre as string,
      nombresActivos,
      cmd.id,
    )
    if (!unicidad.valido) return { tipo: "validacion", errores: [unicidad.error] }

    return await port.editar(cmd.familia, cmd.fincaId, cmd.id, validacion.valores)
  }
}
