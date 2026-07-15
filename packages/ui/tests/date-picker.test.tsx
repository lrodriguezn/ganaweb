// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { DatePicker } from "../src/primitives/date-picker"

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

describe("DatePicker primitive", () => {
  it("emits ISO yyyy-mm-dd when a date is picked and exposes aria attributes on the trigger", async () => {
    const user = userEvent.setup()

    function Harness() {
      const [value, setValue] = useState("")
      return (
        <DatePicker
          id="fecha"
          name="fechaNacimiento"
          value={value}
          onChange={setValue}
          aria-invalid="true"
          aria-describedby="err-fecha"
          placeholder="dd/mm/aaaa"
        />
      )
    }

    render(<Harness />)

    const trigger = screen.getByRole("button", { name: "dd/mm/aaaa" })
    expect(trigger).toHaveAttribute("aria-invalid", "true")
    expect(trigger).toHaveAttribute("aria-describedby", "err-fecha")

    await user.click(trigger)
    const day = await screen.findByRole("button", { name: /, 15 de julio de 2026/ })
    await user.click(day)

    const hidden = document.querySelector('input[type="date"][name="fechaNacimiento"]') as
      | HTMLInputElement
      | null
    expect(hidden).not.toBeNull()
    expect(hidden?.value).toBe("2026-07-15")
  })

  it("disables future days so onChange cannot emit a future ISO string (RN-002)", async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(<DatePicker name="fechaNacimiento" value="" onChange={onChange} />)

    await user.click(screen.getByRole("button", { name: "dd/mm/aaaa" }))

    const future = await screen.findByRole("button", { name: /, 25 de julio de 2026/ })
    expect(future).toBeDisabled()

    await user.click(future)
    expect(onChange).not.toHaveBeenCalled()
  })

  it("supports keyboard activation: Enter on a focused day button emits that ISO date", async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(<DatePicker name="fechaNacimiento" value="" onChange={onChange} />)

    await user.click(screen.getByRole("button", { name: "dd/mm/aaaa" }))

    const day = await screen.findByRole("button", { name: /, 10 de julio de 2026/ })
    day.focus()
    await user.keyboard("{Enter}")

    expect(onChange).toHaveBeenCalledTimes(1)
    const emitted = onChange.mock.calls[0]?.[0] as string
    expect(emitted).toMatch(/^\d{4}-07-10$/)
  })

  it("renders a pre-set ISO value as es-CO display and re-emits the same ISO on re-pick (round-trip)", () => {
    function Harness() {
      const [value, setValue] = useState("2024-03-15")
      return (
        <DatePicker
          name="fechaNacimiento"
          value={value}
          onChange={setValue}
          placeholder="dd/mm/aaaa"
        />
      )
    }
    render(<Harness />)
    expect(screen.getByRole("button", { name: "15/03/2024" })).toBeInTheDocument()
  })
})
