// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { AnulacionEventoDialog } from "../src/ganado/tablero-eventos/anulacion-dialog"

afterEach(() => cleanup())

const evento = {
  id: "venta-1",
  dominio: "movimientos" as const,
  tipo: "venta",
  fecha: "2026-01-01",
  detalle: "Comprador",
  animalId: "animal-1",
  animalCodigo: "A-1",
  animalNombre: null,
  registroGrupalId: null,
  anulado: false,
  anuladoEn: null,
  motivoAnulacion: null,
}

describe("AnulacionEventoDialog", () => {
  it("requires a reason before confirmation", async () => {
    const user = userEvent.setup()
    const onConfirmar = vi.fn()
    render(
      <AnulacionEventoDialog
        evento={evento}
        open
        onOpenChange={vi.fn()}
        onConfirmar={onConfirmar}
        onCorregir={vi.fn()}
      />,
    )

    await user.click(screen.getByTestId("anulacion-confirmar"))
    expect(screen.getByRole("alert")).toHaveTextContent("obligatorio")
    expect(onConfirmar).not.toHaveBeenCalled()
  })

  it("shows impact and success feedback after an audited annulment", async () => {
    const user = userEvent.setup()
    render(
      <AnulacionEventoDialog
        evento={evento}
        open
        onOpenChange={vi.fn()}
        onConfirmar={vi.fn().mockResolvedValue({ tipo: "ok" })}
        onCorregir={vi.fn()}
      />,
    )

    expect(screen.getByText(/el evento deja de estar activo/i)).toBeInTheDocument()
    await user.type(screen.getByTestId("anulacion-motivo"), "Venta duplicada")
    await user.click(screen.getByTestId("anulacion-confirmar"))
    expect(await screen.findByText("Anulación registrada correctamente.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Registrar corrección" })).toBeInTheDocument()
  })
})
