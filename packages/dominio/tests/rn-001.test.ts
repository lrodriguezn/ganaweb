/**
 * RN-001 — código único por finca
 *
 * Regla de negocio: dentro de una misma finca no puede existir más de un
 * animal con el mismo `codigo`. La regla se enuncia en el spec
 * `openspec/changes/scaffold-monorepo/specs/domain-animal.md` (Req 3) y el
 * diseño fija el contrato de la función pura en D4 (tagged union) y T-003
 * (nombres de dominio en español).
 *
 * Este archivo se commitea ANTES de la implementación (TDD-RED). Vitest debe
 * reportar fallo de resolución del módulo `../src/rn-001.js` hasta que PR2.T2
 * cree `src/rn-001.ts` con la función `validarCodigoUnicoPorFinca`.
 */
import { describe, expect, it } from "vitest"
import type { ResultadoValidacion } from "../src/rn-001.js"
import { validarCodigoUnicoPorFinca } from "../src/rn-001.js"

describe("RN-001: código único por finca", () => {
  it("rechaza un código duplicado dentro de la misma finca citando RN-001", () => {
    const animalesExistentes = [
      { fincaId: "finca-esperanza", codigo: "A001" },
      { fincaId: "finca-esperanza", codigo: "A002" },
    ]

    const resultado: ResultadoValidacion = validarCodigoUnicoPorFinca(
      "A001",
      "finca-esperanza",
      animalesExistentes,
    )

    expect(resultado.valido).toBe(false)
    if (!resultado.valido) {
      expect(resultado.regla).toBe("RN-001")
      expect(resultado.detalle.length).toBeGreaterThan(0)
    }
  })

  it("permite el mismo código cuando pertenece a una finca distinta", () => {
    const animalesExistentes = [{ fincaId: "finca-esperanza", codigo: "A001" }]

    const resultado = validarCodigoUnicoPorFinca("A001", "finca-roble", animalesExistentes)

    expect(resultado).toEqual({ valido: true })
  })

  it("acepta cualquier código no vacío cuando la lista de animales está vacía", () => {
    const resultado = validarCodigoUnicoPorFinca("A001", "finca-esperanza", [])

    expect(resultado).toEqual({ valido: true })
  })

  it("rechaza código vacío como guarda de entrada (detalle distinto al de duplicado)", () => {
    const resultado = validarCodigoUnicoPorFinca("", "finca-esperanza", [])

    expect(resultado.valido).toBe(false)
    if (!resultado.valido) {
      // La guarda de entrada NO es una violación de unicidad: el detalle debe
      // ser un mensaje útil, no uno de duplicado.
      expect(resultado.regla).toBe("RN-001")
      expect(resultado.detalle.length).toBeGreaterThan(0)
    }
  })

  it("rechaza código con solo espacios en blanco como guarda de entrada", () => {
    const resultado = validarCodigoUnicoPorFinca("   \t\n", "finca-esperanza", [])

    expect(resultado.valido).toBe(false)
    if (!resultado.valido) {
      expect(resultado.detalle.length).toBeGreaterThan(0)
    }
  })

  it("normaliza espacios al validar: ignora espacios al inicio y al final del código", () => {
    const animalesExistentes = [{ fincaId: "finca-esperanza", codigo: "A001" }]

    const resultado = validarCodigoUnicoPorFinca("  A001  ", "finca-esperanza", animalesExistentes)

    expect(resultado.valido).toBe(false)
    if (!resultado.valido) {
      expect(resultado.regla).toBe("RN-001")
    }
  })
})
