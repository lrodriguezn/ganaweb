/**
 * Dominio del dashboard Inicio (Issue #214, SAN-070/D-003/SAN-072).
 *
 * Reglas implementadas:
 * - SAN-070: predicado `esAlertaRequiereAccion(item)` — define qué alertas
 *   aparecen en la card "Requiere acción" del Inicio.
 * - SAN-070: `seleccionarAlertasInicio` prioriza peligro sobre alerta, dentro
 *   de peligro: refuerzos vencidos antes que stock agotado, dentro de cada
 *   categoría por fecha ascendente; trunca a `maximo`.
 * - D-003: `placeholderMetricaEnfermos()` devuelve la métrica "Enfermos" como
 *   placeholder (valor 0, sin href) hasta que se defina la transición
 *   sana/enferma.
 *
 * Funciones puras: sin I/O, sin estado global (TS-003). Nombres en español (T-003).
 */

/** Tipo de alerta para la card "Requiere acción" del Inicio. */
export type AlertaAccionInicio = {
  readonly id: string
  readonly texto: string
  readonly severidad: "alerta" | "peligro"
  readonly tipo: "refuerzo" | "stock"
  readonly fechaReferencia: string
}

/** Refuerzo próximo a vencer para el feed de Inicio. */
export type RefuerzoPorVencer = {
  readonly id: string
  readonly texto: string
  readonly tipo: "refuerzo"
  readonly severidad: "alerta" | "peligro"
  readonly fechaReferencia: string
}

/** Producto con stock bajo/agotado para el feed de Inicio. */
export type StockBajoAlerta = {
  readonly id: string
  readonly texto: string
  readonly tipo: "stock"
  readonly severidad: "alerta" | "peligro"
  readonly fechaReferencia: string
}

/** Métrica "Enfermos" del Inicio (D-003: placeholder). */
export type MetricaEnfermos = {
  readonly id: "enfermos"
  readonly label: string
  readonly labelMobile: string
  readonly value: string
  readonly href: string | null
}

/**
 * SAN-070: predicado de alerta que requiere acción.
 * Todas las alertas del feed son accionables — el predicado existe como
 * extensibilidad para futuras alertas informativas.
 */
export function esAlertaRequiereAccion(alerta: AlertaAccionInicio): boolean {
  return alerta.severidad === "peligro" || alerta.severidad === "alerta"
}

/**
 * SAN-070: selección y priorización de alertas del Inicio.
 *
 * Prioridad:
 * 1. Peligro (refuerzos vencidos antes que stock agotado)
 * 2. Alerta (refuerzos por vencer antes que stock bajo)
 * Dentro de cada severidad: fecha ascendente.
 * Truncado a `maximo` (default 5).
 */
export function seleccionarAlertasInicio(datos: {
  readonly refuerzosPorVencer: readonly RefuerzoPorVencer[]
  readonly stockBajo: readonly StockBajoAlerta[]
  readonly maximo?: number
}): readonly AlertaAccionInicio[] {
  const maximo = datos.maximo ?? 5

  const peligros: AlertaAccionInicio[] = []
  const alertas: AlertaAccionInicio[] = []

  for (const refuerzo of datos.refuerzosPorVencer) {
    const alerta: AlertaAccionInicio = { ...refuerzo }
    if (refuerzo.severidad === "peligro") peligros.push(alerta)
    else alertas.push(alerta)
  }

  for (const stock of datos.stockBajo) {
    const alerta: AlertaAccionInicio = { ...stock }
    if (stock.severidad === "peligro") peligros.push(alerta)
    else alertas.push(alerta)
  }

  // Ordenar por fecha ascendente dentro de cada severidad
  peligros.sort((a, b) =>
    a.fechaReferencia < b.fechaReferencia ? -1 : a.fechaReferencia > b.fechaReferencia ? 1 : 0,
  )
  alertas.sort((a, b) =>
    a.fechaReferencia < b.fechaReferencia ? -1 : a.fechaReferencia > b.fechaReferencia ? 1 : 0,
  )

  return [...peligros, ...alertas].slice(0, maximo)
}

/**
 * D-003: placeholder de la métrica "Enfermos" del Inicio.
 * Valor fijo 0, sin navegación (href null) hasta que se defina la
 * transición sana/enferma.
 */
export function placeholderMetricaEnfermos(): MetricaEnfermos {
  return {
    id: "enfermos",
    label: "Enfermos",
    labelMobile: "Enfermos",
    value: "0",
    href: null,
  }
}
