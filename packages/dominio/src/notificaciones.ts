/**
 * Dominio de notificaciones (Issue #214, SAN-051/RN-042).
 *
 * Reglas implementadas:
 * - SAN-051: `TipoNotificacion = "refuerzo_vacuna"` es el único tipo válido en v1;
 *   tipo vacío/no enumerado rechazado con `{ campo, detalle }`.
 * - SAN-051: `calcularFechaNotificacionRefuerzo(proximaDosis, diasAnticipacion)`
 *   devuelve `proximaDosis - diasAnticipacion` (regla SAN-051/RN-042).
 * - SAN-051: `DIAS_ANTICIPACION_DEFAULT = 7` constante.
 * - SAN-051: `validarPreferenciasNotificacion({ usuarioId, tipo, diasAnticipacion })`
 *   rechaza `diasAnticipacion <= 0` o no entero con error `{ campo, detalle }`.
 *
 * Funciones puras: sin I/O, sin estado global (TS-003). Nombres en español (T-003).
 * Fechas como texto ISO YYYY-MM-DD — la aritmética usa UTC para consistencia
 * con `sumarDiasAFechaIso` de `sanidad.ts`.
 */

export type TipoNotificacion = "refuerzo_vacuna"

export const TIPOS_NOTIFICACION: readonly TipoNotificacion[] = ["refuerzo_vacuna"]

/** Días de anticipación por defecto para notificaciones de refuerzo (SAN-051). */
export const DIAS_ANTICIPACION_DEFAULT = 7

export type ErrorValidacionNotificacion = {
  readonly campo: string
  readonly detalle: string
}

const MS_POR_DIA = 86_400_000

function error(campo: string, detalle: string): ErrorValidacionNotificacion {
  return { campo, detalle }
}

/**
 * SAN-051: valida el enum `TipoNotificacion`. En v1 sólo existe
 * `"refuerzo_vacuna"`.
 */
export function validarTipoNotificacion(
  valor: unknown,
):
  | { readonly valido: true; readonly valor: TipoNotificacion }
  | { readonly valido: false; readonly error: ErrorValidacionNotificacion } {
  if (typeof valor === "string" && (TIPOS_NOTIFICACION as readonly string[]).includes(valor)) {
    return { valido: true, valor: valor as TipoNotificacion }
  }
  return {
    valido: false,
    error: error("tipo_notificacion", "El tipo de notificación debe ser uno de: refuerzo_vacuna."),
  }
}

/**
 * SAN-051/RN-042: calcula la fecha en que se debe enviar la notificación
 * de refuerzo. La notificación se envía `diasAnticipacion` días antes de
 * `proximaDosis`.
 *
 * Aritmética ISO UTC consistente con `sumarDiasAFechaIso` de `sanidad.ts`.
 */
export function calcularFechaNotificacionRefuerzo(
  proximaDosis: string,
  diasAnticipacion: number,
): string {
  const base = Date.UTC(
    Number(proximaDosis.slice(0, 4)),
    Number(proximaDosis.slice(5, 7)) - 1,
    Number(proximaDosis.slice(8, 10)),
  )
  const resultado = new Date(base - diasAnticipacion * MS_POR_DIA)
  return resultado.toISOString().slice(0, 10)
}

/**
 * SAN-051: valida las preferencias de notificación de un usuario.
 * Rechaza `diasAnticipacion <= 0` o no entero con error `{ campo, detalle }`.
 */
export function validarPreferenciasNotificacion(datos: {
  readonly usuarioId: string
  readonly tipo: TipoNotificacion
  readonly diasAnticipacion: number
}):
  | { readonly valido: true }
  | { readonly valido: false; readonly error: ErrorValidacionNotificacion } {
  if (!Number.isInteger(datos.diasAnticipacion) || datos.diasAnticipacion <= 0) {
    return {
      valido: false,
      error: error(
        "dias_anticipacion",
        "Los días de anticipación deben ser un entero mayor que 0.",
      ),
    }
  }
  return { valido: true }
}
