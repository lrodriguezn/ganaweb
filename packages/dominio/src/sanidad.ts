/**
 * Reglas puras de dominio del módulo Sanidad (Issue #208, RF-SANIDAD v0.2).
 *
 * Reglas implementadas:
 * - §3 del requisito: enum `tipo_tratamiento` ∈ {reproductivo, no_reproductivo,
 *   vacuna}. El CHECK vive sólo en `schema_v3_corregido.sql`; Drizzle declara
 *   texto plano, así que el dominio es dueño de la validación.
 * - RN-002: fecha de evento nunca futura (excepción única: `proxima_dosis`)
 *   ni anterior a `fecha_nacimiento` / `fecha_compra` del animal cuando están
 *   disponibles en la entrada.
 * - RN-003: todo evento requiere animal EN_FINCA al momento de la fecha del
 *   evento (el estado se evalúa a la fecha del evento, no a la de captura);
 *   captura tardía (evento anterior a la venta/muerte) permitida con
 *   advertencia.
 * - RN-040: `precio_dosis` se guarda como snapshot del catálogo al momento de
 *   aplicar; cambiar el precio después no altera registros existentes.
 * - RN-041: el stock disponible es SIEMPRE calculado
 *   (Σ almacen_entradas.dosis − Σ aplicaciones.dosis), nunca un campo mutable;
 *   puede quedar negativo — alerta de reconciliación, no error (KPI-10).
 * - RN-042: registrar una aplicación auto-completa el refuerzo pendiente del
 *   mismo producto para el mismo animal cuando `proxima_dosis` ≤ fecha de la
 *   nueva aplicación (KPI-09 define "pendiente": sin aplicación posterior).
 * - RN-051: anular un registro grupal anula lógicamente sus filas hijas; las
 *   filas anuladas se excluyen de KPIs y del stock. Sin edición parcial de un
 *   grupo anulado.
 * - RN-052: toda captura acepta 1..N animales; N>1 exige cabecera en
 *   `registros_grupales` con `tipo_evento 'tratamiento'` y
 *   `total_animales` = filas hijas creadas.
 *
 * Forma de error del módulo: `{ campo, detalle }` (SAN-020, §3 del requisito).
 * Fechas como texto ISO YYYY-MM-DD — el tipo DATE del esquema v3 viaja como
 * string y la comparación lexicográfica es correcta para ISO con cero a la
 * izquierda. Funciones puras: sin I/O, sin estado global (TS-003). Nombres en
 * español (T-003).
 */

export type TipoTratamientoSanidad = "reproductivo" | "no_reproductivo" | "vacuna"

export const TIPOS_TRATAMIENTO_SANIDAD: readonly TipoTratamientoSanidad[] = [
  "reproductivo",
  "no_reproductivo",
  "vacuna",
]

export type ErrorValidacionSanidad = {
  readonly campo: string
  readonly detalle: string
}

export type EstadoAnimalEventoSanidad = "en_finca" | "vendido" | "muerto"

export type EstadoStockSanidad = "agotado" | "bajo" | "ok"

/** Fila de `aplicaciones_sanitarias` por crear (sin id: lo asigna el adaptador). */
export type AplicacionSanitariaNueva = {
  readonly animalId: string
  readonly productoId: string
  readonly fecha: string
  readonly dosis: number
  /** RN-040: snapshot del precio de catálogo al momento de aplicar. */
  readonly precioDosis: number | null
  readonly proximaDosis: string | null
  readonly comentarios: string | null
  /** RN-052: null = registro individual; con valor = fila de operación grupal. */
  readonly registroGrupalId: string | null
}

/** Aplicación existente del mismo producto/animal usada por el motor RN-042. */
export type AplicacionPreviaSanidad = {
  readonly id: string
  readonly animalId: string
  readonly fecha: string
  readonly proximaDosis: string | null
}

function error(campo: string, detalle: string): ErrorValidacionSanidad {
  return { campo, detalle }
}

const REGEX_FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/

/**
 * Guarda de formato ISO YYYY-MM-DD con verificación de fecha real (rechaza
 * mes 13 o día 32). `proxima_dosis` y las fechas de evento usan este formato.
 */
