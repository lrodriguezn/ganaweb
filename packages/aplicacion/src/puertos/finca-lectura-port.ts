/**
 * Puerto de lectura de los datos básicos de la finca (issue #151,
 * RF-CONFIG-MAESTROS v1.0, CM-050).
 *
 * La vista de configuración del predio necesita los datos actuales de la
 * finca para precargar el formulario de edición; la escritura ya la cubre
 * `FincaEscrituraPort` (issue #147). Contrato type-only de la capa de
 * aplicación (D6); el adaptador Drizzle vive en `packages/db` sobre la
 * misma infraestructura de la finca (CM-061: extender, no duplicar).
 *
 * Nombres en español (T-003).
 */

/** Datos básicos de la finca tal como los persiste el esquema `fincas`. */
export interface DatosBasicosFinca {
  readonly codigo: string
  readonly nombre: string
  readonly departamento: string | null
  readonly municipio: string | null
  readonly vereda: string | null
  readonly areaHectareas: number | null
  readonly capacidadMaxima: number | null
  readonly tipoExplotacionId: string | null
}

export interface FincaLecturaPort {
  /** Devuelve los datos básicos de la finca, o null si no existe. */
  obtenerDatosBasicos(fincaId: string): Promise<DatosBasicosFinca | null>
}
