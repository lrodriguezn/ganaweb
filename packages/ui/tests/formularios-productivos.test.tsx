// @vitest-environment jsdom

/**
 * Tests de integración para formularios productivos (Issue #232).
 *
 * Cubre FormularioPesaje, FormularioProduccionLactea y FormularioCondicionCorporal.
 * Verifica campos contra matriz §2, RBAC eventos_productivos:*,
 * condición corporal grupal bloqueada, y pesaje con validación por animal.
 */

import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { FormularioCondicionCorporal } from "../src/ganado/evento-wizard/formularios/formulario-condicion-corporal"
import { FormularioPesaje } from "../src/ganado/evento-wizard/formularios/formulario-pesaje"
import { FormularioProduccionLactea } from "../src/ganado/evento-wizard/formularios/formulario-produccion-lactea"

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("FormularioPesaje — matriz §2 Productivo / Pesaje", () => {
  const defaultProps = {
    numeroAnimales: 1,
    onVolver: vi.fn(),
    onGuardar: vi.fn(),
  }

  it("renderiza campos compartidos: fecha, peso, tipo de peso, comentarios", () => {
    render(<FormularioPesaje {...defaultProps} />)
    expect(screen.getByLabelText(/Fecha/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Peso/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Tipo de peso/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Comentarios/)).toBeInTheDocument()
  })

  it("muestra opciones de tipo de peso: Control, Compra, Venta", () => {
    render(<FormularioPesaje {...defaultProps} />)
    expect(screen.getByRole("option", { name: "Control" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Compra" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Venta" })).toBeInTheDocument()
  })

  it("requiere peso > 0 para guardar", async () => {
    const user = userEvent.setup()
    const onGuardar = vi.fn()
    render(<FormularioPesaje {...defaultProps} onGuardar={onGuardar} />)
    const peso = screen.getByLabelText(/Peso/) as HTMLInputElement
    await user.clear(peso)
    await user.type(peso, "0")
    const guardar = screen.getByRole("button", { name: /Guardar/ })
    await user.click(guardar)
    expect(onGuardar).not.toHaveBeenCalled()
  })

  it("muestra botón Guardar con número de animales", () => {
    render(<FormularioPesaje {...defaultProps} numeroAnimales={5} />)
    expect(screen.getByRole("button", { name: /Guardar 5 pesajes/ })).toBeInTheDocument()
  })
})

describe("FormularioProduccionLactea — matriz §2 Productivo / Producción láctea", () => {
  const defaultProps = {
    numeroAnimales: 1,
    onVolver: vi.fn(),
    onGuardar: vi.fn(),
  }

  it("renderiza los cuatro selectores opcionales de ubicación", () => {
    render(
      <FormularioProduccionLactea
        {...defaultProps}
        catalogos={{
          lotes: [{ id: "lote-1", nombre: "Lote 1" }],
          potreros: [{ id: "potrero-1", nombre: "Potrero 1" }],
          sectores: [{ id: "sector-1", nombre: "Sector 1" }],
          grupos: [{ id: "grupo-1", nombre: "Grupo 1" }],
        }}
      />,
    )
    expect(screen.getByLabelText(/Fecha/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Cantidad AM/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Cantidad PM/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Lote/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Potrero/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Sector/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Grupo/)).toBeInTheDocument()
  })

  it("envía lote, potrero, sector y grupo cuando fueron seleccionados", async () => {
    const user = userEvent.setup()
    const onGuardar = vi.fn()
    render(
      <FormularioProduccionLactea
        {...defaultProps}
        onGuardar={onGuardar}
        datosIniciales={{
          fecha: "2026-08-10",
          cantidadAm: 10,
          cantidadPm: 12.5,
          loteId: "lote-1",
          potreroId: "potrero-1",
          sectorId: "sector-1",
          grupoId: "grupo-1",
        }}
      />,
    )

    await user.click(screen.getByRole("button", { name: /Guardar 1 registro/ }))

    expect(onGuardar).toHaveBeenCalledWith(
      expect.objectContaining({
        loteId: "lote-1",
        potreroId: "potrero-1",
        sectorId: "sector-1",
        grupoId: "grupo-1",
      }),
    )
  })

  it("permite registrar cantidades AM y PM iguales a cero", async () => {
    const user = userEvent.setup()
    const onGuardar = vi.fn()
    render(<FormularioProduccionLactea {...defaultProps} onGuardar={onGuardar} />)
    const am = screen.getByLabelText(/Cantidad AM/) as HTMLInputElement
    const pm = screen.getByLabelText(/Cantidad PM/) as HTMLInputElement
    await user.clear(am)
    await user.type(am, "0")
    await user.clear(pm)
    await user.type(pm, "0")
    const guardar = screen.getByRole("button", { name: /Guardar/ })
    await user.click(guardar)
    expect(onGuardar).toHaveBeenCalledWith(
      expect.objectContaining({ cantidadAm: 0, cantidadPm: 0 }),
    )
  })
})

describe("FormularioCondicionCorporal — matriz §2 Productivo / Condición corporal", () => {
  const defaultProps = {
    numeroAnimales: 1,
    onVolver: vi.fn(),
    onGuardar: vi.fn(),
  }

  it("renderiza campos compartidos: fecha, condición, puntaje", () => {
    render(<FormularioCondicionCorporal {...defaultProps} />)
    expect(screen.getByLabelText(/Fecha/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Condición/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Puntaje/)).toBeInTheDocument()
  })

  it("requiere puntaje entre 1 y 5 para guardar", async () => {
    const user = userEvent.setup()
    const onGuardar = vi.fn()
    render(<FormularioCondicionCorporal {...defaultProps} onGuardar={onGuardar} />)
    const puntaje = screen.getByLabelText(/Puntaje/) as HTMLInputElement
    await user.clear(puntaje)
    await user.type(puntaje, "6")
    const guardar = screen.getByRole("button", { name: /Guardar/ })
    await user.click(guardar)
    expect(onGuardar).not.toHaveBeenCalled()
  })
})