export function esFechaIso(fecha: string): boolean {
  if (!REGEX_FECHA_ISO.test(fecha)) return false
  const dia = Number(fecha.slice(8, 10))
  const mes = Number(fecha.slice(5, 7))
  const fechaReconstruida = new Date(Date.UTC(Number(fecha.slice(0, 4)), mes - 1, dia))
  return (
    fechaReconstruida.getUTCFullYear() === Number(fecha.slice(0, 4)) &&
    fechaReconstruida.getUTCMonth() === mes - 1 &&
    fechaReconstruida.getUTCDate() === dia
  )
}

/**
 * §3 del requisito: valida el enum `tipo_tratamiento`. El CHECK existe sólo en
 * schema_v3; en Drizzle la columna es texto plano, así que el dominio valida.
 */
export function validarTipoTratamiento(
  valor: unknown,
):
  | { readonly valido: true; readonly valor: TipoTratamientoSanidad }
  | { readonly valido: false; readonly error: ErrorValidacionSanidad } {
  if (
    typeof valor === "string" &&
    (TIPOS_TRATAMIENTO_SANIDAD as readonly string[]).includes(valor)
  ) {
    return { valido: true, valor: valor as TipoTratamientoSanidad }
  }
  return {
    valido: false,
    error: error(
      "tipo_tratamiento",
      "El tipo de tratamiento debe ser uno de: reproductivo, no_reproductivo, vacuna.",
    ),
  }
}

/**
 * RN-002: fechas de evento sanitarias.
 *
 * - Nunca futuras (excepción única del módulo: `proxima_dosis`, que NO pasa
 *   por esta función).
 * - Nunca anteriores a `fecha_nacimiento` ni a `fecha_compra` del animal,
 *   cuando esas fechas están disponibles en la entrada (null/ausente = no
 *   aplica).
 *
 * Devuelve TODOS los errores encontrados (no corta en el primero), para que la
 * UI pueda mostrarlos de una sola pasada.
 */
export function validarFechaEventoSanidad(datos: {
  readonly fecha: string
  readonly hoy: string
  readonly fechaNacimiento?: string | null
  readonly fechaCompra?: string | null
}): readonly ErrorValidacionSanidad[] {
  const errores: ErrorValidacionSanidad[] = []

  if (!esFechaIso(datos.fecha)) {
    errores.push(error("fecha", "La fecha debe tener formato ISO (AAAA-MM-DD)."))
    return errores
  }

  if (datos.fecha > datos.hoy) {
    errores.push(error("fecha", "La fecha del evento no puede ser futura (RN-002)."))
  }
  if (
    datos.fechaNacimiento !== null &&
    datos.fechaNacimiento !== undefined &&
    datos.fecha < datos.fechaNacimiento
  ) {
    errores.push(
      error(
        "fecha",
        "La fecha del evento no puede ser anterior a la fecha de nacimiento del animal.",
      ),
    )
  }
  if (
    datos.fechaCompra !== null &&
    datos.fechaCompra !== undefined &&
    datos.fecha < datos.fechaCompra
  ) {
    errores.push(
      error("fecha", "La fecha del evento no puede ser anterior a la fecha de compra del animal."),
    )
  }
  return errores
}

/**
 * RN-003: el animal debe estar EN_FINCA al momento de la fecha del evento.
 *
 * El estado se evalúa a la fecha del evento, no a la fecha de captura: un
 * registro tardío de cuando el animal aún estaba se acepta con advertencia
 * (`capturaTardia`). Si el animal ya salió (vendido/muerto) y la fecha del
 * evento es posterior o igual a la salida, se rechaza. Sin fecha de salida
 * conocida para un animal salido, no se puede probar EN_FINCA: se rechaza.
 */
export function evaluarAnimalEnFinca(datos: {
  readonly fechaEvento: string
  readonly estadoActual: EstadoAnimalEventoSanidad
  readonly fechaSalida: string | null
}):
  | { readonly valido: true; readonly capturaTardia: boolean }
  | { readonly valido: false; readonly error: ErrorValidacionSanidad } {
  if (datos.estadoActual === "en_finca") {
    return { valido: true, capturaTardia: false }
  }
  if (datos.fechaSalida === null) {
    return {
      valido: false,
      error: error(
        "animal",
        "El animal no está en la finca y no se puede verificar la fecha de salida (RN-003).",
      ),
    }
  }
  if (datos.fechaEvento < datos.fechaSalida) {
    return { valido: true, capturaTardia: true }
  }
  return {
    valido: false,
    error: error("animal", "El animal no estaba en la finca en la fecha del evento (RN-003)."),
  }
}

