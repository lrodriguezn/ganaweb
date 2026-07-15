// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { SelectConCreacion } from "../src/primitives/select-con-creacion"

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
  // cmdk depends on ResizeObserver; jsdom doesn't ship it.
  if (typeof globalThis.ResizeObserver === "undefined") {
    class ResizeObserverPolyfill {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    ;(globalThis as unknown as { ResizeObserver: typeof ResizeObserverPolyfill }).ResizeObserver =
      ResizeObserverPolyfill
  }
})

afterEach(() => cleanup())

const OPTIONS = [
  { value: "r1", label: "Angus" },
  { value: "r2", label: "Brahman" },
] as const

describe("SelectConCreacion primitive", () => {
  it("searches options, emits option id, and exposes aria attributes on the trigger (CA-UI-001)", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    function Harness() {
      const [value, setValue] = useState<string | null>(null)
      return (
        <SelectConCreacion
          id="raza"
          name="razaId"
          value={value}
          onChange={(next) => {
            onChange(next)
            setValue(next)
          }}
          options={OPTIONS}
          canCreate
          aria-invalid="true"
          aria-describedby="err-raza"
          placeholder="Selecciona raza"
        />
      )
    }

    render(<Harness />)
    const trigger = screen.getByRole("combobox", { name: /Selecciona raza/ })
    expect(trigger).toHaveAttribute("aria-invalid", "true")
    expect(trigger).toHaveAttribute("aria-describedby", "err-raza")

    await user.click(trigger)
    const search = screen.getByPlaceholderText(/buscar/i)
    await user.type(search, "bra")

    const list = await screen.findByRole("listbox")
    expect(within(list).queryByText("Angus")).not.toBeInTheDocument()
    const brahman = within(list).getByText("Brahman")
    await user.click(brahman)

    expect(onChange).toHaveBeenCalledWith("r2")
    expect(screen.getByRole("combobox", { name: "Brahman" })).toBeInTheDocument()
  })

  it("renders EmptyState with '+ Crear el primero' when list is empty and canCreate is true (CA-UI-004)", async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()

    render(
      <SelectConCreacion
        options={[]}
        value={null}
        onChange={() => {}}
        canCreate
        onCreate={onCreate}
        placeholder="Selecciona"
      />,
    )

    await user.click(screen.getByRole("combobox"))
    const createFirst = await screen.findByRole("button", { name: /\+ Crear el primero/ })
    await user.click(createFirst)
    expect(onCreate).toHaveBeenCalledTimes(1)
  })

  it("renders disabled with a hint when list is empty and canCreate is false", () => {
    render(
      <SelectConCreacion
        options={[]}
        value={null}
        onChange={() => {}}
        canCreate={false}
        placeholder="Selecciona"
        emptyHint="No hay opciones disponibles"
      />,
    )

    const trigger = screen.getByRole("combobox", { name: /Selecciona/ })
    expect(trigger).toBeDisabled()
    expect(screen.getByText("No hay opciones disponibles")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Crear/ })).not.toBeInTheDocument()
  })
})
