// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeAll, describe, expect, it } from "vitest"

import { Toaster, toast } from "../src/primitives/toast"

beforeAll(() => {
  // Radix Toast's swipe handler calls pointer-capture APIs jsdom lacks.
  if (!HTMLElement.prototype.hasPointerCapture) {
    HTMLElement.prototype.hasPointerCapture = () => false
  }
  if (!HTMLElement.prototype.setPointerCapture) {
    HTMLElement.prototype.setPointerCapture = () => undefined
  }
  if (!HTMLElement.prototype.releasePointerCapture) {
    HTMLElement.prototype.releasePointerCapture = () => undefined
  }
})

afterEach(() => cleanup())

describe("Toast primitive", () => {
  it("announces a default toast with title and description", () => {
    render(<Toaster />)

    act(() => {
      toast({
        title: "Exportación lista",
        description: "El archivo se descargó correctamente.",
      })
    })

    // Radix Toast Root is a polite live region (role="status").
    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(screen.getByText("Exportación lista")).toBeInTheDocument()
    expect(screen.getByText("El archivo se descargó correctamente.")).toBeInTheDocument()
  })

  it("renders a destructive toast and dismisses it via the close button", async () => {
    const user = userEvent.setup()
    render(<Toaster />)

    act(() => {
      toast({
        title: "No se pudo exportar",
        description: "Ocurrió un error al generar el archivo.",
        variant: "destructive",
      })
    })

    expect(screen.getByText("No se pudo exportar")).toBeInTheDocument()
    const closeButton = screen.getByRole("button", { name: "Cerrar" })
    expect(closeButton).toBeInTheDocument()

    await user.click(closeButton)
    expect(screen.queryByText("No se pudo exportar")).not.toBeInTheDocument()
  })
})
