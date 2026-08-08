/**
 * Dominio del dashboard Inicio — reglas puras (Issue #214, SAN-070/D-003/SAN-072).
 *
 * Reglas implementadas:
 * - SAN-070: predicado `esAlertaRequiereAccion(item)` — refuerzos vencidos =
 *   peligro, refuerzos por vencer ≤ 7 días = alerta, stock agotado = peligro,
 *   stock bajo = alerta.
 * - SAN-070: `seleccionarAlertasInicio({ refuerzosPorVencer, stockBajo, maximo=5 })`
 *   prioriza peligro sobre alerta, dentro de peligro: refuerzos vencidos antes
 *   que stock agotado, dentro de cada categoría por fecha ascendente.
 * - D-003: `placeholderMetricaEnfermos()` devuelve `{ id: "enfermos", label:
 *   "Enfermos", labelMobile: "Enfermos", value: "0", href: null }`.
 *
 * Funciones puras: sin I/O, sin estado global (TS-003). Nombres en español (T-003).
 */
import { describe, expect, it } from "vitest"
import {
  esAlertaRequiereAccion,
  placeholderMetricaEnfermos,
  seleccionarAlertasInicio,
} from "../src/dashboard-inicio.js"
import type {
  AlertaAccionInicio,
  RefuerzoPorVencer,
  StockBajoAlerta,
} from "../src/dashboard-inicio.js"

describe("esAlertaRequiereAccion: predicado SAN-070", () => {
  it("refuerzo vencido es peligro", () => {
    const alerta: AlertaAccionInicio = {
      id: "a1",
      texto: "Refuerzo vencido",
      severidad: "peligro",
      tipo: "refuerzo",
      fechaReferencia: "2026-08-01",
    }
    expect(esAlertaRequiereAccion(alerta)).toBe(true)
  })

  it("refuerzo por vencer ≤ 7 días es alerta", () => {
    const alerta: AlertaAccionInicio = {
      id: "a2",
      texto: "Refuerzo por vencer",
      severidad: "alerta",
      tipo: "refuerzo",
      fechaReferencia: "2026-08-10",
    }
    expect(esAlertaRequiereAccion(alerta)).toBe(true)
  })

  it("stock agotado es peligro", () => {
    const alerta: AlertaAccionInicio = {
      id: "a3",
      texto: "Stock agotado",
      severidad: "peligro",
      tipo: "stock",
      fechaReferencia: "2026-08-05",
    }
    expect(esAlertaRequiereAccion(alerta)).toBe(true)
  })

  it("stock bajo es alerta", () => {
    const alerta: AlertaAccionInicio = {
      id: "a4",
      texto: "Stock bajo",
      severidad: "alerta",
      tipo: "stock",
      fechaReferencia: "2026-08-05",
    }
    expect(esAlertaRequiereAccion(alerta)).toBe(true)
  })
})

describe("seleccionarAlertasInicio: priorización SAN-070", () => {
  it("prioriza peligro sobre alerta", () => {
    const resultado = seleccionarAlertasInicio({
      refuerzosPorVencer: [
        {
          id: "r1",
          texto: "Refuerzo por vencer",
          tipo: "refuerzo",
          severidad: "alerta",
          fechaReferencia: "2026-08-10",
        },
      ],
      stockBajo: [
        {
          id: "s1",
          texto: "Stock agotado",
          tipo: "stock",
          severidad: "peligro",
          fechaReferencia: "2026-08-05",
        },
      ],
      maximo: 5,
    })
    expect(resultado).toHaveLength(2)
    expect(resultado[0]?.severidad).toBe("peligro")
    expect(resultado[1]?.severidad).toBe("alerta")
  })

  it("trunca a maximo=5", () => {
    const refuerzos: RefuerzoPorVencer[] = Array.from({ length: 10 }, (_, i) => ({
      id: `r${i}`,
      texto: `Refuerzo ${i}`,
      tipo: "refuerzo",
      severidad: "alerta" as const,
      fechaReferencia: `2026-08-${String(i + 1).padStart(2, "0")}`,
    }))
    const resultado = seleccionarAlertasInicio({
      refuerzosPorVencer: refuerzos,
      stockBajo: [],
      maximo: 5,
    })
    expect(resultado).toHaveLength(5)
  })

  it("devuelve array vacío cuando no hay alertas", () => {
    const resultado = seleccionarAlertasInicio({
      refuerzosPorVencer: [],
      stockBajo: [],
      maximo: 5,
    })
    expect(resultado).toHaveLength(0)
  })
})

describe("placeholderMetricaEnfermos: D-003", () => {
  it("devuelve valor 0 fijo y href null", () => {
    const metrica = placeholderMetricaEnfermos()
    expect(metrica.id).toBe("enfermos")
    expect(metrica.value).toBe("0")
    expect(metrica.href).toBeNull()
  })
})
