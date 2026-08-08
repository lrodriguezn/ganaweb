/**
 * Dominio de notificaciones — reglas puras (Issue #214, SAN-051/RN-042).
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
 */
import { describe, expect, it } from "vitest"
import {
  DIAS_ANTICIPACION_DEFAULT,
  TIPOS_NOTIFICACION,
  calcularFechaNotificacionRefuerzo,
  validarPreferenciasNotificacion,
  validarTipoNotificacion,
} from "../src/notificaciones.js"

describe("TipoNotificacion: enum de dominio (SAN-051)", () => {
  it('acepta "refuerzo_vacuna" como único tipo válido en v1', () => {
    const resultado = validarTipoNotificacion("refuerzo_vacuna")
    expect(resultado.valido).toBe(true)
    if (resultado.valido) {
      expect(resultado.valor).toBe("refuerzo_vacuna")
    }
  })

  it("rechaza un tipo vacío con error { campo, detalle }", () => {
    const resultado = validarTipoNotificacion("")
    expect(resultado.valido).toBe(false)
    if (!resultado.valido) {
      expect(resultado.error.campo).toBe("tipo_notificacion")
      expect(resultado.error.detalle.length).toBeGreaterThan(0)
    }
  })

  it("rechaza un tipo no enumerado con error { campo, detalle }", () => {
    const resultado = validarTipoNotificacion("stock_bajo")
    expect(resultado.valido).toBe(false)
    if (!resultado.valido) {
      expect(resultado.error.campo).toBe("tipo_notificacion")
    }
  })

  it("rechaza valores no textuales (number, null, undefined)", () => {
    for (const valor of [42, null, undefined]) {
      const resultado = validarTipoNotificacion(valor)
      expect(resultado.valido).toBe(false)
    }
  })
})

describe("TIPOS_NOTIFICACION: constante del enum", () => {
  it('contiene exactamente ["refuerzo_vacuna"] en v1', () => {
    expect(TIPOS_NOTIFICACION).toEqual(["refuerzo_vacuna"])
  })
})

describe("DIAS_ANTICIPACION_DEFAULT: constante SAN-051", () => {
  it("es 7", () => {
    expect(DIAS_ANTICIPACION_DEFAULT).toBe(7)
  })
})

describe("calcularFechaNotificacionRefuerzo: regla SAN-051/RN-042", () => {
  it("devuelve proximaDosis - diasAnticipacion", () => {
    const resultado = calcularFechaNotificacionRefuerzo("2026-08-15", 7)
    expect(resultado).toBe("2026-08-08")
  })

  it("con diasAnticipacion = 1 devuelve un día antes", () => {
    const resultado = calcularFechaNotificacionRefuerzo("2026-08-15", 1)
    expect(resultado).toBe("2026-08-14")
  })

  it("con diasAnticipacion = 0 devuelve la misma fecha", () => {
    const resultado = calcularFechaNotificacionRefuerzo("2026-08-15", 0)
    expect(resultado).toBe("2026-08-15")
  })

  it("funciona cuando la fecha resultante cruza mes", () => {
    const resultado = calcularFechaNotificacionRefuerzo("2026-09-01", 10)
    expect(resultado).toBe("2026-08-22")
  })
})

describe("validarPreferenciasNotificacion: SAN-051", () => {
  it("acepta preferencias válidas con diasAnticipacion positivo entero", () => {
    const resultado = validarPreferenciasNotificacion({
      usuarioId: "user-1",
      tipo: "refuerzo_vacuna",
      diasAnticipacion: 7,
    })
    expect(resultado.valido).toBe(true)
  })

  it("rechaza diasAnticipacion <= 0 con error { campo, detalle }", () => {
    const resultado = validarPreferenciasNotificacion({
      usuarioId: "user-1",
      tipo: "refuerzo_vacuna",
      diasAnticipacion: 0,
    })
    expect(resultado.valido).toBe(false)
    if (!resultado.valido) {
      expect(resultado.error.campo).toBe("dias_anticipacion")
      expect(resultado.error.detalle.length).toBeGreaterThan(0)
    }
  })

  it("rechaza diasAnticipacion negativo", () => {
    const resultado = validarPreferenciasNotificacion({
      usuarioId: "user-1",
      tipo: "refuerzo_vacuna",
      diasAnticipacion: -3,
    })
    expect(resultado.valido).toBe(false)
  })

  it("rechaza diasAnticipacion no entero", () => {
    const resultado = validarPreferenciasNotificacion({
      usuarioId: "user-1",
      tipo: "refuerzo_vacuna",
      diasAnticipacion: 3.5,
    })
    expect(resultado.valido).toBe(false)
    if (!resultado.valido) {
      expect(resultado.error.campo).toBe("dias_anticipacion")
    }
  })
})
