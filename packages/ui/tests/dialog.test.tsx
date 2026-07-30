// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeAll, describe, expect, it } from "vitest"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../src/primitives/dialog"

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

describe("Dialog primitive", () => {
  it("renders an accessible dialog with title and description when open", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exportar animales</DialogTitle>
            <DialogDescription>Elige el alcance y el formato del archivo.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    )

    // Radix wires aria-labelledby/aria-describedby, so the dialog is
    // queryable by its accessible name (the title text).
    const dialog = screen.getByRole("dialog", { name: "Exportar animales" })
    expect(dialog).toBeInTheDocument()
    expect(screen.getByText("Elige el alcance y el formato del archivo.")).toBeInTheDocument()
  })

  it("opens from the trigger and closes via DialogClose", async () => {
    const user = userEvent.setup()

    render(
      <Dialog>
        <DialogTrigger>Abrir exportación</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exportar animales</DialogTitle>
            <DialogDescription>Elige el alcance y el formato.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose>Cancelar</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    )

    // Closed initially — no dialog in the document.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Abrir exportación" }))
    expect(screen.getByRole("dialog", { name: "Exportar animales" })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})
