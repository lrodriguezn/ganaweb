// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { ComboboxBuscable } from "../src/primitives/combobox-buscable"

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
  { value: "a-100", codigo: "MT-100", nombre: "Lola" },
  { value: "a-200", codigo: "MT-200", nombre: "Maya" },
  { value: "a-300", codigo: "MT-300", nombre: "Nube" },
] as const

describe("ComboboxBuscable primitive", () => {
  it("searches options, emits option id, and labels rows as 'código · nombre'", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    function Harness() {
      const [value, setValue] = useState<string | null>(null)
      return (
        <ComboboxBuscable
          id="madre"
          name="madreId"
          value={value}
          onChange={(next) => {
            onChange(next)
            setValue(next)
          }}
          options={OPTIONS}
          placeholder="Buscar madre"
        />
      )
    }

    render(<Harness />)

    await user.click(screen.getByRole("combobox", { name: /Buscar madre/ }))
    const search = await screen.findByPlaceholderText(/buscar/i)
    await user.type(search, "200")

    const list = await screen.findByRole("listbox")
    expect(within(list).getByText("MT-200 · Maya")).toBeInTheDocument()
    expect(within(list).queryByText("MT-100 · Lola")).not.toBeInTheDocument()

    await user.click(within(list).getByText("MT-200 · Maya"))
    expect(onChange).toHaveBeenCalledWith("a-200")
  })

  it("filters out options whose id is in excludedIds", async () => {
    const user = userEvent.setup()

    render(
      <ComboboxBuscable
        options={OPTIONS}
        value={null}
        onChange={() => {}}
        excludedIds={["a-100"]}
        placeholder="Buscar"
      />,
    )

    await user.click(screen.getByRole("combobox", { name: /Buscar/ }))
    const list = await screen.findByRole("listbox")
    expect(within(list).queryByText("MT-100 · Lola")).not.toBeInTheDocument()
    expect(within(list).getByText("MT-200 · Maya")).toBeInTheDocument()
    expect(within(list).getByText("MT-300 · Nube")).toBeInTheDocument()
  })

  it("forwards aria-invalid and aria-describedby to the combobox trigger", () => {
    render(
      <ComboboxBuscable
        options={OPTIONS}
        value={null}
        onChange={() => {}}
        placeholder="Buscar madre"
        aria-invalid="true"
        aria-describedby="err-madre"
      />,
    )

    const trigger = screen.getByRole("combobox", { name: /Buscar madre/ })
    expect(trigger).toHaveAttribute("aria-invalid", "true")
    expect(trigger).toHaveAttribute("aria-describedby", "err-madre")
  })
})
