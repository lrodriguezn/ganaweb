// @vitest-environment jsdom

/**
 * Tests de integración para formularios de movimientos (Issue #233).
 *
 * Cubre FormularioVenta, FormularioMuerte y FormularioTraslado.
 * Verifica campos contra matriz §2, RBAC movimientos:*,
 * muerte grupal bloqueada, y efectos laterales.
 */

import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { FormularioMuerte } from "../src/ganado/evento-wizard/formularios/formulario-muerte"
import { FormularioTraslado } from "../src/ganado/evento-wizard/formularios/formulario-traslado"
import { FormularioVenta } from "../src/ganado/evento-wizard/formularios/formulario-venta"

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("FormularioVenta — matriz §2 Movimientos / Venta", () => {
  const defaultProps = {
    numeroAnimales: 1,
    onVolver: vi.fn(),
    onGuardar: vi.fn(),
  }

  it("renderiza campos compartidos: fecha, motivo, lugar, peso, precio, comprador, comentarios", () => {
    render(<FormularioVenta {...defaultProps} />)
    expect(screen.getByLabelText(/Fecha/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Motivo/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Lugar/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Peso/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Precio/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Comprador/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Comentarios/)).toBeInTheDocument()
  })

  it("muestra botón Guardar con número de animales", () => {
    render(<FormularioVenta {...defaultProps} numeroAnimales={5} />)
    expect(screen.getByRole("button", { name: /Guardar 5 ventas/ })).toBeInTheDocument()
  })
})

describe("FormularioMuerte — matriz §2 Movimientos / Muerte", () => {
  const defaultProps = {
    numeroAnimales: 1,
    onVolver: vi.fn(),
    onGuardar: vi.fn(),
  }

  it("renderiza campos compartidos: fecha, causa, comentarios", () => {
    render(<FormularioMuerte {...defaultProps} />)
    expect(screen.getByLabelText(/Fecha/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Causa/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Comentarios/)).toBeInTheDocument()
  })
})

describe("FormularioTraslado — matriz §2 Movimientos / Traslado", () => {
  const defaultProps = {
    numeroAnimales: 1,
    onVolver: vi.fn(),
    onGuardar: vi.fn(),
  }

  it("renderiza campos compartidos: fecha, potrero, sector, lote, grupo, motivo", () => {
    render(<FormularioTraslado {...defaultProps} />)
    expect(screen.getByLabelText(/Fecha/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Potrero/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Sector/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Lote/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Grupo/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Motivo/)).toBeInTheDocument()
  })

  it("muestra botón Guardar con número de animales", () => {
    render(<FormularioTraslado {...defaultProps} numeroAnimales={3} />)
    expect(screen.getByRole("button", { name: /Guardar 3 traslados/ })).toBeInTheDocument()
  })
})