/**
 * RN-040 + RN-052: construye las filas de `aplicaciones_sanitarias` de una
 * captura (1 fila por animal, datos comunes al grupo).
 *
 * `precioDosis` queda congelado en cada fila con el precio del catálogo al
 * momento de aplicar (RN-040): mutar el producto después no altera lo
 * construido. El id lo asigna el adaptador de persistencia.
 */
export function construirAplicacionesSanitarias(datos: {
  readonly producto: { readonly id: string; readonly precioDosis: number | null }
  readonly animalIds: readonly string[]
  readonly fecha: string
  readonly dosis: number
  readonly proximaDosis: string | null
  readonly comentarios: string | null
  readonly registroGrupalId: string | null
}): readonly AplicacionSanitariaNueva[] {
  const snapshot = datos.producto.precioDosis
  return datos.animalIds.map((animalId) => ({
    animalId,
    productoId: datos.producto.id,
    fecha: datos.fecha,
    dosis: datos.dosis,
    precioDosis: snapshot,
    proximaDosis: datos.proximaDosis,
    comentarios: datos.comentarios,
    registroGrupalId: datos.registroGrupalId,
  }))
}

/**
 * SAN-030 (Issue #210): captura cruda de una entrada de almacén antes de
 * validar. `productoId` null/vacío modela el producto ausente del formulario.
 */
export type CapturaEntradaAlmacen = {
  readonly productoId: string | null
  /** ISO YYYY-MM-DD; nunca futura (RN-002). */
  readonly fecha: string
  /** Entero > 0 (SAN-030; la columna `almacen_entradas.dosis` es INTEGER). */
  readonly dosis: number
  readonly precioPorDosis?: number | null
  readonly comentario?: string | null
}

/**
 * SAN-030 + RN-002 (Issue #210): valida la captura de una entrada de almacén.
 *
 * - `producto` obligatorio (SAN-030).
 * - `fecha` nunca futura y en formato ISO (RN-002; reutiliza
 *   `validarFechaEventoSanidad` — sin fechas de animal, que no aplican).
 * - `dosis` entero > 0 (SAN-030).
 * - `precio_por_dosis` y `comentario` opcionales; el precio, si está
 *   presente, debe ser un número finito.
 *
 * Append-only (SAN-032/D-008): la validación cubre únicamente la creación;
 * no existe edición ni anulación de entradas en v1. Devuelve TODOS los
 * errores de una sola pasada, con forma `{ campo, detalle }`.
 */
export function validarEntradaAlmacen(datos: {
  readonly captura: CapturaEntradaAlmacen
  readonly hoy: string
}): readonly ErrorValidacionSanidad[] {
  const errores: ErrorValidacionSanidad[] = []
  const captura = datos.captura

  if (captura.productoId === null || captura.productoId.trim() === "") {
    errores.push(error("producto", "La entrada requiere un producto sanitario (SAN-030)."))
  }

  for (const errorFecha of validarFechaEventoSanidad({ fecha: captura.fecha, hoy: datos.hoy })) {
    errores.push(errorFecha)
  }

  if (!Number.isInteger(captura.dosis) || captura.dosis <= 0) {
    errores.push(error("dosis", "La dosis debe ser un entero mayor que 0 (SAN-030)."))
  }

  if (
    captura.precioPorDosis !== null &&
    captura.precioPorDosis !== undefined &&
    !Number.isFinite(captura.precioPorDosis)
  ) {
    errores.push(error("precio_por_dosis", "El precio por dosis debe ser un número."))
  }

  return errores
}

/**
 * RN-041 + RN-051: stock disponible SIEMPRE calculado:
 * Σ entradas.dosis − Σ aplicaciones.dosis. Las aplicaciones anuladas
 * (grupo anulado, RN-051) se excluyen de la resta. El resultado puede ser
 * negativo: alerta de reconciliación, nunca error.
 */
export function calcularStockDisponible(
  entradas: readonly { readonly dosis: number }[],
  aplicaciones: readonly { readonly dosis: number; readonly anulada?: boolean }[],
): number {
  const totalEntradas = entradas.reduce((acumulado, entrada) => acumulado + entrada.dosis, 0)
  const totalAplicado = aplicaciones.reduce(
    (acumulado, aplicacion) => (aplicacion.anulada ? acumulado : acumulado + aplicacion.dosis),
    0,
  )
  return totalEntradas - totalAplicado
}

/** RN-041: stock negativo = alerta de reconciliación (no bloquea el registro). */
export function esAlertaReconciliacionStock(stockDisponible: number): boolean {
  return stockDisponible < 0
}

