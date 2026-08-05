// @vitest-environment jsdom

/**
 * FormularioEntradaAlmacen (Issue #210, SAN-030/SAN-032/D-008).
 *
 * El formulario es presentacional: la validación de dominio la hace la capa
 * de aplicación (U1/U2) y los errores `{campo: detalle}` llegan por props
 * tras el round-trip al servidor (patrón `fieldErrors` de animal-crud).
 * Cubre:
 * - Nota append-only (D-008): en v1 no hay edición ni anulación.
 * - Errores de campo fecha futura (RN-002) y dosis ≤ 0 (SAN-030).
 * - Envío con valores parseados (dosis entera, precio opcional).
 */

import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { FormularioEntradaAlmacen } from "../src/ganado/formulario-entrada-almacen"

beforeAll(() => {
  if (!HTMLElement.prototype.hasPointerCapture) {
    HTMLElement.prototype.hasPointerCapture = () => false
  }
  if (!HTMLElement.prototype.setPointerCapture) {
    HTMLElement.prototype.setPointerCapture = () => undefined
  }
  if (!HTMLElement.prototype.releasePointerCapture) {
    HTMLElement.prototype.releasePointerCapture = () => undefined
  }
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = () => undefined
  }
})

afterEach(() => cleanup())

const PRODUCTOS = [
  { id: "prod-1", codigo: "VAC-AFTOSA", descripcion: "Vacuna fiebre aftosa" },
  { id: "prod-2", codigo: "IVERMECTINA", descripcion: "Ivermectina 1%" },
]

async function seleccionarProducto(user: ReturnType<typeof userEvent.setup>, codigo: string) {
  await user.click(screen.getByRole("combobox"))
  await user.click(await screen.findByRole("option", { name: new RegExp(codigo) }))
}

describe("FormularioEntradaAlmacen — nota append-only (D-008)", () => {
  it("muestra la nota de contexto: sin edición ni anulación en v1", () => {
    render(<FormularioEntradaAlmacen productos={PRODUCTOS} onGuardar={() => {}} />)

    expect(
      screen.getByText(/no se editan ni se anulan/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/nueva entrada/i)).toBeInTheDocument()
  })
})

describe("FormularioEntradaAlmacen — errores de campo (SAN-030, RN-002)", () => {
  it("RN-002: muestra el error de fecha futura recibido del servidor", () => {
    render(
      <FormularioEntradaAlmacen
        productos={PRODUCTOS}
        errores={{ fecha: "La fecha del evento no puede ser futura (RN-002)." }}
        onGuardar={() => {}}
      />,
    )

    const alerta = screen.getByRole("alert")
    expect(alerta).toHaveTextContent("La fecha del evento no puede ser futura (RN-002).")
    expect(screen.getByLabelText(/fecha/i)).toHaveAttribute("aria-invalid", "true")
  })

  it("SAN-030: muestra el error de dosis ≤ 0 recibido del servidor", () => {
    render(
      <FormularioEntradaAlmacen
        productos={PRODUCTOS}
        errores={{ dosis: "La dosis debe ser un entero mayor que 0 (SAN-030)." }}
        onGuardar={() => {}}
      />,
    )

    expect(screen.getByRole("alert")).toHaveTextContent(
      "La dosis debe ser un entero mayor que 0 (SAN-030).",
    )
    expect(screen.getByLabelText(/^dosis$/i)).toHaveAttribute("aria-invalid", "true")
  })

  it("muestra errores simultáneos de fecha y dosis", () => {
    render(
      <FormularioEntradaAlmacen
        productos={PRODUCTOS}
        errores={{ fecha: "Fecha futura.", dosis: "Dosis inválida." }}
        onGuardar={() => {}}
      />,
    )

    expect(screen.getAllByRole("alert")).toHaveLength(2)
  })
})

describe("FormularioEntradaAlmacen — envío (SAN-030)", () => {
  it("envía los datos capturados con dosis entera y precio parseados", async () => {
    const user = userEvent.setup()
    const onGuardar = vi.fn()

    render(
      <FormularioEntradaAlmacen
        productos={PRODUCTOS}
        fechaInicial="2026-08-01"
        onGuardar={onGuardar}
      />,
    )

    await seleccionarProducto(user, "VAC-AFTOSA")
    await user.clear(screen.getByLabelText(/^dosis$/i))
    await user.type(screen.getByLabelText(/^dosis$/i), "100")
    await user.clear(screen.getByLabelText(/precio/i))
    await user.type(screen.getByLabelText(/precio/i), "3500")
    await user.type(screen.getByLabelText(/comentario/i), "Compra distribuidor")

    await user.click(screen.getByRole("button", { name: /registrar entrada/i }))

    expect(onGuardar).toHaveBeenCalledTimes(1)
    expect(onGuardar).toHaveBeenCalledWith({
      productoId: "prod-1",
      fecha: "2026-08-01",
      dosis: 100,
      precioPorDosis: 3500,
      comentario: "Compra distribuidor",
    })
  })

  it("precio y comentario opcionales llegan null cuando quedan vacíos", async () => {
    const user = userEvent.setup()
    const onGuardar = vi.fn()

    render(
      <FormularioEntradaAlmacen
        productos={PRODUCTOS}
        fechaInicial="2026-08-01"
        onGuardar={onGuardar}
      />,
    )

    await seleccionarProducto(user, "IVERMECTINA")
    await user.clear(screen.getByLabelText(/^dosis$/i))
    await user.type(screen.getByLabelText(/^dosis$/i), "25")

    await user.click(screen.getByRole("button", { name: /registrar entrada/i }))

    expect(onGuardar).toHaveBeenCalledWith({
      productoId: "prod-2",
      fecha: "2026-08-01",
      dosis: 25,
      precioPorDosis: null,
      comentario: null,
    })
  })

  it("no envía sin producto seleccionado (botón deshabilitado)", async () => {
    const user = userEvent.setup()
    const onGuardar = vi.fn()

    render(<FormularioEntradaAlmacen productos={PRODUCTOS} onGuardar={onGuardar} />)

    const boton = screen.getByRole("button", { name: /registrar entrada/i })
    expect(boton).toBeDisabled()
    await user.click(boton)
    expect(onGuardar).not.toHaveBeenCalled()
  })
})
