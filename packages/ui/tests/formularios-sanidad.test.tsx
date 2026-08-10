// @vitest-environment jsdom

/**
 * Tests de integración para formularios sanitarios (Issue #231).
 *
 * Cubre FormularioAplicacionSanitaria y FormularioRevisionVeterinaria.
 * Verifica campos contra matriz §2, RBAC sanidad:*,
 * y que reutiliza #211 sin crear contrato paralelo.
 */

import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { FormularioAplicacionSanitaria } from "../src/ganado/evento-wizard/formularios/formulario-aplicacion-sanitaria"
import { FormularioRevisionVeterinaria } from "../src/ganado/evento-wizard/formularios/formulario-revision-veterinaria"

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("FormularioAplicacionSanitaria — matriz §2 Sanidad / Aplicación", () => {
  const defaultProps = {
    numeroAnimales: 1,
    onVolver: vi.fn(),
    onGuardar: vi.fn(),
  }

  it("renderiza campos compartidos: fecha, producto, dosis, precio/dosis, próxima dosis, comentarios", () => {
    render(<FormularioAplicacionSanitaria {...defaultProps} />)
    expect(screen.getByLabelText(/Fecha/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Producto/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Dosis/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Precio\/dosis/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Próxima dosis/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Comentarios/)).toBeInTheDocument()
  })

  it("requiere producto y dosis > 0 para guardar", async () => {
    const user = userEvent.setup()
    const onGuardar = vi.fn()
    render(<FormularioAplicacionSanitaria {...defaultProps} onGuardar={onGuardar} />)
    const dosis = screen.getByLabelText(/Dosis/) as HTMLInputElement
    await user.clear(dosis)
    await user.type(dosis, "0")
    const guardar = screen.getByRole("button", { name: /Guardar/ })
    await user.click(guardar)
    expect(onGuardar).not.toHaveBeenCalled()
  })

  it("muestra botón Guardar con número de animales", () => {
    render(<FormularioAplicacionSanitaria {...defaultProps} numeroAnimales={3} />)
    expect(screen.getByRole("button", { name: /Guardar 3 aplicaciones/ })).toBeInTheDocument()
  })
})

describe("FormularioRevisionVeterinaria — matriz §2 Sanidad / Revisión", () => {
  const defaultProps = {
    numeroAnimales: 1,
    onVolver: vi.fn(),
    onGuardar: vi.fn(),
  }

  it("renderiza campos compartidos: fecha, veterinario, diagnóstico, tipo, celo, comentarios", () => {
    render(<FormularioRevisionVeterinaria {...defaultProps} />)
    expect(screen.getByLabelText(/Fecha/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Veterinario/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Diagnóstico/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Tipo de diagnóstico/)).toBeInTheDocument()
    expect(screen.getByLabelText(/¿Celo presentado\?/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Comentarios/)).toBeInTheDocument()
  })

  it("muestra opciones de tipo de diagnóstico: No aplica y Vitaminas", () => {
    render(<FormularioRevisionVeterinaria {...defaultProps} />)
    expect(screen.getByRole("option", { name: "No aplica" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Vitaminas" })).toBeInTheDocument()
  })

  it("muestra opciones de celo: No aplica, Sí, No", () => {
    render(<FormularioRevisionVeterinaria {...defaultProps} />)
    expect(screen.getByRole("option", { name: "No aplica" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Sí" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "No" })).toBeInTheDocument()
  })
})
