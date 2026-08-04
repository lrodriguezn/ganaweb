/**
 * redesign-ficha-animal (slice 2) — derivaciones puras de la ficha animal.
 *
 * D4: la lógica de dominio vive aquí (funciones puras, TDD). La fuente de
 * verdad reproductiva es la secuencia de eventos (TR-010/TR-014): el cache
 * `categoria_reproductiva` de `animales` nunca es entrada de estas
 * derivaciones. TR-013: machos y pajuelas no tienen resumen reproductivo.
 *
 * El reloj se inyecta (`hoy: Date`) para mantener el determinismo
 * (`RelojDelSistemaPort`). Todas las fechas de eventos son ISO `YYYY-MM-DD`.
 */

import type { Sexo } from "./animal.js"

export interface PesajeFicha {
  readonly fecha: string // ISO YYYY-MM-DD
  readonly pesoKg: number
}

export interface ServicioEventoFicha {
  readonly fecha: string // ISO YYYY-MM-DD
  readonly tipo: string
  /** RN-013: palpación prenada marca el servicio como efectivo. */
  readonly efectivo: boolean | null
}

export interface PalpacionEventoFicha {
  readonly fecha: string // ISO YYYY-MM-DD
  readonly resultado: string | null
  readonly diasGestacion: number | null
}

export interface PartoEventoFicha {
  readonly fecha: string // ISO YYYY-MM-DD
  readonly tipoParto: string
}

export interface ResumenReproductivoFicha {
  readonly ultimoServicio: { readonly fecha: string; readonly detalle: string | null } | null
  readonly ultimaPalpacion: { readonly fecha: string; readonly resultado: string | null } | null
  readonly gestacionDias: number | null
  readonly partos: { readonly total: number; readonly ultimaFecha: string | null } | null
  /** KPI-03: intervalo entre los dos últimos partos no-aborto. */
  readonly iepDias: number | null
  /** KPI-04: días desde el último parto hasta la concepción (u hoy). */
  readonly diasAbiertos: number | null
}

const MS_POR_DIA = 86_400_000

function parseFechaIso(fecha: string): number {
  const [anio = 1970, mes = 1, dia = 1] = fecha.split("-").map(Number)
  return Date.UTC(anio, mes - 1, dia)
}

/** Días calendario (UTC) entre dos fechas ISO; `desde` > `hasta` → negativo. */
function diasEntre(desde: string, hasta: string): number {
  return Math.round((parseFechaIso(hasta) - parseFechaIso(desde)) / MS_POR_DIA)
}

function fechaIsoUtc(fecha: Date): string {
  return fecha.toISOString().slice(0, 10)
}

function ordenarPorFechaAsc<T extends { readonly fecha: string }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => parseFechaIso(a.fecha) - parseFechaIso(b.fecha))
}

/**
 * Edad en meses cumplidos desde `fechaNacimiento` (epoch seconds UTC) hasta
 * `hoy`. Sin fecha de nacimiento la edad está ausente — nunca se fabrica.
 */
export function calcularEdadMeses(
  fechaNacimiento: number | null | undefined,
  hoy: Date,
): number | null {
  if (fechaNacimiento == null) return null
  const nacimiento = new Date(fechaNacimiento * 1000)
  let meses =
    (hoy.getUTCFullYear() - nacimiento.getUTCFullYear()) * 12 +
    (hoy.getUTCMonth() - nacimiento.getUTCMonth())
  if (hoy.getUTCDate() < nacimiento.getUTCDate()) meses -= 1
  return meses > 0 ? meses : 0
}

/**
 * Ganancia diaria de peso (kg/día) entre el último pesaje y el anterior.
 * Con un único pesaje (o intervalo no positivo) no hay GDP — null.
 */
export function calcularGdp(
  ultimo: PesajeFicha | null,
  anterior: PesajeFicha | null,
): number | null {
  if (!ultimo || !anterior) return null
  const dias = diasEntre(anterior.fecha, ultimo.fecha)
  if (dias <= 0) return null
  return Math.round(((ultimo.pesoKg - anterior.pesoKg) / dias) * 100) / 100
}

/**
 * Resumen reproductivo derivado exclusivamente de la secuencia de eventos
 * (TR-014). TR-013: machos y pajuelas devuelven `null` (resumen vacío).
 *
 * - `gestacionDias`: días registrados en la última palpación prenada,
 *   proyectados a `hoy`; ausente si la última palpación no es prenada o si
 *   no registró días (nunca se fabrica).
 * - `iepDias` (KPI-03): días entre los dos últimos partos excluyendo
 *   `aborto` en el par.
 * - `diasAbiertos` (KPI-04): concepción = primer servicio `efectivo=TRUE`
 *   posterior al último parto; sin concepción se cuenta hasta `hoy`.
 */
export function derivarResumenReproductivo(entrada: {
  readonly sexo: Sexo
  readonly servicios: readonly ServicioEventoFicha[]
  readonly palpaciones: readonly PalpacionEventoFicha[]
  readonly partos: readonly PartoEventoFicha[]
  readonly hoy: Date
}): ResumenReproductivoFicha | null {
  if (entrada.sexo !== "hembra") return null

  const hoyIso = fechaIsoUtc(entrada.hoy)
  const servicios = ordenarPorFechaAsc(entrada.servicios)
  const palpaciones = ordenarPorFechaAsc(entrada.palpaciones)
  const partos = ordenarPorFechaAsc(entrada.partos)

  const ultimoServicio = servicios.at(-1)
  const ultimaPalpacion = palpaciones.at(-1)
  const ultimoParto = partos.at(-1)

  let gestacionDias: number | null = null
  if (ultimaPalpacion?.resultado === "prenada" && ultimaPalpacion.diasGestacion != null) {
    const transcurridos = Math.max(0, diasEntre(ultimaPalpacion.fecha, hoyIso))
    gestacionDias = ultimaPalpacion.diasGestacion + transcurridos
  }

  const partosNoAborto = partos.filter((parto) => parto.tipoParto !== "aborto")
  const penultimoParto = partosNoAborto.at(-2)
  const ultimoPartoNoAborto = partosNoAborto.at(-1)
  const iepDias =
    penultimoParto && ultimoPartoNoAborto
      ? diasEntre(penultimoParto.fecha, ultimoPartoNoAborto.fecha)
      : null

  let diasAbiertos: number | null = null
  if (ultimoParto) {
    const concepcion = servicios.find(
      (servicio) =>
        servicio.efectivo === true &&
        parseFechaIso(servicio.fecha) > parseFechaIso(ultimoParto.fecha),
    )
    const hasta = concepcion ? concepcion.fecha : hoyIso
    diasAbiertos = Math.max(0, diasEntre(ultimoParto.fecha, hasta))
  }

  return {
    ultimoServicio: ultimoServicio
      ? { fecha: ultimoServicio.fecha, detalle: ultimoServicio.tipo }
      : null,
    ultimaPalpacion: ultimaPalpacion
      ? { fecha: ultimaPalpacion.fecha, resultado: ultimaPalpacion.resultado }
      : null,
    gestacionDias,
    partos: ultimoParto ? { total: partos.length, ultimaFecha: ultimoParto.fecha } : null,
    iepDias,
    diasAbiertos,
  }
}
