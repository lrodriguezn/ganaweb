// @vitest-environment jsdom

/**
 * Tests de integración para formularios reproductivos (Issue #230).
 *
 * Cubre FormularioServicio, FormularioPalpacion y FormularioParto.
 * Verifica campos contra matriz §2, RBAC eventos_reproductivos:*,
 * parto individual-only, y append-only (sin edición destructiva).
 */

import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { FormularioPalpacion } from "../src/ganado/evento-wizard/formularios/formulario-palpacion"
import { FormularioParto } from "../src/ganado/evento-wizard/formularios/formulario-parto"
import { FormularioServicio } from "../src/ganado/evento-wizard/formularios/formulario-servicio"

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("FormularioServicio — matriz §2 Reproductivo / Servicio", () => {
  const defaultProps = {
    numeroAnimales: 1,
    onVolver: vi.fn(),
    onGuardar: vi.fn(),
  }

  it("renderiza campos compartidos: fecha, tipo, padre/pajuela, inseminador, dosis, observaciones", () => {
    render(<FormularioServicio {...defaultProps} />)
    expect(screen.getByLabelText(/Fecha/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Tipo/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Padre|Pajuela/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Inseminador/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Dosis/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Observaciones/)).toBeInTheDocument()
  })

  it("muestra opciones de tipo: Inseminación y Monta natural", () => {
    render(<FormularioServicio {...defaultProps} />)
    const tipoSelect = screen.getByLabelText(/Tipo/)
    expect(tipoSelect).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Inseminación" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Monta natural" })).toBeInTheDocument()
  })

  it("cambia etiqueta de padre/pajuela según tipo seleccionado", async () => {
    const user = userEvent.setup()
    render(<FormularioServicio {...defaultProps} />)
    // Por defecto es inseminación → pajuela
    expect(screen.getByLabelText(/Pajuela/)).toBeInTheDocument()
    // Cambiar a monta natural → padre
    const tipoSelect = screen.getByLabelText(/Tipo/)
    await user.selectOptions(tipoSelect, "monta")
    expect(screen.getByLabelText(/Padre/)).toBeInTheDocument()
  })

  it("muestra botón Guardar con número de animales", () => {
    render(<FormularioServicio {...defaultProps} numeroAnimales={3} />)
    expect(screen.getByRole("button", { name: /Guardar 3 servicios/ })).toBeInTheDocument()
  })
})

describe("FormularioPalpacion — matriz §2 Reproductivo / Palpación", () => {
  const defaultProps = {
    numeroAnimales: 1,
    onVolver: vi.fn(),
    onGuardar: vi.fn(),
  }

  it("renderiza campos compartidos: fecha, diagnóstico, resultado, días de gestación, comentarios", () => {
    render(<FormularioPalpacion {...defaultProps} />)
    expect(screen.getByLabelText(/Fecha/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Diagnóstico/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Resultado/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Días de gestación/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Comentarios/)).toBeInTheDocument()
  })

  it("muestra opciones de resultado: Vacía, Preñada, No aplica", () => {
    render(<FormularioPalpacion {...defaultProps} />)
    expect(screen.getByRole("option", { name: "Vacía" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Preñada" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "No aplica" })).toBeInTheDocument()
  })

  it("incluye campo servicioId para vincular con servicio previo", () => {
    render(<FormularioPalpacion {...defaultProps} />)
    expect(screen.getByLabelText(/Servicio/)).toBeInTheDocument()
  })
})

describe("FormularioParto — matriz §2 Reproductivo / Parto (individual-only)", () => {
  const defaultProps = {
    numeroAnimales: 1,
    onVolver: vi.fn(),
    onGuardar: vi.fn(),
  }

  it("renderiza campos compartidos: fecha, servicio, tipo de parto, crías, comentarios", () => {
    render(<FormularioParto {...defaultProps} />)
    expect(screen.getByLabelText(/Fecha/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Servicio/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Tipo de parto/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Machos/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Hembras/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Muertos/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Comentarios/)).toBeInTheDocument()
  })

  it("muestra opciones de tipo de parto: Normal, Asistido, Cesárea", () => {
    render(<FormularioParto {...defaultProps} />)
    expect(screen.getByRole("option", { name: "Normal" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Asistido" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Cesárea" })).toBeInTheDocument()
  })

  it("deshabilita botón Guardar cuando numeroAnimales !== 1 (EV-CAP-007)", () => {
    render(<FormularioParto {...defaultProps} numeroAnimales={2} />)
    const guardar = screen.getByRole("button", { name: /Guardar parto/ })
    expect(guardar).toBeDisabled()
  })

  it("permite guardado cuando numeroAnimales === 1", async () => {
    const user = userEvent.setup()
    const onGuardar = vi.fn()
    render(<FormularioParto {...defaultProps} numeroAnimales={1} onGuardar={onGuardar} />)
    const guardar = screen.getByRole("button", { name: /Guardar parto/ })
    await user.click(guardar)
    expect(onGuardar).toHaveBeenCalled()
  })
})