/**
 * KPI-10: semáforo de stock. El umbral `stockMinimoDosis` viene de
 * `config_parametros_finca` (T-001: ningún umbral hardcodeado).
 * agotado ≤ 0 · bajo < umbral · ok.
 */
export function estadoStockSanidad(
  stockDisponible: number,
  stockMinimoDosis: number,
): EstadoStockSanidad {
  if (stockDisponible <= 0) return "agotado"
  if (stockDisponible < stockMinimoDosis) return "bajo"
  return "ok"
}

/**
 * RN-042: refuerzos que la nueva aplicación auto-completa.
 *
 * Un refuerzo está pendiente cuando su aplicación no tiene aplicación
 * posterior del mismo producto para el mismo animal (definición KPI-09); por
 * eso sólo la última aplicación por animal puede estar pendiente. Se
 * auto-completa cuando `proxima_dosis` ≤ fecha de la nueva aplicación
 * (SAN-046). Devuelve los ids de las aplicaciones cuyo refuerzo queda
 * completado — el efecto de calendario es derivado: con aplicación posterior,
 * el refuerzo ya no aparece en KPI-09.
 */
export function refuerzosAutoCompletados(
  previas: readonly AplicacionPreviaSanidad[],
  fechaNuevaAplicacion: string,
): readonly string[] {
  const ultimaPorAnimal = new Map<string, AplicacionPreviaSanidad>()
  for (const previa of previas) {
    const actual = ultimaPorAnimal.get(previa.animalId)
    if (actual === undefined || previa.fecha >= actual.fecha) {
      ultimaPorAnimal.set(previa.animalId, previa)
    }
  }

  const autoCompletados: string[] = []
  for (const previa of ultimaPorAnimal.values()) {
    if (previa.proximaDosis !== null && previa.proximaDosis <= fechaNuevaAplicacion) {
      autoCompletados.push(previa.id)
    }
  }
  return autoCompletados
}

/** RN-052: la captura exige al menos 1 animal y la cantidad debe ser entera. */
export function validarCantidadAnimalesSanidad(
  cantidad: number,
): { readonly valido: true } | { readonly valido: false; readonly error: ErrorValidacionSanidad } {
  if (!Number.isInteger(cantidad) || cantidad < 1) {
    return {
      valido: false,
      error: error("animales", "La captura debe incluir al menos un animal (RN-052)."),
    }
  }
  return { valido: true }
}

/**
 * RN-052: planificación de la cabecera grupal. N>1 exige cabecera en
 * `registros_grupales` con `tipo_evento 'tratamiento'` y
 * `total_animales` = filas hijas.
 */
export function planificarRegistroGrupal(cantidadAnimales: number): {
  readonly requiereCabecera: boolean
  readonly tipoEvento: "tratamiento"
  readonly totalAnimales: number
} {
  return {
    requiereCabecera: cantidadAnimales > 1,
    tipoEvento: "tratamiento",
    totalAnimales: cantidadAnimales,
  }
}

/** RN-052: invariante de la cabecera — total_animales = filas hijas creadas. */
export function validarCabeceraRegistroGrupal(datos: {
  readonly totalAnimales: number
  readonly filasHijas: number
}): { readonly valido: true } | { readonly valido: false; readonly error: ErrorValidacionSanidad } {
  if (datos.totalAnimales !== datos.filasHijas) {
    return {
      valido: false,
      error: error(
        "total_animales",
        "El total de animales de la cabecera debe ser igual a las filas hijas creadas (RN-052).",
      ),
    }
  }
  return { valido: true }
}

/**
 * RN-051: guarda de anulación de un registro grupal. No existe el borrado ni
 * la edición parcial de un grupo anulado; anular dos veces se rechaza.
 */
export function validarAnulacionRegistroGrupal(
  registro: { readonly anuladoEn: string | null } | null,
):
  | { readonly valido: true }
  | {
      readonly valido: false
      readonly motivo: "no_encontrado" | "ya_anulado"
      readonly error: ErrorValidacionSanidad
    } {
  if (registro === null) {
    return {
      valido: false,
      motivo: "no_encontrado",
      error: error("registro_grupal", "El registro grupal no existe."),
    }
  }
  if (registro.anuladoEn !== null) {
    return {
      valido: false,
      motivo: "ya_anulado",
      error: error("registro_grupal", "El registro grupal ya está anulado (RN-051)."),
    }
  }
  return { valido: true }
}
